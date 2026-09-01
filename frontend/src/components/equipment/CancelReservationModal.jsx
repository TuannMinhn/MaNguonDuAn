import React, { useState } from 'react';
import { AlertTriangle, Clock, User, Package, Calendar, XCircle, RotateCcw } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';

const CancelReservationModal = ({
  isOpen,
  onClose,
  ticket,
  onConfirm,
  isCancelling = false,
  formatDateWithTime,
  formatTime
}) => {
  const [reason, setReason] = useState('Quản lý hủy giữ chỗ do người mượn không đến nhận');

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason);
  };

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isCancelling}
      >
        Hủy bỏ
      </Button>
      <Button
        type="submit"
        form="cancel-reservation-form"
        variant="danger"
        disabled={isCancelling}
        icon={XCircle}
        iconPosition="left"
      >
        {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy & Hoàn kho'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
          <AlertTriangle size={20} />
          <span>Hủy phiếu đặt trước thiết bị</span>
        </div>
      }
      size="md"
      footer={modalFooter}
    >
      <form id="cancel-reservation-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Banner cảnh báo */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <RotateCcw size={20} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.88rem', lineHeight: '1.45' }}>
            <strong style={{ color: 'var(--accent-red)' }}>Xác nhận hủy đặt trước:</strong> Thao tác này sẽ hủy phiếu mượn và ngay lập tức <strong>hoàn trả {ticket.qty} thiết bị</strong> về tồn kho khả dụng để phục vụ các sinh viên khác.
          </div>
        </div>

        {/* Card tóm tắt phiếu mượn */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
            <span>Thiết bị: <strong style={{ color: 'var(--text-primary)' }}>{ticket.equipmentName}</strong> (Mã: {ticket.equipmentCode})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
            <span>Người đặt: <strong style={{ color: 'var(--text-primary)' }}>{ticket.borrowerName}</strong> (MSSV: <code style={{ color: 'var(--accent-blue)' }}>{ticket.mssv}</code>)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <Clock size={14} />
              <span>Hẹn nhận: <strong style={{ color: 'var(--text-primary)' }}>{formatDateWithTime ? formatDateWithTime(ticket.borrowDate) : formatTime(ticket.borrowDate)}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <Calendar size={14} />
              <span>Số lượng hoàn kho: <strong style={{ color: 'var(--accent-green)' }}>+{ticket.qty} chiếc</strong></span>
            </div>
          </div>
        </div>

        {/* Lý do hủy */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
            Lý do hủy giữ chỗ:
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy phiếu đặt trước..."
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '0.6rem var(--space-md)',
              fontSize: '0.88rem',
              resize: 'none'
            }}
          />
        </div>
      </form>
    </Modal>
  );
};

export default CancelReservationModal;
