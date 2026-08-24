# 🎨 RFID Modal - Visual Guide

## 📱 Modal Appearance

```
┌───────────────────────────────────────────┐
│  🔐 Xác thực RFID                    ✕   │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 🎯 Xác nhận mượn thiết bị          │ │
│  │                                     │ │
│  │   Đang chờ quét thẻ RFID...        │ │
│  │                                     │ │
│  │ Chọn số tương ứng với thẻ của bạn  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│     ┌─────────┐      ┌─────────┐         │
│     │         │      │         │         │
│     │    1    │      │    2    │         │
│     │         │      │         │         │
│     └─────────┘      └─────────┘         │
│                                           │
│     ┌─────────┐      ┌─────────┐         │
│     │         │      │         │         │
│     │    3    │      │    4    │         │
│     │         │      │         │         │
│     └─────────┘      └─────────┘         │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 🧪 Chế độ Test                      │ │
│  │ Số 1-4 tương ứng với thẻ sinh viên │ │
│  │ đã đăng ký                          │ │
│  │                                     │ │
│  │ Khi có thiết bị RFID thật, sẽ tự   │ │
│  │ động quét thẻ                       │ │
│  └─────────────────────────────────────┘ │
│                                           │
├───────────────────────────────────────────┤
│                [ Hủy ]                    │
└───────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Background
- Modal overlay: `rgba(0, 0, 0, 0.75)` - Tối mờ
- Modal content: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`

### Header
- Border: `rgba(59, 130, 246, 0.3)` - Xanh nhạt
- Title color: `#60a5fa` - Xanh sáng

### Info Box
- Background: `rgba(59, 130, 246, 0.1)`
- Border: `rgba(59, 130, 246, 0.3)`
- Title: `#94a3b8` - Xám nhạt
- Main text: `#fff` - Trắng
- Sub text: `#64748b` - Xám tối

### Number Buttons
- Background: `linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)`
- Border: `2px solid rgba(59, 130, 246, 0.4)`
- Text color: `#60a5fa`
- Font size: `2rem` (32px)
- **Hover state:**
  - Background opacity tăng lên 0.35
  - Transform: `scale(1.05)`
  - Box shadow: `0 6px 20px rgba(59, 130, 246, 0.4)`

### Test Info Box
- Background: `rgba(100, 116, 139, 0.1)`
- Border: `1px dashed rgba(100, 116, 139, 0.3)`
- Text color: `#64748b`

## 🔄 User Flow

### Mượn Thiết Bị:
```
[Form mượn]
    ↓
[Nhập MSSV: 20210001]
    ↓
[Nhập số lượng, ngày trả...]
    ↓
[Nhấn "Xác nhận"] ←───────────────┐
    ↓                              │
[RFID Modal xuất hiện]             │
    ↓                              │
[Chọn số 1] ← Mapping ẩn: CARD-001 │
    ↓                              │
[API: /rfid-scan]                  │
    ↓                              │
[Kiểm tra MSSV]                    │
    ├─ ✅ Khớp                      │
    │   ↓                          │
    │   [Tạo phiếu mượn]           │
    │   ↓                          │
    │   [✅ Thành công]             │
    │                              │
    └─ ❌ Không khớp               │
        ↓                          │
        [Hiển thị lỗi]             │
        ↓                          │
        [Quay lại form] ───────────┘
```

### Trả Thiết Bị:
```
[Danh sách phiếu mượn]
    ↓
[Chọn phiếu cần trả]
    ↓
[Nhấn "Trả thiết bị"]
    ↓
[Form trả (MSSV mặc định)]
    ↓
[Nhập tình trạng, ghi chú...]
    ↓
[Nhấn "Xác nhận duyệt trả"]
    ↓
[RFID Modal xuất hiện]
    ↓
[Chọn số tương ứng]
    ↓
[Xác thực RFID]
    ↓
[✅ Hoàn tất trả thiết bị]
```

## 🎯 Button States

### Normal State
```css
padding: 1.5rem
fontSize: 2rem
color: #60a5fa
background: linear-gradient(...)
border: 2px solid rgba(59, 130, 246, 0.4)
borderRadius: 12px
boxShadow: 0 4px 12px rgba(59, 130, 246, 0.2)
```

### Hover State
```css
transform: scale(1.05)
background: [opacity tăng lên 0.35]
boxShadow: 0 6px 20px rgba(59, 130, 246, 0.4)
cursor: pointer
transition: all 0.2s ease
```

### Active/Click State
```css
transform: scale(0.98)
```

## 📊 Success/Error Messages

### ✅ Success Message
```
╔═══════════════════════════════════════╗
║ ✅ Xác thực thành công: Nguyễn Văn A ║
╚═══════════════════════════════════════╝
```
- Background: `rgba(16, 185, 129, 0.15)`
- Color: `#10b981`
- Border: `1px solid rgba(16, 185, 129, 0.3)`

### ❌ Error Message - Thẻ không khớp
```
╔════════════════════════════════════════════╗
║ ❌ Thẻ không khớp!                         ║
║ Thẻ quét: Nguyễn Văn A (20210001)        ║
║ Đã điền: 20210002                         ║
╚════════════════════════════════════════════╝
```
- Background: `rgba(239, 68, 68, 0.15)`
- Color: `#ef4444`
- Border: `1px solid rgba(239, 68, 68, 0.3)`

### ❌ Error Message - Thẻ không hợp lệ
```
╔═══════════════════════════════════════════╗
║ ❌ Thẻ RFID không được đăng ký trong      ║
║    hệ thống                               ║
╚═══════════════════════════════════════════╝
```

## 🔢 Number to Card Mapping (Hidden from User)

| Nút hiển thị | Mã thẻ thực | Sinh viên | MSSV |
|:---:|:---:|:---:|:---:|
| **1** | CARD-001 | Nguyễn Văn A | 20210001 |
| **2** | CARD-002 | Trần Thị B | 20210002 |
| **3** | CARD-003 | Lê Văn C | 20220003 |
| **4** | CARD-004 | Phạm Minh D | 20220004 |

## 📐 Layout Specifications

### Modal Dimensions
- Max width: `420px`
- Border radius: `12px`
- Padding: `1.5rem`
- z-index: `10000`

### Grid Layout (Number Pad)
```css
display: grid
gridTemplateColumns: repeat(2, 1fr)
gap: 1rem
```

### Button Dimensions
- Padding: `1.5rem` (24px)
- Border radius: `12px`
- Font size: `2rem` (32px)
- Font weight: `bold`

### Spacing
- Modal body padding: `1.5rem`
- Info box margin bottom: `1.5rem`
- Test info margin top: `1rem`
- Footer button width: `100%`

## 🌐 Responsive Behavior

- Modal tự động center trên màn hình
- Overlay phủ toàn bộ viewport
- Close bằng:
  - Nút X (góc trên bên phải)
  - Nút "Hủy" (footer)
  - ❌ Không close khi click overlay (để tránh mất dữ liệu)

## 🔊 Future: Sound Effects (Khi có hardware)

```
BEEP_SUCCESS = 📢 "beep-success.mp3" (pitch: high, duration: 200ms)
BEEP_ERROR   = 📢 "beep-error.mp3" (pitch: low, duration: 500ms)
BEEP_SCAN    = 📢 "beep-scan.mp3" (pitch: mid, duration: 100ms)
```

---

**Ghi chú thiết kế:**
- Sử dụng gradient để tạo chiều sâu
- Hover effects mượt mà với transition 0.2s
- Box shadow tạo cảm giác nổi 3D
- Color scheme đồng nhất với theme tổng thể (xanh dương)
- Typography rõ ràng, dễ đọc (2rem cho số)
