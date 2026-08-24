# ✅ Waitlist System - Full Package (Hoàn thành)

## 🎯 TỔNG QUAN

Hệ thống đăng ký chờ mượn thiết bị khi hết hàng, với thông báo tự động và quản lý danh sách chờ đầy đủ.

---

## 📦 PHASE 1: VISUAL - HIỂN THỊ THIẾT BỊ HẾT

### ✅ Đã implement:

#### 1. **Row màu đỏ nhạt**
```css
backgroundColor: rgba(239, 68, 68, 0.08)
opacity: 0.9
```

#### 2. **Icon cảnh báo ⚠️**
- Hiển thị `AlertTriangle` icon màu đỏ trước mã thiết bị
- Chỉ xuất hiện khi `available <= 0`

#### 3. **Badge "Hết hàng"**
- Text: `❌ Hết hàng`
- Màu đỏ `#ef4444`
- Hiển thị dưới số lượng

#### 4. **Số lượng màu đỏ**
- `0 / X` với số 0 màu đỏ `#ef4444`

---

## 📋 PHASE 2: WAITLIST SYSTEM

### Backend APIs:

#### 1. **GET `/api/equipment/:id/waitlist`**
Lấy danh sách chờ của thiết bị
```json
Response: [
  {
    "id": "w1",
    "equipmentId": "eq1",
    "equipmentName": "Máy hiện sóng...",
    "equipmentCode": "RIG-01",
    "mssv": "20210001",
    "userName": "Nguyễn Văn A",
    "qty": 1,
    "notes": "Cần gấp cho dự án",
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting"
  }
]
```

#### 2. **POST `/api/equipment/:id/waitlist`**
Đăng ký chờ mượn
```json
Request: {
  "mssv": "20210001",
  "qty": 1,
  "notes": "Cần gấp"
}

Response: {
  "message": "Đăng ký chờ mượn thành công...",
  "waitlist": { ... }
}
```

#### 3. **DELETE `/api/waitlist/:waitlistId`**
Hủy đăng ký chờ
```json
Request: {
  "mssv": "20210001"
}

Response: {
  "message": "Đã hủy đăng ký chờ mượn"
}
```

#### 4. **GET `/api/waitlist/user/:mssv`**
Lấy danh sách chờ của user
```json
Response: [
  {
    "id": "w1",
    "equipmentName": "Máy hiện sóng...",
    "qty": 1,
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting"
  }
]
```

### Frontend Components:

#### 1. **Nút "Đăng ký chờ"**
- Thay thế nút "Mượn" khi `isOutOfStock = true`
- Màu cam `#f59e0b`
- Icon 🔔

#### 2. **Hiển thị số người chờ**
- Hiển thị trên nút/dưới số lượng
- "👤 X người đang chờ"
- Màu cam `#f59e0b`

#### 3. **Modal đăng ký chờ**
```
┌────────────────────────────────────┐
│ 🔔 Đăng ký chờ mượn thiết bị   ✕  │
├────────────────────────────────────┤
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Máy hiện sóng Rigol DS1054Z    │ │
│ │ Mã: RIG-01 · ❌ Đang hết hàng  │ │
│ │ 📊 Đã có 2 người đăng ký chờ   │ │
│ └────────────────────────────────┘ │
│                                    │
│ 💡 Lưu ý: Bạn sẽ được thông báo   │
│ qua email khi có thiết bị trả về  │
│                                    │
│ MSSV: [_________________]          │
│       (có gợi ý dropdown)          │
│                                    │
│ Số lượng: [___]                    │
│                                    │
│ Ghi chú: [___________________]     │
│                                    │
├────────────────────────────────────┤
│    [Hủy]     [🔔 Đăng ký chờ]      │
└────────────────────────────────────┘
```

---

## 🔔 PHASE 3: AUTO NOTIFICATION

### Khi nào thông báo?
- **Trigger:** Khi có người trả thiết bị
- **Function:** `notifyWaitlist(equipmentId)`
- **Logic:**
  1. Check số lượng còn lại > 0
  2. Lấy người đầu tiên trong waitlist (FIFO)
  3. Đổi status → `notified`
  4. Ghi log console (TODO: gửi email thật)

### Return Equipment Response:
```json
{
  "message": "Trả thiết bị thành công",
  "borrow": { ... },
  "waitlistNotified": {
    "name": "Nguyễn Văn A",
    "mssv": "20210001"
  }
}
```

### Console Log:
```
[NOTIFICATION] Nguyễn Văn A (20210001): Thiết bị Máy hiện sóng... đã có sẵn!
```

---

## 🎨 UI/UX DESIGN

### Color Scheme:

| Element | Color | Usage |
|---------|-------|-------|
| Hết hàng row | `rgba(239, 68, 68, 0.08)` | Background đỏ nhạt |
| Warning icon | `#ef4444` | AlertTriangle |
| Số lượng 0 | `#ef4444` | Text đỏ đậm |
| Badge hết hàng | `#ef4444` | Text + icon |
| Nút đăng ký chờ | `#f59e0b` | Cam nổi bật |
| Số người chờ | `#f59e0b` | Info text |

### Icons:
- ⚠️ `<AlertTriangle>` - Cảnh báo hết hàng
- ❌ `<X>` - Icon hết hàng
- 🔔 - Nút đăng ký chờ
- 👤 `<User>` - Số người chờ
- 📊 - Stats trong modal

---

## 📊 DATABASE STRUCTURE

### Collection: `waitlist.json`

```json
[
  {
    "id": "uuid",
    "equipmentId": "eq1",
    "equipmentName": "Máy hiện sóng...",
    "equipmentCode": "RIG-01",
    "mssv": "20210001",
    "userName": "Nguyễn Văn A",
    "qty": 1,
    "notes": "Cần gấp cho dự án",
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting | notified | cancelled | fulfilled",
    "notifiedDate": null | "ISO date",
    "fulfilledDate": null | "ISO date",
    "cancelledDate": null | "ISO date"
  }
]
```

### Status Flow:
```
waiting → notified → fulfilled
   ↓
cancelled
```

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Đăng ký chờ khi hết hàng
1. Mượn hết thiết bị (available = 0)
2. ✅ Row chuyển màu đỏ nhạt
3. ✅ Hiển thị icon ⚠️
4. ✅ Badge "❌ Hết hàng"
5. ✅ Nút "Mượn" → "🔔 Đăng ký chờ"
6. Click "Đăng ký chờ"
7. ✅ Modal xuất hiện
8. Điền MSSV, số lượng
9. Submit
10. ✅ Thông báo "Đăng ký thành công"
11. ✅ Hiển thị "👤 1 người đang chờ"

### Test Case 2: Auto-notify khi trả
1. Có người trong waitlist
2. Trả thiết bị (available > 0)
3. ✅ Console log notification
4. ✅ Status → `notified`
5. ✅ Response có `waitlistNotified`

### Test Case 3: Nhiều người chờ
1. User A đăng ký chờ (10:00)
2. User B đăng ký chờ (10:05)
3. User C đăng ký chờ (10:10)
4. ✅ Hiển thị "👤 3 người đang chờ"
5. Có người trả thiết bị
6. ✅ User A được notify (FIFO)
7. ✅ Status A → `notified`
8. User B, C vẫn `waiting`

### Test Case 4: Đăng ký trùng
1. User A đã đăng ký chờ
2. User A đăng ký chờ lần 2
3. ✅ Error: "Bạn đã đăng ký chờ rồi"

---

## 🚀 FUTURE ENHANCEMENTS

### 1. Email Notification (TODO)
```javascript
// Trong notifyWaitlist()
await sendEmail({
  to: user.email,
  subject: `[Lab CLB] Thiết bị ${eq.name} đã có sẵn!`,
  body: `
    Xin chào ${user.name},
    
    Thiết bị "${eq.name}" mà bạn đăng ký chờ đã có sẵn.
    Bạn có 24h để đến Lab mượn trước khi chuyển sang người tiếp theo.
    
    Thông tin:
    - Thiết bị: ${eq.name} (${eq.code})
    - Số lượng: ${waitlistEntry.qty}
    - Vị trí: ${eq.location}
    
    Trân trọng,
    Lab CLB Manager
  `
});
```

### 2. Push Notification
- Web Push API
- Mobile app notification

### 3. Dashboard Stats Widget
```
┌─────────────────────────────┐
│ 📊 THỐNG KÊ WAITLIST        │
├─────────────────────────────┤
│ 🔔 5 thiết bị đang hết      │
│ 👥 12 người đang chờ        │
│ ⚡ 3 thông báo hôm nay      │
└─────────────────────────────┘
```

### 4. Priority Queue
- VIP members get notified first
- Urgent requests jump queue

### 5. Expiration Time
- 24h để mượn sau khi được notify
- Auto move to next person nếu hết hạn

### 6. Waitlist Management Page
- Admin xem tất cả waitlist
- Reorder queue
- Manually notify/cancel

---

## 📁 FILES MODIFIED

### Backend:
- ✅ `backend/src/server.js` - Added waitlist APIs
- ✅ `backend/data/waitlist.json` - New collection

### Frontend:
- ✅ `frontend/src/pages/Equipment.jsx` - Full waitlist integration

---

## ✅ CHECKLIST

- [x] Visual: Row màu đỏ khi hết
- [x] Visual: Icon warning
- [x] Visual: Badge "Hết hàng"
- [x] Visual: Số lượng màu đỏ
- [x] Backend: Waitlist collection
- [x] Backend: POST `/api/equipment/:id/waitlist`
- [x] Backend: GET `/api/equipment/:id/waitlist`
- [x] Backend: DELETE `/api/waitlist/:id`
- [x] Backend: GET `/api/waitlist/user/:mssv`
- [x] Backend: `notifyWaitlist()` function
- [x] Backend: Integration with return equipment
- [x] Frontend: Nút "Đăng ký chờ"
- [x] Frontend: Hiển thị số người chờ
- [x] Frontend: Waitlist modal
- [x] Frontend: Form validation
- [x] Frontend: Member search dropdown
- [x] Frontend: Fetch waitlist counts
- [x] Frontend: Success/Error messages
- [x] Build successful
- [x] No syntax errors

---

## 🎓 DEMO DATA

Test với các thiết bị sau:

| Thiết bị | Tổng | Đang mượn | Available | Status |
|----------|------|-----------|-----------|---------|
| RIG-01 | 2 | 2 | 0 | ❌ Hết hàng |
| MOH-01 | 5 | 1 | 4 | ✅ Còn hàng |
| ARD-01 | 15 | 4 | 11 | ✅ Còn hàng |

---

**Status**: ✅ HOÀN THÀNH FULL PACKAGE  
**Phase 1**: ✅ Visual  
**Phase 2**: ✅ Waitlist System  
**Phase 3**: ✅ Auto Notification  
**Build**: ✅ Successful  
**Ready for**: Production Testing

*Cập nhật: 02/07/2026*
