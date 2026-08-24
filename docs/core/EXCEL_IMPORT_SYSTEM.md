# ✅ Excel Import System - Hệ thống Nhập dữ liệu từ Excel (Hoàn thành)

> **Cập nhật ngày:** 24/08/2026 lúc 13:15  
> **Trạng thái:** Hoàn thành & Tích hợp 100%

## 🎯 TỔNG QUAN

Tính năng cho phép quản trị viên nhập nhanh danh sách thiết bị và linh kiện từ file Excel (.xlsx, .xls) vào hệ thống bằng cách tải file mẫu, điền dữ liệu, và kéo thả để tải lên. Quá trình xử lý và kiểm tra định dạng dữ liệu (validation) được thực hiện trực tiếp ở frontend trước khi đẩy vào database.

---

## 🛠️ CHI TIẾT CÁC COMPONENT ĐÃ THÊM

### 1. Component Giao diện: [`ImportExcelModal.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/ImportExcelModal.jsx) & [`ImportExcelModal.css`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/ImportExcelModal.css)
* **Chức năng:**
  * Hộp thoại (Modal) kéo thả file Excel.
  * Nút tải file Excel mẫu chuẩn (`template_import.xlsx`) với các tiêu đề cột đúng định dạng.
  * Phân tích (parse) file Excel thành dữ liệu JSON ngay trên trình duyệt (dùng thư viện `xlsx`).
  * Kiểm tra lỗi dữ liệu (Validation): Phát hiện nếu thiếu cột bắt buộc, hoặc sai kiểu dữ liệu (vd: số lượng nhập bằng chữ) và hiển thị cảnh báo chi tiết từng dòng.
  * Xem trước dữ liệu (Preview) tối đa 10 dòng trước khi import.
  * Hiển thị kết quả import (bao nhiêu dòng thành công, bao nhiêu dòng lỗi).

### 2. Tích hợp màn hình:
* **Trang Thiết bị ([`Equipment.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/pages/Equipment.jsx))**:
  * Thêm nút **Import Excel** trên header.
  * Khai báo sơ đồ cột (`equipmentFieldMap`): Tên thiết bị, Mã thiết bị, Số lượng, Vị trí, Danh mục, Đơn vị, Ngưỡng tối thiểu.
  * Gọi API `POST /api/equipment/import` với `assetType = 'Thiết bị'`.
* **Trang Linh kiện ([`ComponentsInventory.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/pages/ComponentsInventory.jsx))**:
  * Thêm nút **Import Excel** trên header.
  * Khai báo sơ đồ cột (`componentFieldMap`): Tên linh kiện, Mã linh kiện, Số lượng tồn, Vị trí, Danh mục, Đơn vị tính, Ngưỡng cảnh báo.
  * Gọi API `POST /api/equipment/import` với `assetType = 'Linh kiện tiêu hao'`.

### 3. API Backend: [`server.js`](file:///c:/Users/tungm/Downloads/ThucTap_New/backend/src/server.js)
* **Endpoint:** `POST /api/equipment/import`
* **Logic xử lý:**
  * Nhận danh sách các dòng thiết bị/linh kiện.
  * Kiểm tra trùng lặp: Nếu mã thiết bị đã tồn tại trong database, ghi nhận lỗi dòng đó và bỏ qua để bảo vệ dữ liệu cũ.
  * Lưu toàn bộ các bản ghi hợp lệ vào database và trả về số lượng thành công/thất bại.

---

## 📋 HƯỚNG DẪN KIỂM TRA & SỬ DỤNG
1. Vào trang **Quản lý thiết bị** hoặc **Quản lý Linh kiện**.
2. Click nút **Import Excel**.
3. Bấm **Tải file mẫu (.xlsx)**.
4. Điền dữ liệu thật/test vào file mẫu và lưu lại.
5. Kéo thả file Excel vào modal hoặc click chọn file.
6. Xem trước bảng dữ liệu và nhấn nút **Import**.
7. Tắt modal và kiểm tra danh sách đã được tự động cập nhật.
