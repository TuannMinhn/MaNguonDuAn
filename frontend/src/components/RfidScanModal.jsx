import React from 'react';
import { ShieldAlert, CheckCircle, X } from 'lucide-react';
import Button from './Button';

const RfidScanModal = ({
  isOpen,
  onClose,
  status, // 'idle' | 'success' | 'error'
  scannedUser, // truthy if scanned successfully
  errorMessage,
  idleTitle,
  idleSubtitle = 'Vui lòng đưa thẻ vào máy quét để xác thực...',
  successTitle = 'Đã quét thẻ thành công',
  successChildren
}) => {
  if (!isOpen) return null;

  let bgGradient = 'radial-gradient(circle at center, #1e293b 0%, #0b0f19 100%)';
  let iconColor = 'rgba(255,255,255,0.2)';
  
  if (status === 'success' || scannedUser) {
    bgGradient = 'radial-gradient(circle at center, #064e3b 0%, #0b0f19 100%)';
    iconColor = 'var(--accent-green)';
  } else if (status === 'error') {
    bgGradient = 'radial-gradient(circle at center, #7f1d1d 0%, #0b0f19 100%)';
    iconColor = 'var(--accent-red)';
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: bgGradient,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, color: '#fff', fontFamily: 'var(--font-family)',
      transition: 'background 0.5s ease'
    }}>
      <div style={{ 
        textAlign: 'center', padding: '3rem', 
        background: '#131b2e', borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxWidth: '600px', width: '90%', position: 'relative'
      }}>
        <Button 
          variant="ghost" 
          icon={X} 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: '36px', height: '36px', borderRadius: '50%', padding: 0 }} 
        />

        <div style={{
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 2rem',
          boxShadow: `0 0 40px ${iconColor.replace('var(--accent-green)', 'rgba(16,185,129,0.3)').replace('var(--accent-red)', 'rgba(239,68,68,0.3)')}`,
          animation: status === 'idle' && !scannedUser ? 'pulse 3s infinite' : 'none'
        }}>
          {status === 'success' || scannedUser ? (
            <CheckCircle size={64} style={{ color: 'var(--accent-green)' }} />
          ) : status === 'error' ? (
            <ShieldAlert size={64} style={{ color: 'var(--accent-red)' }} />
          ) : (
            <ShieldAlert size={64} style={{ color: 'rgba(255,255,255,0.2)' }} />
          )}
        </div>
        
        {status === 'error' ? (
          <>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-red)' }}>
              Lỗi xác thực
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#f87171' }}>
              {errorMessage}
            </p>
          </>
        ) : (!scannedUser && status !== 'success') ? (
          <>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              marginBottom: '1rem', 
              background: 'linear-gradient(to right, #fff, #94a3b8)', 
              WebkitBackgroundClip: 'text', 
              color: 'transparent' 
            }}>
              {idleTitle}
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)' }}>
              {idleSubtitle}
            </p>
            <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
              (Nhấn phím 1, 2, 3, 4 để giả lập quét thẻ)
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-green)' }}>
              {successTitle}
            </h1>
            {successChildren}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255,255,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
};

export default RfidScanModal;
