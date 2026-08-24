import React from 'react';
import { X, FileText, Info } from 'lucide-react';

const EquipmentDetailsModal = ({
  isOpen,
  onClose,
  selectedBorrowDetail,
  formatTime,
  formatDateWithTime,
  getBorrowStatusInfo
}) => {
  if (!isOpen || !selectedBorrowDetail) return null;

  const iconBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem'
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={18} style={{ color: 'var(--accent-purple)' }} /> Chi tiết phiếu mượn trả thiết bị
          </h3>
          <button style={iconBtnStyle} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body" style={{ gap: '1.25rem', fontSize: '0.9rem', maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Thông tin thiết bị */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.8rem' }}>
            <h4 style={{ color: 'var(--accent-purple)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>THÔNG TIN THIẾT BỊ</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem' }}>
              <div>Tên: <strong>{selectedBorrowDetail.equipmentName}</strong></div>
              <div>Mã số: <strong>{selectedBorrowDetail.equipmentCode}</strong></div>
              <div>Số lượng mượn: <strong>{selectedBorrowDetail.qty} chiếc</strong></div>
              {selectedBorrowDetail.instanceSerials && selectedBorrowDetail.instanceSerials.length > 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  Serial giao máy:
                  {selectedBorrowDetail.instanceSerials.map((serial, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                      {serial}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lịch trình bàn giao */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.8rem' }}>
            <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>LỊCH TRÌNH BÀN GIAO</h4>
            {selectedBorrowDetail.expectedReturnDate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div>Ngày mượn: <strong>{formatTime(selectedBorrowDetail.borrowDate)}</strong></div>
                <div>Ngày hẹn trả: <strong>{formatDateWithTime(selectedBorrowDetail.expectedReturnDate)}</strong></div>
                {selectedBorrowDetail.status === 'Đã trả' ? (
                  <div>Ngày trả thực tế: <strong style={{ color: 'var(--accent-green)' }}>{formatTime(selectedBorrowDetail.returnDate)}</strong></div>
                ) : (
                  <div>Hạn còn lại: <strong style={{ color: getBorrowStatusInfo(selectedBorrowDetail).overdue ? 'var(--accent-red)' : 'var(--accent-blue)' }}>{getBorrowStatusInfo(selectedBorrowDetail).label}</strong></div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div>Ngày xuất kho: <strong>{formatTime(selectedBorrowDetail.borrowDate)}</strong></div>
                <div>Phân loại tài sản: <strong style={{ color: 'var(--accent-amber)' }}>Linh kiện tiêu hao (Không thu hồi)</strong></div>
              </div>
            )}
          </div>

          {/* Chi tiết người mượn & bàn giao mượn */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.8rem' }}>
            <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>BÀN GIAO LÚC MƯỢN</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div>Người mượn/nhận: <strong>{selectedBorrowDetail.borrowerName}</strong> (MSSV: {selectedBorrowDetail.mssv})</div>
              <div>Tình trạng ban đầu: <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{selectedBorrowDetail.initialCondition}</span></div>
              <div>Ghi chú lúc mượn: <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedBorrowDetail.borrowNotes || '(Không có ghi chú thêm)'}</span></div>
            </div>
          </div>

          {/* Chi tiết trả thiết bị nếu đã trả */}
          {selectedBorrowDetail.status === 'Đã trả' ? (
            <div>
              <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.35rem', fontSize: '0.95rem' }}>CHI TIẾT LÚC TRẢ THIẾT BỊ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div>Người đi trả lại: <strong>{selectedBorrowDetail.returnerName || 'N/A'}</strong> (MSSV: {selectedBorrowDetail.returnMssv || 'N/A'})</div>
                <div>Tình trạng lúc trả: <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{selectedBorrowDetail.finalCondition}</span></div>
                <div>Ghi chú bàn giao trả: <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedBorrowDetail.returnNotes || '(Không có ghi chú thêm)'}</span></div>
              </div>
            </div>
          ) : selectedBorrowDetail.status === 'Đã tiêu hao' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.08)', padding: '0.6rem', borderRadius: '6px' }}>
              <Info size={16} />
              <span>Linh kiện tiêu hao đã được xuất kho sử dụng trực tiếp.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.08)', padding: '0.6rem', borderRadius: '6px' }}>
              <Info size={16} />
              <span>Thiết bị hiện chưa được hoàn trả lại cho Lab.</span>
            </div>
          )}

        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng lại</button>
        </div>
      </div>
    </div>
  );
};

export default EquipmentDetailsModal;
