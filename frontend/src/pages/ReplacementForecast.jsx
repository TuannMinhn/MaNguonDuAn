import React, { useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CalendarClock, 
  ArrowRight,
  Info,
  CheckCircle,
  TrendingDown,
  Gauge,
  Calendar
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import DataTable from '../components/DataTable';
import Button from '../components/Button';

export default function ReplacementForecast() {
  const { data: equipmentList = [] } = useSWR(`${API_BASE_URL}/analytics/equipment`, fetcher);

  // Lọc và tính toán tuổi thọ
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
        } else if (percentage >= 75) {
          riskLevel = 'Cảnh báo';
          riskColor = 'var(--accent-amber)';
          badgeClass = 'badge-warning';
        }

        return { ...eq, percentage, remainingHours, riskLevel, riskColor, badgeClass };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [equipmentList]);

  const highRiskCount = forecastData.filter(d => d.percentage >= 90).length;
  const warningCount = forecastData.filter(d => d.percentage >= 75 && d.percentage < 90).length;
  const healthyCount = forecastData.filter(d => d.percentage < 75).length;
  const avgDepreciation = forecastData.length
    ? Math.round(forecastData.reduce((sum, d) => sum + d.percentage, 0) / forecastData.length)
    : 0;

  const forecastColumns = React.useMemo(() => [
    { accessorKey: 'name', header: 'Thiết bị', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{row.code}</div>
      </div>
    )},
    { accessorKey: 'percentage', header: 'Tình trạng khấu hao', sortable: true, cell: (row) => (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
          <span>Đã dùng: <strong style={{ color: 'var(--text-primary)' }}>{row.usedHours.toLocaleString()}h</strong></span>
          <span>Tuổi thọ: <strong style={{ color: 'var(--text-primary)' }}>{row.lifespanHours.toLocaleString()}h</strong></span>
        </div>
        <div style={{
          width: '100%', height: '8px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '4px', overflow: 'hidden'
        }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${row.percentage}%`, 
              background: `linear-gradient(90deg, ${row.riskColor}, ${row.riskColor}dd)`,
              borderRadius: '4px',
              transition: 'width 1s ease-in-out'
            }}
          ></div>
        </div>
        <div style={{ fontSize: '0.8rem', color: row.riskColor, marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
          {row.percentage}%
        </div>
      </div>
    )},
    { accessorKey: 'remainingHours', header: 'Còn lại', sortable: true, align: 'center', cell: (row) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          {row.remainingHours.toLocaleString()}h
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>còn lại</span>
      </div>
    )},
    { accessorKey: 'riskLevel', header: 'Đánh giá', sortable: true, align: 'center', cell: (row) => (
      <span className={`badge ${row.badgeClass}`}>
        {row.riskLevel}
      </span>
    )},
    { accessorKey: 'actions', header: 'Thao tác', sortable: false, align: 'right', cell: () => (
      <Button
        size="sm"
        variant="secondary"
        icon={ArrowRight}
        iconPosition="right"
      >
        Đề xuất mua
      </Button>
    )}
  ], []);

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div>
        <h2 className="page-header">
          <CalendarClock className="text-amber-500" size={20} />
          Dự báo Thay thế & Khấu hao
        </h2>
        <p className="page-subtitle" style={{ marginTop: '0.35rem' }}>Theo dõi tuổi thọ phần cứng và lập kế hoạch ngân sách mua mới</p>
      </div>

      {/* KPI Cards - 4 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Nguy kịch */}
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.25rem', borderLeft: '4px solid var(--accent-red)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', padding: '0.75rem',
            borderRadius: '50%', color: 'var(--accent-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-label">Cần thay thế gấp</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-red)' }}>
              {highRiskCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>

        {/* Cảnh báo */}
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.25rem', borderLeft: '4px solid var(--accent-amber)'
        }}>
          <div style={{
            background: 'rgba(251, 191, 36, 0.15)', padding: '0.75rem',
            borderRadius: '50%', color: 'var(--accent-amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-label">Lên kế hoạch thay</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-amber)' }}>
              {warningCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>

        {/* Còn tốt */}
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.25rem', borderLeft: '4px solid var(--accent-green)'
        }}>
          <div style={{
            background: 'rgba(52, 211, 153, 0.15)', padding: '0.75rem',
            borderRadius: '50%', color: 'var(--accent-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-label">Tình trạng tốt</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem', color: 'var(--accent-green)' }}>
              {healthyCount} <span className="stat-unit">thiết bị</span>
            </h2>
          </div>
        </div>

        {/* Trung bình khấu hao */}
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1.25rem', borderLeft: '4px solid var(--accent-blue)'
        }}>
          <div style={{
            background: 'rgba(96, 165, 250, 0.15)', padding: '0.75rem',
            borderRadius: '50%', color: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Gauge size={24} />
          </div>
          <div>
            <p className="text-label">TB khấu hao</p>
            <h2 className="stat-value" style={{ marginTop: '0.25rem' }}>
              {avgDepreciation}% <span className="stat-unit">trung bình</span>
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
        <p className="text-muted" style={{ margin: 0 }}>
          Chỉ số khấu hao được tính dựa trên số giờ hoạt động thực tế (Used Hours) so với tuổi thọ lý thuyết của nhà sản xuất (Lifespan Hours).
        </p>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h2 className="section-heading">
            <Calendar size={20} style={{ color: 'var(--accent-blue)' }} />
            Danh sách thiết bị cảnh báo ({forecastData.length})
          </h2>
        </div>
        
        <DataTable
          data={forecastData}
          columns={forecastColumns}
          searchKeys={['name', 'code']}
        />
      </div>
    </div>
  );
}
