export const CATEGORIES = [
  'Thiết bị đo lường',
  'Kit phát triển',
  'Module chức năng',
  'Cảm biến',
  'Thiết bị hiển thị',
  'Cơ cấu chấp hành & Động cơ',
  'Dụng cụ cơ khí & Gia công',
  'Máy tính & Máy chủ',
  'Thiết bị mạng',
  'Hạ tầng nguồn & Lưu trữ',
  'Vật tư tiêu hao',
  'Thiết bị đa phương tiện & Giảng dạy',
  'Khác'
];

export const ASSET_TYPES = [
  { value: 'Thiết bị', label: 'Thiết bị (Mượn/Trả có phiếu)' },
  { value: 'Dụng cụ', label: 'Dụng cụ (Mượn/Trả có phiếu)' },
  { value: 'Linh kiện tiêu hao', label: 'Linh kiện tiêu hao (Xuất kho, không hoàn trả)' }
];

export const BORROW_STATUS_TABS = [
  { value: 'Tất cả', label: 'Tất cả' },
  { value: 'Đang mượn', label: 'Đang mượn' },
  { value: 'Đã đặt trước', label: 'Đã đặt trước' },
  { value: 'Trễ hạn', label: 'Trễ hạn' },
  { value: 'Đã trả', label: 'Đã trả' },
  { value: 'Đã tiêu hao', label: 'Xuất tiêu hao' },
  { value: 'waitlist', label: '🔔 Hàng chờ (Waitlist)' }
];
