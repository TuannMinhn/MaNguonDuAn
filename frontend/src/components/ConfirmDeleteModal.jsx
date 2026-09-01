import React from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  itemName = '',
  itemCode = '',
  itemCategory = '',
  warningMessage = 'Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu hệ thống.',
  confirmText = 'Xác nhận xóa vĩnh viễn',
  cancelText = 'Hủy bỏ',
  isDeleting = false
}) {
  if (!isOpen) return null;

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isDeleting}
      >
        {cancelText}
      </Button>
      <Button
        type="button"
        variant="danger"
        icon={Trash2}
        iconPosition="left"
        onClick={onConfirm}
        disabled={isDeleting}
        style={{
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)'
        }}
      >
        {isDeleting ? 'Đang xóa...' : confirmText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: '700' }}>
          <ShieldAlert size={20} />
          <span>{title}</span>
        </div>
      }
      size="sm"
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Card tóm tắt đối tượng sắp xóa */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.03))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
            {itemName || 'Mục đã chọn'}
          </div>
          {(itemCode || itemCategory) && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {itemCode && <span>Mã: <strong style={{ color: 'var(--text-primary)' }}>{itemCode}</strong></span>}
              {itemCode && itemCategory && <span>•</span>}
              {itemCategory && <span>{itemCategory}</span>}
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '0.75rem var(--space-md)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem'
        }}>
          <AlertTriangle size={17} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ lineHeight: 1.45 }}>
            {warningMessage}
          </div>
        </div>
      </div>
    </Modal>
  );
}
