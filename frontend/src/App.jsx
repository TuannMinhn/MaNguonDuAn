import React, { useState, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import Notifications from './components/Notifications';
import Login from './pages/Login'; // Login giữ nguyên để tải ngay lập tức
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

// New Sidebar Routes
const ComponentsInventory = lazy(() => import('./pages/ComponentsInventory'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const AssetOverview = lazy(() => import('./pages/AssetOverview'));
const UsageAnalytics = lazy(() => import('./pages/UsageAnalytics'));
const ReplacementForecast = lazy(() => import('./pages/ReplacementForecast'));

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState({});
  const [userRole, setUserRole] = useState(null); // 'admin' | 'student' | null
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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
        return <Maintenance pageParams={pageParams} onNavigate={navigateTo} />;
        
      case 'analytics-overview':
        return <AssetOverview onNavigate={navigateTo} />;
      case 'analytics-usage':
        return <UsageAnalytics />;
      case 'equipment-analytics':
        return <Equipment activeTab="analytics" />;
      case 'analytics-forecast':
        return <ReplacementForecast />;
        
      case 'schedule':
        return <Schedule />;

      case 'room-booking':
        return <RoomBooking userRole={userRole} />;
      case 'room-history':
        return <RoomHistory userRole={userRole} />;
      case 'student-equipment':
        return <StudentEquipment />;
      case 'rfid-management':
        return <RfidManagement />;
      case 'kiosk':
        return <Kiosk />;
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
