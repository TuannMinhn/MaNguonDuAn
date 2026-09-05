import React from 'react';
import { FileText, Info, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../Modal';

const EquipmentDetailsModal = ({
  isOpen,
  onClose,
  selectedBorrowDetail,
  formatTime,
  formatDateWithTime,
  getBorrowStatusInfo
}) => {
  if (!isOpen || !selectedBorrowDetail) return null;

  const modalFooter = (
    <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng lại</button>
  );

  const statusInfo = getBorrowStatusInfo ? getBorrowStatusInfo(selectedBorrowDetail) : { label: selectedBorrowDetail.status, overdue: false };
  const isReservation = selectedBorrowDetail.status === 'Đã đặt trước';
  const isBorrowed = selectedBorrowDetail.status === 'Đang mượn';
  const isReturned = selectedBorrowDetail.status === 'Đã trả';
  const isCancelled = selectedBorrowDetail.status === 'Đã hủy';
  const isConsumable = selectedBorrowDetail.status === 'Đã tiêu hao' || !selectedBorrowDetail.expectedReturnDate;

  // Tính toán thời gian quá hạn trả (nếu đang mượn mà quá hạn)
  let isOverdueReturn = false;
  let overdueReturnText = '';
  if (isBorrowed && selectedBorrowDetail.expectedReturnDate) {
    const limit = new Date(selectedBorrowDetail.expectedReturnDate);
    const now = new Date();
    if (now > limit) {
      isOverdueReturn = true;
      const diffMs = now - limit;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      overdueReturnText = diffHours > 0 ? `${diffHours} giờ ${diffMins} phút` : `${diffMins} phút`;
    }
  }

  // Tính toán thời gian trễ giờ đến nhận (nếu đang đặt trước)
  let isOverdueReceive = false;
  let overdueReceiveText = '';
  if (isReservation && selectedBorrowDetail.borrowDate) {
    const sched = new Date(selectedBorrowDetail.borrowDate);
    const now = new Date();
    if (now > sched) {
      isOverdueReceive = true;
      const diffMs = now - sched;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      overdueReceiveText = diffHours > 0 ? `${diffHours} giờ ${diffMins} phút` : `${diffMins} phút`;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={18} style={{ color: 'var(--accent-purple)' }} /> Chi tiết phiếu mượn trả thiết bị
        </div>
      }
      size="lg"
      footer={modalFooter}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
        {/* Banner trạng thái trực quan */}
        {isReservation ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: isOverdueReceive ? '#ef4444' : '#38bdf8',
            background: isOverdueReceive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.12)',
            border: isOverdueReceive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px'
          }}>
            {isOverdueReceive ? <AlertTriangle size={18} /> : <Clock size={18} />}
            <div>
              <div style={{ fontWeight: '700' }}>
                {isOverdueReceive ? `⚠️ Đang chờ sinh viên đến nhận (Đã trễ ${overdueReceiveText})` : '⏳ Đang chờ sinh viên đến quầy nhận thiết bị'}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                Phiếu đã được đặt trước thành công. Quản lý Lab có thể bấm "Bàn giao" khi sinh viên có mặt tại quầy.
              </div>
            </div>
          </div>
        ) : isBorrowed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: isOverdueReturn ? '#ef4444' : '#3b82f6',
            background: isOverdueReturn ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
            border: isOverdueReturn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px'
          }}>
            {isOverdueReturn ? <AlertTriangle size={18} /> : <Clock size={18} />}
            <div>
              <div style={{ fontWeight: '700' }}>
                {isOverdueReturn ? `🚨 Chưa hoàn trả lại cho Lab (Đã quá hạn trả ${overdueReturnText})` : '📦 Thiết bị đang được sinh viên mượn sử dụng'}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                {isOverdueReturn ? 'Thiết bị đã vượt quá thời hạn hẹn trả dự kiến. Cần nhắc nhở hoàn trả sớm.' : 'Thiết bị hiện đang trong thời gian mượn hợp lệ.'}
              </div>
            </div>
          </div>
        ) : isReturned ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px'
          }}>
            <CheckCircle size={18} />
            <div>
              <div style={{ fontWeight: '700' }}>Đã hoàn trả thiết bị về kho Lab</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                Đã kiểm tra tình trạng và nhập kho hoàn tất.
              </div>
            </div>
          </div>
        ) : isCancelled ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#94a3b8',
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px'
          }}>
            <XCircle size={18} />
            <div>
              <div style={{ fontWeight: '700' }}>Phiếu mượn / đặt trước đã bị hủy</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                {selectedBorrowDetail.cancelReason || 'Đã hủy giữ chỗ và hoàn trả số lượng lại kho.'}
              </div>
            </div>
          </div>
        ) : isConsumable ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '0.65rem 0.85rem',
            borderRadius: '8px'
          }}>
            <Info size={18} />
            <div>
              <div style={{ fontWeight: '700' }}>Linh kiện tiêu hao - Đã xuất dùng</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>
                Linh kiện tiêu hao phục vụ dự án / học tập, không yêu cầu thu hồi về kho.
              </div>
            </div>
          </div>
        ) : null}

        {/* Thông tin thiết bị */}
        <div style={{ borderBottom: '1px solid var(--border-table)', paddingBottom: '0.8rem' }}>
          <h4 style={{ color: 'var(--accent-purple)', marginBottom: '0.45rem', fontSize: '0.95rem' }}>THÔNG TIN THIẾT BỊ</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem' }}>
            <div>Tên thiết bị: <strong>{selectedBorrowDetail.equipmentName}</strong></div>
            <div>Mã định danh: <strong>{selectedBorrowDetail.equipmentCode}</strong></div>
            <div>Số lượng: <strong>{selectedBorrowDetail.qty} chiếc</strong></div>
            {selectedBorrowDetail.instanceSerials && selectedBorrowDetail.instanceSerials.length > 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <span>Serial gán máy:</span>
                {selectedBorrowDetail.instanceSerials.map((serial, idx) => (
                  <span key={idx} style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                    {serial}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lịch trình bàn giao & Mốc thời gian chi tiết */}
        <div style={{ borderBottom: '1px solid var(--border-table)', paddingBottom: '0.8rem' }}>
          <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.45rem', fontSize: '0.95rem' }}>LỊCH TRÌNH THỜI GIAN</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>
              {isReservation ? 'Thời gian hẹn đến nhận:' : 'Thời gian nhận / cấp phát:'}{' '}
              <strong>{formatDateWithTime ? formatDateWithTime(selectedBorrowDetail.borrowDate) : formatTime(selectedBorrowDetail.borrowDate)}</strong>
            </div>

            {selectedBorrowDetail.expectedReturnDate && (
              <div>
                Hạn chót hoàn trả:{' '}
                <strong>{formatDateWithTime ? formatDateWithTime(selectedBorrowDetail.expectedReturnDate) : formatTime(selectedBorrowDetail.expectedReturnDate)}</strong>
              </div>
            )}

            {isReturned && selectedBorrowDetail.returnDate && (
              <div>
                Thời gian hoàn trả thực tế:{' '}
                <strong style={{ color: 'var(--accent-green)' }}>
                  {formatDateWithTime ? formatDateWithTime(selectedBorrowDetail.returnDate) : formatTime(selectedBorrowDetail.returnDate)}
                </strong>
              </div>
            )}

            {selectedBorrowDetail.cancelledAt && (
              <div>
                Thời gian hủy phiếu:{' '}
                <strong style={{ color: 'var(--accent-red)' }}>
                  {formatDateWithTime ? formatDateWithTime(selectedBorrowDetail.cancelledAt) : formatTime(selectedBorrowDetail.cancelledAt)}
                </strong>
              </div>
            )}

            <div>
              Trạng thái tiến độ:{' '}
              <span style={{ ...statusInfo.style, display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.82rem' }}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Chi tiết người mượn & bàn giao mượn */}
        <div style={{ borderBottom: isReturned ? '1px solid var(--border-table)' : 'none', paddingBottom: isReturned ? '0.8rem' : 0 }}>
          <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.45rem', fontSize: '0.95rem' }}>BÀN GIAO LÚC MƯỢN</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>Người mượn / nhận: <strong>{selectedBorrowDetail.borrowerName}</strong> (MSSV: {selectedBorrowDetail.mssv})</span>
              {selectedBorrowDetail.borrowerType === 'external_guest' && (
                <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                  Sinh viên ngoài CLB
                </span>
              )}
            </div>

            {/* Thông tin sinh viên ngoài CLB & Hình thức đảm bảo */}
            {selectedBorrowDetail.borrowerType === 'external_guest' && (
              <div style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                <div style={{ fontWeight: '700', color: 'var(--accent-purple)', marginBottom: '0.35rem' }}>
                  📋 HỒ SƠ ĐẢM BẢO & TRÁCH NHIỆM KHÁCH NGOÀI CLB:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  {selectedBorrowDetail.guestPhone && <div>SĐT liên hệ: <strong>{selectedBorrowDetail.guestPhone}</strong></div>}
                  {selectedBorrowDetail.guestFaculty && <div>Khoa / Trường: <strong>{selectedBorrowDetail.guestFaculty}</strong></div>}
                  {selectedBorrowDetail.identityCardNumber && <div>Số CCCD / Thẻ SV: <strong>{selectedBorrowDetail.identityCardNumber}</strong></div>}
                </div>

                <div style={{ marginTop: '0.45rem', paddingTop: '0.35rem', borderTop: '1px dashed rgba(168, 85, 247, 0.2)' }}>
                  {selectedBorrowDetail.guaranteeMethod === 'sponsor' ? (
                    <div style={{ color: 'var(--accent-blue)' }}>
                      🛡️ <strong>Phương án A (Bảo lãnh):</strong> Thành viên bảo lãnh: <strong>{selectedBorrowDetail.sponsorName || 'N/A'}</strong> (MSSV: {selectedBorrowDetail.sponsorMssv})
                      {selectedBorrowDetail.sponsorPhone ? ` - SĐT: ${selectedBorrowDetail.sponsorPhone}` : ''}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        * Điểm số và trách nhiệm đền bù được tính trực tiếp lên tài khoản của thành viên bảo lãnh.
                      </div>
                    </div>
                  ) : selectedBorrowDetail.guaranteeMethod === 'deposit_money' ? (
                    <div style={{ color: 'var(--accent-amber)' }}>
                      💵 <strong>Phương án B (Ký quỹ tiền mặt):</strong> Đặt cọc <strong>{Number(selectedBorrowDetail.depositAmount || 0).toLocaleString('vi-VN')} VNĐ</strong>
                      {selectedBorrowDetail.depositNotes ? ` (Ghi chú: ${selectedBorrowDetail.depositNotes})` : ''}
                    </div>
                  ) : selectedBorrowDetail.guaranteeMethod === 'deposit_id_card' || selectedBorrowDetail.guaranteeMethod === 'deposit_student_card' ? (
                    <div style={{ color: 'var(--accent-amber)' }}>
                      🪪 <strong>Phương án B (Giữ giấy tờ gốc):</strong> Giữ Thẻ SV / CCCD gốc tại Ban chủ nhiệm
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent-green)' }}>
                      🏢 <strong>Phương án C (Dùng tại chỗ):</strong> Chỉ sử dụng trong phòng Lab dưới sự giám sát của trực ca
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>Tình trạng thiết bị: <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{selectedBorrowDetail.initialCondition}</span></div>
            <div>Ghi chú lúc mượn: <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedBorrowDetail.borrowNotes || '(Không có ghi chú thêm)'}</span></div>
          </div>
        </div>

        {/* Chi tiết trả thiết bị nếu đã trả */}
        {isReturned && (
          <div>
            <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.45rem', fontSize: '0.95rem' }}>CHI TIẾT LÚC HOÀN TRẢ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>Người thực hiện trả: <strong>{selectedBorrowDetail.returnerName || 'N/A'}</strong> (MSSV: {selectedBorrowDetail.returnMssv || 'N/A'})</div>
              <div>Tình trạng lúc trả: <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{selectedBorrowDetail.finalCondition || 'Tốt'}</span></div>
              {selectedBorrowDetail.guestCashFine > 0 && (
                <div style={{ color: 'var(--accent-red)', fontWeight: '600' }}>
                  Phạt tiền mặt trễ hạn: {Number(selectedBorrowDetail.guestCashFine).toLocaleString('vi-VN')} VNĐ (Theo quy định quỹ CLB)
                </div>
              )}
              {selectedBorrowDetail.depositRefundStatus && (
                <div style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>
                  Xử lý tiền cọc / giấy tờ: {selectedBorrowDetail.depositRefundStatus}
                </div>
              )}
              <div>Ghi chú hoàn trả: <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedBorrowDetail.returnNotes || '(Không có ghi chú thêm)'}</span></div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EquipmentDetailsModal;
