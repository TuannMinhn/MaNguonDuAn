import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, Clock, AlertCircle, Shield, CreditCard, Building2, AlertTriangle, CheckCircle2, FileText, Phone, Hash, School } from 'lucide-react';
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

  // Borrower Type: 'internal' (Thành viên CLB) vs 'external_guest' (Sinh viên ngoài CLB)
  const borrowerType = borrowForm.borrowerType || 'internal';
  const isGuest = borrowerType === 'external_guest';
  const guaranteeMethod = borrowForm.guaranteeMethod || 'sponsor'; // 'sponsor' | 'deposit_money' | 'deposit_id_card' | 'in_lab_only'

  // Timer đếm giây thời gian thực để cập nhật minTime liên tục nếu người dùng mở modal lâu
  const [, setCurrentSecond] = useState(Date.now());
  useEffect(() => {
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

  // Tự động đẩy borrowTime sang mốc hợp lệ nếu thời gian hiện tại trôi qua
  useEffect(() => {
    if (isToday && minAllowedTime && borrowForm.borrowTime) {
      const [minH, minM] = minAllowedTime.split(':').map(Number);
      const [curH, curM] = borrowForm.borrowTime.split(':').map(Number);
      if (curH < minH || (curH === minH && curM < minM)) {
        setBorrowForm(prev => ({ ...prev, borrowTime: minAllowedTime }));
      }
    }
  }, [isToday, minAllowedTime, borrowForm.borrowTime, setBorrowForm]);

  // Kiểm tra nếu giờ mượn đã bị quá hạn trong quá khứ
  let isPastOverdue = false;
  if (isToday && minAllowedTime && borrowForm.borrowTime) {
    const [minH, minM] = minAllowedTime.split(':').map(Number);
    const [curH, curM] = borrowForm.borrowTime.split(':').map(Number);
    if (curH < minH || (curH === minH && curM < minM)) {
      isPastOverdue = true;
    }
  }

  // Kiểm tra thời hạn hoàn trả
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

  // Validation rules
  const isQtyEmpty = !borrowForm.qty || Number(borrowForm.qty) < 1;
  const isBorrowDateEmpty = !borrowForm.borrowDate;

  let isSpecificFormInvalid = false;
  if (isGuest) {
    const isGuestInfoMissing = !borrowForm.guestName?.trim() || !borrowForm.guestMssv?.trim() || !borrowForm.guestPhone?.trim();
    let isGuaranteeInvalid = false;

    if (guaranteeMethod === 'sponsor') {
      isGuaranteeInvalid = !borrowForm.sponsorMssv?.trim();
    } else if (guaranteeMethod === 'deposit_money') {
      isGuaranteeInvalid = !borrowForm.depositAmount || Number(borrowForm.depositAmount) <= 0;
    } else if (guaranteeMethod === 'in_lab_only') {
      const requiredLvl = Number(selectedEquip.requiredLevel) || 1;
      isGuaranteeInvalid = requiredLvl > 1 && !isConsumable;
    }

    isSpecificFormInvalid = isGuestInfoMissing || isGuaranteeInvalid;
  } else {
    isSpecificFormInvalid = !borrowForm.mssv || !borrowForm.mssv.trim();
  }

  const isFormIncomplete = isSpecificFormInvalid || isQtyEmpty || isInvalidQty || isBorrowDateEmpty || isPastOverdue || isReturnInvalid;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSponsorDropdownOpen, setIsSponsorDropdownOpen] = useState(false);
  const [sponsorSearchQuery, setSponsorSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const sponsorDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (sponsorDropdownRef.current && !sponsorDropdownRef.current.contains(e.target)) {
        setIsSponsorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        {submitBtnText || (isStudentMode ? 'Xác nhận Đặt trước' : (isGuest ? 'Tạo phiếu mượn Khách' : 'Xác nhận mượn'))}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isStudentMode 
        ? (isConsumable ? 'Đặt trước linh kiện' : 'Đặt mượn thiết bị') 
        : (isConsumable ? 'Tạo phiếu xuất kho linh kiện' : (isGuest ? 'Phiếu mượn Sinh viên ngoài CLB (Khách)' : 'Tạo phiếu mượn thiết bị'))
      }
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
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <span>Mã: <strong>{selectedEquip.code}</strong></span>
              <span>Phân loại Cấp: <strong style={{ color: selectedEquip.requiredLevel === 3 ? 'var(--accent-purple)' : (selectedEquip.requiredLevel === 2 ? 'var(--accent-blue)' : 'var(--accent-green)') }}>Cấp {selectedEquip.requiredLevel || 1}</strong></span>
              <span>
                Số lượng khả dụng: <strong style={{ color: 'var(--accent-blue)' }}>
                  {isConsumable ? selectedEquip.totalQty : Math.max(0, selectedEquip.totalQty - (selectedEquip.borrowedQty || 0))}
                </strong>
              </span>
            </div>
          </div>

          {/* Chọn Đối tượng mượn: Thành viên CLB vs Sinh viên ngoài CLB */}
          {!isStudentMode && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              background: 'var(--bg-secondary)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                onClick={() => setBorrowForm(prev => ({ ...prev, borrowerType: 'internal' }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: !isGuest ? 'var(--accent-blue)' : 'transparent',
                  color: !isGuest ? '#fff' : 'var(--text-secondary)',
                  fontWeight: !isGuest ? '600' : 'normal',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={15} />
                <span>Thành viên nội bộ CLB</span>
              </button>
              <button
                type="button"
                onClick={() => setBorrowForm(prev => ({ 
                  ...prev, 
                  borrowerType: 'external_guest',
                  guaranteeMethod: prev.guaranteeMethod || 'sponsor'
                }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isGuest ? 'var(--accent-purple)' : 'transparent',
                  color: isGuest ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isGuest ? '600' : 'normal',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Shield size={15} />
                <span>Sinh viên ngoài CLB (Khách)</span>
              </button>
            </div>
          )}

          {/* KHỐI 1: THÔNG TIN NGƯỜI MƯỢN */}
          {!isGuest ? (
            /* Dành cho thành viên nội bộ */
            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
              <label>
                Mã số sinh viên (MSSV) {(!borrowForm.mssv || !borrowForm.mssv.trim()) && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>*</span>}
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
                      <span style={{ color: 'var(--text-muted)' }}>MSSV: {m.mssv} ({m.points || 100}đ)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Dành cho sinh viên ngoài CLB (Khách) */
            <div style={{
              background: 'rgba(168, 85, 247, 0.05)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <Shield size={16} />
                <span>1. THÔNG TIN SINH VIÊN NGOÀI CLB (BẮT BUỘC ĐỊNH DANH)</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Họ và tên sinh viên <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A..."
                      value={borrowForm.guestName || ''}
                      onChange={(e) => setBorrowForm({ ...borrowForm, guestName: e.target.value })}
                      style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Mã số sinh viên (MSSV) <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="2021xxxx..."
                      value={borrowForm.guestMssv || ''}
                      onChange={(e) => setBorrowForm({ ...borrowForm, guestMssv: e.target.value, mssv: e.target.value })}
                      style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Số điện thoại liên hệ <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="0912xxxxxx..."
                      value={borrowForm.guestPhone || ''}
                      onChange={(e) => setBorrowForm({ ...borrowForm, guestPhone: e.target.value })}
                      style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem' }}>Khoa / Lớp / Trường</label>
                  <div style={{ position: 'relative' }}>
                    <School size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Khoa Điện - Điện tử..."
                      value={borrowForm.guestFaculty || ''}
                      onChange={(e) => setBorrowForm({ ...borrowForm, guestFaculty: e.target.value })}
                      style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 PHƯƠNG ÁN XỬ LÝ CHO KHÁCH NGOÀI CLB */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  2. CHỌN HÌNH THỨC ĐẢM BẢO & TRÁCH NHIỆM (CHÍNH SÁCH MƯỢN):
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* PHƯƠNG ÁN A */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: guaranteeMethod === 'sponsor' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                    border: `1px solid ${guaranteeMethod === 'sponsor' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="guaranteeMethod"
                      value="sponsor"
                      checked={guaranteeMethod === 'sponsor'}
                      onChange={() => setBorrowForm({ ...borrowForm, guaranteeMethod: 'sponsor' })}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🛡️ Phương án A: Bảo lãnh qua Thành viên CLB</span>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', padding: '1px 6px', borderRadius: '4px' }}>Khuyên dùng</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Thành viên chính thức (Điểm $\ge 80$) đứng ra bảo lãnh. Nếu làm hỏng/mất hoặc trễ hạn, <strong>điểm số & trách nhiệm đền bù sẽ tính trực tiếp lên tài khoản người bảo lãnh</strong> (Tối đa 1 đơn/thành viên).
                      </div>

                      {guaranteeMethod === 'sponsor' && (
                        <div style={{ marginTop: '0.6rem', position: 'relative' }} ref={sponsorDropdownRef}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'block' }}>
                            MSSV hoặc Tên Thành viên bảo lãnh <span style={{ color: 'var(--accent-red)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Nhập MSSV hoặc tên thành viên bảo lãnh..."
                            value={sponsorSearchQuery !== '' ? sponsorSearchQuery : (borrowForm.sponsorMssv || '')}
                            onFocus={() => {
                              setIsSponsorDropdownOpen(true);
                              if (handleMemberSearch) handleMemberSearch(sponsorSearchQuery || borrowForm.sponsorMssv || '');
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSponsorSearchQuery(val);
                              setIsSponsorDropdownOpen(true);
                              if (handleMemberSearch) handleMemberSearch(val);
                              const clean = val.includes('–') ? val.split('–')[0].trim() : (val.includes('-') ? val.split('-')[0].trim() : val.trim());
                              setBorrowForm({ ...borrowForm, sponsorMssv: clean });
                            }}
                            style={{ height: '36px', fontSize: '0.85rem' }}
                          />

                          {isSponsorDropdownOpen && suggestedMembers && suggestedMembers.length > 0 && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0,
                              backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 'var(--radius-md)', zIndex: 350, overflowY: 'auto', maxHeight: '160px',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: '4px'
                            }}>
                              {suggestedMembers.map(m => {
                                const pts = Number(m.points !== undefined ? m.points : 100);
                                const isEligible = pts >= 80;
                                return (
                                  <div
                                    key={m.mssv}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setBorrowForm({ ...borrowForm, sponsorMssv: m.mssv, sponsorName: m.name });
                                      setSponsorSearchQuery(`${m.mssv} – ${m.name} (${pts}đ)`);
                                      setIsSponsorDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '0.5rem var(--space-md)',
                                      cursor: isEligible ? 'pointer' : 'not-allowed',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      opacity: isEligible ? 1 : 0.5,
                                      background: 'transparent'
                                    }}
                                  >
                                    <span><strong>{m.name}</strong> ({m.mssv})</span>
                                    <span style={{ color: isEligible ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                      {pts}đ {isEligible ? '✓ Đủ ĐK' : '✗ Dưới 80đ'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* PHƯƠNG ÁN B */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: (guaranteeMethod === 'deposit_money' || guaranteeMethod === 'deposit_id_card') ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary)',
                    border: `1px solid ${(guaranteeMethod === 'deposit_money' || guaranteeMethod === 'deposit_id_card') ? 'var(--accent-amber)' : 'var(--border-color)'}`,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="guaranteeMethod"
                      value="deposit_money"
                      checked={guaranteeMethod === 'deposit_money' || guaranteeMethod === 'deposit_id_card'}
                      onChange={() => setBorrowForm({ ...borrowForm, guaranteeMethod: 'deposit_money' })}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>💵 Phương án B: Ký quỹ Tiền cọc hoặc Giữ Thẻ SV / CCCD gốc</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Khởi tạo tài khoản vãng lai 0đ. Mở khóa khi để lại tiền đặt cọc tương đương giá trị hiện vật hoặc nộp Thẻ SV / CCCD gốc tại Ban chủ nhiệm.
                      </div>

                      {(guaranteeMethod === 'deposit_money' || guaranteeMethod === 'deposit_id_card') && (
                        <div style={{ marginTop: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'block' }}>
                              Hình thức ký quỹ
                            </label>
                            <select
                              value={borrowForm.depositType || 'money'}
                              onChange={(e) => {
                                const type = e.target.value;
                                setBorrowForm({
                                  ...borrowForm,
                                  depositType: type,
                                  guaranteeMethod: type === 'money' ? 'deposit_money' : 'deposit_id_card'
                                });
                              }}
                              style={{ height: '36px', fontSize: '0.8rem', width: '100%', borderRadius: '4px', background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            >
                              <option value="money">💰 Đặt cọc Tiền mặt (VND)</option>
                              <option value="student_card">🪪 Giữ Thẻ Sinh viên gốc</option>
                              <option value="id_card">🆔 Giữ Căn cước công dân (CCCD) gốc</option>
                            </select>
                          </div>

                          {borrowForm.depositType !== 'student_card' && borrowForm.depositType !== 'id_card' && (
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'block' }}>
                                Số tiền cọc (VNĐ) <span style={{ color: 'var(--accent-red)' }}>*</span>
                              </label>
                              <input
                                type="number"
                                step="10000"
                                min="10000"
                                placeholder="Ví dụ: 200000..."
                                value={borrowForm.depositAmount || ''}
                                onChange={(e) => setBorrowForm({ ...borrowForm, depositAmount: Number(e.target.value) })}
                                style={{ height: '36px', fontSize: '0.85rem' }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* PHƯƠNG ÁN C */}
                  {(() => {
                    const reqLvl = Number(selectedEquip.requiredLevel) || 1;
                    const isRestricted = reqLvl > 1 && !isConsumable;
                    return (
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: guaranteeMethod === 'in_lab_only' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                        border: `1px solid ${guaranteeMethod === 'in_lab_only' ? 'var(--accent-green)' : 'var(--border-color)'}`,
                        cursor: isRestricted ? 'not-allowed' : 'pointer',
                        opacity: isRestricted ? 0.6 : 1
                      }}>
                        <input
                          type="radio"
                          name="guaranteeMethod"
                          value="in_lab_only"
                          disabled={isRestricted}
                          checked={guaranteeMethod === 'in_lab_only'}
                          onChange={() => setBorrowForm({ ...borrowForm, guaranteeMethod: 'in_lab_only' })}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>🏢 Phương án C: Giới hạn sử dụng tại chỗ trong Lab (In-Lab Only)</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Chỉ áp dụng cho linh kiện tiêu hao hoặc thiết bị Cấp 1 (Cơ bản) dưới sự giám sát của trực ca. <strong>Tuyệt đối không mang thiết bị ra ngoài</strong>.
                          </div>
                          {isRestricted && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '4px', fontWeight: '600' }}>
                              ⚠️ Thiết bị này thuộc Cấp {reqLvl} (Chuyên sâu), không áp dụng hình thức dùng tại chỗ cho khách ngoài CLB.
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })()}
                </div>

                {/* BẢNG QUY CHẾ XỬ LÝ VI PHẠM */}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontWeight: '700', color: 'var(--accent-red)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <AlertTriangle size={14} />
                    <span>CHẾ TÀI XỬ LÝ VI PHẠM DÀNH CHO SINH VIÊN NGOÀI CLB:</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                    <li><strong>Trả trễ hạn:</strong> Phạt tiền mặt 15.000đ/ngày (Quá 3 ngày báo cáo Khoa/Giám thị).</li>
                    <li><strong>Làm hỏng / mất:</strong> Buộc đền bù 100% giá trị thiết bị theo thị trường (Không hợp tác sẽ gửi Đoàn TN/Khoa).</li>
                    <li><strong>Mang thiết bị ra ngoài không phép:</strong> Khóa vĩnh viễn quyền vào Lab và kỷ luật cấp Trường.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Số lượng */}
          {(() => {
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
                    <span>Đã vượt mức số lượng tồn kho khả dụng</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Khối Thời hạn mượn & Hoàn trả */}
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

            {/* 2. Hàng Thời hạn hoàn trả */}
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
                value={borrowForm.initialCondition || 'Tốt / Hoạt động bình thường'}
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
              placeholder={isConsumable ? "Ghi nhận mục đích xuất linh kiện tiêu hao..." : "Ghi nhận phụ kiện đi kèm hoặc trạng thái thiết bị..."}
              value={borrowForm.borrowNotes || ''}
              onChange={(e) => setBorrowForm({ ...borrowForm, borrowNotes: e.target.value })}
              style={{
                width: '100%',
                minHeight: '68px',
                height: '68px',
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
