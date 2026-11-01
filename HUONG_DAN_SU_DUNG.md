# HƯỚNG DẪN CHI TIẾT NỐI DÂY & VẬN HÀNH DỰ ÁN IoT
## ĐỀ TÀI: GIÁM SÁT CHẤT LƯỢNG KHÔNG KHÍ PHÒNG HỌC
### Hệ thống: ESP32 DevKit V1 + MQ-135 + DHT22 + OLED 0.96" SSD1306 + Buzzer 5V + Full Breadboard

---

## 1. DANH SÁCH LINH KIỆN VÀ VAI TRÒ TRONG HỆ THỐNG

| STT | Linh kiện | Tên mã / Chuẩn | Vai trò trong hệ thống | Ghi chú thay thế |
|:---:|---|---|---|---|
| 1 | **ESP32 DevKit V1** | 30 chân (DOIT layout) | Vi điều khiển trung tâm, kết nối WiFi, đọc cảm biến, gửi ThingSpeak, điều khiển ngoại vi | Có thể thay thế: ESP8266 |
| 2 | **Cảm biến khí MQ-135** | Gas/Air Quality Sensor | Đo nồng độ khí ô nhiễm, khói, NH3, CO2, cồn trong không khí phòng | Mô phỏng trên Wokwi bằng `wokwi-gas-sensor` (MQ-2) |
| 3 | **Cảm biến nhiệt/ẩm DHT22** | AM2302 | Đo chính xác nhiệt độ (°C) và độ ẩm tương đối (%) trong phòng học | Có thể thay thế: DHT11 |
| 4 | **Màn hình OLED 0.96 inch** | SSD1306 (128x64, I2C) | Hiển thị trực tiếp các thông số môi trường, trạng thái còi, WiFi và chế độ hệ thống | Thay thế cho LCD 16x2 |
| 5 | **Còi báo động Buzzer 5V** | Active/Passive Buzzer | Phát âm thanh cảnh báo khi chất lượng không khí vượt ngưỡng nguy hiểm hoặc khi bật từ Dashboard | Thay thế cho LED đỏ báo động |
| 6 | **Bảng cắm mạch Full Breadboard** | MB-102 (Full Size 60 hàng) | Cắm các chân nối, chia ray nguồn 5V và 3.3V, tạo mạch kết nối chắc chắn, an toàn | Không cần thay thế |
| 7 | **Dây Jumper** | Đực - Đực, Đực - Cái | Kết nối tín hiệu và nguồn giữa ESP32, Breadboard và các linh kiện | Dây cắm tiêu chuẩn |
| 8 | **Điện trở kéo lên (Pull-up)** | 10kΩ (1/4W) | Kéo đường tín hiệu DATA của cảm biến DHT22 lên mức 3.3V để chống nhiễu bus 1-wire | Bắt buộc đối với DHT22/DHT11 |
| 9 | **Nguồn USB 5V** | Cáp Micro-USB | Cấp nguồn trực tiếp 5V ổn định từ máy tính hoặc củ sạc điện thoại cho ESP32 | ESP32 tự hạ áp ra 3.3V qua chip nguồn AMS1117 tích hợp |

---

## 2. BẢNG SƠ ĐỒ NỐI DÂY CHI TIẾT TỪNG LINH KIỆN VỚI ESP32 DEVKIT V1

### A. Phân phối Ray Nguồn trên Full Breadboard
Breadboard có 2 hàng ray nguồn trên và dưới:
- **Ray nguồn 5V (Dùng cho MQ-135 và Còi Buzzer):**
  - Chân **VIN** (hoặc 5V) của ESP32 $\rightarrow$ Cắm vào ray dương phía trên (**`+` / đỏ**).
  - Chân **GND** của ESP32 $\rightarrow$ Cắm vào ray âm phía trên (**`-` / xanh đen**).
- **Ray nguồn 3.3V (Dùng cho DHT22 và Màn hình OLED SSD1306):**
  - Chân **3V3** của ESP32 $\rightarrow$ Cắm vào ray dương phía dưới (**`+` / đỏ**).
  - Chân **GND** thứ 2 của ESP32 $\rightarrow$ Cắm vào ray âm phía dưới (**`-` / xanh đen**).
- **Cầu nối Mass chung:** Dùng 1 dây Jumper đen nối giữa ray âm phía trên và ray âm phía dưới để đảm bảo toàn bộ hệ thống chung Mass (GND).

---

### B. Chi tiết nối dây từng module ngoại vi

#### 1. Màn hình OLED 0.96" SSD1306 (Giao tiếp I2C - 4 chân)
| Chân trên OLED 0.96" | Chân ESP32 DevKit V1 | Màu dây khuyên dùng | Chức năng |
|---|---|---|---|
| **GND** | **GND** (hoặc Ray âm `-`) | Đen (Black) | Nối đất 0V |
| **VCC** | **3V3** (hoặc Ray dương 3.3V `+`) | Đỏ (Red) | Cấp nguồn 3.3V ổn định |
| **SCL** | **GPIO 22** (`D22`) | Vàng / Cam / Cyan | Xung nhịp I2C Clock |
| **SDA** | **GPIO 21** (`D21`) | Xanh dương (Blue) | Dữ liệu I2C Data |

*Lưu ý:* Địa chỉ I2C mặc định của màn hình SSD1306 là `0x3C`.

---

#### 2. Cảm biến chất lượng không khí MQ-135 (MQ-2) (4 chân)
| Chân trên Module MQ | Chân ESP32 DevKit V1 | Màu dây khuyên dùng | Chức năng |
|---|---|---|---|
| **VCC** | **VIN** (Ray dương 5V `+`) | Đỏ (Red) | Cấp nguồn 5V cho dây sấy nhiệt (Heater) của cảm biến |
| **GND** | **GND** (Ray âm `-`) | Đen (Black) | Nối đất 0V |
| **AOUT (AO)** | **GPIO 34** (`D34`) | Cam (Orange) | Tín hiệu điện áp Analog (ADC1_CH6, 0 - 4095) |
| **DOUT (DO)** | Không cần nối | - | Chân xuất mức Logic so sánh (không dùng) |

*Lưu ý:* GPIO 34 là chân chuyên dụng Analog Input của ESP32 thuộc bộ ADC1, hoạt động hoàn hảo ngay cả khi bật WiFi.

---

#### 3. Cảm biến nhiệt độ & độ ẩm DHT22 (4 chân / 3 chân module)
| Chân trên DHT22 | Chân ESP32 DevKit V1 | Màu dây khuyên dùng | Chức năng |
|---|---|---|---|
| **Chân 1 (VCC)** | **3V3** (Ray dương 3.3V `+`) | Đỏ (Red) | Nguồn cấp 3.3V |
| **Chân 2 (SDA / Data)** | **GPIO 15** (`D15`) | Xanh lá (Green) | Đường truyền dữ liệu 1-Wire số |
| **Chân 3 (NC)** | Bỏ trống | - | Không sử dụng |
| **Chân 4 (GND)** | **GND** (Ray âm `-`) | Đen (Black) | Nối đất 0V |
| **Điện trở 10kΩ** | **Nối giữa Chân 1 (VCC) và Chân 2 (SDA)** | - | Điện trở kéo lên (Pull-up resistor) giúp tín hiệu rõ ràng |

*Lưu ý:* Nếu dùng module DHT22 đã tích hợp sẵn trên mạch nhỏ (thường có 3 chân VCC, DATA, GND), module đã có sẵn điện trở trở kéo lên trên bo, chỉ cần nối trực tiếp 3 chân.

---

#### 4. Còi báo động Buzzer 5V (2 chân)
| Chân trên Buzzer | Chân ESP32 DevKit V1 | Màu dây khuyên dùng | Chức năng |
|---|---|---|---|
| **Chân dương (+)** (Chân dài hơn) | **GPIO 23** (`D23`) | Tím (Purple) | Tín hiệu xung kích hoạt âm thanh còi |
| **Chân âm (-)** (Chân ngắn hơn) | **GND** (Ray âm `-`) | Đen (Black) | Nối đất 0V |

*Lưu ý:* Còi Buzzer thay thế hoàn toàn vai trò của đèn LED đỏ cảnh báo: Khi khí vượt ngưỡng hoặc khi người dùng bật cưỡng bức từ Dashboard, còi sẽ phát tín hiệu cảnh báo rõ ràng.

---

## 3. NGUYÊN LÝ HOẠT ĐỘNG & NGƯỠNG ĐÁNH GIÁ CHẤT LƯỢNG

Hệ thống đánh giá không khí phòng học dựa trên 3 cấp độ:

1. **Cấp độ TỐT (An toàn):**
   - Nồng độ Gas/Khói: $< 1500$ ADC.
   - Nhiệt độ $< 35^\circ C$, Độ ẩm $< 85\%$.
   - Màn hình OLED hiển thị: `[+] AN TOAN (TOT)`.
   - Còi Buzzer: **TẮT**.

2. **Cấp độ TRUNG BÌNH (Cần lưu ý / Thông gió):**
   - Nồng độ Gas/Khói: từ $1500$ đến $2500$ ADC, HOẶC nhiệt độ/độ ẩm vượt ngưỡng cảnh báo.
   - Màn hình OLED hiển thị: `[!] TRUNG BINH`.
   - Còi Buzzer: **TẮT** (ở chế độ AUTO, chỉ hiển thị nhắc nhở).

3. **Cấp độ NGUY HIỂM (Báo động khẩn cấp):**
   - Nồng độ Gas/Khói: $> 2500$ ADC.
   - Màn hình OLED hiển thị: `[X] ! NGUY HIEM !`.
   - Còi Buzzer: **HÚ CÒI BÁO ĐỘNG LIÊN TỤC** để học sinh và giáo viên sơ tán hoặc mở cửa phòng học.

---

## 4. DỮ LIỆU CLOUD THINGSPEAK (CHANNEL ID: 3551578)

- **Chu kỳ gửi dữ liệu:** Mỗi 20 giây (Phù hợp với giới hạn 15s của ThingSpeak Free Tier).
- **Chu kỳ kiểm tra lệnh điều khiển:** Mỗi 5 giây (ESP32 đọc trường Field 5 để đồng bộ trạng thái còi).

| Field | Tên trường trên ThingSpeak | Giá trị | Ý nghĩa |
|:---:|---|---|---|
| **Field 1** | `Temperature` | Số thực (VD: 28.0) | Nhiệt độ (°C) từ DHT22 |
| **Field 2** | `Humidity` | Số thực (VD: 65.0) | Độ ẩm (%) từ DHT22 |
| **Field 3** | `Gas Level` | Số nguyên (0 - 4095) | Chỉ số ADC nồng độ khí ô nhiễm từ MQ-135 |
| **Field 4** | `Air Quality Level` | `0`, `1`, `2` | 0: Tốt, 1: Trung bình, 2: Nguy hiểm |
| **Field 5** | `Control Mode` | `0`, `1`, `2` | 0: Tự động (AUTO), 1: Bật còi cưỡng bức, 2: Tắt còi cưỡng bức |

---

## 5. CÁCH CHẠY MÔ PHỎNG TRÊN WOKWI

### Cách 1: Chạy trực tiếp trong VS Code bằng Wokwi Extension
1. Mở file [diagram.json](file:///c:/CNTT/KY9-2026/IoT/testduan/diagram.json) trong VS Code.
2. Nhấn tổ hợp phím **`F1`** (hoặc `Ctrl+Shift+P`), gõ chọn **`Wokwi: Start Simulator`**.
3. Cửa sổ mô phỏng sẽ hiện lên:
   - Màn hình OLED SSD1306 0.96" hiển thị các thông số thời gian thực.
   - Click vào **`gas1`** để kéo thanh trượt nồng độ khí gas.
   - Click vào **`dht1`** để chỉnh nhiệt độ và độ ẩm.
   - Còi Buzzer sẽ kêu ngay khi khí vượt quá 2500 ADC!

### Cách 2: Chạy trên trình duyệt Web (Wokwi.com)
1. Truy cập [wokwi.com](https://wokwi.com/), chọn tạo dự án **ESP32**.
2. Sao chép nội dung [diagram.json](file:///c:/CNTT/KY9-2026/IoT/testduan/diagram.json) vào tab `diagram.json`.
3. Sao chép nội dung [air_quality_monitor.ino](file:///c:/CNTT/KY9-2026/IoT/testduan/air_quality_monitor.ino) vào tab code.
4. Sao chép danh sách thư viện trong [libraries.txt](file:///c:/CNTT/KY9-2026/IoT/testduan/libraries.txt) vào tab `libraries.txt`.
5. Bấm nút **Play** màu xanh để chạy mô phỏng.

---

## 6. MỞ WEB DASHBOARD ĐIỀU KHIỂN & THEO DÕI
1. Mở file [index.html](file:///c:/CNTT/KY9-2026/IoT/testduan/index.html) bằng bất kỳ trình duyệt nào (Chrome, Edge, Cốc Cốc).
2. Dashboard sẽ tự động:
   - Tải dữ liệu các cảm biến từ kênh ThingSpeak Channel 3551578.
   - Vẽ đồ thị động thời gian thực (Nhiệt độ, Độ ẩm, Khí MQ-135).
   - Có 3 nút bấm điều khiển còi từ xa: **TỰ ĐỘNG (AUTO)**, **BẬT CÒI (FORCE ON)**, **TẮT CÒI (FORCE OFF)**.
   - Tích hợp bộ đếm tự động thử lại sau 3 giây nếu gặp giới hạn 15s của ThingSpeak API.
