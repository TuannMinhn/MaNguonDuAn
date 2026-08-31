import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sequelize, reloadCacheFromDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'data', 'lab.db');

// Đảm bảo thư mục backup tồn tại
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Tạo bản sao lưu SQLite database an toàn bằng SQLite VACUUM INTO
 * @param {string} [prefix='backup'] - Tiền tố đặt tên file (ví dụ: 'manual', 'safety', 'auto')
 * @returns {Promise<{ filename: string, filepath: string, size: number, timestamp: string }>}
 */
export async function createBackup(prefix = 'backup') {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Database file lab.db does not exist');
  }

  // Sanitize prefix (chỉ cho phép alphanumeric và dấu gạch dưới/ngang)
  const cleanPrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'backup';
  const now = new Date();
  // Format: backup_2026-08-31T18-50-00-123Z.db
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const filename = `${cleanPrefix}_${timestampStr}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  try {
    // Dùng SQLite VACUUM INTO để tạo snapshot nguyên tử, an toàn ngay cả khi database đang mở và ghi
    // Escaping single quotes trong đường dẫn cho câu lệnh SQL SQLite
    const escapedDestPath = destPath.replace(/'/g, "''");
    await sequelize.query(`VACUUM INTO '${escapedDestPath}'`);
  } catch (vacuumErr) {
    // Fallback sang fs.copyFile nếu SQLite version hoặc môi trường không hỗ trợ VACUUM INTO
    // Trước khi copy, chạy checkpoint WAL nếu có
    try {
      await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (walErr) {}
    fs.copyFileSync(DB_PATH, destPath);
  }

  if (!fs.existsSync(destPath)) {
    throw new Error('Backup file was not created successfully');
  }

  const stats = fs.statSync(destPath);
  return {
    filename,
    filepath: destPath,
    size: stats.size,
    timestamp: now.toISOString()
  };
}

/**
 * Liệt kê danh sách các bản backup hợp lệ, sắp xếp mới nhất lên đầu
 * @returns {Array<{ filename: string, size: number, createdAt: string, isSafety: boolean, type: 'manual'|'auto'|'safety' }>}
 */
export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  const backups = [];

  for (const file of files) {
    // Chỉ chấp nhận file có đuôi .db và không phải thư mục
    if (!file.endsWith('.db')) continue;
    
    // Ngăn chặn các file ẩn hoặc path lạ
    if (file.startsWith('.')) continue;

    const fullPath = path.join(BACKUP_DIR, file);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isFile() && stats.size > 0) {
        let type = 'manual';
        if (file.startsWith('auto_')) type = 'auto';
        else if (file.startsWith('safety_')) type = 'safety';

        backups.push({
          filename: file,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
          isSafety: type === 'safety',
          type
        });
      }
    } catch (e) {}
  }

  // Sắp xếp mới nhất lên đầu
  backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return backups;
}

/**
 * Áp dụng chính sách lưu giữ (Retention Policy) cho các bản backup tự động
 * Giữ tối đa N bản backup 'auto' gần nhất, không xóa manual hoặc safety backup
 * @param {number} [retentionCount=7] - Số lượng bản sao lưu tự động tối đa cần giữ
 * @returns {number} - Số lượng bản backup cũ đã dọn dẹp
 */
export function applyRetentionPolicy(retentionCount = 7) {
  const maxKeep = Math.max(1, Number(retentionCount) || 7);
  const allBackups = listBackups();
  
  // Lọc riêng danh sách backup tự động (type === 'auto')
  const autoBackups = allBackups.filter(b => b.type === 'auto');

  if (autoBackups.length <= maxKeep) {
    return 0; // Chưa vượt quá ngưỡng retention
  }

  // Lấy các bản auto backup vượt quá số lượng cần giữ (từ index maxKeep trở đi)
  const toDelete = autoBackups.slice(maxKeep);
  let deletedCount = 0;

  for (const backup of toDelete) {
    try {
      const targetPath = path.join(BACKUP_DIR, backup.filename);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        deletedCount++;
      }
    } catch (err) {
      console.error(`Không thể xóa bản backup cũ ${backup.filename}:`, err.message);
    }
  }

  return deletedCount;
}

/**
 * Thực hiện 1 chu kỳ Auto Backup an toàn và tự động dọn dẹp theo Retention Policy
 * @param {number} [retentionCount=7]
 * @returns {Promise<{ backup: object, deletedCount: number }>}
 */
export async function runAutoBackupCycle(retentionCount = 7) {
  try {
    // 1. Tạo backup mới với prefix 'auto'
    const backup = await createBackup('auto');

    // 2. Xác nhận backup mới thành công, sau đó mới áp dụng retention policy
    const deletedCount = applyRetentionPolicy(retentionCount);

    return { backup, deletedCount };
  } catch (err) {
    console.error('Lỗi khi thực thi chu kỳ Auto Backup:', err.message);
    throw err;
  }
}

let autoBackupTimer = null;

/**
 * Khởi động hoặc cập nhật lịch trình Auto Backup với 1 timer duy nhất
 * @param {Function} getSettingFn - Hàm lấy cài đặt hệ thống (getSystemSetting)
 */
export function scheduleAutoBackup(getSettingFn) {
  if (autoBackupTimer) {
    clearTimeout(autoBackupTimer);
    autoBackupTimer = null;
  }

  if (typeof getSettingFn !== 'function') return;

  const isEnabled = String(getSettingFn('autoBackupEnabled')) === 'true' || getSettingFn('autoBackupEnabled') === true;
  if (!isEnabled) {
    return;
  }

  const intervalHours = Number(getSettingFn('backupIntervalHours')) || 24;
  const retentionCount = Number(getSettingFn('backupRetentionCount')) || 7;
  const intervalMs = Math.max(1, intervalHours) * 3600 * 1000;

  // Lập lịch cho lần chạy tiếp theo
  autoBackupTimer = setTimeout(async () => {
    try {
      await runAutoBackupCycle(retentionCount);
    } catch (e) {
      // Failure safety: Log ngắn gọn, không crash
      console.error('Auto backup execution error (will retry next interval)');
    } finally {
      // Tự động lên lịch cho chu kỳ kế tiếp
      scheduleAutoBackup(getSettingFn);
    }
  }, intervalMs);
}

/**
 * Khôi phục Database từ một file backup hợp lệ trong thư mục backups
 * @param {string} filename - Tên file backup (vd: backup_2026-08-31T18-50-00-123Z.db)
 * @returns {Promise<{ success: boolean, restoredFrom: string, safetyBackup: string }>}
 */
export async function restoreBackup(filename) {
  // 1. Kiểm tra bảo mật Path Traversal (Chặn tuyệt đối ../ hoặc dấu phân cách path)
  if (!filename || typeof filename !== 'string') {
    throw new Error('Tên file backup không hợp lệ');
  }

  const sanitizedFilename = path.basename(filename);
  if (sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Đường dẫn file không hợp lệ hoặc chứa ký tự bị cấm');
  }

  if (!filename.endsWith('.db')) {
    throw new Error('File backup phải có định dạng .db');
  }

  const backupFilePath = path.join(BACKUP_DIR, sanitizedFilename);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error('File backup không tồn tại');
  }

  // Validate file backup có header SQLite hợp lệ
  const fd = fs.openSync(backupFilePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  const headerStr = buffer.toString('utf8', 0, 16);
  if (!headerStr.startsWith('SQLite format 3')) {
    throw new Error('File sao lưu không phải là database SQLite hợp lệ');
  }

  // 2. Tạo Safety Backup của database hiện tại trước khi restore
  const safety = await createBackup('safety');

  // 3. Thực hiện Restore: Đóng kết nối tạm thời / flush WAL, thay thế file DB và load lại Cache
  try {
    // Đóng hoặc flush DB
    try {
      await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (e) {}

    // Copy file backup đè lên lab.db
    fs.copyFileSync(backupFilePath, DB_PATH);

    // Tải lại dữ liệu từ DB vào Cache RAM
    await reloadCacheFromDb();

    return {
      success: true,
      restoredFrom: sanitizedFilename,
      safetyBackup: safety.filename
    };
  } catch (err) {
    console.error('Lỗi trong quá trình restore database:', err);
    // Nếu có lỗi, cố gắng restore lại safety backup
    try {
      fs.copyFileSync(safety.filepath, DB_PATH);
      await reloadCacheFromDb();
    } catch (revertErr) {
      console.error('Không thể tự động rollback sau lỗi restore:', revertErr);
    }
    throw new Error('Không thể khôi phục cơ sở dữ liệu: ' + err.message);
  }
}
