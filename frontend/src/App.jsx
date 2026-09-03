import React, { useState, Suspense, lazy, useEffect } from 'react';
import useSWR from 'swr';
import Sidebar from './components/Sidebar';
import Notifications from './components/Notifications';
import Login from './pages/Login'; // Login giữ nguyên để tải ngay lập tức
import { fetcher } from './utils/fetcher';
import { API_BASE_URL } from './config';
import './App.css';

// KỸ THUẬT TỐI ƯU HÓA: Code Splitting & Lazy Loading
// Chỉ tải file mã nguồn của trang nào mà người dùng bấm vào
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Schedule = lazy(() => import('./pages/Schedule'));
const RoomBooking = lazy(() => import('./pages/RoomBooking'));
const RoomHistory = lazy(() => import('./pages/RoomHistory'));
const StudentEquipment = lazy(() => import('./pages/StudentEquipment'));
const RfidManagement = lazy(() => import('./pages/RfidManagement'));
const Kiosk = lazy(() => import('./pages/Kiosk'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Settings = lazy(() => import('./pages/Settings'));
const ComponentsInventory = lazy(() => import('./pages/ComponentsInventory'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const AssetOverview = lazy(() => import('./pages/AssetOverview'));
const UsageAnalytics = lazy(() => import('./pages/UsageAnalytics'));
const ReplacementForecast = lazy(() => import('./pages/ReplacementForecast'));
const NotificationsCenter = lazy(() => import('./pages/NotificationsCenter'));

// Default modules (all enabled) — dùng khi chưa load xong settings
const DEFAULT_MODULES = {
  enableRoomBooking: true,
  enableRFID: true,
  enableKiosk: true,
  enableMaintenance: true,
  enableDepreciation: true,
  enableSchedule: true,
  enableAssetOverview: true,
};

function App() {
  const getInitialPage = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    return hash || 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [pageParams, setPageParams] = useState({});
  const [userRole, setUserRole] = useState('admin'); // Mặc định admin để sẵn sàng chụp ảnh và thao tác
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Lắng nghe hashchange để chuyển trang tức thì qua URL
  useEffect(() => {
    const handleHashChange = () => {
      const page = getInitialPage();
      if (page) setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch system settings (public endpoint, no auth required)
  const { data: systemSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher, { refreshInterval: 30000 });

  // Derive module flags from settings
  const modules = systemSettings ? {
    enableRoomBooking: systemSettings.enableRoomBooking !== 'false',
    enableRFID: systemSettings.enableRFID !== 'false',
    enableKiosk: systemSettings.enableKiosk !== 'false',
    enableMaintenance: systemSettings.enableMaintenance !== 'false',
    enableDepreciation: systemSettings.enableDepreciation !== 'false',
    enableSchedule: systemSettings.enableSchedule !== 'false',
    enableAssetOverview: systemSettings.enableAssetOverview !== 'false',
  } : DEFAULT_MODULES;

  // Redirect to dashboard if current page's module is disabled
  useEffect(() => {
    if (!systemSettings) return;
    const pageModuleMap = {
      'room-booking': 'enableRoomBooking',
      'room-history': 'enableRoomBooking',
      'rfid-management': 'enableRFID',
      'kiosk': 'enableKiosk',
      'equipment-maintenance': 'enableMaintenance',
      'analytics-overview': 'enableAssetOverview',
      'analytics-usage': 'enableDepreciation',
      'equipment-analytics': 'enableDepreciation',
      'analytics-forecast': 'enableDepreciation',
      'schedule': 'enableSchedule',
    };
    const requiredModule = pageModuleMap[currentPage];
    if (requiredModule && !modules[requiredModule]) {
      setCurrentPage('dashboard');
    }
  }, [modules, currentPage, systemSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (page, params = {}) => {
    setPageParams(params);
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'members':
        return <Members />;
      case 'attendance':
        return <Attendance />;
      case 'equipment':
      case 'equipment-list':
        return <Equipment activeTab="list" pageParams={pageParams} />;
      case 'equipment-components':
        return <ComponentsInventory />;
      case 'equipment-borrows':
        return <Equipment activeTab="borrows" pageParams={pageParams} />;
      case 'equipment-maintenance':
        return modules.enableMaintenance ? <Maintenance pageParams={pageParams} onNavigate={navigateTo} /> : <Dashboard />;
      case 'analytics-overview':
        return modules.enableAssetOverview ? <AssetOverview onNavigate={navigateTo} /> : <Dashboard />;
      case 'analytics-usage':
        return modules.enableDepreciation ? <UsageAnalytics /> : <Dashboard />;
      case 'equipment-analytics':
        return modules.enableDepreciation ? <Equipment activeTab="analytics" /> : <Dashboard />;
      case 'analytics-forecast':
        return modules.enableDepreciation ? <ReplacementForecast /> : <Dashboard />;
      case 'schedule':
        return modules.enableSchedule ? <Schedule /> : <Dashboard />;
      case 'room-booking':
        return modules.enableRoomBooking ? <RoomBooking userRole={userRole} /> : <Dashboard />;
      case 'room-history':
        return modules.enableRoomBooking ? <RoomHistory userRole={userRole} /> : <Dashboard />;
      case 'student-equipment':
        return <StudentEquipment />;
      case 'rfid-management':
        return modules.enableRFID ? <RfidManagement /> : <Dashboard />;
      case 'kiosk':
        return modules.enableKiosk ? <Kiosk /> : <Dashboard />;
      case 'notifications-center':
      case 'notifications':
        return <NotificationsCenter onNavigate={navigateTo} userRole={userRole} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!userRole) {
    return <Login setRole={(role) => {
      setUserRole(role);
      setCurrentPage(role === 'student' ? 'room-booking' : 'dashboard');
    }} />;
  }

  return (
    <div className="app-container">
      {currentPage !== 'kiosk' && <Notifications userRole={userRole} />}
      {currentPage !== 'kiosk' && (
        <Sidebar 
          currentPage={currentPage} setCurrentPage={setCurrentPage} 
          userRole={userRole} setUserRole={setUserRole} 
          expanded={sidebarExpanded} setExpanded={setSidebarExpanded}
          modules={modules}
        />
      )}
      <Suspense fallback={
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--border-color)', borderTop: '4px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        {currentPage === 'kiosk' ? (
          renderPage()
        ) : (
          <main className={`main-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
            {renderPage()}
          </main>
        )}
      </Suspense>
    </div>
  );
}

export default App;
