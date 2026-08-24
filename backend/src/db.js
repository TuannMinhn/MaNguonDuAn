import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const cache = {};

/**
 * Đọc dữ liệu từ file JSON. Nếu file chưa tồn tại, tạo mới với nội dung [] hoặc dữ liệu mặc định.
 */
export function readCollection(collectionName, defaultData = []) {
  if (cache[collectionName]) {
    return cache[collectionName];
  }
  
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    writeCollection(collectionName, defaultData);
    return defaultData;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(content || '[]');
    cache[collectionName] = parsedData;
    return parsedData;
  } catch (error) {
    console.error(`Lỗi khi đọc collection ${collectionName}:`, error);
    return defaultData;
  }
}

/**
 * Ghi dữ liệu nguyên tử (atomic write) vào file JSON nhằm tránh hỏng file khi ghi gián đoạn.
 */
export function writeCollection(collectionName, data) {
  // Cập nhật Cache ngay lập tức để các request sau đọc được tức thì (O(1))
  cache[collectionName] = data;

  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  const tempPath = `${filePath}.tmp`;
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`Lỗi khi ghi collection ${collectionName}:`, error);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}
