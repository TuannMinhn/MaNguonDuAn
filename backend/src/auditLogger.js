import { v4 as uuidv4 } from 'uuid';
import { readCollection, writeCollection } from './db.js';

// Danh sách các key nhạy cảm cần loại bỏ / che giấu
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'adminpassword',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cardsecret',
  'apikey',
  'privatekey'
]);

/**
 * Đệ quy loại bỏ / redact các trường dữ liệu nhạy cảm
 * Không làm thay đổi (mutate) đối tượng gốc
 * @param {any} data - Dữ liệu đầu vào
 * @returns {any} - Dữ liệu đã được làm sạch
 */
export function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle Date
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Array
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle Object
  const sanitized = {};
  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  return sanitized;
}

/**
 * Ghi nhận một sự kiện kiểm toán hệ thống (Audit Log)
 * - Tự động trích xuất Actor từ req.user (JWT)
 * - Không tin tưởng actorUserId/role từ client
 * - Tự động làm sạch dữ liệu nhạy cảm
 * - Ghi non-blocking an toàn
 *
 * @param {object} [req=null] - Express Request object
 * @param {object} options
 * @param {string} options.action - Loại hành động (vd: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'RESTORE')
 * @param {string} options.targetType - Loại đối tượng (vd: 'equipment', 'user', 'settings')
 * @param {string} [options.targetId=null] - ID của đối tượng
 * @param {any} [options.oldValue=null] - Dữ liệu trước khi thay đổi (hoặc diff)
 * @param {any} [options.newValue=null] - Dữ liệu sau khi thay đổi (hoặc diff)
 * @param {any} [options.metadata=null] - Dữ liệu bổ sung
 * @param {boolean} [options.success=true] - Trạng thái thành công hay thất bại
 * @returns {object|null} - Bản ghi audit đã được tạo
 */
export function logAuditEvent(req, {
  action,
  targetType,
  targetId = null,
  oldValue = null,
  newValue = null,
  metadata = null,
  success = true
}) {
  try {
    if (!action || !targetType) {
      console.warn('[AUDIT] Bỏ qua log do thiếu action hoặc targetType');
      return null;
    }

    // 1. Trích xuất thông tin Actor an toàn từ req.user (JWT)
    let actorUserId = null;
    let actorMssv = null;
    let actorName = 'System';
    let actorRole = 'system';

    if (req && req.user) {
      actorUserId = req.user.id ? String(req.user.id) : null;
      actorMssv = req.user.mssv ? String(req.user.mssv) : null;
      actorName = req.user.name ? String(req.user.name) : (req.user.mssv || 'Authenticated User');
      actorRole = req.user.role ? String(req.user.role) : 'student';
    } else if (req && req.headers && req.headers['x-kiosk-client']) {
      actorName = 'Kiosk Station';
      actorRole = 'kiosk';
    }

    // 2. Làm sạch dữ liệu trước khi lưu
    const sanitizedOld = oldValue !== null ? sanitizeData(oldValue) : null;
    const sanitizedNew = newValue !== null ? sanitizeData(newValue) : null;
    const sanitizedMeta = metadata !== null ? sanitizeData(metadata) : null;

    // 3. Tạo bản ghi audit
    const newLog = {
      id: uuidv4(),
      actorUserId,
      actorMssv,
      actorName,
      actorRole,
      action: String(action).toUpperCase(),
      targetType: String(targetType).toLowerCase(),
      targetId: targetId ? String(targetId) : null,
      oldValue: sanitizedOld,
      newValue: sanitizedNew,
      metadata: sanitizedMeta,
      success: Boolean(success),
      createdAt: new Date().toISOString()
    };

    // 4. Ghi vào collection audit_logs (Non-blocking & An toàn)
    const logs = readCollection('audit_logs', []);
    logs.push(newLog);
    writeCollection('audit_logs', logs);

    return newLog;
  } catch (err) {
    // Non-blocking: Bắt toàn bộ lỗi, không làm crash server hay ảnh hưởng flow chính
    console.error('[AUDIT ERROR] Lỗi không chặn khi ghi audit log:', err.message);
    return null;
  }
}
