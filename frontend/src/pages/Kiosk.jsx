import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';

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

  let Icon = ShieldAlert;
  let iconColor = 'var(--text-muted)';
  let borderColor = 'var(--border-color)';
  
  if (status === 'success') {
    Icon = CheckCircle;
    iconColor = 'var(--accent-green)';
    borderColor = 'rgba(16, 185, 129, 0.4)';
  } else if (status === 'error') {
    Icon = XCircle;
    iconColor = 'var(--accent-red)';
    borderColor = 'rgba(239, 68, 68, 0.4)';
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
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-family)',
      zIndex: 9999,
      padding: 'var(--space-md)'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%'
      }}>
        <Card style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: `1px solid ${borderColor}`,
          transition: 'border-color 0.3s ease'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.75rem',
            border: `2px solid ${iconColor}`
          }}>
            <Icon size={52} style={{ color: iconColor }} />
          </div>

          <h1 style={{
            fontSize: '2rem',
            margin: '0 0 1rem 0',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            color: 'var(--text-primary)'
          }}>
            {status === 'idle' ? 'Chạm thẻ RFID' : message}
          </h1>
          
          <div style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            margin: 0,
            minHeight: '56px',
            lineHeight: '1.5',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {status === 'idle' ? (
              <>
                <span>Vui lòng đặt thẻ của bạn lên thiết bị đọc</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  (Nhấn phím 1, 2, 3, 4 để giả lập quét)
                </span>
              </>
            ) : (
              <span>{subMessage}</span>
            )}
          </div>
        </Card>
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
    </div>
  );
}
