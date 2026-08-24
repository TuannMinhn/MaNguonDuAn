import React from 'react';
import { X } from 'lucide-react';
import Select from '../Select';

const ConfirmHandoverModal = ({
  isOpen,
  onClose,
  selectedBorrow,
  borrowForm,
  setBorrowForm,
  onConfirm
}) => {
  if (!isOpen || !selectedBorrow) return null;

  const iconBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem'
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3>Xác nhận thông tin bàn giao</h3>
          <button style={iconBtnStyle} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}>
          <div className="modal-body" style={{ gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--accent-amber)' }}>{selectedBorrow.equipmentName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span>Mã: {selectedBorrow.equipmentCode}</span>
                <span style={{ margin: '0 8px' }}>|</span>
                <span>SL: {selectedBorrow.qty}</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Người mượn: <strong>{selectedBorrow.borrowerName}</strong> ({selectedBorrow.mssv})
              </div>
            </div>

            <div className="form-group">
              <label>Tình trạng thiết bị lúc bàn giao</label>
              <Select
                value={borrowForm.initialCondition}
                onChange={(val) => setBorrowForm({ ...borrowForm, initialCondition: val })}
                options={[
                  { value: "Tốt / Hoạt động bình thường", label: "Tốt / Hoạt động bình thường" },
                  { value: "Mới 100% / Nguyên hộp", label: "Mới 100% / Nguyên hộp" },
                  { value: "Hao mòn nhẹ / Có trầy xước", label: "Hao mòn nhẹ / Có trầy xước" },
                  { value: "Có lỗi nhẹ (màn hình mờ, cáp lỏng...)", label: "Có lỗi nhẹ (màn hình mờ, cáp lỏng...)" },
                  { value: "Khác (xem phần ghi chú)", label: "Khác (xem phần ghi chú bên dưới)" }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Ghi chú chi tiết</label>
              <textarea
                rows="2.5"
                placeholder="Ghi nhận phụ kiện đi kèm hoặc trạng thái trầy xước..."
                value={borrowForm.borrowNotes}
                onChange={(e) => setBorrowForm({ ...borrowForm, borrowNotes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}>Tiếp tục quét thẻ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmHandoverModal;
