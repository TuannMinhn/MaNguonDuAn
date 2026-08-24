import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readCollection, writeCollection, syncDatabase } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Khởi tạo kết nối SQLite database và seed dữ liệu từ JSON cũ
syncDatabase()
  .then(() => console.log('SQLite sync initialization complete.'))
  .catch(err => console.error('SQLite database initialization failed:', err));

// Helper function: Tạo thông báo cho Manager
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
  // Giới hạn 500 thông báo gần nhất
  if (notifications.length > 500) notifications.pop();
  writeCollection('notifications', notifications);
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
app.get('/api/rfid-cards', (req, res) => {
  const rfidCards = readCollection('rfid_cards');
  res.json(rfidCards);
});

// Đăng ký thẻ RFID mới
app.post('/api/rfid-cards', (req, res) => {
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

  res.status(201).json({ message: `Đăng ký thẻ ${cardId} cho ${user.name} thành công`, card: newCard });
});

// Sửa thông tin thẻ RFID
app.put('/api/rfid-cards/:id', (req, res) => {
  const { id } = req.params;
  const { mssv, status } = req.body;

  const rfidCards = readCollection('rfid_cards');
  const index = rfidCards.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thẻ RFID' });
  }

  const card = rfidCards[index];

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

  res.json({ message: 'Cập nhật thẻ RFID thành công', card });
});

// Xóa / Vô hiệu hóa thẻ RFID
app.delete('/api/rfid-cards/:id', (req, res) => {
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

  res.json({ message: `Đã xóa thẻ ${card.cardId}` });
});

// Lịch sử quét thẻ của 1 thẻ cụ thể
app.get('/api/rfid-cards/:cardId/history', (req, res) => {
  const { cardId } = req.params;
  const history = readCollection('rfid_history');
  const cardHistory = history.filter(h => h.cardId === cardId);
  res.json([...cardHistory].reverse());
});

// Toàn bộ lịch sử quét thẻ (có filter)
app.get('/api/rfid-history', (req, res) => {
  const { cardId, mssv, module: mod, from, to } = req.query;
  let history = readCollection('rfid_history');

  if (cardId) history = history.filter(h => h.cardId === cardId);
  if (mssv) history = history.filter(h => h.mssv === mssv);
  if (mod) history = history.filter(h => h.module === mod);
  if (from) history = history.filter(h => new Date(h.timestamp) >= new Date(from));
  if (to) history = history.filter(h => new Date(h.timestamp) <= new Date(to));

  res.json([...history].reverse());
});

// ==========================================
// API THÀNH VIÊN (MEMBERS)
// ==========================================

app.get('/api/members', (req, res) => {
  const users = readCollection('users');
  res.json(users);
});

app.post('/api/members', (req, res) => {
  const { mssv, name, role } = req.body;
  if (!mssv || !name) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Tên thành viên' });
  }

  const users = readCollection('users');
  if (users.some(u => u.mssv === mssv)) {
    return res.status(400).json({ error: 'MSSV đã tồn tại trong hệ thống' });
  }

  const newUser = {
    id: uuidv4(),
    mssv,
    name,
    role: role || 'Thành viên',
    points: 0,
    active: false
  };

  users.push(newUser);
  writeCollection('users', users);
  res.status(201).json(newUser);
});

app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, points } = req.body;

  const users = readCollection('users');
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thành viên' });
  }

  users[index] = {
    ...users[index],
    name: name !== undefined ? name : users[index].name,
    role: role !== undefined ? role : users[index].role,
    points: points !== undefined ? Number(points) : users[index].points
  };

  writeCollection('users', users);
  res.json(users[index]);
});

app.delete('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const users = readCollection('users');
  const filtered = users.filter(u => u.id !== id);

  if (filtered.length === users.length) {
    return res.status(404).json({ error: 'Không tìm thấy thành viên' });
  }

  writeCollection('users', filtered);
  res.json({ message: 'Xóa thành viên thành công' });
});

app.post('/api/members/:id/points', (req, res) => {
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

  users[index].points = Math.max(0, users[index].points + Number(amount));
  writeCollection('users', users);
  res.json(users[index]);
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

    // Cộng điểm thưởng check-in chuyên cần (ví dụ: tối thiểu 1 tiếng trực Lab được cộng 5 điểm)
    const pointsEarned = duration >= 1.0 ? 5 : 2;
    user.points += pointsEarned;

    writeCollection('users', users);
    writeCollection('attendance', attendance);

    // Log RFID action nếu dùng thẻ
    if (cardId) {
      logRfidAction(cardId, user.mssv, user.name, 'check-out', 'attendance', true);
    }

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
  const equipment = readCollection('equipment');
  res.json(equipment);
});

app.post('/api/equipment', (req, res) => {
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
    location: location || 'Kho Lab',
    status: 'Sẵn sàng',
    category: category || 'Khác',
    assetType: assetType || 'Thiết bị',
    unit: unit || 'Cái',
    minThreshold: minThreshold !== undefined ? Number(minThreshold) : 0
  };

  equipment.push(newEquip);
  writeCollection('equipment', equipment);
  res.status(201).json(newEquip);
});

// Import hàng loạt thiết bị / linh kiện
app.post('/api/equipment/import', (req, res) => {
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
      location: location || 'Kho Lab',
      status: 'Sẵn sàng',
      category: category || 'Khác',
      assetType: assetType || 'Thiết bị',
      unit: unit || 'Cái',
      minThreshold: minThreshold !== undefined ? Number(minThreshold) : 0
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

app.put('/api/equipment/:id', (req, res) => {
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
    location: location !== undefined ? location : current.location,
    status: status !== undefined ? status : current.status,
    category: category !== undefined ? category : current.category || 'Khác',
    assetType: assetType !== undefined ? assetType : current.assetType || 'Thiết bị',
    unit: unit !== undefined ? unit : current.unit || 'Cái',
    minThreshold: minThreshold !== undefined ? Number(minThreshold) : current.minThreshold || 0
  };

  writeCollection('equipment', equipment);
  res.json(equipment[index]);
});

app.delete('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const equipment = readCollection('equipment');
  const index = equipment.findIndex(e => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy thiết bị' });
  }

  if (equipment[index].borrowedQty > 0) {
    return res.status(400).json({ error: 'Thiết bị đang được mượn, không thể xóa' });
  }

  const filtered = equipment.filter(e => e.id !== id);
  writeCollection('equipment', filtered);
  res.json({ message: 'Xóa thiết bị thành công' });
});

// Mượn thiết bị
app.post('/api/equipment/:id/borrow', (req, res) => {
  const { id } = req.params;
  const { mssv, qty, expectedReturnDate, initialCondition, borrowNotes, cardId, selectedInstanceIds } = req.body;

  if (!mssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Số lượng mượn không hợp lệ' });
  }

  // Validate ngày hẹn trả không được trong quá khứ
  if (expectedReturnDate) {
    const returnDate = new Date(expectedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (returnDate < today) {
      return res.status(400).json({ error: 'Ngày hẹn trả không thể là ngày trong quá khứ' });
    }
  }

  // Tìm thành viên trong users hoặc members
  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const user = findPerson(mssv);
  if (!user) {
    return res.status(404).json({ error: 'Thành viên mượn thiết bị không tồn tại trên hệ thống' });
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
  const newBorrow = {
    id: uuidv4(),
    equipmentId: eq.id,
    equipmentName: eq.name,
    equipmentCode: eq.code,
    mssv: user.mssv,
    borrowerName: user.name,
    qty: requestedQty,
    borrowDate: new Date().toISOString(),
    expectedReturnDate: isConsumable ? null : (expectedReturnDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
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

  res.json({ message: isConsumable ? 'Xuất linh kiện thành công' : 'Mượn thiết bị thành công', borrow: newBorrow });
});

// Đặt trước thiết bị (Online Reservation)
app.post('/api/equipment/:id/reserve', (req, res) => {
  const { id } = req.params;
  const { mssv, qty, expectedReturnDate } = req.body;

  if (!mssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc Số lượng mượn không hợp lệ' });
  }

  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const user = findPerson(mssv);
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
  const newBorrow = {
    id: uuidv4(),
    equipmentId: eq.id,
    equipmentName: eq.name,
    equipmentCode: eq.code,
    mssv: user.mssv,
    borrowerName: user.name,
    qty: requestedQty,
    borrowDate: new Date().toISOString(),
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

  res.json({ message: 'Đặt trước thiết bị thành công', borrow: newBorrow });
});

// Xác nhận bàn giao thiết bị đã đặt trước (Quét RFID)
app.post('/api/equipment/borrows/:borrowId/confirm-handover', (req, res) => {
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

  res.json({ message: 'Bàn giao thiết bị thành công', borrow: borrowTicket });
});

// Trả thiết bị
app.post('/api/equipment/borrows/:borrowId/return', (req, res) => {
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

// Lấy danh sách chờ của một thiết bị
app.get('/api/equipment/:id/waitlist', (req, res) => {
  const { id } = req.params;
  const waitlist = readCollection('waitlist');
  const equipWaitlist = waitlist.filter(w => w.equipmentId === id && w.status === 'waiting');
  res.json(equipWaitlist);
});

// Đăng ký chờ mượn thiết bị
app.post('/api/equipment/:id/waitlist', (req, res) => {
  const { id } = req.params;
  const { mssv, qty, notes } = req.body;

  if (!mssv || !qty || Number(qty) <= 0) {
    return res.status(400).json({ error: 'Thiếu MSSV hoặc số lượng không hợp lệ' });
  }

  const users = readCollection('users');
  const members = readCollection('members');
  const findPerson = (m) => members.find(p => p.mssv === m) || users.find(u => u.mssv === m);

  const user = findPerson(mssv);
  if (!user) {
    return res.status(404).json({ error: 'Thành viên không tồn tại trên hệ thống' });
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
app.post('/api/schedules/register', (req, res) => {
  const { scheduleId, mssv } = req.body;
  if (!scheduleId || !mssv) {
    return res.status(400).json({ error: 'Thiếu mã ca trực hoặc MSSV' });
  }

  const users = readCollection('users');
  const user = users.find(u => u.mssv === mssv);
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
  const alreadyRegistered = schedule.members.some(m => m.mssv === mssv);
  if (alreadyRegistered) {
    // Nếu đã đăng ký, thực hiện hủy đăng ký (toggle)
    schedule.members = schedule.members.filter(m => m.mssv !== mssv);
    writeCollection('schedules', schedules);
    return res.json({ message: 'Đã hủy đăng ký ca trực thành công', schedule });
  } else {
    // Nếu chưa đăng ký, thêm vào danh sách
    schedule.members.push({ mssv: user.mssv, name: user.name });
    writeCollection('schedules', schedules);
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

app.post('/api/tasks', (req, res) => {
  const { title, project, assignedTo, points } = req.body;
  if (!title || !project) {
    return res.status(400).json({ error: 'Thiếu tên nhiệm vụ hoặc tên dự án' });
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
  const newTask = {
    id: uuidv4(),
    title,
    project,
    status: 'todo',
    assignedTo: assignedTo || null,
    assignedName,
    points: points ? Number(points) : 10
  };

  tasks.push(newTask);
  writeCollection('tasks', tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, project, status, assignedTo, points } = req.body;

  const tasks = readCollection('tasks');
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
  }

  const currentTask = tasks[index];
  const prevStatus = currentTask.status;

  let assignedName = currentTask.assignedName;
  if (assignedTo !== undefined) {
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
    title: title !== undefined ? title : currentTask.title,
    project: project !== undefined ? project : currentTask.project,
    status: status !== undefined ? status : currentTask.status,
    assignedTo: assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
    assignedName,
    points: points !== undefined ? Number(points) : currentTask.points
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

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const tasks = readCollection('tasks');
  const filtered = tasks.filter(t => t.id !== id);

  if (filtered.length === tasks.length) {
    return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ' });
  }

  writeCollection('tasks', filtered);
  res.json({ message: 'Xóa nhiệm vụ thành công' });
});


// ==========================================
// API ĐĂNG KÝ SỬ DỤNG PHÒNG (ROOM BOOKINGS)
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

app.post('/api/bookings', (req, res) => {
  const { date, slotId, representativeMssv, memberMssvs, scannedCards = {} } = req.body;
  if (!date || !slotId || !representativeMssv || !memberMssvs || !Array.isArray(memberMssvs)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký (ngày, ca, người đại diện, danh sách MSSV)' });
  }

  const bookings = readCollection('bookings');

  // Kiểm tra xem khung giờ đó của ngày đó đã có ai đăng ký chưa
  const isBooked = bookings.some(b => b.date === date && String(b.slotId) === String(slotId));
  if (isBooked) {
    return res.status(400).json({ error: 'Khung giờ này đã được đăng ký bởi nhóm khác' });
  }

  // Xác thực các thành viên và người đại diện
  // Thử tìm trong 'members' trước, fallback sang 'users'
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
      // Đánh dấu hành động: nếu là đại diện thì action là 'book_representative', ngược lại là 'book_member'
      const actionType = (mssv === representativeMssv) ? 'book_representative' : 'book_member';
      logRfidAction(cardId, person.mssv, person.name, actionType, 'room_booking', true);
    }
  }

  res.status(201).json(newBooking);

  // Gửi thông báo cho Quản lý
  createNotification(
    'room_booking',
    'Lịch đăng ký phòng mới',
    `${repUser.name} (${repUser.mssv}) vừa đăng ký phòng vào ${date}, ca ${slotId}`,
    {
      bookingId: newBooking.id,
      date,
      slotId,
      representativeName: repUser.name,
      participantsCount: membersInfo.length,
      members: membersInfo
    }
  );
});

app.post('/api/bookings/bulk', (req, res) => {
  const { slots, representativeMssv, memberMssvs, purpose = 'Sử dụng chung', scannedCards = {} } = req.body;
  if (!slots || !Array.isArray(slots) || slots.length === 0 || !representativeMssv || !memberMssvs || !Array.isArray(memberMssvs)) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đăng ký (danh sách buổi, người đại diện, danh sách MSSV)' });
  }

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

  const newBookings = [];
  const failedSlots = [];

  for (const slot of slots) {
    const { date, slotId } = slot;
    const isBooked = bookings.some(b => b.date === date && String(b.slotId) === String(slotId));

    if (isBooked) {
      failedSlots.push({ date, slotId });
      continue;
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

    // Gửi thông báo cho Quản lý (Bulk Notification)
    createNotification(
      'room_booking_bulk',
      'Đăng ký phòng (Nhiều buổi)',
      `${repUser.name} (${repUser.mssv}) vừa đăng ký ${newBookings.length} buổi phòng Lab`,
      {
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

app.post('/api/bookings/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { mssv } = req.body;

  if (!mssv) {
    return res.status(400).json({ error: 'Vui lòng cung cấp MSSV người đại diện để xác thực hủy lịch' });
  }

  const bookings = readCollection('bookings');
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu đăng ký phòng' });
  }

  const booking = bookings[index];
  if (booking.representativeMssv !== mssv) {
    return res.status(403).json({ error: 'Chỉ người đại diện đăng ký phòng mới có quyền hủy lịch' });
  }

  const filtered = bookings.filter(b => b.id !== id);
  writeCollection('bookings', filtered);

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
    const hours = now.getHours();
    if (hours >= 7 && hours < 9) currentSlotId = 'morning_1';
    else if (hours >= 9 && hours < 11) currentSlotId = 'morning_2';
    else if (hours >= 12 && hours < 14) currentSlotId = 'afternoon_1';
    else if (hours >= 14 && hours < 16) currentSlotId = 'afternoon_2';
    else if (hours >= 16 && hours < 18) currentSlotId = 'evening_1';
    else if (hours >= 18 && hours < 20) currentSlotId = 'evening_2';
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
    const cooldownMs = 5 * 1000;

    if (diffMs < cooldownMs) {
      return res.status(400).json({ error: 'Vui lòng đợi ít nhất 5 giây trước khi check-out (Chống quét nhầm)' });
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
  let analytics = [];

  equipment.forEach(eq => {
    if (eq.assetType === 'Thiết bị' && eq.instances && eq.instances.length > 0) {
      eq.instances.forEach(inst => {
        const lifespan = inst.lifespanHours || eq.lifespanHours || 10000;
        const used = inst.usedHours || 0;
        const healthPercent = Math.max(0, 100 - (used / lifespan) * 100);

        let status = 'Tốt';
        if (healthPercent <= 0) status = 'Quá hạn';
        else if (healthPercent <= 20) status = 'Cần bảo trì';

        analytics.push({
          id: inst.id,
          equipmentId: eq.id,
          name: eq.name,
          code: inst.serialNumber,
          category: eq.category,
          location: eq.location,
          totalQty: 1,
          borrowedQty: inst.status === 'Đang mượn' ? 1 : 0,
          usedHours: used,
          lifespanHours: lifespan,
          healthPercent: healthPercent.toFixed(1),
          lifespanStatus: status
        });
      });
    } else {
      const lifespan = eq.lifespanHours || 10000;
      const used = eq.usedHours || 0;
      const healthPercent = Math.max(0, 100 - (used / lifespan) * 100);

      let status = 'Tốt';
      if (healthPercent <= 0) status = 'Quá hạn';
      else if (healthPercent <= 20) status = 'Cần bảo trì';

      analytics.push({
        ...eq,
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
    { key: 'morning', label: 'Sáng', slots: [{ id: 'morning_1', label: '7:00 – 9:00' }, { id: 'morning_2', label: '9:00 – 11:00' }] },
    { key: 'afternoon', label: 'Chiều', slots: [{ id: 'afternoon_1', label: '12:00 – 14:00' }, { id: 'afternoon_2', label: '14:00 – 16:00' }] },
    { key: 'evening', label: 'Tối', slots: [{ id: 'evening_1', label: '16:00 – 18:00' }, { id: 'evening_2', label: '18:00 – 20:00' }] },
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

  // Calculate Equipment Usage & Depreciation IN THIS PERIOD
  const filteredBorrows = borrows.filter(b => {
    const d = new Date(b.borrowDate);
    return d >= startDate && d <= endDate;
  });

  const eqStats = {};
  equipment.forEach(e => {
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
      lifespanHours: e.lifespanHours || 0,
      totalUsedHours: e.usedHours || 0,
      periodBorrowCount: 0,
      periodUsedHours: 0,
      instances: e.instances || []
    };
  });

  filteredBorrows.forEach(b => {
    if (eqStats[b.equipmentId]) {
      eqStats[b.equipmentId].periodBorrowCount += b.qty;
      const bDate = new Date(b.borrowDate);
      const now = new Date();
      // Nếu chưa trả, lấy thời điểm hiện tại hoặc endDate (nếu endDate ở quá khứ)
      const effectiveEndDate = now < endDate ? now : endDate;
      const rDate = b.returnDate ? new Date(b.returnDate) : effectiveEndDate;
      const hours = (rDate - bDate) / 3600000;
      eqStats[b.equipmentId].periodUsedHours += (hours > 0 ? hours * b.qty : 0);
    }
  });

  const equipmentReport = Object.values(eqStats).map(e => ({
    ...e,
    periodUsedHours: Number(e.periodUsedHours.toFixed(1)),
    depreciationPercent: e.lifespanHours ? ((e.totalUsedHours / e.lifespanHours) * 100).toFixed(1) : 0
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
// API THÔNG BÁO (NOTIFICATIONS)
// ==========================================

app.get('/api/notifications', (req, res) => {
  res.json(readCollection('notifications'));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notifications = readCollection('notifications');
  const index = notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications[index].read = true;
    writeCollection('notifications', notifications);
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  const notifications = readCollection('notifications');
  notifications.forEach(n => n.read = true);
  writeCollection('notifications', notifications);
  res.json({ success: true });
});

// Phân quyền & Đăng nhập
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === 'admin123') {
    return res.json({ success: true, role: 'admin', message: 'Đăng nhập Quản lý thành công' });
  } else {
    return res.status(401).json({ success: false, error: 'Mật khẩu quản lý không chính xác' });
  }
});

// ==========================================
// API CATALOG (Danh mục gốc thiết bị)
// ==========================================

app.get('/api/settings/catalog', (req, res) => {
  res.json(readCollection('equipment_catalog'));
});

app.post('/api/settings/catalog', (req, res) => {
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
  res.status(201).json(newItem);
});

app.put('/api/settings/catalog/:id', (req, res) => {
  const { id } = req.params;
  const { name, codePrefix, category, assetType, unit, lifespanHours, description } = req.body;
  
  const catalog = readCollection('equipment_catalog');
  const index = catalog.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy mục trong Danh mục gốc' });
  }

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
  res.json(catalog[index]);
});

app.delete('/api/settings/catalog/:id', (req, res) => {
  const { id } = req.params;
  let catalog = readCollection('equipment_catalog');
  const initialLength = catalog.length;
  catalog = catalog.filter(c => c.id !== id);

  if (catalog.length === initialLength) {
    return res.status(404).json({ error: 'Không tìm thấy mục để xóa' });
  }

  writeCollection('equipment_catalog', catalog);
  res.json({ success: true, message: 'Đã xóa thành công' });
});

// ==========================================
// API BẢO TRÌ & SỬA CHỮA (MAINTENANCE)
// ==========================================

app.get('/api/maintenance', (req, res) => {
  const maintenance = readCollection('maintenance');
  res.json(maintenance);
});

app.post('/api/maintenance', (req, res) => {
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
  res.status(201).json(newTicket);
});

app.put('/api/maintenance/:id', (req, res) => {
  const { id } = req.params;
  const { issueDescription, status, cost, newNote } = req.body;

  const maintenance = readCollection('maintenance');
  const index = maintenance.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu bảo trì' });
  }

  const current = maintenance[index];
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
  res.json(maintenance[index]);
});

app.delete('/api/maintenance/:id', (req, res) => {
  const { id } = req.params;
  const maintenance = readCollection('maintenance');
  const filtered = maintenance.filter(m => m.id !== id);

  if (filtered.length === maintenance.length) {
    return res.status(404).json({ error: 'Không tìm thấy phiếu bảo trì' });
  }

  writeCollection('maintenance', filtered);
  res.json({ message: 'Xóa phiếu bảo trì thành công' });
});

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`Server Backend Lab đang chạy tại http://localhost:${PORT}`);
});
