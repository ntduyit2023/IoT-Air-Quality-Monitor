#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <DHT.h>

// ========== 1. CẤU HÌNH WIFI ==========
// Mặc định "Wokwi-GUEST" dùng cho mô phỏng Wokwi.
// Khi chạy mạch thật, bạn có thể đổi thành tên WiFi & Mật khẩu nhà/phát từ điện thoại:
const char* ssid     = "Wokwi-GUEST";
const char* password = "";

// ========== 2. CẤU HÌNH THINGSPEAK ==========
const char* serverUpdate = "http://api.thingspeak.com/update";
const char* channelID    = "3551578";
const String writeApiKey = "CE712UCBEPI28WOA";
const String readApiKey  = "";

// ========== 3. ĐỊNH NGHĨA CHÂN KẾT NỐI (CHUẨN BO MỞ RỘNG ESP32 38P) ==========
const int GAS_PIN    = 34;   // Cảm biến khí MQ-135 (Chân AO -> Cọc vàng P34)
const int DHT_PIN    = 15;   // Cảm biến nhiệt ẩm DHT22 (Chân giữa OUT -> Cọc vàng P15)
const int BUZZER_PIN = 23;   // Còi báo động Buzzer 5V (Chân (+) -> Cọc vàng P23)
// Màn hình OLED 0.96" I2C: Chân SDA -> Cọc vàng P21, Chân SCK/SCL -> Cọc vàng P22
const int LED_GREEN  = 18;   // Dự phòng nếu có LED
const int LED_YELLOW = 19;   // Dự phòng nếu có LED
const int LED_RED    = 4;    // Dự phòng nếu có LED

// ========== 4. KHỞI TẠO CẢM BIẾN & MÀN HÌNH OLED 0.96" SSD1306 (128x64) ==========
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// Sử dụng thư viện chuẩn Adafruit DHT cho Arduino-ESP32 Core 3.x
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ========== 5. NGƯỠNG ĐÁNH GIÁ CHẤT LƯỢNG KHÔNG KHÍ ==========
int gasThresholdModerate = 1500;
int gasThresholdDanger   = 2500;

const float TEMP_WARNING     = 35.0;  // Nhiệt độ quá cao (°C)
const float HUMIDITY_WARNING = 85.0;  // Độ ẩm quá cao (%)

// ========== 6. QUẢN LÝ THỜI GIAN ==========
unsigned long lastSendTime          = 0;
const unsigned long sendDelay       = 20000; // Gửi ThingSpeak mỗi 20s (chừa khoảng trống cho Dashboard)

unsigned long lastCheckCmdTime      = 0;
const unsigned long checkCmdDelay   = 5000;  // Đọc lệnh từ xa mỗi 5 giây

unsigned long lastSensorReadTime    = 0;
const unsigned long sensorReadDelay = 2500;  // Đọc cảm biến mỗi 2.5 giây

unsigned long lastWiFiRetryTime     = 0;
const unsigned long wifiRetryDelay  = 30000; // Thử kết nối lại WiFi mỗi 30s nếu mất mạng (không làm treo mạch)

// ========== 7. BIẾN TRẠNG THÁI ==========
int currentMode = 0;  // 0 = AUTO, 1 = FORCE ON, 2 = FORCE OFF
int airQualityLevel = 0;
bool buzzerActive = false;

float lastTemp     = 28.0;
float lastHumidity = 65.0;
int   lastGasLevel = 0;

// ==================== HÀM HIỂN THỊ MÀN HÌNH OLED 0.96" SSD1306 (128x64) ====================
void updateOLEDDisplay() {
  u8g2.clearBuffer();

  // Dòng 1 (Y: 0-12): Header + Chế độ hoạt động
  u8g2.setFont(u8g2_font_helvB08_tr);
  u8g2.drawStr(2, 10, "AIR MONITOR");
  u8g2.setFont(u8g2_font_6x10_tf);
  const char* modeTag = (currentMode == 0) ? "[AUTO]" : ((currentMode == 1) ? "[ON]" : "[OFF]");
  u8g2.drawStr(86, 10, modeTag);
  u8g2.drawHLine(0, 13, 128);

  // Dòng 2 (Y: 14-25): Nhiệt độ & Độ ẩm
  char buf[36];
  snprintf(buf, sizeof(buf), "T: %.1f C  H: %.0f %%", lastTemp, lastHumidity);
  u8g2.drawStr(2, 24, buf);

  // Dòng 3 (Y: 26-37): Cảm biến khí MQ-135
  snprintf(buf, sizeof(buf), "MQ-135: %4d ADC", lastGasLevel);
  u8g2.drawStr(2, 36, buf);

  // Dòng 4 (Y: 38-49): Đánh giá chất lượng không khí
  const char* statusStr = (airQualityLevel == 0) ? "[+] AN TOAN (TOT)" :
                          ((airQualityLevel == 1) ? "[!] TRUNG BINH" : "[X] ! NGUY HIEM !");
  u8g2.setFont(u8g2_font_helvB08_tr);
  u8g2.drawStr(2, 48, statusStr);
  u8g2.drawHLine(0, 51, 128);

  // Dòng 5 (Y: 52-63): Trạng thái Còi & WiFi Cloud
  u8g2.setFont(u8g2_font_5x7_tf);
  snprintf(buf, sizeof(buf), "Coi: %s | WiFi: %s | #%s", 
           buzzerActive ? "BAT" : "TAT",
           (WiFi.status() == WL_CONNECTED) ? "ONLINE" : "OFF",
           channelID);
  u8g2.drawStr(2, 61, buf);

  u8g2.sendBuffer();
}

// ==================== HÀM KẾT NỐI WIFI ====================
void connectToWiFi() {
  Serial.print("\r\n==================================================\r\n");
  Serial.print("[WIFI] Dang ket noi toi mang: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\r\n[WIFI] DA KET NOI THANH CONG!\r\n");
    Serial.print("[IDENTITY] Dia chi IP Cuc bo : ");
    Serial.println(WiFi.localIP());
    Serial.print("[IDENTITY] Dia chi MAC Duy nhat: ");
    Serial.println(WiFi.macAddress());
  } else {
    Serial.print("\r\n[WIFI] CHUA KET NOI DUOC! (Se chay che do Offline tai cho)\r\n");
  }
  Serial.print("==================================================\r\n\r\n");

  updateOLEDDisplay();
}

void setIndicatorLeds(bool green, bool yellow, bool red) {
  digitalWrite(LED_GREEN,  green  ? HIGH : LOW);
  digitalWrite(LED_YELLOW, yellow ? HIGH : LOW);
  digitalWrite(LED_RED,    red    ? HIGH : LOW);
}

void setBuzzer(bool active) {
  if (active && !buzzerActive) {
    digitalWrite(BUZZER_PIN, HIGH);
    tone(BUZZER_PIN, 2000);
    buzzerActive = true;
  } else if (!active && buzzerActive) {
    digitalWrite(BUZZER_PIN, LOW);
    noTone(BUZZER_PIN);
    buzzerActive = false;
  }
}

// ==================== HÀM ĐỌC CẢM BIẾN & ĐÁNH GIÁ ====================
void readSensorsAndEvaluate() {
  // Đọc DHT22 bằng thư viện chuẩn Adafruit DHT
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && !isnan(h)) {
    lastTemp     = t;
    lastHumidity = h;
  } else {
    Serial.println("[DHT WARN] Khong doc duoc du lieu tu DHT22!");
  }

  // Đọc cảm biến MQ-2
  lastGasLevel = analogRead(GAS_PIN);

  // Đánh giá chất lượng
  if (lastGasLevel < gasThresholdModerate) {
    airQualityLevel = 0;
    setIndicatorLeds(true, false, false);
    if (currentMode == 0) setBuzzer(false);
  } 
  else if (lastGasLevel < gasThresholdDanger) {
    airQualityLevel = 1;
    setIndicatorLeds(false, true, false);
    if (currentMode == 0) setBuzzer(false);
  } 
  else {
    airQualityLevel = 2;
    setIndicatorLeds(false, false, true);
    if (currentMode == 0) setBuzzer(true);
  }

  if (lastTemp > TEMP_WARNING || lastHumidity > HUMIDITY_WARNING) {
    if (currentMode == 0 && airQualityLevel < 2) {
      airQualityLevel = max(airQualityLevel, 1);
      setIndicatorLeds(false, true, airQualityLevel == 2);
    }
  }

  if (currentMode == 1) setBuzzer(true);
  if (currentMode == 2) setBuzzer(false);

  updateOLEDDisplay();

  String qualityStr;
  if (airQualityLevel == 0)      qualityStr = "TOT (An toan)";
  else if (airQualityLevel == 1) qualityStr = "TRUNG BINH (Can chu y)";
  else                           qualityStr = "NGUY HIEM (Canh bao!)";

  Serial.print("\r\n+------------------- GIAM SAT KHONG KHI -------------------+\r\n");
  Serial.printf("| [NHIET DO] : %5.1f *C                                   |\r\n", lastTemp);
  Serial.printf("| [DO AM]    : %5.1f %%                                   |\r\n", lastHumidity);
  Serial.printf("| [KHOI/GAS] : %5d (ADC 0-4095)                          |\r\n", lastGasLevel);
  Serial.printf("| [DANH GIA] : %-42s |\r\n", qualityStr.c_str());
  Serial.printf("| [CHE DO]   : %-18s | Coi: %-15s |\r\n",
    currentMode == 0 ? "TU DONG (AUTO)" : (currentMode == 1 ? "BAT CUONG BUC" : "TAT CUONG BUC"),
    buzzerActive ? "DANG KEU (ON)" : "TAT (OFF)");
  Serial.print("+----------------------------------------------------------+\r\n");
}

// ==================== GỬI DỮ LIỆU LÊN THINGSPEAK ====================
void sendToThingSpeak() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.print("[THINGSPEAK] Mat ket noi WiFi! Bo qua lan gui nay.\r\n");
    return;
  }

  HTTPClient http;

  // Luôn gửi cả field5=currentMode để không làm rỗng trường lệnh điều khiển trên ThingSpeak
  String url = String(serverUpdate) 
    + "?api_key=" + writeApiKey
    + "&field1=" + String(lastTemp, 1)
    + "&field2=" + String(lastHumidity, 1)
    + "&field3=" + String(lastGasLevel)
    + "&field4=" + String(airQualityLevel)
    + "&field5=" + String(currentMode);

  http.begin(url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("=> [THINGSPEAK] Gui thanh cong! Entry #%s | HTTP %d\r\n", response.c_str(), httpCode);
  } else {
    Serial.printf("=> [THINGSPEAK] Loi gui du lieu! Ma: %d\r\n", httpCode);
  }

  http.end();
}

// ==================== ĐỌC LỆNH ĐIỀU KHIỂN TỪ XA ====================
void checkRemoteCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;

  String readUrl = "http://api.thingspeak.com/channels/" + String(channelID) + "/fields/5/last.txt";
  if (readApiKey.length() > 0) {
    readUrl += "?api_key=" + readApiKey;
  }

  http.begin(readUrl);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    payload.trim();

    if (payload.length() > 0 && payload != "-1") {
      int newCmd = payload.toInt();
      if (newCmd != currentMode) {
        currentMode = newCmd;
        Serial.print("\r\n>>> [REMOTE] Nhan lenh moi tu Dashboard: ");
        if (currentMode == 0)      Serial.print("CHE DO TU DONG (AUTO)\r\n");
        else if (currentMode == 1) Serial.print("BAT COI CUONG BUC (FORCE ON)\r\n");
        else if (currentMode == 2) Serial.print("TAT COI CUONG BUC (FORCE OFF)\r\n");
        updateOLEDDisplay();
      }
    }
  }

  http.end();
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(GAS_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  noTone(BUZZER_PIN);

  Wire.begin(21, 22);
  u8g2.begin();
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_helvB08_tr);
  u8g2.drawStr(10, 15, "AIR MONITOR IoT");
  u8g2.drawHLine(0, 18, 128);
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(12, 33, "Dang khoi dong...");
  u8g2.drawStr(6, 47, "ESP32 + MQ-135 + DHT");
  u8g2.drawStr(10, 60, "OLED 0.96 SSD1306");
  u8g2.sendBuffer();

  // Khởi động cảm biến DHT22 bằng Adafruit DHT
  dht.begin();

  Serial.print("\r\n==================================================\r\n");
  Serial.print("  DE TAI: GIAM SAT CHAT LUONG KHONG KHI\r\n");
  Serial.print("  TRONG PHONG HOC - HE THONG IoT\r\n");
  Serial.print("==================================================\r\n");

  connectToWiFi();
}

// ==================== LOOP ====================
void loop() {
  // Tự động thử kết nối lại WiFi mỗi 30s nếu mất mạng (không làm đứng đơ màn hình và cảm biến)
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiRetryTime >= wifiRetryDelay) {
      lastWiFiRetryTime = millis();
      connectToWiFi();
    }
  }

  if (millis() - lastSensorReadTime >= sensorReadDelay) {
    lastSensorReadTime = millis();
    readSensorsAndEvaluate();
  }

  if (millis() - lastCheckCmdTime >= checkCmdDelay) {
    lastCheckCmdTime = millis();
    checkRemoteCommand();
  }

  if ((millis() - lastSendTime) > sendDelay || lastSendTime == 0) {
    sendToThingSpeak();
    lastSendTime = millis();
  }

  delay(100);
}
