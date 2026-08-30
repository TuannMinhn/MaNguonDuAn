import React, { useState } from 'react';
import { Users, ShieldCheck, Lock, ArrowRight, Binary } from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Card from '../components/Card';
import TextInput from '../components/TextInput';

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
      background: 'var(--bg-primary)',
      padding: 'var(--space-md)'
    }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>
        <Card style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Binary size={36} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Lab CLB Manager</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Hệ thống quản lý phòng Lab thông minh</p>
            </div>
          </div>

          {!showAdminLogin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem', fontWeight: '500' }}>Vui lòng chọn vai trò của bạn:</h3>
              
              <button 
                type="button"
                onClick={handleStudentLogin}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <Users size={22} style={{ color: 'var(--accent-blue)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>Tôi là Sinh viên</div>
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Điểm danh & Đăng ký phòng</div>
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--accent-blue)' }} />
              </button>

              <button 
                type="button"
                onClick={() => setShowAdminLogin(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <ShieldCheck size={22} style={{ color: 'var(--accent-green)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>Tôi là Quản lý</div>
                    <div style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>Quản trị hệ thống toàn diện</div>
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--accent-green)' }} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem', fontWeight: '500' }}>Xác thực quyền Quản lý</h3>
              
              <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                <TextInput
                  type="password"
                  placeholder="Nhập mật khẩu Admin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  autoFocus
                  required
                />
              </div>
              
              {error && <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', textAlign: 'left' }}>{error}</div>}
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
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
                  disabled={loading || !password.trim()}
                  style={{ flex: 1 }}
                >
                  Đăng nhập
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
