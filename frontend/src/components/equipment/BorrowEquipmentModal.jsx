import React from 'react';
import { User, Calendar, Clock, AlertCircle } from 'lucide-react';
import Select from '../Select';
import Modal from '../Modal';
import TimePicker24 from '../TimePicker24';

const BorrowEquipmentModal = ({
  isOpen,
  onClose,
  selectedEquip,
  borrowForm,
  setBorrowForm,
  memberSearchQuery,
  setMemberSearchQuery,
  suggestedMembers = [],
  setSuggestedMembers,
  handleMemberSearch,
  handleBorrowSubmit,
  getTodayDateString = () => new Date().toISOString().split('T')[0],
  isStudentMode = false,
  submitBtnText
}) => {
  if (!isOpen || !selectedEquip) return null;

  const isConsumable = selectedEquip.assetType === 'Linh kiện tiêu hao' || 
    (selectedEquip.assetType && (selectedEquip.assetType.toLowerCase().includes('linh kiện') || selectedEquip.assetType.toLowerCase().includes('vật tư')));

  const maxAvailable = isConsumable 
    ? selectedEquip.totalQty 
    : Math.max(1, selectedEquip.totalQty - (selectedEquip.borrowedQty || 0));
  const isInvalidQty = !borrowForm.qty || Number(borrowForm.qty) < 1 || Number(borrowForm.qty) > maxAvailable;

  // Timer đếm giây thời gian thực để cập nhật minTime liên tục nếu người dùng mở modal lâu
  const [, setCurrentSecond] = React.useState(Date.now());
  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentSecond(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Tính mốc thời gian tối thiểu: nếu mượn ngày hôm nay thì phải sau hiện tại ít nhất 29 phút
  const isToday = !borrowForm.borrowDate || borrowForm.borrowDate === getTodayDateString();
  let minAllowedTime = null;
  if (isToday) {
    const minD = new Date();
    minD.setMinutes(minD.getMinutes() + 29);
    const minH = String(minD.getHours()).padStart(2, '0');
    const minM = String(minD.getMinutes()).padStart(2, '0');
    minAllowedTime = `${minH}:${minM}`;
  }

  // Tự động đẩy borrowTime sang mốc hợp lệ nếu thời gian hiện tại trôi qua và mốc cũ rơi vào khoảng < 29 phút
  React.useEffect(() => {
    if (isToday && minAllowedTime && borrowForm.borrowTime) {
      const [minH, minM] = minAllowedTime.split(':').map(Number);
      const [curH, curM] = borrowForm.borrowTime.split(':').map(Number);
      if (curH < minH || (curH === minH && curM < minM)) {
        setBorrowForm(prev => ({ ...prev, borrowTime: minAllowedTime }));
      }
    }
  }, [isToday, minAllowedTime, borrowForm.borrowTime, setBorrowForm]);

  // Kiểm tra nếu giờ mượn đã bị quá hạn trong quá khứ hoặc trước mốc minAllowedTime
  let isPastOverdue = false;
  if (isToday && minAllowedTime && borrowForm.borrowTime) {
    const [minH, minM] = minAllowedTime.split(':').map(Number);
    const [curH, curM] = borrowForm.borrowTime.split(':').map(Number);
    if (curH < minH || (curH === minH && curM < minM)) {
      isPastOverdue = true;
    }
  }

  // Kiểm tra thời hạn hoàn trả: Mặc định là ngày hôm sau lúc 17:00 nên không cần *
  // Chỉ khi người dùng chọn ngày/giờ mượn mà sau hoặc bằng thời hạn trả thì mới bắt buộc điều chỉnh thời hạn trả
  let isReturnInvalid = false;
  if (!isConsumable) {
    if (borrowForm.borrowDate && borrowForm.borrowTime && borrowForm.expectedReturnDate && borrowForm.expectedReturnTime) {
      const borrowDateTime = new Date(`${borrowForm.borrowDate}T${borrowForm.borrowTime}:00`);
      const returnDateTime = new Date(`${borrowForm.expectedReturnDate}T${borrowForm.expectedReturnTime}:00`);
      if (borrowDateTime >= returnDateTime) {
        isReturnInvalid = true;
      }
    }
  }

  // Kiểm tra đầy đủ các yếu tố bắt buộc để bật nút Xác nhận
  const isMssvEmpty = !borrowForm.mssv || !borrowForm.mssv.trim();
  const isQtyEmpty = !borrowForm.qty || Number(borrowForm.qty) < 1;
  const isBorrowDateEmpty = !borrowForm.borrowDate;

  const isFormIncomplete = isMssvEmpty || isQtyEmpty || isInvalidQty || isBorrowDateEmpty || isPastOverdue || isReturnInvalid;

  const modalFooter = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      <button
        type="submit"
        form="borrow-equip-form"
        className="btn"
        disabled={isFormIncomplete}
        style={{
          backgroundColor: isFormIncomplete ? 'var(--bg-tertiary, #334155)' : 'var(--accent-blue)',
          color: isFormIncomplete ? 'var(--text-muted, #94a3b8)' : '#ffffff',
          cursor: isFormIncomplete ? 'not-allowed' : 'pointer',
          opacity: isFormIncomplete ? 0.6 : 1,
          border: 'none',
          boxShadow: isFormIncomplete ? 'none' : undefined,
          transition: 'all 0.2s ease'
        }}
      >
        {submitBtnText || (isStudentMode ? 'Xác nhận Đặt trước' : 'Xác nhận')}
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
      title={isStudentMode ? (isConsumable ? 'Đặt trước linh kiện' : 'Đặt mượn thiết bị') : (isConsumable ? 'Tạo phiếu xuất kho linh kiện' : 'Tạo phiếu mượn thiết bị')}
      size="lg"
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
              <span style={{ marginLeft: '12px' }}>
                Số lượng khả dụng: <strong style={{ color: 'var(--accent-blue)' }}>
                  {isConsumable ? selectedEquip.totalQty : Math.max(0, selectedEquip.totalQty - (selectedEquip.borrowedQty || 0))}
                </strong>
              </span>
            </div>
          </div>

          {/* Ô tìm gợi ý thành viên hoặc nhập MSSV */}
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label>
              Mã số sinh viên (MSSV) {isMssvEmpty && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="Gõ tên hoặc MSSV để tìm..."
                value={memberSearchQuery !== undefined ? memberSearchQuery : (borrowForm.mssv || '')}
                onFocus={() => {
                  if (handleMemberSearch) {
                    setIsDropdownOpen(true);
                    handleMemberSearch(memberSearchQuery || borrowForm.mssv || '');
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (setMemberSearchQuery) {
                    setIsDropdownOpen(true);
                    if (handleMemberSearch) handleMemberSearch(val);
                    const cleanMssv = val.includes('–') ? val.split('–')[0].trim() : (val.includes('-') ? val.split('-')[0].trim() : val.trim());
                    setBorrowForm({ ...borrowForm, mssv: cleanMssv });
                    setMemberSearchQuery(val);
                  } else {
                    setBorrowForm({ ...borrowForm, mssv: val });
                  }
                }}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>

            {/* List gợi ý dropdown */}
            {isDropdownOpen && suggestedMembers && suggestedMembers.length > 0 && (
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
                      if (setMemberSearchQuery) setMemberSearchQuery(`${m.mssv} – ${m.name}`);
                      setIsDropdownOpen(false);
                      if (setSuggestedMembers) setSuggestedMembers([]);
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

          {/* Số lượng */}
          {(() => {
            const maxAvailable = isConsumable 
              ? selectedEquip.totalQty 
              : Math.max(1, selectedEquip.totalQty - (selectedEquip.borrowedQty || 0));
            const isOverStock = borrowForm.qty !== '' && Number(borrowForm.qty) > maxAvailable;

            return (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>
                    Số lượng xuất/mượn {(isQtyEmpty || isInvalidQty) && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
                  </label>
                  <span style={{ fontSize: '0.75rem', color: isOverStock ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: isOverStock ? '600' : 'normal' }}>
                    Tồn kho khả dụng: <strong style={{ color: isOverStock ? 'var(--accent-red)' : 'var(--accent-blue)' }}>{maxAvailable}</strong>
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    className="no-spin"
                    min="1"
                    required
                    value={borrowForm.qty === '' ? '' : borrowForm.qty}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setBorrowForm({ ...borrowForm, qty: '' });
                      } else {
                        const num = Number(val);
                        setBorrowForm({ ...borrowForm, qty: isNaN(num) ? '' : num });
                      }
                    }}
                    style={{
                      borderColor: isOverStock ? 'var(--accent-red)' : undefined,
                      width: '100%'
                    }}
                  />
                </div>
                {isOverStock && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    color: 'var(--accent-red)', 
                    fontSize: '0.8rem', 
                    fontWeight: '500',
                    marginTop: '0.2rem' 
                  }}>
                    <AlertCircle size={14} />
                    <span>Đã vượt mức số lượng tồn kho</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Khối Thời hạn mượn & Hoàn trả (Áp dụng đồng bộ cho cả Thiết bị & Cấp phát Linh kiện) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: '700', 
              color: 'var(--accent-blue)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Clock size={16} />
              <span>Thời gian mượn & Hoàn trả dự kiến</span>
            </div>

            {/* 1. Hàng Thời gian bắt đầu nhận/mượn */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                🟢 1. Thời gian đến nhận thiết bị / cấp phát:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Ngày mượn / nhận {isBorrowDateEmpty && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      required
                      min={getTodayDateString()}
                      value={borrowForm.borrowDate || getTodayDateString()}
                      onChange={(e) => setBorrowForm({ ...borrowForm, borrowDate: e.target.value })}
                      style={{
                        paddingLeft: '2.3rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        height: '42px',
                        width: '100%',
                        fontSize: '0.88rem',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Giờ mượn / nhận
                  </label>
                  <TimePicker24
                    value={borrowForm.borrowTime}
                    minTime={minAllowedTime}
                    onChange={(newTime) => setBorrowForm({ ...borrowForm, borrowTime: newTime })}
                  />
                </div>
              </div>
            </div>

            {/* 2. Hàng Thời hạn hoàn trả (Mặc định 17h hôm sau, không cần *, chỉ hiện * khi giờ mượn >= giờ trả) */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                🔴 2. Thời hạn hoàn trả {isConsumable && <span style={{ textTransform: 'none', fontWeight: 'normal' }}>(Linh kiện tiêu hao - không bắt buộc)</span>}:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: isReturnInvalid ? 'var(--accent-red)' : 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Ngày hẹn trả {isReturnInvalid && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>* (Phải sau giờ mượn)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      required={!isConsumable}
                      min={borrowForm.borrowDate || getTodayDateString()}
                      value={borrowForm.expectedReturnDate || ''}
                      onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                      style={{
                        paddingLeft: '2.3rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: isReturnInvalid ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        height: '42px',
                        width: '100%',
                        fontSize: '0.88rem',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: isReturnInvalid ? 'var(--accent-red)' : 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Giờ hẹn trả {isReturnInvalid && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
                  </label>
                  <TimePicker24
                    value={borrowForm.expectedReturnTime || '17:00'}
                    onChange={(newTime) => setBorrowForm({ ...borrowForm, expectedReturnTime: newTime })}
                  />
                </div>
              </div>
            </div>
          </div>

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
