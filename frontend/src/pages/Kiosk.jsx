import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import Button from '../components/Button';

export default function Kiosk() {
  const [status, setStatus] = useState('idle'); // 'idle', 'success', 'error'
  const [message, setMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const scanningRef = useRef(false);

  const [pendingCard, setPendingCard] = useState(null);

  useEffect(() => {
    const handleKeyPress = async (e) => {
      if (scanningRef.current || pendingCard) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const cardId = `CARD-00${e.key}`;
        handleAccessScan(cardId, 'Sử dụng Lab');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleAccessScan = async (cardId, activity) => {
    try {
      scanningRef.current = true;
      setPendingCard(null);

      const payload = { cardId, activity };
      // Override for demo if needed, but for Kiosk, it should use real time.
      // We'll simulate current date for testing so the user doesn't have to wait for the exact day.
      const today = new Date();
      payload.overrideDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const scanRes = await fetch(`${API_BASE_URL}/bookings/rfid-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const scanData = await scanRes.json();
      
      if (!scanRes.ok) {
        setStatus('error');
        setMessage('Từ chối truy cập');
        setSubMessage(scanData.error || 'Thẻ không hợp lệ hoặc không có quyền');
      } else {
        setStatus('success');
        setMessage('Thành công');
        setSubMessage(scanData.message);
      }
      
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        setSubMessage('');
        scanningRef.current = false;
      }, 3000);
      
    } catch (error) {
      setStatus('error');
      setMessage('Lỗi hệ thống');
      setSubMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        setSubMessage('');
        scanningRef.current = false;
      }, 3000);
    }
  };

  let bgGradient = 'radial-gradient(circle at center, #1e293b 0%, #0b0f19 100%)';
  let Icon = ShieldAlert;
  let iconColor = 'rgba(255,255,255,0.2)';
  
  if (status === 'success') {
    bgGradient = 'radial-gradient(circle at center, rgba(16, 185, 129, 0.2) 0%, #0b0f19 100%)';
    Icon = CheckCircle;
    iconColor = 'var(--accent-green)';
  } else if (status === 'error') {
    bgGradient = 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, #0b0f19 100%)';
    Icon = XCircle;
    iconColor = 'var(--accent-red)';
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: bgGradient,
      transition: 'background 0.5s ease',
      color: '#fff',
      fontFamily: 'var(--font-family)',
      zIndex: 9999
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        borderRadius: '24px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '500px',
        width: '90%'
      }}>
        
        
        <>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '2rem',
              border: `2px solid ${iconColor}`,
              boxShadow: `0 0 30px ${iconColor}`
            }}>
              <Icon size={64} color={iconColor} style={{ animation: status === 'idle' ? 'pulse 2s infinite' : 'none' }} />
            </div>

            <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', fontWeight: '700', letterSpacing: '-1px' }}>
              {status === 'idle' ? 'Chạm thẻ RFID' : message}
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: 0, minHeight: '60px', lineHeight: '1.5' }}>
              {status === 'idle' ? (
                <>
                  Vui lòng đặt thẻ của bạn lên thiết bị đọc<br/>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>(Nhấn phím 1, 2, 3, 4 để giả lập quét)</span>
                </>
              ) : subMessage}
            </p>
          </>
      </div>

      <Button 
        variant="secondary" 
        onClick={() => window.location.reload()} 
        style={{
          position: 'absolute',
          bottom: '2rem',
        }}
      >
        Thoát chế độ Kiosk
      </Button>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255,255,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
