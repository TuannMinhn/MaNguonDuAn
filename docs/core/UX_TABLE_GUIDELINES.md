# Hướng Dẫn Tối Ưu UX Bảng Dữ Liệu (13 Nguyên Tắc)

Tài liệu này lưu trữ 13 nguyên tắc thiết kế Bảng dữ liệu (Data Table UX) chuẩn mực và cách triển khai code CSS/React tương ứng để bạn có thể tái sử dụng cho bất kỳ dự án nào sau này.

## 13 Nguyên Tắc Cốt Lõi

1. **Thanh điều hướng tối giản:** Dùng tab chữ hoặc dropdown thay cho các khối nút lớn cồng kềnh.
2. **Làm nổi bật Tiêu đề:** Phủ một lớp màu nhạt (tint) lên `<th>` để phân biệt hoàn toàn với thân bảng.
3. **Làm rõ chức năng sắp xếp:** Biểu tượng mũi tên sắp xếp (Sort) cần đổi màu (Accent) khi di chuột hoặc khi đang kích hoạt.
4. **Làm nhạt đường viền hàng:** Hạ opacity của `border-bottom` xuống thấp nhất có thể, chỉ để giữ cấu trúc chứ không cản trở việc đọc chữ.
5. **Tăng chiều cao hàng:** Thêm Padding (khoảng 1.15rem) để dữ liệu có "không gian thở".
6. **Sử dụng nút biểu tượng (Hybrid):** Dùng Icon cho các hành động phụ (Sửa, Xóa, Chi tiết) để giảm nhiễu văn bản. Các hành động chính vẫn dùng chữ.
7. **Căn lề phải cho các con số:** Tất cả cột số lượng, tài chính, phần trăm đều phải căn phải (`text-align: right`) và dùng font số đều (`tabular-nums`).
8. **Sử dụng thẻ trạng thái (Chips):** Dùng các khối màu bo tròn (Badges) để báo hiệu mức độ ưu tiên/tình trạng khẩn cấp.
9. **Viết tắt tên tháng:** Dùng định dạng ngày tháng dễ đọc bằng chữ (VD: `06 Thg 08, 2026`) thay vì toàn số.
10. **In đậm tên bản ghi:** Cột chứa tên thực thể chính (Tên thiết bị, Tên người dùng) phải được in đậm (`font-weight: 600`) để định hình cột mốc thị giác.
11. **Nhấn mạnh ô tìm kiếm:** Khung tìm kiếm cần rộng hơn và có bóng đổ (box-shadow) để thu hút tương tác.
12. **Phản hồi khi chọn hàng:** Dòng nào đang được thao tác hoặc chọn (checkbox) phải được đổi màu nền (Highlight).
13. **Kết hợp Icon cho hành động hàng loạt:** Các nút như Xuất Excel, Import phải có icon đi kèm chữ.

---

## Mẫu CSS Tái Sử Dụng (Boilerplate)

Bạn có thể copy đoạn CSS này vào bất kỳ dự án nào để áp dụng tự động các nguyên tắc trên:

```css
/* 1. Tối ưu Zoom và Font Size toàn cầu */
html { font-size: 90%; } /* Thu nhỏ giao diện tương đương zoom 90% */
body { font-size: 1rem; }

/* 2. Tiêu đề Bảng (Sticky, Tint màu) */
th {
  padding: 1.15rem 1rem; /* Không gian thở */
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255,255,255,0.025); /* Viền cực nhạt */
  
  /* Sticky */
  position: sticky; top: 0; z-index: 10;
  
  /* Tint màu xanh siêu mờ (Dành cho Dark Mode) */
  background: #0d1222;
  background-image: linear-gradient(rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.04));
  backdrop-filter: blur(8px);
}

/* 3. Icon Sắp xếp tương tác */
th svg { color: #64748b; transition: color 0.2s ease; margin-left: 4px; }
th:hover svg { color: #3b82f6; }

/* 4. Dòng Dữ liệu */
td {
  padding: 1.15rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.025); /* Viền cực nhạt */
}
tbody tr { transition: background-color 0.2s ease; }
tbody tr:hover { background-color: rgba(255, 255, 255, 0.1); }

/* 5. Dòng Đang Chọn / Thao Tác */
.row-selected { background-color: rgba(59, 130, 246, 0.08) !important; }

/* 6. Form Tìm Kiếm Tương Tác Cấp Cao */
.search-input {
  padding: 0.85rem 1rem 0.85rem 3rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); /* Bóng đổ thu hút */
}
```

## Các Class/Style Cần Thêm Bằng Tay (Tailwind/React)

1. **Cột Số liệu:** Luôn luôn thêm thuộc tính:
   `style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}`
2. **Cột Tên Thực Thể:** Luôn luôn in đậm:
   `style={{ fontWeight: '600' }}`
3. **Format Ngày Tháng (JS):**
   ```javascript
   const formatDate = (isoString) => {
     const date = new Date(isoString);
     const day = String(date.getDate()).padStart(2, '0');
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const year = date.getFullYear();
     return `${day} Thg ${month}, ${year}`;
   };
   ```
