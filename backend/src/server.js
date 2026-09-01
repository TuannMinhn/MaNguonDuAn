import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readCollection, writeCollection, syncDatabase, AuditLog } from './db.js';
import { Op } from 'sequelize';
import { createBackup, listBackups, restoreBackup, scheduleAutoBackup } from './backupService.js';
import { logAuditEvent, sanitizeData } from './auditLogger.js';
import { registerClient, cleanupClient, broadcastNotification, getActiveConnectionCount, getActiveClientsSummary } from './sseManager.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lab_clb_jwt_super_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

app.use(cors());
app.use(express.json());

// Helper chuẩn hóa role name
export function normalizeRole(role) {
  if (!role) return 'student';
  const r = String(role).toLowerCase().trim();
  if (['super_admin', 'admin-root', 'superadmin'].includes(r)) return 'super_admin';
  if (['admin', 'manager', 'quản lý', 'chủ nhiệm', 'trưởng ban kỹ thuật', 'lab_manager'].includes(r)) return 'manager';
  return 'student';
}

// Middleware: Xác thực JSON Web Token (JWT)
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Yêu cầu mã xác thực (Token missing)' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    req.user = {
      ...decoded,
      normalizedRole: normalizeRole(decoded.role)
    };
    next();
  });
}

// Middleware: Phân quyền vai trò (Role-Based Access Control)
export function authorizeRoles(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Yêu cầu mã xác thực' });
    }
    
    // Super admin luôn có toàn quyền
    if (req.user.normalizedRole === 'super_admin' || normalizedAllowed.includes(req.user.normalizedRole)) {
      return next();
    }

    return res.status(403).json({ success: false, error: 'Bạn không có quyền thực hiện thao tác này' });
  };
}

// Khởi tạo kết nối SQLite database và seed dữ liệu từ JSON cũ
syncDatabase()
  .then(() => {
    console.log('SQLite sync initialization complete.');
    scheduleAutoBackup(getSystemSetting);
    // Bật tiến trình quét tự động hủy phiếu đặt trước quá hạn (chạy 5 phút/lần)
    setInterval(checkAndExpireReservations, 5 * 60 * 1000);
    // Chạy kiểm tra ngay một lần khi khởi động
    setTimeout(checkAndExpireReservations, 3000);
  })
  .catch(err => console.error('SQLite database initialization failed:', err));

// Hàm quét tự động hủy các phiếu đặt trước quá hạn nhận
function checkAndExpireReservations() {
  try {
    const expireHoursSetting = getSystemSetting('reserveAutoExpireHours');
    const expireHours = expireHoursSetting !== undefined ? Number(expireHoursSetting) : 2;
    if (expireHours <= 0) return; // Đã tắt tự động hủy

    const borrows = readCollection('borrows');
    const equipment = readCollection('equipment');
    const now = new Date();
    let hasChanges = false;
    let equipChanged = false;

    for (const b of borrows) {
      if (b.status === 'Đã đặt trước' && b.borrowDate) {
        const scheduledTime = new Date(b.borrowDate);
        const elapsedHours = (now - scheduledTime) / (1000 * 60 * 60);

        if (elapsedHours >= expireHours) {
          // Phiếu đã quá hạn nhận -> Tự động hủy
          b.status = 'Đã hủy';
          b.cancelReason = `Hệ thống tự động hủy do quá hạn nhận ${expireHours} giờ mà không tới lấy thiết bị.`;
          b.cancelledAt = now.toISOString();
          b.cancelledBy = 'Hệ thống tự động';
          hasChanges = true;

          // Hoàn trả tồn kho
          const eq = equipment.find(e => e.id === b.equipmentId);
          if (eq) {
            const isConsumable = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
            if (isConsumable) {
              eq.totalQty = (eq.totalQty || 0) + Number(b.qty);
            } else {
              eq.borrowedQty = Math.max(0, (eq.borrowedQty || 0) - Number(b.qty));
              if (b.instanceIds && b.instanceIds.length > 0 && eq.instances) {
                for (let instId of b.instanceIds) {
                  let inst = eq.instances.find(i => i.id === instId);
                  if (inst && inst.status === 'Đang mượn') {
                    inst.status = 'Sẵn sàng';
                  }
                }
              }
            }
            equipChanged = true;
            notifyWaitlist(eq.id);
          }

          createNotification(
            'warning',
            'Tự động hủy phiếu quá hạn nhận',
            `Phiếu đặt trước ${b.qty}x "${b.equipmentName}" của ${b.borrowerName} (${b.mssv}) đã tự động bị hủy do quá hạn nhận ${expireHours} giờ. Đã hoàn trả lại kho.`,
            {
              borrowId: b.id,
              equipmentId: b.equipmentId,
              equipmentName: b.equipmentName,
              qty: b.qty
            }
          );

          console.log(`[AUTO-EXPIRE] Đã tự động hủy phiếu mượn ${b.id} của ${b.borrowerName} do quá ${expireHours}h`);
        }
      }
    }

    if (equipChanged) {
      writeCollection('equipment', equipment);
    }
    if (hasChanges) {
      writeCollection('borrows', borrows);
    }
  } catch (err) {
    console.error('Lỗi khi chạy checkAndExpireReservations:', err.message);
  }
}

// Helper function: Lấy setting hệ thống (có fallback an toàn)
const DEFAULT_SETTINGS = {
  defaultBorrowDays: 7,
  defaultReturnTime: '17:00',
  defaultLowStockThreshold: 0,
  defaultLifespanHours: 10000,
  maintenanceWarningPercent: 20,
  attendanceMinHours: 1.0,
  attendanceStandardPoints: 5,
  attendanceShortPoints: 2,
  taskDefaultPoints: 10,
  adminPassword: 'admin123',
  maxNotificationHistory: 500,
  rfidScanCooldownSeconds: 5,
  defaultLabLocation: 'Kho Lab',
  kioskIdleTimeoutSeconds: 30,
  autoBackupEnabled: false,
  backupIntervalHours: 24,
  backupRetentionCount: 7,
  slot_morning_1_start: '07:00',
  slot_morning_1_end: '09:00',
  slot_morning_2_start: '09:00',
  slot_morning_2_end: '11:00',
  slot_afternoon_1_start: '12:00',
  slot_afternoon_1_end: '14:00',
  slot_afternoon_2_start: '14:00',
  slot_afternoon_2_end: '16:00',
  slot_evening_1_start: '16:00',
  slot_evening_1_end: '18:00',
  slot_evening_2_start: '18:00',
  slot_evening_2_end: '20:00',
  roomBookingCancelDeadlineHours: 2,
  roomBookingAdvanceDays: 14,
  maxBookingSlotsPerWeek: 4,
  reserveAutoExpireHours: 2,
  reserveAdvanceNoticeMinutes: 29
};

function getSystemSetting(key) {
  try {
    const settings = readCollection('settings', []);
    const entry = settings.find(s => s.key === key);
    if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
      if (typeof DEFAULT_SETTINGS[key] === 'number') {
        const num = Number(entry.value);
        return isNaN(num) ? DEFAULT_SETTINGS[key] : num;
      }
      return String(entry.value).trim();
    }
  } catch (e) {}
  return DEFAULT_SETTINGS[key];
}

// Helper function: Tạo thông báo cho hệ thống & push SSE realtime
function createNotification(type, title, content, details = {}) {
  const notifications = readCollection('notifications');
  const newNotif = {
    id: uuidv4(),
    type,
    title,
    content,
    details,
    timestamp: new Date().toISOString(),
    read: false
  };
  notifications.unshift(newNotif); // Thêm lên đầu danh sách
  
  const maxLimit = getSystemSetting('maxNotificationHistory') || 500;
  if (notifications.length > maxLimit) {
    notifications.splice(maxLimit);
  }
  writeCollection('notifications', notifications);

  // Broadcast realtime qua SSE tới các client phù hợp quyền (Failure safety: không làm fail request chính)
  try {
    broadcastNotification(newNotif);
  } catch (err) {
    console.error('Lỗi khi broadcast SSE notification:', err.message);
  }
}

// ==========================================
// RFID CARD MAPPING (Đọc từ rfid_cards.json)
// ==========================================

// Hàm lấy mapping cardId -> mssv từ collection (chỉ thẻ active)
const getRfidMapping = () => {
  const rfidCards = readCollection('rfid_cards');
  const mapping = {};
  rfidCards.filter(c => c.status === 'active').forEach(card => {
    mapping[card.cardId] = card.mssv;
  });
  return mapping;
};

// Hàm ghi log mỗi lần quét thẻ RFID
const logRfidAction = (cardId, mssv, userName, action, module, success) => {
  const history = readCollection('rfid_history');
  history.push({
    id: uuidv4(),
    cardId,
    mssv,
    userName,
    action,
    module,
    timestamp: new Date().toISOString(),
    success
  });
  writeCollection('rfid_history', history);

  // Cập nhật lastUsed và usageCount trong rfid_cards
  if (success) {
    const cards = readCollection('rfid_cards');
    const cardIndex = cards.findIndex(c => c.cardId === cardId);
    if (cardIndex !== -1) {
      cards[cardIndex].lastUsed = new Date().toISOString();
      cards[cardIndex].usageCount = (cards[cardIndex].usageCount || 0) + 1;
      writeCollection('rfid_cards', cards);
    }
  }
};

// ==========================================
// API RFID SCAN (Quét thẻ)
// ==========================================

app.post('/api/rfid-scan', (req, res) => {
  const { cardId } = req.body;

  if (!cardId) {
    return res.status(400).json({ error: 'Thiếu mã thẻ RFID' });
  }

  const rfidMapping = getRfidMapping();
  const mssv = rfidMapping[cardId];
  if (!mssv) {
    return res.status(404).json({ error: 'Thẻ RFID không được đăng ký trong hệ thống' });
  }

  const users = readCollection('users');
  const user = users.find(u => u.mssv === mssv);

  if (!user) {
    return res.status(404).json({ error: 'Sinh viên không tồn tại' });
  }

  res.json({
    success: true,
    mssv: user.mssv,
    name: user.name,
    cardId: cardId
  });
});

// ==========================================
// API RFID CARD MANAGEMENT (Quản lý thẻ)
// ==========================================

// Lấy danh sách thẻ RFID
app.get('/api/rfid-cards', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const rfidCards = readCollection('rfid_cards');
  res.json(rfidCards);
});

// Đăng ký thẻ RFID mới
app.post('/api/rfid-cards', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { cardId, mssv } = req.body;

  if (!cardId || !mssv) {
    return res.status(400).json({ error: 'Vui lòng cung cấp mã thẻ (cardId) và MSSV' });
  }

  const users = readCollection('users');
  const user = users.find(u => u.mssv === mssv);
  if (!user) {
    return res.status(404).json({ error: `Thành viên với MSSV ${mssv} không tồn tại` });
  }

  const rfidCards = readCollection('rfid_cards');

  // Kiểm tra trùng cardId
  if (rfidCards.some(c => c.cardId === cardId)) {
    return res.status(400).json({ error: `Mã thẻ ${cardId} đã được đăng ký` });
  }

  // Kiểm tra MSSV đã có thẻ active chưa
  const existingCard = rfidCards.find(c => c.mssv === mssv && c.status === 'active');
  if (existingCard) {
    return res.status(400).json({ error: `Thành viên ${user.name} (${mssv}) đã có thẻ RFID active: ${existingCard.cardId}` });
  }

  const newCard = {
    id: uuidv4(),
    cardId,
    mssv,
    userName: user.name,
    status: 'active',
    registeredDate: new Date().toISOString(),
    lastUsed: null,
    usageCount: 0
  };

  rfidCards.push(newCard);
  writeCollection('rfid_cards', rfidCards);

  logRfidAction(cardId, mssv, user.name, 'register', 'management', true);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'rfid_card',
    targetId: newCard.id,
    newValue: {
      cardId: newCard.cardId,
      mssv: newCard.mssv,
      userName: newCard.userName,
      status: newCard.status
    },
    success: true
  });

  res.status(201).json({ message: `Đăng ký thẻ ${cardId} cho ${user.name} thành công`, card: newCard });
});

// Sửa thông tin thẻ RFID
app.put('/api/rfid-cards/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { mssv, status } = req.body;

  const rfidCards = readCollection('rfid_cards');
  const index = rfidCards.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thẻ RFID' });
  }

  const card = rfidCards[index];
  const oldCard = { ...card };

  // Nếu đổi MSSV, validate user mới
  if (mssv && mssv !== card.mssv) {
    const users = readCollection('users');
    const user = users.find(u => u.mssv === mssv);
    if (!user) {
      return res.status(404).json({ error: `Thành viên với MSSV ${mssv} không tồn tại` });
    }
    // Kiểm tra MSSV mới đã có thẻ active chưa
    const existingCard = rfidCards.find(c => c.mssv === mssv && c.status === 'active' && c.id !== id);
    if (existingCard) {
      return res.status(400).json({ error: `Thành viên ${user.name} đã có thẻ active: ${existingCard.cardId}` });
    }
    card.mssv = mssv;
    card.userName = user.name;
  }

  if (status) {
    card.status = status;
  }

  rfidCards[index] = card;
  writeCollection('rfid_cards', rfidCards);

  logRfidAction(card.cardId, card.mssv, card.userName, 'update', 'management', true);

  // Ghi nhận Audit Log
  const changedOld = {};
  const changedNew = {};
  ['mssv', 'userName', 'status'].forEach(field => {
    if (oldCard[field] !== card[field]) {
      changedOld[field] = oldCard[field];
      changedNew[field] = card[field];
    }
  });

  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'rfid_card',
    targetId: id,
    oldValue: changedOld,
    newValue: changedNew,
    metadata: { cardId: card.cardId },
    success: true
  });

  res.json({ message: 'Cập nhật thẻ RFID thành công', card });
});

// Xóa / Vô hiệu hóa thẻ RFID
app.delete('/api/rfid-cards/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;

  const rfidCards = readCollection('rfid_cards');
  const index = rfidCards.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thẻ RFID' });
  }

  const card = rfidCards[index];

  logRfidAction(card.cardId, card.mssv, card.userName, 'delete', 'management', true);

  const filtered = rfidCards.filter(c => c.id !== id);
  writeCollection('rfid_cards', filtered);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'DELETE',
    targetType: 'rfid_card',
    targetId: id,
    oldValue: {
      cardId: card.cardId,
      mssv: card.mssv,
      userName: card.userName,
      status: card.status
    },
    success: true
  });

  res.json({ message: `Đã xóa thẻ ${card.cardId}` });
});

// Lịch sử quét thẻ của 1 thẻ cụ thể
app.get('/api/rfid-cards/:cardId/history', authenticateToken, (req, res) => {
  const { cardId } = req.params;
  const rfidCards = readCollection('rfid_cards');
  const targetCard = rfidCards.find(c => c.cardId === cardId);

  // Nếu là student, chỉ được xem lịch sử thẻ của chính mình
  if (req.user.normalizedRole === 'student') {
    if (!targetCard || targetCard.mssv !== req.user.mssv) {
      return res.status(403).json({ error: 'Bạn không có quyền xem lịch sử thẻ của người khác' });
    }
  }

  const history = readCollection('rfid_history');
  const cardHistory = history.filter(h => h.cardId === cardId);
  res.json([...cardHistory].reverse());
});

// Toàn bộ lịch sử quét thẻ (có filter)
app.get('/api/rfid-history', authenticateToken, (req, res) => {
  const { cardId, module: mod, from, to } = req.query;
  let targetMssv = req.query.mssv;

  // Nếu là student, ép targetMssv về MSSV trong token
  if (req.user.normalizedRole === 'student') {
    targetMssv = req.user.mssv;
  }

  let history = readCollection('rfid_history');

  if (cardId) history = history.filter(h => h.cardId === cardId);
  if (targetMssv) history = history.filter(h => h.mssv === targetMssv);
  if (mod) history = history.filter(h => h.module === mod);
  if (from) history = history.filter(h => new Date(h.timestamp) >= new Date(from));
  if (to) history = history.filter(h => new Date(h.timestamp) <= new Date(to));

  res.json([...history].reverse());
});

// ==========================================
// API THÀNH VIÊN (MEMBERS)
// ==========================================

app.get('/api/members', (req, res) => {
  const users = readCollection('users', []);
  // Bảo mật: Loại bỏ passwordHash khỏi danh sách trả về client
  const safeUsers = users.map(u => {
    const { passwordHash, ...safe } = u;
    return safe;
  });
  res.json(safeUsers);
});

app.post('/api/members', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { mssv, name, role, username, email, password } = req.body;
  if (!mssv || !name) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Tên thành viên' });
  }

  const users = readCollection('users', []);
  if (users.some(u => u.mssv === mssv)) {
    return res.status(400).json({ error: 'MSSV đã tồn tại trong hệ thống' });
  }

  const newUser = {
    id: uuidv4(),
    mssv: String(mssv).trim(),
    name: String(name).trim(),
    username: username ? String(username).trim().toLowerCase() : String(mssv).trim().toLowerCase(),
    email: email ? String(email).trim().toLowerCase() : '',
    passwordHash: password ? bcrypt.hashSync(String(password).trim(), 10) : null,
    role: role || 'Thành viên',
    points: 0,
    active: false,
    accountStatus: 'active'
  };

  users.push(newUser);
  writeCollection('users', users);

  // Ghi nhận Audit Log (Password/passwordHash tự động redact)
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'user',
    targetId: newUser.id,
    newValue: newUser,
    success: true
  });

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.put('/api/members/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { name, role, points } = req.body;

  const users = readCollection('users');
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thành viên' });
  }

  const oldUser = { ...users[index] };

  users[index] = {
    ...users[index],
    name: name !== undefined ? name : users[index].name,
    role: role !== undefined ? role : users[index].role,
    points: points !== undefined ? Number(points) : users[index].points
  };

  writeCollection('users', users);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'user',
    targetId: id,
    oldValue: oldUser,
    newValue: users[index],
    success: true
  });

  const { passwordHash: _, ...safeUpdated } = users[index];
  res.json(safeUpdated);
});

app.delete('/api/members/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const users = readCollection('users');
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thành viên' });
  }

  const deletedUser = users[index];
  const filtered = users.filter(u => u.id !== id);

  writeCollection('users', filtered);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'DELETE',
    targetType: 'user',
    targetId: id,
    oldValue: deletedUser,
    success: true
  });

  res.json({ message: 'Xóa thành viên thành công' });
});

app.post('/api/members/:id/points', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body; // e.g. amount: 10 hoặc -5

  if (amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: 'Số điểm không hợp lệ' });
  }

  const users = readCollection('users');
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thành viên' });
  }

  const oldPoints = users[index].points;
  users[index].points = Math.max(0, users[index].points + Number(amount));
  writeCollection('users', users);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'user_points',
    targetId: id,
    oldValue: { points: oldPoints },
    newValue: { points: users[index].points },
    metadata: {
      amount: Number(amount),
      reason: reason || ''
    },
    success: true
  });

  const { passwordHash: _, ...safeMember } = users[index];
  res.json(safeMember);
});


// ==========================================
// API ĐIỂM DANH (ATTENDANCE)
// ==========================================

app.get('/api/attendance', (req, res) => {
  const attendance = readCollection('attendance');
  // Sắp xếp lịch sử mới nhất lên đầu
  res.json([...attendance].reverse());
});

app.post('/api/attendance/check', (req, res) => {
  const { mssv, cardId } = req.body;

  // Hỗ trợ cả 2 cách: RFID hoặc nhập MSSV thủ công
  let actualMssv = mssv;

  // Nếu có cardId, validate qua RFID
  if (cardId) {
    const rfidMapping = getRfidMapping();
    const rfidMssv = rfidMapping[cardId];
    if (!rfidMssv) {
      logRfidAction(cardId, null, null, 'attendance-denied', 'attendance', false);
      return res.status(404).json({ error: 'Thẻ RFID không được đăng ký trong hệ thống' });
    }
    actualMssv = rfidMssv;
  }

  if (!actualMssv) {
    return res.status(400).json({ error: 'Vui lòng cung cấp MSSV hoặc quét thẻ RFID' });
  }

  const users = readCollection('users');
  const userIndex = users.findIndex(u => u.mssv === actualMssv);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Mã số sinh viên (MSSV) không tồn tại trên hệ thống' });
  }

  const user = users[userIndex];
  const attendance = readCollection('attendance');
  const now = new Date().toISOString();

  if (!user.active) {
    // Thực hiện CHECK-IN
    user.active = true;
    const newRecord = {
      id: uuidv4(),
      mssv: user.mssv,
      name: user.name,
      checkInTime: now,
      checkOutTime: null,
      duration: null,
      checkInMethod: cardId ? 'RFID' : 'Manual',
      cardId: cardId || null
    };
    attendance.push(newRecord);

    writeCollection('users', users);
    writeCollection('attendance', attendance);

    // Log RFID action nếu dùng thẻ
    if (cardId) {
      logRfidAction(cardId, user.mssv, user.name, 'check-in', 'attendance', true);
    }

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'CHECK_IN',
      targetType: 'attendance_record',
      targetId: newRecord.id,
      newValue: {
        mssv: user.mssv,
        name: user.name,
        checkInTime: newRecord.checkInTime,
        checkInMethod: newRecord.checkInMethod
      },
      metadata: {
        cardId: cardId || null,
        source: cardId ? 'rfid' : 'kiosk_manual'
      },
      success: true
    });

    return res.json({
      message: `Check-in thành công cho ${user.name}`,
      type: 'in',
      record: newRecord,
      user: {
        mssv: user.mssv,
        name: user.name,
        role: user.role,
        points: user.points
      }
    });
  } else {
    // Thực hiện CHECK-OUT
    user.active = false;
    const recordIndex = attendance.findIndex(r => r.mssv === actualMssv && r.checkOutTime === null);

    let duration = 0;
    let record = null;

    if (recordIndex !== -1) {
      const checkInTime = new Date(attendance[recordIndex].checkInTime);
      const checkOutTime = new Date(now);
      const diffMs = checkOutTime - checkInTime;
      duration = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Tính theo giờ, làm tròn 1 chữ số thập phân

      attendance[recordIndex].checkOutTime = now;
      attendance[recordIndex].duration = duration;
      attendance[recordIndex].checkOutMethod = cardId ? 'RFID' : 'Manual';
      record = attendance[recordIndex];
    }

    // Cộng điểm thưởng check-in chuyên cần từ settings
    const minHours = getSystemSetting('attendanceMinHours') ?? 1.0;
    const stdPoints = getSystemSetting('attendanceStandardPoints') ?? 5;
    const shortPoints = getSystemSetting('attendanceShortPoints') ?? 2;
    const pointsEarned = duration >= minHours ? stdPoints : shortPoints;
    user.points += pointsEarned;

    writeCollection('users', users);
    writeCollection('attendance', attendance);

    // Log RFID action nếu dùng thẻ
    if (cardId) {
      logRfidAction(cardId, user.mssv, user.name, 'check-out', 'attendance', true);
    }

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'CHECK_OUT',
      targetType: 'attendance_record',
      targetId: record?.id || user.mssv,
      newValue: {
        mssv: user.mssv,
        name: user.name,
        checkOutTime: now,
        duration,
        pointsEarned
      },
      metadata: {
        cardId: cardId || null,
        source: cardId ? 'rfid' : 'kiosk_manual'
      },
      success: true
    });

    return res.json({
      message: `Check-out thành công cho ${user.name}. Đã trực ${duration} giờ. Nhận +${pointsEarned} điểm tích lũy!`,
      type: 'out',
      record,
      user: {
        mssv: user.mssv,
        name: user.name,
        role: user.role,
        points: user.points
      },
      pointsEarned,
      duration
    });
  }
});


// ==========================================
// API THIẾT BỊ & MƯỢN TRẢ (EQUIPMENT)
// ==========================================

app.get('/api/equipment', (req, res) => {
  checkAndExpireReservations();
  const equipment = readCollection('equipment');
  const borrows = readCollection('borrows');

  // Tính toán lại borrowedQty thực tế theo các phiếu đang hoạt động (Đang mượn hoặc Đã đặt trước)
  let changed = false;
  equipment.forEach(eq => {
    const isConsumable = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
    if (!isConsumable) {
      const activeBorrows = borrows.filter(b => b.equipmentId === eq.id && (b.status === 'Đang mượn' || b.status === 'Đã đặt trước'));
      const actualBorrowedQty = activeBorrows.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
      if (eq.borrowedQty !== actualBorrowedQty) {
        eq.borrowedQty = actualBorrowedQty;
        changed = true;
      }
    }
  });

  if (changed) {
    writeCollection('equipment', equipment);
  }

  res.json(equipment);
});

app.post('/api/equipment', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { name, code, totalQty, location, category, assetType, unit, minThreshold, maxQty } = req.body;
  if (!name || !code || totalQty === undefined) {
    return res.status(400).json({ error: 'Vui lòng điền đủ Tên, Mã thiết bị và Số lượng' });
  }

  const equipment = readCollection('equipment');
  if (equipment.some(e => e.code.toLowerCase() === code.toLowerCase())) {
    return res.status(400).json({ error: 'Mã thiết bị này đã tồn tại' });
  }

  const newTotalQty = Number(totalQty);
  const newEquip = {
    id: uuidv4(),
    name,
    code,
    totalQty: newTotalQty,
    maxQty: maxQty !== undefined ? Number(maxQty) : newTotalQty,
    borrowedQty: 0,
    location: location || getSystemSetting('defaultLabLocation') || 'Kho Lab',
    status: 'Sẵn sàng',
    category: category || 'Khác',
    assetType: assetType || 'Thiết bị',
    unit: unit || 'Cái',
    minThreshold: minThreshold !== undefined ? Number(minThreshold) : (getSystemSetting('defaultLowStockThreshold') || 0)
  };

  equipment.push(newEquip);
  writeCollection('equipment', equipment);
  res.status(201).json(newEquip);
});

// Import hàng loạt thiết bị / linh kiện
app.post('/api/equipment/import', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Dữ liệu không đúng định dạng danh sách' });
  }

  const equipment = readCollection('equipment');
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  items.forEach((item, idx) => {
    const { name, code, totalQty, location, category, assetType, unit, minThreshold, maxQty } = item;
    
    if (!name || !code) {
      failedCount++;
      errors.push(`Dòng ${idx + 2}: Thiếu Tên hoặc Mã`);
      return;
    }

    if (equipment.some(e => e.code.toLowerCase() === code.toLowerCase())) {
      failedCount++;
      errors.push(`Dòng ${idx + 2}: Mã "${code}" đã tồn tại`);
      return;
    }

    const parsedQty = Number(totalQty) || 0;
    const newEquip = {
      id: uuidv4(),
      name,
      code,
      totalQty: parsedQty,
      maxQty: maxQty !== undefined ? Number(maxQty) : parsedQty,
      borrowedQty: 0,
      location: location || getSystemSetting('defaultLabLocation') || 'Kho Lab',
      status: 'Sẵn sàng',
      category: category || 'Khác',
      assetType: assetType || 'Thiết bị',
      unit: unit || 'Cái',
      minThreshold: minThreshold !== undefined ? Number(minThreshold) : (getSystemSetting('defaultLowStockThreshold') || 0)
    };

    equipment.push(newEquip);
    successCount++;
  });

  if (successCount > 0) {
    writeCollection('equipment', equipment);
  }

  res.json({
    success: successCount,
    failed: failedCount,
    errors
  });
});

app.put('/api/equipment/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { name, code, totalQty, location, status, category, assetType, unit, minThreshold, maxQty } = req.body;

  const equipment = readCollection('equipment');
  const index = equipment.findIndex(e => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
  }

  const current = equipment[index];
  const newTotalQty = totalQty !== undefined ? Number(totalQty) : current.totalQty;

  if (newTotalQty < current.borrowedQty) {
    return res.status(400).json({ error: 'Tổng số lượng không thể nhỏ hơn số lượng đang mượn' });
  }

  equipment[index] = {
    ...current,
    name: name !== undefined ? name : current.name,
    code: code !== undefined ? code : current.code,
    totalQty: newTotalQty,
    maxQty: maxQty !== undefined ? Number(maxQty) : (current.maxQty || newTotalQty),
    location: location !== undefined ? location : (current.location || getSystemSetting('defaultLabLocation') || 'Kho Lab'),
    status: status !== undefined ? status : current.status,
    category: category !== undefined ? category : current.category || 'Khác',
    assetType: assetType !== undefined ? assetType : current.assetType || 'Thiết bị',
    unit: unit !== undefined ? unit : current.unit || 'Cái',
    minThreshold: minThreshold !== undefined ? Number(minThreshold) : (current.minThreshold !== undefined ? current.minThreshold : (getSystemSetting('defaultLowStockThreshold') || 0))
  };

  writeCollection('equipment', equipment);
  res.json(equipment[index]);
});

app.delete('/api/equipment/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  let equipment = readCollection('equipment');
  const eq = equipment.find(e => e.id === id);
  if (!eq) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
  }

  if (eq.borrowedQty > 0) {
    return res.status(400).json({ error: 'Không thể xóa thiết bị đang được mượn' });
  }

  equipment = equipment.filter(e => e.id !== id);
  writeCollection('equipment', equipment);
  res.json({ message: `Đã xóa thiết bị ${eq.name}` });
});

// Mượn thiết bị
app.post('/api/equipment/:id/borrow', (req, res) => {
  const { id } = req.params;
  const { qty, expectedReturnDate, initialCondition, borrowNotes, cardId, selectedInstanceIds } = req.body;

  // Lấy MSSV từ req.body.mssv hoặc từ req.user nếu có
  let targetMssv = req.body.mssv ? String(req.body.mssv).trim() : (req.user?.mssv || null);

  if (!targetMssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Số lượng mượn không hợp lệ' });
  }

  // Tìm thành viên trong users hoặc members
  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const user = findPerson(targetMssv);
  if (!user) {
    return res.status(404).json({ error: 'Thành viên mượn thiết bị không tồn tại trên hệ thống' });
  }

  // Kiểm tra thời gian hẹn nhận nếu là Đặt trước (không quét thẻ tại quầy)
  if (!cardId && req.body.borrowDate) {
    const scheduledTime = new Date(req.body.borrowDate);
    const now = new Date();
    const expireHoursSetting = getSystemSetting('reserveAutoExpireHours');
    const expireHours = expireHoursSetting !== undefined ? Number(expireHoursSetting) : 2;

    if (!isNaN(scheduledTime.getTime())) {
      // Nếu giờ hẹn nhận đã ở quá khứ
      if (now > scheduledTime) {
        const elapsedHours = (now - scheduledTime) / (1000 * 60 * 60);
        if (expireHours > 0 && elapsedHours >= expireHours) {
          return res.status(400).json({
            error: `Thời gian hẹn nhận (${new Date(req.body.borrowDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}) đã quá hạn quy định ${expireHours} giờ. Vui lòng chọn giờ hẹn nhận ở hiện tại hoặc tương lai.`
          });
        }
      }
    }
  }

  const equipment = readCollection('equipment');
  const eqIndex = equipment.findIndex(e => e.id === id);
  if (eqIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị cần mượn' });
  }

  const eq = equipment[eqIndex];
  const requestedQty = Number(qty);

  // Đảm bảo borrowedQty luôn có giá trị
  if (!eq.borrowedQty) eq.borrowedQty = 0;

  const isConsumable = eq.assetType === 'Linh kiện tiêu hao' || (eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư')));

  if (isConsumable) {
    // Nếu là linh kiện tiêu hao, kiểm tra số lượng tồn kho trực tiếp
    if (eq.totalQty < requestedQty) {
      return res.status(400).json({ error: 'Số lượng linh kiện trong kho không đủ để xuất' });
    }
    // Trừ trực tiếp số lượng trong kho
    eq.totalQty -= requestedQty;
  } else {
    // Nếu là thiết bị/dụng cụ bình thường
    if (eq.totalQty - eq.borrowedQty < requestedQty) {
      return res.status(400).json({ error: 'Số lượng thiết bị còn lại trong kho không đủ' });
    }

    if (selectedInstanceIds && selectedInstanceIds.length > 0) {
      if (selectedInstanceIds.length !== requestedQty) {
        return res.status(400).json({ error: 'Số lượng Serial cá thể được chọn không khớp với Số lượng mượn' });
      }
      if (eq.instances) {
        for (let instId of selectedInstanceIds) {
          let inst = eq.instances.find(i => i.id === instId);
          if (!inst) return res.status(400).json({ error: 'Không tìm thấy Serial ID: ' + instId });
          if (inst.status !== 'Sẵn sàng') return res.status(400).json({ error: 'Serial ' + inst.serialNumber + ' không ở trạng thái Sẵn sàng' });

          inst.status = cardId ? 'Đang mượn' : 'Đã đặt trước';
          inst.borrowedBy = user.mssv;
        }
      }
    }

    eq.borrowedQty += requestedQty;
  }

  writeCollection('equipment', equipment);

  // Tạo phiếu mượn / xuất kho
  const borrows = readCollection('borrows');
  const borrowStatus = cardId ? (isConsumable ? 'Đã tiêu hao' : 'Đang mượn') : 'Đã đặt trước';
  const borrowDays = getSystemSetting('defaultBorrowDays') || 7;
  const fallbackReturnDate = new Date(Date.now() + borrowDays * 24 * 60 * 60 * 1000).toISOString();

  let finalBorrowDate = new Date().toISOString();
  if (req.body.borrowDate) {
    try {
      finalBorrowDate = new Date(req.body.borrowDate).toISOString();
    } catch (e) {}
  }

  const newBorrow = {
    id: uuidv4(),
    equipmentId: eq.id,
    equipmentName: eq.name,
    equipmentCode: eq.code,
    mssv: user.mssv,
    borrowerName: user.name,
    qty: requestedQty,
    borrowDate: finalBorrowDate,
    expectedReturnDate: isConsumable ? null : (expectedReturnDate || fallbackReturnDate),
    initialCondition: initialCondition || 'Tốt',
    borrowNotes: borrowNotes || '',
    returnDate: (cardId && isConsumable) ? new Date().toISOString() : null,
    returnMssv: (cardId && isConsumable) ? user.mssv : null,
    returnerName: (cardId && isConsumable) ? user.name : null,
    finalCondition: (cardId && isConsumable) ? 'Đã tiêu hao' : null,
    returnNotes: (cardId && isConsumable) ? 'Linh kiện tiêu hao xuất dùng trực tiếp (không thu hồi)' : null,
    status: borrowStatus,
    instanceIds: selectedInstanceIds || null,
    instanceSerials: selectedInstanceIds && eq.instances ? selectedInstanceIds.map(id => eq.instances.find(i => i.id === id)?.serialNumber).filter(Boolean) : null
  };
  borrows.push(newBorrow);
  writeCollection('borrows', borrows);

  // Log RFID scan if applicable
  if (cardId) {
    logRfidAction(cardId, user.mssv, user.name, isConsumable ? 'export' : 'borrow', 'equipment', true);
  }

  // Gửi thông báo cho Quản lý
  createNotification(
    'equipment_borrow',
    isConsumable ? 'Xuất linh kiện' : 'Mượn thiết bị mới',
    `${user.name} (${user.mssv}) vừa mượn/xuất ${requestedQty}x ${eq.name}`,
    {
      borrowId: newBorrow.id,
      equipmentId: eq.id,
      equipmentName: eq.name,
      qty: requestedQty,
      userName: user.name,
      mssv: user.mssv,
      date: newBorrow.borrowDate
    }
  );

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: isConsumable ? 'ISSUE' : 'BORROW',
    targetType: isConsumable ? 'component' : 'borrow_ticket',
    targetId: newBorrow.id,
    newValue: {
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentCode: eq.code,
      borrowerMssv: user.mssv,
      borrowerName: user.name,
      qty: requestedQty,
      status: newBorrow.status,
      isConsumable
    },
    metadata: {
      initialCondition: newBorrow.initialCondition,
      expectedReturnDate: newBorrow.expectedReturnDate
    },
    success: true
  });

  res.json({ message: isConsumable ? 'Xuất linh kiện thành công' : 'Mượn thiết bị thành công', borrow: newBorrow });
});

// Đặt trước thiết bị (Online Reservation - Sinh viên & Khách đặt trực tiếp theo MSSV)
app.post('/api/equipment/:id/reserve', (req, res) => {
  const { id } = req.params;
  const { qty, expectedReturnDate } = req.body;

  let targetMssv = req.body.mssv ? String(req.body.mssv).trim() : (req.user?.mssv || null);

  if (!targetMssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Số lượng mượn không hợp lệ' });
  }

  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const user = findPerson(targetMssv);
  if (!user) {
    return res.status(404).json({ error: 'MSSV không tồn tại trên hệ thống' });
  }

  const equipment = readCollection('equipment');
  const eqIndex = equipment.findIndex(e => e.id === id);
  if (eqIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
  }

  const eq = equipment[eqIndex];
  const requestedQty = Number(qty);

  if (!eq.borrowedQty) eq.borrowedQty = 0;
  const isConsumable = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));

  if (isConsumable) {
    if (eq.totalQty < requestedQty) return res.status(400).json({ error: 'Tồn kho không đủ' });
    eq.totalQty -= requestedQty;
  } else {
    if (eq.totalQty - eq.borrowedQty < requestedQty) return res.status(400).json({ error: 'Tồn kho không đủ' });
    eq.borrowedQty += requestedQty;
  }

  writeCollection('equipment', equipment);

  const borrows = readCollection('borrows');
  let finalBorrowDate = new Date().toISOString();
  if (req.body.borrowDate) {
    try {
      finalBorrowDate = new Date(req.body.borrowDate).toISOString();
    } catch (e) {}
  }

  const newBorrow = {
    id: uuidv4(),
    equipmentId: eq.id,
    equipmentName: eq.name,
    equipmentCode: eq.code,
    mssv: user.mssv,
    borrowerName: user.name,
    qty: requestedQty,
    borrowDate: finalBorrowDate,
    expectedReturnDate: isConsumable ? null : (expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    initialCondition: 'Tốt',
    borrowNotes: 'Đặt trước qua hệ thống Online',
    returnDate: null,
    returnMssv: null,
    returnerName: null,
    finalCondition: null,
    returnNotes: null,
    status: 'Đã đặt trước'
  };
  borrows.push(newBorrow);
  writeCollection('borrows', borrows);

  // Gửi thông báo cho Quản lý
  createNotification(
    'equipment_reserve',
    'Yêu cầu đặt trước thiết bị',
    `${user.name} (${user.mssv}) đã đặt trước ${requestedQty}x ${eq.name}`,
    {
      borrowId: newBorrow.id,
      equipmentId: eq.id,
      equipmentName: eq.name,
      qty: requestedQty,
      userName: user.name,
      mssv: user.mssv,
      date: newBorrow.borrowDate
    }
  );

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'RESERVE',
    targetType: 'reserve_ticket',
    targetId: newBorrow.id,
    newValue: {
      equipmentId: eq.id,
      equipmentName: eq.name,
      equipmentCode: eq.code,
      borrowerMssv: user.mssv,
      borrowerName: user.name,
      qty: requestedQty,
      status: 'Đã đặt trước'
    },
    success: true
  });

  res.json({ message: 'Đặt trước thiết bị thành công', borrow: newBorrow });
});

// Xác nhận bàn giao thiết bị đã đặt trước (Quét RFID)
app.post('/api/equipment/borrows/:borrowId/confirm-handover', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { borrowId } = req.params;
  const { cardId, initialCondition, borrowNotes } = req.body;

  if (!cardId) {
    return res.status(400).json({ error: 'Vui lòng quét thẻ RFID để bàn giao' });
  }

  const borrows = readCollection('borrows');
  const borrowIndex = borrows.findIndex(b => b.id === borrowId);

  if (borrowIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu mượn' });
  }

  const borrowTicket = borrows[borrowIndex];

  if (borrowTicket.status !== 'Đã đặt trước') {
    return res.status(400).json({ error: 'Trạng thái phiếu không hợp lệ để bàn giao' });
  }

  // Xác thực thẻ
  const rfidCards = readCollection('rfid_cards');
  const card = rfidCards.find(c => c.cardId === cardId && c.status === 'active');
  if (!card) {
    return res.status(400).json({ error: 'Thẻ RFID không hợp lệ hoặc chưa đăng ký' });
  }

  if (card.mssv !== borrowTicket.mssv) {
    return res.status(403).json({ error: `Thẻ RFID này thuộc về MSSV ${card.mssv}, không khớp với người đặt trước (${borrowTicket.mssv})` });
  }

  const equipment = readCollection('equipment');
  const eq = equipment.find(e => e.id === borrowTicket.equipmentId);
  const isConsumable = eq && eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));

  const oldStatus = borrowTicket.status;

  // Cập nhật trạng thái
  if (isConsumable) {
    borrowTicket.status = 'Đã tiêu hao';
    borrowTicket.borrowDate = new Date().toISOString();
    borrowTicket.returnDate = new Date().toISOString();
    borrowTicket.returnMssv = borrowTicket.mssv;
    borrowTicket.returnerName = borrowTicket.borrowerName;
    borrowTicket.finalCondition = 'Đã tiêu hao';
    borrowTicket.returnNotes = 'Linh kiện tiêu hao xuất dùng trực tiếp (không thu hồi)';
  } else {
    borrowTicket.status = 'Đang mượn';
    borrowTicket.borrowDate = new Date().toISOString(); // Cập nhật thời gian thực nhận đồ

    // Cập nhật trạng thái các Serial được liên kết thành 'Đang mượn'
    if (borrowTicket.instanceIds && borrowTicket.instanceIds.length > 0 && eq && eq.instances) {
      for (let instId of borrowTicket.instanceIds) {
        let inst = eq.instances.find(i => i.id === instId);
        if (inst) {
          inst.status = 'Đang mượn';
        }
      }
      writeCollection('equipment', equipment);
    }
  }
  
  writeCollection('borrows', borrows);

  // Log RFID
  logRfidAction(cardId, borrowTicket.mssv, borrowTicket.borrowerName, 'borrow', 'equipment', true);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'APPROVE',
    targetType: 'borrow_ticket',
    targetId: borrowId,
    oldValue: { status: oldStatus },
    newValue: { status: borrowTicket.status, cardId },
    metadata: {
      borrowerMssv: borrowTicket.mssv,
      borrowerName: borrowTicket.borrowerName
    },
    success: true
  });

  res.json({ message: 'Bàn giao thiết bị thành công', borrow: borrowTicket });
});

// Hủy giữ chỗ / Bỏ hẹn đặt trước thiết bị (Hoàn trả tồn kho và thông báo Waitlist)
app.post('/api/equipment/borrows/:borrowId/cancel-reservation', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { borrowId } = req.params;
  const { cancelReason } = req.body;

  const borrows = readCollection('borrows');
  const borrowIndex = borrows.findIndex(b => b.id === borrowId);

  if (borrowIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu mượn' });
  }

  const borrowTicket = borrows[borrowIndex];

  if (borrowTicket.status !== 'Đã đặt trước') {
    return res.status(400).json({ error: 'Chỉ có thể hủy phiếu đang ở trạng thái Đã đặt trước' });
  }

  const equipment = readCollection('equipment');
  const eq = equipment.find(e => e.id === borrowTicket.equipmentId);

  const oldStatus = borrowTicket.status;

  // 1. Hoàn trả lại số lượng vào tồn kho
  if (eq) {
    const isConsumable = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
    if (isConsumable) {
      eq.totalQty = (eq.totalQty || 0) + Number(borrowTicket.qty);
    } else {
      eq.borrowedQty = Math.max(0, (eq.borrowedQty || 0) - Number(borrowTicket.qty));
      // Giải phóng trạng thái các instance máy con
      if (borrowTicket.instanceIds && borrowTicket.instanceIds.length > 0 && eq.instances) {
        for (let instId of borrowTicket.instanceIds) {
          let inst = eq.instances.find(i => i.id === instId);
          if (inst && inst.status === 'Đang mượn') {
            inst.status = 'Sẵn sàng';
          }
        }
      }
    }
    writeCollection('equipment', equipment);
  }

  // 2. Cập nhật trạng thái phiếu sang Đã hủy
  borrowTicket.status = 'Đã hủy';
  borrowTicket.cancelReason = cancelReason || 'Quản lý hủy giữ chỗ do người đặt không đến nhận';
  borrowTicket.cancelledAt = new Date().toISOString();
  borrowTicket.cancelledBy = req.user.name || req.user.mssv || 'Quản lý';
  writeCollection('borrows', borrows);

  // 3. Thông báo cho người tiếp theo trong danh sách chờ (Waitlist)
  let notifiedPerson = null;
  if (eq) {
    notifiedPerson = notifyWaitlist(eq.id);
  }

  // 4. Tạo thông báo hệ thống
  createNotification(
    'warning',
    'Hủy giữ chỗ thiết bị',
    `Phiếu đặt trước của ${borrowTicket.borrowerName} (${borrowTicket.mssv}) cho thiết bị "${borrowTicket.equipmentName}" đã bị hủy. Số lượng đã được hoàn trả lại kho.`,
    {
      borrowId: borrowTicket.id,
      equipmentId: borrowTicket.equipmentId,
      equipmentName: borrowTicket.equipmentName,
      qty: borrowTicket.qty
    }
  );

  // 5. Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CANCEL',
    targetType: 'borrow_ticket',
    targetId: borrowId,
    oldValue: { status: oldStatus },
    newValue: { status: 'Đã hủy', cancelReason: borrowTicket.cancelReason },
    metadata: {
      borrowerMssv: borrowTicket.mssv,
      borrowerName: borrowTicket.borrowerName,
      equipmentName: borrowTicket.equipmentName,
      qty: borrowTicket.qty
    },
    success: true
  });

  res.json({
    message: 'Đã hủy giữ chỗ và hoàn trả số lượng vào kho thành công',
    borrow: borrowTicket,
    waitlistNotified: notifiedPerson ? {
      name: notifiedPerson.userName,
      mssv: notifiedPerson.mssv
    } : null
  });
});

// Trả thiết bị
app.post('/api/equipment/borrows/:borrowId/return', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { borrowId } = req.params;
  const { returnMssv, finalCondition, returnNotes, cardId } = req.body;

  if (!returnMssv) {
    return res.status(400).json({ error: 'Vui lòng cung cấp MSSV người thực tế đi trả thiết bị' });
  }

  const borrows = readCollection('borrows');
  const borrowIndex = borrows.findIndex(b => b.id === borrowId);

  if (borrowIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu mượn' });
  }

  const borrowTicket = borrows[borrowIndex];
  if (borrowTicket.status === 'Đã trả') {
    return res.status(400).json({ error: 'Thiết bị này đã được trả từ trước' });
  }

  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const returner = findPerson(returnMssv);
  if (!returner) {
    return res.status(404).json({ error: 'Người trả thiết bị không tồn tại trên hệ thống' });
  }

  const oldStatus = borrowTicket.status;

  const equipment = readCollection('equipment');
  const eqIndex = equipment.findIndex(e => e.id === borrowTicket.equipmentId);

  if (eqIndex !== -1) {
    const eq = equipment[eqIndex];
    // Trả lại số lượng về kho
    eq.borrowedQty = Math.max(0, eq.borrowedQty - borrowTicket.qty);

    if (borrowTicket.instanceIds && eq.instances) {
      const borrowDateMs = new Date(borrowTicket.borrowDate).getTime();
      const returnDateMs = new Date().getTime();
      const hoursUsed = Math.max(0, (returnDateMs - borrowDateMs) / (1000 * 60 * 60)); // In hours

      for (let instId of borrowTicket.instanceIds) {
        let inst = eq.instances.find(i => i.id === instId);
        if (inst) {
          inst.status = 'Sẵn sàng';
          inst.borrowedBy = null;
          inst.usedHours = (inst.usedHours || 0) + hoursUsed;
        }
      }
    }

    writeCollection('equipment', equipment);
  }

  // Cập nhật phiếu mượn
  borrowTicket.returnDate = new Date().toISOString();
  borrowTicket.returnMssv = returner.mssv;
  borrowTicket.returnerName = returner.name;
  borrowTicket.finalCondition = finalCondition || 'Tốt';
  borrowTicket.returnNotes = returnNotes || '';
  borrowTicket.status = 'Đã trả';

  writeCollection('borrows', borrows);

  // Tự động tạo phiếu báo hỏng/bảo trì nếu thiết bị trả về bị lỗi/hỏng/mất
  const isDamagedOrLost = [
    "Bị hỏng hóc bộ phận / Lỗi chức năng",
    "Mất phụ kiện đi kèm (dây, adapter...)",
    "Hỏng hoàn toàn / Bị mất thiết bị"
  ].includes(finalCondition);

  if (isDamagedOrLost) {
    // 1. Tạo phiếu bảo trì tự động
    const maintenance = readCollection('maintenance');
    const newMaintenanceTicket = {
      id: uuidv4(),
      equipmentId: borrowTicket.equipmentId,
      equipmentName: borrowTicket.equipmentName,
      issueDescription: `[Trả máy hỏng - mượn bởi ${borrowTicket.borrowerName}] Tình trạng: ${finalCondition}. Chi tiết: ${returnNotes || 'Không có ghi chú thêm.'}`,
      status: finalCondition.includes('Hỏng hoàn toàn') ? 'Đã hỏng (Chờ thanh lý)' : 'Đang sửa',
      cost: 0,
      reportedDate: new Date().toISOString(),
      resolvedDate: null,
      notes: [
        {
          id: uuidv4(),
          text: `Hệ thống tự động tạo do người trả ${returner.name} (${returner.mssv}) hoàn trả thiết bị trong tình trạng không nguyên vẹn.`,
          date: new Date().toISOString()
        }
      ]
    };
    maintenance.push(newMaintenanceTicket);
    writeCollection('maintenance', maintenance);

    // 2. Tạo thông báo hệ thống cho Dashboard quản lý
    createNotification(
      'danger',
      'Cảnh báo thiết bị trả lại bị hỏng/mất',
      `Sinh viên ${returner.name} (${returner.mssv}) đã hoàn trả thiết bị "${borrowTicket.equipmentName}" (${borrowTicket.equipmentCode}) trong tình trạng: ${finalCondition}. Ghi chú: ${returnNotes || 'Không có.'}`,
      {
        borrowId,
        equipmentId: borrowTicket.equipmentId,
        maintenanceId: newMaintenanceTicket.id
      }
    );
  }

  // Log RFID scan if applicable
  if (cardId) {
    logRfidAction(cardId, returner.mssv, returner.name, 'return', 'equipment', true);
  }

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'RETURN',
    targetType: 'borrow_ticket',
    targetId: borrowId,
    oldValue: { status: oldStatus },
    newValue: {
      status: 'Đã trả',
      returnMssv: returner.mssv,
      returnerName: returner.name,
      finalCondition: borrowTicket.finalCondition
    },
    metadata: {
      equipmentId: borrowTicket.equipmentId,
      qty: borrowTicket.qty,
      isDamagedOrLost
    },
    success: true
  });

  // Thông báo waitlist nếu có người chờ
  const notified = notifyWaitlist(borrowTicket.equipmentId);

  res.json({
    message: 'Trả thiết bị thành công',
    borrow: borrowTicket,
    waitlistNotified: notified ? {
      name: notified.userName,
      mssv: notified.mssv
    } : null
  });
});

// Danh sách phiếu mượn
app.get('/api/equipment-borrows', (req, res) => {
  // Quét và tự động hủy các phiếu đặt trước đã quá hạn ngay lập tức
  checkAndExpireReservations();

  const borrows = readCollection('borrows');
  const equipment = readCollection('equipment');

  // Map thêm thông tin tên và mã thiết bị nếu phiếu cũ chưa lưu
  const richBorrows = borrows.map(b => {
    const eq = equipment.find(e => e.id === b.equipmentId);
    return {
      ...b,
      equipmentName: b.equipmentName || (eq ? eq.name : 'Thiết bị đã xóa'),
      equipmentCode: b.equipmentCode || (eq ? eq.code : 'N/A')
    };
  });

  res.json([...richBorrows].reverse());
});


// ==========================================
// API WAITLIST (DANH SÁCH CHỜ MƯỢN THIẾT BỊ)
// ==========================================

// Lấy toàn bộ danh sách chờ (Waitlist) cho Quản trị viên
app.get('/api/waitlist', (req, res) => {
  const waitlist = readCollection('waitlist', []);
  res.json(waitlist);
});

// Lấy danh sách chờ của một thiết bị
app.get('/api/equipment/:id/waitlist', (req, res) => {
  const { id } = req.params;
  const waitlist = readCollection('waitlist', []);
  const equipWaitlist = waitlist.filter(w => String(w.equipmentId) === String(id) && w.status === 'waiting');
  res.json(equipWaitlist);
});

// Đăng ký chờ mượn thiết bị
app.post('/api/equipment/:id/waitlist', (req, res) => {
  const { id } = req.params;
  const { mssv, qty, notes, purpose, neededDate } = req.body;

  if (!mssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc số lượng không hợp lệ' });
  }

  const users = readCollection('users', []);
  const members = readCollection('members', []);
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  let user = findPerson(mssv);
  if (!user) {
    user = { mssv: String(mssv).trim(), name: `Sinh viên (${mssv})` };
  }

  const equipment = readCollection('equipment');
  const eq = equipment.find(e => e.id === id);
  if (!eq) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
  }

  // Kiểm tra xem đã đăng ký chờ chưa
  const waitlist = readCollection('waitlist');
  const existing = waitlist.find(w =>
    w.equipmentId === id &&
    w.mssv === mssv &&
    w.status === 'waiting'
  );

  if (existing) {
    return res.status(400).json({ error: 'Bạn đã đăng ký chờ mượn thiết bị này rồi' });
  }

  const newWaitlistEntry = {
    id: uuidv4(),
    equipmentId: id,
    equipmentName: eq.name,
    equipmentCode: eq.code,
    mssv: user.mssv,
    userName: user.name,
    qty: Number(qty),
    purpose: purpose || 'Đồ án môn học / Khóa luận tốt nghiệp',
    neededDate: neededDate || '',
    notes: notes || '',
    registeredDate: new Date().toISOString(),
    status: 'waiting', // 'waiting', 'notified', 'cancelled', 'fulfilled'
    notifiedDate: null,
    fulfilledDate: null
  };

  waitlist.push(newWaitlistEntry);
  writeCollection('waitlist', waitlist);

  res.status(201).json({
    message: 'Đăng ký chờ mượn thành công. Bạn sẽ được thông báo khi có thiết bị.',
    waitlist: newWaitlistEntry
  });
});

// Hủy đăng ký chờ
app.delete('/api/waitlist/:waitlistId', (req, res) => {
  const { waitlistId } = req.params;
  const { mssv } = req.body;

  if (!mssv) {
    return res.status(400).json({ error: 'Thiếu MSSV để xác thực' });
  }

  const waitlist = readCollection('waitlist');
  const index = waitlist.findIndex(w => w.id === waitlistId);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy đăng ký chờ' });
  }

  // Kiểm tra quyền
  if (waitlist[index].mssv !== mssv) {
    return res.status(403).json({ error: 'Bạn không có quyền hủy đăng ký này' });
  }

  waitlist[index].status = 'cancelled';
  waitlist[index].cancelledDate = new Date().toISOString();

  writeCollection('waitlist', waitlist);
  res.json({ message: 'Đã hủy đăng ký chờ mượn' });
});

// Lấy danh sách chờ của user
app.get('/api/waitlist/user/:mssv', (req, res) => {
  const { mssv } = req.params;
  const waitlist = readCollection('waitlist');
  const userWaitlist = waitlist.filter(w => w.mssv === mssv && w.status === 'waiting');
  res.json(userWaitlist);
});

// Auto-notify khi có thiết bị trả (được gọi từ return equipment)
const notifyWaitlist = (equipmentId) => {
  const waitlist = readCollection('waitlist');
  const equipment = readCollection('equipment');

  const eq = equipment.find(e => e.id === equipmentId);
  if (!eq) return;

  const available = eq.totalQty - (eq.borrowedQty || 0);
  if (available <= 0) return; // Vẫn hết, không thông báo

  // Lấy người đầu tiên trong danh sách chờ
  const waiting = waitlist
    .filter(w => w.equipmentId === equipmentId && w.status === 'waiting')
    .sort((a, b) => new Date(a.registeredDate) - new Date(b.registeredDate));

  if (waiting.length === 0) return;

  // Thông báo cho người đầu tiên
  const firstPerson = waiting[0];
  firstPerson.status = 'notified';
  firstPerson.notifiedDate = new Date().toISOString();

  writeCollection('waitlist', waitlist);

  // TODO: Gửi email/notification thực tế ở đây
  console.log(`[NOTIFICATION] ${firstPerson.userName} (${firstPerson.mssv}): Thiết bị ${eq.name} đã có sẵn!`);

  return firstPerson;
};


// ==========================================
// API LỊCH TRỰC LAB (SCHEDULES)
// ==========================================

app.get('/api/schedules', (req, res) => {
  const schedules = readCollection('schedules');
  res.json(schedules);
});

// Đăng ký ca trực
app.post('/api/schedules/register', authenticateToken, (req, res) => {
  const { scheduleId } = req.body;

  // Lấy MSSV từ token nếu là student, hoặc từ req.body nếu là manager/super_admin
  let targetMssv = req.user.mssv;
  if (req.user.normalizedRole === 'manager' || req.user.normalizedRole === 'super_admin') {
    if (req.body.mssv && String(req.body.mssv).trim()) {
      targetMssv = String(req.body.mssv).trim();
    }
  }

  if (!scheduleId || !targetMssv) {
    return res.status(400).json({ error: 'Thiếu mã ca trực hoặc MSSV' });
  }

  const users = readCollection('users');
  const user = users.find(u => u.mssv === targetMssv);
  if (!user) {
    return res.status(404).json({ error: 'Thành viên không tồn tại' });
  }

  const schedules = readCollection('schedules');
  const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
  if (scheduleIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy ca trực' });
  }

  const schedule = schedules[scheduleIndex];

  // Kiểm tra xem đã đăng ký chưa
  const alreadyRegistered = schedule.members.some(m => m.mssv === targetMssv);
  if (alreadyRegistered) {
    // Nếu đã đăng ký, thực hiện hủy đăng ký (toggle)
    schedule.members = schedule.members.filter(m => m.mssv !== targetMssv);
    writeCollection('schedules', schedules);

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'CANCEL',
      targetType: 'schedule_shift',
      targetId: scheduleId,
      oldValue: {
        registeredMssv: user.mssv,
        registeredName: user.name,
        shift: schedule.shift,
        day: schedule.day
      },
      metadata: {
        scheduleId,
        day: schedule.day,
        shift: schedule.shift
      },
      success: true
    });

    return res.json({ message: 'Đã hủy đăng ký ca trực thành công', schedule });
  } else {
    // Nếu chưa đăng ký, thêm vào danh sách
    schedule.members.push({ mssv: user.mssv, name: user.name });
    writeCollection('schedules', schedules);

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'REGISTER',
      targetType: 'schedule_shift',
      targetId: scheduleId,
      newValue: {
        registeredMssv: user.mssv,
        registeredName: user.name,
        shift: schedule.shift,
        day: schedule.day
      },
      metadata: {
        scheduleId,
        day: schedule.day,
        shift: schedule.shift
      },
      success: true
    });

    return res.json({ message: 'Đăng ký ca trực thành công', schedule });
  }
});



// ==========================================
// API CÔNG VIỆC & DỰ ÁN (TASKS)
// ==========================================

app.get('/api/tasks', (req, res) => {
  const tasks = readCollection('tasks');
  res.json(tasks);
});

app.post('/api/tasks', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { title, project, assignedTo, points } = req.body;
  if (!title || !project) {
    return res.status(400).json({ error: 'Thiếu Tiêu đề nhiệm vụ hoặc Tên dự án' });
  }

  let assignedName = 'Chưa phân công';
  if (assignedTo) {
    const users = readCollection('users');
    const user = users.find(u => u.mssv === assignedTo);
    if (user) {
      assignedName = user.name;
    }
  }

  const tasks = readCollection('tasks');
  const defaultPoints = getSystemSetting('taskDefaultPoints') ?? 10;
  const newTask = {
    id: uuidv4(),
    title,
    project,
    status: 'todo',
    assignedTo: assignedTo || null,
    assignedName,
    points: points ? Number(points) : defaultPoints
  };

  tasks.push(newTask);
  writeCollection('tasks', tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, project, status, assignedTo, points } = req.body;

  const tasks = readCollection('tasks');
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
  }

  const currentTask = tasks[index];
  const prevStatus = currentTask.status;

  // Student chỉ được phép cập nhật status của task được giao cho mình
  if (req.user.normalizedRole === 'student') {
    if (currentTask.assignedTo !== req.user.mssv) {
      return res.status(403).json({ error: 'Bạn chỉ có thể cập nhật trạng thái nhiệm vụ được giao cho mình' });
    }
  }

  let assignedName = currentTask.assignedName;
  if (assignedTo !== undefined && req.user.normalizedRole !== 'student') {
    if (assignedTo) {
      const users = readCollection('users');
      const user = users.find(u => u.mssv === assignedTo);
      assignedName = user ? user.name : 'Chưa phân công';
    } else {
      assignedName = 'Chưa phân công';
    }
  }

  tasks[index] = {
    ...currentTask,
    title: (req.user.normalizedRole !== 'student' && title !== undefined) ? title : currentTask.title,
    project: (req.user.normalizedRole !== 'student' && project !== undefined) ? project : currentTask.project,
    status: status !== undefined ? status : currentTask.status,
    assignedTo: (req.user.normalizedRole !== 'student' && assignedTo !== undefined) ? assignedTo : currentTask.assignedTo,
    assignedName,
    points: (req.user.normalizedRole !== 'student' && points !== undefined) ? Number(points) : currentTask.points
  };

  // Cộng điểm khi hoàn thành công việc
  if (status === 'done' && prevStatus !== 'done' && tasks[index].assignedTo) {
    const users = readCollection('users');
    const userIndex = users.findIndex(u => u.mssv === tasks[index].assignedTo);
    if (userIndex !== -1) {
      users[userIndex].points += tasks[index].points;
      writeCollection('users', users);
    }
  }
  // Trừ điểm nếu chuyển từ trạng thái done về trạng thái khác
  else if (prevStatus === 'done' && status !== 'done' && tasks[index].assignedTo) {
    const users = readCollection('users');
    const userIndex = users.findIndex(u => u.mssv === tasks[index].assignedTo);
    if (userIndex !== -1) {
      users[userIndex].points = Math.max(0, users[userIndex].points - tasks[index].points);
      writeCollection('users', users);
    }
  }

  writeCollection('tasks', tasks);
  res.json(tasks[index]);
});

app.delete('/api/tasks/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const tasks = readCollection('tasks');
  const filtered = tasks.filter(t => t.id !== id);

  if (filtered.length === tasks.length) {
    return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
  }

  writeCollection('tasks', filtered);
  res.json({ message: 'Xóa nhiệm vụ thành công' });
});


// Helper: Lấy thời gian bắt đầu (Date object) của 1 slot theo setting
export function getSlotStartDateTime(dateStr, slotId) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const slotKey = `slot_${slotId}_start`;
  const timeStr = getSystemSetting(slotKey) || '07:00';
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
}

// Helper: Lấy ngày Thứ 2 đầu tuần (YYYY-MM-DD) của một ngày bất kỳ
export function getMondayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, ...
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

// ==========================================
// API PHÒNG LAB (ROOM BOOKING)
// ==========================================

app.get('/api/bookings/all', (req, res) => {
  res.json(readCollection('bookings'));
});

app.get('/api/bookings/history', (req, res) => {
  const bookings = readCollection('bookings');
  const sessions = readCollection('sessions');
  const members = readCollection('members');

  const history = bookings.map(b => {
    const session = sessions.find(s => s.bookingId === b.id);
    const rep = members.find(m => m.mssv === b.representativeMssv);
    
    // Trạng thái: 
    // Nếu date < today => Đã hoàn thành (hoặc Vắng mặt nếu ko có session)
    // Nếu date >= today => Sắp tới
    const today = new Date();
    today.setHours(0,0,0,0);
    const bDate = new Date(b.date);
    let status = 'Sắp tới';
    
    if (bDate < today) {
      status = session ? 'Đã hoàn thành' : 'Vắng mặt';
    } else if (bDate.getTime() === today.getTime()) {
      status = 'Hôm nay';
      if (session) status = 'Đang diễn ra';
    }

    return {
      ...b,
      representativeName: rep ? rep.name : 'Unknown',
      session,
      status
    };
  });
  
  // Sắp xếp mới nhất lên đầu
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json(history);
});

app.get('/api/bookings/week', (req, res) => {
  const { start } = req.query;
  if (!start) return res.status(400).json({ error: 'Thiếu tham số start (date YYYY-MM-DD)' });

  const bookings = readCollection('bookings');
  const sessions = readCollection('sessions');
  const startDate = new Date(start);
  const weeklyData = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayBookings = bookings.filter(b => b.date === dateStr).map(b => {
      const session = sessions.find(s => s.bookingId === b.id);
      return { ...b, session: session || null };
    });
    weeklyData.push(dayBookings);
  }

  res.json(weeklyData);
});

app.get('/api/bookings', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Thiếu tham số ngày (date YYYY-MM-DD)' });
  }
  const bookings = readCollection('bookings');
  // Lọc các bản ghi đặt phòng trong ngày được chọn
  const dayBookings = bookings.filter(b => b.date === date);
  res.json(dayBookings);
});

app.post('/api/bookings', authenticateToken, (req, res) => {
  const { date, slotId, memberMssvs, scannedCards = {} } = req.body;
  
  // Student chỉ được đăng ký đại diện bằng MSSV của chính mình trong Token
  let representativeMssv = req.user.mssv;
  if (req.user.normalizedRole === 'manager' || req.user.normalizedRole === 'super_admin') {
    if (req.body.representativeMssv && String(req.body.representativeMssv).trim()) {
      representativeMssv = String(req.body.representativeMssv).trim();
    }
  }

  if (!date || !slotId || !representativeMssv || !memberMssvs || !Array.isArray(memberMssvs)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký (ngày, ca, người đại diện, danh sách MSSV)' });
  }

  // 1. POLICY: Booking Advance Window (Chỉ cho phép đặt trong vòng N ngày tới)
  const advanceDaysSetting = getSystemSetting('roomBookingAdvanceDays');
  const advanceDays = advanceDaysSetting !== undefined ? Number(advanceDaysSetting) : 14;
  if (advanceDays > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(today.getDate() + advanceDays);

    const [bYear, bMonth, bDay] = date.split('-').map(Number);
    const targetBookingDate = new Date(bYear, bMonth - 1, bDay);
    targetBookingDate.setHours(0, 0, 0, 0);

    if (targetBookingDate < today) {
      return res.status(400).json({ error: 'Không thể đăng ký phòng cho ngày trong quá khứ' });
    }
    if (targetBookingDate > maxBookingDate) {
      return res.status(400).json({ error: `Chỉ được phép đăng ký phòng trước tối đa ${advanceDays} ngày` });
    }
  }

  const bookings = readCollection('bookings');

  // 2. POLICY: Double Booking Check
  const isBooked = bookings.some(b => b.date === date && String(b.slotId) === String(slotId));
  if (isBooked) {
    return res.status(400).json({ error: 'Khung giờ này đã được đăng ký bởi nhóm khác' });
  }

  // 3. POLICY: Weekly Quota Check (Chỉ áp dụng cho Student / người đại diện, Manager/Admin được override nếu cần)
  const maxWeeklySetting = getSystemSetting('maxBookingSlotsPerWeek');
  const maxWeeklyQuota = maxWeeklySetting !== undefined ? Number(maxWeeklySetting) : 4;
  if (maxWeeklyQuota > 0 && req.user.normalizedRole === 'student') {
    const targetMonday = getMondayOfWeek(date);
    const currentWeekCount = bookings.filter(b => 
      b.representativeMssv === representativeMssv && getMondayOfWeek(b.date) === targetMonday
    ).length;

    if (currentWeekCount + 1 > maxWeeklyQuota) {
      return res.status(400).json({ error: `Bạn đã đạt giới hạn tối đa ${maxWeeklyQuota} ca đặt phòng trong tuần này` });
    }
  }

  // Xác thực các thành viên và người đại diện
  const members = readCollection('members');
  const users = readCollection('users');
  const findPerson = (mssv) => members.find(m => m.mssv === mssv) || users.find(u => u.mssv === mssv);

  const repUser = findPerson(representativeMssv);
  if (!repUser) {
    return res.status(404).json({ error: `Người đại diện với MSSV ${representativeMssv} không tồn tại trên hệ thống` });
  }

  // Đảm bảo người đại diện cũng có trong danh sách thành viên tham gia
  const allMssvs = Array.from(new Set([representativeMssv, ...memberMssvs]));

  const membersInfo = [];
  for (const mssv of allMssvs) {
    const person = findPerson(mssv);
    if (!person) {
      return res.status(404).json({ error: `Thành viên với MSSV ${mssv} không tồn tại trên hệ thống` });
    }
    membersInfo.push({ mssv: person.mssv, name: person.name });
  }

  const newBooking = {
    id: uuidv4(),
    date,
    slotId: String(slotId),
    representativeMssv,
    representativeName: repUser.name,
    participantsCount: membersInfo.length,
    members: membersInfo
  };

  bookings.push(newBooking);
  writeCollection('bookings', bookings);

  // Lưu lịch sử quét thẻ RFID (nếu có)
  for (const [mssv, cardId] of Object.entries(scannedCards)) {
    const person = findPerson(mssv);
    if (person && cardId) {
      const actionType = (mssv === representativeMssv) ? 'book_representative' : 'book_member';
      logRfidAction(cardId, person.mssv, person.name, actionType, 'room_booking', true);
    }
  }

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'room_booking',
    targetId: newBooking.id,
    newValue: {
      date: newBooking.date,
      slotId: newBooking.slotId,
      representativeMssv: newBooking.representativeMssv,
      representativeName: newBooking.representativeName,
      participantsCount: newBooking.participantsCount
    },
    success: true
  });

  res.status(201).json(newBooking);

  // Gửi thông báo cho Quản lý & các bên liên quan
  createNotification(
    'room_booking',
    'Lịch đăng ký phòng mới',
    `${repUser.name} (${repUser.mssv}) vừa đăng ký phòng vào ${date}, ca ${slotId}`,
    {
      bookingId: newBooking.id,
      date,
      slotId,
      mssv: repUser.mssv,
      representativeName: repUser.name,
      participantsCount: membersInfo.length,
      members: membersInfo
    }
  );
});

app.post('/api/bookings/bulk', authenticateToken, (req, res) => {
  const { slots, memberMssvs, purpose = 'Sử dụng chung', scannedCards = {} } = req.body;
  
  let representativeMssv = req.user.mssv;
  if (req.user.normalizedRole === 'manager' || req.user.normalizedRole === 'super_admin') {
    if (req.body.representativeMssv && String(req.body.representativeMssv).trim()) {
      representativeMssv = String(req.body.representativeMssv).trim();
    }
  }

  if (!slots || !Array.isArray(slots) || slots.length === 0 || !representativeMssv || !memberMssvs || !Array.isArray(memberMssvs)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký (danh sách buổi, người đại diện, danh sách MSSV)' });
  }

  const advanceDaysSetting = getSystemSetting('roomBookingAdvanceDays');
  const advanceDays = advanceDaysSetting !== undefined ? Number(advanceDaysSetting) : 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + advanceDays);

  const maxWeeklySetting = getSystemSetting('maxBookingSlotsPerWeek');
  const maxWeeklyQuota = maxWeeklySetting !== undefined ? Number(maxWeeklySetting) : 4;

  const bookings = readCollection('bookings');
  const members = readCollection('members');
  const users = readCollection('users');
  const findPerson = (mssv) => members.find(m => m.mssv === mssv) || users.find(u => u.mssv === mssv);

  const repUser = findPerson(representativeMssv);
  if (!repUser) {
    return res.status(404).json({ error: `Người đại diện với MSSV ${representativeMssv} không tồn tại trên hệ thống` });
  }

  const allMssvs = Array.from(new Set([representativeMssv, ...memberMssvs]));
  const membersInfo = [];
  for (const mssv of allMssvs) {
    const person = findPerson(mssv);
    if (!person) {
      return res.status(404).json({ error: `Thành viên với MSSV ${mssv} không tồn tại trên hệ thống` });
    }
    membersInfo.push({ mssv: person.mssv, name: person.name });
  }

  // Đếm số lượng booking đã có trong từng tuần của representative (dùng cho quota)
  const weeklyBookingCount = {};
  if (maxWeeklyQuota > 0 && req.user.normalizedRole === 'student') {
    bookings.forEach(b => {
      if (b.representativeMssv === representativeMssv) {
        const mon = getMondayOfWeek(b.date);
        weeklyBookingCount[mon] = (weeklyBookingCount[mon] || 0) + 1;
      }
    });
  }

  const newBookings = [];
  const failedSlots = [];

  for (const slot of slots) {
    const { date, slotId } = slot;

    // 1. Advance window check
    if (advanceDays > 0) {
      const [bYear, bMonth, bDay] = date.split('-').map(Number);
      const targetBookingDate = new Date(bYear, bMonth - 1, bDay);
      targetBookingDate.setHours(0, 0, 0, 0);

      if (targetBookingDate < today || targetBookingDate > maxBookingDate) {
        failedSlots.push({ date, slotId, reason: `Ngoài phạm vi cho phép (${advanceDays} ngày)` });
        continue;
      }
    }

    // 2. Double booking check
    const isBooked = bookings.some(b => b.date === date && String(b.slotId) === String(slotId));
    if (isBooked) {
      failedSlots.push({ date, slotId, reason: 'Trùng lịch' });
      continue;
    }

    // 3. Weekly quota check
    if (maxWeeklyQuota > 0 && req.user.normalizedRole === 'student') {
      const targetMonday = getMondayOfWeek(date);
      const currentCount = weeklyBookingCount[targetMonday] || 0;
      if (currentCount >= maxWeeklyQuota) {
        failedSlots.push({ date, slotId, reason: `Vượt quá hạn mức ${maxWeeklyQuota} ca/tuần` });
        continue;
      }
      weeklyBookingCount[targetMonday] = currentCount + 1;
    }

    const newBooking = {
      id: uuidv4(),
      date,
      slotId: String(slotId),
      representativeMssv,
      representativeName: repUser.name,
      purpose,
      participantsCount: membersInfo.length,
      members: membersInfo
    };

    bookings.push(newBooking);
    newBookings.push(newBooking);
  }

  if (newBookings.length > 0) {
    writeCollection('bookings', bookings);

    // Log RFID scan if applicable
    for (const [mssv, cardId] of Object.entries(scannedCards)) {
      const person = findPerson(mssv);
      if (person && cardId) {
        const actionType = (mssv === representativeMssv) ? 'book_representative' : 'book_member';
        logRfidAction(cardId, person.mssv, person.name, actionType, 'room_booking', true);
      }
    }

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'CREATE',
      targetType: 'room_booking_bulk',
      newValue: {
        bookedCount: newBookings.length,
        representativeMssv,
        representativeName: repUser.name,
        slots: newBookings.map(b => ({ date: b.date, slotId: b.slotId }))
      },
      metadata: {
        failedCount: failedSlots.length,
        purpose
      },
      success: true
    });

    // Gửi thông báo cho Quản lý & các bên liên quan (Bulk Notification)
    createNotification(
      'room_booking_bulk',
      'Đăng ký phòng (Nhiều buổi)',
      `${repUser.name} (${repUser.mssv}) vừa đăng ký ${newBookings.length} buổi phòng Lab`,
      {
        mssv: repUser.mssv,
        representativeName: repUser.name,
        participantsCount: membersInfo.length,
        members: membersInfo,
        slots: newBookings.map(b => ({ date: b.date, slotId: b.slotId }))
      }
    );
  }

  res.status(201).json({
    success: true,
    bookedCount: newBookings.length,
    failedCount: failedSlots.length,
    failedSlots
  });
});

app.post('/api/bookings/:id/cancel', authenticateToken, (req, res) => {
  const { id } = req.params;

  const bookings = readCollection('bookings');
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu đăng ký phòng' });
  }

  const booking = bookings[index];

  // Student chỉ có quyền hủy booking của chính mình; Manager/SuperAdmin có quyền hủy theo yêu cầu
  if (req.user.normalizedRole === 'student') {
    if (booking.representativeMssv !== req.user.mssv) {
      return res.status(403).json({ error: 'Chỉ người đại diện đăng ký phòng mới có quyền hủy lịch' });
    }

    // POLICY: Cancellation Deadline Enforcement
    const cancelDeadlineSetting = getSystemSetting('roomBookingCancelDeadlineHours');
    const cancelDeadlineHours = cancelDeadlineSetting !== undefined ? Number(cancelDeadlineSetting) : 2;

    if (cancelDeadlineHours > 0) {
      const slotStartTime = getSlotStartDateTime(booking.date, booking.slotId);
      const now = new Date();
      const diffHours = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < cancelDeadlineHours) {
        return res.status(400).json({ 
          error: `Không thể hủy đăng ký khi chỉ còn ít hơn ${cancelDeadlineHours} giờ trước giờ vào phòng hoặc ca trực đã diễn ra` 
        });
      }
    }
  }

  const deletedBooking = { ...booking };
  const filtered = bookings.filter(b => b.id !== id);
  writeCollection('bookings', filtered);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CANCEL',
    targetType: 'room_booking',
    targetId: id,
    oldValue: {
      date: deletedBooking.date,
      slotId: deletedBooking.slotId,
      representativeMssv: deletedBooking.representativeMssv,
      representativeName: deletedBooking.representativeName
    },
    success: true
  });

  res.json({ message: 'Hủy đăng ký mượn phòng thành công' });
});

app.post('/api/bookings/:id/checkout', (req, res) => {
  const { id } = req.params;
  const { consumables = [], issues = [], notes = '' } = req.body;

  const bookings = readCollection('bookings');
  const bookingIndex = bookings.findIndex(b => b.id === id);

  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy ca trực/đăng ký phòng' });
  }

  const booking = bookings[bookingIndex];
  
  if (booking.checkoutReport) {
    return res.status(400).json({ error: 'Ca trực này đã được báo cáo' });
  }

  const equipment = readCollection('equipment');
  const borrows = readCollection('borrows');
  const maintenance = readCollection('maintenance');

  const reportData = {
    reportedAt: new Date().toISOString(),
    notes,
    consumables: [],
    issues: []
  };

  // Process Consumables
  for (const item of consumables) {
    const eq = equipment.find(e => e.id === item.equipmentId);
    if (eq && eq.assetType === 'Linh kiện tiêu hao') {
      const qtyToDeduct = Number(item.qty) || 0;
      if (qtyToDeduct > 0) {
        eq.totalQty = Math.max(0, eq.totalQty - qtyToDeduct);
        
        // Record as "Đã tiêu hao"
        const newBorrow = {
          id: uuidv4(),
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentCode: eq.code,
          mssv: booking.representativeMssv,
          borrowerName: booking.representativeName,
          qty: qtyToDeduct,
          borrowDate: new Date().toISOString(),
          expectedReturnDate: null,
          initialCondition: 'Tốt',
          borrowNotes: 'Xuất dùng trong ca trực phòng Lab (Checkout)',
          returnDate: new Date().toISOString(),
          returnMssv: booking.representativeMssv,
          returnerName: booking.representativeName,
          finalCondition: 'Đã tiêu hao',
          returnNotes: 'Linh kiện tiêu hao xuất dùng trực tiếp (không thu hồi)',
          status: 'Đã tiêu hao',
          instanceIds: null,
          instanceSerials: null
        };
        borrows.push(newBorrow);

        reportData.consumables.push({
          equipmentId: eq.id,
          name: eq.name,
          qty: qtyToDeduct
        });
      }
    }
  }

  // Process Issues
  for (const issue of issues) {
    const eq = equipment.find(e => e.id === issue.equipmentId);
    if (eq && issue.issueDescription) {
      const newTicket = {
        id: uuidv4(),
        equipmentId: eq.id,
        equipmentName: eq.name,
        issueDescription: issue.issueDescription + ` (Báo cáo từ ca trực: ${booking.representativeName} - ${booking.date})`,
        status: 'Đang sửa',
        cost: 0,
        reportedDate: new Date().toISOString(),
        resolvedDate: null
      };
      maintenance.push(newTicket);

      reportData.issues.push({
        equipmentId: eq.id,
        name: eq.name,
        issueDescription: issue.issueDescription
      });
    }
  }

  // Save changes
  booking.checkoutReport = reportData;
  writeCollection('bookings', bookings);
  writeCollection('equipment', equipment);
  writeCollection('borrows', borrows);
  writeCollection('maintenance', maintenance);

  res.json({ message: 'Báo cáo ca trực thành công', report: reportData });
});

app.post('/api/bookings/rfid-access', (req, res) => {
  const { cardId, overrideDate, overrideSlotId } = req.body;
  if (!cardId) {
    return res.status(400).json({ error: 'Thiếu mã thẻ RFID' });
  }

  const rfidMapping = getRfidMapping();
  const mssv = rfidMapping[cardId];
  if (!mssv) {
    logRfidAction(cardId, null, null, 'room-access-denied', 'room_booking', false);
    return res.status(404).json({ error: 'Thẻ RFID không được đăng ký trong hệ thống' });
  }

  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (id) => members.find(m => m.mssv === id) || users.find(u => u.mssv === id);
  const person = findPerson(mssv);

  if (!person) {
    return res.status(404).json({ error: 'Mã số sinh viên không tồn tại' });
  }

  const bookings = readCollection('bookings');

  // Xác định ngày và slot hiện tại (có hỗ trợ override để mô phỏng test dễ hơn)
  const now = new Date();
  const today = overrideDate || now.toISOString().split('T')[0];

  let currentSlotId = overrideSlotId;
  if (!currentSlotId) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeToMins = (timeStr, fallback) => {
      try {
        const parts = (timeStr || fallback).split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      } catch (e) {
        const parts = fallback.split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      }
    };

    const slotsConfig = [
      { id: 'morning_1', start: timeToMins(getSystemSetting('slot_morning_1_start'), '07:00'), end: timeToMins(getSystemSetting('slot_morning_1_end'), '09:00') },
      { id: 'morning_2', start: timeToMins(getSystemSetting('slot_morning_2_start'), '09:00'), end: timeToMins(getSystemSetting('slot_morning_2_end'), '11:00') },
      { id: 'afternoon_1', start: timeToMins(getSystemSetting('slot_afternoon_1_start'), '12:00'), end: timeToMins(getSystemSetting('slot_afternoon_1_end'), '14:00') },
      { id: 'afternoon_2', start: timeToMins(getSystemSetting('slot_afternoon_2_start'), '14:00'), end: timeToMins(getSystemSetting('slot_afternoon_2_end'), '16:00') },
      { id: 'evening_1', start: timeToMins(getSystemSetting('slot_evening_1_start'), '16:00'), end: timeToMins(getSystemSetting('slot_evening_1_end'), '18:00') },
      { id: 'evening_2', start: timeToMins(getSystemSetting('slot_evening_2_start'), '18:00'), end: timeToMins(getSystemSetting('slot_evening_2_end'), '20:00') }
    ];

    const matchingSlot = slotsConfig.find(s => currentMinutes >= s.start && currentMinutes < s.end);
    if (matchingSlot) {
      currentSlotId = matchingSlot.id;
    }
  }

  if (!currentSlotId) {
    return res.status(400).json({ error: 'Ngoài giờ hoạt động của phòng học, không thể check-in/out' });
  }

  const bookingIndex = bookings.findIndex(b => b.date === today && String(b.slotId) === String(currentSlotId));

  if (bookingIndex === -1) {
    logRfidAction(cardId, mssv, person.name, 'room-access-denied', 'room_booking', false);
    return res.status(403).json({ error: `Phòng đang đóng cửa trong khung giờ này (${currentSlotId})` });
  }

  const booking = bookings[bookingIndex];
  const isRegistered = (booking.representativeMssv === mssv || (booking.members && booking.members.some(m => m.mssv === mssv)));

  // Lấy hoặc tạo Session
  const sessions = readCollection('sessions');
  let session = sessions.find(s => s.date === today && s.slotId === currentSlotId);
  if (!session) {
    session = {
      id: uuidv4(),
      date: today,
      slotId: currentSlotId,
      bookingId: booking.id,
      attendees: []
    };
    sessions.push(session);
  }

  // Tìm người dùng trong session
  const { activity } = req.body; // Lấy từ Kiosk
  const attendeeIndex = session.attendees.findIndex(a => a.mssv === mssv && !a.checkOutAt);

  if (attendeeIndex === -1) {
    // CHECK-IN
    session.attendees.push({
      mssv,
      name: person.name,
      type: isRegistered ? 'registered' : 'walk-in',
      checkInAt: now.toISOString(),
      checkOutAt: null,
      activity: activity || 'Sử dụng Lab'
    });

    // Nếu người đại diện check-in, mở phòng (giữ logic cũ để app không lỗi)
    if (!booking.checkedIn && booking.representativeMssv === mssv) {
      booking.checkedIn = true;
      booking.checkedInAt = now.toISOString();
      booking.checkedInBy = mssv;
      booking.checkedInByName = person.name;
    }

    person.active = true;
    writeCollection('users', users);
    writeCollection('members', members);
    writeCollection('bookings', bookings);
    writeCollection('sessions', sessions);
    logRfidAction(cardId, mssv, person.name, 'room-checkin', 'room_booking', true);

    return res.json({
      message: `Check-in thành công! Chào mừng ${person.name} (${isRegistered ? 'Đã đăng ký' : 'Vãng lai'})`,
      action: 'check-in',
      booking
    });

  } else {
    // CHECK-OUT
    const attendee = session.attendees[attendeeIndex];
    const checkedInTime = new Date(attendee.checkInAt);
    const diffMs = now - checkedInTime;
    const cooldownSec = getSystemSetting('rfidScanCooldownSeconds') || 5;
    const cooldownMs = cooldownSec * 1000;

    if (diffMs < cooldownMs) {
      return res.status(400).json({ error: `Vui lòng đợi ít nhất ${cooldownSec} giây trước khi check-out (Chống quét nhầm)` });
    }

    attendee.checkOutAt = now.toISOString();

    // Nếu người đại diện check-out, đóng phòng (logic cũ)
    if (booking.representativeMssv === mssv) {
      booking.checkedOut = true;
      booking.checkedOutAt = now.toISOString();
    }

    person.active = false;
    writeCollection('users', users);
    writeCollection('members', members);
    writeCollection('bookings', bookings);
    writeCollection('sessions', sessions);
    logRfidAction(cardId, mssv, person.name, 'room-checkout', 'room_booking', true);

    return res.json({ message: `Trả phòng thành công. Tạm biệt ${person.name}!`, action: 'check-out', booking });
  }
});

app.post('/api/bookings/cancel-all', (req, res) => {
  writeCollection('bookings', []);
  res.json({ message: 'Đã hủy toàn bộ lịch đặt phòng thành công' });
});
// ==========================================
// API ANALYTICS & SESSIONS (Thống kê & Phiên)
// ==========================================

app.get('/api/analytics/equipment', (req, res) => {
  const equipment = readCollection('equipment');
  const borrows = readCollection('borrows');
  let analytics = [];
  const defaultLifespan = getSystemSetting('defaultLifespanHours') || 10000;
  const warningPercent = getSystemSetting('maintenanceWarningPercent') || 20;

  // Tính tổng giờ mượn tích lũy all-time từ toàn bộ lịch sử phiếu mượn
  const allTimeBorrowHoursByEquip = {};
  const allTimeBorrowHoursByInst = {};

  borrows.forEach(b => {
    if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return;
    if (!b.borrowDate || !b.equipmentId) return;
    const bDate = new Date(b.borrowDate);
    const now = new Date();
    const rDate = b.returnDate ? new Date(b.returnDate) : now;
    const hours = Math.max(0, (rDate - bDate) / 3600000) * (Number(b.qty) || 1);

    allTimeBorrowHoursByEquip[b.equipmentId] = (allTimeBorrowHoursByEquip[b.equipmentId] || 0) + hours;

    if (b.instanceIds && Array.isArray(b.instanceIds)) {
      b.instanceIds.forEach(instId => {
        allTimeBorrowHoursByInst[instId] = (allTimeBorrowHoursByInst[instId] || 0) + (hours / b.instanceIds.length);
      });
    }
  });

  equipment.forEach(eq => {
    const eqAllTimeUsed = allTimeBorrowHoursByEquip[eq.id] || 0;

    if (eq.assetType === 'Thiết bị' && eq.instances && eq.instances.length > 0) {
      eq.instances.forEach(inst => {
        const lifespan = inst.lifespanHours || eq.lifespanHours || defaultLifespan;
        const used = Math.max(Number(inst.usedHours) || 0, allTimeBorrowHoursByInst[inst.id] || (eq.totalQty > 0 ? eqAllTimeUsed / eq.totalQty : 0));
        const healthPercent = Math.max(0, 100 - (used / lifespan) * 100);

        let status = 'Tốt';
        if (healthPercent <= 0) status = 'Quá hạn';
        else if (healthPercent <= warningPercent) status = 'Cần bảo trì';

        analytics.push({
          id: inst.id,
          equipmentId: eq.id,
          name: eq.name,
          code: inst.serialNumber,
          category: eq.category,
          location: eq.location,
          totalQty: 1,
          borrowedQty: inst.status === 'Đang mượn' ? 1 : 0,
          usedHours: Number(used.toFixed(1)),
          lifespanHours: lifespan,
          healthPercent: healthPercent.toFixed(1),
          lifespanStatus: status
        });
      });
    } else {
      const lifespan = eq.lifespanHours || defaultLifespan;
      const instTotal = (eq.instances || []).reduce((sum, i) => sum + (Number(i.usedHours) || 0), 0);
      const used = Math.max(Number(eq.usedHours) || 0, instTotal, eqAllTimeUsed);
      const healthPercent = Math.max(0, 100 - (used / lifespan) * 100);

      let status = 'Tốt';
      if (healthPercent <= 0) status = 'Quá hạn';
      else if (healthPercent <= warningPercent) status = 'Cần bảo trì';

      analytics.push({
        ...eq,
        usedHours: Number(used.toFixed(1)),
        lifespanHours: lifespan,
        healthPercent: healthPercent.toFixed(1),
        lifespanStatus: status
      });
    }
  });

  res.json(analytics);
});

app.get('/api/sessions/calendar', (req, res) => {
  const bookings = readCollection('bookings');
  const sessions = readCollection('sessions');

  // Gộp thông tin từ bookings và sessions
  const calendarData = bookings.map(b => {
    const session = sessions.find(s => s.bookingId === b.id);
    return {
      ...b,
      session: session || null
    };
  });

  res.json(calendarData);
});

// ==========================================
// API BÁO CÁO TỔNG HỢP (REPORTS)
// ==========================================

app.get('/api/reports/comprehensive', (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start) : new Date(0);
  const endDate = end ? new Date(end) : new Date();

  // To keep dates inclusive if user passes YYYY-MM-DD
  if (end && !end.includes('T')) endDate.setHours(23, 59, 59, 999);

  const sessions = readCollection('sessions');
  const borrows = readCollection('borrows');
  const equipment = readCollection('equipment');
  const allBookings = readCollection('bookings');

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d >= startDate && d <= endDate;
  });

  // Calculate Room Usage
  let totalRoomHours = 0;
  let totalAttendees = 0;
  let walkInCount = 0;
  const slotCount = {};

  filteredSessions.forEach(session => {
    let minCheckIn = null;
    let maxCheckOut = null;

    session.attendees.forEach(a => {
      const cIn = new Date(a.checkInAt);
      const cOut = a.checkOutAt ? new Date(a.checkOutAt) : new Date(cIn.getTime() + 3.5 * 3600000); // default 3.5h if no checkout

      if (!minCheckIn || cIn < minCheckIn) minCheckIn = cIn;
      if (!maxCheckOut || cOut > maxCheckOut) maxCheckOut = cOut;

      totalAttendees++;
      if (a.type === 'walk-in') walkInCount++;
    });

    if (minCheckIn && maxCheckOut) {
      const hours = (maxCheckOut - minCheckIn) / 3600000;
      totalRoomHours += Math.min(hours, 4); // Capping at 4 hours per slot
    }

    slotCount[session.slotId] = (slotCount[session.slotId] || 0) + 1;
  });

  const avgPeoplePerSession = filteredSessions.length ? (totalAttendees / filteredSessions.length).toFixed(1) : 0;

  let peakSlotId = null;
  let maxS = 0;
  Object.keys(slotCount).forEach(k => {
    if (slotCount[k] > maxS) {
      maxS = slotCount[k];
      peakSlotId = k;
    }
  });

  const SESSIONS_DATA = [
    { key: 'morning', label: 'Sáng', slots: [
      { id: 'morning_1', label: `${getSystemSetting('slot_morning_1_start') || '07:00'} – ${getSystemSetting('slot_morning_1_end') || '09:00'}` },
      { id: 'morning_2', label: `${getSystemSetting('slot_morning_2_start') || '09:00'} – ${getSystemSetting('slot_morning_2_end') || '11:00'}` }
    ] },
    { key: 'afternoon', label: 'Chiều', slots: [
      { id: 'afternoon_1', label: `${getSystemSetting('slot_afternoon_1_start') || '12:00'} – ${getSystemSetting('slot_afternoon_1_end') || '14:00'}` },
      { id: 'afternoon_2', label: `${getSystemSetting('slot_afternoon_2_start') || '14:00'} – ${getSystemSetting('slot_afternoon_2_end') || '16:00'}` }
    ] },
    { key: 'evening', label: 'Tối', slots: [
      { id: 'evening_1', label: `${getSystemSetting('slot_evening_1_start') || '16:00'} – ${getSystemSetting('slot_evening_1_end') || '18:00'}` },
      { id: 'evening_2', label: `${getSystemSetting('slot_evening_2_start') || '18:00'} – ${getSystemSetting('slot_evening_2_end') || '20:00'}` }
    ] },
  ];

  let peakSlotLabel = 'Chưa có';
  if (peakSlotId) {
    for (const session of SESSIONS_DATA) {
      const found = session.slots.find(s => s.id === peakSlotId);
      if (found) {
        peakSlotLabel = `${session.label} (${found.label})`;
        break;
      }
    }
  }

  // Tính tổng giờ mượn tích lũy all-time từ toàn bộ lịch sử phiếu mượn
  const allTimeBorrowHoursByEquip = {};
  const allTimeBorrowHoursByInst = {};
  borrows.forEach(b => {
    if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return;
    if (!b.borrowDate || !b.equipmentId) return;
    const bDate = new Date(b.borrowDate);
    const now = new Date();
    const rDate = b.returnDate ? new Date(b.returnDate) : now;
    const hours = Math.max(0, (rDate - bDate) / 3600000) * (Number(b.qty) || 1);
    allTimeBorrowHoursByEquip[b.equipmentId] = (allTimeBorrowHoursByEquip[b.equipmentId] || 0) + hours;

    if (b.instanceIds && Array.isArray(b.instanceIds)) {
      b.instanceIds.forEach(instId => {
        allTimeBorrowHoursByInst[instId] = (allTimeBorrowHoursByInst[instId] || 0) + (hours / b.instanceIds.length);
      });
    }
  });

  // Calculate Equipment Usage & Depreciation IN THIS PERIOD
  const filteredBorrows = borrows.filter(b => {
    if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return false;
    if (!b.borrowDate) return false;
    const d = new Date(b.borrowDate);
    return d >= startDate && d <= endDate;
  });

  const defaultLifespan = getSystemSetting('defaultLifespanHours') || 10000;

  const eqStats = {};
  equipment.forEach(e => {
    const lifespan = e.lifespanHours || defaultLifespan;
    const isConsumable = e.assetType === 'Linh kiện tiêu hao' || e.assetType === 'Vật tư tiêu hao';
    const totalQty = Math.max(e.totalQty || 0, (e.instances || []).length, 1);

    // Tính tổng giờ mượn tích lũy của thiết bị này từ toàn bộ lịch sử
    const equipAllTimeHours = allTimeBorrowHoursByEquip[e.id] || Number(e.usedHours) || 0;

    let totalInstUsed = 0;
    const rawInstances = e.instances || [];

    // Tạo danh sách máy con / đơn vị cá thể cho mọi thiết bị
    let workingInstances = rawInstances;
    if (rawInstances.length === 0) {
      const perInst = totalQty > 0 ? (equipAllTimeHours / totalQty) : 0;
      workingInstances = Array.from({ length: totalQty }, (_, idx) => ({
        id: `auto-${e.id}-${idx + 1}`,
        serialNumber: `${e.code}-${String(idx + 1).padStart(2, '0')}`,
        status: e.status || 'Sẵn sàng',
        usedHours: Number(perInst.toFixed(1)),
        lifespanHours: lifespan
      }));
    }

    const processedInstances = workingInstances.map((inst, idx) => {
      const instLifespan = inst.lifespanHours || lifespan;
      // Giờ của từng máy con: lấy từ borrow cụ thể của máy đó, hoặc inst.usedHours, hoặc phân bổ đều
      let instHours = 0;
      if (allTimeBorrowHoursByInst[inst.id] !== undefined) {
        instHours = allTimeBorrowHoursByInst[inst.id];
      } else if (Number(inst.usedHours) > 0) {
        instHours = Number(inst.usedHours);
      } else if (equipAllTimeHours > 0 && totalQty > 0) {
        instHours = equipAllTimeHours / totalQty;
      }
      totalInstUsed += instHours;

      return {
        ...inst,
        usedHours: Number(instHours.toFixed(1)),
        lifespanHours: instLifespan
      };
    });

    // Tổng thời gian đã dùng của thiết bị cha = TỔNG CỘNG của tất cả máy con (hoặc all-time borrow hours)
    const totalUsedHours = totalInstUsed > 0 ? totalInstUsed : equipAllTimeHours;

    // Tổng định mức vòng đời cả lô (tổng số máy * tuổi thọ 1 máy)
    const totalBatchLifespan = totalQty * lifespan;
    const batchDepreciation = totalBatchLifespan > 0 ? Number(((totalUsedHours / totalBatchLifespan) * 100).toFixed(1)) : 0;

    eqStats[e.id] = {
      id: e.id,
      name: e.name,
      code: e.code,
      category: e.category,
      assetType: e.assetType,
      unit: e.unit,
      totalQty: e.totalQty,
      borrowedQty: e.borrowedQty,
      minThreshold: e.minThreshold,
      lifespanHours: lifespan,
      totalBatchLifespan: totalBatchLifespan,
      totalUsedHours: Number(totalUsedHours.toFixed(1)),
      periodBorrowCount: 0,
      periodUsedHours: 0,
      instances: processedInstances,
      depreciationPercent: batchDepreciation
    };
  });

  filteredBorrows.forEach(b => {
    if (eqStats[b.equipmentId]) {
      eqStats[b.equipmentId].periodBorrowCount += (Number(b.qty) || 1);
      const bDate = new Date(b.borrowDate);
      const now = new Date();
      // Nếu chưa trả, lấy thời điểm hiện tại hoặc endDate (nếu endDate ở quá khứ)
      const effectiveEndDate = now < endDate ? now : endDate;
      const rDate = b.returnDate ? new Date(b.returnDate) : effectiveEndDate;
      const hours = (rDate - bDate) / 3600000;
      eqStats[b.equipmentId].periodUsedHours += (hours > 0 ? hours * (Number(b.qty) || 1) : 0);
    }
  });

  const equipmentReport = Object.values(eqStats).map(e => ({
    ...e,
    periodUsedHours: Number(e.periodUsedHours.toFixed(1)),
    totalUsedHours: Number(e.totalUsedHours.toFixed(1)),
    depreciationPercent: e.totalBatchLifespan ? Number(((e.totalUsedHours / e.totalBatchLifespan) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.periodBorrowCount - a.periodBorrowCount);

  // Calculate borrow stats
  const borrowStats = {
    total: filteredBorrows.length,
    returned: 0,
    active: 0,
    overdue: 0
  };

  const today = new Date();
  filteredBorrows.forEach(b => {
    if (b.status === 'Đã trả') {
      borrowStats.returned++;
    } else {
      borrowStats.active++;
      const returnDateObj = new Date(b.expectedReturnDate);
      if (today > returnDateObj) {
        borrowStats.overdue++;
      }
    }
  });

  res.json({
    roomStats: {
      totalHours: totalRoomHours.toFixed(1),
      totalSessions: filteredSessions.length,
      totalAttendees,
      walkInCount,
      avgPeoplePerSession,
      peakSlot: peakSlotLabel
    },
    equipmentStats: equipmentReport,
    borrowStats
  });
});

// ==========================================
// API THÔNG BÁO (NOTIFICATIONS) & REALTIME SSE STREAM
// ==========================================

// SSE Endpoint: Realtime stream thông báo cho client (hỗ trợ Header hoặc Query Token cho EventSource)
app.get('/api/notifications/stream', (req, res) => {
  // Lấy token từ header Authorization hoặc query param (dành cho EventSource)
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Yêu cầu mã xác thực (Token missing)' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const user = {
      ...decoded,
      normalizedRole: normalizeRole(decoded.role)
    };

    // Đăng ký client vào SSE Connection Manager
    registerClient({ user, res, req });
  });
});

app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifications = readCollection('notifications');
  if (req.user.normalizedRole === 'manager' || req.user.normalizedRole === 'super_admin') {
    return res.json(notifications);
  }
  // Đối với sinh viên, lọc thông báo liên quan đến MSSV hoặc thông báo chung
  const studentNotifs = notifications.filter(n => {
    if (!n.details) return true; // Thông báo chung
    if (n.details.mssv && n.details.mssv === req.user.mssv) return true;
    if (n.details.members && Array.isArray(n.details.members)) {
      return n.details.members.some(m => (typeof m === 'string' ? m : m.mssv) === req.user.mssv);
    }
    return !n.details.mssv; // Broadcast
  });
  res.json(studentNotifs);
});

app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const { id } = req.params;
  const notifications = readCollection('notifications');
  const index = notifications.findIndex(n => n.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thông báo' });
  }

  const notif = notifications[index];

  // Student chỉ có quyền đánh dấu đã đọc thông báo của chính mình hoặc thông báo chung
  if (req.user.normalizedRole === 'student') {
    if (notif.details && notif.details.mssv && notif.details.mssv !== req.user.mssv) {
      return res.status(403).json({ error: 'Bạn không có quyền thao tác trên thông báo của người khác' });
    }
  }

  notifications[index].read = true;
  writeCollection('notifications', notifications);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'MARK_READ',
    targetType: 'notification',
    targetId: id,
    newValue: { read: true },
    metadata: {
      title: notif.title,
      type: notif.type
    },
    success: true
  });

  res.json({ success: true });
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
  const notifications = readCollection('notifications');
  let count = 0;

  if (req.user.normalizedRole === 'student') {
    notifications.forEach(n => {
      const isMine = !n.details || !n.details.mssv || n.details.mssv === req.user.mssv;
      if (isMine && !n.read) {
        n.read = true;
        count++;
      }
    });
  } else {
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
  }

  writeCollection('notifications', notifications);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'MARK_ALL_READ',
    targetType: 'notification',
    targetId: 'batch',
    newValue: { read: true, updatedCount: count },
    success: true
  });

  res.json({ success: true, count });
});

// Phân quyền & Đăng nhập (Hỗ trợ identifier: MSSV / Username / Email hoặc Mật khẩu Quản trị chung)
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mật khẩu' });
  }

  const trimmedPassword = password.trim();
  const users = readCollection('users', []);

  // 1. Trường hợp có Identifier (MSSV, Username hoặc Email)
  if (identifier && typeof identifier === 'string' && identifier.trim()) {
    const cleanId = identifier.trim().toLowerCase();
    const user = users.find(u => 
      (u.mssv && u.mssv.toLowerCase() === cleanId) ||
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId)
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, error: 'Tài khoản đã bị khóa hoặc tạm dừng' });
    }

    let isPasswordValid = false;
    if (user.passwordHash) {
      isPasswordValid = await bcrypt.compare(trimmedPassword, user.passwordHash);
    } else {
      // Fallback nếu tài khoản chưa có hash cá nhân: so khớp mật khẩu admin hệ thống
      const currentAdminPass = getSystemSetting('adminPassword') || 'admin123';
      isPasswordValid = (trimmedPassword === currentAdminPass);
    }

    if (isPasswordValid) {
      const isManagerRole = ['admin', 'quản lý', 'chủ nhiệm', 'trưởng ban kỹ thuật'].includes(String(user.role).toLowerCase());
      const role = isManagerRole ? 'admin' : 'student';
      
      const payload = {
        id: user.id,
        mssv: user.mssv,
        name: user.name,
        role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.json({
        success: true,
        token,
        user: payload,
        message: 'Đăng nhập thành công'
      });
    } else {
      return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }
  }

  // 2. Trường hợp Đăng nhập Quản lý bằng Mật khẩu Admin chung (Backward compatibility)
  const currentAdminPass = getSystemSetting('adminPassword') || 'admin123';
  let isMatch = false;

  if (currentAdminPass.startsWith('$2a$') || currentAdminPass.startsWith('$2b$')) {
    isMatch = await bcrypt.compare(trimmedPassword, currentAdminPass);
  } else {
    isMatch = (trimmedPassword === currentAdminPass);
  }

  if (isMatch) {
    const payload = {
      id: 'admin-root',
      mssv: 'ADMIN',
      name: 'Quản trị viên Lab',
      role: 'admin'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      token,
      user: payload,
      message: 'Đăng nhập Quản lý thành công'
    });
  } else {
    return res.status(401).json({ success: false, error: 'Mật khẩu quản lý không chính xác' });
  }
});

// Endpoint xác thực danh tính người dùng hiện tại (Test JWT Authentication)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==========================================
// API SYSTEM SETTINGS (Cài đặt hệ thống chung)
// ==========================================

app.get('/api/settings', (req, res) => {
  const settingsList = readCollection('settings', []);
  const settingsObj = { ...DEFAULT_SETTINGS };
  settingsList.forEach(s => {
    if (s.key && s.value !== undefined) {
      if (typeof DEFAULT_SETTINGS[s.key] === 'number') {
        const n = Number(s.value);
        settingsObj[s.key] = isNaN(n) ? DEFAULT_SETTINGS[s.key] : n;
      } else {
        settingsObj[s.key] = String(s.value);
      }
    }
  });
  // Bảo mật: Không trả adminPassword ra client
  delete settingsObj.adminPassword;
  res.json(settingsObj);
});

app.put('/api/settings', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Dữ liệu cấu hình không hợp lệ' });
  }

  let settingsList = readCollection('settings', []);
  const validKeys = Object.keys(DEFAULT_SETTINGS);

  const changedOld = {};
  const changedNew = {};

  validKeys.forEach(key => {
    if (updates[key] !== undefined) {
      let val = updates[key];
      const prevEntry = settingsList.find(s => s.key === key);
      const prevVal = prevEntry ? prevEntry.value : DEFAULT_SETTINGS[key];

      // Nếu là adminPassword và rỗng hoặc chỉ có khoảng trắng thì bỏ qua không ghi đè
      if (key === 'adminPassword') {
        if (typeof val !== 'string' || !val.trim()) {
          return;
        }
        val = bcrypt.hashSync(val.trim(), 10);
        changedOld[key] = '[REDACTED]';
        changedNew[key] = '[REDACTED]';
      } else if (typeof DEFAULT_SETTINGS[key] === 'number') {
        const num = Number(val);
        val = isNaN(num) ? String(DEFAULT_SETTINGS[key]) : String(num);
        if (String(prevVal) !== String(val)) {
          changedOld[key] = prevVal;
          changedNew[key] = val;
        }
      } else {
        val = String(val).trim();
        if (String(prevVal) !== String(val)) {
          changedOld[key] = prevVal;
          changedNew[key] = val;
        }
      }

      const idx = settingsList.findIndex(s => s.key === key);
      if (idx !== -1) {
        settingsList[idx].value = val;
      } else {
        settingsList.push({ key, value: val });
      }
    }
  });

  writeCollection('settings', settingsList);

  const settingsObj = { ...DEFAULT_SETTINGS };
  settingsList.forEach(s => {
    if (s.key && s.value !== undefined) {
      if (typeof DEFAULT_SETTINGS[s.key] === 'number') {
        const n = Number(s.value);
        settingsObj[s.key] = isNaN(n) ? DEFAULT_SETTINGS[s.key] : n;
      } else {
        settingsObj[s.key] = String(s.value);
      }
    }
  });

  // Bảo mật: Không trả adminPassword ra client
  delete settingsObj.adminPassword;

  // Cập nhật lại lịch trình Auto Backup nếu có thay đổi cài đặt
  scheduleAutoBackup(getSystemSetting);

  // Ghi nhận Audit Log cho thay đổi cài đặt hệ thống
  if (Object.keys(changedNew).length > 0) {
    logAuditEvent(req, {
      action: 'SETTINGS_CHANGE',
      targetType: 'system_settings',
      targetId: 'global',
      oldValue: changedOld,
      newValue: changedNew,
      success: true
    });
  }

  res.json({ message: 'Cập nhật cài đặt hệ thống thành công', settings: settingsObj });
});

// ==========================================
// API BACKUP & RESTORE (QUẢN TRỊ SAO LƯU SQLITE - SUPER_ADMIN ONLY)
// ==========================================

// Danh sách các bản backup
app.get('/api/backups', authenticateToken, authorizeRoles('super_admin'), (req, res) => {
  try {
    const backups = listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách bản sao lưu' });
  }
});

// Tạo bản backup mới
app.post('/api/backups', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const backup = await createBackup('manual');

    // Ghi nhận Audit Log
    logAuditEvent(req, {
      action: 'BACKUP',
      targetType: 'sqlite_database',
      targetId: backup.filename,
      metadata: {
        filename: backup.filename,
        size: backup.size,
        type: 'manual'
      },
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'Tạo bản sao lưu thành công',
      backup
    });
  } catch (err) {
    console.error('Backup creation error:', err);
    logAuditEvent(req, {
      action: 'BACKUP',
      targetType: 'sqlite_database',
      success: false,
      metadata: { error: err.message }
    });
    res.status(500).json({ error: 'Tạo bản sao lưu thất bại' });
  }
});

// Khôi phục database từ file backup
app.post('/api/backups/:filename/restore', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const { filename } = req.params;
  try {
    const result = await restoreBackup(filename);

    // Ghi nhận Audit Log sau khi restore thành công
    logAuditEvent(req, {
      action: 'RESTORE',
      targetType: 'sqlite_database',
      targetId: filename,
      metadata: {
        restoredFrom: filename,
        safetyBackup: result.safetyBackup
      },
      success: true
    });

    res.json({
      success: true,
      message: 'Khôi phục cơ sở dữ liệu thành công',
      ...result
    });
  } catch (err) {
    console.error('Restore error:', err);
    logAuditEvent(req, {
      action: 'RESTORE',
      targetType: 'sqlite_database',
      targetId: filename,
      success: false,
      metadata: { error: err.message }
    });
    res.status(400).json({ error: err.message || 'Khôi phục cơ sở dữ liệu thất bại' });
  }
});

// ==========================================
// API AUDIT LOGS (Nhật ký kiểm toán hệ thống - RBAC: Manager & Super Admin)
// ==========================================

const MANAGER_ALLOWED_TARGET_TYPES = [
  'equipment',
  'equipment_catalog',
  'category',
  'component',
  'borrow_ticket',
  'reserve_ticket',
  'maintenance_ticket',
  'room_booking',
  'room_booking_bulk',
  'schedule_shift',
  'attendance_record',
  'rfid_card',
  'notification',
  'user',
  'user_points'
];

app.get('/api/audit-logs', authenticateToken, authorizeRoles('manager', 'super_admin'), async (req, res) => {
  try {
    const {
      action,
      targetType,
      actorUserId,
      actorRole,
      dateFrom,
      dateTo,
      success,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    // 1. RBAC Scoping: Manager chỉ xem được các nhóm nghiệp vụ được phép, Super Admin xem toàn bộ
    if (req.user.normalizedRole === 'manager') {
      if (targetType) {
        if (!MANAGER_ALLOWED_TARGET_TYPES.includes(targetType)) {
          return res.status(403).json({ error: 'Bạn không có quyền truy cập nhật ký kiểm toán cho phân hệ này' });
        }
        where.targetType = targetType;
      } else {
        where.targetType = { [Op.in]: MANAGER_ALLOWED_TARGET_TYPES };
      }
    } else if (targetType) {
      where.targetType = targetType;
    }

    // 2. Filters
    if (action) {
      where.action = action;
    }
    if (actorUserId) {
      where.actorUserId = actorUserId;
    }
    if (actorRole) {
      where.actorRole = actorRole;
    }
    if (success !== undefined && success !== '') {
      where.success = (success === 'true' || success === true || success === '1' || success === 1);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = String(dateFrom);
      }
      if (dateTo) {
        // Nếu dateTo là định dạng ngày YYYY-MM-DD, thêm cuối ngày
        const toVal = String(dateTo).length === 10 ? `${dateTo}T23:59:59.999Z` : String(dateTo);
        where.createdAt[Op.lte] = toVal;
      }
    }

    // 3. Search (actorName, actorMssv, targetId)
    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { actorName: { [Op.like]: q } },
        { actorMssv: { [Op.like]: q } },
        { targetId: { [Op.like]: q } }
      ];
    }

    // 4. Pagination
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100; // Giới hạn clamp max 100

    const offset = (page - 1) * limit;

    // 5. Sorting Whitelist
    const ALLOWED_SORT_FIELDS = ['createdAt', 'action', 'targetType', 'actorName', 'actorRole'];
    const validSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 6. DB Query
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [[validSortBy, validSortOrder]]
    });

    // 7. Format & Response Sanitization
    const data = rows.map(r => {
      const plain = r.get({ plain: true });

      // Parse JSON strings back to objects if needed
      ['oldValue', 'newValue', 'metadata'].forEach(key => {
        if (typeof plain[key] === 'string') {
          try {
            plain[key] = JSON.parse(plain[key]);
          } catch (e) {}
        }
      });

      // Bắt buộc sanitize trước khi trả ra client
      return sanitizeData(plain);
    });

    res.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1
      }
    });
  } catch (err) {
    console.error('Lỗi khi truy vấn Audit Logs:', err);
    res.status(500).json({ error: 'Không thể tải nhật ký kiểm toán hệ thống' });
  }
});

// ==========================================
// API CATALOG (Danh mục gốc thiết bị)
// ==========================================

app.get('/api/settings/catalog', (req, res) => {
  res.json(readCollection('equipment_catalog'));
});

app.post('/api/settings/catalog', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { name, codePrefix, category, assetType, unit, lifespanHours, description } = req.body;
  if (!name || !codePrefix) {
    return res.status(400).json({ error: 'Vui lòng điền đủ Tên và Mã thiết bị (Prefix)' });
  }

  const catalog = readCollection('equipment_catalog');
  if (catalog.some(c => c.codePrefix.toLowerCase() === codePrefix.toLowerCase())) {
    return res.status(400).json({ error: 'Mã thiết bị này đã tồn tại trong Danh mục gốc' });
  }

  const newItem = {
    id: uuidv4(),
    name,
    codePrefix,
    category: category || 'Khác',
    assetType: assetType || 'Thiết bị',
    unit: unit || 'Cái',
    lifespanHours: lifespanHours ? Number(lifespanHours) : 10000,
    description: description || ''
  };

  catalog.push(newItem);
  writeCollection('equipment_catalog', catalog);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'equipment_catalog',
    targetId: newItem.id,
    newValue: newItem,
    success: true
  });

  res.status(201).json(newItem);
});

app.put('/api/settings/catalog/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { name, codePrefix, category, assetType, unit, lifespanHours, description } = req.body;
  
  const catalog = readCollection('equipment_catalog');
  const index = catalog.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy mục trong Danh mục gốc' });
  }

  const oldItem = { ...catalog[index] };

  catalog[index] = {
    ...catalog[index],
    name: name || catalog[index].name,
    codePrefix: codePrefix || catalog[index].codePrefix,
    category: category || catalog[index].category,
    assetType: assetType || catalog[index].assetType,
    unit: unit || catalog[index].unit,
    lifespanHours: lifespanHours ? Number(lifespanHours) : catalog[index].lifespanHours,
    description: description !== undefined ? description : catalog[index].description
  };

  writeCollection('equipment_catalog', catalog);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'equipment_catalog',
    targetId: id,
    oldValue: oldItem,
    newValue: catalog[index],
    success: true
  });

  res.json(catalog[index]);
});

app.delete('/api/settings/catalog/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  let catalog = readCollection('equipment_catalog');
  const index = catalog.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy mục để xóa' });
  }

  const deletedItem = catalog[index];
  catalog = catalog.filter(c => c.id !== id);
  writeCollection('equipment_catalog', catalog);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'DELETE',
    targetType: 'equipment_catalog',
    targetId: id,
    oldValue: deletedItem,
    success: true
  });

  res.json({ success: true, message: 'Đã xóa thành công' });
});

// ==========================================
// API SYSTEM CATEGORIES (Quản lý Danh mục phân loại)
// ==========================================

app.get('/api/categories', (req, res) => {
  const categories = readCollection('categories', []);
  res.json(categories);
});

app.post('/api/categories', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tên danh mục không được để trống' });
  }

  const trimmedName = name.trim();
  const categories = readCollection('categories', []);

  if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
    return res.status(400).json({ error: `Danh mục "${trimmedName}" đã tồn tại` });
  }

  const newCategory = {
    id: uuidv4(),
    name: trimmedName,
    description: description ? description.trim() : ''
  };

  categories.push(newCategory);
  writeCollection('categories', categories);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'category',
    targetId: newCategory.id,
    newValue: newCategory,
    success: true
  });

  res.status(201).json(newCategory);
});

app.put('/api/categories/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tên danh mục không được để trống' });
  }

  const trimmedName = name.trim();
  const categories = readCollection('categories', []);
  const index = categories.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy danh mục' });
  }

  if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
    return res.status(400).json({ error: `Danh mục "${trimmedName}" đã tồn tại` });
  }

  const oldName = categories[index].name;
  const oldCategory = { ...categories[index] };

  categories[index] = {
    ...categories[index],
    name: trimmedName,
    description: description !== undefined ? description.trim() : categories[index].description
  };

  writeCollection('categories', categories);

  // Nếu đổi tên danh mục, cập nhật đồng bộ các thiết bị và catalog đang dùng danh mục này
  if (oldName !== trimmedName) {
    const equipment = readCollection('equipment', []);
    let eqUpdated = false;
    equipment.forEach(e => {
      if (e.category === oldName) {
        e.category = trimmedName;
        eqUpdated = true;
      }
    });
    if (eqUpdated) writeCollection('equipment', equipment);

    const catalog = readCollection('equipment_catalog', []);
    let catUpdated = false;
    catalog.forEach(c => {
      if (c.category === oldName) {
        c.category = trimmedName;
        catUpdated = true;
      }
    });
    if (catUpdated) writeCollection('equipment_catalog', catalog);
  }

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'category',
    targetId: id,
    oldValue: oldCategory,
    newValue: categories[index],
    success: true
  });

  res.json(categories[index]);
});

app.delete('/api/categories/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const categories = readCollection('categories', []);
  const index = categories.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy danh mục' });
  }

  const categoryToDelete = categories[index];

  // Kiểm tra ràng buộc dữ liệu: xem có thiết bị hoặc catalog nào đang sử dụng danh mục này không
  const equipment = readCollection('equipment', []);
  const inUseByEquipment = equipment.filter(e => e.category === categoryToDelete.name);

  const catalog = readCollection('equipment_catalog', []);
  const inUseByCatalog = catalog.filter(c => c.category === categoryToDelete.name);

  if (inUseByEquipment.length > 0 || inUseByCatalog.length > 0) {
    logAuditEvent(req, {
      action: 'DELETE',
      targetType: 'category',
      targetId: id,
      success: false,
      metadata: {
        reason: 'In use by equipment or catalog',
        equipmentCount: inUseByEquipment.length,
        catalogCount: inUseByCatalog.length
      }
    });

    return res.status(400).json({
      error: `Không thể xóa danh mục "${categoryToDelete.name}" vì đang có ${inUseByEquipment.length} thiết bị và ${inUseByCatalog.length} mẫu danh mục gốc đang sử dụng.`
    });
  }

  const filtered = categories.filter(c => c.id !== id);
  writeCollection('categories', filtered);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'DELETE',
    targetType: 'category',
    targetId: id,
    oldValue: categoryToDelete,
    success: true
  });

  res.json({ success: true, message: `Đã xóa danh mục "${categoryToDelete.name}" thành công` });
});

// ==========================================
// API BẢO TRÌ & SỬA CHỮA (MAINTENANCE)
// ==========================================

app.get('/api/maintenance', (req, res) => {
  const maintenance = readCollection('maintenance');
  const equipment = readCollection('equipment');

  const richMaintenance = maintenance.map(m => {
    const eq = equipment.find(e => e.id === m.equipmentId);
    return {
      ...m,
      equipmentCode: m.equipmentCode || (eq ? eq.code : (m.equipmentId ? m.equipmentId.substring(0, 8) : 'N/A')),
      equipmentName: m.equipmentName || (eq ? eq.name : 'Thiết bị không xác định'),
      category: m.category || (eq ? eq.category : 'Khác'),
      location: m.location || (eq ? eq.location : 'Kho Lab')
    };
  });

  res.json([...richMaintenance].reverse());
});

app.post('/api/maintenance', authenticateToken, (req, res) => {
  const { equipmentId, equipmentName, issueDescription, status, cost } = req.body;
  if (!equipmentId || !issueDescription) {
    return res.status(400).json({ error: 'Thiếu thông tin thiết bị hoặc mô tả lỗi' });
  }

  const maintenance = readCollection('maintenance');
  const newTicket = {
    id: uuidv4(),
    equipmentId,
    equipmentName,
    issueDescription,
    status: status || 'Đang sửa',
    cost: Number(cost) || 0,
    reportedDate: new Date().toISOString(),
    resolvedDate: null
  };

  maintenance.push(newTicket);
  writeCollection('maintenance', maintenance);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'CREATE',
    targetType: 'maintenance_ticket',
    targetId: newTicket.id,
    newValue: {
      equipmentId: newTicket.equipmentId,
      equipmentName: newTicket.equipmentName,
      issueDescription: newTicket.issueDescription,
      status: newTicket.status,
      cost: newTicket.cost
    },
    success: true
  });

  res.status(201).json(newTicket);
});

app.put('/api/maintenance/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const { issueDescription, status, cost, newNote } = req.body;

  const maintenance = readCollection('maintenance');
  const index = maintenance.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu bảo trì' });
  }

  const current = maintenance[index];
  const oldTicket = { ...current };
  let resolvedDate = current.resolvedDate;
  let notes = current.notes || [];

  if (status === 'Đã sửa' && current.status !== 'Đã sửa') {
    resolvedDate = new Date().toISOString();
  } else if (status !== 'Đã sửa') {
    resolvedDate = null;
  }

  if (newNote && newNote.trim() !== '') {
    notes.push({
      id: uuidv4(),
      text: newNote,
      date: new Date().toISOString()
    });
  }

  maintenance[index] = {
    ...current,
    issueDescription: issueDescription !== undefined ? issueDescription : current.issueDescription,
    status: status !== undefined ? status : current.status,
    cost: cost !== undefined ? Number(cost) : current.cost,
    resolvedDate,
    notes
  };

  writeCollection('maintenance', maintenance);

  // Ghi nhận Audit Log
  const changedOld = {};
  const changedNew = {};
  ['issueDescription', 'status', 'cost', 'resolvedDate'].forEach(field => {
    if (oldTicket[field] !== maintenance[index][field]) {
      changedOld[field] = oldTicket[field];
      changedNew[field] = maintenance[index][field];
    }
  });

  logAuditEvent(req, {
    action: 'UPDATE',
    targetType: 'maintenance_ticket',
    targetId: id,
    oldValue: changedOld,
    newValue: changedNew,
    metadata: {
      equipmentId: maintenance[index].equipmentId,
      equipmentName: maintenance[index].equipmentName,
      addedNote: !!newNote
    },
    success: true
  });

  res.json(maintenance[index]);
});

app.delete('/api/maintenance/:id', authenticateToken, authorizeRoles('manager', 'super_admin'), (req, res) => {
  const { id } = req.params;
  const maintenance = readCollection('maintenance');
  const ticketToDelete = maintenance.find(m => m.id === id);

  if (!ticketToDelete) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu bảo trì' });
  }

  const filtered = maintenance.filter(m => m.id !== id);
  writeCollection('maintenance', filtered);

  // Ghi nhận Audit Log
  logAuditEvent(req, {
    action: 'DELETE',
    targetType: 'maintenance_ticket',
    targetId: id,
    oldValue: {
      equipmentId: ticketToDelete.equipmentId,
      equipmentName: ticketToDelete.equipmentName,
      issueDescription: ticketToDelete.issueDescription,
      status: ticketToDelete.status,
      cost: ticketToDelete.cost
    },
    success: true
  });

  res.json({ message: 'Xóa phiếu bảo trì thành công' });
});

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`Server Backend Lab đang chạy tại http://localhost:${PORT}`);
});
