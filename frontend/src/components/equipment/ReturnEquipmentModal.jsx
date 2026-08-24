import React from 'react';
import { X, User, CheckCircle } from 'lucide-react';
import Select from '../Select';

const ReturnEquipmentModal = ({
  isOpen,
  onClose,
  selectedBorrow,
  returnForm,
  setReturnForm,
  memberSearchQuery,
  setMemberSearchQuery,
  suggestedMembers,
  setSuggestedMembers,
  handleMemberSearch,
  handleReturnSubmit
}) => {
  if (!isOpen || !selectedBorrow) return null;

  const iconBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem'
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <h3 style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} /> Duyệt trả thiết bị
          </h3>
          <button style={iconBtnStyle} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleReturnSubmit}>
          <div className="modal-body" style={{ gap: '1.1rem', maxHeight: '65vh', overflowY: 'auto' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thiết bị trả lại</div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', marginTop: '3px' }}>{selectedBorrow.equipmentName} ({selectedBorrow.equipmentCode})</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                Số lượng mượn: <strong>{selectedBorrow.qty} chiếc</strong> · Người mượn: {selectedBorrow.borrowerName} ({selectedBorrow.mssv})
              </div>
            </div>

            {/* Tìm gợi ý người đi trả */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Mã số sinh viên (Người trả thiết bị)</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Gõ tên hoặc MSSV người đi trả..."
                  value={memberSearchQuery || returnForm.returnMssv}
                  onChange={(e) => {
                    handleMemberSearch(e.target.value);
                    setReturnForm({ ...returnForm, returnMssv: e.target.value });
                  }}
                  style={{ paddingLeft: '2.1rem' }}
                />
              </div>

              {/* List gợi ý */}
              {suggestedMembers.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', zIndex: 300, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: '4px'
                }}>
                  {suggestedMembers.map(m => (
                    <div
                      key={m.mssv}
                      onClick={() => {
                        setReturnForm({ ...returnForm, returnMssv: m.mssv });
                        setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                        setSuggestedMembers([]);
                      }}
                      style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>MSSV: {m.mssv}</span>
                    </div>
                  ))}
                </div>
              )}
              <small style={{ color: 'var(--text-muted)' }}>Mặc định điền người mượn ban đầu. Sửa nếu người đi trả là người khác.</small>
            </div>

            <div className="form-group">
              <label>Tình trạng thiết bị lúc trả</label>
              <Select
                value={returnForm.finalCondition}
                onChange={(val) => setReturnForm({ ...returnForm, finalCondition: val })}
                options={[
                  { value: "Tốt / Nguyên vẹn như cũ", label: "Tốt / Nguyên vẹn như cũ (Không đổi)" },
                  { value: "Hao mòn bình thường / Có trầy xước nhẹ", label: "Hao mòn bình thường / Có trầy xước nhẹ" },
                  { value: "Bị hỏng hóc bộ phận / Lỗi chức năng", label: "Bị hỏng hóc bộ phận / Lỗi chức năng (ghi chú lỗi)" },
                  { value: "Mất phụ kiện đi kèm (dây, adapter...)", label: "Mất phụ kiện đi kèm (dây, adapter...)" },
                  { value: "Hỏng hoàn toàn / Bị mất thiết bị", label: "Hỏng hoàn toàn / Bị mất thiết bị" }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Ghi chú chi tiết lúc trả</label>
              <textarea
                rows="2.5"
                placeholder="Ghi nhận lỗi phát sinh cụ thể khi hoàn trả nếu có..."
                value={returnForm.returnNotes}
                onChange={(e) => setReturnForm({ ...returnForm, returnNotes: e.target.value })}
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
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>Xác nhận duyệt trả</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnEquipmentModal;
