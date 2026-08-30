import React from 'react';
import { User } from 'lucide-react';
import Modal from '../Modal';

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

  const modalFooter = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Hủy
      </button>
      <button type="submit" form="waitlist-equip-form" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}>
        🔔 Đăng ký chờ
      </button>
    </>
  );

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🔔 Đăng ký chờ mượn thiết bị
        </div>
      }
      size="md"
      footer={modalFooter}
    >
      <style>{`
        .waitlist-modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding-bottom: var(--space-md);
        }
        .waitlist-modal-form .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin: 0;
        }
        .waitlist-modal-form .form-group label {
          margin: 0;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }
        .no-spin::-webkit-inner-spin-button,
        .no-spin::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spin {
          -moz-appearance: textfield;
        }
      `}</style>
      <form id="waitlist-equip-form" onSubmit={handleWaitlistSubmit}>
        <div className="waitlist-modal-form">
          {/* Info thiết bị */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedEquip.name}</div>
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
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            💡 <strong style={{ color: 'var(--accent-blue)' }}>Lưu ý:</strong> Bạn sẽ được thông báo qua email khi có thiết bị trả về.
            Bạn có 24h để mượn trước khi chuyển sang người tiếp theo trong danh sách chờ.
          </div>

          {/* MSSV field với gợi ý */}
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label>Mã số sinh viên</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="Gõ tên hoặc MSSV để tìm..."
                value={memberSearchQuery}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  handleMemberSearch(memberSearchQuery);
                }}
                onChange={(e) => {
                  setIsDropdownOpen(true);
                  handleMemberSearch(e.target.value);
                  setWaitlistForm({ ...waitlistForm, mssv: e.target.value });
                }}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>

            {/* Dropdown gợi ý */}
            {isDropdownOpen && suggestedMembers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)', zIndex: 300, overflowY: 'auto', maxHeight: '200px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: '4px'
              }}>
                {suggestedMembers.map(m => (
                  <div
                    key={m.mssv}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setWaitlistForm({ ...waitlistForm, mssv: m.mssv });
                      setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                      setIsDropdownOpen(false);
                      setSuggestedMembers([]);
                    }}
                    style={{
                      padding: '0.6rem var(--space-md)',
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
              className="no-spin"
              min="1"
              required
              value={waitlistForm.qty === '' ? '' : waitlistForm.qty}
              onChange={(e) => {
                const val = e.target.value;
                setWaitlistForm({ ...waitlistForm, qty: val === '' ? '' : Number(val) });
              }}
            />
          </div>

          <div className="form-group">
            <label>Ghi chú (không bắt buộc)</label>
            <textarea
              placeholder="VD: Cần gấp cho dự án..."
              value={waitlistForm.notes}
              onChange={(e) => setWaitlistForm({ ...waitlistForm, notes: e.target.value })}
              style={{
                width: '100%',
                minHeight: '72px',
                height: '72px',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default WaitlistModal;
