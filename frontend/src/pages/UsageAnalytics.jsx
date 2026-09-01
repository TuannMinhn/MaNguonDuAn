import React, { useMemo, useState, useEffect } from 'react';
import Button from '../components/Button';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import {
  BarChart2,
  TrendingUp,
  Users,
  Target,
  Package,
  Cpu,
  X,
  Download
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Select from '../components/Select';
import SkeletonLoader from '../components/SkeletonLoader';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const CustomYAxisTick = ({ x, y, payload }) => {
  const isMobile = window.innerWidth < 600;
  const maxLength = isMobile ? 12 : 18;
  const displayText = payload.value.length > maxLength ? `${payload.value.substring(0, maxLength)}...` : payload.value;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="var(--text-secondary)" fontSize={11}>
        {displayText}
        <title>{payload.value}</title>
      </text>
    </g>
  );
};
export default function UsageAnalytics() {
  const { data: borrows = [], isLoading: isLoadingBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: equipmentList = [], isLoading: isLoadingEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const isLoading = isLoadingBorrows || isLoadingEquip;

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const yAxisWidth = windowWidth < 600 ? 100 : 180;
  
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [viewMode, setViewMode] = useState('month'); // 'month', 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 3);
  const [startMonth, setStartMonth] = useState(`${defaultStart.getFullYear()}-${String(defaultStart.getMonth() + 1).padStart(2, '0')}`);
  const [endMonth, setEndMonth] = useState(currentMonthStr);

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      opts.push({ value: val, label: label });
    }
    return opts;
  }, []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [kpiModal, setKpiModal] = useState({ isOpen: false, title: '', data: [], type: '' });
  const [expandedRow, setExpandedRow] = useState(null);
  const [modalCategoryFilter, setModalCategoryFilter] = useState('Tất cả danh mục');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [rankingTab, setRankingTab] = useState('equipment'); // 'equipment' | 'consumable'

  const handleExportUsage = async (config) => {
    const { scope, startDate, endDate, format, aggregation } = config;
    
    // Lọc borrows
    let filteredBorrows = borrows;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      filteredBorrows = borrows.filter(b => {
        if (!b.borrowDate) return false;
        const d = new Date(b.borrowDate);
        return d >= start && d <= end;
      });
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      let headers = [];
      let rows = [];
      let sheetName = "Báo cáo sử dụng";

      if (aggregation === 'equipment') {
        headers = ["Mã thiết bị", "Tên thiết bị", "Số lượt mượn", "Tổng thời gian dùng (Giờ)"];
        const groups = {};
        filteredBorrows.forEach(b => {
          if (!groups[b.equipmentId]) {
            const eq = equipmentList.find(e => e.id === b.equipmentId);
            groups[b.equipmentId] = {
              code: eq?.code || 'N/A',
              name: eq?.name || b.equipmentName || 'N/A',
              count: 0,
              duration: 0
            };
          }
          groups[b.equipmentId].count += 1;
          groups[b.equipmentId].duration += (b.duration || 0);
        });

        rows = Object.values(groups).map(g => [g.code, g.name, g.count, Math.round(g.duration)]);
        sheetName = "Theo thiết bị";
      } else if (aggregation === 'user') {
        headers = ["MSSV", "Họ tên", "Số lượt mượn", "Tổng thời gian dùng (Giờ)"];
        const groups = {};
        filteredBorrows.forEach(b => {
          if (!b.mssv) return;
          if (!groups[b.mssv]) {
            groups[b.mssv] = {
              mssv: b.mssv,
              name: b.borrowerName || 'N/A',
              count: 0,
              duration: 0
            };
          }
          groups[b.mssv].count += 1;
          groups[b.mssv].duration += (b.duration || 0);
        });

        rows = Object.values(groups).map(g => [g.mssv, g.name, g.count, Math.round(g.duration)]);
        sheetName = "Theo người dùng";
      } else if (aggregation === 'location') {
        headers = ["Vị trí / Phòng", "Số lượt mượn", "Tổng thời gian dùng (Giờ)"];
        const groups = {};
        filteredBorrows.forEach(b => {
          const eq = equipmentList.find(e => e.id === b.equipmentId);
          const loc = eq?.location || 'Khác';
          if (!groups[loc]) {
            groups[loc] = {
              location: loc,
              count: 0,
              duration: 0
            };
          }
          groups[loc].count += 1;
          groups[loc].duration += (b.duration || 0);
        });

        rows = Object.values(groups).map(g => [g.location, g.count, Math.round(g.duration)]);
        sheetName = "Theo vị trí";
      } else {
        headers = ["Tháng", "Số lượt mượn", "Tổng thời gian dùng (Giờ)"];
        const groups = {};
        filteredBorrows.forEach(b => {
          if (!b.borrowDate) return;
          const d = new Date(b.borrowDate);
          const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!groups[month]) {
            groups[month] = {
              month,
              count: 0,
              duration: 0
            };
          }
          groups[month].count += 1;
          groups[month].duration += (b.duration || 0);
        });

        rows = Object.values(groups).sort((a,b) => a.month.localeCompare(b.month)).map(g => [g.month, g.count, Math.round(g.duration)]);
        sheetName = "Theo thời gian";
      }

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `Bao_cao_su_dung_${aggregation}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      let headers = ["Thông tin", "Lượt mượn", "Thời gian (h)"];
      let rows = filteredBorrows.map(b => [
        `${b.equipmentName} (${b.borrowerName})`,
        1,
        Math.round(b.duration || 0)
      ]);

      const htmlContent = `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Báo cáo sử dụng thiết bị</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h2>BÁO CÁO SỬ DỤNG THIẾT BỊ PHÒNG LAB</h2>
          <p>Thời gian: ${startDate || 'Mọi lúc'} đến ${endDate || 'Hiện tại'}</p>
          <p>Tổng hợp theo: ${aggregation}</p>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${r[0]}</td>
                  <td>${r[1]}</td>
                  <td>${r[2]}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bao_cao_su_dung_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const categoryOptions = [
    { value: 'Tất cả danh mục', label: 'Tất cả danh mục' },
    { value: 'Thiết bị', label: 'Thiết bị' },
    { value: 'Linh kiện tiêu hao', label: 'Linh kiện tiêu hao' }
  ];

  useEffect(() => {
    if (showModal || kpiModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, kpiModal.isOpen]);

  const handleChartClick = (state) => {
    if (state && state.activeLabel) {
      setSelectedDate(state.activeLabel);
      setShowModal(true);
      setExpandedRow(null);
    }
  };

  const isConsumableRecord = (b, equip) => {
    if (b.status === 'Đã xuất tiêu hao' || b.status === 'Đã dùng') return true;
    if (b.assetType && (
      b.assetType === 'Linh kiện tiêu hao' || 
      b.assetType === 'Vật tư tiêu hao' ||
      b.assetType.toLowerCase().includes('linh kiện') || 
      b.assetType.toLowerCase().includes('tiêu hao') ||
      b.assetType.toLowerCase().includes('vật tư')
    )) return true;
    if (equip && equip.assetType && (
      equip.assetType === 'Linh kiện tiêu hao' || 
      equip.assetType === 'Vật tư tiêu hao' ||
      equip.assetType.toLowerCase().includes('linh kiện') || 
      equip.assetType.toLowerCase().includes('tiêu hao') ||
      equip.assetType.toLowerCase().includes('vật tư')
    )) return true;
    return false;
  };

  const detailsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return borrows.filter(b => {
      if (!b.borrowDate) return false;
      const bd = new Date(b.borrowDate);
      
      if (viewMode === 'range') {
        const label = `T${bd.getMonth() + 1}/${bd.getFullYear()}`;
        return label === selectedDate;
      } else {
        const dateStr = `${bd.getDate()}/${bd.getMonth() + 1}`;
        const [selYear, selMonth] = selectedMonth.split('-');
        return dateStr === selectedDate && bd.getFullYear() === parseInt(selYear) && bd.getMonth() + 1 === parseInt(selMonth);
      }
    }).map(b => {
      const equip = equipmentList.find(e => e.id === b.equipmentId);
      const isCons = isConsumableRecord(b, equip);
      return {
        ...b,
        assetType: isCons ? 'Linh kiện tiêu hao' : (equip ? equip.assetType : 'Thiết bị')
      };
    });
  }, [selectedDate, borrows, equipmentList, viewMode, selectedMonth]);

  // Lọc danh sách mượn theo mốc thời gian đang chọn (Tháng hoặc Khoảng tháng)
  const periodBorrows = useMemo(() => {
    return borrows.filter(b => {
      if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return false;
      if (!b.borrowDate) return false;
      if (viewMode === 'month') {
        return b.borrowDate.startsWith(selectedMonth);
      } else {
        const ym = b.borrowDate.slice(0, 7);
        return ym >= startMonth && ym <= endMonth;
      }
    });
  }, [borrows, viewMode, selectedMonth, startMonth, endMonth]);

  const { eqBorrows, consBorrows } = useMemo(() => {
    if (!periodBorrows.length || !equipmentList.length) return { eqBorrows: [], consBorrows: [] };
    const eq = [];
    const cons = [];
    periodBorrows.forEach(b => {
      const equip = equipmentList.find(e => e.id === b.equipmentId);
      if (isConsumableRecord(b, equip)) {
        cons.push(b);
      } else {
        eq.push(b);
      }
    });
    return { eqBorrows: eq, consBorrows: cons };
  }, [periodBorrows, equipmentList]);

  // Thiết bị được mượn nhiều nhất trong kỳ (giới hạn 10)
  const topEquipments = useMemo(() => {
    const counts = {};
    eqBorrows.forEach(b => {
      const name = b.equipmentName || 'Thiết bị';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.keys(counts)
      .map(name => ({ name, 'Số lần mượn': counts[name] }))
      .sort((a, b) => b['Số lần mượn'] - a['Số lần mượn'])
      .slice(0, 10);
  }, [eqBorrows]);

  // Tiêu hao nhiều nhất trong kỳ (giới hạn 10)
  const topConsumables = useMemo(() => {
    const counts = {};
    consBorrows.forEach(b => {
      const name = b.equipmentName || 'Linh kiện';
      counts[name] = (counts[name] || 0) + (Number(b.qty) || 1);
    });

    return Object.keys(counts)
      .map(name => ({ name, 'Số lượng tiêu hao': counts[name] }))
      .sort((a, b) => b['Số lượng tiêu hao'] - a['Số lượng tiêu hao'])
      .slice(0, 10);
  }, [consBorrows]);

  const detailsColumns = React.useMemo(() => [
    { accessorKey: 'borrowerName', header: 'Người mượn', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: '500' }}>{row.borrowerName}</div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.mssv}</div>
      </div>
    )},
    { accessorKey: 'equipmentName', header: 'Thiết bị / Linh kiện', sortable: true, cell: (row) => (
      <div style={{ wordBreak: 'break-word', maxWidth: '300px' }}>{row.equipmentName}</div>
    )},
    { accessorKey: 'qty', header: 'Số lượng', sortable: true, align: 'center', cell: (row) => <span style={{ fontWeight: 'bold' }}>{row.qty || 1}</span> },
    { accessorKey: 'assetType', header: 'Loại', sortable: true, cell: (row) => (
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: 'var(--text-2xs)',
        backgroundColor: row.assetType === 'Linh kiện tiêu hao' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
        color: row.assetType === 'Linh kiện tiêu hao' ? '#d8b4fe' : '#93c5fd',
        display: 'inline-block'
      }}>
        {row.assetType}
      </span>
    )}
  ], []);

  const usersColumns = React.useMemo(() => [
    { accessorKey: 'mssv', header: 'Mã SV', sortable: true },
    { accessorKey: 'name', header: 'Họ tên', sortable: true },
    { accessorKey: 'eqCount', header: 'Mượn thiết bị', sortable: true, align: 'center' },
    { accessorKey: 'consCount', header: 'Xuất tiêu hao', sortable: true, align: 'center' },
    { accessorKey: 'count', header: 'Tổng lượt', sortable: true, align: 'center' },
  ], []);

  const handleKpiClick = (type) => {
    let title = '';
    let data = [];
    
    if (type === 'eq') {
      title = 'Mượn thiết bị';
      data = eqBorrows;
    } else if (type === 'cons') {
      title = 'Xuất tiêu hao';
      data = consBorrows;
    } else if (type === 'month') {
      title = `Lượt mượn Tháng ${selectedMonth ? selectedMonth.split('-')[1] : currentMonthStr.split('-')[1]}`;
      data = borrows.filter(b => {
        if (!b.borrowDate) return false;
        return b.borrowDate.startsWith(selectedMonth || currentMonthStr);
      });
    } else if (type === 'users') {
      title = 'Thành viên mượn';
      const users = {};
      borrows.forEach(b => {
        if (!users[b.mssv]) {
          users[b.mssv] = { mssv: b.mssv, name: b.borrowerName, count: 0, eqCount: 0, consCount: 0 };
        }
        users[b.mssv].count += 1;
        const equip = equipmentList.find(e => e.id === b.equipmentId);
        if (isConsumableRecord(b, equip)) {
           users[b.mssv].consCount += 1;
        } else {
           users[b.mssv].eqCount += 1;
        }
      });
      data = Object.values(users).sort((a, b) => b.count - a.count);
    }
    
    // Bổ sung assetType để có thể filter/sort
    if (type !== 'users') {
      data = data.map(b => {
        const equip = equipmentList.find(e => e.id === b.equipmentId);
        const isCons = isConsumableRecord(b, equip);
        return {
          ...b,
          assetType: isCons ? 'Linh kiện tiêu hao' : (equip ? equip.assetType : 'Thiết bị')
        };
      });
    }

    setExpandedRow(null);
    setModalCategoryFilter('Tất cả danh mục');
    setKpiModal({ isOpen: true, type, title, data });
  };

  const filteredModalData = React.useMemo(() => {
    let d = kpiModal.data;
    if (kpiModal.type !== 'users' && modalCategoryFilter !== 'Tất cả danh mục') {
      d = d.filter(item => item.assetType === modalCategoryFilter);
    }
    return d;
  }, [kpiModal, modalCategoryFilter]);

  const renderDetailsExpandedRow = React.useCallback((row) => (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
      <div className="text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <p><strong style={{ color: 'var(--text-secondary)' }}>Thời gian mượn:</strong> {new Date(row.borrowDate).toLocaleString('vi-VN')}</p>
          {row.expectedReturnDate && (
            <p><strong style={{ color: 'var(--text-secondary)' }}>Dự kiến trả:</strong> {new Date(row.expectedReturnDate).toLocaleString('vi-VN')}</p>
          )}
          {row.returnDate && (
            <p><strong style={{ color: 'var(--text-secondary)' }}>Thực tế trả:</strong> {new Date(row.returnDate).toLocaleString('vi-VN')}</p>
          )}
        </div>
        <div>
          <p><strong style={{ color: 'var(--text-secondary)' }}>Trạng thái:</strong> {row.status}</p>
          <p><strong style={{ color: 'var(--text-secondary)' }}>Tình trạng khi mượn:</strong> {row.initialCondition || 'Không rõ'}</p>
          {row.finalCondition && (
            <p><strong style={{ color: 'var(--text-secondary)' }}>Tình trạng khi trả:</strong> {row.finalCondition}</p>
          )}
        </div>
      </div>
      {row.borrowNotes && (
        <div className="text-sm" style={{ marginTop: '0.5rem' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Ghi chú:</strong> {row.borrowNotes}
        </div>
      )}
    </div>
  ), []);

  // Tần suất mượn theo thời gian
  const borrowTrend = useMemo(() => {
    const dates = {};
    
    if (viewMode === 'month') {
      if (!selectedMonth) return [];
      const [year, month] = selectedMonth.split('-');
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${i}/${parseInt(month)}`;
        dates[dateStr] = { date: dateStr, 'Thiết bị': 0, 'Tiêu hao': 0, year: parseInt(year) };
      }
    } else if (viewMode === 'range') {
      if (!startMonth || !endMonth) return [];
      
      const getMonthsBetween = (startStr, endStr) => {
        const months = [];
        const [sY, sM] = startStr.split('-').map(Number);
        const [eY, eM] = endStr.split('-').map(Number);
        
        let currentYear = sY;
        let currentMonth = sM;
        
        while (currentYear < eY || (currentYear === eY && currentMonth <= eM)) {
          months.push({
            key: `${currentMonth}/${currentYear}`,
            month: currentMonth,
            year: currentYear,
            label: `T${currentMonth}/${currentYear}`
          });
          currentMonth++;
          if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
          }
        }
        return months;
      };

      const monthsList = getMonthsBetween(startMonth, endMonth);
      monthsList.forEach(m => {
        dates[m.key] = { date: m.label, 'Thiết bị': 0, 'Tiêu hao': 0, year: m.year, month: m.month };
      });
    }

    borrows.forEach(b => {
      if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return;
      if (b.borrowDate) {
        const bd = new Date(b.borrowDate);
        
        if (viewMode === 'range') {
          const key = `${bd.getMonth() + 1}/${bd.getFullYear()}`;
          if (dates[key]) {
            const equip = equipmentList.find(e => e.id === b.equipmentId);
            if (isConsumableRecord(b, equip)) {
              dates[key]['Tiêu hao'] += 1;
            } else {
              dates[key]['Thiết bị'] += 1;
            }
          }
        } else {
          const dateStr = `${bd.getDate()}/${bd.getMonth() + 1}`;
          if (dates[dateStr] && dates[dateStr].year === bd.getFullYear()) {
            const equip = equipmentList.find(e => e.id === b.equipmentId);
            if (isConsumableRecord(b, equip)) {
              dates[dateStr]['Tiêu hao'] += 1;
            } else {
              dates[dateStr]['Thiết bị'] += 1;
            }
          }
        }
      }
    });

    return Object.values(dates);
  }, [borrows, equipmentList, viewMode, selectedMonth, startMonth, endMonth]);

  const currentMonthBorrowsCount = useMemo(() => {
    return borrows.filter(b => {
      if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return false;
      if (!b.borrowDate) return false;
      return b.borrowDate.startsWith(selectedMonth || currentMonthStr);
    }).length;
  }, [borrows, selectedMonth, currentMonthStr]);

  const uniqueBorrowersCount = useMemo(() => {
    const validBorrows = borrows.filter(b => b.status !== 'Đã hủy' && b.status !== 'cancelled' && b.status !== 'Hủy');
    const mssvs = new Set(validBorrows.map(b => b.mssv).filter(Boolean));
    return mssvs.size;
  }, [borrows]);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-header">
            <BarChart2 className="text-pink-500" size={20} />
            Phân tích Sử dụng
          </h2>
          <p className="page-subtitle">Đo lường hiệu suất và tần suất sử dụng thiết bị trong Lab</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
          <Button
            variant="secondary"
            icon={Download}
            iconPosition="left"
            onClick={() => setIsExportModalOpen(true)}
          >
            Xuất báo cáo sử dụng
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader type="dashboard" count={4} />
      ) : (
        <>
          {/* KPI Summary Strip */}
          <div className="glass-card kpi-status-summary" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-group-static">
              {/* KPI 1 */}
              <div 
                className="kpi-item-neutral" 
                onClick={() => handleKpiClick('eq')}
                title="Bấm để xem danh sách chi tiết mượn thiết bị"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('eq')}
              >
                <span className="kpi-status-dot dot-blue"></span>
                <div>
                  <p className="kpi-label">Mượn Thiết Bị</p>
                  <h4 className="kpi-value">
                    {eqBorrows.length} <span className="kpi-unit">phiếu</span>
                  </h4>
                </div>
              </div>

              {/* KPI 2 */}
              <div 
                className="kpi-item-neutral" 
                onClick={() => handleKpiClick('cons')}
                title="Bấm để xem danh sách chi tiết xuất tiêu hao"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('cons')}
              >
                <span className="kpi-status-dot dot-purple"></span>
                <div>
                  <p className="kpi-label">Xuất Tiêu Hao</p>
                  <h4 className="kpi-value">
                    {consBorrows.length} <span className="kpi-unit">phiếu</span>
                  </h4>
                </div>
              </div>
            </div>

            <div className="kpi-group-active">
              {/* KPI 3 */}
              <div 
                className="kpi-item-active active-amber" 
                onClick={() => handleKpiClick('month')}
                title="Bấm để xem chi tiết lượt mượn trong tháng"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('month')}
              >
                <div>
                  <p className="kpi-label" style={{ color: 'var(--accent-amber)' }}>Tháng này</p>
                  <h4 className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
                    {currentMonthBorrowsCount} <span className="kpi-unit" style={{ color: 'var(--accent-amber)', opacity: 0.8 }}>lượt</span>
                  </h4>
                </div>
              </div>

              {/* KPI 4 */}
              <div 
                className="kpi-item-active active-green" 
                onClick={() => handleKpiClick('users')}
                title="Bấm để xem danh sách thành viên mượn"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('users')}
              >
                <div>
                  <p className="kpi-label" style={{ color: 'var(--accent-green)' }}>Thành viên mượn</p>
                  <h4 className="kpi-value" style={{ color: 'var(--accent-green)' }}>
                    {uniqueBorrowersCount} <span className="kpi-unit" style={{ color: 'var(--accent-green)', opacity: 0.8 }}>người</span>
                  </h4>
                </div>
              </div>
            </div>
          </div>

          <div className="usage-dashboard-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Main Usage Trend */}
            <div className="glass-card chart-card">
              <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                  <span>Tần suất mượn & xuất linh kiện</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'none', letterSpacing: 'normal' }}>(Bấm vào điểm để xem chi tiết)</span>
                  
                  {/* Segmented Control */}
                  <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-overlay)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)', height: '32px', alignItems: 'center' }}>
                    <button 
                      type="button"
                      onClick={() => setViewMode('month')}
                      style={{
                        padding: '0 12px',
                        height: '26px',
                        borderRadius: '4px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: 'none',
                        backgroundColor: viewMode === 'month' ? 'var(--accent-blue)' : 'transparent',
                        color: viewMode === 'month' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Tháng
                    </button>
                    <button 
                      type="button"
                      onClick={() => setViewMode('range')}
                      style={{
                        padding: '0 12px',
                        height: '26px',
                        borderRadius: '4px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: 'none',
                        backgroundColor: viewMode === 'range' ? 'var(--accent-blue)' : 'transparent',
                        color: viewMode === 'range' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Chọn tháng
                    </button>
                  </div>

                  {viewMode === 'month' && (
                    <Select 
                      className="small-select"
                      options={monthOptions}
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                      width="150px"
                    />
                  )}

                  {viewMode === 'range' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Select 
                        className="small-select"
                        options={monthOptions}
                        value={startMonth}
                        onChange={setStartMonth}
                        width="135px"
                      />
                      <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'none' }}>đến</span>
                      <Select 
                        className="small-select"
                        options={monthOptions}
                        value={endMonth}
                        onChange={setEndMonth}
                        width="135px"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer debounce={50}>
                  <LineChart data={borrowTrend} margin={{ top: 10, right: 25, left: -20, bottom: 5 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--text-secondary)" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--text-secondary)" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      allowDecimals={false} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle" 
                      iconSize={8}
                      wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '1rem' }}
                    />
                    <Line type="monotone" name="Thiết bị" dataKey="Thiết bị" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent-blue)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Tiêu hao" dataKey="Tiêu hao" stroke="var(--accent-purple)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent-purple)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Unified Usage Ranking Card (Tabs: Thiết bị / Linh kiện tiêu hao) */}
            <div className="glass-card chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
                <h3 className="chart-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {rankingTab === 'equipment' ? (
                    <>
                      <Cpu size={18} style={{ color: 'var(--accent-blue)' }} />
                      <span>Thiết bị mượn nhiều nhất</span>
                    </>
                  ) : (
                    <>
                      <Package size={18} style={{ color: 'var(--accent-purple)' }} />
                      <span>Tiêu hao xuất nhiều nhất</span>
                    </>
                  )}
                  <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    ({viewMode === 'month' ? `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}` : `${startMonth} → ${endMonth}`})
                  </span>
                </h3>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setRankingTab('equipment')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: rankingTab === 'equipment' ? 'var(--accent-blue)' : 'transparent',
                      color: rankingTab === 'equipment' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <Cpu size={14} />
                    Thiết bị
                  </button>
                  <button
                    type="button"
                    onClick={() => setRankingTab('consumable')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: rankingTab === 'consumable' ? 'var(--accent-purple)' : 'transparent',
                      color: rankingTab === 'consumable' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <Package size={14} />
                    Linh kiện tiêu hao
                  </button>
                </div>
              </div>

              {rankingTab === 'equipment' ? (
                topEquipments.length > 0 ? (
                  <div style={{ width: '100%', height: Math.max(200, topEquipments.length * 44 + 30), minHeight: '200px' }}>
                    <ResponsiveContainer debounce={0}>
                      <BarChart
                        data={topEquipments}
                        layout="vertical"
                        margin={{ top: 10, right: 40, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={yAxisWidth} tick={<CustomYAxisTick />} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          cursor={false}
                          contentStyle={{ 
                            backgroundColor: 'var(--bg-card)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#fff',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                          }} 
                        />
                        <Bar 
                          dataKey="Số lần mượn" 
                          fill="var(--accent-blue)" 
                          radius={[0, 4, 4, 0]} 
                          barSize={16} 
                          label={{ position: 'right', fill: 'var(--text-secondary)', fontSize: 11, offset: 8 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', minHeight: '200px' }}>
                    <EmptyState 
                      icon={Cpu}
                      title="Không có dữ liệu mượn thiết bị"
                      description="Chưa có phiếu mượn thiết bị nào trong khoảng thời gian đã chọn."
                    />
                  </div>
                )
              ) : (
                topConsumables.length > 0 ? (
                  <div style={{ width: '100%', height: Math.max(200, topConsumables.length * 44 + 30), minHeight: '200px' }}>
                    <ResponsiveContainer debounce={0}>
                      <BarChart
                        data={topConsumables}
                        layout="vertical"
                        margin={{ top: 10, right: 40, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={yAxisWidth} tick={<CustomYAxisTick />} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          cursor={false}
                          contentStyle={{ 
                            backgroundColor: 'var(--bg-card)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#fff',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                          }} 
                        />
                        <Bar 
                          dataKey="Số lượng tiêu hao" 
                          fill="var(--accent-purple)" 
                          radius={[0, 4, 4, 0]} 
                          barSize={16} 
                          label={{ position: 'right', fill: 'var(--text-secondary)', fontSize: 11, offset: 8 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', minHeight: '200px' }}>
                    <EmptyState 
                      icon={Package}
                      title="Không có phát sinh xuất tiêu hao"
                      description="Trong khoảng thời gian đã chọn chưa có dữ liệu xuất linh kiện tiêu hao."
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal chi tiết cho biểu đồ ngày */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={viewMode === 'range' ? `Chi tiết sử dụng tháng ${selectedDate}` : `Chi tiết sử dụng ngày ${selectedDate}`}
        size="xl"
      >
        {detailsForDate.length > 0 ? (
          <DataTable
            data={detailsForDate}
            columns={detailsColumns}
            renderExpandedRow={renderDetailsExpandedRow}
            expandedRowId={expandedRow}
            onExpandedRowChange={setExpandedRow}
          />
        ) : (
          <EmptyState
            title={`Không có dữ liệu cho ${viewMode === 'range' ? `tháng ${selectedDate}` : `ngày ${selectedDate}`}`}
            description="Không tìm thấy bản ghi sử dụng nào trong thời gian này."
          />
        )}
      </Modal>

      {/* KPI Details Modal (Tự động co giãn, tối đa rộng 96vw/94vh) */}
      {kpiModal.isOpen && (
        <div className="modal-overlay fade-in" style={{ zIndex: 1000, padding: '2vh 2vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setKpiModal({ ...kpiModal, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', height: 'auto', maxWidth: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '50%', color: 'var(--accent-blue)', display: 'flex' }}>
                  {kpiModal.type === 'eq' && <Cpu size={24} className="text-blue-500" />}
                  {kpiModal.type === 'cons' && <Package size={24} className="text-purple-500" />}
                  {kpiModal.type === 'month' && <TrendingUp size={24} className="text-amber-500" />}
                  {kpiModal.type === 'users' && <Users size={24} className="text-emerald-500" />}
                </div>
                <h2 className="card-title" style={{ margin: 0 }}>{kpiModal.title}</h2>
              </div>
              <Button type="button" variant="ghost" icon={X} onClick={() => setKpiModal({ ...kpiModal, isOpen: false })}
                style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
              />
            </div>
            <div className="modal-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, background: 'var(--bg-primary)' }}>
              <div style={{ padding: '2rem', overflowY: 'auto' }}>
                <DataTable
                  data={filteredModalData}
                  columns={kpiModal.type === 'users' ? usersColumns : detailsColumns}
                  searchKeys={kpiModal.type === 'users' ? ['name', 'mssv'] : ['borrowerName', 'mssv', 'equipmentName', 'assetType']}
                  renderExpandedRow={kpiModal.type === 'users' ? null : renderDetailsExpandedRow}
                  expandedRowId={expandedRow}
                  onExpandedRowChange={setExpandedRow}
                  toolbarActions={kpiModal.type !== 'users' && (
                    <Select 
                      options={categoryOptions}
                      value={modalCategoryFilter}
                      onChange={setModalCategoryFilter}
                      width="280px"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        type="usage"
        counts={{
          all: equipmentList.length,
          filtered: equipmentList.length, // Đơn giản hóa do không lọc
          selected: 0
        }}
        previewStats={{
          numDevices: equipmentList.length,
          numBorrows: borrows.length,
          totalDuration: borrows.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0)
        }}
        onExport={handleExportUsage}
      />
      <style>{`
        .kpi-status-summary {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 1rem 1.5rem !important;
          gap: 2rem;
        }
        .kpi-group-static {
          display: flex;
          gap: 3.5rem;
          align-items: center;
        }
        .kpi-group-active {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        
        .kpi-item-neutral {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .kpi-item-neutral:hover {
          opacity: 0.8;
        }
        .kpi-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-blue {
          background-color: var(--accent-blue);
        }
        .dot-purple {
          background-color: var(--accent-purple);
        }

        .kpi-item-active {
          display: flex;
          align-items: center;
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          min-width: 140px;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
        }

        .active-amber {
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
        .active-amber:hover {
          background: rgba(245, 158, 11, 0.12) !important;
          border-color: rgba(245, 158, 11, 0.25) !important;
        }

        .active-green {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }
        .active-green:hover {
          background: rgba(16, 185, 129, 0.12) !important;
          border-color: rgba(16, 185, 129, 0.25) !important;
        }

        .kpi-label {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .kpi-value {
          margin: 0.15rem 0 0 0;
          font-size: 1.6rem;
          font-weight: 700;
          line-height: 1.1;
          display: flex;
          align-items: baseline;
          gap: 0.2rem;
          color: var(--text-primary);
        }
        .kpi-unit {
          font-size: 0.8rem;
          font-weight: normal;
          color: var(--text-muted);
          margin-left: 0.1rem;
          text-transform: lowercase;
        }

        .glass-card {
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.25) !important;
          border-radius: 12px !important;
          backdrop-filter: none !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .glass-card:hover {
          transform: none !important;
          border-color: rgba(59, 130, 246, 0.25) !important;
          box-shadow: 0 6px 22px -3px rgba(0, 0, 0, 0.3) !important;
        }

        .chart-card, .table-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .chart-header, .table-header {
          font-size: 0.85rem;
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

        .ranking-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          width: 100%;
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

        @media (max-width: 1024px) {
          .kpi-status-summary {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1.25rem;
          }
          .kpi-group-static {
            gap: 1.5rem;
            justify-content: space-between;
            width: 100%;
          }
          .kpi-group-active {
            gap: 1rem;
            justify-content: space-between;
            width: 100%;
          }
          .kpi-item-active {
            flex: 1;
            min-width: 0;
          }
          .ranking-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .kpi-group-static {
            flex-direction: column;
            gap: 1rem;
          }
          .kpi-group-active {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
