import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  PieChart as PieChartIcon, 
  Box, 
  Cpu, 
  Activity, 
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  FileText,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import SkeletonLoader from '../components/SkeletonLoader';
import DataTable from '../components/DataTable';
import Select from '../components/Select';
import Button from '../components/Button';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AssetOverview() {
  const { data: equipmentList = [], isLoading: isLoadingEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: maintenanceList = [], isLoading: isLoadingMaint } = useSWR(`${API_BASE_URL}/maintenance`, fetcher);
  const { data: borrowTickets = [], isLoading: isLoadingBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const isLoading = isLoadingEquip || isLoadingMaint || isLoadingBorrows;

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, title: '', data: [], columns: [] });
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState(null);

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

  // Danh sách cảnh báo hao mòn / hết khấu hao
  const highUsageEquipment = useMemo(() => {
    return equipmentList
      .filter(eq => eq.assetType !== 'Linh kiện tiêu hao' && eq.lifespanHours && eq.usedHours)
      .map(eq => {
        const percent = Math.min(100, Math.round((eq.usedHours / eq.lifespanHours) * 100));
        return { ...eq, usagePercent: percent };
      })
      .sort((a, b) => b.usagePercent - a.usagePercent)
      .slice(0, 5);
  }, [equipmentList]);

  // Danh sách linh kiện dưới ngưỡng tối thiểu
  const lowStockComponents = useMemo(() => {
    return equipmentList
      .filter(eq => eq.assetType === 'Linh kiện tiêu hao' && eq.totalQty <= (eq.minThreshold || 5))
      .sort((a, b) => a.totalQty - b.totalQty)
      .slice(0, 5);
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
      data = maintenanceList.filter(m => m.status === 'Đang sửa' || m.status === 'Bảo hành hãng');
      columns = [
        { accessorKey: 'equipmentId', header: 'Mã thiết bị', sortable: true, width: '20%' },
        { accessorKey: 'type', header: 'Loại bảo trì', sortable: true, width: '30%' },
        { accessorKey: 'status', header: 'Trạng thái', sortable: true, width: '25%' },
        { accessorKey: 'cost', header: 'Chi phí dự kiến', sortable: true, width: '25%' }
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
        <h2 className="page-header">
          <PieChartIcon className="text-blue-500" size={20} />
          Tổng quan Tài sản
        </h2>
        <p className="page-subtitle">
          Bảng điều khiển trung tâm phân tích số lượng, cơ cấu và trạng thái hao mòn tài sản phòng Lab
        </p>
      </div>

      {isLoading ? (
        <SkeletonLoader type="dashboard" count={4} />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div style={{
            display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* KPI 1: Tổng thiết bị */}
        <div 
          className="glass-card" 
          onClick={() => handleCardClick('devices')}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-blue)', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
        >
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={24} />
          </div>
          <div>
            <p className="text-label">Thiết Bị</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{stats.totalDevices} <span className="stat-unit">loại</span></h2>
          </div>
        </div>

        {/* KPI 2: Linh kiện tồn kho */}
        <div 
          className="glass-card" 
          onClick={() => handleCardClick('components')}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-green)', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-label">Linh Kiện</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{stats.totalComponents} <span className="stat-unit">loại</span></h2>
          </div>
        </div>

        {/* KPI 3: Đang cho mượn */}
        <div 
          className="glass-card" 
          onClick={() => handleCardClick('borrowed')}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
        >
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} />
          </div>
          <div>
            <p className="text-label">Đang Được Mượn</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>{stats.totalBorrowed} <span className="stat-unit">chiếc</span></h2>
          </div>
        </div>

        {/* KPI 4: Cần bảo trì */}
        <div 
          className="glass-card" 
          onClick={() => handleCardClick('maintenance')}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderLeft: `4px solid ${stats.brokenDevices > 0 ? 'var(--accent-red)' : 'var(--accent-amber)'}`, cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
        >
          <div style={{ background: stats.brokenDevices > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245, 158, 11, 0.15)', padding: '0.75rem', borderRadius: '50%', color: stats.brokenDevices > 0 ? 'var(--accent-red)' : 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-label">Cần Bảo Trì</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: stats.brokenDevices > 0 ? 'var(--accent-red)' : 'inherit' }}>
              {stats.brokenDevices} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Biểu đồ Tròn: Tình trạng thiết bị */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-blue-400" />
            Tình trạng Thiết bị thực tế
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={95}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                <Legend formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Cột: Thiết bị theo Danh mục */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={18} className="text-purple-400" />
            Phân bổ Thiết bị theo Danh mục
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="Số lượng" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts and Lists Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Cảnh báo khấu hao thiết bị */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-amber)' }}>
            <AlertTriangle size={18} />
            Mức độ sử dụng & Khấu hao thiết bị
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {highUsageEquipment.map(eq => (
              <div key={eq.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: '500' }}>{eq.name}</span>
                  <span style={{ color: eq.usagePercent > 80 ? 'var(--accent-red)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {eq.usagePercent}% ({eq.usedHours}/{eq.lifespanHours}h)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${eq.usagePercent}%`,
                    height: '100%',
                    background: eq.usagePercent > 90 ? 'var(--accent-red)' : eq.usagePercent > 70 ? 'var(--accent-amber)' : 'var(--accent-blue)',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease-in-out'
                  }}></div>
                </div>
              </div>
            ))}
            {highUsageEquipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Không có dữ liệu khấu hao thiết bị</p>
            )}
          </div>
        </div>

        {/* Cảnh báo tồn kho linh kiện */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
            <AlertCircle size={18} />
            Linh kiện sắp hết (Dưới ngưỡng tối thiểu)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lowStockComponents.map(comp => {
              const isOut = comp.totalQty === 0;
              return (
                <div key={comp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem', display: 'block' }}>{comp.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã: {comp.code} · Ngưỡng: {comp.minThreshold || 5}</span>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: isOut ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isOut ? 'var(--accent-red)' : 'var(--accent-amber)',
                    border: `1px solid ${isOut ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                  }}>
                    {isOut ? 'Hết hàng' : `Còn ${comp.totalQty}`}
                  </span>
                </div>
              );
            })}
            {lowStockComponents.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>Tất cả linh kiện đều ở mức an toàn</p>
            )}
          </div>
        </div>
      </div>
      </>
      )}
      {/* Modal hiển thị chi tiết (Toàn màn hình) */}
      {modalConfig.isOpen && (
        <div className="modal-overlay fade-in" style={{ zIndex: 1000, padding: '2vh 2vw' }} onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-header" style={{ padding: '1.5rem 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '50%', color: 'var(--accent-blue)', display: 'flex' }}>
                  {modalConfig.type === 'devices' && <Box size={24} className="text-blue-500" />}
                  {modalConfig.type === 'components' && <Cpu size={24} className="text-emerald-500" />}
                  {modalConfig.type === 'borrowed' && <Activity size={24} className="text-purple-500" />}
                  {modalConfig.type === 'maintenance' && <AlertTriangle size={24} className="text-red-500" />}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{modalConfig.title}</h2>
              </div>
              <Button 
                variant="ghost" 
                icon={X} 
                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }} 
              />
            </div>
            <div className="modal-body" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, padding: 0, background: 'var(--bg-primary)' }}>
              <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                <DataTable
                  data={filteredModalData}
                  columns={modalConfig.columns}
                  searchKeys={modalConfig.type === 'maintenance' ? ['equipmentId', 'type'] : ['name', 'code', 'category']}
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
        .glass-card {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
        }
        .glass-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
