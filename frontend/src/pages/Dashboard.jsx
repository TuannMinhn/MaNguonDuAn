import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  Users, Cpu, CheckCircle, AlertTriangle, LogIn, Clock, Zap, History, Calendar, Package,
  LayoutDashboard, Activity, Package2, ArrowRight
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import ExportButton from '../components/ExportButton';
import SkeletonLoader from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', 
  '#84cc16', '#d946ef', '#0ea5e9', '#eab308', '#f43f5e'
];

export default function Dashboard({ onNavigate }) {

  // SWR Caching
  const { data: members } = useSWR(`${API_BASE_URL}/members`, fetcher);
  const { data: equip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: rfidHistory } = useSWR(`${API_BASE_URL}/rfid-history`, fetcher);
  const { data: borrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: allBookings } = useSWR(`${API_BASE_URL}/bookings/all`, fetcher);
  const { data: systemSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);

  // Bộ lọc thời gian cho 3 biểu đồ phân tích (đồng bộ theo cấu hình Settings)
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('7_days');

  React.useEffect(() => {
    if (systemSettings?.dashboardDefaultTimeRange) {
      setAnalyticsTimeRange(systemSettings.dashboardDefaultTimeRange);
    }
  }, [systemSettings?.dashboardDefaultTimeRange]);

  // Tối ưu O(1) — tính toán 1 lần khi data hoặc khoảng thời gian đổi
  const dashboardData = useMemo(() => {
    if (!members && !equip) return null;

    const mList = Array.isArray(members) ? members : [];
    const eList = Array.isArray(equip) ? equip : [];
    const rList = Array.isArray(rfidHistory) ? rfidHistory : [];
    const bList = Array.isArray(borrows) ? borrows : [];
    const bkList = Array.isArray(allBookings) ? allBookings : [];

    // 1. Stats
    const active = mList.filter(m => m.active);
    const activeBorrowTickets = bList.filter(b => b.status === 'Đang mượn');
    const borrowedCount = activeBorrowTickets.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
    const stats = {
      totalMembers: mList.length,
      activeMembers: active.length,
      borrowedEquip: borrowedCount
    };

    // 2. Overdue Equipment
    const now = new Date();
    now.setHours(0,0,0,0);
    const overdue = bList.filter(b => b.status === 'Đang mượn' && b.expectedReturnDate && new Date(b.expectedReturnDate) < now);
    overdue.forEach(b => {
      const expected = new Date(b.expectedReturnDate);
      b.daysOverdue = Math.ceil(Math.abs(now - expected) / (1000 * 60 * 60 * 24));
    });
    overdue.sort((a,b) => b.daysOverdue - a.daysOverdue);

    // 3. Recent Activity (Grouped & Top 10)
    const sortedHistory = [...rList].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const groupedHistory = [];
    let i = 0;
    while (i < sortedHistory.length) {
      const current = sortedHistory[i];
      const match = bList.find(b => b.mssv === current.mssv && b.borrowDate && Math.abs(new Date(b.borrowDate) - new Date(current.timestamp)) < 60000);
      if (match) {
        groupedHistory.push({ ...current, equipmentName: match.equipmentName, equipmentCode: match.equipmentCode });
      } else {
        groupedHistory.push(current);
      }
      i++;
    }

    // 4. Charts Data theo khoảng thời gian đã chọn (Hỗ trợ 7 ngày, 30 ngày, 3 tháng, 6 tháng, Tất cả)
    const rawEquipCategory = eList.reduce((acc, item) => {
      const cat = item.category || 'Khác';
      acc[cat] = (acc[cat] || 0) + (Number(item.totalQty) || 1);
      return acc;
    }, {});

    // Sắp xếp danh mục giảm dần, lấy Top 5 và gom các nhóm còn lại vào "Khác"
    const sortedCategories = Object.entries(rawEquipCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const totalEquipQty = sortedCategories.reduce((sum, c) => sum + c.value, 0);
    
    let equipCategoryData = [];
    if (sortedCategories.length <= 6) {
      equipCategoryData = sortedCategories;
    } else {
      const top5 = sortedCategories.slice(0, 5);
      const othersVal = sortedCategories.slice(5).reduce((sum, c) => sum + c.value, 0);
      equipCategoryData = [
        ...top5,
        { name: 'Khác (Các nhóm còn lại)', value: othersVal }
      ];
    }

    // Tính toán Traffic Trends (Lưu lượng sử dụng)
    const trafficTrends = [];
    const validDates = [];
    const currentDate = new Date();

    if (analyticsTimeRange === '3_months' || analyticsTimeRange === '6_months' || analyticsTimeRange === 'all') {
      // Nhóm theo THÁNG khi xem 3 tháng / 6 tháng / Tất cả
      const monthCount = analyticsTimeRange === '3_months' ? 3 : (analyticsTimeRange === '6_months' ? 6 : 6);
      
      for (let m = monthCount - 1; m >= 0; m--) {
        const targetMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - m, 1);
        const year = targetMonthDate.getFullYear();
        const monthNum = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${monthNum}`;
        const display = `Thg ${monthNum}/${String(year).substring(2)}`;

        const monthHistory = rList.filter(h => h.timestamp && h.timestamp.startsWith(monthPrefix));
        const monthBookings = bkList.filter(b => b.date && b.date.startsWith(monthPrefix));
        const monthBorrows = bList.filter(b => b.borrowDate && b.borrowDate.startsWith(monthPrefix));

        // Lưu danh sách ngày của tháng này vào validDates để lọc Top mượn & Top slot
        const daysInMonth = new Date(year, targetMonthDate.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          validDates.push(`${monthPrefix}-${String(day).padStart(2, '0')}`);
        }

        trafficTrends.push({
          display,
          attendanceCount: monthHistory.filter(h => h.action && (h.action.includes('checkin') || h.action.includes('check-in'))).length,
          bookingCount: monthBookings.length,
          borrowCount: monthBorrows.length
        });
      }
    } else {
      // Nhóm theo NGÀY khi xem 7 ngày hoặc 30 ngày
      const numDays = analyticsTimeRange === '30_days' ? 30 : 7;
      
      for (let d = numDays - 1; d >= 0; d--) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - d);
        const dateStr = targetDate.toISOString().split('T')[0];
        validDates.push(dateStr);
        
        const display = numDays <= 7 
          ? targetDate.toLocaleDateString('vi-VN', { weekday: 'short' }) + ' ' + targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          : targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        const dayHistory = rList.filter(h => h.timestamp && h.timestamp.startsWith(dateStr));
        const dayBookings = bkList.filter(b => b.date === dateStr);
        const dayBorrows = bList.filter(b => b.borrowDate && b.borrowDate.startsWith(dateStr));

        trafficTrends.push({
          display,
          attendanceCount: dayHistory.filter(h => h.action && (h.action.includes('checkin') || h.action.includes('check-in'))).length,
          bookingCount: dayBookings.length,
          borrowCount: dayBorrows.length
        });
      }
    }

    // 5. Top Equipment (Lọc theo khoảng thời gian đã chọn)
    const equipmentMap = {};
    const filteredBorrows = bList.filter(b => b.borrowDate && validDates.includes(b.borrowDate.substring(0, 10)));

    filteredBorrows.forEach(b => {
      if (b.equipmentName) {
        equipmentMap[b.equipmentName] = (equipmentMap[b.equipmentName] || 0) + (Number(b.qty) || 1);
      }
    });

    const topEquipment = Object.entries(equipmentMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 6. Top Slots (Lọc theo khoảng thời gian đã chọn)
    const s = systemSettings || {};
    const slotLabels = [
      { id: 'morning_1', label: `${s.slot_morning_1_start || '07:00'}–${s.slot_morning_1_end || '09:00'}` },
      { id: 'morning_2', label: `${s.slot_morning_2_start || '09:00'}–${s.slot_morning_2_end || '11:00'}` },
      { id: 'afternoon_1', label: `${s.slot_afternoon_1_start || '12:00'}–${s.slot_afternoon_1_end || '14:00'}` },
      { id: 'afternoon_2', label: `${s.slot_afternoon_2_start || '14:00'}–${s.slot_afternoon_2_end || '16:00'}` },
      { id: 'evening_1', label: `${s.slot_evening_1_start || '16:00'}–${s.slot_evening_1_end || '18:00'}` },
      { id: 'evening_2', label: `${s.slot_evening_2_start || '18:00'}–${s.slot_evening_2_end || '20:00'}` }
    ];

    const filteredBookings = bkList.filter(b => validDates.includes(b.date));

    const topSlots = slotLabels.map(slot => ({
      name: slot.label,
      value: filteredBookings.filter(b => String(b.slotId) === slot.id).length
    }));

    return { 
      stats, 
      activeMembersList: active, 
      overdueEquip: overdue, 
      recentActivities: groupedHistory.slice(0, 10), 
      chartData: { 
        equipCategory: equipCategoryData, 
        totalEquipQty,
        trafficTrends, 
        topEquipment, 
        topSlots 
      } 
    };
  }, [members, equip, rfidHistory, borrows, allBookings, systemSettings, analyticsTimeRange]);

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
           date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getActivityIcon = (module, action) => {
    if (module === 'attendance') return action === 'check-out' ? <LogIn size={15} style={{transform:'rotate(180deg)'}} /> : <CheckCircle size={15} />;
    if (module === 'equipment') return action === 'borrow' ? <Package size={15} /> : <Zap size={15} />;
    if (module === 'room_booking') return <Calendar size={15} />;
    return <History size={15} />;
  };

  const getActivityColor = (module, action) => {
    if (module === 'attendance') return action === 'check-out' ? 'var(--accent-amber)' : 'var(--accent-green)';
    if (module === 'equipment') return action === 'borrow' ? 'var(--accent-blue)' : 'var(--accent-purple)';
    if (module === 'room_booking') return '#06b6d4';
    return 'var(--text-secondary)';
  };

  const getActivityText = (module, action) => {
    if (module === 'attendance') return action === 'check-in' ? 'Check-in phòng Lab' : 'Check-out phòng Lab';
    if (module === 'equipment') return action === 'borrow' ? 'Mượn thiết bị' : 'Trả thiết bị';
    if (module === 'room_booking') {
      if (action === 'book_group') return 'Đăng ký phòng Lab theo nhóm';
      return action === 'book_representative' ? 'Đại diện đặt phòng' : 'Tham gia đặt phòng';
    }
    return action;
  };

  const handleExportCSV = (dataToExport) => {
    if (!dataToExport || dataToExport.length === 0) return null;
    const headers = ["Thoi gian", "Nguoi dung", "MSSV", "Phan loai", "Hanh dong", "Trang thai"];
    const rows = dataToExport.map(act => [
      `"${new Date(act.timestamp).toLocaleString('vi-VN')}"`,
      `"${act.userName}"`, `"${act.mssv}"`, `"${act.module}"`,
      `"${getActivityText(act.module, act.action)}"`,
      act.success ? "Thanh cong" : "That bai"
    ]);
    return "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  };

  // State drill-down Modal xem chi tiết
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: '',
    title: '',
    data: []
  });

  const handleOpenDetail = (type) => {
    if (!dashboardData) return;
    if (type === 'members') {
      setModalConfig({
        isOpen: true,
        type: 'members',
        title: `Danh sách thành viên (${members?.length || 0})`,
        data: members || []
      });
    } else if (type === 'active') {
      setModalConfig({
        isOpen: true,
        type: 'active',
        title: `Thành viên đang trực Lab (${dashboardData.activeMembersList?.length || 0})`,
        data: dashboardData.activeMembersList || []
      });
    } else if (type === 'borrowed') {
      // Nếu có prop onNavigate, điều hướng trực tiếp sang tab Phiếu mượn & Hoạt động trả
      if (onNavigate) {
        onNavigate('equipment-borrows', { borrowTab: 'Đang mượn' });
        return;
      }
      const activeBorrows = (borrows || []).filter(b => b.status === 'Đang mượn');
      setModalConfig({
        isOpen: true,
        type: 'borrowed',
        title: `Danh sách thiết bị đang mượn (${activeBorrows.length} phiếu)`,
        data: activeBorrows
      });
    } else if (type === 'overdue') {
      if (onNavigate) {
        onNavigate('equipment-borrows', { borrowTab: 'Trễ hạn' });
        return;
      }
      setModalConfig({
        isOpen: true,
        type: 'overdue',
        title: `Cảnh báo thiết bị quá hạn (${dashboardData.overdueEquip?.length || 0})`,
        data: dashboardData.overdueEquip || []
      });
    }
  };

  const membersModalColumns = useMemo(() => [
    { accessorKey: 'mssv', header: 'MSSV', sortable: true, cell: (row) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.mssv}</span> },
    { accessorKey: 'name', header: 'Họ và tên', sortable: true, cell: (row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
    { accessorKey: 'role', header: 'Vai trò', sortable: true, cell: (row) => <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>{row.role || 'Thành viên'}</span> },
    { accessorKey: 'active', header: 'Trực Lab', sortable: true, align: 'center', cell: (row) => (
      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: row.active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', color: row.active ? 'var(--accent-green)' : 'var(--text-muted)' }}>
        {row.active ? 'Đang trực' : 'Vắng mặt'}
      </span>
    )}
  ], []);

  const borrowedModalColumns = useMemo(() => [
    { accessorKey: 'borrowerName', header: 'Người mượn', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.borrowerName}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.mssv}</div>
      </div>
    )},
    { accessorKey: 'equipmentName', header: 'Thiết bị', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.equipmentName}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{row.equipmentId?.substring(0,6)}</div>
      </div>
    )},
    { accessorKey: 'qty', header: 'Số lượng', sortable: true, align: 'center', cell: (row) => <strong>{row.qty || 1}</strong> },
    { accessorKey: 'borrowDate', header: 'Ngày mượn', sortable: true, align: 'center', cell: (row) => formatTime(row.borrowDate) },
    { accessorKey: 'expectedReturnDate', header: 'Hạn trả', sortable: true, align: 'center', cell: (row) => (
      <span style={{ color: row.daysOverdue ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: row.daysOverdue ? 600 : 400 }}>
        {formatTime(row.expectedReturnDate)}
      </span>
    )},
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <button
          className="btn btn-sm btn-ghost"
          style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          onClick={() => {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            if (onNavigate) {
              onNavigate('equipment-borrows', { ticketId: row.id, borrowTab: 'Đang mượn' });
            }
          }}
        >
          Xem chi tiết <ArrowRight size={13} />
        </button>
      )
    }
  ], [onNavigate]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!dashboardData) return (
    <div className="page-container fade-in">
      <div>
        <h2 className="page-header" style={{ marginBottom: '0.25rem' }}>
          <LayoutDashboard size={20} /> Bảng điều khiển
        </h2>
        <p className="page-subtitle" style={{ margin: 0 }}>Tổng quan hoạt động phòng Lab CLB</p>
      </div>
      <SkeletonLoader type="dashboard" count={4} />
    </div>
  );

  const { stats, activeMembersList, overdueEquip, recentActivities, chartData } = dashboardData;

  return (
    <div className="page-container fade-in">

      {/* ── Page Header ─── */}
      <div>
        <h2 className="page-header" style={{ marginBottom: '0.25rem' }}>
          <LayoutDashboard size={20} /> Bảng điều khiển
        </h2>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Tổng quan hoạt động phòng Lab CLB
        </p>
      </div>

      {/* ── KPI Summary Strip ─── */}
      <div className="glass-card db-kpi-strip">
        {/* KPI 1 */}
        <div className="db-kpi-item db-kpi-clickable" onClick={() => handleOpenDetail('members')} title="Bấm để xem danh sách thành viên">
          <span className="db-kpi-dot" style={{ background: 'var(--accent-blue)' }} />
          <div className="db-kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)' }}>
            <Users size={18} />
          </div>
          <div>
            <div className="kpi-label">Tổng thành viên</div>
            <div className="kpi-value">
              {stats.totalMembers} <span className="kpi-unit">người</span>
            </div>
          </div>
        </div>

        <div className="db-kpi-divider" />

        {/* KPI 2 */}
        <div 
          className="db-kpi-item db-kpi-active db-kpi-clickable" 
          onClick={() => handleOpenDetail('active')}
          title="Bấm để xem danh sách đang trực Lab"
          style={{
            background: stats.activeMembers > 0 ? 'rgba(16,185,129,0.06)' : 'transparent',
            border: stats.activeMembers > 0 ? '1px solid rgba(16,185,129,0.18)' : '1px solid transparent',
          }}
        >
          <div className="db-kpi-icon" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)', position: 'relative' }}>
            {stats.activeMembers > 0 && <span className="db-live-dot" />}
            <LogIn size={18} />
          </div>
          <div>
            <div className="kpi-label" style={{ color: stats.activeMembers > 0 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
              Đang trực Lab
            </div>
            <div className="kpi-value" style={{ color: stats.activeMembers > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
              {stats.activeMembers} <span className="kpi-unit">người</span>
            </div>
          </div>
        </div>

        <div className="db-kpi-divider" />

        {/* KPI 3 */}
        <div 
          className="db-kpi-item db-kpi-active db-kpi-clickable" 
          onClick={() => handleOpenDetail('borrowed')}
          title="Bấm để xem danh sách thiết bị đang mượn"
          style={{
            background: stats.borrowedEquip > 0 ? 'rgba(245,158,11,0.06)' : 'transparent',
            border: stats.borrowedEquip > 0 ? '1px solid rgba(245,158,11,0.18)' : '1px solid transparent',
          }}
        >
          <div className="db-kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--accent-amber)' }}>
            <Cpu size={18} />
          </div>
          <div>
            <div className="kpi-label">Thiết bị đang mượn</div>
            <div className="kpi-value" style={{ color: stats.borrowedEquip > 0 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
              {stats.borrowedEquip} <span className="kpi-unit">chiếc</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cảnh báo quá hạn ─── */}
      {overdueEquip.length > 0 && (
        <div className="glass-card alert-card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239,68,68,0.15)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <AlertTriangle size={16} />
              Cảnh báo thiết bị quá hạn ({overdueEquip.length})
            </h3>
            <button 
              onClick={() => handleOpenDetail('overdue')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-red)',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              Xem chi tiết <ArrowRight size={14} />
            </button>
          </div>
          <table className="compact-alert-table">
            <thead>
              <tr>
                <th>Người mượn</th>
                <th>Thiết bị</th>
                <th style={{ textAlign: 'center' }}>Ngày hẹn trả</th>
                <th style={{ textAlign: 'right' }}>Trễ</th>
              </tr>
            </thead>
            <tbody>
              {overdueEquip.map((item, idx) => (
                <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail('overdue')} title="Bấm để xem chi tiết">
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {item.borrowerName}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem', fontSize: '0.75rem' }}>({item.mssv})</span>
                  </td>
                  <td>{item.equipmentName} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>#{item.equipmentId.substring(0,6)}</span></td>
                  <td style={{ textAlign: 'center' }}>{formatTime(item.expectedReturnDate).split(' ')[1]}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>
                      {item.daysOverdue} ngày
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Main Dashboard Grid (analytics 1.6fr | operations 1fr) ─── */}
      <div className="dashboard-grid">

        {/* LEFT: Analytics Column */}
        <div className="analytics-column">

          {/* Biểu đồ lưu lượng */}
          <div className="glass-card chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h3 className="chart-header" style={{ margin: 0 }}>
                <Activity size={16} style={{ color: 'var(--accent-green)' }} />
                Lưu lượng sử dụng
              </h3>
              
              {/* Bộ lọc khoảng thời gian đồng bộ cho 3 biểu đồ */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.25)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
                {[
                  { id: '7_days', label: '7 ngày' },
                  { id: '30_days', label: '30 ngày' },
                  { id: '3_months', label: '3 tháng' },
                  { id: '6_months', label: '6 tháng' },
                  { id: 'all', label: 'Tất cả' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAnalyticsTimeRange(tab.id)}
                    style={{
                      background: analyticsTimeRange === tab.id ? 'var(--accent-blue)' : 'transparent',
                      color: analyticsTimeRange === tab.id ? '#fff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: analyticsTimeRange === tab.id ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {[
                { label: 'Điểm danh', color: 'var(--accent-green)' },
                { label: 'Đặt phòng', color: 'var(--accent-blue)' },
                { label: 'Mượn thiết bị', color: 'var(--accent-purple)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  {item.label}
                </div>
              ))}
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.trafficTrends} margin={{ top: 10, right: 20, left: 0, bottom: analyticsTimeRange === '30_days' ? 10 : 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis 
                    dataKey="display" 
                    stroke="var(--text-secondary)" 
                    fontSize={analyticsTimeRange === '30_days' ? 10 : 11} 
                    tickLine={false} 
                    axisLine={false}
                    interval={analyticsTimeRange === '30_days' ? 3 : 0}
                    angle={analyticsTimeRange === '30_days' ? -20 : 0}
                    textAnchor={analyticsTimeRange === '30_days' ? 'end' : 'middle'}
                    height={analyticsTimeRange === '30_days' ? 35 : 25}
                  />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} cursor={false} />
                  <Bar dataKey="attendanceCount" name="Lượt điểm danh" stackId="a" fill="var(--accent-green)" radius={[0,0,4,4]} />
                  <Bar dataKey="bookingCount" name="Lượt đặt phòng" stackId="a" fill="var(--accent-blue)" />
                  <Bar dataKey="borrowCount" name="Lượt mượn thiết bị" stackId="a" fill="var(--accent-purple)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cơ cấu kho + Top equipment — 2 cột */}
          <div className="db-inner-grid">

            {/* Cơ cấu kho — Donut Chart hiện đại, gọn gàng và không bị đè chữ */}
            <div className="glass-card chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-header" style={{ margin: 0 }}>
                  <Package2 size={16} style={{ color: 'var(--accent-blue)' }} />
                  Cơ cấu kho thiết bị
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tổng: <strong style={{ color: 'var(--text-primary)' }}>{chartData.totalEquipQty || 0}</strong>
                </span>
              </div>

              <div style={{ height: 180, marginTop: '0.25rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData.equipCategory} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={48} 
                      outerRadius={72} 
                      paddingAngle={3}
                      label={false}
                    >
                      {chartData.equipCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val, name) => [`${val} cái (${chartData.totalEquipQty > 0 ? Math.round((val / chartData.totalEquipQty) * 100) : 0}%)`, name]}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bảng phân bổ danh mục Top 5 + Khác rõ ràng, không bị đè */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 0.5rem', marginTop: '0.35rem' }}>
                {chartData.equipCategory.map((entry, index) => {
                  const pct = chartData.totalEquipQty > 0 ? Math.round((entry.value / chartData.totalEquipQty) * 100) : 0;
                  return (
                    <div 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        fontSize: '0.73rem', 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '0.25rem 0.45rem', 
                        borderRadius: '4px',
                        borderLeft: `2px solid ${COLORS[index % COLORS.length]}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
                        <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>
                          {entry.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', marginLeft: '0.25rem', flexShrink: 0 }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top thiết bị */}
            <div className="glass-card chart-card">
              <h3 className="chart-header">
                <Package size={16} style={{ color: 'var(--accent-amber)' }} />
                Top mượn nhiều
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                {chartData.topEquipment.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>Chưa có dữ liệu</div>
                ) : chartData.topEquipment.map((item, index) => {
                  const percent = (item.value / (chartData.topEquipment[0]?.value || 1)) * 100;
                  return (
                    <div key={index}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.3rem' }}>{index + 1}.</span>
                          {item.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '0.4rem' }}>{item.value} lượt</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: COLORS[index % COLORS.length], borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT: Operations Column */}
        <div className="operations-column">

          {/* Activity Feed */}
          <div className="glass-card chart-card db-activity-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <History size={16} style={{ color: 'var(--accent-purple)' }} />
                Hoạt động gần đây
              </h3>
              <ExportButton
                data={rfidHistory}
                filteredData={rfidHistory}
                onExport={handleExportCSV}
                filenamePrefix="lich_su_hoat_dong"
                disabled={!rfidHistory}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, paddingRight: '0.15rem' }}>
              {recentActivities.map(act => {
                const color = getActivityColor(act.module, act.action);
                return (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getActivityIcon(act.module, act.action)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.1rem' }}>
                        <span
                          style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', cursor: act.groupMembers ? 'help' : 'default', textDecoration: act.groupMembers ? 'underline dotted rgba(255,255,255,0.25)' : 'none', textUnderlineOffset: '3px' }}
                          title={act.groupMembers ? "Thành viên:\n" + act.groupMembers.join('\n') : undefined}
                        >
                          {act.userName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatTime(act.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {getActivityText(act.module, act.action)}
                        {(act.action === 'book' || act.action.includes('book_')) ? ' phòng Lab' : ''}
                        {!act.success && <span style={{ color: 'var(--accent-red)', marginLeft: '0.35rem', fontSize: '0.68rem', border: '1px solid rgba(239,68,68,0.35)', padding: '1px 4px', borderRadius: 3 }}>Thất bại</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentActivities.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>Chưa có bản ghi nào</div>
              )}
            </div>
          </div>

          {/* Đang trực Lab */}
          <div className="glass-card chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="chart-header" style={{ margin: 0 }}>
                <Users size={16} style={{ color: 'var(--accent-green)' }} />
                Đang trực Lab
                <span style={{ fontSize: '0.72rem', background: activeMembersList.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: activeMembersList.length > 0 ? 'var(--accent-green)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: 20, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                  {activeMembersList.length} người
                </span>
              </h3>
              {activeMembersList.length > 0 && (
                <button
                  onClick={() => handleOpenDetail('active')}
                  title="Bấm để xem chi tiết danh sách đang trực Lab"
                  aria-label="Xem chi tiết danh sách đang trực Lab"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-green)',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  Xem chi tiết <ArrowRight size={14} />
                </button>
              )}
            </div>
            {activeMembersList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.75rem 1rem', color: 'var(--text-muted)', gap: '0.5rem', textAlign: 'center' }}>
                <Clock size={28} style={{ opacity: 0.35 }} />
                <span style={{ fontSize: '0.85rem' }}>Không có ai trực Lab</span>
              </div>
            ) : (
              <table className="compact-alert-table">
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Chức vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMembersList.map(member => (
                    <tr 
                      key={member.id} 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => handleOpenDetail('active')}
                      title="Bấm để xem danh sách đang trực Lab"
                    >
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{member.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.mssv}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{member.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top slots */}
          <div className="glass-card chart-card">
            <h3 className="chart-header">
              <Calendar size={16} style={{ color: '#06b6d4' }} />
              Khung giờ phổ biến
            </h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.topSlots} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="value" name="Lượt đặt" radius={[4,4,0,0]} barSize={28}>
                    {chartData.topSlots.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#06b6d4' : 'rgba(255,255,255,0.05)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ── Drill-down Detail Modal ─── */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        size="xl"
      >
        <div style={{ marginTop: '0.5rem' }}>
          {modalConfig.type === 'members' && (
            <DataTable
              data={modalConfig.data}
              columns={membersModalColumns}
              searchKeys={['name', 'mssv', 'role']}
            />
          )}

          {modalConfig.type === 'active' && (
            <DataTable
              data={modalConfig.data}
              columns={membersModalColumns}
              searchKeys={['name', 'mssv', 'role']}
            />
          )}

          {(modalConfig.type === 'borrowed' || modalConfig.type === 'overdue') && (
            <DataTable
              data={modalConfig.data}
              columns={borrowedModalColumns}
              searchKeys={['borrowerName', 'mssv', 'equipmentName']}
            />
          )}
        </div>
      </Modal>

      {/* ── Scoped Styles ─── */}
      <style>{`
        /* KPI Strip */
        .db-kpi-strip {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          padding: 1rem 1.75rem !important;
          gap: 0 !important;
        }
        .db-kpi-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex: 1;
        }
        .db-kpi-active {
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          flex: 1.2;
          transition: transform 0.15s ease;
        }
        .db-kpi-active:hover {
          transform: translateY(-1px);
        }
        .db-kpi-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .db-kpi-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        .db-live-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 2px var(--bg-card);
        }
        .db-kpi-divider {
          width: 1px;
          height: 40px;
          background: var(--border-color);
          margin: 0 1.5rem;
          flex-shrink: 0;
        }

        /* Clickable KPI */
        .db-kpi-clickable {
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
        }
        .db-kpi-clickable:hover {
          opacity: 0.88;
        }

        /* Dashboard Grid — 1.6fr left (analytics) | 1fr right (ops) */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .analytics-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .operations-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Inner 2-col grid in analytics column */
        .db-inner-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        /* Chart/Alert cards */
        .chart-card, .alert-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
        }
        .chart-header, .alert-header {
          font-size: 0.82rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 0.75rem;
        }
        .chart-container {
          width: 100%;
          height: 280px;
        }

        /* Activity card — scrollable */
        .db-activity-card {
          max-height: 520px;
        }
        .db-activity-card > div:last-child {
          overflow-y: auto;
        }

        /* Compact alert table */
        .compact-alert-table {
          width: 100%;
          border-collapse: collapse;
        }
        .compact-alert-table th {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.45rem 0.6rem;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
        }
        .compact-alert-table td {
          font-size: 0.8rem;
          padding: 0.6rem 0.6rem;
          border-bottom: 1px solid rgba(255,255,255,0.025);
          color: var(--text-secondary);
          vertical-align: middle;
        }
        .compact-alert-table tr:last-child td { border-bottom: none; }
        .compact-alert-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        /* Recharts SVG focus outline killer */
        .recharts-responsive-container,
        .recharts-wrapper,
        .recharts-surface,
        .recharts-wrapper *:focus,
        .recharts-surface:focus,
        svg.recharts-surface,
        svg.recharts-surface:focus,
        svg.recharts-surface:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 900px) {
          .db-inner-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .db-kpi-strip {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 1.25rem !important;
            gap: 0.75rem !important;
          }
          .db-kpi-divider {
            width: 100%;
            height: 1px;
            margin: 0;
          }
          .db-kpi-active {
            flex: 1;
          }
        }
      `}</style>

    </div>
  );
}
