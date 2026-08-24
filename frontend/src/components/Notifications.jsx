import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Info } from 'lucide-react';
import useSWR from 'swr';
import { API_BASE_URL } from '../config';
import Button from './Button';

const fetcher = (url) => fetch(url).then(res => res.json());

export default function Notifications({ userRole }) {
  // Chỉ hiển thị cho admin/quản lý
  if (userRole === 'student') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Polling mỗi 10 giây để nhận thông báo mới
  const { data: notifications = [], mutate } = useSWR(`${API_BASE_URL}/notifications`, fetcher, {
    refreshInterval: 10000 
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'POST' });
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'POST' });
      mutate();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotifClick = (n) => {
    if (!n.read) markAsRead(n.id);
    setSelectedNotif(n);
    setIsOpen(false);
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
  };

  return (
    <>
      {/* Nút Chuông nổi (Floating Bell) */}
      <div style={{ position: 'absolute', top: '2.5rem', right: '2.5rem', zIndex: 1000 }} ref={notifRef}>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', 
              borderRadius: '50%', width: '48px', height: '48px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
            }}
          >
            <Bell size={22} style={{ color: unreadCount > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
          </button>

          {/* Badge số lượng */}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--accent-red)', color: '#fff',
              fontSize: '0.75rem', fontWeight: 'bold',
              minWidth: '22px', height: '22px', borderRadius: '11px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-primary)'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Dropdown Danh sách Thông báo */}
          {isOpen && (
            <div style={{
              position: 'absolute', top: '60px', right: '0',
              width: '380px', background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden',
              animation: 'floatIn 0.2s ease-out'
            }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Thông báo</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có thông báo nào.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotifClick(n)}
                      style={{ 
                        padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                        background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: n.read ? '500' : '700', color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: '1.3' }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem', marginTop: '0.1rem' }}>
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '0.5rem' }}>
                        {n.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Chi tiết Thông báo */}
      {selectedNotif && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Info size={20} style={{ color: 'var(--accent-blue)' }} /> Chi tiết thông báo
              </h3>
              <Button variant="ghost" icon={X} onClick={() => setSelectedNotif(null)} style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }} />
            </div>
            
            <div className="modal-body">
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>{selectedNotif.title}</div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
                {selectedNotif.content}
              </div>

              {selectedNotif.type === 'room_booking' && (
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  <p><strong>Ngày đặt:</strong> {selectedNotif.details.date}</p>
                  <p><strong>Ca đăng ký:</strong> Ca {selectedNotif.details.slotId}</p>
                  <p><strong>Đại diện:</strong> {selectedNotif.details.representativeName}</p>
                  <p><strong>Số lượng thành viên:</strong> {selectedNotif.details.participantsCount}</p>
                  <p><strong>Danh sách tham gia:</strong> {selectedNotif.details.members.map(m => m.name).join(', ')}</p>
                </div>
              )}

              {selectedNotif.type === 'room_booking_bulk' && (
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  <p><strong>Đại diện:</strong> {selectedNotif.details.representativeName}</p>
                  <p><strong>Số lượng thành viên:</strong> {selectedNotif.details.participantsCount}</p>
                  <p><strong>Danh sách tham gia:</strong> {selectedNotif.details.members.map(m => m.name).join(', ')}</p>
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Danh sách các buổi đăng ký:</strong>
                    <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                      {selectedNotif.details.slots.map((s, idx) => (
                        <li key={idx}>Ngày {s.date}, Ca {s.slotId}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedNotif.type.includes('equipment') && (
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  <p><strong>Người mượn:</strong> {selectedNotif.details.userName} ({selectedNotif.details.mssv})</p>
                  <p><strong>Thiết bị:</strong> {selectedNotif.details.equipmentName}</p>
                  <p><strong>Số lượng:</strong> {selectedNotif.details.qty}</p>
                  <p><strong>Thời gian:</strong> {new Date(selectedNotif.details.date).toLocaleString('vi-VN')}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setSelectedNotif(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
