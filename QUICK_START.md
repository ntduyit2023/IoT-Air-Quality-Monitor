# ⚡ HƯỚNG DẪN NHANH DÀNH CHO BẠN BÈ (QUICK START)
> Đọc file này nếu bạn vừa pull/clone code về và muốn chạy ngay trong 3 phút!

---

## 1. Cần cài đặt những gì trước?
Tải và cài đặt trên máy tính (nếu chưa có):
1. **VS Code**: [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Mở tab **Extensions** (`Ctrl + Shift + X`) trên VS Code, cài đặt 2 extension sau:
   - **PlatformIO IDE** (tìm từ khóa: `platformio`)
   - **Wokwi Simulator** (tìm từ khóa: `wokwi`)

---

## 2. Các bước chạy dự án (Chỉ 3 bước)

### 🔹 Bước 1: Build mã nguồn Firmware
- Nhấn tổ hợp phím: **`Ctrl + Alt + B`** (hoặc bấm dấu tích **`✓`** ở góc dưới cùng bên trái màn hình VS Code).
- Đợi PlatformIO tải thư viện và biên dịch xong, màn hình hiện **`[SUCCESS]`**.

### 🔹 Bước 2: Chạy mạch mô phỏng Wokwi
- Mở file **`diagram.json`**.
- Nhấn phím **`F1`** $\rightarrow$ gõ **`Wokwi: Start Simulator`** $\rightarrow$ bấm **Enter**.
- Xem màn hình OLED hiển thị số liệu, click vào cảm biến khí MQ-135 và cảm biến DHT22 để chỉnh thông số mô phỏng.

### 🔹 Bước 3: Mở Web Dashboard điều khiển
- Nhấp đúp chuột mở trực tiếp file **`index.html`** bằng trình duyệt Web bất kỳ (Chrome / Edge / Cốc Cốc).
- Xem biểu đồ và bấm các nút điều khiển chế độ còi báo động.

---

> 💡 **Gặp lỗi?** Xem mục số 7 trong file [README.md](README.md) để biết cách khắc phục!

