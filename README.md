# 🍃 HỆ THỐNG GIÁM SÁT CHẤT LƯỢNG KHÔNG KHÍ TRONG PHÒNG HỌC (IoT)
> **Đề tài môn học Internet of Things (IoT)**  
> **Nền tảng:** ESP32 DevKit V1 + Cảm biến MQ-135 + Cảm biến DHT22 + Màn hình OLED 0.96" SSD1306 + Còi báo động Buzzer 5V + ThingSpeak Cloud + Web Dashboard

---

## 📌 1. GIỚI THIỆU TỔNG QUAN

Dự án xây dựng một trạm giám sát chất lượng không khí thông minh đặt trong phòng học, giúp học sinh và giáo viên theo dõi môi trường học tập theo thời gian thực:
- **Đo nồng độ khí ô nhiễm, khí gas, khói (MQ-135):** Phát hiện nguy cơ cháy nổ, mùi khó chịu hoặc không khí ngột ngạt.
- **Đo nhiệt độ & độ ẩm (DHT22):** Giám sát sự thoải mái trong phòng học.
- **Hiển thị tại chỗ (OLED 0.96" SSD1306):** Màn hình I2C cập nhật trực quan chỉ số, đánh giá chất lượng và trạng thái hệ thống.
- **Báo động tức thì (Còi Buzzer 5V):** Hú còi cảnh báo khi chất lượng không khí rơi vào mức **NGUY HIỂM** hoặc theo lệnh khẩn cấp.
- **Lưu trữ đám mây (ThingSpeak IoT):** Tự động gửi dữ liệu lên kênh ThingSpeak qua WiFi mỗi 20 giây.
- **Web Dashboard giám sát & điều khiển từ xa:** Giao diện Web hiện đại, vẽ biểu đồ trực quan, hỗ trợ điều khiển còi từ xa qua chế độ **Tự động (AUTO)**, **Bật còi (FORCE ON)**, **Tắt còi (FORCE OFF)**.

---

## 📂 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
DuAnIoT/
├── .vscode/                   # Cấu hình khuyến nghị extension cho VS Code
│   └── extensions.json        # Tự động gợi ý cài PlatformIO & Wokwi
├── src/                       # Mã nguồn C++ chính cho PlatformIO
│   └── main.cpp               # Logic điều khiển ESP32, đọc cảm biến, gửi ThingSpeak
├── air_quality_monitor.ino    # Bản mã nguồn Arduino tương thích chạy trên Wokwi Web / Arduino IDE
├── diagram.json               # Sơ đồ mạch điện mô phỏng trên Wokwi (đã tối ưu dây thoáng đẹp)
├── platformio.ini             # Cấu hình board ESP32 và tự động tải thư viện
├── wokwi.toml                 # Liên kết Wokwi với file firmware biên dịch từ PlatformIO
├── libraries.txt              # Danh sách thư viện khi chạy trên Wokwi.com (Web)
├── index.html                 # Giao diện Web Dashboard giám sát & điều khiển
├── style.css                  # Giao diện CSS hiện đại cho Dashboard
├── app.js                     # Logic JavaScript kết nối ThingSpeak API & biểu đồ
├── HUONG_DAN_SU_DUNG.md       # Tài liệu kỹ thuật chi tiết về ngưỡng đo & sơ đồ mạch
├── QUICK_START.md             # Hướng dẫn nhanh 3 bước dành cho người mới
├── .gitignore                 # Loại trừ file rác, cache build (.pio) trước khi đẩy lên Git
└── README.md                  # Hướng dẫn chính của dự án (file này)
```

---

## 🛠️ 3. CÁC PHẦN MỀM CẦN CÀI ĐẶT TRƯỚC (YÊU CẦU HỆ THỐNG)

Trước khi chạy dự án, máy tính cần cài sẵn các công cụ sau:

1. **[Visual Studio Code](https://code.visualstudio.com/)** (Phiên bản mới nhất).
2. **Hai Extension bắt buộc trên VS Code:**
   - **PlatformIO IDE** (ID: `platformio.platformio-ide`): Dùng để quản lý thư viện và biên dịch mã nguồn ESP32 ra file firmware nhị phân (`.bin`).
   - **Wokwi Simulator** (ID: `wokwi.wokwi-vscode`): Dùng để chạy mô phỏng toàn bộ mạch ESP32, cảm biến và màn hình ngay trong VS Code.
3. **Trình duyệt Web:** Google Chrome, Microsoft Edge, Cốc Cốc hoặc Firefox (dùng để mở Web Dashboard).

---

## 🚀 4. HƯỚNG DẪN DÀNH CHO BẠN BÈ KHI PULL / CLONE VỀ MÁY MỚI

Khi bạn bè tải mã nguồn từ GitHub về, thư mục `.pio` (chứa các file build nhị phân nặng) đã được ẩn đi qua `.gitignore`. Hãy làm theo các bước sau để chạy dự án:

### Bước 1: Mở dự án trong VS Code
1. Mở VS Code.
2. Chọn **File** $\rightarrow$ **Open Folder...** $\rightarrow$ Chọn thư mục `DuAnIoT` vừa clone về.
3. Nếu VS Code hiện thông báo pop-up: *"This repository recommends extensions: PlatformIO, Wokwi..."*, hãy chọn **Install All** để cài đặt.

### Bước 2: Biên dịch Firmware (Bắt buộc chạy lần đầu)
File firmware `.bin` cần được biên dịch một lần để Wokwi có thể nạp vào chip ảo:
- **Cách 1 (Dùng giao diện):** Nhìn xuống thanh trạng thái màu xanh dương ở góc dưới cùng bên trái VS Code, nhấn vào biểu tượng **`✓` (PlatformIO: Build)**.
- **Cách 2 (Dùng phím tắt):** Nhấn tổ hợp phím **`Ctrl + Alt + B`**.
- **Cách 3 (Dùng Terminal):** Mở Terminal trong VS Code và gõ lệnh:
  ```bash
  pio run
  ```
> ⏳ **Lưu ý:** Lần đầu tiên chạy, PlatformIO sẽ tự động tải board ESP32 và các thư viện (`Adafruit DHT`, `Adafruit Unified Sensor`, `U8g2`) từ Internet. Quá trình này mất khoảng 1 - 2 phút cho đến khi hiện chữ **`[SUCCESS]`**.

### Bước 3: Chạy mô phỏng Wokwi trong VS Code
1. Nhấp chuột mở file **`diagram.json`**.
2. Nhấn phím **`F1`** (hoặc `Ctrl + Shift + P`), gõ tìm:
   ```text
   Wokwi: Start Simulator
   ```
   và nhấn **Enter**.
3. Cửa sổ mô phỏng Wokwi sẽ khởi động:
   - Màn hình OLED SSD1306 0.96" hiển thị các thông số thời gian thực.
   - Click chuột vào **MQ-135 (`gas1`)** để kéo thanh trượt nồng độ khí ô nhiễm.
   - Click chuột vào **DHT22 (`dht1`)** để thay đổi nhiệt độ & độ ẩm.
   - Nhìn vào tab **Wokwi Terminal** để xem log kết nối WiFi ảo (`Wokwi-GUEST`), IP và tiến trình gửi dữ liệu lên ThingSpeak.

### Bước 4: Mở Web Dashboard giám sát & điều khiển
1. Chuột phải vào file **`index.html`** $\rightarrow$ chọn **Open with Live Server** (hoặc mở file trực tiếp bằng trình duyệt Web bất kỳ).
2. Dashboard sẽ tự động:
   - Đồng bộ dữ liệu mới nhất từ kênh ThingSpeak Channel `3551578`.
   - Cập nhật biểu đồ theo thời gian thực.
   - Điều khiển còi từ xa thông qua 3 nút: **TỰ ĐỘNG (AUTO)**, **BẬT CÒI (FORCE ON)**, **TẮT CÒI (FORCE OFF)**.

---

## 🔌 5. SƠ ĐỒ ĐẤU NỐI DÂY PHẦN CỨNG (NẾU LÀM MẠCH THỰC TẾ)

| Linh kiện | Chân linh kiện | Chân trên ESP32 DevKit V1 | Màu dây mô phỏng | Chức năng |
|---|---|---|:---:|---|
| **OLED 0.96" SSD1306** | **GND** | **GND** | Đen | Nối đất 0V |
| *(Màn hình I2C 128x64)* | **VCC** | **3V3** | Đỏ | Nguồn 3.3V |
| | **SCL** | **GPIO 22** (`D22`) | Cyan | Xung nhịp I2C SCL |
| | **SDA** | **GPIO 21** (`D21`) | Xanh dương | Tín hiệu I2C SDA |
| **Cảm biến MQ-135** | **VCC** | **VIN** (5V) | Đỏ | Nguồn cấp cho dây sấy 5V |
| *(Khí ô nhiễm / Khói)* | **GND** | **GND** | Đen | Nối đất 0V |
| | **AOUT** | **GPIO 34** (`D34`) | Cam | Tín hiệu Analog ADC (0 - 4095) |
| **Cảm biến DHT22** | **VCC** | **3V3** | Đỏ | Nguồn 3.3V |
| *(Nhiệt độ & Độ ẩm)* | **SDA / DATA** | **GPIO 15** (`D15`) | Xanh lá | Dữ liệu số 1-Wire |
| | **GND** | **GND** | Đen | Nối đất 0V |
| | **Điện trở 10kΩ** | Giữa **VCC** và **DATA** | - | Điện trở kéo lên (Pull-up) |
| **Còi Buzzer 5V** | **Chân dương (+)** | **GPIO 23** (`D23`) | Tím | Tín hiệu kích hoạt còi |
| *(Còi báo động)* | **Chân âm (-)** | **GND** | Đen | Nối đất 0V |

---

## ☁️ 6. CẤU HÌNH CLOUD THINGSPEAK

Dự án đã được cấu hình sẵn kênh ThingSpeak dùng chung cho việc chấm điểm và kiểm thử:
- **Channel ID:** `3551578`
- **Write API Key:** `CE712UCBEPI28WOA`

### Bảng phân bố trường dữ liệu (Fields):
| Field | Tên biến | Kiểu dữ liệu | Mô tả |
|:---:|---|---|---|
| **Field 1** | Temperature | Float (°C) | Nhiệt độ phòng học từ DHT22 |
| **Field 2** | Humidity | Float (%) | Độ ẩm không khí từ DHT22 |
| **Field 3** | Gas Level | Integer (0 - 4095) | Giá trị ADC từ cảm biến MQ-135 |
| **Field 4** | Air Quality | Integer (0, 1, 2) | 0: Tốt, 1: Trung bình, 2: Nguy hiểm |
| **Field 5** | Control Mode | Integer (0, 1, 2) | 0: Tự động, 1: Bật còi cưỡng bức, 2: Tắt còi |

---

## ❓ 7. CÂU HỎI THƯỜNG GẶP & KHẮC PHỤC LỖI (TROUBLESHOOTING)

### 1. Báo lỗi: *"Wokwi: firmware binary .pio/build/esp32dev/firmware.bin not found in workspace"*
- **Nguyên nhân:** Khi vừa clone dự án từ GitHub về, thư mục `.pio` chưa được build nên chưa có file `.bin`.
- **Cách khắc phục:** Nhấn tổ hợp phím **`Ctrl + Alt + B`** (hoặc gõ `pio run` trong Terminal) để PlatformIO biên dịch firmware trước, sau đó mới chạy `Wokwi: Start Simulator`.

### 2. Báo lỗi: *"Lỗi đọc cảm biến: TIMEOUT"* ở DHT22
- **Nguyên nhân:** Lỗi do thư viện cũ không tương thích với ESP32 Core 3.x.
- **Cách khắc phục:** Dự án đã chuyển sang dùng thư viện chuẩn `Adafruit DHT` và bổ sung điện trở kéo lên 10kΩ trên chân DATA. Đảm bảo chạy `pio run` để cập nhật code mới nhất.

### 3. Điều khiển nút bấm trên Web Dashboard nhưng Wokwi chưa đổi ngay?
- **Nguyên nhân:** Tài khoản ThingSpeak miễn phí giới hạn thời gian gửi/nhận tối thiểu là **15 giây** giữa mỗi lần cập nhật.
- **Cách khắc phục:** 
  - ESP32 được cấu hình kiểm tra lệnh mỗi 5 giây (`checkRemoteCommand`).
  - Web Dashboard có sẵn bộ đếm thời gian tự động thử lại sau 3 giây nếu gặp giới hạn 15s. Bạn chỉ cần bấm nút một lần và đợi vài giây để hệ thống đồng bộ.

---

## 👥 THÀNH VIÊN THỰC HIỆN DỰ ÁN
- **Đề tài:** Hệ thống IoT giám sát chất lượng không khí phòng học.
- **Môn học:** Internet of Things (IoT).
- Chúc bạn chạy thử nghiệm và bảo vệ đồ án thành công! 🎉
