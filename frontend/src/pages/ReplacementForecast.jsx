import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CalendarClock, 
  ArrowRight,
  Info,
  CheckCircle,
  Gauge,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Card from '../components/Card';
import Select from '../components/Select';

export default function ReplacementForecast() {
  const { data: equipmentList = [] } = useSWR(`${API_BASE_URL}/analytics/equipment`, fetcher);
  const { data: borrowTickets = [] } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: systemSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);

  // Bộ lọc thời gian
  const [period, setPeriod] = useState('1month');

  const periodOptions = [
    { value: '1month', label: '1 Tháng qua' },
    { value: '3months', label: '3 Tháng qua' },
    { value: '6months', label: '6 Tháng qua' },
    { value: '12months', label: '12 Tháng qua (1 Năm)' },
    { value: 'all', label: 'Tất cả thời gian' }
  ];

  // Tính số ngày cutoff cho bộ lọc thời gian
  const periodDays = useMemo(() => {
    if (period === '1month') return 30;
    if (period === '3months') return 90;
    if (period === '6months') return 180;
    if (period === '12months') return 365;
    return null; // all
  }, [period]);

  // Thống kê lịch sử mượn và giờ hoạt động trong kỳ đã chọn
  const recentBorrowsByEquip = useMemo(() => {
    const map = {};
    const now = new Date();
    const cutoff = periodDays ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000) : null;

    borrowTickets.forEach(b => {
      if (b.status === 'Đã hủy' || b.status === 'cancelled' || b.status === 'Hủy') return;
      const equipId = b.equipmentId;
      if (!equipId) return;

      if (cutoff && b.borrowDate) {
        const bDate = new Date(b.borrowDate);
        if (bDate < cutoff) return;
      }

      if (!map[equipId]) {
        map[equipId] = { count: 0, duration: 0 };
      }
      map[equipId].count += 1;
      map[equipId].duration += (Number(b.duration) || 0);
    });

    return map;
  }, [borrowTickets, periodDays]);

  // Ngưỡng cảnh báo khấu hao từ cài đặt hệ thống (mặc định 20% thời lượng còn lại -> 80% khấu hao)
  const warningPercent = Number(systemSettings?.maintenanceWarningPercent) || 20;
  const warningThreshold = Math.max(50, 100 - warningPercent);

  // Lọc và tính toán tuổi thọ, khấu hao
  const forecastData = useMemo(() => {
    return equipmentList
      .filter(eq => eq.lifespanHours && eq.usedHours !== undefined && !eq.assetType?.includes('Linh kiện'))
      .map(eq => {
        const percentage = Math.min(100, Math.round((eq.usedHours / eq.lifespanHours) * 100));
        const remainingHours = Math.max(0, eq.lifespanHours - eq.usedHours);
        let riskLevel = 'Tốt';
        let riskColor = 'var(--accent-green)';
        let badgeClass = 'badge-success';

        if (percentage >= 90) {
          riskLevel = 'Nguy kịch';
          riskColor = 'var(--accent-red)';
          badgeClass = 'badge-danger';
        } else if (percentage >= warningThreshold) {
          riskLevel = 'Cảnh báo';
          riskColor = 'var(--accent-amber)';
          badgeClass = 'badge-warning';
        }

        const recent = recentBorrowsByEquip[eq.id] || recentBorrowsByEquip[eq.equipmentId] || { count: 0, duration: 0 };

        return { 
          ...eq, 
          percentage, 
          remainingHours, 
          riskLevel, 
          riskColor, 
          badgeClass,
          recentBorrowsCount: recent.count,
          recentUsedHours: Math.round(recent.duration)
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [equipmentList, warningThreshold, recentBorrowsByEquip]);

  const highRiskCount = forecastData.filter(d => d.percentage >= 90).length;
  const warningCount = forecastData.filter(d => d.percentage >= warningThreshold && d.percentage < 90).length;
  const healthyCount = forecastData.filter(d => d.percentage < warningThreshold).length;
  const avgDepreciation = forecastData.length
    ? Math.round(forecastData.reduce((sum, d) => sum + d.percentage, 0) / forecastData.length)
    : 0;

  const forecastColumns = React.useMemo(() => [
    { 
      accessorKey: 'name', 
      header: 'Thiết bị', 
      sortable: true, 
      cell: (row) => (
        <div style={{ minWidth: '160px' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{row.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.code}</span>
            {row.category && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                {row.category}
              </span>
            )}
          </div>
        </div>
      )
    },
    { 
      accessorKey: 'percentage', 
      header: '% Khấu hao', 
      sortable: true, 
      align: 'center',
      cell: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '700', color: row.riskColor, fontVariantNumeric: 'tabular-nums' }}>
            {row.percentage}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>đã dùng</span>
        </div>
      )
    },
    { 
      accessorKey: 'usedHours', 
      header: 'Vòng đời & Tuổi thọ định mức', 
      sortable: true, 
      cell: (row) => (
        <div style={{ minWidth: '220px', maxWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>
            <span>Đã dùng: <strong style={{ color: 'var(--text-primary)' }}>{row.usedHours.toLocaleString()}h</strong> / {row.lifespanHours.toLocaleString()}h</span>
            <span style={{ color: row.remainingHours === 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              Còn lại: <strong style={{ color: row.remainingHours === 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{row.remainingHours.toLocaleString()}h</strong>
            </span>
          </div>
          <div style={{
            width: '100%', height: '7px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '4px', overflow: 'hidden'
          }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${row.percentage}%`, 
                background: row.riskColor,
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )
    },
    { 
      accessorKey: 'recentBorrowsCount', 
      header: 'Hoạt động (Kỳ này)', 
      sortable: true, 
      align: 'center',
      cell: (row) => (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div><strong style={{ color: 'var(--text-primary)' }}>{row.recentBorrowsCount}</strong> lượt mượn</div>
          {row.recentUsedHours > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', marginTop: '2px' }}>
              +{row.recentUsedHours}h dùng
            </div>
          )}
        </div>
      )
    },
    { 
      accessorKey: 'riskLevel', 
      header: 'Đánh giá rủi ro', 
      sortable: true, 
      align: 'center', 
      cell: (row) => (
        <span className={`badge ${row.badgeClass}`}>
          {row.riskLevel}
        </span>
      )
    },
    { 
      accessorKey: 'actions', 
      header: 'Thao tác', 
      sortable: false, 
      align: 'right', 
      cell: (row) => (
        <Button
          size="sm"
          variant={row.riskLevel === 'Nguy kịch' ? 'danger' : 'secondary'}
          icon={ArrowRight}
          iconPosition="right"
        >
          Đề xuất mua
        </Button>
      )
    }
  ], []);

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-header">
            <CalendarClock className="text-amber-500" size={20} />
            Phân tích & Khấu hao Thiết bị
          </h2>
          <p className="page-subtitle">Theo dõi tuổi thọ phần cứng, mức độ hao mòn và lập kế hoạch ngân sách mua mới</p>
        </div>

        {/* Filter thời gian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '4.5rem' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Kỳ theo dõi:
          </span>
          <Select
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            width="200px"
          />
        </div>
      </div>

      {/* KPI Cards - 4 columns */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Nguy kịch */}
        <div className="glass-card stat-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: 'var(--space-lg)', borderLeft: '4px solid var(--accent-red)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', color: 'var(--accent-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="stat-label">Cần thay thế gấp</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-red)', fontVariantNumeric: 'tabular-nums' }}>
              {highRiskCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>

        {/* Cảnh báo */}
        <div className="glass-card stat-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: 'var(--space-lg)', borderLeft: '4px solid var(--accent-amber)'
        }}>
          <div style={{
            background: 'rgba(251, 191, 36, 0.15)', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', color: 'var(--accent-amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="stat-label">Lên kế hoạch thay</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-amber)', fontVariantNumeric: 'tabular-nums' }}>
              {warningCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>

        {/* Còn tốt */}
        <div className="glass-card stat-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: 'var(--space-lg)', borderLeft: '4px solid var(--accent-green)'
        }}>
          <div style={{
            background: 'rgba(52, 211, 153, 0.15)', padding: '0.75rem',
            borderRadius: 'var(--radius-md)', color: 'var(--accent-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="stat-label">Tình trạng tốt</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>
              {healthyCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass-card" style={{
        padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
        background: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <p className="text-muted" style={{ margin: 0, fontSize: '0.825rem' }}>
          Chỉ số khấu hao được tính dựa trên tổng số giờ hoạt động thực tế (Used Hours) so với tuổi thọ định mức của nhà sản xuất (Lifespan Hours). Ngưỡng cảnh báo kích hoạt khi thời lượng còn lại dưới <strong>{warningPercent}%</strong>.
        </p>
      </div>

      {/* Table Card */}
      <Card
        title={`Danh sách thiết bị theo dõi khấu hao (${forecastData.length})`}
        icon={Calendar}
        style={{ color: 'var(--accent-amber)' }}
      >
        <DataTable
          data={forecastData}
          columns={forecastColumns}
          searchKeys={['name', 'code', 'category']}
          searchPlaceholder="Tìm theo tên thiết bị hoặc mã thiết bị..."
        />
      </Card>
    </div>
  );
}

