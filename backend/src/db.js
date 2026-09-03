import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Khởi tạo kết nối SQLite database
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(DATA_DIR, 'lab.db'),
  logging: false, // Tắt logging SQL thô để console sạch hơn
});

// ==========================================
// ĐỊNH NGHĨA MODELS (KHUNG BẢNG SQLITE)
// ==========================================

// 1. Bảng User (Thành viên & Tài khoản)
export const User = sequelize.define('User', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  mssv: { type: DataTypes.TEXT, unique: true, allowNull: false },
  name: { type: DataTypes.TEXT, allowNull: false },
  username: { type: DataTypes.TEXT },
  email: { type: DataTypes.TEXT },
  passwordHash: { type: DataTypes.TEXT },
  role: { type: DataTypes.TEXT, defaultValue: 'Thành viên' },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  active: { type: DataTypes.BOOLEAN, defaultValue: false },
  accountStatus: { type: DataTypes.TEXT, defaultValue: 'active' }
}, { tableName: 'users', timestamps: false });

// 2. Bảng Equipment (Thiết bị & Linh kiện)
export const Equipment = sequelize.define('Equipment', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  name: { type: DataTypes.TEXT, allowNull: false },
  code: { type: DataTypes.TEXT, unique: true, allowNull: false },
  totalQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  maxQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  borrowedQty: { type: DataTypes.INTEGER, defaultValue: 0 },
  location: { type: DataTypes.TEXT, defaultValue: 'Kho Lab' },
  status: { type: DataTypes.TEXT, defaultValue: 'Sẵn sàng' },
  category: { type: DataTypes.TEXT, defaultValue: 'Khác' },
  assetType: { type: DataTypes.TEXT, defaultValue: 'Thiết bị' },
  unit: { type: DataTypes.TEXT, defaultValue: 'Cái' },
  minThreshold: { type: DataTypes.INTEGER, defaultValue: 0 },
  usedHours: { type: DataTypes.INTEGER, defaultValue: 0 },
  lifespanHours: { type: DataTypes.INTEGER, defaultValue: 0 },
  instances: { type: DataTypes.TEXT, defaultValue: '[]' }
}, { tableName: 'equipment', timestamps: false });

// 3. Bảng Borrow (Phiếu mượn trả)
export const Borrow = sequelize.define('Borrow', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  equipmentId: { type: DataTypes.TEXT, allowNull: false },
  mssv: { type: DataTypes.TEXT, allowNull: false },
  borrowerName: { type: DataTypes.TEXT, allowNull: false },
  qty: { type: DataTypes.INTEGER, defaultValue: 1 },
  borrowDate: { type: DataTypes.TEXT, allowNull: false },
  returnDate: { type: DataTypes.TEXT },
  status: { type: DataTypes.TEXT, defaultValue: 'Đang mượn' },
  expectedReturnDate: { type: DataTypes.TEXT },
  initialCondition: { type: DataTypes.TEXT },
  borrowNotes: { type: DataTypes.TEXT },
  returnNotes: { type: DataTypes.TEXT },
  finalCondition: { type: DataTypes.TEXT },
  instanceIds: { type: DataTypes.TEXT, defaultValue: '[]' }
}, { tableName: 'borrows', timestamps: false });

// 4. Bảng Schedule (Lịch trực)
export const Schedule = sequelize.define('Schedule', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  day: { type: DataTypes.TEXT, allowNull: false },
  shift: { type: DataTypes.TEXT, allowNull: false },
  members: { type: DataTypes.TEXT, defaultValue: '[]' } // Lưu trữ JSON string của danh sách thành viên trực
}, { tableName: 'schedules', timestamps: false });

// 5. Bảng Task (Nhiệm vụ & Công việc)
export const Task = sequelize.define('Task', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  title: { type: DataTypes.TEXT, allowNull: false },
  project: { type: DataTypes.TEXT },
  status: { type: DataTypes.TEXT, defaultValue: 'todo' },
  assignedTo: { type: DataTypes.TEXT },
  assignedName: { type: DataTypes.TEXT },
  points: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'tasks', timestamps: false });

// 6. Bảng Attendance (Lịch sử check-in Lab)
export const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  mssv: { type: DataTypes.TEXT, allowNull: false },
  name: { type: DataTypes.TEXT, allowNull: false },
  checkInTime: { type: DataTypes.TEXT, allowNull: false },
  checkOutTime: { type: DataTypes.TEXT },
  duration: { type: DataTypes.REAL, defaultValue: 0 },
  checkInMethod: { type: DataTypes.TEXT, defaultValue: 'Manual' },
  checkOutMethod: { type: DataTypes.TEXT, defaultValue: 'Manual' }
}, { tableName: 'attendance', timestamps: false });

// 7. Bảng Booking (Lịch đặt phòng Lab)
export const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  date: { type: DataTypes.TEXT, allowNull: false },
  slotId: { type: DataTypes.TEXT, allowNull: false },
  representativeName: { type: DataTypes.TEXT, allowNull: false },
  representativeMssv: { type: DataTypes.TEXT, allowNull: false },
  roomName: { type: DataTypes.TEXT },
  purpose: { type: DataTypes.TEXT },
  status: { type: DataTypes.TEXT, defaultValue: 'pending' },
  members: { type: DataTypes.TEXT, defaultValue: '[]' }, // JSON string
  checkedIn: { type: DataTypes.BOOLEAN, defaultValue: false },
  checkedInAt: { type: DataTypes.TEXT },
  checkedInBy: { type: DataTypes.TEXT },
  checkedInByName: { type: DataTypes.TEXT },
  checkedOut: { type: DataTypes.BOOLEAN, defaultValue: false },
  checkedOutAt: { type: DataTypes.TEXT },
  checkoutReport: { type: DataTypes.TEXT, defaultValue: null }
}, { tableName: 'bookings', timestamps: false });

// 8. Bảng RfidCard (Thẻ RFID thành viên)
export const RfidCard = sequelize.define('RfidCard', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  cardId: { type: DataTypes.TEXT, unique: true, allowNull: false },
  mssv: { type: DataTypes.TEXT, allowNull: false },
  userName: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.TEXT, defaultValue: 'active' },
  registeredDate: { type: DataTypes.TEXT },
  lastUsed: { type: DataTypes.TEXT },
  usageCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'rfid_cards', timestamps: false });

// 9. Bảng RfidHistory (Lịch sử quét thẻ RFID)
export const RfidHistory = sequelize.define('RfidHistory', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  cardId: { type: DataTypes.TEXT, allowNull: false },
  mssv: { type: DataTypes.TEXT },
  userName: { type: DataTypes.TEXT },
  action: { type: DataTypes.TEXT },
  module: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.TEXT, allowNull: false },
  success: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'rfid_history', timestamps: false });

// 10. Bảng Notification (Thông báo)
export const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  type: { type: DataTypes.TEXT, defaultValue: 'info' },
  title: { type: DataTypes.TEXT, allowNull: false },
  content: { type: DataTypes.TEXT },
  details: { type: DataTypes.TEXT, defaultValue: '{}' }, // JSON string
  timestamp: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'notifications', timestamps: false });

// 11. Bảng Session (Phiên trực Lab thực tế)
export const Session = sequelize.define('Session', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  date: { type: DataTypes.TEXT, allowNull: false },
  slotId: { type: DataTypes.TEXT, allowNull: false },
  bookingId: { type: DataTypes.TEXT },
  attendees: { type: DataTypes.TEXT, defaultValue: '[]' } // JSON string
}, { tableName: 'sessions', timestamps: false });

// 12. Bảng Catalog (Danh mục thiết bị gốc)
export const Catalog = sequelize.define('Catalog', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  name: { type: DataTypes.TEXT, allowNull: false },
  codePrefix: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.TEXT },
  assetType: { type: DataTypes.TEXT, defaultValue: 'Thiết bị' },
  unit: { type: DataTypes.TEXT, defaultValue: 'Cái' },
  lifespanHours: { type: DataTypes.INTEGER, defaultValue: 0 },
  description: { type: DataTypes.TEXT }
}, { tableName: 'equipment_catalog', timestamps: false });

// 13. Bảng Maintenance (Sửa chữa bảo trì)
export const Maintenance = sequelize.define('Maintenance', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  equipmentId: { type: DataTypes.TEXT, allowNull: false },
  equipmentName: { type: DataTypes.TEXT, allowNull: false },
  issueDescription: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.TEXT, defaultValue: 'Đang sửa' },
  cost: { type: DataTypes.REAL, defaultValue: 0 },
  reportedDate: { type: DataTypes.TEXT, allowNull: false },
  resolvedDate: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT, defaultValue: '[]' } // JSON string
}, { tableName: 'maintenance', timestamps: false });

// 14. Bảng SystemSetting (Cài đặt hệ thống động)
export const SystemSetting = sequelize.define('SystemSetting', {
  key: { type: DataTypes.TEXT, primaryKey: true },
  value: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'system_settings', timestamps: false });

// 15. Bảng Category (Danh mục thiết bị hệ thống)
export const Category = sequelize.define('Category', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  name: { type: DataTypes.TEXT, unique: true, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' }
}, { tableName: 'categories', timestamps: false });

// 16. Bảng AuditLog (Nhật ký kiểm toán hệ thống)
export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  actorUserId: { type: DataTypes.TEXT },
  actorMssv: { type: DataTypes.TEXT },
  actorName: { type: DataTypes.TEXT },
  actorRole: { type: DataTypes.TEXT, defaultValue: 'system' },
  action: { type: DataTypes.TEXT, allowNull: false },
  targetType: { type: DataTypes.TEXT, allowNull: false },
  targetId: { type: DataTypes.TEXT },
  oldValue: { type: DataTypes.TEXT, defaultValue: null },
  newValue: { type: DataTypes.TEXT, defaultValue: null },
  metadata: { type: DataTypes.TEXT, defaultValue: null },
  success: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdAt: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'audit_logs', timestamps: false });

// 17. Bảng Waitlist (Hàng chờ thiết bị)
export const Waitlist = sequelize.define('Waitlist', {
  id: { type: DataTypes.TEXT, primaryKey: true },
  equipmentId: { type: DataTypes.TEXT, allowNull: false },
  equipmentName: { type: DataTypes.TEXT },
  equipmentCode: { type: DataTypes.TEXT },
  mssv: { type: DataTypes.TEXT, allowNull: false },
  userName: { type: DataTypes.TEXT },
  qty: { type: DataTypes.INTEGER, defaultValue: 1 },
  notes: { type: DataTypes.TEXT, defaultValue: '' },
  purpose: { type: DataTypes.TEXT },
  neededDate: { type: DataTypes.TEXT },
  registeredDate: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.TEXT, defaultValue: 'waiting' },
  notifiedDate: { type: DataTypes.TEXT },
  fulfilledDate: { type: DataTypes.TEXT }
}, { tableName: 'waitlist', timestamps: false });

// ==========================================
// ĐỒNG BỘ & SEED DỮ LIỆU TỪ JSON CŨ SANG SQLITE
// ==========================================
export async function syncDatabase() {
  await sequelize.sync();
  console.log('Database SQLite & tables synced successfully.');

  const seedIfEmpty = async (Model, fileName, defaultData = []) => {
    try {
      const count = await Model.count();
      if (count === 0) {
        console.log(`Bảng ${Model.tableName} rỗng. Đang seed dữ liệu...`);
        const jsonPath = path.join(DATA_DIR, `${fileName}.json`);
        let data = defaultData;
        if (fs.existsSync(jsonPath)) {
          try {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            data = JSON.parse(content || '[]');
          } catch (e) {
            console.error(`Không thể đọc file JSON cũ ${fileName}.json:`, e);
          }
        }

        const mappedData = data.map(item => {
          const mapped = { ...item };
          Object.keys(Model.rawAttributes).forEach(key => {
            const attr = Model.rawAttributes[key];
            if (attr.type instanceof DataTypes.TEXT && (typeof mapped[key] === 'object' && mapped[key] !== null)) {
              mapped[key] = JSON.stringify(mapped[key]);
            }
          });
          return mapped;
        });

        if (mappedData.length > 0) {
          await Model.bulkCreate(mappedData);
          console.log(`Đã seed thành công ${mappedData.length} dòng cho bảng ${Model.tableName}.`);
        }
      }
    } catch (err) {
      console.error(`Lỗi khi seed bảng ${Model.tableName}:`, err);
    }
  };

  // Tiến hành seed lần lượt 13 bảng
  await seedIfEmpty(User, 'users', [
    { id: '1', mssv: '20210001', name: 'Nguyễn Văn A', role: 'Chủ nhiệm', points: 150, active: false },
    { id: '2', mssv: '20210002', name: 'Trần Thị B', role: 'Trưởng ban Kỹ thuật', points: 120, active: false },
    { id: '3', mssv: '20220003', name: 'Lê Văn C', role: 'Thành viên', points: 80, active: false },
    { id: '4', mssv: '20220004', name: 'Phạm Minh D', role: 'Thành viên', points: 45, active: false }
  ]);

  await seedIfEmpty(Equipment, 'equipment', [
    { id: 'eq1', name: 'Máy hiện sóng Rigol DS1054Z', code: 'RIG-01', totalQty: 2, maxQty: 2, borrowedQty: 0, location: 'Tủ A1', status: 'Sẵn sàng', category: 'Thiết bị đo lường', assetType: 'Thiết bị', lifespanHours: 20000, usedHours: 18500 },
    { id: 'eq2', name: 'Mỏ hàn thiếc Quick 936A', code: 'MOH-01', totalQty: 5, maxQty: 5, borrowedQty: 1, location: 'Bàn kỹ thuật 1', status: 'Sẵn sàng', category: 'Dụng cụ', assetType: 'Dụng cụ', lifespanHours: 5000, usedHours: 250 },
    { id: 'eq3', name: 'Kit phát triển Arduino Uno R3', code: 'ARD-01', totalQty: 15, maxQty: 15, borrowedQty: 4, location: 'Tủ B2', status: 'Sẵn sàng', category: 'Kit phát triển', assetType: 'Thiết bị', lifespanHours: 10000, usedHours: 9500 },
    { id: 'eq4', name: 'Raspberry Pi 4 Model B (4GB)', code: 'RAS-01', totalQty: 3, maxQty: 3, borrowedQty: 2, location: 'Tủ B2', status: 'Sẵn sàng', category: 'Kit phát triển', assetType: 'Thiết bị', lifespanHours: 15000, usedHours: 15500 }
  ]);

  await seedIfEmpty(Borrow, 'borrows', [
    { id: 'b1', equipmentId: 'eq3', mssv: '20220003', borrowerName: 'Lê Văn C', qty: 2, borrowDate: '2026-06-25T10:00:00.000Z', returnDate: null, status: 'Đang mượn' },
    { id: 'b2', equipmentId: 'eq4', mssv: '20210002', borrowerName: 'Trần Thị B', qty: 1, borrowDate: '2026-06-24T14:30:00.000Z', returnDate: '2026-06-27T16:00:00.000Z', status: 'Đã trả' }
  ]);

  await seedIfEmpty(Schedule, 'schedules', [
    { id: 's1', day: 'Thứ 2', shift: 'Sáng (08:00 - 11:30)', members: [{ mssv: '20210001', name: 'Nguyễn Văn A' }] },
    { id: 's2', day: 'Thứ 2', shift: 'Chiều (13:30 - 17:00)', members: [{ mssv: '20210002', name: 'Trần Thị B' }, { mssv: '20220003', name: 'Lê Văn C' }] },
    { id: 's3', day: 'Thứ 3', shift: 'Tối (18:00 - 21:00)', members: [{ mssv: '20220004', name: 'Phạm Minh D' }] },
    { id: 's4', day: 'Thứ 4', shift: 'Sáng (08:00 - 11:30)', members: [] },
    { id: 's5', day: 'Thứ 4', shift: 'Chiều (13:30 - 17:00)', members: [{ mssv: '20210001', name: 'Nguyễn Văn A' }] },
    { id: 's6', day: 'Thứ 5', shift: 'Tối (18:00 - 21:00)', members: [] }
  ]);

  await seedIfEmpty(Task, 'tasks', [
    { id: 't1', title: 'Thiết kế PCB mạch đo nhiệt độ độ ẩm', project: 'Trạm khí tượng IoT', status: 'todo', assignedTo: '20220003', assignedName: 'Lê Văn C', points: 25 },
    { id: 't2', title: 'Viết Firmware ESP32 kết nối MQTT', project: 'Trạm khí tượng IoT', status: 'in_progress', assignedTo: '20210002', assignedName: 'Trần Thị B', points: 30 },
    { id: 't3', title: 'Lập trình ứng dụng Mobile hiển thị dữ liệu', project: 'Trạm khí tượng IoT', status: 'todo', assignedTo: '20220004', assignedName: 'Phạm Minh D', points: 40 },
    { id: 't4', title: 'Lắp ráp mô hình vỏ hộp 3D', project: 'Trạm khí tượng IoT', status: 'done', assignedTo: '20210001', assignedName: 'Nguyễn Văn A', points: 15 }
  ]);

  await seedIfEmpty(Attendance, 'attendance', [
    { id: 'a1', mssv: '20210002', name: 'Trần Thị B', checkInTime: '2026-06-27T08:15:00.000Z', checkOutTime: '2026-06-27T11:45:00.000Z', duration: 3.5 },
    { id: 'a2', mssv: '20220003', name: 'Lê Văn C', checkInTime: '2026-06-27T13:40:00.000Z', checkOutTime: '2026-06-27T17:10:00.000Z', duration: 3.5 }
  ]);

  await seedIfEmpty(Booking, 'bookings', [
    { id: 'b_bk1', date: '2026-06-27', slotId: 'afternoon_1', representativeName: 'Nguyễn Văn A', representativeMssv: '20210001', roomName: 'Phòng thực hành IoT', purpose: 'Nghiên cứu khoa học', status: 'approved', members: [], checkedIn: false }
  ]);

  await seedIfEmpty(RfidCard, 'rfid_cards', [
    { id: 'rc1', cardId: 'CARD-001', mssv: '20210001', userName: 'Nguyễn Văn A', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: null, usageCount: 0 },
    { id: 'rc2', cardId: 'CARD-002', mssv: '20210002', userName: 'Trần Thị B', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: null, usageCount: 0 },
    { id: 'rc3', cardId: 'CARD-003', mssv: '20220003', userName: 'Lê Văn C', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: null, usageCount: 0 },
    { id: 'rc4', cardId: 'CARD-004', mssv: '20220004', userName: 'Phạm Minh D', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: null, usageCount: 0 }
  ]);

  await seedIfEmpty(RfidHistory, 'rfid_history', []);
  await seedIfEmpty(Notification, 'notifications', []);
  await seedIfEmpty(Session, 'sessions', []);
  await seedIfEmpty(Catalog, 'equipment_catalog', []);
  await seedIfEmpty(Maintenance, 'maintenance', []);
  await seedIfEmpty(Category, 'categories', [
    { id: 'cat-1', name: 'Thiết bị đo lường', description: 'Máy hiện sóng, đồng hồ vạn năng, máy phát xung' },
    { id: 'cat-2', name: 'Kit phát triển', description: 'Arduino, ESP32, STM32, Raspberry Pi' },
    { id: 'cat-3', name: 'Module chức năng', description: 'Module relay, giao tiếp không dây, GPS, RFID' },
    { id: 'cat-4', name: 'Cảm biến', description: 'Cảm biến nhiệt độ, khoảng cách, khí gas, gia tốc' },
    { id: 'cat-5', name: 'Thiết bị hiển thị', description: 'Màn hình LCD, OLED, LED ma trận' },
    { id: 'cat-6', name: 'Cơ cấu chấp hành & Động cơ', description: 'Động cơ bước, servo, motor DC' },
    { id: 'cat-7', name: 'Dụng cụ cơ khí & Gia công', description: 'Mỏ hàn, kìm, tua vít, máy khoan bàn' },
    { id: 'cat-8', name: 'Máy tính & Máy chủ', description: 'PC lab, màn hình, máy in 3D' },
    { id: 'cat-9', name: 'Thiết bị mạng', description: 'Router, switch, access point, cáp mạng' },
    { id: 'cat-10', name: 'Hạ tầng nguồn & Lưu trữ', description: 'Nguồn DC đa năng, pin sạc, biến áp' },
    { id: 'cat-11', name: 'Vật tư tiêu hao', description: 'Thiếc hàn, điện trở, tụ điện, dây cắm testboard' },
    { id: 'cat-12', name: 'Thiết bị đa phương tiện & Giảng dạy', description: 'Máy chiếu, loa, micro, bảng viết' },
    { id: 'cat-13', name: 'Khác', description: 'Các thiết bị và phụ kiện khác' }
  ]);
  await seedIfEmpty(SystemSetting, 'settings', [
    { key: 'defaultBorrowDays', value: '7' },
    { key: 'defaultReturnTime', value: '17:00' },
    { key: 'defaultLowStockThreshold', value: '0' },
    { key: 'defaultLifespanHours', value: '10000' },
    { key: 'maintenanceWarningPercent', value: '20' },
    { key: 'attendanceMinHours', value: '1.0' },
    { key: 'attendanceStandardPoints', value: '5' },
    { key: 'attendanceShortPoints', value: '2' },
    { key: 'taskDefaultPoints', value: '10' },
    { key: 'adminPassword', value: 'admin123' },
    { key: 'maxNotificationHistory', value: '500' },
    { key: 'rfidScanCooldownSeconds', value: '5' },
    { key: 'defaultLabLocation', value: 'Kho Lab' },
    { key: 'kioskIdleTimeoutSeconds', value: '30' },
    { key: 'slot_morning_1_start', value: '07:00' },
    { key: 'slot_morning_1_end', value: '09:00' },
    { key: 'slot_morning_2_start', value: '09:00' },
    { key: 'slot_morning_2_end', value: '11:00' },
    { key: 'slot_afternoon_1_start', value: '12:00' },
    { key: 'slot_afternoon_1_end', value: '14:00' },
    { key: 'slot_afternoon_2_start', value: '14:00' },
    { key: 'slot_afternoon_2_end', value: '16:00' },
    { key: 'slot_evening_1_start', value: '16:00' },
    { key: 'slot_evening_1_end', value: '18:00' },
    { key: 'slot_evening_2_start', value: '18:00' },
    { key: 'slot_evening_2_end', value: '20:00' }
  ]);

  await reloadCacheFromDb();
}

// Hàm nạp lại toàn bộ cache từ SQLite
export async function reloadCacheFromDb() {
  const collections = Object.keys(collectionToModelMap);
  for (const colName of collections) {
    const Model = collectionToModelMap[colName];
    const rows = await Model.findAll();
    cache[colName] = rows.map(row => {
      const data = row.get({ plain: true });
      Object.keys(Model.rawAttributes).forEach(key => {
        const attr = Model.rawAttributes[key];
        if (attr.type instanceof DataTypes.TEXT && typeof data[key] === 'string') {
          if (data[key].startsWith('[') || data[key].startsWith('{')) {
            try {
              data[key] = JSON.parse(data[key]);
            } catch (e) {}
          }
        }
      });
      return data;
    });
  }
  console.log('Cache populated from SQLite database.');
}

// Map các collection name sang Model tương ứng
const collectionToModelMap = {
  users: User,
  equipment: Equipment,
  borrows: Borrow,
  schedules: Schedule,
  tasks: Task,
  attendance: Attendance,
  bookings: Booking,
  rfid_cards: RfidCard,
  rfid_history: RfidHistory,
  notifications: Notification,
  sessions: Session,
  equipment_catalog: Catalog,
  maintenance: Maintenance,
  settings: SystemSetting,
  categories: Category,
  audit_logs: AuditLog,
  waitlist: Waitlist
};

function getModelByCollectionName(colName) {
  const model = collectionToModelMap[colName];
  if (!model) {
    throw new Error(`Unknown collection name: ${colName}`);
  }
  return model;
}

const cache = {};

// Giao diện đọc collection đồng bộ giống hệt file db.js cũ (drop-in replacement)
export function readCollection(collectionName, defaultData = []) {
  if (cache[collectionName] && Array.isArray(cache[collectionName]) && cache[collectionName].length > 0) {
    return cache[collectionName];
  }

  // Tự động đọc fallback từ file JSON trong data/
  const jsonPath = path.join(DATA_DIR, `${collectionName}.json`);
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content || '[]');
      cache[collectionName] = data;
      return data;
    } catch (e) {
      console.error(`Lỗi đọc file JSON ${collectionName}.json:`, e.message);
    }
  }

  return cache[collectionName] || defaultData;
}

// Giao diện ghi collection đồng bộ, tự động ghi xuống SQLite bất đồng bộ dưới background
export function writeCollection(collectionName, data) {
  cache[collectionName] = data;

  // Ghi đồng thời vào file JSON để backup
  const jsonPath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Lỗi ghi backup JSON ${collectionName}.json:`, e.message);
  }

  const Model = getModelByCollectionName(collectionName);
  if (!Model) return true;

  const mappedData = data.map(item => {
    const mapped = { ...item };
    Object.keys(Model.rawAttributes).forEach(key => {
      const attr = Model.rawAttributes[key];
      if (attr.type instanceof DataTypes.TEXT && (typeof mapped[key] === 'object' && mapped[key] !== null)) {
        mapped[key] = JSON.stringify(mapped[key]);
      }
    });
    return mapped;
  });

  // Ghi xuống SQLite bất đồng bộ an toàn
  Model.destroy({ where: {} })
    .then(() => {
      if (mappedData.length > 0) {
        return Model.bulkCreate(mappedData, { ignoreDuplicates: true });
      }
    })
    .catch(err => {
      console.error(`Lỗi ghi collection ${collectionName} xuống SQLite dưới background:`, err.message);
    });

  return true;
}
