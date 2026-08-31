import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory connection pool for Server-Sent Events (SSE)
 * Key: clientId (string)
 * Value: {
 *   clientId: string,
 *   userId: string,
 *   mssv: string,
 *   role: string,
 *   connectedAt: string,
 *   res: http.ServerResponse,
 *   heartbeatTimer: NodeJS.Timeout
 * }
 */
const clients = new Map();

/**
 * Kiểm tra quyền nhận notification dựa trên role và thông tin details của notification
 * @param {Object} client
 * @param {Object} notification
 * @returns {boolean}
 */
export function canClientReceiveNotification(client, notification) {
  if (!client || !notification) return false;

  const role = client.role;
  // Super admin & Manager nhận toàn bộ thông báo hệ thống và vận hành
  if (role === 'super_admin' || role === 'manager') {
    return true;
  }

  // Student chỉ nhận thông báo liên quan trực tiếp đến mình hoặc broadcast chung
  if (role === 'student') {
    const details = notification.details;
    if (!details) return true; // Thông báo chung broadcast
    if (details.mssv && details.mssv === client.mssv) return true;
    if (details.representativeMssv && details.representativeMssv === client.mssv) return true;
    if (details.members && Array.isArray(details.members)) {
      return details.members.some(m => (typeof m === 'string' ? m : m?.mssv) === client.mssv);
    }
    // Nếu details có chứa mssv hoặc members nhưng không khớp với client -> không nhận
    if (details.mssv || details.representativeMssv || (details.members && details.members.length > 0)) {
      return false;
    }
    return true; // Broadcast nếu không chỉ định đối tượng cụ thể
  }

  return false;
}

/**
 * Đăng ký một SSE client mới, thiết lập heartbeat và cleanup
 * @param {Object} params
 * @param {Object} params.user { id, mssv, role, normalizedRole }
 * @param {http.ServerResponse} params.res
 * @param {http.IncomingMessage} params.req
 * @param {number} [heartbeatIntervalMs=25000]
 * @returns {string} clientId
 */
export function registerClient({ user, res, req, heartbeatIntervalMs = 25000 }) {
  const clientId = uuidv4();
  const normalizedRole = user.normalizedRole || 'student';

  // Thiết lập SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Chống buffer trên reverse proxy (Nginx)
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Gửi sự kiện ban đầu xác nhận kết nối thành công (không gửi token hay sensitive data)
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Thiết lập Heartbeat timer duy nhất cho client này
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (err) {
      cleanupClient(clientId);
    }
  }, heartbeatIntervalMs);

  const clientData = {
    clientId,
    userId: user.id || null,
    mssv: user.mssv || null,
    role: normalizedRole,
    connectedAt: new Date().toISOString(),
    res,
    heartbeatTimer
  };

  clients.set(clientId, clientData);

  // Lắng nghe đóng kết nối hoặc lỗi để dọn dẹp
  const handleClose = () => {
    cleanupClient(clientId);
  };

  req.on('close', handleClose);
  req.on('error', handleClose);
  res.on('error', handleClose);

  return clientId;
}

/**
 * Hủy và dọn dẹp client khỏi connection pool an toàn
 * @param {string} clientId
 */
export function cleanupClient(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  if (client.heartbeatTimer) {
    clearInterval(client.heartbeatTimer);
  }

  try {
    if (!client.res.writableEnded) {
      client.res.end();
    }
  } catch (err) {}

  clients.delete(clientId);
}

/**
 * Broadcast notification tới các client đủ quyền (được xuất để sẵn sàng cho bước tiếp theo)
 * @param {Object} notification
 * @returns {number} Số client đã nhận notification
 */
export function broadcastNotification(notification) {
  if (!notification || clients.size === 0) return 0;

  let sentCount = 0;
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;

  for (const [clientId, client] of clients.entries()) {
    if (canClientReceiveNotification(client, notification)) {
      try {
        client.res.write(payload);
        sentCount++;
      } catch (err) {
        cleanupClient(clientId);
      }
    }
  }

  return sentCount;
}

/**
 * Lấy số lượng active connections hiện tại (phục vụ metrics/testing)
 * @returns {number}
 */
export function getActiveConnectionCount() {
  return clients.size;
}

/**
 * Lấy danh sách client active (không chứa sensitive info hoặc socket reference)
 * @returns {Array}
 */
export function getActiveClientsSummary() {
  return Array.from(clients.values()).map(c => ({
    clientId: c.clientId,
    userId: c.userId,
    mssv: c.mssv,
    role: c.role,
    connectedAt: c.connectedAt
  }));
}
