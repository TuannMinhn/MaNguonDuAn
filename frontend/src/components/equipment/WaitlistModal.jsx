import React from 'react';
import { X, User } from 'lucide-react';

const WaitlistModal = ({
  isOpen,
  onClose,
  selectedEquip,
  equipmentWaitlists,
  waitlistForm,
  setWaitlistForm,
  memberSearchQuery,
  setMemberSearchQuery,
  suggestedMembers,
  setSuggestedMembers,
  handleMemberSearch,
  handleWaitlistSubmit
}) => {
  if (!isOpen || !selectedEquip) return null;

  const iconBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem'
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔔 Đăng ký chờ mượn thiết bị
          </h3>
          <button style={iconBtnStyle} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleWaitlistSubmit}>
          <div className="modal-body" style={{ gap: '1rem' }}>
            {/* Info thiết bị */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '0.85rem',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{selectedEquip.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Mã: {selectedEquip.code} · ❌ Hiện đang hết hàng
              </div>
              {equipmentWaitlists[selectedEquip.id] > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', marginTop: '5px' }}>
                  📊 Đã có {equipmentWaitlists[selectedEquip.id]} người đăng ký chờ
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              💡 <strong style={{ color: 'var(--accent-blue)' }}>Lưu ý:</strong> Bạn sẽ được thông báo qua email khi có thiết bị trả về.
              Bạn có 24h để mượn trước khi chuyển sang người tiếp theo trong danh sách chờ.
            </div>

            {/* MSSV field với gợi ý */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Mã số sinh viên</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Gõ tên hoặc MSSV để tìm..."
                  value={memberSearchQuery}
                  onChange={(e) => {
                    handleMemberSearch(e.target.value);
                    setWaitlistForm({ ...waitlistForm, mssv: e.target.value });
                  }}
                  style={{ paddingLeft: '2.1rem' }}
                />
              </div>

              {/* Dropdown gợi ý */}
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
                        setWaitlistForm({ ...waitlistForm, mssv: m.mssv });
                        setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                        setSuggestedMembers([]);
                      }}
                      style={{
                        padding: '0.6rem 0.85rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>MSSV: {m.mssv}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Số lượng muốn mượn</label>
              <input
                type="number"
                min="1"
                required
                value={waitlistForm.qty}
                onChange={(e) => setWaitlistForm({ ...waitlistForm, qty: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>Ghi chú (không bắt buộc)</label>
              <textarea
                rows="2"
                placeholder="VD: Cần gấp cho dự án..."
                value={waitlistForm.notes}
                onChange={(e) => setWaitlistForm({ ...waitlistForm, notes: e.target.value })}
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}>
              🔔 Đăng ký chờ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WaitlistModal;
