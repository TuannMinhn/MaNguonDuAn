import React from 'react';
import { User } from 'lucide-react';
import Select from '../Select';
import Modal from '../Modal';

const BorrowEquipmentModal = ({
  isOpen,
  onClose,
  selectedEquip,
  borrowForm,
  setBorrowForm,
  memberSearchQuery,
  setMemberSearchQuery,
  suggestedMembers,
  setSuggestedMembers,
  handleMemberSearch,
  handleBorrowSubmit,
  getTodayDateString
}) => {
  if (!isOpen || !selectedEquip) return null;

  const isConsumable = selectedEquip.assetType === 'Linh kiện tiêu hao' || 
    (selectedEquip.assetType && (selectedEquip.assetType.toLowerCase().includes('linh kiện') || selectedEquip.assetType.toLowerCase().includes('vật tư')));

  const modalFooter = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      <button type="submit" form="borrow-equip-form" className="btn btn-primary">Xác nhận</button>
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
      title={isConsumable ? 'Tạo phiếu xuất kho linh kiện' : 'Tạo phiếu mượn thiết bị'}
      size="md"
      footer={modalFooter}
    >
      <style>{`
        .borrow-modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding-bottom: var(--space-md);
        }
        .borrow-modal-form .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin: 0;
        }
        .borrow-modal-form .form-group label {
          margin: 0;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }
        .borrow-modal-form .grid-2col {
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
      <form id="borrow-equip-form" onSubmit={handleBorrowSubmit}>
        <div className="borrow-modal-form">
          {/* Info block */}
          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedEquip.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span>Mã: {selectedEquip.code}</span>
            </div>
          </div>

          {/* Ô tìm gợi ý thành viên */}
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label>Mã số sinh viên (Người mượn/nhận)</label>
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
                  const val = e.target.value;
                  setIsDropdownOpen(true);
                  handleMemberSearch(val);
                  const cleanMssv = val.includes('–') ? val.split('–')[0].trim() : (val.includes('-') ? val.split('-')[0].trim() : val.trim());
                  setBorrowForm({ ...borrowForm, mssv: cleanMssv });
                }}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>

            {/* List gợi ý dropdown */}
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
                      setBorrowForm({ ...borrowForm, mssv: m.mssv });
                      setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                      setIsDropdownOpen(false);
                      setSuggestedMembers([]);
                    }}
                    style={{ padding: '0.6rem var(--space-md)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
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
            <label>Số lượng xuất/mượn</label>
            <input
              type="number"
              className="no-spin"
              min="1"
              max={isConsumable ? selectedEquip.totalQty : Math.max(1, selectedEquip.totalQty - (selectedEquip.borrowedQty || 0))}
              required
              value={borrowForm.qty === '' ? '' : borrowForm.qty}
              onChange={(e) => {
                const val = e.target.value;
                setBorrowForm({ ...borrowForm, qty: val === '' ? '' : Number(val) });
              }}
            />
          </div>

          {/* Hạn trả chỉ có khi không phải là linh kiện tiêu hao */}
          {!isConsumable && (
            <div className="grid-2col">
              <div className="form-group">
                <label>Ngày hẹn trả</label>
                <input
                  type="date"
                  required
                  min={getTodayDateString()}
                  value={borrowForm.expectedReturnDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Giờ hẹn trả</label>
                <input
                  type="time"
                  required
                  value={borrowForm.expectedReturnTime}
                  onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnTime: e.target.value })}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          )}

          {!isConsumable && (
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
          )}

          <div className="form-group">
            <label>Ghi chú chi tiết</label>
            <textarea
              placeholder={isConsumable ? "Ghi nhận mục đích xuất linh kiện tiêu hao..." : "Ghi nhận phụ kiện đi kèm hoặc trạng thái trầy xước..."}
              value={borrowForm.borrowNotes}
              onChange={(e) => setBorrowForm({ ...borrowForm, borrowNotes: e.target.value })}
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
                resize: 'none',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto'
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BorrowEquipmentModal;
