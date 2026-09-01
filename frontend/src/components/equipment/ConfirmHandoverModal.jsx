import React from 'react';
import { PackageCheck, Package, User, Clock, Calendar, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import Modal from '../Modal';
import Select from '../Select';
import Button from '../Button';

const ConfirmHandoverModal = ({
  isOpen,
  onClose,
  selectedBorrow,
  borrowForm,
  setBorrowForm,
  onConfirm,
  formatDateWithTime,
  formatTime
}) => {
  if (!isOpen || !selectedBorrow) return null;

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
      <Button type="button" variant="secondary" onClick={onClose}>
        Hủy bỏ
      </Button>
      <Button
        type="submit"
        form="confirm-handover-form"
        variant="primary"
        icon={ArrowRight}
        iconPosition="right"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          borderColor: '#3b82f6'
        }}
      >
        Tiếp tục quét thẻ bàn giao
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)' }}>
          <PackageCheck size={20} />
          <span>Xác nhận thông tin bàn giao thiết bị</span>
        </div>
      }
      size="md"
      footer={modalFooter}
    >
      <form id="confirm-handover-form" onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Banner hướng dẫn nghiệp vụ */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <ShieldCheck size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Kiểm tra ngoại quan thiết bị, chọn tình trạng thực tế và tiến hành quẹt thẻ RFID của sinh viên để hoàn tất bàn giao.
          </span>
        </div>

        {/* Card tóm tắt phiếu mượn chi tiết */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={17} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedBorrow.equipmentName}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mã: <span style={{ color: 'var(--text-secondary)' }}>{selectedBorrow.equipmentCode}</span>
                </div>
              </div>
            </div>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-blue)',
              padding: '2px 10px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap'
            }}>
              SL: {selectedBorrow.qty} chiếc
            </span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
            <span>Người nhận máy: <strong style={{ color: 'var(--text-primary)' }}>{selectedBorrow.borrowerName}</strong> (MSSV: <code style={{ color: 'var(--accent-blue)' }}>{selectedBorrow.mssv}</code>)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              <Clock size={14} style={{ color: 'var(--accent-amber)' }} />
              <span>Hẹn nhận: <strong>{formatDateWithTime ? formatDateWithTime(selectedBorrow.borrowDate) : (formatTime ? formatTime(selectedBorrow.borrowDate) : selectedBorrow.borrowDate)}</strong></span>
            </div>
            {selectedBorrow.expectedReturnDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <Calendar size={14} style={{ color: 'var(--accent-green)' }} />
                <span>Hẹn trả: <strong>{formatDateWithTime ? formatDateWithTime(selectedBorrow.expectedReturnDate) : (formatTime ? formatTime(selectedBorrow.expectedReturnDate) : selectedBorrow.expectedReturnDate)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Tình trạng thiết bị */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--accent-green)' }} />
            <span>Tình trạng thiết bị lúc bàn giao:</span>
          </label>
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

        {/* Ghi chú chi tiết */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
            Ghi chú bàn giao & Phụ kiện đi kèm:
          </label>
          <textarea
            placeholder="Ghi nhận phụ kiện bàn giao kèm theo (dây nguồn, que đo...) hoặc trạng thái vỏ máy..."
            value={borrowForm.borrowNotes}
            onChange={(e) => setBorrowForm({ ...borrowForm, borrowNotes: e.target.value })}
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
      </form>
    </Modal>
  );
};

export default ConfirmHandoverModal;
