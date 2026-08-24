import React, { useState } from 'react';
import { Users, ShieldCheck, Lock, ArrowRight, Binary } from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';

export default function Login({ setRole }) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = () => {
    setRole('student');
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setRole('admin');
      } else {
        setError(data.error || 'Mật khẩu không chính xác');
      }
    } catch (err) {
      setError('Lỗi kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      background: 'var(--bg-primary)'
    }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '90%', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Binary size={40} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Lab CLB Manager</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Hệ thống quản lý phòng Lab thông minh</p>
          </div>
        </div>

        {!showAdminLogin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>Vui lòng chọn vai trò của bạn:</h3>
            
            <button 
              onClick={handleStudentLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Users size={24} style={{ color: 'var(--accent-blue)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>Tôi là Sinh viên</div>
                  <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Điểm danh & Đăng ký phòng</div>
                </div>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--accent-blue)' }} />
            </button>

            <button 
              onClick={() => setShowAdminLogin(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ShieldCheck size={24} style={{ color: 'var(--accent-green)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>Tôi là Quản lý</div>
                  <div style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>Quản trị hệ thống toàn diện</div>
                </div>
              </div>
              <ArrowRight size={20} style={{ color: 'var(--accent-green)' }} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>Xác thực quyền Quản lý</h3>
            
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                placeholder="Nhập mật khẩu Admin..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-overlay)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)',
                  fontSize: '1rem', outline: 'none'
                }}
              />
            </div>
            
            {error && <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', textAlign: 'left' }}>{error}</div>}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => { setShowAdminLogin(false); setError(''); setPassword(''); }}
                style={{ flex: 1 }}
              >
                Quay lại
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                loading={loading}
                style={{ flex: 1 }}
              >
                Đăng nhập
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
