import React from 'react';
import { User, Calendar, Bell, AlertCircle, Bookmark, Package, MapPin, CheckCircle2, Clock } from 'lucide-react';
import Modal from '../Modal';
import Select from '../Select';
import Button from '../Button';

const WaitlistModal = ({
  isOpen,
  onClose,
  selectedEquip,
  equipmentWaitlists = {},
  waitlistForm,
  setWaitlistForm,
  memberSearchQuery,
  setMemberSearchQuery,
  suggestedMembers = [],
  setSuggestedMembers,
  handleMemberSearch,
  handleWaitlistSubmit,
  getTodayDateString = () => new Date().toISOString().split('T')[0]
}) => {
  if (!isOpen || !selectedEquip) return null;

  const waitCount = equipmentWaitlists[selectedEquip.id] || 0;
  
  // Validation: Chỉ hiển thị * đỏ khi thiếu thông tin, nút Xác nhận màu xám khi disabled
  const isMssvEmpty = !waitlistForm.mssv || !waitlistForm.mssv.trim();
  const isQtyEmpty = !waitlistForm.qty || Number(waitlistForm.qty) < 1;
  const isFormIncomplete = isMssvEmpty || isQtyEmpty;

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
      <Button type="button" variant="secondary" onClick={onClose}>
        Hủy bỏ
      </Button>
      <Button 
        type="submit" 
        form="waitlist-equip-form" 
        variant="primary"
        disabled={isFormIncomplete}
        icon={Bell}
        iconPosition="left"
        style={{ 
          backgroundColor: isFormIncomplete ? 'var(--bg-tertiary, #334155)' : 'var(--accent-amber)', 
          borderColor: isFormIncomplete ? 'transparent' : 'var(--accent-amber)',
          color: isFormIncomplete ? 'var(--text-muted, #94a3b8)' : '#000000',
          fontWeight: '700',
          cursor: isFormIncomplete ? 'not-allowed' : 'pointer',
          opacity: isFormIncomplete ? 0.6 : 1,
          boxShadow: isFormIncomplete ? 'none' : '0 0 12px rgba(245, 158, 11, 0.35)',
          transition: 'all 0.2s ease'
        }}
      >
        Xác nhận Đăng ký chờ
      </Button>
    </div>
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
        <div style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
          <Bell size={20} />
          <span>Đăng ký danh sách chờ (Waitlist)</span>
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
        .waitlist-modal-form .grid-2col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-md);
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
          {/* Card Info Thiết bị / Linh kiện chi tiết */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Package size={17} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {selectedEquip.name}
                </div>
              </div>

              {/* Danh mục & Vị trí kho */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span>Mã: <strong style={{ color: 'var(--text-primary)' }}>{selectedEquip.code}</strong></span>
                <span>•</span>
                <span>{selectedEquip.category || 'Khác'}</span>
                <span>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Vị trí: <strong style={{ color: 'var(--accent-blue)' }}>{selectedEquip.location || 'Kho Lab'}</strong>
                </span>
                <span>•</span>
                <span style={{ color: 'var(--accent-red)', fontWeight: '600' }}>
                  Tạm hết hàng (0/{selectedEquip.totalQty})
                </span>
              </div>
            </div>

            {/* Huy hiệu Hàng chờ */}
            <div style={{
              textAlign: 'center',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Hàng chờ</div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-amber)', marginTop: '1px' }}>
                {waitCount} người
              </div>
            </div>
          </div>

          {/* Banner thông báo cơ chế tự động */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '0.7rem var(--space-md)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <Bookmark size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
            <div>
              Hệ thống sẽ <strong style={{ color: 'var(--accent-blue)' }}>tự động giữ chỗ trong 24 giờ</strong> và gửi thông báo Realtime/Email cho bạn ngay khi có người trả thiết bị này về kho.
            </div>
          </div>

          {/* Thông tin người đăng ký */}
          <div className="grid-2col">
            {/* MSSV field với gợi ý */}
            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
              <label>
                Mã số sinh viên (MSSV) {isMssvEmpty && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  required
                  placeholder="Gõ tên hoặc MSSV để tìm..."
                  value={memberSearchQuery !== undefined ? memberSearchQuery : (waitlistForm.mssv || '')}
                  onFocus={() => {
                    if (handleMemberSearch) {
                      setIsDropdownOpen(true);
                      handleMemberSearch(memberSearchQuery || waitlistForm.mssv || '');
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (setMemberSearchQuery) {
                      setIsDropdownOpen(true);
                      if (handleMemberSearch) handleMemberSearch(val);
                      const cleanMssv = val.includes('–') ? val.split('–')[0].trim() : (val.includes('-') ? val.split('-')[0].trim() : val.trim());
                      setWaitlistForm({ ...waitlistForm, mssv: cleanMssv });
                      setMemberSearchQuery(val);
                    } else {
                      setWaitlistForm({ ...waitlistForm, mssv: val });
                    }
                  }}
                  style={{
                    paddingLeft: '2.3rem',
                    height: '42px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Dropdown gợi ý */}
              {isDropdownOpen && suggestedMembers && suggestedMembers.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)', zIndex: 300, overflowY: 'auto', maxHeight: '180px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: '4px'
                }}>
                  {suggestedMembers.map(m => (
                    <div
                      key={m.mssv}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setWaitlistForm({ ...waitlistForm, mssv: m.mssv });
                        if (setMemberSearchQuery) setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                        setIsDropdownOpen(false);
                        if (setSuggestedMembers) setSuggestedMembers([]);
                      }}
                      style={{
                        padding: '0.6rem var(--space-md)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>MSSV: {m.mssv}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Số lượng cần chờ */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>
                  Số lượng cần chờ {isQtyEmpty && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tổng thiết bị Lab có: <strong style={{ color: 'var(--accent-blue)' }}>{selectedEquip.totalQty}</strong>
                </span>
              </div>
              <input
                type="number"
                className="no-spin"
                min="1"
                max={selectedEquip.totalQty || 10}
                required
                value={waitlistForm.qty === '' ? '' : waitlistForm.qty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setWaitlistForm({ ...waitlistForm, qty: '' });
                  } else {
                    const num = Number(val);
                    setWaitlistForm({ ...waitlistForm, qty: isNaN(num) ? '' : num });
                  }
                }}
                style={{
                  height: '42px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 0.75rem',
                  fontSize: '0.88rem'
                }}
              />
            </div>
          </div>

          {/* Chi tiết mục đích & Thời gian mong muốn */}
          <div className="grid-2col">
            <div className="form-group">
              <label>Mục đích sử dụng</label>
              <Select
                value={waitlistForm.purpose || 'Đồ án môn học / Khóa luận tốt nghiệp'}
                onChange={(val) => setWaitlistForm({ ...waitlistForm, purpose: val })}
                options={[
                  { value: 'Đồ án môn học / Khóa luận tốt nghiệp', label: 'Đồ án môn học / Khóa luận tốt nghiệp' },
                  { value: 'Nghiên cứu khoa học (NCKH)', label: 'Nghiên cứu khoa học (NCKH)' },
                  { value: 'Thực hành Lab / Bài tập lớn', label: 'Thực hành Lab / Bài tập lớn' },
                  { value: 'Hoạt động CLB & Cuộc thi', label: 'Hoạt động CLB & Cuộc thi' },
                  { value: 'Khác', label: 'Mục đích khác' }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Ngày dự kiến cần thiết bị</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={waitlistForm.neededDate || ''}
                  onChange={(e) => setWaitlistForm({ ...waitlistForm, neededDate: e.target.value })}
                  style={{
                    paddingLeft: '2.3rem',
                    height: '42px',
                    colorScheme: 'dark',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Ghi chú chi tiết */}
          <div className="form-group">
            <label>Ghi chú bổ sung (Tùy chọn)</label>
            <textarea
              placeholder="VD: Nhóm 4 bạn cần đo đạc gấp cho đồ án tuần tới, có thể nhận ngay khi có..."
              value={waitlistForm.notes || ''}
              onChange={(e) => setWaitlistForm({ ...waitlistForm, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default WaitlistModal;
