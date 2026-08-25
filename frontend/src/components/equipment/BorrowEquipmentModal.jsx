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
      <button type="submit" className="btn btn-primary">Xác nhận</button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isConsumable ? 'Tạo phiếu xuất kho linh kiện' : 'Tạo phiếu mượn thiết bị'}
      size="md"
    >
      <form onSubmit={handleBorrowSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Info block */}
          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{selectedEquip.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span>Mã: {selectedEquip.code}</span>
            </div>
          </div>

          {/* Ô tìm gợi ý thành viên */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Mã số sinh viên (Người mượn/nhận)</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="Gõ tên hoặc MSSV để tìm..."
                value={memberSearchQuery}
                onChange={(e) => {
                  handleMemberSearch(e.target.value);
                  setBorrowForm({ ...borrowForm, mssv: e.target.value });
                }}
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>

            {/* List gợi ý dropdown */}
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
                      setBorrowForm({ ...borrowForm, mssv: m.mssv });
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
          </div>

          <div className="form-group">
            <label>Số lượng xuất/mượn</label>
            {isConsumable ? (
              <input
                type="number"
                min="1"
                max={selectedEquip.totalQty}
                required
                value={borrowForm.qty}
                onChange={(e) => setBorrowForm({ ...borrowForm, qty: Number(e.target.value) })}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                {selectedEquip.instances && selectedEquip.instances.filter(i => i.status === 'Sẵn sàng').length > 0 ? (
                  selectedEquip.instances.filter(i => i.status === 'Sẵn sàng').map(inst => (
                    <label key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={(borrowForm.selectedInstanceIds || []).includes(inst.id)}
                        onChange={(e) => {
                          const currentSelected = borrowForm.selectedInstanceIds || [];
                          if (e.target.checked) {
                            const newArr = [...currentSelected, inst.id];
                            setBorrowForm({ ...borrowForm, selectedInstanceIds: newArr, qty: newArr.length });
                          } else {
                            const newArr = currentSelected.filter(id => id !== inst.id);
                            setBorrowForm({ ...borrowForm, selectedInstanceIds: newArr, qty: newArr.length || 1 }); // Fallback qty
                          }
                        }}
                      />
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{inst.serialNumber}</span>
                      <span style={{ color: 'var(--text-muted)' }}>(Khấu hao: {inst.depreciationPercent || 0}%)</span>
                    </label>
                  ))
                ) : (
                  <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', padding: '0.5rem' }}>Không có thiết bị nào sẵn sàng trong kho.</div>
                )}
              </div>
            )}
            {/* Thông báo số lượng còn lại */}
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: 'var(--accent-blue)'
            }}>
              {isConsumable ? (
                <>📦 Tồn kho: <strong>{selectedEquip.totalQty}</strong> chiếc</>
              ) : (
                <>
                  📦 Còn khả dụng: <strong>{selectedEquip.instances ? selectedEquip.instances.filter(i => i.status === 'Sẵn sàng').length : 0}</strong> / {selectedEquip.totalQty} chiếc
                  {selectedEquip.borrowedQty > 0 && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--accent-amber)' }}>
                      ({selectedEquip.borrowedQty} đang được mượn)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Hạn trả chỉ có khi không phải là linh kiện tiêu hao */}
          {!isConsumable && (
            <div className="grid-2col" style={{ gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Ngày hẹn trả</label>
                <input
                  type="date"
                  required
                  min={getTodayDateString()}
                  value={borrowForm.expectedReturnDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
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
                    borderRadius: '8px',
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
              rows="2.5"
              placeholder={isConsumable ? "Ghi nhận mục đích xuất linh kiện tiêu hao..." : "Ghi nhận phụ kiện đi kèm hoặc trạng thái trầy xước..."}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-table)', paddingTop: '1rem' }}>
            {modalFooter}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BorrowEquipmentModal;
