import React, { useMemo, useState, useEffect } from 'react';
import Button from '../components/Button';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
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
import * as XLSX from 'xlsx';

const CustomYAxisTick = ({ x, y, payload }) => {
  const maxLength = 15;
  const displayText = payload.value.length > maxLength ? `${payload.value.substring(0, maxLength)}...` : payload.value;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="var(--text-secondary)" fontSize={12}>
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
      return {
        ...b,
        assetType: equip ? equip.assetType : 'Thiết bị'
      };
    });
  }, [selectedDate, borrows, equipmentList, viewMode, selectedMonth]);

  const { eqBorrows, consBorrows } = useMemo(() => {
    if (!borrows.length || !equipmentList.length) return { eqBorrows: [], consBorrows: [] };
    const eq = [];
    const cons = [];
    borrows.forEach(b => {
      const equip = equipmentList.find(e => e.id === b.equipmentId);
      if (equip && equip.assetType === 'Linh kiện tiêu hao') {
        cons.push(b);
      } else {
        eq.push(b);
      }
    });
    return { eqBorrows: eq, consBorrows: cons };
  }, [borrows, equipmentList]);

  // Thiết bị được mượn nhiều nhất (giới hạn 10)
  const topEquipments = useMemo(() => {
    const counts = {};
    eqBorrows.forEach(b => {
      counts[b.equipmentName] = (counts[b.equipmentName] || 0) + 1;
    });

    return Object.keys(counts)
      .map(name => ({ name, 'Số lần mượn': counts[name] }))
      .sort((a, b) => b['Số lần mượn'] - a['Số lần mượn'])
      .slice(0, 10);
  }, [eqBorrows]);

  // Tiêu hao nhiều nhất (giới hạn 10)
  const topConsumables = useMemo(() => {
    const counts = {};
    consBorrows.forEach(b => {
      counts[b.equipmentName] = (counts[b.equipmentName] || 0) + (Number(b.qty) || 1);
    });

    return Object.keys(counts)
      .map(name => ({ name, 'Số lượng tiêu hao': counts[name] }))
      .sort((a, b) => b['Số lượng tiêu hao'] - a['Số lượng tiêu hao'])
      .slice(0, 10);
  }, [consBorrows]);

  // Top Thành viên mượn nhiều nhất
  const topBorrowers = useMemo(() => {
    const users = {};
    borrows.forEach(b => {
      if (!users[b.mssv]) {
        users[b.mssv] = { mssv: b.mssv, name: b.borrowerName, count: 0 };
      }
      users[b.mssv].count += 1;
    });

    return Object.values(users)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [borrows]);

  const topBorrowersColumns = React.useMemo(() => [
    { accessorKey: 'top', header: 'Top', sortable: false, align: 'center', cell: (row) => {
      const index = topBorrowers.findIndex(u => u.mssv === row.mssv);
      return (
        <span style={{
          display: 'inline-block',
          width: '24px',
          height: '24px',
          lineHeight: '24px',
          borderRadius: '50%',
          background: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
          color: index < 3 ? '#000' : 'var(--text-primary)',
          fontWeight: 'bold',
          fontSize: 'var(--text-sm)'
        }}>
          {index + 1}
        </span>
      );
    }},
    { accessorKey: 'mssv', header: 'Mã sinh viên', sortable: true, cell: (row) => <span style={{ fontFamily: 'monospace' }}>{row.mssv}</span> },
    { accessorKey: 'name', header: 'Họ và Tên', sortable: true, cell: (row) => <span style={{ fontWeight: '500' }}>{row.name}</span> },
    { accessorKey: 'count', header: 'Số lượt mượn', sortable: true, align: 'center', cell: (row) => <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{row.count}</span> }
  ], [topBorrowers]);

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
        if (equip && equip.assetType === 'Linh kiện tiêu hao') {
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
        return {
          ...b,
          assetType: equip ? equip.assetType : 'Thiết bị'
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
      if (b.borrowDate) {
        const bd = new Date(b.borrowDate);
        
        if (viewMode === 'range') {
          const key = `${bd.getMonth() + 1}/${bd.getFullYear()}`;
          if (dates[key]) {
            const equip = equipmentList.find(e => e.id === b.equipmentId);
            if (equip && equip.assetType === 'Linh kiện tiêu hao') {
              dates[key]['Tiêu hao'] += 1;
            } else {
              dates[key]['Thiết bị'] += 1;
            }
          }
        } else {
          const dateStr = `${bd.getDate()}/${bd.getMonth() + 1}`;
          if (dates[dateStr] && dates[dateStr].year === bd.getFullYear()) {
            const equip = equipmentList.find(e => e.id === b.equipmentId);
            if (equip && equip.assetType === 'Linh kiện tiêu hao') {
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
      if (!b.borrowDate) return false;
      return b.borrowDate.startsWith(selectedMonth || currentMonthStr);
    }).length;
  }, [borrows, selectedMonth, currentMonthStr]);

  const uniqueBorrowersCount = useMemo(() => {
    const mssvs = new Set(borrows.map(b => b.mssv).filter(Boolean));
    return mssvs.size;
  }, [borrows]);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-header">
            <BarChart2 className="text-pink-500" size={20} />
            Phân tích Sử dụng
          </h2>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>Đo lường hiệu suất và tần suất sử dụng thiết bị trong Lab</p>
        </div>
        <Button
          variant="secondary"
          icon={Download}
          iconPosition="left"
          onClick={() => setIsExportModalOpen(true)}
        >Xuất báo cáo sử dụng</Button>
      </div>

      {isLoading ? (
        <SkeletonLoader type="dashboard" count={4} />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: Phiếu mượn thiết bị */}
        <div 
          className="glass-card hover:bg-[rgba(255,255,255,0.02)] transition-colors" 
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-blue)', cursor: 'pointer' }}
          onClick={() => handleKpiClick('eq')}
        >
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-label">Mượn Thiết Bị</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{eqBorrows.length} <span className="stat-unit">phiếu</span></h2>
          </div>
        </div>

        {/* KPI 2: Phiếu xuất tiêu hao */}
        <div 
          className="glass-card hover:bg-[rgba(255,255,255,0.02)] transition-colors" 
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)', cursor: 'pointer' }}
          onClick={() => handleKpiClick('cons')}
        >
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <p className="text-label">Xuất Tiêu Hao</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{consBorrows.length} <span className="stat-unit">phiếu</span></h2>
          </div>
        </div>

        {/* KPI 3: Lượt mượn trong tháng */}
        <div 
          className="glass-card hover:bg-[rgba(255,255,255,0.02)] transition-colors" 
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-amber)', cursor: 'pointer' }}
          onClick={() => handleKpiClick('month')}
        >
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-label">Lượt Mượn Tháng Này</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{currentMonthBorrowsCount} <span className="stat-unit">lượt</span></h2>
          </div>
        </div>

        {/* KPI 4: Thành viên hoạt động */}
        <div 
          className="glass-card hover:bg-[rgba(255,255,255,0.02)] transition-colors" 
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-green)', cursor: 'pointer' }}
          onClick={() => handleKpiClick('users')}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <p className="text-label">Thành Viên Mượn</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{uniqueBorrowersCount} <span className="stat-unit">người</span></h2>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Wrapper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Biểu đồ Xu hướng */}
        <div className="glass-card flex flex-col" style={{ gridColumn: '1 / -1', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {/* Hàng 1: Tiêu đề và Nút chuyển chế độ cố định */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ margin: 0 }}>
                <TrendingUp size={20} className="text-green-400" />
                Tần suất mượn & xuất linh kiện
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span className="text-muted">(Bấm vào điểm để xem chi tiết)</span>
                
                {/* Segmented Control */}
                <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-overlay)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)', height: '32px', alignItems: 'center' }}>
                  <button 
                    type="button"
                    onClick={() => setViewMode('month')}
                    style={{
                      padding: '0 12px',
                      height: '28px',
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
                      height: '28px',
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
              </div>
            </div>

            {/* Hàng 2: Bộ chọn chi tiết (Luôn nằm dưới và căn phải) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '32px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Select 
                    className="small-select"
                    options={monthOptions}
                    value={startMonth}
                    onChange={setStartMonth}
                    width="140px"
                  />
                  <span className="text-muted">đến</span>
                  <Select 
                    className="small-select"
                    options={monthOptions}
                    value={endMonth}
                    onChange={setEndMonth}
                    width="140px"
                  />
                </div>
              )}
            </div>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer debounce={50}>
              <LineChart data={borrowTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" name="Thiết bị" dataKey="Thiết bị" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Tiêu hao" dataKey="Tiêu hao" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Thiết Bị */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-heading" style={{ marginBottom: '1rem' }}>
            <Cpu size={20} style={{ color: 'var(--accent-blue)' }} />
            Thiết bị mượn nhiều nhất
          </h3>
          <div style={{ width: '100%', height: Math.max(280, topEquipments.length * 40 + 40) }}>
            <ResponsiveContainer debounce={50}>
              <BarChart
                data={topEquipments}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={140} tick={<CustomYAxisTick />} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="Số lần mượn" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tiêu Hao */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-heading" style={{ marginBottom: '1rem' }}>
            <Package size={20} style={{ color: 'var(--accent-purple)' }} />
            Tiêu hao xuất nhiều nhất
          </h3>
          {topConsumables.length > 0 ? (
            <div style={{ width: '100%', height: Math.max(280, topConsumables.length * 40 + 40) }}>
              <ResponsiveContainer debounce={50}>
                <BarChart
                  data={topConsumables}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={140} tick={<CustomYAxisTick />} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Bar dataKey="Số lượng tiêu hao" fill="var(--accent-purple)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Chưa có dữ liệu tiêu hao</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Borrowers Table */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h2 className="section-heading">
            <Users size={20} style={{ color: 'var(--accent-blue)' }} />
            Top Thành viên mượn đồ nhiều nhất
          </h2>
        </div>
        
        <DataTable
          data={topBorrowers}
          columns={topBorrowersColumns}
        />
      </div>
      </>
      )}

      {/* Modal chi tiết cho biểu đồ ngày */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header flex justify-between items-center mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="font-bold text-xl">
                {viewMode === 'range' ? `Chi tiết sử dụng tháng ${selectedDate}` : `Chi tiết sử dụng ngày ${selectedDate}`}
              </h3>
              <Button type="button" variant="ghost" icon={X} onClick={() => setShowModal(false)}
                style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
              />
            </div>
            <div className="modal-body" style={{ padding: '0 1.5rem 1.5rem 1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
              {detailsForDate.length > 0 ? (
                <DataTable
                  data={detailsForDate}
                  columns={detailsColumns}
                  renderExpandedRow={renderDetailsExpandedRow}
                  expandedRowId={expandedRow}
                  onExpandedRowChange={setExpandedRow}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Không có dữ liệu cho {viewMode === 'range' ? `tháng ${selectedDate}` : `ngày ${selectedDate}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Details Modal (Toàn màn hình) */}
      {kpiModal.isOpen && (
        <div className="modal-overlay fade-in" style={{ zIndex: 1000, padding: '2vh 2vw' }} onClick={() => setKpiModal({ ...kpiModal, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
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
            <div className="modal-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, padding: 0, background: 'var(--bg-primary)' }}>
              <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
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
    </div>
  );
}
