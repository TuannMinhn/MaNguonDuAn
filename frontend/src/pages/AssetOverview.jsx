import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import {
  PieChart as PieChartIcon,
  Box,
  Cpu,
  Activity,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  FileText,
  X,
  Clock,
  ShieldCheck,
  ArrowRight,
  Wrench
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import SkeletonLoader from '../components/SkeletonLoader';
import DataTable from '../components/DataTable';
import Select from '../components/Select';
import Button from '../components/Button';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AssetOverview({ onNavigate }) {
  const { data: equipmentList = [], isLoading: isLoadingEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: maintenanceList = [], isLoading: isLoadingMaint } = useSWR(`${API_BASE_URL}/maintenance`, fetcher);
  const { data: borrowTickets = [], isLoading: isLoadingBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: analyticsEquipment = [], isLoading: isLoadingAnalytics } = useSWR(`${API_BASE_URL}/analytics/equipment`, fetcher);
  const isLoading = isLoadingEquip || isLoadingMaint || isLoadingBorrows || isLoadingAnalytics;

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, title: '', data: [], columns: [] });
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const yAxisWidth = windowWidth < 600 ? 110 : 180;
  const formatYAxisTick = (tick) => {
    if (windowWidth < 600 && tick.length > 15) {
      return `${tick.substring(0, 12)}...`;
    }
    return tick;
  };

  // Thống kê KPIs
  const stats = useMemo(() => {
    let totalDevices = 0;
    let totalComponents = 0;
    let totalBorrowed = 0;

    equipmentList.forEach(eq => {
      const isComponent = eq.assetType && (
        eq.assetType.toLowerCase().includes('linh kiện') ||
        eq.assetType.toLowerCase().includes('vật tư')
      );
      if (isComponent) {
        totalComponents += 1;
      } else {
        totalDevices += 1;
        totalBorrowed += (eq.borrowedQty || 0);
      }
    });

    const brokenDevices = maintenanceList.filter(m => m.status === 'Đang sửa' || m.status === 'Bảo hành hãng').length;
    const availabilityRate = totalDevices > 0
      ? Math.round(((totalDevices - totalBorrowed - brokenDevices) / totalDevices) * 100)
      : 100;

    return { totalDevices, totalComponents, totalBorrowed, brokenDevices, availabilityRate };
  }, [equipmentList, maintenanceList]);

  // Dữ liệu Biểu đồ Tròn (Tình trạng Thiết bị)
  const statusData = useMemo(() => {
    let ready = 0;
    let borrowed = 0;

    equipmentList.forEach(eq => {
      const isComponent = eq.assetType && (
        eq.assetType.toLowerCase().includes('linh kiện') ||
        eq.assetType.toLowerCase().includes('vật tư')
      );
      if (!isComponent) {
        borrowed += (eq.borrowedQty || 0);
        ready += ((eq.totalQty || 0) - (eq.borrowedQty || 0));
      }
    });

    ready = Math.max(0, ready - stats.brokenDevices);

    return [
      { name: 'Sẵn sàng', value: ready },
      { name: 'Đang mượn', value: borrowed },
      { name: 'Đang sửa/Hỏng', value: stats.brokenDevices }
    ].filter(d => d.value > 0);
  }, [equipmentList, stats.brokenDevices]);

  // Dữ liệu Biểu đồ Cột (Thiết bị theo Danh mục)
  const categoryData = useMemo(() => {
    const cats = {};
    equipmentList.forEach(eq => {
      if (eq.assetType !== 'Linh kiện tiêu hao' && !eq.assetType?.includes('Linh kiện')) {
        const cat = eq.category || 'Khác';
        cats[cat] = (cats[cat] || 0) + (eq.totalQty || 0);
      }
    });

    return Object.keys(cats).map(key => ({
      name: key,
      'Số lượng': cats[key]
    })).sort((a, b) => b['Số lượng'] - a['Số lượng']);
  }, [equipmentList]);

  // Giới hạn số lượng danh mục hiển thị để tối ưu giao diện
  const displayedCategoryData = useMemo(() => {
    if (showAllCategories || categoryData.length <= 6) {
      return categoryData;
    }
    // Gộp các danh mục ngoài top 5 thành "Các danh mục khác"
    const topCats = categoryData.slice(0, 5);
    const otherCats = categoryData.slice(5);
    const othersSum = otherCats.reduce((sum, item) => sum + item['Số lượng'], 0);

    return [
      ...topCats,
      { name: 'Các danh mục khác', 'Số lượng': othersSum }
    ];
  }, [categoryData, showAllCategories]);

  // 1. Thống kê Hoạt động mượn & Tần suất sử dụng Thiết bị
  const usageInsights = useMemo(() => {
    const totalBorrowsCount = borrowTickets.length;
    const activeBorrowsCount = borrowTickets.filter(t => t.status === 'Đang mượn' || t.status === 'Đã đặt trước').length;
    const returnedBorrowsCount = borrowTickets.filter(t => t.status === 'Đã trả' || t.status === 'Hoàn thành').length;

    // Thống kê tần suất mượn theo từng thiết bị
    const equipBorrowMap = {};
    borrowTickets.forEach(b => {
      const name = b.equipmentName || 'Thiết bị';
      const qty = Number(b.qty) || 1;
      equipBorrowMap[name] = (equipBorrowMap[name] || 0) + qty;
    });

    const topBorrowed = Object.entries(equipBorrowMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const maxCount = topBorrowed.length > 0 ? topBorrowed[0].count : 1;
    const topWithPercent = topBorrowed.map(item => ({
      ...item,
      percent: Math.min(100, Math.round((item.count / maxCount) * 100))
    }));

    const utilizationRate = stats.totalDevices > 0
      ? Math.round((stats.totalBorrowed / stats.totalDevices) * 100)
      : 0;

    return {
      totalBorrowsCount,
      activeBorrowsCount,
      returnedBorrowsCount,
      utilizationRate,
      topBorrowed: topWithPercent,
      hasBorrowHistory: totalBorrowsCount > 0
    };
  }, [borrowTickets, stats.totalDevices, stats.totalBorrowed]);

  // 2. Thống kê & Phân tích Tồn kho Linh kiện
  const componentsInsights = useMemo(() => {
    const components = equipmentList.filter(eq =>
      eq.assetType && (
        eq.assetType.toLowerCase().includes('linh kiện') ||
        eq.assetType.toLowerCase().includes('vật tư')
      )
    );

    const totalTypes = components.length;
    const totalStock = components.reduce((sum, c) => sum + (Number(c.totalQty) || 0), 0);

    // Linh kiện dưới hoặc chạm ngưỡng tối thiểu
    const criticalList = components
      .filter(c => (Number(c.totalQty) || 0) <= (Number(c.minThreshold) || 5))
      .sort((a, b) => (a.totalQty || 0) - (b.totalQty || 0));

    // Top 3 linh kiện cần theo dõi (ưu tiên linh kiện có tồn kho thấp nhất)
    const trackedList = [...components]
      .sort((a, b) => {
        const thresholdA = Math.max(1, Number(a.minThreshold) || 5);
        const thresholdB = Math.max(1, Number(b.minThreshold) || 5);
        const ratioA = (Number(a.totalQty) || 0) / thresholdA;
        const ratioB = (Number(b.totalQty) || 0) / thresholdB;
        return ratioA - ratioB;
      })
      .slice(0, 3)
      .map(c => {
        const threshold = Number(c.minThreshold) || 5;
        const current = Number(c.totalQty) || 0;
        const ratioPercent = Math.min(100, Math.round((current / (threshold * 2)) * 100));
        const isCritical = current <= threshold;
        return {
          ...c,
          threshold,
          current,
          ratioPercent,
          isCritical
        };
      });

    return {
      totalTypes,
      totalStock,
      criticalCount: criticalList.length,
      trackedList,
      hasComponents: totalTypes > 0
    };
  }, [equipmentList]);

  const handleCardClick = (type) => {
    let title = '';
    let data = [];
    let columns = [
      { accessorKey: 'code', header: 'Mã', sortable: true, width: '15%' },
      { accessorKey: 'name', header: 'Tên', sortable: true, width: '40%' },
      { accessorKey: 'category', header: 'Danh mục', sortable: true, width: '30%' },
    ];

    if (type === 'devices') {
      title = 'Danh sách Thiết bị';
      data = equipmentList.filter(eq => {
        return !(eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư')));
      });
      columns.push({ accessorKey: 'totalQty', header: 'Tổng số lượng', sortable: true, align: 'center', width: '15%' });
    } else if (type === 'components') {
      title = 'Danh sách Linh kiện';
      data = equipmentList.filter(eq => {
        return eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
      });
      columns.push({ accessorKey: 'totalQty', header: 'Tổng số lượng', sortable: true, align: 'center', width: '15%' });
    } else if (type === 'borrowed') {
      title = 'Thiết bị đang được mượn';
      data = equipmentList.filter(eq => eq.borrowedQty > 0);
      columns.push({ accessorKey: 'borrowedQty', header: 'Số lượng đang mượn', sortable: true, align: 'center', width: '15%' });
    } else if (type === 'maintenance') {
      title = 'Thiết bị cần bảo trì';
      // Lấy danh sách thiết bị đang có phiếu báo hỏng / bảo trì chưa hoàn thành
      data = maintenanceList.filter(m => m.status === 'Đang sửa' || m.status === 'Bảo hành hãng' || m.status === 'Chờ linh kiện' || m.status === 'Đã hỏng (Chờ thanh lý)');
      columns = [
        {
          accessorKey: 'equipmentCode',
          header: 'Mã thiết bị',
          sortable: true,
          width: '18%',
          cell: (row) => {
            const code = row.equipmentCode || (row.equipmentId ? row.equipmentId.substring(0, 8) : 'N/A');
            return (
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#a78bfa' }}>
                {code}
              </span>
            );
          }
        },
        {
          accessorKey: 'equipmentName',
          header: 'Tên thiết bị',
          sortable: true,
          width: '28%',
          cell: (row) => (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                {row.equipmentName || 'Thiết bị không xác định'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.category || 'Thiết bị Lab'} • {row.location || 'Kho Lab'}
              </span>
            </div>
          )
        },
        {
          accessorKey: 'issueDescription',
          header: 'Mô tả sự cố',
          sortable: true,
          width: '26%',
          cell: (row) => (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} title={row.issueDescription}>
              {row.issueDescription || '-'}
            </span>
          )
        },
        {
          accessorKey: 'status',
          header: 'Trạng thái',
          sortable: true,
          width: '14%',
          cell: (row) => {
            const isResolved = row.status === 'Đã sửa';
            return (
              <span className={`badge ${isResolved ? 'badge-success' : 'badge-warning'}`} style={{ whiteSpace: 'nowrap' }}>
                {row.status}
              </span>
            );
          }
        },
        {
          accessorKey: 'cost',
          header: 'Chi phí dự kiến',
          sortable: true,
          align: 'right',
          width: '14%',
          cell: (row) => (
            <span style={{ fontWeight: row.cost ? 600 : 400, color: row.cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {row.cost ? `${Number(row.cost).toLocaleString('vi-VN')} đ` : '0 đ'}
            </span>
          )
        }
      ];
    }

    setModalCategoryFilter('all');
    setExpandedRowId(null);
    setModalConfig({ isOpen: true, type, title, data, columns });
  };

  const modalUniqueCategories = useMemo(() => {
    if (!modalConfig.isOpen || modalConfig.type === 'maintenance') return [];
    const cats = new Set(modalConfig.data.map(item => item.category).filter(Boolean));
    return Array.from(cats);
  }, [modalConfig.data, modalConfig.isOpen, modalConfig.type]);

  const filteredModalData = useMemo(() => {
    if (modalCategoryFilter === 'all') return modalConfig.data;
    return modalConfig.data.filter(item => item.category === modalCategoryFilter);
  }, [modalConfig.data, modalCategoryFilter]);

  const modalToolbarActions = modalConfig.type !== 'maintenance' ? (
    <Select
      options={[
        { value: 'all', label: 'Tất cả danh mục' },
        ...modalUniqueCategories.map(cat => ({ value: cat, label: cat }))
      ]}
      value={modalCategoryFilter}
      onChange={(val) => setModalCategoryFilter(val)}
      width="280px"
    />
  ) : null;

  const renderExpandedRow = (row) => {
    if (modalConfig.type !== 'borrowed') return null;

    // Tìm các phiếu mượn tương ứng với thiết bị này (đang mượn hoặc đã bàn giao)
    const activeBorrows = borrowTickets.filter(t => t.equipmentId === row.id && (t.status === 'Đang mượn' || t.status === 'Đã bàn giao' || t.status === 'Đã đặt trước'));

    if (activeBorrows.length === 0) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-overlay)' }}>
          Không tìm thấy thông tin mượn chi tiết cho thiết bị này.
        </div>
      );
    }

    return (
      <div style={{ padding: '1.25rem', background: 'var(--bg-overlay)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Chi tiết người mượn:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeBorrows.map((t, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {t.borrowerName ? t.borrowerName.charAt(0) : '?'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{t.borrowerName || 'Không rõ'} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'normal' }}>({t.mssv})</span></span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mượn <strong style={{ color: 'var(--text-primary)' }}>{t.qty}</strong> chiếc • Lúc {new Date(t.borrowDate).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <span className={`badge ${t.status === 'Đang mượn' ? 'badge-blue' : t.status === 'Đã đặt trước' ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: '0.75rem' }}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <h2 className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <PieChartIcon className="text-blue-500" size={20} />
          Tổng quan Tài sản
        </h2>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Bảng điều khiển trung tâm phân tích số lượng, cơ cấu và trạng thái hao mòn tài sản phòng Lab
        </p>
      </div>

      {isLoading ? (
        <SkeletonLoader type="dashboard" count={4} />
      ) : (
        <>
          {/* KPI System Status Summary */}
          <div className="glass-card kpi-status-summary">
            {/* Left section: Inventory Totals (Neutral) */}
            <div className="kpi-group-static">
              {/* KPI 1: Tổng Thiết bị */}
              <div className="kpi-item-neutral" onClick={() => handleCardClick('devices')}>
                <span className="kpi-status-dot dot-neutral"></span>
                <div>
                  <div className="kpi-label">Tổng Thiết bị</div>
                  <div className="kpi-value">
                    {stats.totalDevices} <span className="kpi-unit">loại</span>
                  </div>
                </div>
              </div>

              {/* KPI 2: Tổng Linh kiện */}
              <div className="kpi-item-neutral" onClick={() => handleCardClick('components')}>
                <span className="kpi-status-dot dot-neutral"></span>
                <div>
                  <div className="kpi-label">Tổng Linh kiện</div>
                  <div className="kpi-value">
                    {stats.totalComponents} <span className="kpi-unit">loại</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right section: Active Operational Status (Accented Alerts) */}
            <div className="kpi-group-active">
              {/* KPI 3: Đang được mượn */}
              <div
                className="kpi-item-active active-borrowed"
                onClick={() => onNavigate ? onNavigate('equipment-borrows') : handleCardClick('borrowed')}
                style={{ cursor: 'pointer' }}
                title="Xem danh sách phiếu mượn thiết bị"
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="kpi-label" style={{ color: 'var(--accent-purple)' }}>Đang được mượn</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-purple)' }}>
                    {stats.totalBorrowed} <span className="kpi-unit" style={{ color: 'rgba(139, 92, 246, 0.7)' }}>chiếc</span>
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-purple)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
                    Xem phiếu mượn <ArrowRight size={12} />
                  </div>
                </div>
              </div>

              {/* KPI 4: Cần bảo trì */}
              <div
                className={`kpi-item-active ${stats.brokenDevices > 0 ? 'active-alert-danger' : 'active-alert-warning'}`}
                onClick={() => onNavigate ? onNavigate('equipment-maintenance') : handleCardClick('maintenance')}
                style={{ cursor: 'pointer' }}
                title="Xem chi tiết các thiết bị cần bảo trì"
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="kpi-label" style={{ color: stats.brokenDevices > 0 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>Cần bảo trì</div>
                  <div className="kpi-value" style={{ color: stats.brokenDevices > 0 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                    {stats.brokenDevices} <span className="kpi-unit" style={{ color: stats.brokenDevices > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.7)' }}>thiết bị</span>
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: stats.brokenDevices > 0 ? 'var(--accent-red)' : 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
                    Xem chi tiết <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Left Column (65% - Analytics), Right Column (35% - Operations) */}
          <div className="dashboard-grid">

            {/* LEFT COLUMN: Analytics Hub */}
            <div className="analytics-column">

              {/* Biểu đồ Tròn: Tình trạng thiết bị */}
              <div className="glass-card chart-card">
                <h3 className="chart-header">
                  <Activity size={18} className="text-blue-400" />
                  Tình trạng Thiết bị thực tế
                </h3>
                <div className="device-status-content">
                  {/* Left: Donut Chart with inner percentage of the main state (Sẵn sàng) */}
                  <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0, margin: '0 auto' }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-green)', lineHeight: 1 }}>
                        {(() => {
                          const readyItem = statusData.find(d => d.name === 'Sẵn sàng') || { value: 0 };
                          const total = statusData.reduce((sum, d) => sum + d.value, 0);
                          return total > 0 ? Math.round((readyItem.value / total) * 100) : 0;
                        })()}%
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Sẵn sàng
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Right: Detailed Proportional Breakdown List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {statusData.map((item, index) => {
                        const total = statusData.reduce((sum, d) => sum + d.value, 0);
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        const color = COLORS[index % COLORS.length];
                        return (
                          <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></span>
                              <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{item.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                              <span style={{ color: 'var(--text-primary)', width: '40px', textAlign: 'right' }}>{item.value}</span>
                              <span style={{ color: 'var(--text-muted)', width: '45px', textAlign: 'right' }}>{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Tổng cộng thiết bị</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                        {statusData.reduce((sum, d) => sum + d.value, 0)} chiếc
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biểu đồ Cột: Thiết bị theo Danh mục (Nằm ngang) */}
              <div className="glass-card chart-card">
                <h3 className="chart-header">
                  <Box size={18} className="text-purple-400" />
                  Phân bổ Thiết bị theo Danh mục
                </h3>
                <div className="chart-container" style={{ height: showAllCategories ? '550px' : '320px', display: 'flex', flexDirection: 'column', transition: 'height 0.2s ease-in-out' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={displayedCategoryData}
                        layout="vertical"
                        margin={{ top: 10, right: 35, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                        <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="var(--text-secondary)"
                          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                          width={yAxisWidth}
                          interval={0}
                          tickFormatter={formatYAxisTick}
                        />
                        <RechartsTooltip cursor={false} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="Số lượng" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} barSize={16}>
                          <LabelList dataKey="Số lượng" position="right" fill="var(--text-secondary)" fontSize={10} fontWeight="600" offset={8} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {categoryData.length > 6 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.target.style.background = 'rgba(59, 130, 246, 0.08)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        {showAllCategories ? 'Thu gọn danh mục' : `Xem tất cả danh mục (${categoryData.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Operational Insights & Supply Control */}
            <div className="operations-column">

              {/* KHỐI 1: Tần suất Sử dụng & Hoạt động Thiết bị */}
              <div className="glass-card alert-card">
                <h3 className="alert-header" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} />
                  Hoạt động & Tần suất Sử dụng Thiết bị
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* 2 Chỉ số KPI chính */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '0.85rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-blue)', lineHeight: 1 }}>
                        {usageInsights.totalBorrowsCount} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>lượt</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Tổng lượt mượn phát sinh
                      </div>
                    </div>
                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', padding: '0.85rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-purple)', lineHeight: 1 }}>
                        {stats.totalBorrowed} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>chiếc</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Đang mượn / Vận hành ({usageInsights.utilizationRate}%)
                      </div>
                    </div>
                  </div>

                  {/* Danh sách thiết bị được mượn nhiều nhất */}
                  {usageInsights.hasBorrowHistory ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Thiết bị mượn nhiều nhất:
                      </div>
                      {usageInsights.topBorrowed.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }} title={item.name}>
                              {item.name}
                            </span>
                            <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>
                              {item.count} lượt
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.percent}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-in-out'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(16, 185, 129, 0.03)',
                      border: '1px solid rgba(16, 185, 129, 0.12)',
                      borderRadius: '8px'
                    }}>
                      <ShieldCheck size={18} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Tất cả thiết bị sẵn sàng trong kho, chưa phát sinh phiên mượn mới.
                      </div>
                    </div>
                  )}

                  {/* Nút bấm liên kết điều hướng */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('analytics-usage') : null}
                      style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: 'var(--accent-blue)',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s',
                        flex: 1
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'}
                    >
                      Phân tích sử dụng <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('equipment-borrows') : handleCardClick('borrowed')}
                      style={{
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        color: 'var(--accent-purple)',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s',
                        flex: 1
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'}
                    >
                      Phiếu mượn <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: Tồn kho & Giám sát Linh kiện Tiêu hao */}
              <div className="glass-card alert-card">
                <h3 className="alert-header" style={{ color: componentsInsights.criticalCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} />
                  Tồn kho & Giám sát Linh kiện Tiêu hao
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* 2 Chỉ số KPI chính */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.85rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-green)', lineHeight: 1 }}>
                        {componentsInsights.totalStock} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>cái</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {componentsInsights.totalTypes} loại linh kiện trong kho
                      </div>
                    </div>
                    <div style={{
                      background: componentsInsights.criticalCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                      border: `1px solid ${componentsInsights.criticalCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      padding: '0.85rem',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: componentsInsights.criticalCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)', lineHeight: 1 }}>
                        {componentsInsights.criticalCount > 0 ? `${componentsInsights.criticalCount} loại` : '100%'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {componentsInsights.criticalCount > 0 ? 'Chạm ngưỡng tối thiểu' : 'Mức tồn kho an toàn'}
                      </div>
                    </div>
                  </div>

                  {/* Danh sách linh kiện cần giám sát tồn kho */}
                  {componentsInsights.trackedList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Mức tồn kho linh kiện tiêu biểu:
                      </div>
                      {componentsInsights.trackedList.map(comp => (
                        <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }} title={comp.name}>
                              {comp.name}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: comp.isCritical ? 'var(--accent-red)' : 'var(--text-secondary)', fontWeight: comp.isCritical ? 'bold' : '500', fontVariantNumeric: 'tabular-nums' }}>
                              Tồn: <strong style={{ color: comp.isCritical ? 'var(--accent-red)' : 'var(--text-primary)' }}>{comp.current}</strong> / {comp.threshold} {comp.unit || 'cái'}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${comp.ratioPercent}%`,
                              height: '100%',
                              background: comp.isCritical ? 'var(--accent-red)' : comp.ratioPercent < 60 ? 'var(--accent-amber)' : 'var(--accent-green)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-in-out'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nút bấm liên kết điều hướng */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('equipment-components') : handleCardClick('components')}
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: 'var(--accent-green)',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s',
                        width: '100%'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
                    >
                      Quản lý kho linh kiện & Nhập xuất <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal hiển thị chi tiết (Floating Card Modal) */}
      {modalConfig.isOpen && (
        <div className="modal-overlay fade-in" style={{ zIndex: 1000, padding: '2vh 2vw', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            width: '100%',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <div className="modal-header" style={{ padding: '1.25rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '50%', color: 'var(--accent-blue)', display: 'flex' }}>
                  {modalConfig.type === 'devices' && <Box size={24} className="text-blue-500" />}
                  {modalConfig.type === 'components' && <Cpu size={24} className="text-emerald-500" />}
                  {modalConfig.type === 'borrowed' && <Activity size={24} className="text-purple-500" />}
                  {modalConfig.type === 'maintenance' && <AlertTriangle size={24} className="text-red-500" />}
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{modalConfig.title}</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {modalConfig.type === 'maintenance' && onNavigate && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Wrench}
                    iconPosition="left"
                    onClick={() => {
                      setModalConfig({ ...modalConfig, isOpen: false });
                      onNavigate('equipment-maintenance');
                    }}
                    style={{ height: '36px' }}
                  >
                    Đến trang Bảo trì & Sửa chữa
                  </Button>
                )}
                <Button
                  variant="ghost"
                  icon={X}
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
                />
              </div>
            </div>
            <div className="modal-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, background: 'var(--bg-primary)' }}>
              <div style={{ padding: '1.25rem 2rem', overflowY: 'auto' }}>
                <DataTable
                  data={filteredModalData}
                  columns={modalConfig.columns}
                  searchKeys={modalConfig.type === 'maintenance' ? ['equipmentCode', 'equipmentName', 'issueDescription', 'status'] : ['name', 'code', 'category']}
                  toolbarActions={modalToolbarActions}
                  expandedRowId={expandedRowId}
                  onExpandedRowChange={setExpandedRowId}
                  renderExpandedRow={renderExpandedRow}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
        .dot-neutral {
          background-color: var(--text-muted);
        }

        .kpi-item-active {
          display: flex;
          align-items: center;
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          min-width: 140px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s;
        }
        .kpi-item-active:hover {
          transform: translateY(-1px);
        }

        .active-borrowed {
          background: rgba(139, 92, 246, 0.06);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }
        .active-alert-danger {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .active-alert-warning {
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .kpi-label {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .kpi-value {
          margin: 0.1rem 0 0 0;
          font-size: 1.55rem;
          font-weight: 700;
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

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
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

        .chart-card, .alert-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .chart-header, .alert-header {
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
        .chart-container {
          width: 100%;
          height: 300px;
        }
        .device-status-content {
          display: flex;
          align-items: center;
          gap: 2rem;
          width: 100%;
        }
        @media (max-width: 768px) {
          .device-status-content {
            flex-direction: column;
            gap: 1.5rem;
          }
        }

        .compact-alert-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.25rem;
        }
        .compact-alert-table th {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem 0.6rem;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
        }
        .compact-alert-table td {
          font-size: 0.8rem;
          padding: 0.65rem 0.6rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          color: var(--text-secondary);
          vertical-align: middle;
        }
        .compact-alert-table tr:last-child td {
          border-bottom: none;
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

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1024px) {
          .kpi-status-summary {
            flex-direction: column;
            align-items: stretch;
            gap: 1.25rem;
          }
          .kpi-group-static {
            gap: 1.5rem;
            justify-content: space-between;
          }
          .kpi-group-active {
            gap: 1rem;
            justify-content: space-between;
          }
          .kpi-item-active {
            flex: 1;
            min-width: 0;
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
