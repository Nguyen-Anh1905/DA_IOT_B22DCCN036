# 🌐 Dự án IoT - DA_IOT_B22DCCN036

## 🧾 Giới thiệu
Đây là dự án **Internet of Things (IoT)** được thực hiện trong khuôn khổ học phần tại trường.  
Mục tiêu của dự án là thu thập và giám sát dữ liệu cảm biến thông qua vi điều khiển (Arduino / ESP8266)  
và gửi dữ liệu lên máy chủ hoặc hiển thị trên giao diện web.

--------

## ⚙️ Công nghệ sử dụng
- **Ngôn ngữ lập trình:** C/C++ (Arduino)
- **Phần cứng:** ESP8266 / Arduino Uno  
- **Cảm biến:** DHT11 và BH1750 
- **Kết nối:** Wi-Fi
- **DataBase: Mysql
- **Backend: Springboot
- **Giao thức kết nối: MQTT
- **Giao diện hiển thị:** Web dashboard (html, css, js)
- **IDE: Intelij (Khuyến nghị)

--------

🌍 Mô tả chức năng chính
Kết nối và nhận dữ liệu từ thiết bị IoT
Lưu lịch sử hoạt động của thiết bị
Bộ lọc và tìm kiếm theo thiết bị, trạng thái, thời gian
API REST hỗ trợ gửi dữ liệu từ cảm biến

--------

## 🚀 Cách chạy dự án

### 1️⃣ Yêu cầu hệ thống
- Java 17 trở lên  
- Maven 3.8+  
- MySQL

### 2️⃣ Chạy dự án
```bash
# Build dự án
./mvnw clean install

# Chạy ứng dụng
./mvnw spring-boot:run
```` 
--------

👨‍💻 Tác giả
Nguyễn Anh
MSSV: B22DCCN036
Trường: PTIT
Email: anh9701zt@gmail.com


