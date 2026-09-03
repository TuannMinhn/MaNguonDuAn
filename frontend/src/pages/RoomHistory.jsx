import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { API_BASE_URL } from '../config';
import { fetcher } from '../utils/fetcher';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import * as XLSX from 'xlsx';
import Button from '../components/Button';
import Select from '../components/Select';
import SessionReportModal from '../components/bookings/SessionReportModal';
import Modal from '../components/Modal';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { Users, Clock, Calendar, Info, X, CheckCircle, XCircle, UserPlus, Download, Zap, Briefcase, FileText, Plus, Edit3, CheckSquare, ShieldCheck, UserCheck } from 'lucide-react';

const DEFAULT_SESSIONS = [
  {
    key: 'morning', label: 'Sáng',
    slots: [
      { id: 'morning_1', label: '7:00 – 9:00' },
      { id: 'morning_2', label: '9:00 – 11:00' },
    ],
  },
  {
    key: 'afternoon', label: 'Chiều',
    slots: [
      { id: 'afternoon_1', label: '12:00 – 14:00' },
      { id: 'afternoon_2', label: '14:00 – 16:00' },
    ],
  },
  {
    key: 'evening', label: 'Tối',
    slots: [
      { id: 'evening_1', label: '16:00 – 18:00' },
      { id: 'evening_2', label: '18:00 – 20:00' },
    ],
  },
];

export default function RoomHistory() {
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { data: systemSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);

  const SESSIONS = useMemo(() => {
    if (!systemSettings) return DEFAULT_SESSIONS;
    return [
      {
        key: 'morning', label: 'Sáng',
        slots: [
          { id: 'morning_1', label: `${systemSettings.slot_morning_1_start || '07:00'} – ${systemSettings.slot_morning_1_end || '09:00'}` },
          { id: 'morning_2', label: `${systemSettings.slot_morning_2_start || '09:00'} – ${systemSettings.slot_morning_2_end || '11:00'}` },
        ],
      },
      {
        key: 'afternoon', label: 'Chiều',
        slots: [
          { id: 'afternoon_1', label: `${systemSettings.slot_afternoon_1_start || '12:00'} – ${systemSettings.slot_afternoon_1_end || '14:00'}` },
          { id: 'afternoon_2', label: `${systemSettings.slot_afternoon_2_start || '14:00'} – ${systemSettings.slot_afternoon_2_end || '16:00'}` },
        ],
      },
      {
        key: 'evening', label: 'Tối',
        slots: [
          { id: 'evening_1', label: `${systemSettings.slot_evening_1_start || '16:00'} – ${systemSettings.slot_evening_1_end || '18:00'}` },
          { id: 'evening_2', label: `${systemSettings.slot_evening_2_start || '18:00'} – ${systemSettings.slot_evening_2_end || '20:00'}` },
        ],
      },
    ];
  }, [systemSettings]);

  useEffect(() => {
    let start, end;
    const today = new Date();
    
    if (period === '1week') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      end = today;
    } else if (period === '1month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      end = today;
    } else if (period === '1quarter') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      end = today;
    } else if (period === '1year') {
      start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      end = today;
    } else if (period === 'custom') {
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      }
    } else if (period === 'all') {
      start = null;
      end = null;
    }

    if (start && end) {
      const sDate = start.toISOString().split('T')[0];
      const eDate = end.toISOString().split('T')[0];
      setReportUrl(`${API_BASE_URL}/reports/comprehensive?start=${sDate}&end=${eDate}`);
    } else if (period !== 'custom') {
      setReportUrl(`${API_BASE_URL}/reports/comprehensive`);
    }
  }, [period, customStart, customEnd]);

  const { data: report } = useSWR(reportUrl, fetcher);
  const { data: historyData, error, mutate: mutateHistory } = useSWR(`${API_BASE_URL}/bookings/history`, fetcher);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'full' | 'partial' | 'absent' | 'reported' | 'unreported'

  // Filter theo khoảng thời gian
  const periodFilteredHistory = useMemo(() => {
    if (!historyData) return [];
    let start, end;
    const today = new Date();
    
    if (period === '1week') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      end = today;
    } else if (period === '1month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      end = today;
    } else if (period === '1quarter') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      end = today;
    } else if (period === '1year') {
      start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      end = today;
    } else if (period === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    }
    
    if (period === 'all') {
      return historyData;
    }
    
    if (start && end) {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return historyData.filter(h => {
        const d = new Date(h.date);
        return d >= start && d <= end;
      });
    }
    return historyData;
  }, [historyData, period, customStart, customEnd]);

  // Thống kê số lượng cho các Tabs Category
  const categoryCounts = useMemo(() => {
    const counts = {
      all: periodFilteredHistory.length,
      full: 0,
      partial: 0,
      absent: 0,
      reported: 0,
      unreported: 0
    };

    const today = new Date();
    today.setHours(0,0,0,0);

    periodFilteredHistory.forEach(h => {
      const regPresent = h.registeredPresentCount !== undefined ? h.registeredPresentCount : (h.session?.attendees?.filter(a => (h.members || []).some(m => m.mssv === a.mssv)).length || 0);
      const totalReg = h.totalRegistered !== undefined ? h.totalRegistered : (h.members ? h.members.length : 0);
      const extra = h.extraAttendeesCount !== undefined ? h.extraAttendeesCount : (h.session?.attendees?.filter(a => !(h.members || []).some(m => m.mssv === a.mssv)).length || 0);
      const isPast = new Date(h.date) < today;

      // Đi đủ
      if (regPresent === totalReg && totalReg > 0) {
        counts.full++;
      } else if (regPresent > 0 || extra > 0) {
        // Gần đủ / Đi một phần / Có khách
        counts.partial++;
      } else if (isPast) {
        // Phòng vắng
        counts.absent++;
      }

      // Bàn giao
      if (h.checkoutReport) {
        counts.reported++;
      } else if (isPast) {
        counts.unreported++;
      }
    });

    return counts;
  }, [periodFilteredHistory]);

  // Lọc theo Category
  const history = useMemo(() => {
    if (categoryFilter === 'all') return periodFilteredHistory;

    const today = new Date();
    today.setHours(0,0,0,0);

    return periodFilteredHistory.filter(h => {
      const regPresent = h.registeredPresentCount !== undefined ? h.registeredPresentCount : (h.session?.attendees?.filter(a => (h.members || []).some(m => m.mssv === a.mssv)).length || 0);
      const totalReg = h.totalRegistered !== undefined ? h.totalRegistered : (h.members ? h.members.length : 0);
      const extra = h.extraAttendeesCount !== undefined ? h.extraAttendeesCount : (h.session?.attendees?.filter(a => !(h.members || []).some(m => m.mssv === a.mssv)).length || 0);
      const isPast = new Date(h.date) < today;

      if (categoryFilter === 'full') {
        return regPresent === totalReg && totalReg > 0;
      }
      if (categoryFilter === 'partial') {
        return (regPresent > 0 && regPresent < totalReg) || (regPresent === 0 && extra > 0);
      }
      if (categoryFilter === 'absent') {
        return regPresent === 0 && extra === 0 && (isPast || h.status === 'Phòng vắng' || h.status === 'Vắng mặt');
      }
      if (categoryFilter === 'reported') {
        return !!h.checkoutReport;
      }
      if (categoryFilter === 'unreported') {
        return !h.checkoutReport && isPast;
      }
      return true;
    });
  }, [periodFilteredHistory, categoryFilter]);

  const roomHistoryExportColumns = [
    { id: 'date', label: 'Thời gian', defaultChecked: true },
    { id: 'slotId', label: 'Ca / Khung giờ', defaultChecked: true },
    { id: 'representativeName', label: 'Người đại diện', defaultChecked: true },
    { id: 'representativeMssv', label: 'MSSV', defaultChecked: true },
    { id: 'members', label: 'Số thành viên', defaultChecked: true },
    { id: 'status', label: 'Trạng thái', defaultChecked: true },
    { id: 'feedback', label: 'Phản hồi', defaultChecked: false }
  ];

  const handleAdvancedRoomHistoryExport = async (config) => {
    const { scope, format, selectedColumns } = config;
    let dataToExport = history || [];

    const headers = [];
    const keys = [];
    roomHistoryExportColumns.forEach(col => {
      if (selectedColumns.includes(col.id)) {
        headers.push(col.label);
        keys.push(col.id);
      }
    });

    const rows = dataToExport.map((h, idx) => {
      return keys.map(key => {
        let val = h[key];
        if (key === 'slotId') {
          const sessionLabel = SESSIONS.find(s => s.slots.some(sl => sl.id === h.slotId))?.slots.find(sl => sl.id === h.slotId)?.label || h.slotId;
          return sessionLabel;
        }
        if (key === 'members') {
          return h.members ? h.members.length : 0;
        }
        if (val === undefined || val === null) return '';
        return val;
      });
    });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filename = `lich_su_phong_${timestamp}.${format}`;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        const formattedRow = row.map(cell => {
          let cellStr = String(cell).replace(/"/g, '""');
          if (cellStr.includes(',') || cellStr.includes('\n')) cellStr = `"${cellStr}"`;
          return cellStr;
        });
        csvContent += formattedRow.join(",") + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Lịch sử phòng");
      XLSX.writeFile(wb, filename);
    }
  };

  const getSlotLabel = (slotId) => {
    for (let s of SESSIONS) {
      const found = s.slots.find(x => x.id === slotId);
      if (found) {
        return `${s.label} (${found.label})`;
      }
    }
    return slotId;
  };

  const historyColumns = React.useMemo(() => [
    { accessorKey: 'date', header: 'Thời gian', sortable: true, cell: (row) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: '600' }}>{new Date(row.date).toLocaleDateString('vi-VN')}</span>
        <span className="text-xs text-muted">
          {new Date(row.date).toLocaleDateString('vi-VN', { weekday: 'long' })}
        </span>
      </div>
    )},
    { accessorKey: 'slotId', header: 'Ca / Khung giờ', sortable: true, cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontWeight: '500', background: 'rgba(59, 130, 246, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
        <Clock size={14} /> {getSlotLabel(row.slotId)}
      </span>
    )},
    { accessorKey: 'representativeName', header: 'Người đại diện', sortable: true, cell: (row) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: '500' }}>{row.representativeName}</span>
        <span className="text-sm text-muted" style={{ fontFamily: 'monospace' }}>
          {row.representativeMssv}
        </span>
      </div>
    )},
    { accessorKey: 'membersCount', header: 'Thành viên tham gia', sortable: true, cell: (row) => {
      const regPresent = row.registeredPresentCount !== undefined ? row.registeredPresentCount : (row.session?.attendees?.filter(a => (row.members || []).some(m => m.mssv === a.mssv)).length || 0);
      const totalReg = row.totalRegistered !== undefined ? row.totalRegistered : (row.members ? row.members.length : 0);
      const extra = row.extraAttendeesCount !== undefined ? row.extraAttendeesCount : (row.session?.attendees?.filter(a => !(row.members || []).some(m => m.mssv === a.mssv)).length || 0);
      
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.3rem', 
            color: regPresent > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            <Users size={14} />
            {regPresent}/{totalReg}
          </span>
          {extra > 0 && (
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-green)', 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.1rem 0.4rem', 
              borderRadius: '4px',
              fontWeight: 'bold' 
            }} title={`Có ${extra} sinh viên không đăng ký trước nhưng có mặt trong ca`}>
              +{extra} ngoài
            </span>
          )}
        </div>
      );
    }},
    { accessorKey: 'status', header: 'Trạng thái phòng', sortable: true, cell: (row) => {
      let label = row.status;
      let style = { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.2)' };
      let IconComp = Clock;

      if (row.status === 'Đi đủ' || row.status === 'Đi đủ (Hôm nay)' || row.status === 'Đã hoàn thành') {
        label = 'Đi đủ';
        style = { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.3)' };
        IconComp = CheckCircle;
      } else if (row.status === 'Gần đủ' || row.status === 'Gần đủ (Hôm nay)') {
        label = 'Gần đủ';
        style = { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' };
        IconComp = Users;
      } else if (row.status === 'Phòng vắng' || row.status === 'Vắng mặt') {
        label = 'Phòng vắng';
        style = { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)' };
        IconComp = XCircle;
      } else if (row.status === 'Chỉ có khách') {
        label = 'Chỉ có khách';
        style = { bg: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)', border: '1px solid rgba(168, 85, 247, 0.3)' };
        IconComp = UserPlus;
      } else if (row.status === 'Đang diễn ra') {
        label = 'Đang diễn ra';
        style = { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' };
        IconComp = Clock;
      }

      return (
        <span style={{ 
          background: style.bg, 
          color: style.color, 
          border: style.border, 
          padding: '0.25rem 0.6rem', 
          borderRadius: '20px', 
          fontWeight: '600', 
          fontSize: '0.8rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <IconComp size={13} />
          {label}
        </span>
      );
    }},
    { accessorKey: 'reportStatus', header: 'Biên bản bàn giao', sortable: true, cell: (row) => {
      const isReported = !!row.checkoutReport;
      const today = new Date();
      today.setHours(0,0,0,0);
      const isPast = new Date(row.date) < today;
      
      if (isReported) {
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.25rem 0.6rem', 
            borderRadius: 'var(--radius-sm)', 
            background: 'rgba(16, 185, 129, 0.12)', 
            color: 'var(--accent-green)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.78rem',
            fontWeight: '600'
          }} title="Đã nộp biên bản bàn giao ca trực">
            <ShieldCheck size={14} /> Đã bàn giao
          </span>
        );
      }
      
      if (isPast) {
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.25rem 0.6rem', 
            borderRadius: 'var(--radius-sm)', 
            background: 'rgba(245, 158, 11, 0.1)', 
            color: 'var(--accent-amber)', 
            border: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '0.78rem',
            fontWeight: '500'
          }} title="Ca trực đã kết thúc nhưng chưa lập biên bản bàn giao">
            <Clock size={14} /> Chưa báo cáo
          </span>
        );
      }

      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          padding: '0.25rem 0.6rem', 
          borderRadius: 'var(--radius-sm)', 
          background: 'var(--bg-overlay)', 
          color: 'var(--text-muted)', 
          border: '1px solid var(--border-color)',
          fontSize: '0.78rem'
        }}>
          Chưa tới giờ
        </span>
      );
    }}
  ], []);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="page-header">
              <Calendar className="text-blue-500" size={20} />
              Lịch sử sử dụng phòng
            </h2>
            <p className="page-subtitle">Xem lại các ca đăng ký phòng trong quá khứ và đánh giá tình trạng tham gia</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginRight: '4.5rem' }}>
            <div style={{ width: '220px' }}>
              <Select 
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "all", label: "Tất cả các ca" },
                  { value: "1week", label: "1 Tuần qua" },
                  { value: "1month", label: "1 Tháng qua" },
                  { value: "1quarter", label: "1 Quý (3 tháng) qua" },
                  { value: "1year", label: "1 Năm qua" },
                  { value: "custom", label: "Tùy chỉnh..." }
                ]}
              />
            </div>

            {period === 'custom' && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="date" className="search-input" style={{ width: '135px' }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" className="search-input" style={{ width: '135px' }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            )}

            <Button 
              variant="secondary"
              icon={Download}
              iconPosition="left"
              onClick={() => setIsExportModalOpen(true)}
              disabled={!report || !history}
            >
              Xuất báo cáo
            </Button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success flex items-center gap-2 mb-4">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger flex items-center gap-2 mb-4">
          <XCircle size={20} />
          {errorMsg}
        </div>
      )}

      {report && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', color: 'var(--accent-blue)' }}>
                <Clock size={18} />
              </div>
              <span className="stat-label">Tổng giờ sử dụng (h)</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalHours}</span>
            </div>
          </div>
          
          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }}>
                <Calendar size={18} />
              </div>
              <span className="stat-label">Tổng số ca dùng phòng</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalSessions}</span>
            </div>
          </div>

          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', color: 'var(--accent-purple)' }}>
                <Users size={18} />
              </div>
              <span className="stat-label">Tổng lượt người</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalAttendees}</span>
            </div>
          </div>

          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
                <UserPlus size={18} />
              </div>
              <span className="stat-label">Người không đăng ký</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.walkInCount}</span>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div style={{ color: 'var(--accent-red)', padding: '1rem', textAlign: 'center' }}>
          Không thể tải dữ liệu lịch sử.
        </div>
      ) : !historyData ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu...
        </div>
      ) : (
        <Card
          title={`Danh sách ca phòng (${history.length})`}
          icon={Calendar}
          action={
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'Tất cả', count: categoryCounts.all },
                { key: 'full', label: 'Đi đủ', count: categoryCounts.full, color: 'var(--accent-green)' },
                { key: 'partial', label: 'Gần đủ', count: categoryCounts.partial, color: 'var(--accent-amber)' },
                { key: 'absent', label: 'Phòng vắng', count: categoryCounts.absent, color: 'var(--accent-red)' },
                { key: 'reported', label: 'Đã bàn giao', count: categoryCounts.reported, color: 'var(--accent-green)' },
                { key: 'unreported', label: 'Chưa bàn giao', count: categoryCounts.unreported, color: 'var(--accent-amber)' }
              ].map(cat => {
                const isActive = categoryFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoryFilter(cat.key)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isActive ? (cat.color || 'var(--accent-blue)') : 'var(--border-color)'}`,
                      background: isActive ? (cat.color ? `color-mix(in srgb, ${cat.color} 15%, transparent)` : 'var(--accent-blue)') : 'var(--bg-overlay)',
                      color: isActive ? (cat.color || '#fff') : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? '600' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{cat.label}</span>
                    <span style={{
                      padding: '0.05rem 0.35rem',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 'bold'
                    }}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          }
        >
          {history.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Không có ca trực nào phù hợp với bộ lọc"
              description="Thử chọn danh mục khác hoặc khoảng thời gian khác để xem dữ liệu."
            />
          ) : (
            <DataTable
              data={history.map(item => ({...item, membersCount: item.members ? item.members.length : 0}))}
              columns={historyColumns}
              onRowClick={(row) => setSelectedItem({...row, slotLabel: getSlotLabel(row.slotId)})}
            />
          )}
        </Card>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Chi tiết ca sử dụng phòng"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              {selectedItem?.status !== 'Sắp tới' && !selectedItem?.checkoutReport && (
                <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowReportModal(true)}>
                  Tạo Báo cáo ca trực / Checkout
                </Button>
              )}
              {selectedItem?.checkoutReport && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                    <CheckCircle size={16} /> Đã bàn giao ca
                  </div>
                  <Button variant="secondary" size="sm" icon={Edit3} iconPosition="left" onClick={() => setShowReportModal(true)}>
                    Sửa báo cáo
                  </Button>
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={() => setSelectedItem(null)}>Đóng</Button>
          </div>
        }
      >
        {selectedItem && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <div className="text-xs text-muted">Thời gian</div>
                <div style={{ fontWeight: '600' }}>{selectedItem.date}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Khung giờ</div>
                <div style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>{selectedItem.slotLabel}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={18} color="var(--accent-purple)" /> Nhóm đăng ký ({selectedItem.members ? selectedItem.members.length : 0})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedItem.members || []).map(m => {
                  const isRep = m.mssv === selectedItem.representativeMssv;
                  const isPresent = selectedItem.session?.attendees?.some(a => a.mssv === m.mssv);
                  
                  return (
                    <div key={m.mssv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: isPresent ? '3px solid var(--accent-green)' : '3px solid var(--accent-red)' }}>
                      <div>
                        <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {m.name} 
                          {isRep && <span className="text-tiny" style={{ padding: '0.1rem 0.4rem', background: 'var(--accent-amber)', color: '#000', borderRadius: '4px', fontWeight: 'bold' }}>Đại diện</span>}
                        </div>
                        <div className="text-xs text-muted">MSSV: {m.mssv}</div>
                      </div>
                      <div>
                        {isPresent ? (
                          <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-green)' }}>
                            <CheckCircle size={14} /> Có mặt
                          </span>
                        ) : (
                          <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-red)' }}>
                            <XCircle size={14} /> Vắng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lên ké */}
            {selectedItem.session && (() => {
              const registeredMssvs = (selectedItem.members || []).map(m => m.mssv);
              const extraAttendees = (selectedItem.session.attendees || []).filter(a => !registeredMssvs.includes(a.mssv));
              
              if (extraAttendees.length === 0) return null;
              
              return (
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-amber)' }}>
                    <UserPlus size={18} /> Khách / Thành viên đi cùng ({extraAttendees.length})
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {extraAttendees.map(a => (
                      <div key={a.mssv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{a.name}</div>
                          <div className="text-xs text-muted">MSSV/ĐV: {a.mssv}</div>
                        </div>
                        <div className="text-xs text-muted">
                          (Quẹt thẻ vào phòng)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Báo cáo ca trực */}
            {selectedItem.checkoutReport && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-green)' }}>
                  <ShieldCheck size={18} /> Báo cáo Ca trực & Biên bản Bàn giao
                </h4>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    <div className="text-xs text-muted">
                      🕒 Báo cáo lúc: <strong style={{ color: 'var(--text-primary)' }}>{new Date(selectedItem.checkoutReport.reportedAt).toLocaleString('vi-VN')}</strong>
                    </div>
                    {selectedItem.checkoutReport.checkedBy && (
                      <div className="text-xs" style={{ color: 'var(--accent-blue)' }}>
                        👤 Người bàn giao: <strong>{selectedItem.checkoutReport.checkedBy}</strong>
                      </div>
                    )}
                  </div>

                  {/* Checklist Bàn giao */}
                  <div style={{ marginBottom: '1rem' }}>
                    <strong className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Checklist bàn giao:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                      <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: selectedItem.checkoutReport.checklist?.cleanedRoom !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${selectedItem.checkoutReport.checklist?.cleanedRoom !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {selectedItem.checkoutReport.checklist?.cleanedRoom !== false ? <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} /> : <XCircle size={14} style={{ color: 'var(--accent-red)' }} />}
                        <span>Vệ sinh: {selectedItem.checkoutReport.checklist?.cleanedRoom !== false ? 'Đã dọn sạch' : 'Chưa đạt'}</span>
                      </div>

                      <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: selectedItem.checkoutReport.checklist?.powerTurnedOff !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${selectedItem.checkoutReport.checklist?.powerTurnedOff !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {selectedItem.checkoutReport.checklist?.powerTurnedOff !== false ? <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} /> : <XCircle size={14} style={{ color: 'var(--accent-red)' }} />}
                        <span>Nguồn điện: {selectedItem.checkoutReport.checklist?.powerTurnedOff !== false ? 'Đã ngắt' : 'Chưa ngắt'}</span>
                      </div>

                      <div style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: selectedItem.checkoutReport.checklist?.doorsLocked !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${selectedItem.checkoutReport.checklist?.doorsLocked !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {selectedItem.checkoutReport.checklist?.doorsLocked !== false ? <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} /> : <XCircle size={14} style={{ color: 'var(--accent-red)' }} />}
                        <span>Cửa phòng: {selectedItem.checkoutReport.checklist?.doorsLocked !== false ? 'Đã khóa' : 'Chưa khóa'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedItem.checkoutReport.consumables?.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📦 Linh kiện đã tiêu hao ({selectedItem.checkoutReport.consumables.length}):
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {selectedItem.checkoutReport.consumables.map((c, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</span>
                              {c.code && <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontWeight: 'bold' }}>{c.code}</span>}
                            </div>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                              Số lượng: {c.qty} {c.unit || 'Cái'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.checkoutReport.issues?.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong className="text-xs" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ⚠️ Thiết bị hư hỏng / báo lỗi ({selectedItem.checkoutReport.issues.length}):
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {selectedItem.checkoutReport.issues.map((i, idx) => (
                          <div key={idx} style={{ padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: '600', color: 'var(--accent-amber)' }}>{i.name}</span>
                                {i.code && <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontWeight: 'bold' }}>{i.code}</span>}
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                                SL hỏng: {i.qty || 1}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              Lỗi: <em>{i.issueDescription}</em>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.checkoutReport.notes && (
                    <div>
                      <strong className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ghi chú chung:</strong>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', background: 'var(--bg-overlay)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        "{selectedItem.checkoutReport.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Báo cáo Modal */}
      {selectedItem && showReportModal && (
        <SessionReportModal 
          isOpen={showReportModal} 
          onClose={() => setShowReportModal(false)} 
          booking={selectedItem}
          onSuccess={(msg, updatedReport) => {
            setSuccessMsg(msg);
            if (selectedItem && updatedReport) {
              setSelectedItem(prev => ({ ...prev, checkoutReport: updatedReport }));
            }
            mutateHistory();
            setTimeout(() => setSuccessMsg(''), 3000);
          }}
          setErrorMsg={(msg) => {
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 3000);
          }}
        />
      )}

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={roomHistoryExportColumns}
        counts={{
          all: history?.length || 0,
          filtered: history?.length || 0,
          selected: 0
        }}
        onExport={handleAdvancedRoomHistoryExport}
      />
    </div>
  );
}
