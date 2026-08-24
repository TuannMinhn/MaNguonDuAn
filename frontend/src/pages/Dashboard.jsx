import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  Users, Cpu, CheckCircle, AlertTriangle, LogIn, Clock, Zap, History, Calendar, Package, Download
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import ExportButton from '../components/ExportButton';
import SkeletonLoader from '../components/SkeletonLoader';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line
} from 'recharts';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', 
  '#84cc16', '#d946ef', '#0ea5e9', '#eab308', '#f43f5e'
];

export default function Dashboard() {

  // SWR Caching (Tự động fetch, tự động cache, tự động revalidate)
  const { data: members, mutate: mutateMembers } = useSWR(`${API_BASE_URL}/members`, fetcher);
  const { data: equip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: rfidHistory, mutate: mutateRfidHistory } = useSWR(`${API_BASE_URL}/rfid-history`, fetcher);
  const { data: borrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: allBookings } = useSWR(`${API_BASE_URL}/bookings/all`, fetcher);

  // Tối ưu thuật toán O(1) và tính toán duy nhất 1 lần khi data đổi (Tránh re-render vô ích)
  const dashboardData = useMemo(() => {
    if (!members || !equip || !rfidHistory || !borrows || !allBookings) return null;

    // 1. Stats
    const active = members.filter(m => m.active);
    const borrowedCount = equip.reduce((sum, item) => sum + item.borrowedQty, 0);

    const stats = {
      totalMembers: members.length,
      activeMembers: active.length,
      borrowedEquip: borrowedCount
    };

    // 2. Overdue Equipment
    const now = new Date();
    now.setHours(0,0,0,0);
    const overdue = borrows.filter(b => b.status !== 'Đã trả' && b.status !== 'Đã tiêu hao' && b.expectedReturnDate && new Date(b.expectedReturnDate) < now);
    
    overdue.forEach(b => {
      const expected = new Date(b.expectedReturnDate);
      const diffTime = Math.abs(now - expected);
      b.daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
    overdue.sort((a,b) => b.daysOverdue - a.daysOverdue);

    // 3. Recent Activity (Grouped & Top 10)
    const sortedHistory = [...rfidHistory].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const groupedHistory = [];
    let i = 0;
    while (i < sortedHistory.length) {
      const current = sortedHistory[i];
      if (current.module === 'room_booking' && current.action.startsWith('book_')) {
        let count = 1;
        const groupTime = new Date(current.timestamp).getTime();
        let j = i + 1;
        while (j < sortedHistory.length && sortedHistory[j].module === 'room_booking' && sortedHistory[j].action.startsWith('book_')) {
          if (Math.abs(groupTime - new Date(sortedHistory[j].timestamp).getTime()) < 5000) {
            count++; j++;
          } else break;
        }
        if (count > 1) {
          const groupMembers = [];
          for (let k = i; k < j; k++) groupMembers.push(`- ${sortedHistory[k].userName} (${sortedHistory[k].mssv})`);
          groupedHistory.push({ ...current, id: current.id + '_group', userName: `Nhóm ${count} người`, mssv: 'Nhiều thành viên', action: 'book_group', groupMembers });
          i = j; continue;
        }
      }
      groupedHistory.push(current);
      i++;
    }

    // 4. Charts Data
    const categories = {};
    equip.forEach(e => { categories[e.category] = (categories[e.category] || 0) + e.totalQty; });
    const equipCategoryData = Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    const last7Days = Array.from({length: 7}).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      return { date: d.toISOString().split('T')[0], display: `${d.getDate()}/${d.getMonth()+1}`, attendanceCount: 0, bookingCount: 0, borrowCount: 0 };
    });
    
    // Optimize: Create a map for O(1) lookups of last7Days
    const dayMap = new Map();
    last7Days.forEach(d => dayMap.set(d.date, d));

    rfidHistory.forEach(h => {
      const dateStr = h.timestamp.split('T')[0];
      const dayData = dayMap.get(dateStr);
      if (dayData) {
        if (h.module === 'attendance' && (h.action === 'check-in' || h.action === 'scan')) dayData.attendanceCount++;
        else if (h.module === 'room_booking' && h.action.startsWith('book_')) dayData.bookingCount++;
        else if (h.module === 'equipment' && h.action === 'borrow') dayData.borrowCount++;
      }
    });

    const validDates = last7Days.map(d => d.date);

    // 5. Top Equipment & Top Slots (Filtered to last 7 days)
    const equipmentMap = {};
    borrows.forEach(b => {
      const borrowDateStr = b.borrowDate?.split('T')[0];
      if (validDates.includes(borrowDateStr)) {
        equipmentMap[b.equipmentName] = (equipmentMap[b.equipmentName] || 0) + (b.qty || 1);
      }
    });
    const topEquipment = Object.entries(equipmentMap)
      .map(([name, value]) => ({ name: name, value })) // No truncation needed for custom list
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const slotLabels = [
      { id: 'morning_1', label: '7:30 - 9:30' },
      { id: 'morning_2', label: '9:30 - 11:30' },
      { id: 'afternoon_1', label: '12:00 - 14:00' },
      { id: 'afternoon_2', label: '14:00 - 16:30' },
      { id: 'evening_1', label: '16:30 - 18:30' },
      { id: 'evening_2', label: '18:30 - 20:30' }
    ];
    
    // Initialize all slots with 0 to show the full timeline
    const topSlots = slotLabels.map(slot => {
      const count = allBookings.filter(b => validDates.includes(b.date) && String(b.slotId) === slot.id).length;
      return { name: slot.label, value: count };
    });

    return { 
      stats, 
      activeMembersList: active, 
      overdueEquip: overdue, 
      recentActivities: groupedHistory.slice(0, 10), 
      chartData: { 
        equipCategory: equipCategoryData, 
        trafficTrends: last7Days,
        topEquipment,
        topSlots
      } 
    };
  }, [members, equip, rfidHistory, borrows, allBookings]);


  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getActivityIcon = (module, action) => {
    if (module === 'attendance') {
      return action === 'check-out' ? <LogIn size={16} style={{transform:'rotate(180deg)'}} /> : <CheckCircle size={16} />;
    }
    if (module === 'equipment') {
      return action === 'borrow' ? <Package size={16} /> : <Zap size={16} />;
    }
    if (module === 'room_booking') {
      return <Calendar size={16} />;
    }
    return <History size={16} />;
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
      if (action === 'book_group') return 'Đăng ký sử dụng phòng Lab theo nhóm';
      return action === 'book_representative' ? 'Đại diện đặt phòng' : 'Tham gia đặt phòng';
    }
    return action;
  };

  const handleExportCSV = (dataToExport) => {
    if (!dataToExport || dataToExport.length === 0) return null;
    const headers = ["Thoi gian", "Nguoi dung", "MSSV", "Phan loai", "Hanh dong", "Trang thai"];
    const rows = dataToExport.map(act => [
      `"${new Date(act.timestamp).toLocaleString('vi-VN')}"`,
      `"${act.userName}"`,
      `"${act.mssv}"`,
      `"${act.module}"`,
      `"${getActivityText(act.module, act.action)}"`,
      act.success ? "Thanh cong" : "That bai"
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    return csvContent;
  };

  if (!dashboardData) return (
    <div className="page-container" style={{ gap: '1.5rem' }}>
      <div style={{ paddingRight: '60px', marginBottom: '1.5rem' }}>
        <div style={{ width: '200px', height: '2rem', backgroundColor: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.5rem', animation: 'pulse-skeleton 2s infinite' }}></div>
        <div style={{ width: '300px', height: '1rem', backgroundColor: 'var(--border-color)', borderRadius: '4px', animation: 'pulse-skeleton 2s infinite' }}></div>
      </div>
      <SkeletonLoader type="dashboard" count={4} />
    </div>
  );

  const { stats, activeMembersList, overdueEquip, recentActivities, chartData } = dashboardData;

  return (
    <div className="page-container" style={{ gap: '1.5rem' }}>
      <div style={{ paddingRight: '60px' }}>
        <h1>Bảng điều khiển</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tổng quan hoạt động phòng Lab CLB</p>
      </div>

      {/* Thống kê nhanh */}
      <div className="stats-grid">
        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', color: 'var(--accent-blue)' }}>
              <Users size={18} />
            </div>
            <span className="stat-label">Tổng thành viên</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalMembers}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ 
              backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', 
              color: 'var(--accent-green)',
              boxShadow: stats.activeMembers > 0 ? '0 0 15px color-mix(in srgb, var(--accent-green) 30%, transparent)' : 'none',
              position: 'relative'
            }}>
              <span className="relative flex h-2.5 w-2.5" style={{ display: stats.activeMembers > 0 ? 'flex' : 'none', position: 'absolute', top: '-2px', right: '-2px' }}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <LogIn size={18} />
            </div>
            <span className="stat-label">Đang trực Lab</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeMembers}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-amber) 15%, transparent)', color: 'var(--accent-amber)' }}>
              <Cpu size={18} />
            </div>
            <span className="stat-label">Thiết bị đang mượn</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.borrowedEquip}</span>
          </div>
        </div>
      </div>

      {/* Cảnh báo quá hạn */}
      {overdueEquip.length > 0 && (
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <h2 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} /> Cảnh báo thiết bị quá hạn ({overdueEquip.length})
          </h2>
          <div className="table-wrapper">
            <table style={{ minWidth: '100%' }}>
              <thead>
                <tr>
                  <th>Người mượn</th>
                  <th>Thiết bị (Mã ID)</th>
                  <th>Ngày hẹn trả</th>
                  <th>Số ngày trễ</th>
                </tr>
              </thead>
              <tbody>
                {overdueEquip.map((item, idx) => (
                  <tr key={idx} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <td style={{ fontWeight: '500' }}>{item.borrowerName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({item.mssv})</span></td>
                    <td>{item.equipmentName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({item.equipmentId.substring(0,6)})</span></td>
                    <td>{formatTime(item.expectedReturnDate).split(' ')[1]}</td>
                    <td style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Trễ {item.daysOverdue} ngày</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Biểu đồ thống kê */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Biểu đồ số lượng thiết bị */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Cơ cấu kho thiết bị</h2>
          <div style={{ flex: 1, minHeight: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.equipCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}>
                  {chartData.equipCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            {chartData.equipCategory.map((entry, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Biểu đồ Lưu lượng sử dụng tổng hợp */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
          <h2>Báo cáo lưu lượng sử dụng (7 ngày qua)</h2>
          <div style={{ flex: 1, minHeight: 300, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.trafficTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="display" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="attendanceCount" name="Lượt điểm danh" stackId="a" fill="var(--accent-green)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="bookingCount" name="Lượt đặt phòng" stackId="a" fill="var(--accent-blue)" />
                <Bar dataKey="borrowCount" name="Lượt mượn thiết bị" stackId="a" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Equipment and Top Slots */}
      <div className="grid-2col">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Thiết bị mượn nhiều nhất (7 ngày qua)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1 }}>
            {chartData.topEquipment.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>Chưa có dữ liệu</div>
            ) : (
              chartData.topEquipment.map((item, index) => {
                const maxVal = chartData.topEquipment[0]?.value || 1;
                const percent = (item.value / maxVal) * 100;
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {index + 1}. {item.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.value} lượt</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-overlay)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: COLORS[index % COLORS.length], borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2>Khung giờ đặt phòng phổ biến (7 ngày qua)</h2>
          <div style={{ flex: 1, minHeight: 250, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topSlots} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Bar dataKey="value" name="Lượt đặt" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.topSlots.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#06b6d4' : 'var(--bg-overlay)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2col">
        {/* Lịch sử hoạt động gần đây */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Bảng tin hoạt động (10 sự kiện mới nhất)</h2>
            <ExportButton 
              data={rfidHistory}
              filteredData={rfidHistory}
              onExport={handleExportCSV}
              filenamePrefix="lich_su_hoat_dong"
              disabled={!rfidHistory}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {recentActivities.map((act) => {
              const color = getActivityColor(act.module, act.action);
              const Icon = getActivityIcon(act.module, act.action);
              
              return (
                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem', background: 'var(--bg-overlay)', borderRadius: '10px', borderLeft: `3px solid ${color}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}20`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {Icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span 
                        style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem', cursor: act.groupMembers ? 'help' : 'default', textDecoration: act.groupMembers ? 'underline dotted rgba(255,255,255,0.4)' : 'none', textUnderlineOffset: '3px' }}
                        title={act.groupMembers ? "Thành viên tham gia:\n" + act.groupMembers.join('\n') : undefined}
                      >
                        {act.userName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'normal' }}>({act.mssv})</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                        {formatTime(act.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {getActivityText(act.module, act.action)}
                      {act.action === 'book' || act.action.includes('book_') ? ' phòng Lab' : ''}
                      {!act.success && <span style={{ color: 'var(--accent-red)', marginLeft: '0.5rem', fontSize: '0.75rem', border: '1px solid #ef4444', padding: '1px 4px', borderRadius: '4px' }}>Thất bại</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {recentActivities.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Chưa có bản ghi hoạt động nào</div>
            )}
          </div>
        </div>

        {/* Cột phụ: Check-in & Đang trực lab */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div className="glass-card" style={{ flex: 1, minHeight: 0 }}>
            <h2>Đang trực Lab ({activeMembersList.length})</h2>
            {activeMembersList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <Clock size={36} />
                <p>Không có ai trực Lab</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Chức vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembersList.map(member => (
                      <tr key={member.id}>
                        <td>
                          <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{member.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.mssv}</div>
                        </td>
                        <td>{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
