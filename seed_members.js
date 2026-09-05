import { sequelize, User, RfidCard, reloadCacheFromDb } from './backend/src/db.js';
import fs from 'fs';
import path from 'path';

async function seedCleanMembers() {
  console.log('🔄 Đang làm sạch danh sách thành viên cũ trong SQLite & JSON...');
  
  // Xóa toàn bộ user cũ
  await sequelize.query('DELETE FROM users');

  const membersData = [
    // BAN QUẢN LÝ & GIẢNG VIÊN (4 người)
    {
      id: 'usr_admin_1',
      mssv: 'CB-001',
      name: 'TS. Nguyễn Văn A',
      username: 'nguyenvana',
      email: 'nguyenvana@lhu.edu.vn',
      role: 'Chủ nhiệm CLB',
      points: 200,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_admin_2',
      mssv: 'CB-002',
      name: 'ThS. Trần Quang Huy',
      username: 'tranquanghuy',
      email: 'tranquanghuy@lhu.edu.vn',
      role: 'Chủ nhiệm CLB',
      points: 180,
      active: false,
      accountStatus: 'active'
    },
    {
      id: 'usr_tech_1',
      mssv: '20210001',
      name: 'Trần Hoàng Nam',
      username: 'nam.th',
      email: '20210001@lhu.edu.vn',
      role: 'Trưởng ban kỹ thuật',
      points: 155,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_kho_1',
      mssv: '20210002',
      name: 'Phạm Minh Tuấn',
      username: 'tuan.pm',
      email: '20210002@lhu.edu.vn',
      role: 'Quản lý kho Lab',
      points: 140,
      active: true,
      accountStatus: 'active'
    },

    // THÀNH VIÊN NGHIÊN CỨU (SINH VIÊN NÒNG CỐT - 5 người)
    {
      id: 'usr_mem_1',
      mssv: '20220001',
      name: 'Nguyễn Hoàng Long',
      username: 'long.nh',
      email: '20220001@lhu.edu.vn',
      role: 'Thành viên nghiên cứu',
      points: 145,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_mem_2',
      mssv: '20220003',
      name: 'Lê Văn Cường',
      username: 'cuong.lv',
      email: '20220003@lhu.edu.vn',
      role: 'Thành viên nghiên cứu',
      points: 110,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_mem_3',
      mssv: '20220004',
      name: 'Phạm Văn Dũng',
      username: 'dung.pv',
      email: '20220004@lhu.edu.vn',
      role: 'Thành viên nghiên cứu',
      points: 95,
      active: false,
      accountStatus: 'active'
    },
    {
      id: 'usr_mem_4',
      mssv: '20220015',
      name: 'Đỗ Thị Mai Hương',
      username: 'huong.dtm',
      email: '20220015@lhu.edu.vn',
      role: 'Thành viên nghiên cứu',
      points: 125,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_mem_5',
      mssv: '20220028',
      name: 'Hoàng Đức Anh',
      username: 'anh.hd',
      email: '20220028@lhu.edu.vn',
      role: 'Thành viên nghiên cứu',
      points: 85,
      active: false,
      accountStatus: 'active'
    },

    // CỘNG TÁC VIÊN & SINH VIÊN THỰC HÀNH (7 người)
    {
      id: 'usr_ctv_1',
      mssv: '20230005',
      name: 'Vũ Hải Đăng',
      username: 'dang.vh',
      email: '20230005@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 65,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_2',
      mssv: '20230012',
      name: 'Bùi Phương Linh',
      username: 'linh.bp',
      email: '20230012@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 75,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_3',
      mssv: '20230019',
      name: 'Ngô Quốc Bảo',
      username: 'bao.nq',
      email: '20230019@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 40,
      active: false,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_4',
      mssv: '20230034',
      name: 'Đinh Gia Huy',
      username: 'huy.dg',
      email: '20230034@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 50,
      active: false,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_5',
      mssv: '20230048',
      name: 'Nguyễn Thảo Nhi',
      username: 'nhi.nt',
      email: '20230048@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 70,
      active: true,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_6',
      mssv: '20240001',
      name: 'Trương Vĩnh Phúc',
      username: 'phuc.tv',
      email: '20240001@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 25,
      active: false,
      accountStatus: 'active'
    },
    {
      id: 'usr_ctv_7',
      mssv: '20240018',
      name: 'Lâm Khánh Vy',
      username: 'vy.lk',
      email: '20240018@lhu.edu.vn',
      role: 'Cộng tác viên',
      points: 35,
      active: true,
      accountStatus: 'active'
    }
  ];

  await User.bulkCreate(membersData);
  console.log(`✅ Đã thêm ${membersData.length} thành viên thực tế vào Database!`);

  // Lưu bản sao vào backend/data/users.json
  const usersJsonPath = path.join(process.cwd(), 'backend', 'data', 'users.json');
  fs.writeFileSync(usersJsonPath, JSON.stringify(membersData, null, 2), 'utf-8');

  // Cập nhật lại RFID cards tương ứng với sinh viên
  await sequelize.query('DELETE FROM rfid_cards');
  const rfidData = [
    { id: 'rc1', cardId: 'CARD-001', mssv: '20220001', userName: 'Nguyễn Hoàng Long', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: '2026-09-05T08:30:00.000Z', usageCount: 42 },
    { id: 'rc2', cardId: 'CARD-002', mssv: '20220003', userName: 'Lê Văn Cường', status: 'active', registeredDate: '2026-06-01T08:00:00.000Z', lastUsed: '2026-09-05T09:15:00.000Z', usageCount: 28 },
    { id: 'rc3', cardId: 'CARD-003', mssv: '20220015', userName: 'Đỗ Thị Mai Hương', status: 'active', registeredDate: '2026-06-05T10:00:00.000Z', lastUsed: '2026-09-04T14:20:00.000Z', usageCount: 19 },
    { id: 'rc4', cardId: 'CARD-004', mssv: '20230005', userName: 'Vũ Hải Đăng', status: 'active', registeredDate: '2026-06-10T14:00:00.000Z', lastUsed: '2026-09-05T07:45:00.000Z', usageCount: 12 },
    { id: 'rc5', cardId: 'CARD-005', mssv: '20230012', userName: 'Bùi Phương Linh', status: 'active', registeredDate: '2026-06-12T09:30:00.000Z', lastUsed: '2026-09-03T16:00:00.000Z', usageCount: 8 }
  ];
  await RfidCard.bulkCreate(rfidData);
  const rfidJsonPath = path.join(process.cwd(), 'backend', 'data', 'rfid_cards.json');
  fs.writeFileSync(rfidJsonPath, JSON.stringify(rfidData, null, 2), 'utf-8');

  console.log('🎉 Hoàn tất nạp dữ liệu thành viên & thẻ RFID thực tế!');
  process.exit(0);
}

seedCleanMembers().catch(err => {
  console.error('❌ Lỗi khi nạp dữ liệu:', err);
  process.exit(1);
});
