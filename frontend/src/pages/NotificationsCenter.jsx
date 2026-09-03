import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  Bell, 
  CheckCheck, 
  Search, 
  Filter, 
  ArrowRight, 
  DoorOpen, 
  Cpu, 
  Wrench, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  User, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Boxes
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Card from '../components/Card';
import TextInput from '../components/TextInput';
import EmptyState from '../components/EmptyState';

export default function NotificationsCenter({ onNavigate, userRole }) {
  const { data: notifications = [], mutate } = useSWR(`${API_BASE_URL}/notifications`, fetcher, {
    refreshInterval: 5000
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'room', 'equipment', 'maintenance', 'rfid'
  const [expandedId, setExpandedId] = useState(null);
  const [isReadingAll, setIsReadingAll] = useState(false);

  // Lấy Header xác thực
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Xử lý đánh dấu 1 thông báo là đã đọc
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      mutate();
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  // Xử lý đánh dấu tất cả là đã đọc (Giữ nguyên hiển thị toàn bộ danh sách)
  const handleMarkAllAsRead = async () => {
    setIsReadingAll(true);
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      mutate();
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err);
    } finally {
      setIsReadingAll(false);
    }
  };

  // Helper thông minh xác định trang đích chính xác dựa trên loại, tiêu đề và nội dung
  const getDestinationPage = (notif) => {
    const fullText = `${notif.type || ''} ${notif.title || ''} ${notif.content || ''}`.toLowerCase();
    
    // 1. Báo hỏng, bảo trì, sự cố -> Trang Bảo trì
    if (fullText.includes('hỏng') || fullText.includes('bảo trì') || fullText.includes('sự cố') || fullText.includes('maintenance') || fullText.includes('issue') || fullText.includes('repair')) {
      return { page: 'equipment-maintenance', label: 'Tiếp', icon: Wrench, color: 'var(--accent-red)' };
    }

    // 2. Mượn trả, cấp phát, hàng chờ -> Trang Cấp phát (equipment-borrows)
    if (fullText.includes('mượn') || fullText.includes('cấp phát') || fullText.includes('borrow') || fullText.includes('trả') || fullText.includes('hoàn trả') || fullText.includes('waitlist') || fullText.includes('hàng chờ')) {
      return { page: 'equipment-borrows', label: 'Tiếp', icon: Boxes, color: 'var(--accent-green)' };
    }

    // 3. Linh kiện, vật tư tiêu hao -> Trang Linh kiện (equipment-components)
    if (fullText.includes('linh kiện') || fullText.includes('vật tư') || fullText.includes('component')) {
      return { page: 'equipment-components', label: 'Tiếp', icon: Cpu, color: 'var(--accent-green)' };
    }

    // 4. Ca phòng, đặt phòng, checkout -> Trang Lịch sử ca phòng (room-history)
    if (fullText.includes('phòng') || fullText.includes('booking') || fullText.includes('checkout') || fullText.includes('ca trực') || fullText.includes('buổi')) {
      return { page: 'room-history', label: 'Tiếp', icon: DoorOpen, color: 'var(--accent-blue)' };
    }

    // 5. Thẻ từ, RFID, điểm danh -> Trang Thẻ RFID
    if (fullText.includes('thẻ') || fullText.includes('rfid') || fullText.includes('card') || fullText.includes('kiosk') || fullText.includes('quẹt')) {
      return { page: 'rfid-management', label: 'Tiếp', icon: ShieldCheck, color: 'var(--accent-purple)' };
    }

    // 6. Cài đặt, sao lưu, hệ thống -> Trang Cài đặt
    if (fullText.includes('cài đặt') || fullText.includes('sao lưu') || fullText.includes('backup') || fullText.includes('setting')) {
      return { page: 'settings', label: 'Tiếp', icon: Layers, color: 'var(--accent-amber)' };
    }

    // 7. Thành viên, chuyên cần -> Trang Thành viên
    if (fullText.includes('thành viên') || fullText.includes('sinh viên') || fullText.includes('chuyên cần') || fullText.includes('member')) {
      return { page: 'members', label: 'Tiếp', icon: User, color: 'var(--accent-blue)' };
    }

    return { page: 'dashboard', label: 'Tiếp', icon: ArrowRight, color: 'var(--accent-blue)' };
  };

  // Helper lấy Badge loại thông báo
  const getTypeBadge = (notif) => {
    const fullText = `${notif.type || ''} ${notif.title || ''} ${notif.content || ''}`.toLowerCase();
    if (fullText.includes('hỏng') || fullText.includes('bảo trì') || fullText.includes('sự cố')) {
      return { label: 'Bảo trì & Sự cố', class: 'badge-danger', icon: AlertTriangle };
    }
    if (fullText.includes('mượn') || fullText.includes('cấp phát') || fullText.includes('trả')) {
      return { label: 'Cấp phát & Mượn', class: 'badge-success', icon: Boxes };
    }
    if (fullText.includes('phòng') || fullText.includes('booking') || fullText.includes('checkout')) {
      return { label: 'Ca phòng Lab', class: 'badge-info', icon: DoorOpen };
    }
    if (fullText.includes('thẻ') || fullText.includes('rfid')) {
      return { label: 'Thẻ RFID', class: 'badge-warning', icon: ShieldCheck };
    }
    return { label: 'Hệ thống', class: 'badge-info', icon: Info };
  };

  // Helper định dạng thời gian
  const formatDateTime = (isoString) => {
    if (!isoString) return 'Vừa xong';
    try {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${timePart} - ${datePart}`;
    } catch (e) {
      return isoString;
    }
  };

  const getRelativeTime = (isoString) => {
    if (!isoString) return '';
    const now = new Date();
    const d = new Date(isoString);
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return `${Math.floor(diffSec / 86400)} ngày trước`;
  };

  // Thống kê số lượng
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    
    let roomCount = 0;
    let equipCount = 0;
    let maintCount = 0;
    let rfidCount = 0;

    notifications.forEach(n => {
      const fullText = `${n.type || ''} ${n.title || ''} ${n.content || ''}`.toLowerCase();
      if (fullText.includes('hỏng') || fullText.includes('bảo trì') || fullText.includes('sự cố')) maintCount++;
      else if (fullText.includes('mượn') || fullText.includes('cấp phát') || fullText.includes('thiết bị') || fullText.includes('trả')) equipCount++;
      else if (fullText.includes('phòng') || fullText.includes('booking') || fullText.includes('ca')) roomCount++;
      else if (fullText.includes('thẻ') || fullText.includes('rfid')) rfidCount++;
    });

    return { total, unread, roomCount, equipCount, maintCount, rfidCount };
  }, [notifications]);

  // Lọc thông báo theo Tab và Tìm kiếm
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const fullText = `${n.type || ''} ${n.title || ''} ${n.content || ''}`.toLowerCase();

      // Lọc theo Tab
      if (activeTab === 'unread' && n.read) return false;
      if (activeTab === 'room' && !(fullText.includes('phòng') || fullText.includes('booking') || fullText.includes('ca'))) return false;
      if (activeTab === 'equipment' && !(fullText.includes('mượn') || fullText.includes('cấp phát') || fullText.includes('thiết bị') || fullText.includes('trả'))) return false;
      if (activeTab === 'maintenance' && !(fullText.includes('hỏng') || fullText.includes('bảo trì') || fullText.includes('sự cố'))) return false;
      if (activeTab === 'rfid' && !(fullText.includes('thẻ') || fullText.includes('rfid'))) return false;

      // Lọc theo Tìm kiếm
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const mssvMatch = n.details?.mssv ? String(n.details.mssv).toLowerCase().includes(q) : false;
        const nameMatch = n.details?.representativeName ? String(n.details.representativeName).toLowerCase().includes(q) : false;
        const equipMatch = n.details?.equipmentName ? String(n.details.equipmentName).toLowerCase().includes(q) : false;
        return titleMatch || contentMatch || mssvMatch || nameMatch || equipMatch;
      }
      return true;
    });
  }, [notifications, activeTab, searchTerm]);

  const handleNavigateToTarget = (destPage) => {
    if (onNavigate) {
      onNavigate(destPage);
    } else {
      window.location.hash = `#${destPage}`;
    }
  };

  return (
    <div className="page-container fade-in">
      {/* Header với khoảng đệm an toàn tránh chuông */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bell className="text-blue-500" size={24} />
              Trung tâm Thông báo &amp; Lịch sử Sự kiện
              {stats.unread > 0 && (
                <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem' }}>
                  {stats.unread} chưa đọc
                </span>
              )}
            </h2>
            <p className="page-subtitle">Xem toàn bộ thông tin thông báo, người thực hiện, thời gian chi tiết và điều hướng trực tiếp tới trang liên quan</p>
          </div>

          {/* Container nút Đọc tất cả có marginRight 4.5rem tránh đè chuông */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginRight: '4.5rem' }}>
            <Button
              variant="secondary"
              icon={CheckCheck}
              iconPosition="left"
              disabled={stats.unread === 0 || isReadingAll}
              onClick={handleMarkAllAsRead}
              title="Đánh dấu đã đọc tất cả nhưng vẫn giữ nguyên toàn bộ lịch sử thông báo"
            >
              {isReadingAll ? 'Đang cập nhật...' : 'Đọc tất cả'}
            </Button>
          </div>
        </div>

        {/* 4 Thẻ KPI canh giữa (CENTER) theo yêu cầu */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}>
              <Bell size={24} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng số thông báo</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' }}>{stats.total} tin</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}>
              <AlertTriangle size={24} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bảo trì &amp; Sự cố</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-red)', textAlign: 'center' }}>{stats.maintCount} tin</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-blue)' }}>
              <DoorOpen size={24} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ca phòng &amp; Checkout</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-blue)', textAlign: 'center' }}>{stats.roomCount} tin</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' }}>
              <Cpu size={24} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cấp phát &amp; Mượn trả</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-green)', textAlign: 'center' }}>{stats.equipCount} tin</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Box */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Tất cả ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`btn btn-sm ${activeTab === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)', color: stats.unread > 0 ? 'var(--accent-red)' : undefined }}
            >
              Chưa đọc ({stats.unread})
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`btn btn-sm ${activeTab === 'maintenance' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Bảo trì ({stats.maintCount})
            </button>
            <button
              onClick={() => setActiveTab('room')}
              className={`btn btn-sm ${activeTab === 'room' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Ca phòng Lab ({stats.roomCount})
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`btn btn-sm ${activeTab === 'equipment' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Cấp phát &amp; Mượn trả ({stats.equipCount})
            </button>
            <button
              onClick={() => setActiveTab('rfid')}
              className={`btn btn-sm ${activeTab === 'rfid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Thẻ RFID ({stats.rfidCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ minWidth: '280px', flex: '1', maxWidth: '400px' }}>
            <TextInput
              icon={Search}
              placeholder="Tìm theo tiêu đề, người thực hiện, MSSV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notification Items List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Không tìm thấy thông báo nào"
          description={searchTerm ? `Không có thông báo nào khớp với từ khóa "${searchTerm}"` : "Hiện tại chưa có thông báo nào trong danh mục này."}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredNotifications.map((notif) => {
            const isExpanded = expandedId === notif.id;
            const dest = getDestinationPage(notif);
            const badge = getTypeBadge(notif);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  setExpandedId(isExpanded ? null : notif.id);
                  if (!notif.read) handleMarkAsRead(notif.id);
                }}
                className="glass-card"
                style={{
                  padding: '1.1rem 1.25rem',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${notif.read ? 'var(--border-color)' : 'var(--accent-blue)'}`,
                  backgroundColor: notif.read ? 'var(--bg-card)' : 'rgba(59, 130, 246, 0.04)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Dòng tóm tắt thông báo */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1 }}>
                    <div style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-md)',
                      background: notif.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.12)',
                      color: dest.color,
                      marginTop: '0.1rem'
                    }}>
                      <BadgeIcon size={20} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: notif.read ? '600' : '700', fontSize: '1rem', color: notif.read ? 'var(--text-primary)' : 'var(--accent-blue)' }}>
                          {notif.title}
                        </span>
                        <span className={`badge ${badge.class}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {badge.label}
                        </span>
                        {!notif.read && (
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} title="Chưa đọc" />
                        )}
                      </div>

                      <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {notif.content}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} />
                          {formatDateTime(notif.timestamp)} ({getRelativeTime(notif.timestamp)})
                        </span>
                        {notif.details?.representativeName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <User size={13} />
                            {notif.details.representativeName} {notif.details.mssv ? `(${notif.details.mssv})` : ''}
                          </span>
                        )}
                        {notif.details?.userName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <User size={13} />
                            {notif.details.userName} {notif.details.mssv ? `(${notif.details.mssv})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút Tiếp -> Điều hướng trực tiếp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.read) handleMarkAsRead(notif.id);
                        handleNavigateToTarget(dest.page);
                      }}
                      title={`Chuyển tới trang ${dest.page}`}
                    >
                      Tiếp
                    </Button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                      title={isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* BẢNG CHI TIẾT TOÀN BỘ MỌI THỨ KHI BẤM VÀO (EXPANDED DETAILS) */}
                {isExpanded && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px dashed var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    animation: 'fadeIn 0.2s ease-in-out'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Info size={16} style={{ color: 'var(--accent-blue)' }} />
                      Chi tiết sự kiện &amp; Dữ liệu đối soát hệ thống:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã định danh thông báo:</div>
                        <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{notif.id}</div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thời gian khởi tạo chính xác:</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{notif.timestamp}</div>
                      </div>

                      {(notif.details?.mssv || notif.details?.representativeMssv) && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MSSV người liên quan:</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-blue)' }}>{notif.details?.mssv || notif.details?.representativeMssv}</div>
                        </div>
                      )}

                      {(notif.details?.representativeName || notif.details?.userName) && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Họ và tên người thực hiện:</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{notif.details?.representativeName || notif.details?.userName}</div>
                        </div>
                      )}

                      {notif.details?.equipmentName && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thiết bị liên quan:</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-green)' }}>{notif.details.equipmentName}</div>
                        </div>
                      )}

                      {notif.details?.issue && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mô tả sự cố hư hỏng:</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-red)' }}>{notif.details.issue}</div>
                        </div>
                      )}

                      {notif.details?.slotId && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Khung ca phòng:</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ca {notif.details.slotId} ({notif.details.date || 'Hôm nay'})</div>
                        </div>
                      )}

                      {notif.details?.cardId && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã thẻ từ RFID:</div>
                          <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{notif.details.cardId}</div>
                        </div>
                      )}
                    </div>

                    {/* Danh sách thành viên đi cùng nếu có */}
                    {notif.details?.members && Array.isArray(notif.details.members) && notif.details.members.length > 0 && (
                      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Danh sách sinh viên cùng ca:</div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {notif.details.members.map((m, idx) => (
                            <span key={idx} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                              {typeof m === 'string' ? m : `${m.name || m.mssv} (${m.mssv})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
