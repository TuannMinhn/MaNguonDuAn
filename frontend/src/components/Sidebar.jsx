import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Cpu, 
  History, 
  Binary,
  DoorOpen,
  ShieldCheck,
  Boxes,
  FileText,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Activity,
  Clock,
  Settings,
  Calendar,
  Wrench,
  AlertTriangle,
  PieChart,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SidebarContext = createContext();

// Component con SidebarItem để xử lý Hover, Label và Alert
function SidebarItem({ icon: Icon, text, active, alert, onClick, hasSubmenu, submenuOpen }) {
  const { expanded } = useContext(SidebarContext);

  return (
    <button
      onClick={onClick}
      className={`nav-link ${active ? 'active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded ? 'space-between' : 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} style={{ minWidth: '20px' }} />
          {alert && (
            <span 
              className="sb-alert-dot" 
              style={{ 
                top: expanded ? '2px' : '-2px', 
                right: expanded ? '-8px' : '-2px' 
              }} 
            />
          )}
        </div>
        <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`} style={{ marginLeft: expanded ? '0.85rem' : '0' }}>
          {text}
        </span>
      </div>

      {hasSubmenu && expanded && (
        <div style={{ marginLeft: 'auto' }}>
          {submenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      )}

      {!expanded && (
        <div className="sb-floating-label">
          {text}
        </div>
      )}
    </button>
  );
}

export default function Sidebar({ currentPage, setCurrentPage, userRole, setUserRole, expanded, setExpanded }) {
  const { theme, toggleTheme } = useTheme();

  const [equipmentOpen, setEquipmentOpen] = useState(
    ['equipment-list', 'equipment-components', 'equipment-borrows', 'equipment-maintenance'].includes(currentPage)
  );

  const [analyticsOpen, setAnalyticsOpen] = useState(
    ['analytics-overview', 'analytics-usage', 'equipment-analytics', 'analytics-forecast'].includes(currentPage)
  );

  const [roomOpen, setRoomOpen] = useState(
    currentPage === 'room-booking' || currentPage === 'room-history'
  );

  useEffect(() => {
    if (['equipment-list', 'equipment-components', 'equipment-borrows', 'equipment-maintenance'].includes(currentPage)) {
      setEquipmentOpen(true);
    }
    if (['analytics-overview', 'analytics-usage', 'equipment-analytics', 'analytics-forecast'].includes(currentPage)) {
      setAnalyticsOpen(true);
    }
    if (currentPage === 'room-booking' || currentPage === 'room-history') {
      setRoomOpen(true);
    }
  }, [currentPage]);

  const allMenuItems = [
    { id: 'dashboard',     label: 'Bảng điều khiển',    icon: LayoutDashboard, roles: ['admin'] },
    { id: 'members',       label: 'Thành viên',          icon: Users, roles: ['admin'] },
    { id: 'equipment-management', label: 'Quản lý kho', icon: Cpu, isParent: 'equipment-management', roles: ['admin'] },
    { id: 'equipment-analytics', label: 'Khấu hao', icon: Activity, isParent: 'equipment-analytics', roles: ['admin'] },
    { id: 'student-equipment', label: 'Kho thiết bị', icon: Boxes, roles: ['student'] },

    { id: 'room-booking-parent', label: 'Phòng Lab', icon: DoorOpen, isParent: 'room', roles: ['admin', 'student'] },
    { id: 'rfid-management', label: 'Thẻ RFID',  icon: ShieldCheck, roles: ['admin'] },
    { id: 'kiosk',         label: 'Kiosk',      icon: DoorOpen, roles: ['admin'] },
    { id: 'settings',      label: 'Cài đặt',  icon: Settings, roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      
      {/* Branding Section */}
      <div className="sb-p-4 sb-flex-between" style={{ paddingBottom: '1rem' }}>
        <div className={`logo-container sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`} style={{ gap: '0.5rem' }}>
          <Binary size={24} style={{ color: 'var(--accent-blue)', minWidth: '24px' }} />
          <span style={{ fontSize: '18px' }}>Lab Manager</span>
        </div>
        <button 
          onClick={() => setExpanded(curr => !curr)} 
          className="btn" 
          style={{ padding: '0.4rem', background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          {expanded ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>
      
      {/* Navigation Section */}
      <SidebarContext.Provider value={{ expanded }}>
        <nav className="sb-flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map(item => {
            const isEquipmentActive = item.isParent === 'equipment-management' && ['equipment-list', 'equipment-components', 'equipment-borrows', 'equipment-maintenance'].includes(currentPage);
            const isAnalyticsActive = item.isParent === 'equipment-analytics' && ['analytics-overview', 'analytics-usage', 'equipment-analytics', 'analytics-forecast'].includes(currentPage);
            const isRoomActive = item.isParent === 'room' && ['room-booking', 'room-history'].includes(currentPage);
            const isActive = currentPage === item.id || isEquipmentActive || isAnalyticsActive || isRoomActive;

            const handleItemClick = () => {
              if (item.isParent === 'equipment-management') {
                if (!expanded) setExpanded(true);
                setEquipmentOpen(!equipmentOpen);
                if (!['equipment-list', 'equipment-components', 'equipment-borrows', 'equipment-maintenance'].includes(currentPage)) {
                  setCurrentPage('equipment-list');
                }
              } else if (item.isParent === 'equipment-analytics') {
                if (!expanded) setExpanded(true);
                setAnalyticsOpen(!analyticsOpen);
                if (!['analytics-overview', 'analytics-usage', 'equipment-analytics', 'analytics-forecast'].includes(currentPage)) {
                  setCurrentPage('analytics-overview');
                }
              } else if (item.isParent === 'room') {
                if (!expanded) setExpanded(true);
                setRoomOpen(!roomOpen);
                if (!['room-booking', 'room-history'].includes(currentPage)) {
                  setCurrentPage('room-booking');
                }
              } else {
                setCurrentPage(item.id);
              }
            };

            const submenuOpen = 
              (item.isParent === 'equipment-management' && equipmentOpen) ||
              (item.isParent === 'equipment-analytics' && analyticsOpen) ||
              (item.isParent === 'room' && roomOpen);

            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <SidebarItem 
                  icon={item.icon}
                  text={item.label}
                  active={isActive}
                  alert={item.alert} // Will show red dot if item.alert is true
                  hasSubmenu={!!item.isParent}
                  submenuOpen={submenuOpen}
                  onClick={handleItemClick}
                />
                
                {/* Submenus */}
                {item.isParent === 'equipment-management' && equipmentOpen && (
                  <div className="submenu">
                    <button onClick={() => setCurrentPage('equipment-list')} className={`submenu-link ${currentPage === 'equipment-list' ? 'active' : ''}`}>
                      <Boxes size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Thiết bị</span>
                    </button>
                    <button onClick={() => setCurrentPage('equipment-components')} className={`submenu-link ${currentPage === 'equipment-components' ? 'active' : ''}`}>
                      <Cpu size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Linh kiện</span>
                    </button>
                    <button onClick={() => setCurrentPage('equipment-borrows')} className={`submenu-link ${currentPage === 'equipment-borrows' ? 'active' : ''}`}>
                      <FileText size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Cấp phát</span>
                    </button>
                    <button onClick={() => setCurrentPage('equipment-maintenance')} className={`submenu-link ${currentPage === 'equipment-maintenance' ? 'active' : ''}`}>
                      <Wrench size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Bảo trì</span>
                    </button>
                  </div>
                )}

                {item.isParent === 'equipment-analytics' && analyticsOpen && (
                  <div className="submenu">
                    <button onClick={() => setCurrentPage('analytics-overview')} className={`submenu-link ${currentPage === 'analytics-overview' ? 'active' : ''}`}>
                      <PieChart size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Tổng quan</span>
                    </button>
                    <button onClick={() => setCurrentPage('analytics-usage')} className={`submenu-link ${currentPage === 'analytics-usage' ? 'active' : ''}`}>
                      <Activity size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Sử dụng</span>
                    </button>
                    <button onClick={() => setCurrentPage('equipment-analytics')} className={`submenu-link ${currentPage === 'equipment-analytics' ? 'active' : ''}`}>
                      <History size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Khấu hao</span>
                    </button>
                    <button onClick={() => setCurrentPage('analytics-forecast')} className={`submenu-link ${currentPage === 'analytics-forecast' ? 'active' : ''}`}>
                      <AlertTriangle size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Dự báo</span>
                    </button>
                  </div>
                )}

                {item.isParent === 'room' && roomOpen && (
                  <div className="submenu">
                    <button onClick={() => setCurrentPage('room-booking')} className={`submenu-link ${currentPage === 'room-booking' ? 'active' : ''}`}>
                      <Calendar size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Đăng ký</span>
                    </button>
                    <button onClick={() => setCurrentPage('room-history')} className={`submenu-link ${currentPage === 'room-history' ? 'active' : ''}`}>
                      <Clock size={16} style={{ minWidth: '16px' }} /> <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Lịch sử</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </SidebarContext.Provider>
      
      {/* Footer / User Section */}
      <div className="sb-border-t sb-p-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: expanded ? '0.75rem' : '0', width: '100%', justifyContent: expanded ? 'center' : 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={toggleTheme}
            style={{ 
              flex: expanded ? 1 : 'none', 
              width: expanded ? 'auto' : '40px',
              height: '40px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              background: 'var(--bg-overlay)', 
              color: 'var(--text-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              transition: 'all 0.2s' 
            }}
            title="Đổi giao diện Sáng/Tối"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => {
              localStorage.removeItem('lab_auth_token');
              setUserRole(null);
            }}
            style={{ 
              flex: expanded ? 2 : 'none', 
              width: expanded ? 'auto' : '40px',
              height: '40px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              background: 'rgba(239,68,68,0.1)', 
              color: 'var(--accent-red)', 
              border: '1px solid rgba(239,68,68,0.2)', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              transition: 'all 0.2s' 
            }}
            title="Đăng xuất"
          >
            <LogOut size={18} />
            <span className={`sb-text-transition ${expanded ? 'sb-w-full' : 'sb-w-0'}`}>Thoát</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
