# ✅ SQLite Database Migration - Di chuyển Cơ sở dữ liệu sang SQLite (Hoàn thành)

> **Cập nhật ngày:** 24/08/2026 lúc 13:15  
> **Trạng thái:** Hoàn thành & Tích hợp 100%

## 🎯 TỔNG QUAN

Để chuẩn bị cho hệ thống sẵn sàng hoạt động với dữ liệu thực tế ổn định, Backend đã được nâng cấp từ lưu trữ file JSON tĩnh (`backend/data/*.json`) sang cơ sở dữ liệu SQL thực tế là **SQLite** sử dụng **Sequelize ORM** để quản lý cấu trúc bảng (schema).

---

## 🛠️ CHI TIẾT TRIỂN KHAI

### 1. Thư viện tích hợp
* Cài đặt `sequelize` (phiên bản `^6.37.1`) và `sqlite3` (phiên bản `^5.1.7`) vào dự án thông qua `backend/package.json`.

### 2. Thiết lập cấu trúc & Models: [`backend/src/db.js`](file:///c:/Users/tungm/Downloads/ThucTap_New/backend/src/db.js)
* **File database vật lý:** Tạo tự động tại `backend/data/lab.db`.
* **Sequelize Models (Khung bảng):** Định nghĩa **13 bảng SQL** tương ứng với các thực thể trong hệ thống:
  1. `users` (Thành viên)
  2. `equipment` (Thiết bị & Linh kiện)
  3. `borrows` (Lịch mượn trả)
  4. `schedules` (Lịch trực Lab)
  5. `tasks` (Nhiệm vụ & Điểm thưởng)
  6. `attendance` (Lịch sử check-in Lab)
  7. `bookings` (Đặt phòng Lab)
  8. `rfid_cards` (Quản lý thẻ RFID)
  9. `rfid_history` (Lịch sử quét thẻ)
  10. `notifications` (Thông báo hệ thống)
  11. `sessions` (Phiên trực thực tế)
  12. `equipment_catalog` (Danh mục gốc)
  13. `maintenance` (Lịch sửa chữa thiết bị)
* **Đồng bộ tự động & Seeding:**
  * Khi server chạy lần đầu, `syncDatabase()` sẽ tự động đồng bộ hóa cấu trúc SQL với database.
  * Nếu bảng rỗng, hệ thống sẽ tự động đọc dữ liệu mẫu cũ từ các file JSON để nạp (seed) vào SQLite, giúp giao diện không bị trống dữ liệu chạy thử.

### 3. Cơ chế hoạt động đặc biệt (Transparent Drop-in)
* Nhằm giảm thiểu rủi ro lỗi logic nghiệp vụ phức tạp của backend (gần 2300 dòng code), `db.js` cung cấp hai hàm wrapper là `readCollection` và `writeCollection` có signature giống hệt phiên bản cũ:
  * **Đọc:** `readCollection()` trả về dữ liệu nhanh chóng từ bộ nhớ đệm (Cache) trong RAM (O(1)).
  * **Ghi:** `writeCollection()` cập nhật cache lập tức và tự động ghi xuống file SQLite `lab.db` bất đồng bộ ở background.
* Nhờ cơ chế này, backend vẫn chạy cực nhanh, không làm nghẽn thread xử lý, và không phải sửa đổi cấu trúc logic của 100 API endpoints có sẵn trong `server.js`.

---

## 📋 CÁCH QUẢN LÝ DATABASE VẬT LÝ

* Cơ sở dữ liệu được lưu trữ tại file: **`backend/data/lab.db`**.
* Để kiểm tra cấu trúc bảng hoặc sửa đổi dữ liệu trực tiếp, bạn nên cài phần mềm miễn phí: **[DB Browser for SQLite](https://sqlitebrowser.org/)**.
