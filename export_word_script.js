import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: 'Times New Roman',
          size: 26, // 13pt
          color: '1E293B',
        },
      },
    },
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: 'KỊCH BẢN THUYẾT TRÌNH BÁO CÁO THỰC TẬP TỐT NGHIỆP',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'ĐỀ TÀI: XÂY DỰNG HỆ THỐNG QUẢN LÝ PHÒNG LAB VÀ KHO THIẾT BỊ TỰ PHỤC VỤ CLB TIN HỌC\n',
              bold: true,
              color: '2563EB',
            }),
            new TextRun({
              text: 'Sinh viên thực hiện: Trịnh Vũ Tuấn Minh (MSSV: 20220001) | GVHD: TS. Nguyễn Văn A\n',
              italics: true,
              color: '64748B',
            }),
            new TextRun({
              text: 'TÀI LIỆU LỜI THOẠI & BỘ CÂU HỎI PHẢN BIỆN CHUẨN 15 SLIDE (8–10 PHÚT)\n',
              bold: true,
              color: '16A34A',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),

        // SLIDE 1
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 1: TRANG BÌA HỘI ĐỒNG ĐÁNH GIÁ (TRƯỜNG ĐH LẠC HỒNG)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 15 – 20 giây | 👀 Màn hình: Logo trường, Hội đồng đánh giá\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Kính thưa Quý Thầy Cô trong Hội đồng đánh giá và các bạn sinh viên có mặt trong buổi báo cáo hôm nay. Lời đầu tiên, em xin gửi lời chào trân trọng và lời chúc sức khỏe tốt đẹp nhất đến toàn thể Quý Thầy Cô trong Hội đồng ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 2
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 2: TÊN ĐỀ TÀI & THÔNG TIN THỰC HIỆN', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 25 – 30 giây | 👀 Màn hình: Tên đề tài, Tên sinh viên, MSSV, GVHD\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Em tên là Trịnh Vũ Tuấn Minh, sinh viên chuyên ngành Công nghệ Thông tin. Hôm nay, em xin phép được báo cáo kết quả đề tài thực tập tốt nghiệp: \'XÂY DỰNG HỆ THỐNG QUẢN LÝ PHÒNG LAB VÀ KHO THIẾT BỊ TỰ PHỤC VỤ CLB TIN HỌC\', được thực hiện dưới sự hướng dẫn của TS. Nguyễn Văn A. Sau đây em xin bắt đầu phần trình bày của mình ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 3
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 3: TÍNH CẤP THIẾT & MỤC TIÊU NGHIÊN CỨU', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 – 50 giây | 👀 Màn hình: Thẻ Tính cấp thiết & Thẻ Mục tiêu cốt lõi\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Kính thưa Hội đồng, xuất phát từ thực tế tại phòng Lab CLB Tin học, việc quản lý mượn trả trước đây chủ yếu dựa vào sổ tay và file Excel rời rạc, dễ thất lạc linh kiện và thường xuyên bị trùng lịch phòng thực hành.\n\nMục tiêu cốt lõi của đề tài là xây dựng một hệ thống số hóa toàn diện, kết hợp Trạm Kiosk tự phục vụ quẹt thẻ RFID, cho phép sinh viên chủ động mượn trả thiết bị dưới 15 giây, đồng bộ dữ liệu tức thời và tự động đánh giá ý thức qua hệ thống điểm uy tín ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 4
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 4: HIỆN TRẠNG VẬN HÀNH & BÀI TOÁN CẦN GIẢI QUYẾT', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 giây | 👀 Màn hình: 3 Bất cập thực tế (Thủ công, Nguy cơ thất thoát, Bị động nhân lực)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Qua quá trình trực tiếp tham gia sinh hoạt và làm việc tại phòng Lab của CLB, em nhận thấy 3 khó khăn lớn nhất trong khâu vận hành:\n- Thứ nhất: Mỗi lần mượn trả đều phải ghi sổ giấy và đối chiếu thủ công rất mất thời gian.\n- Thứ hai: Các linh kiện nhỏ như cảm biến, dây cắm rất dễ thất lạc mà Ban chủ nhiệm khó truy cứu trách nhiệm người làm hỏng.\n- Thứ ba: Phòng Lab luôn cần người túc trực quầy liên tục, rất bị động ngoài giờ ca trực. Đây chính là động lực để em xây dựng giải pháp Kiosk tự phục vụ thông minh."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 5
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 5: PHẠM VI ĐỀ TÀI & PHÂN CẤP VAI TRÒ (RBAC)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 50 giây | 👀 Màn hình: 4 Nhóm vai trò (Chủ nhiệm, Ban kỹ thuật, TV nghiên cứu, CTV / Sinh viên)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Về phạm vi phân quyền, hệ thống áp dụng mô hình RBAC gắn liền với 4 nhóm vai trò thực tế:\n1. Chủ nhiệm CLB: Quản trị viên tối cao, toàn quyền quản lý nhân sự, phân quyền và sao lưu hệ thống.\n2. Trưởng ban Kỹ thuật & Quản lý kho: Điều hành danh mục 360+ thiết bị, duyệt lịch phòng Lab và xử lý bảo trì.\n3. Thành viên nghiên cứu (Trong CLB): Lực lượng nòng cốt, được cấp quyền mượn thiết bị chuyên sâu mang về nhà và đăng ký đặt phòng Lab theo nhóm.\n4. Cộng tác viên & Sinh viên toàn trường: Sử dụng chính chiếc Thẻ Sinh Viên có sẵn của trường để quẹt thẻ tại Kiosk mượn đồ dùng tại chỗ trong ca học mà không cần trường phải in thêm thẻ riêng ạ."' }),
            new TextRun({ text: '\n\n💡 CÂU HỎI PHẢN BIỆN: ', bold: true, color: 'D97706' }),
            new TextRun({ text: 'Sinh viên ngoài CLB tích điểm uy tín làm gì? -> Trả lời: Điểm uy tín để kiểm soát rủi ro mượn trả tự động: trả đúng hạn được nâng hạn mức mượn, vi phạm hoặc làm hỏng đồ sẽ bị trừ điểm và Kiosk tự động khóa tài khoản tạm thời.' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 6
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 6: KIẾN TRÚC TỔNG THỂ HỆ THỐNG (3-TIER)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 – 50 giây | 👀 Màn hình: 3 Tầng (Giao diện React 19, Nghiệp vụ Node.js, Dữ liệu SQLite & RFID Protocol)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Hệ thống được thiết kế theo kiến trúc 3 tầng chuẩn mực:\n1. Tầng Giao diện: Ứng dụng Single Page Application bằng React 19 + Vite siêu nhẹ, tối ưu nút bấm chuẩn chạm 44x44px cho màn hình cảm ứng.\n2. Tầng Nghiệp vụ: Node.js + Express API non-blocking xử lý nghiệp vụ mượn trả, phân quyền JWT và truyền sự kiện Realtime qua SSE.\n3. Tầng Dữ liệu & Giao tiếp phần cứng: Database SQLite chuẩn ACID, In-memory Cache O(1) và Module xử lý giao thức thẻ RFID 13.56MHz kèm bộ giả lập quét thẻ giúp chạy thử nghiệm ổn định."' }),
            new TextRun({ text: '\n\n💡 CÂU HỎI PHẢN BIỆN: ', bold: true, color: 'D97706' }),
            new TextRun({ text: 'Dữ liệu ở đâu ra? -> Trả lời: Toàn bộ là Dữ liệu mẫu (Seed Data) được mô phỏng sát theo danh mục thiết bị thực tế để kiểm thử toàn diện các kịch bản biên trước khi triển khai.' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 7
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 7: CÔNG NGHỆ CỐT LÕI & ĐỒNG BỘ REALTIME SSE', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 giây | 👀 Màn hình: Thẻ SSE Realtime (Độ trễ < 50ms) & Thẻ Database 3NF / Cache O(1)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Để màn hình Kiosk và Web Admin đồng bộ tức thời, em áp dụng Server-Sent Events (SSE). Khác với Polling gửi request liên tục làm nghẽn CPU, SSE duy trì 1 kết nối HTTP duy nhất, đẩy dữ liệu với độ trễ dưới 50ms và tiết kiệm 90% băng thông mạng.\nCơ sở dữ liệu được chuẩn hóa 3NF gồm 6 bảng thực thể, kết hợp cấu trúc Hash Map trên RAM tra cứu với độ phức tạp O(1) ạ."' }),
            new TextRun({ text: '\n\n💡 CÂU HỎI PHẢN BIỆN: ', bold: true, color: 'D97706' }),
            new TextRun({ text: 'Khi nào dùng WebSocket vs SSE? -> Trả lời: WebSocket dùng cho giao tiếp 2 chiều liên tục (Chat, Game). SSE dùng khi dữ liệu chảy 1 chiều từ Server xuống Client (Dashboard, Thông báo mượn trả).' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 8
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 8: VÒNG ĐỜI QUẢN LÝ THIẾT BỊ & QUY TRÌNH MƯỢN TRẢ', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 giây | 👀 Màn hình: Quy trình 4 bước (Đăng ký mượn -> Giao nhận -> Trả đồ -> Tự động đóng phiếu)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Vòng đời thiết bị được tự động hóa qua 4 bước khép kín:\n- Bước 1: Sinh viên đặt trước trên Web hoặc quẹt thẻ tại Kiosk.\n- Bước 2: Thủ kho quét Barcode thiết bị bàn giao, hệ thống chuyển trạng thái sang Đang mượn.\n- Bước 3: Hết ca học, sinh viên chạm thẻ trả đồ và đánh giá hiện trạng.\n- Bước 4: Hệ thống tự động đóng phiếu, cập nhật số lượng tồn kho Realtime và cộng điểm uy tín cho sinh viên."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 9
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 9: TRẠM KIOSK TỰ PHỤC VỤ & ĐẶT PHÒNG THỰC HÀNH', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 giây | 👀 Màn hình: Thẻ Kiosk cảm ứng / Điểm uy tín & Thẻ Đặt phòng 36 ca / Chống trùng lịch\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Trạm Kiosk tự phục vụ nhận diện thẻ RFID dưới 120ms, giao diện nút chạm chuẩn 44px và tự động thoát sau 30 giây để bảo mật tài khoản. Hệ thống tích hợp Gamification tự động cộng điểm trả đúng hạn và trừ điểm khi quá hạn.\nĐồng thời, phân hệ Đặt phòng Lab hiển thị ma trận 36 ca/tuần với thuật toán kiểm tra xung đột lịch trình, ngăn chặn 100% tình trạng hai nhóm đăng ký trùng phòng ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 10
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 10: DASHBOARD GIÁM SÁT & NHẬT KÝ AN NINH (AUDIT LOGS)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 45 giây | 👀 Màn hình: Thẻ Dashboard KPIs & Thẻ Audit Logs / Backup 1-Click\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Dashboard hiển thị trực quan 4 chỉ số KPI và biểu đồ Recharts xu hướng theo tuần, giúp cảnh báo ngay các phiếu quá hạn. Mọi hành vi thao tác trên hệ thống đều được ghi vết 100% vào Nhật ký an ninh bất biến (Append-Only không thể xóa sửa), đảm bảo tính minh bạch và chống chối bỏ trách nhiệm tuyệt đối. Đi kèm là chức năng Sao lưu tự động & Phục hồi 1-Click bảo vệ an toàn dữ liệu máy chủ ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 11
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 11: ĐIỂM NHẤN KỸ THUẬT: TỐI ƯU O(1) & BẢO MẬT RBAC', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 50 giây | 👀 Màn hình: Tối ưu Frontend (O(1), 60 FPS, Debounce 300ms) & Bảo mật RBAC (Bcrypt, JWT, SQLi/XSS)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Về điểm nhấn kỹ thuật:\n- Tầng Frontend: Em dùng Hash Map Record Dictionary để tra cứu ô lịch đạt tốc độ O(1) thay vì O(N*M), kích hoạt Hardware Acceleration duy trì 60 FPS và áp dụng Debounce 300ms giảm 85% re-render thừa.\n- Tầng Backend & Bảo mật: Mật khẩu được băm bằng Bcrypt Salt Rounds 10 chống Rainbow Table, xác thực JWT Stateless và dùng Parameterized Queries ngăn chặn triệt để lỗ hổng SQL Injection và XSS ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 12
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 12: KẾT QUẢ KIỂM THỬ HỆ THỐNG (68/68 TEST CASES)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 40 giây | 👀 Màn hình: 4 Khối kiểm thử (Unit 24/24, Integration 22/22, Stress 12/12, Security 10/10)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Hệ thống đã trải qua quy trình kiểm thử với 68 Test Cases và đạt tỷ lệ vượt qua 100%: bao gồm Unit Test kiểm thử logic nghiệp vụ, Integration Test luồng mượn trả RFID và Realtime SSE, Stress Test mô phỏng 100 request đồng thời với độ trễ phản hồi < 85ms và Security Test kiểm thử an ninh chống tấn công mạng ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 13
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 13: HIỆU QUẢ THỰC TẾ TRƯỚC & SAU TRIỂN KHAI', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 40 giây | 👀 Màn hình: 4 Cột đối chiếu (Thời gian mượn, Kiểm soát thiết bị, Tồn kho Realtime, Tự phục vụ 24/7)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"So với phương pháp quản lý sổ sách cũ, hệ thống mang lại hiệu quả vượt bậc: Thời gian mượn trả giảm từ 10 phút xuống dưới 15 giây; tài sản được ghi vết chính xác 100% MSSV; số lượng tồn kho được đồng bộ Realtime; và phòng Lab có thể phục vụ sinh viên tự động 24/7 mà không phụ thuộc lịch trực của thành viên ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 14
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 14: ĐÁNH GIÁ ĐỀ TÀI & HƯỚNG PHÁT TRIỂN TƯƠNG LAI', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 40 giây | 👀 Màn hình: Thẻ Ưu điểm/Hạn chế & 4 Hướng nâng cấp (AI FaceID, IoT Smart Lock MQTT, Mobile App, SSO)\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Đề tài đã hoàn thành xuất sắc các mục tiêu đề ra. Hạn chế hiện tại là sinh viên vẫn cần mang thẻ cứng RFID. Trong tương lai, em định hướng mở rộng thêm 4 nhánh công nghệ: Tích hợp AI Camera nhận diện FaceID, kết nối Khóa cửa thông minh IoT qua giao thức MQTT, phát triển Mobile App quét QR Code và đồng bộ Single Sign-On với hệ thống đào tạo của Nhà trường ạ."' }),
          ],
          spacing: { after: 200 },
        }),

        // SLIDE 15
        new Paragraph({ text: '─────────────────────────────────────────────────────────────', alignment: AlignmentType.CENTER }),
        new Paragraph({ text: 'SLIDE 15: LỜI CẢM ƠN & PHIÊN HỎI - ĐÁP (Q&A)', heading: HeadingLevel.HEADING_1, spacing: { before: 150, after: 100 } }),
        new Paragraph({
          children: [
            new TextRun({ text: '⏱️ Thời lượng: 20 giây | 👀 Màn hình: Lời cảm ơn, Thông tin liên hệ, Link GitHub\n\n' }),
            new TextRun({ text: '🗣️ LỜI BẠN NÓI:\n', bold: true, color: '2563EB' }),
            new TextRun({ text: '"Trên đây là toàn bộ báo cáo thực tập tốt nghiệp của em. Em xin chân thành cảm ơn Quý Thầy Cô trong Hội đồng đã chú ý lắng nghe. Em rất mong nhận được những góp ý quý báu từ Thầy Cô để hoàn thiện đề tài hơn nữa. Em xin sẵn sàng bước vào phiên trả lời câu hỏi phản biện ạ!"' }),
          ],
          spacing: { after: 200 },
        }),
      ],
    },
  ],
});

const outputPath = path.join(__dirname, 'KichBan_ThuyetTrinh_Full_15Slide.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Đã tạo thành công file Word Kịch Bản Thuyết Trình:', outputPath);
});
