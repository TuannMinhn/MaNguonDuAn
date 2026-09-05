import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo đối tượng PowerPoint
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9 chuẩn Widescreen)

// Định nghĩa bảng màu thiết kế LIGHT ACADEMIC THEME (Sang trọng, sáng sủa, chuẩn Hội đồng)
const THEME = {
  bg: 'F8FAFC',          // Nền Slate 50 sáng sủa, thanh lịch
  cardBg: 'FFFFFF',      // Nền thẻ trắng tinh khiết
  cardBorder: 'CBD5E1',  // Viền thẻ xám nhạt tinh tế
  accentBlue: '2563EB',  // Xanh dương chủ đạo
  accentCyan: '0284C7',  // Xanh ngọc
  accentGreen: '16A34A', // Xanh lá cây
  accentAmber: 'D97706', // Vàng cam ấm
  accentRed: 'DC2626',   // Đỏ nhấn
  accentPurple: '7C3AED',// Tím hiện đại
  textDark: '0F172A',    // Chữ chính đen tuyền rõ nét (WCAG AAA)
  textMuted: '475569',   // Chữ phụ xám trung tính dễ đọc
  textWhite: 'FFFFFF',
  gold: 'B45309'
};

const TOTAL_SLIDES = 14;

// Helper tạo Slide Header chuẩn Light Mode
function addSlideHeader(slide, category, title) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08,
    fill: { color: THEME.accentBlue }
  });

  slide.addText(category.toUpperCase(), {
    x: 0.8, y: 0.4, w: 8.0, h: 0.3,
    fontSize: 10, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });

  slide.addText(title, {
    x: 0.8, y: 0.65, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: THEME.textDark, fontFace: 'Segoe UI'
  });
}

// Helper tạo Footer chuẩn Light Mode
function addSlideFooter(slide, currentSlide) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8, y: 7.0, w: 11.73, h: 0,
    line: { color: 'CBD5E1', width: 1 }
  });

  slide.addText('HỆ THỐNG QUẢN LÝ PHÒNG LAB & KHO THIẾT BỊ CLB TIN HỌC', {
    x: 0.8, y: 7.05, w: 8.0, h: 0.35,
    fontSize: 9, bold: true, color: THEME.textMuted, fontFace: 'Segoe UI'
  });

  slide.addText(`${currentSlide} / ${TOTAL_SLIDES}`, {
    x: 10.53, y: 7.05, w: 2.0, h: 0.35,
    fontSize: 9, bold: true, align: 'right', color: THEME.accentBlue, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 1: TRANG TIÊU ĐỀ (TITLE SLIDE)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: 'F1F5F9' };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 0.8, w: 11.73, h: 5.8,
    fill: { color: THEME.cardBg },
    line: { color: 'CBD5E1', width: 1.5 },
    radius: 12
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 0.8, w: 11.73, h: 0.15,
    fill: { color: THEME.accentBlue }
  });

  slide.addText('BÁO CÁO THỰC TẬP TỐT NGHIỆP', {
    x: 1.2, y: 1.3, w: 10.93, h: 0.4,
    fontSize: 13, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });

  slide.addText('XÂY DỰNG HỆ THỐNG QUẢN LÝ PHÒNG LAB\nVÀ KHO THIẾT BỊ TỰ PHỤC VỤ CLB TIN HỌC', {
    x: 1.2, y: 1.8, w: 10.93, h: 1.6,
    fontSize: 26, bold: true, color: THEME.textDark, fontFace: 'Segoe UI', lineSpacing: 34
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 1.2, y: 3.6, w: 10.93, h: 0,
    line: { color: THEME.accentBlue, width: 2 }
  });

  slide.addText([
    { text: 'Sinh viên thực hiện: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Trịnh Vũ Tuấn Minh\n', options: { color: THEME.accentBlue, bold: true } },
    { text: 'Mã số sinh viên: ', options: { bold: true, color: THEME.textDark } },
    { text: '20220001\n', options: { color: THEME.textMuted } },
    { text: 'Chuyên ngành: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Công nghệ Thông tin / Kỹ thuật Phần mềm', options: { color: THEME.textMuted } }
  ], {
    x: 1.2, y: 3.9, w: 5.5, h: 2.2,
    fontSize: 12, fontFace: 'Segoe UI', lineSpacing: 22
  });

  slide.addText([
    { text: 'Giảng viên hướng dẫn: ', options: { bold: true, color: THEME.textDark } },
    { text: 'TS. Nguyễn Văn A\n', options: { color: THEME.accentBlue, bold: true } },
    { text: 'Đơn vị thực tập: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Câu lạc bộ Tin học & Phòng Lab Nghiên cứu\n', options: { color: THEME.textMuted } },
    { text: 'Thời gian thực hiện: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Tháng 02/2026 – Tháng 05/2026', options: { color: THEME.textMuted } }
  ], {
    x: 6.8, y: 3.9, w: 5.5, h: 2.2,
    fontSize: 12, fontFace: 'Segoe UI', lineSpacing: 22
  });
}

// ==========================================
// SLIDE 2: LÝ DO CHỌN ĐỀ TÀI & MỤC TIÊU
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 1: Tổng quan', 'Tính Cấp Thiết & Mục Tiêu Nghiên Cứu');
  addSlideFooter(slide, 2);

  // Card 1: Tính cấp thiết
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'FEF2F2' },
    line: { color: THEME.accentRed, width: 1.5 },
    radius: 8
  });
  slide.addText('TÍNH CẤP THIẾT THỰC TẾ', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 14, bold: true, color: THEME.accentRed, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Quản lý thủ công: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Ghi sổ tay/Excel rời rạc, dễ thất lạc số liệu.\n\n', options: { color: THEME.textMuted } },
    { text: '• Thất thoát thiết bị: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Không kiểm soát được sinh viên mượn và hạn trả đồ.\n\n', options: { color: THEME.textMuted } },
    { text: '• Xung đột lịch thực hành: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Trùng ca học, thiếu minh bạch bàn giao phòng Lab.\n\n', options: { color: THEME.textMuted } },
    { text: '• Thiếu nhân lực trực: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Không thể mở cửa quầy phục vụ 24/7 liên tục.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Card 2: Mục tiêu cốt lõi
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'F0FDF4' },
    line: { color: THEME.accentGreen, width: 1.5 },
    radius: 8
  });
  slide.addText('MỤC TIÊU CỐT LÕI ĐẠT ĐƯỢC', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 14, bold: true, color: THEME.accentGreen, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Số hóa 100% quy trình: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Quản lý tập trung kho thiết bị, phòng Lab và sinh viên.\n\n', options: { color: THEME.textMuted } },
    { text: '• Trạm Kiosk tự phục vụ: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Chạm thẻ RFID sinh viên mượn trả < 15 giây.\n\n', options: { color: THEME.textMuted } },
    { text: '• Đồng bộ Realtime SSE: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Cập nhật tức thì giữa Kiosk và Web Admin không độ trễ.\n\n', options: { color: THEME.textMuted } },
    { text: '• Hệ thống điểm uy tín: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Gamification tự động đánh giá chuyên cần, giảm trễ hạn.', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 3: KHẢO SÁT HIỆN TRẠNG & BÀI TOÁN CẦN GIẢI QUYẾT
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 1: Tổng quan', 'Hiện Trạng Vận Hành & Bài Toán Cần Giải Quyết');
  addSlideFooter(slide, 3);

  const painPoints = [
    {
      title: 'QUY TRÌNH THỦ CÔNG',
      tag: 'GHI CHÉP SỔ TAY',
      desc: 'Mượn trả qua sổ sách và file Excel rời rạc, tốn thời gian đối chiếu giấy tờ và kiểm đếm từng linh kiện.',
      color: THEME.accentRed,
      tint: 'FEF2F2'
    },
    {
      title: 'NGUY CƠ THẤT THOÁT',
      tag: 'KHÓ TRUY VẾT',
      desc: 'Linh kiện nhỏ lẻ dễ thất lạc hoặc hỏng hóc, không có cơ chế ràng buộc trách nhiệm người sử dụng.',
      color: THEME.accentAmber,
      tint: 'FFFBEB'
    },
    {
      title: 'BỊ ĐỘNG NHÂN LỰC',
      tag: 'PHỤ THUỘC LỊCH TRỰC',
      desc: 'Cần người túc trực quầy liên tục để mở cửa và giao nhận, không thể phục vụ sinh viên tự do ngoài giờ.',
      color: THEME.accentPurple,
      tint: 'FAF5FF'
    }
  ];

  painPoints.forEach((p, idx) => {
    const xPos = 0.8 + idx * 4.0;
    slide.addShape(pptx.ShapeType.rect, {
      x: xPos, y: 1.6, w: 3.73, h: 4.8,
      fill: { color: p.tint },
      line: { color: p.color, width: 1.5 },
      radius: 8
    });

    slide.addText(p.title, {
      x: xPos + 0.2, y: 1.9, w: 3.33, h: 0.4,
      fontSize: 13, bold: true, color: p.color, fontFace: 'Segoe UI', align: 'center'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: xPos + 0.3, y: 2.5, w: 3.13, h: 0.8,
      fill: { color: THEME.cardBg },
      line: { color: p.color, width: 1 },
      radius: 6
    });
    slide.addText(p.tag, {
      x: xPos + 0.3, y: 2.65, w: 3.13, h: 0.5,
      fontSize: 13, bold: true, color: p.color, fontFace: 'Segoe UI', align: 'center'
    });

    slide.addText(p.desc, {
      x: xPos + 0.3, y: 3.6, w: 3.13, h: 2.5,
      fontSize: 11.5, color: THEME.textMuted, fontFace: 'Segoe UI', lineSpacing: 20, align: 'center'
    });
  });
}

// ==========================================
// SLIDE 4: PHẠM VI NGHIÊN CỨU & ĐỐI TƯỢNG PHỤC VỤ
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 1: Tổng quan', 'Phạm Vi Đề Tài & Phân Cấp Vai Trò Trong CLB');
  addSlideFooter(slide, 4);

  const roles = [
    { title: 'CHỦ NHIỆM CLB', sub: 'Quản trị viên tối cao', desc: '• Toàn quyền quản trị hệ thống\n• Phân quyền & Quản lý nhân sự\n• Cấu hình hệ thống & Sao lưu DB', color: THEME.accentRed, tint: 'FEF2F2' },
    { title: 'TRƯỞNG BAN KỸ THUẬT & QUẢN LÝ KHO', sub: 'Ban điều hành kỹ thuật', desc: '• Quản lý 360+ thiết bị, tủ kệ kho\n• Duyệt lịch ca trực & Phòng Lab\n• Xử lý báo hỏng, xuất báo cáo', color: THEME.accentBlue, tint: 'EFF6FF' },
    { title: 'THÀNH VIÊN NGHIÊN CỨU', sub: 'Thành viên chính thức CLB', desc: '• Chạm thẻ RFID mượn trả tự phục vụ\n• Đăng ký đặt phòng học theo nhóm\n• Hạn mức mượn cao & Tích điểm uy tín', color: THEME.accentGreen, tint: 'F0FDF4' },
    { title: 'CỘNG TÁC VIÊN / SINH VIÊN', sub: 'Thành viên thực hành', desc: '• Tự phục vụ mượn trả tại quầy Kiosk\n• Tra cứu vị trí linh kiện trong tủ\n• Tích lũy điểm chuyên cần qua RFID', color: THEME.accentPurple, tint: 'FAF5FF' }
  ];

  roles.forEach((r, idx) => {
    const xPos = 0.8 + (idx % 2) * 6.0;
    const yPos = 1.6 + Math.floor(idx / 2) * 2.5;

    slide.addShape(pptx.ShapeType.rect, {
      x: xPos, y: yPos, w: 5.73, h: 2.25,
      fill: { color: r.tint },
      line: { color: r.color, width: 1.5 },
      radius: 8
    });

    slide.addText(r.title, {
      x: xPos + 0.3, y: yPos + 0.2, w: 5.13, h: 0.35,
      fontSize: 13, bold: true, color: r.color, fontFace: 'Segoe UI'
    });
    slide.addText(r.sub, {
      x: xPos + 0.3, y: yPos + 0.55, w: 5.13, h: 0.3,
      fontSize: 10, italic: true, color: THEME.textMuted, fontFace: 'Segoe UI'
    });

    slide.addText(r.desc, {
      x: xPos + 0.3, y: yPos + 0.95, w: 5.13, h: 1.1,
      fontSize: 11, color: THEME.textDark, fontFace: 'Segoe UI', lineSpacing: 18
    });
  });
}

// ==========================================
// SLIDE 5: KIẾN TRÚC TỔNG THỂ HỆ THỐNG (3-TIER)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 2: Kiến trúc', 'Kiến Trúc Tổng Thể Hệ Thống (3-Tier Architecture)');
  addSlideFooter(slide, 5);

  const tiers = [
    {
      title: 'TẦNG GIAO DIỆN (UI / FRONTEND)',
      tech: 'React 19 + Vite + CSS Tokens',
      items: ['• Single Page Application (SPA) siêu nhẹ', '• Giao diện Light Academic chuẩn UX 44px', '• Kiosk tự phục vụ cảm ứng chạm', '• Recharts trực quan hóa Dashboard'],
      color: THEME.accentBlue,
      tint: 'EFF6FF'
    },
    {
      title: 'TẦNG NGHIỆP VỤ (BACKEND / API)',
      tech: 'Node.js + Express.js Engine',
      items: ['• RESTful API xử lý mượn trả & đặt phòng', '• Server-Sent Events (SSE) stream realtime', '• JWT Authentication & Phân quyền RBAC', '• Audit Logger ghi vết an ninh 100%'],
      color: THEME.accentCyan,
      tint: 'F0F9FF'
    },
    {
      title: 'TẦNG DỮ LIỆU & PHẦN CỨNG',
      tech: 'SQLite ACID + RFID RC522',
      items: ['• Cơ sở dữ liệu quan hệ ACID an toàn', '• In-memory Cache tra cứu siêu tốc O(1)', '• Đầu đọc thẻ RFID RC522 chuẩn 13.56MHz', '• Tự động sao lưu Database định kỳ'],
      color: THEME.accentAmber,
      tint: 'FFFBEB'
    }
  ];

  tiers.forEach((t, i) => {
    const x = 0.8 + i * 4.0;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.8, w: 3.7, h: 4.8,
      fill: { color: t.tint },
      line: { color: t.color, width: 2 },
      rectRadius: 0.1
    });

    slide.addText(t.title, {
      x: x + 0.15, y: 2.0, w: 3.4, h: 0.55,
      fontSize: 12, bold: true, color: t.color, fontFace: 'Segoe UI',
      align: 'center'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.3, y: 2.65, w: 3.1, h: 0.45,
      fill: { color: THEME.cardBg },
      line: { color: THEME.border, width: 1 },
      rectRadius: 0.05
    });
    slide.addText(t.tech, {
      x: x + 0.3, y: 2.65, w: 3.1, h: 0.45,
      fontSize: 10, bold: true, color: THEME.textDark, fontFace: 'Segoe UI',
      align: 'center'
    });

    slide.addText(t.items.join('\n\n'), {
      x: x + 0.25, y: 3.3, w: 3.2, h: 3.1,
      fontSize: 11, color: THEME.textMuted, fontFace: 'Segoe UI',
      lineSpacingMultiple: 1.2
    });
  });
}

// ==========================================
// SLIDE 6: CÔNG NGHỆ CỐT LÕI & ĐỒNG BỘ REALTIME
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 2: Kiến trúc', 'Công Nghệ Cốt Lõi & Đồng Bộ Realtime SSE');
  addSlideFooter(slide, 6);

  // Khối 1: Realtime SSE
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'EFF6FF' },
    line: { color: THEME.accentBlue, width: 1.5 },
    radius: 8
  });
  slide.addText('ĐỒNG BỘ SERVER-SENT EVENTS (SSE)', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• 1 Kết nối HTTP duy nhất: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Server chủ động đẩy dữ liệu khi có sự kiện mượn trả/quét thẻ.\n\n', options: { color: THEME.textMuted } },
    { text: '• Tiết kiệm 90% băng thông: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Loại bỏ hoàn toàn cơ chế Polling gửi request liên tục làm nghẽn CPU.\n\n', options: { color: THEME.textMuted } },
    { text: '• Độ trễ phản hồi < 50ms: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Màn hình Kiosk và Web Admin tức thì đồng bộ trạng thái kho đồ.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Khối 2: Database & Performance
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'F0FDF4' },
    line: { color: THEME.accentGreen, width: 1.5 },
    radius: 8
  });
  slide.addText('CƠ SỞ DỮ LIỆU & BỘ ĐỆM CACHE', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentGreen, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• SQLite chuẩn ACID: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Lưu trữ an toàn giao dịch, đóng gói 1 file duy nhất dễ sao lưu.\n\n', options: { color: THEME.textMuted } },
    { text: '• In-Memory Hash Map: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Bộ đệm dữ liệu trên RAM giúp tra cứu lịch trực và thiết bị với độ phức tạp O(1).\n\n', options: { color: THEME.textMuted } },
    { text: '• 6 Bảng quan hệ chuẩn 3NF: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Users, Equipment, BorrowTickets, RoomBookings, Maintenance, AuditLogs.', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 7: VÒNG ĐỜI QUẢN LÝ THIẾT BỊ & QUY TRÌNH MƯỢN TRẢ
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 3: Nghiệp vụ', 'Vòng Đời Quản Lý Thiết Bị & Quy Trình Mượn - Trả');
  addSlideFooter(slide, 7);

  const steps = [
    { num: '01', title: 'ĐĂNG KÝ MƯỢN', desc: 'Sinh viên đặt online trên Web hoặc chạm thẻ RFID trực tiếp tại quầy Kiosk.', color: THEME.accentBlue },
    { num: '02', title: 'DUYỆT & GIAO NHẬN', desc: 'Thủ kho quét mã Barcode thiết bị, hệ thống tự động kiểm tra tồn kho.', color: THEME.accentCyan },
    { num: '03', title: 'TRẢ ĐỒ & ĐÁNH GIÁ', desc: 'Quẹt thẻ xác nhận trả đồ, ghi nhận tình trạng hoạt động của linh kiện.', color: THEME.accentGreen },
    { num: '04', title: 'TỰ ĐỘNG ĐÓNG PHIẾU', desc: 'Hệ thống cập nhật số lượng tồn kho và cộng điểm uy tín cho sinh viên.', color: THEME.accentAmber }
  ];

  steps.forEach((s, idx) => {
    const xPos = 0.8 + idx * 3.0;
    slide.addShape(pptx.ShapeType.rect, {
      x: xPos, y: 1.6, w: 2.73, h: 4.8,
      fill: { color: THEME.cardBg },
      line: { color: s.color, width: 1.5 },
      radius: 8
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: xPos + 0.86, y: 1.9, w: 1.0, h: 0.6,
      fill: { color: s.color },
      radius: 6
    });
    slide.addText(s.num, {
      x: xPos + 0.86, y: 1.95, w: 1.0, h: 0.5,
      fontSize: 16, bold: true, color: THEME.textWhite, fontFace: 'Segoe UI', align: 'center'
    });

    slide.addText(s.title, {
      x: xPos + 0.15, y: 2.7, w: 2.43, h: 0.6,
      fontSize: 12, bold: true, color: s.color, fontFace: 'Segoe UI', align: 'center'
    });

    slide.addText(s.desc, {
      x: xPos + 0.2, y: 3.4, w: 2.33, h: 2.6,
      fontSize: 11, color: THEME.textMuted, fontFace: 'Segoe UI', lineSpacing: 18, align: 'center'
    });
  });
}

// ==========================================
// SLIDE 8: TRẠM KIOSK TỰ PHỤC VỤ & ĐẶT PHÒNG THỰC HÀNH
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 3: Nghiệp vụ', 'Trạm Kiosk Tự Phục Vụ & Đặt Phòng Thực Hành');
  addSlideFooter(slide, 8);

  // Cột 1: Kiosk RFID & Điểm uy tín
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'FAF5FF' },
    line: { color: THEME.accentPurple, width: 1.5 },
    radius: 8
  });
  slide.addText('KIOSK TỰ PHỤC VỤ & ĐIỂM UY TÍN', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentPurple, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Chạm thẻ RFID < 120ms: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Module RC522 nhận diện thẻ sinh viên tự động mở phiên làm việc.\n\n', options: { color: THEME.textMuted } },
    { text: '• Giao diện cảm ứng 44x44px: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Thiết kế nút chạm cỡ lớn, tự khóa sau 30s không thao tác.\n\n', options: { color: THEME.textMuted } },
    { text: '• Gamification Điểm uy tín: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Trả đúng hạn (+10đ), Trễ hạn (-15đ), Hỏng hóc (-50đ), tự động nâng hạng thành viên.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Cột 2: Đặt phòng Lab 36 ca
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'FFFBEB' },
    line: { color: THEME.accentAmber, width: 1.5 },
    radius: 8
  });
  slide.addText('ĐẶT PHÒNG THỰC HÀNH & CHỐNG TRÙNG LỊCH', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentAmber, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Ma trận 36 ca trực/tuần: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Trực quan hóa màu sắc phòng trống, đang học hoặc bảo trì.\n\n', options: { color: THEME.textMuted } },
    { text: '• Chống xung đột lịch (Conflict Free): ', options: { bold: true, color: THEME.textDark } },
    { text: 'Kiểm tra chéo tầng Frontend và Backend, ngăn 100% trùng lịch.\n\n', options: { color: THEME.textMuted } },
    { text: '• Quản lý nhóm học tập: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Đăng ký thực hành theo nhóm và chỉ định trưởng nhóm chịu trách nhiệm.', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 9: DASHBOARD GIÁM SÁT & NHẬT KÝ AN NINH (AUDIT LOGS)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 3: Nghiệp vụ', 'Dashboard Giám Sát & Nhật Ký An Ninh Bất Biến');
  addSlideFooter(slide, 9);

  // Cột 1: Dashboard KPIs
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'EFF6FF' },
    line: { color: THEME.accentBlue, width: 1.5 },
    radius: 8
  });
  slide.addText('DASHBOARD ĐIỀU HÀNH THỜI GIAN THỰC', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• 4 Chỉ số KPI cốt lõi: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Tổng 362 thiết bị, 48 đang mượn, 12 phòng Lab, 1,250 sinh viên.\n\n', options: { color: THEME.textMuted } },
    { text: '• Biểu đồ Recharts xu hướng: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Thống kê tần suất mượn thiết bị theo tuần và tỷ lệ sử dụng phòng.\n\n', options: { color: THEME.textMuted } },
    { text: '• Cảnh báo quá hạn tức thời: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Nhắc nhở thủ kho các phiếu mượn sắp đến hạn hoặc chậm hoàn trả.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Cột 2: Audit Logs & Backup
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'FEF2F2' },
    line: { color: THEME.accentRed, width: 1.5 },
    radius: 8
  });
  slide.addText('NHẬT KÝ AN NINH & SAO LƯU TỰ ĐỘNG', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentRed, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Ghi vết an ninh 100%: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Lưu trữ Actor MSSV, IP máy trạm, hành động và dấu vết thời gian.\n\n', options: { color: THEME.textMuted } },
    { text: '• Nhật ký bất biến (Immutable): ', options: { bold: true, color: THEME.textDark } },
    { text: 'Chống sửa đổi, chống chối bỏ trách nhiệm tuyệt đối.\n\n', options: { color: THEME.textMuted } },
    { text: '• Sao lưu tự động & Phục hồi 1-Click: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Auto-backup vào 00:00 hàng ngày, khôi phục dữ liệu tức thì khi gặp sự cố.', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 10: ĐIỂM NHẤN KỸ THUẬT: TỐI ƯU O(1) & AN TOÀN RBAC
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 4: Kỹ thuật', 'Điểm Nhấn Kỹ Thuật: Tối Ưu O(1) & Bảo Mật RBAC');
  addSlideFooter(slide, 10);

  // Cột 1: Tối ưu hiệu năng O(1)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'F0FDF4' },
    line: { color: THEME.accentGreen, width: 1.5 },
    radius: 8
  });
  slide.addText('TỐI ƯU HIỆU NĂNG TẦNG FRONTEND', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentGreen, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Tra cứu O(1) thay vì O(N*M): ', options: { bold: true, color: THEME.textDark } },
    { text: 'Chuyển dữ liệu mảng thành Map Record Dictionary trong React, giảm giật khung hình.\n\n', options: { color: THEME.textMuted } },
    { text: '• Duy trì 60 FPS mượt mà: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Kích hoạt Hardware Acceleration và loại bỏ Backdrop Blur nặng trên vùng cuộn lớn.\n\n', options: { color: THEME.textMuted } },
    { text: '• Debounce 300ms: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Tối ưu hóa ô tìm kiếm thiết bị, giảm 85% số lần re-render thừa.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Cột 2: Bảo mật RBAC & API
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'EFF6FF' },
    line: { color: THEME.accentBlue, width: 1.5 },
    radius: 8
  });
  slide.addText('AN TOÀN BẢO MẬT & PHÂN QUYỀN RBAC', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '• Mã hóa Bcrypt Salt 10: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Băm mật khẩu người dùng một chiều an toàn, chống lộ dữ liệu.\n\n', options: { color: THEME.textMuted } },
    { text: '• Xác thực JWT Stateless: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Token có thời hạn hợp lệ, Middleware chặn truy cập trái phép.\n\n', options: { color: THEME.textMuted } },
    { text: '• Chống tấn công mạng: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Ngăn chặn triệt để SQL Injection (Parameterized Query) và XSS (Data Sanitization).', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 11: KẾT QUẢ KIỂM THỬ TOÀN DIỆN (68/68 TEST CASES)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 5: Kết quả', 'Kết Quả Kiểm Thử Hệ Thống (68/68 Test Cases Pass)');
  addSlideFooter(slide, 11);

  const tests = [
    { name: 'UNIT TEST (LOGIC NGHIỆP VỤ)', result: '24 / 24 PASS (100%)', desc: 'Kiểm thử hàm tính điểm uy tín, kiểm tra trạng thái thiết bị, validate dữ liệu đầu vào.', color: THEME.accentBlue, tint: 'EFF6FF' },
    { name: 'INTEGRATION TEST (TÍCH HỢP)', result: '22 / 22 PASS (100%)', desc: 'Kiểm thử luồng mượn trả qua đầu đọc RFID RC522, đồng bộ dữ liệu Realtime SSE.', color: THEME.accentGreen, tint: 'F0FDF4' },
    { name: 'STRESS TEST (CHỊU TẢI ĐỒNG THỜI)', result: '12 / 12 PASS (100%)', desc: 'Mô phỏng 100 requests đồng thời mượn trả tại Kiosk, phản hồi trung bình < 85ms.', color: THEME.accentAmber, tint: 'FFFBEB' },
    { name: 'SECURITY TEST (BẢO MẬT HỆ THỐNG)', result: '10 / 10 PASS (100%)', desc: 'Kiểm tra chống SQL Injection, Bypass Auth, sửa đổi trái phép nhật ký an ninh.', color: THEME.accentPurple, tint: 'FAF5FF' }
  ];

  tests.forEach((t, idx) => {
    const xPos = 0.8 + (idx % 2) * 6.0;
    const yPos = 1.6 + Math.floor(idx / 2) * 2.5;

    slide.addShape(pptx.ShapeType.rect, {
      x: xPos, y: yPos, w: 5.73, h: 2.25,
      fill: { color: t.tint },
      line: { color: t.color, width: 1.5 },
      radius: 8
    });

    slide.addText(t.name, {
      x: xPos + 0.3, y: yPos + 0.2, w: 5.13, h: 0.35,
      fontSize: 12, bold: true, color: t.color, fontFace: 'Segoe UI'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: xPos + 0.3, y: yPos + 0.6, w: 2.5, h: 0.35,
      fill: { color: THEME.cardBg },
      line: { color: t.color, width: 1 },
      radius: 4
    });
    slide.addText(t.result, {
      x: xPos + 0.3, y: yPos + 0.62, w: 2.5, h: 0.35,
      fontSize: 10, bold: true, align: 'center', color: t.color, fontFace: 'Segoe UI'
    });

    slide.addText(t.desc, {
      x: xPos + 0.3, y: yPos + 1.05, w: 5.13, h: 1.0,
      fontSize: 11, color: THEME.textMuted, fontFace: 'Segoe UI', lineSpacing: 18
    });
  });
}

// ==========================================
// SLIDE 12: ĐÁNH GIÁ HIỆU QUẢ TRƯỚC VÀ SAU KHI TRIỂN KHAI
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 5: Kết quả', 'Hiệu Quả Thực Tế Trước & Sau Triển Khai');
  addSlideFooter(slide, 12);

  const metrics = [
    { title: 'THỜI GIAN MƯỢN TRẢ', before: '5 - 10 Phút / Lượt\n(Ghi chép thủ công)', after: '< 15 Giây / Lượt\n(Chạm RFID tự động)', rate: 'TỐI ƯU TỐC ĐỘ', color: THEME.accentGreen },
    { title: 'KIỂM SOÁT THIẾT BỊ', before: 'Dễ thất lạc linh kiện\n(Khó truy cứu)', after: 'Ghi vết 100% MSSV\n(Khóa bảo trì tức thì)', rate: 'MINH BẠCH 100%', color: THEME.accentBlue },
    { title: 'ĐỐI SOÁT TỒN KHO', before: 'Kiểm đếm chậm trễ\n(Sai lệch số sách)', after: 'Đồng bộ Realtime SSE\n(Chính xác tức thời)', rate: 'ĐỒNG BỘ TỨC THÌ', color: THEME.accentAmber },
    { title: 'NHÂN LỰC VẬN HÀNH', before: 'Phụ thuộc người trực\n(Không mở ngoài giờ)', after: 'Trạm Kiosk tự phục vụ\n(Hoạt động 24/7)', rate: 'CHỦ ĐỘNG 24/7', color: THEME.accentPurple }
  ];

  metrics.forEach((m, idx) => {
    const xPos = 0.8 + idx * 3.0;
    slide.addShape(pptx.ShapeType.rect, {
      x: xPos, y: 1.6, w: 2.73, h: 4.8,
      fill: { color: THEME.cardBg },
      line: { color: m.color, width: 1.5 },
      radius: 8
    });

    slide.addText(m.title, {
      x: xPos + 0.15, y: 1.85, w: 2.43, h: 0.5,
      fontSize: 12, bold: true, color: THEME.textDark, fontFace: 'Segoe UI', align: 'center'
    });

    // Before
    slide.addShape(pptx.ShapeType.rect, {
      x: xPos + 0.2, y: 2.45, w: 2.33, h: 0.9,
      fill: { color: 'FEF2F2' },
      radius: 4
    });
    slide.addText('TRƯỚC ĐÂY:', {
      x: xPos + 0.2, y: 2.5, w: 2.33, h: 0.25,
      fontSize: 9, bold: true, color: THEME.accentRed, fontFace: 'Segoe UI', align: 'center'
    });
    slide.addText(m.before, {
      x: xPos + 0.2, y: 2.75, w: 2.33, h: 0.55,
      fontSize: 10, color: THEME.textDark, fontFace: 'Segoe UI', align: 'center', lineSpacing: 14
    });

    // After
    slide.addShape(pptx.ShapeType.rect, {
      x: xPos + 0.2, y: 3.5, w: 2.33, h: 0.9,
      fill: { color: 'F0FDF4' },
      radius: 4
    });
    slide.addText('HIỆN TẠI:', {
      x: xPos + 0.2, y: 3.55, w: 2.33, h: 0.25,
      fontSize: 9, bold: true, color: THEME.accentGreen, fontFace: 'Segoe UI', align: 'center'
    });
    slide.addText(m.after, {
      x: xPos + 0.2, y: 3.8, w: 2.33, h: 0.55,
      fontSize: 10, bold: true, color: THEME.accentGreen, fontFace: 'Segoe UI', align: 'center', lineSpacing: 14
    });

    // Rate badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: xPos + 0.3, y: 4.6, w: 2.13, h: 0.5,
      fill: { color: m.color },
      radius: 6
    });
    slide.addText(m.rate, {
      x: xPos + 0.3, y: 4.65, w: 2.13, h: 0.4,
      fontSize: 10.5, bold: true, color: THEME.textWhite, fontFace: 'Segoe UI', align: 'center'
    });
  });
}

// ==========================================
// SLIDE 13: ĐÁNH GIÁ ĐỀ TÀI & HƯỚNG PHÁT TRIỂN TƯƠNG LAI
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: THEME.bg };
  addSlideHeader(slide, 'Chương 6: Kết luận', 'Đánh Giá Đề Tài & Hướng Phát Triển Tương Lai');
  addSlideFooter(slide, 13);

  // Cột 1: Ưu điểm & Hạn chế
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'EFF6FF' },
    line: { color: THEME.accentBlue, width: 1.5 },
    radius: 8
  });
  slide.addText('ƯU ĐIỂM & HẠN CHẾ CỦA ĐỀ TÀI', {
    x: 1.1, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentBlue, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '✓ Ưu điểm nổi bật: ', options: { bold: true, color: THEME.accentGreen } },
    { text: 'Hệ thống vận hành độc lập, chi phí phần cứng rẻ, giao diện chuẩn UX 44px dễ dùng, dữ liệu đồng bộ tức thì.\n\n', options: { color: THEME.textDark } },
    { text: '✓ Đạt mục tiêu đề ra: ', options: { bold: true, color: THEME.accentGreen } },
    { text: 'Giải quyết triệt để vấn đề mất thiết bị và quá tải nhân lực trực quầy.\n\n', options: { color: THEME.textDark } },
    { text: '✗ Hạn chế còn tồn tại: ', options: { bold: true, color: THEME.accentRed } },
    { text: 'Phụ thuộc vào thẻ cứng RFID vật lý; Chưa tự động mở khóa cửa phòng Lab bằng IoT.', options: { color: THEME.textMuted } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });

  // Cột 2: Hướng phát triển
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.83, y: 1.6, w: 5.7, h: 5.0,
    fill: { color: 'FAF5FF' },
    line: { color: THEME.accentPurple, width: 1.5 },
    radius: 8
  });
  slide.addText('HƯỚNG PHÁT TRIỂN & NÂNG CẤP', {
    x: 7.13, y: 1.85, w: 5.1, h: 0.4,
    fontSize: 13.5, bold: true, color: THEME.accentPurple, fontFace: 'Segoe UI'
  });
  slide.addText([
    { text: '1. AI FaceID Nhận Diện: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Nhận diện khuôn mặt sinh viên qua Camera không cần mang thẻ.\n\n', options: { color: THEME.textMuted } },
    { text: '2. IoT Smart Lock (MQTT): ', options: { bold: true, color: THEME.textDark } },
    { text: 'Kích hoạt rơ-le mở cửa phòng Lab tự động theo ca trực đã duyệt.\n\n', options: { color: THEME.textMuted } },
    { text: '3. Mobile App (iOS / Android): ', options: { bold: true, color: THEME.textDark } },
    { text: 'Quét QR Code nhận đồ và nhận thông báo Push Notification.\n\n', options: { color: THEME.textMuted } },
    { text: '4. Đồng bộ SSO Nhà Trường: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Liên thông tài khoản sinh viên qua giao thức OAuth2 / LDAP.', options: { color: THEME.textMuted } }
  ], {
    x: 7.13, y: 2.35, w: 5.1, h: 4.0,
    fontSize: 11.5, fontFace: 'Segoe UI'
  });
}

// ==========================================
// SLIDE 14: LỜI CẢM ƠN & PHIÊN HỎI ĐÁP (Q&A)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: 'F1F5F9' };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 0.8, w: 11.73, h: 5.8,
    fill: { color: THEME.cardBg },
    line: { color: 'CBD5E1', width: 1.5 },
    radius: 12
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 0.8, w: 11.73, h: 0.15,
    fill: { color: THEME.accentBlue }
  });

  slide.addText('CHÂN THÀNH CẢM ƠN QUÝ THẦY CÔ\nVÀ HỘI ĐỒNG ĐÃ LẮNG NGHE!', {
    x: 1.3, y: 1.8, w: 10.7, h: 1.5,
    fontSize: 26, bold: true, align: 'center', color: THEME.textDark, fontFace: 'Segoe UI', lineSpacing: 36
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.86, y: 3.5, w: 3.6, h: 0.7,
    fill: { color: THEME.accentBlue },
    radius: 8
  });
  slide.addText('Q & A / PHIÊN HỎI - ĐÁP', {
    x: 4.86, y: 3.5, w: 3.6, h: 0.7,
    fontSize: 14, bold: true, align: 'center', color: THEME.textWhite, fontFace: 'Segoe UI'
  });

  slide.addText([
    { text: 'Sinh viên thực hiện: ', options: { bold: true, color: THEME.textDark } },
    { text: 'Trịnh Vũ Tuấn Minh (MSSV: 20220001)\n', options: { color: THEME.accentBlue, bold: true } },
    { text: 'Email liên hệ: ', options: { bold: true, color: THEME.textDark } },
    { text: 'tuanminh.lab@university.edu.vn | Hotline: 0987.654.321\n', options: { color: THEME.textMuted } },
    { text: 'Source Code Repository: ', options: { bold: true, color: THEME.textDark } },
    { text: 'https://github.com/TuannMinhn/ThucTap_New', options: { color: THEME.accentCyan } }
  ], {
    x: 1.3, y: 4.5, w: 10.7, h: 1.5,
    fontSize: 12, align: 'center', fontFace: 'Segoe UI', lineSpacing: 22
  });
}

// Xuất file PowerPoint
const outputPath = path.join(__dirname, 'BaoCao_HeThong_QuanLy_PhongLab_14Slide.pptx');
pptx.writeFile({ fileName: outputPath })
  .then(() => {
    console.log('✅ Đã tạo thành công file PowerPoint 14 Slide chuẩn 10 phút:', outputPath);
  })
  .catch((err) => {
    console.error('❌ Lỗi khi xuất PowerPoint:', err.message);
  });
