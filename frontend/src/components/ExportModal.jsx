import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Button from './Button';
import { 
  X, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  CheckSquare, 
  LayoutList, 
  Download, 
  ArrowRight, 
  ClipboardCheck, 
  Info, 
  ChevronDown, 
  ChevronUp,
  FileCode
} from 'lucide-react';

const ExportModal = ({
  isOpen,
  onClose,
  type = 'device', // 'device', 'usage', 'maintenance'
  columns = [],
  counts = { all: 0, filtered: 0, selected: 0 },
  onExport,
  previewStats = { numDevices: 0, numBorrows: 0, totalDuration: 0 }
}) => {
  // Common states
  const [scope, setScope] = useState('filtered'); // 'all', 'filtered', 'selected'
  const [format, setFormat] = useState('xlsx'); // 'xlsx', 'csv', 'pdf', 'docx'
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Device-specific states
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({});

  // Usage-specific states
  const [periodPreset, setPeriodPreset] = useState('30days'); // '7days', '30days', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aggregation, setAggregation] = useState('equipment'); // 'equipment', 'user', 'location', 'time'

  // Maintenance-specific states
  const [docType, setDocType] = useState('summary'); // 'summary', 'proposal', 'handover'

  useEffect(() => {
    if (isOpen) {
      // Auto-select scope based on counts
      if (counts.selected > 0) {
        setScope('selected');
      } else if (counts.filtered > 0 && counts.filtered !== counts.all) {
        setScope('filtered');
      } else {
        setScope('all');
      }

      // Initialize selected columns
      const initialCols = {};
      columns.forEach(col => {
        initialCols[col.id] = col.defaultChecked !== false;
      });
      setSelectedColumns(initialCols);

      // Reset states
      setIsExporting(false);
      setShowAdvanced(false);
      setShowCustomFields(false);
      
      if (type === 'usage') {
        setFormat('xlsx');
        setPeriodPreset('30days');
      } else if (type === 'maintenance') {
        setDocType('summary');
        setFormat('xlsx');
      } else {
        setFormat('xlsx');
      }
    }
  // Chỉ dùng isOpen và type làm dependency, tránh object reference của counts/columns reset state mỗi render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Header and Footer sizing constants
  const modalShellStyle = {
    width: '600px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '80vh',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    boxSizing: 'border-box'
  };

  const headerStyle = {
    height: '64px',
    minHeight: '64px',
    padding: '0 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box'
  };

  const footerStyle = {
    height: '68px',
    minHeight: '68px',
    padding: '0 24px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(0,0,0,0.1)'
  };

  const bodyStyle = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  };

  // Toggle single column selection
  const handleToggleColumn = (colId) => {
    setSelectedColumns(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const handleSelectAllColumns = (select) => {
    const newCols = {};
    columns.forEach(col => {
      newCols[col.id] = select;
    });
    setSelectedColumns(newCols);
  };

  // Trigger export callback
  const handleExportClick = async () => {
    setIsExporting(true);

    try {
      const selectedColIds = Object.entries(selectedColumns)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);

      let exportConfig = {
        type,
        scope,
        format,
        selectedColumns: selectedColIds
      };

      if (type === 'usage') {
        let finalStart = startDate;
        let finalEnd = endDate;

        if (periodPreset === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          finalStart = d.toISOString().split('T')[0];
          finalEnd = new Date().toISOString().split('T')[0];
        } else if (periodPreset === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          finalStart = d.toISOString().split('T')[0];
          finalEnd = new Date().toISOString().split('T')[0];
        } else if (periodPreset === 'month') {
          const d = new Date();
          d.setDate(1);
          finalStart = d.toISOString().split('T')[0];
          finalEnd = new Date().toISOString().split('T')[0];
        }

        exportConfig = {
          ...exportConfig,
          periodPreset,
          startDate: finalStart,
          endDate: finalEnd,
          aggregation
        };
      } else if (type === 'maintenance') {
        exportConfig = {
          ...exportConfig,
          docType
        };
      }

      await onExport(exportConfig);
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      alert("Đã xảy ra lỗi trong quá trình xuất báo cáo.");
    } finally {
      setIsExporting(false);
    }
  };

  // Header Title and Subtitle based on Context
  const getHeaderDetails = () => {
    switch (type) {
      case 'usage':
        return {
          title: 'Xuất báo cáo sử dụng',
          subtitle: 'Phân tích hiệu suất sử dụng thiết bị phòng Lab'
        };
      case 'maintenance':
        return {
          title: 'Xuất tài liệu bảo trì & sửa chữa',
          subtitle: 'Tải biểu mẫu, hồ sơ bảo dưỡng thiết bị kỹ thuật'
        };
      case 'device':
      default:
        return {
          title: 'Xuất báo cáo thiết bị',
          subtitle: 'Tải tệp dữ liệu kiểm kê thiết bị và tài sản Lab'
        };
    }
  };

  const headerDetails = getHeaderDetails();

  const modalContent = (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={modalShellStyle}>
        
        {/* HEADER: 64px */}
        <div className="modal-header" style={headerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {headerDetails.title}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {headerDetails.subtitle}
            </span>
          </div>
          <button 
            type="button"
            className="btn-icon" 
            onClick={onClose} 
            disabled={isExporting}
            style={{ 
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="modal-body" style={bodyStyle}>
          
          {/* CONTEXT: DEVICE EXPORT */}
          {type === 'device' && (
            <>
              {/* PHẠM VI DỮ LIỆU */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  1. Phạm vi dữ liệu
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} style={{ accentColor: 'var(--accent-blue)' }} />
                    <span>Tất cả thiết bị ({counts.all} dòng)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <input type="radio" name="scope" checked={scope === 'filtered'} onChange={() => setScope('filtered')} style={{ accentColor: 'var(--accent-blue)' }} />
                    <span>Thiết bị đang lọc ({counts.filtered} dòng)</span>
                  </label>
                  {counts.selected > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                      <input type="radio" name="scope" checked={scope === 'selected'} onChange={() => setScope('selected')} style={{ accentColor: 'var(--accent-blue)' }} />
                      <span>Thiết bị đã chọn ({counts.selected} dòng)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* TÙY CHỈNH TRƯỜNG DỮ LIỆU */}
              <div style={{ textAlign: 'left' }}>
                <button 
                  type="button"
                  onClick={() => setShowCustomFields(!showCustomFields)}
                  style={{ 
                    width: '100%', outline: 'none', color: 'inherit', fontFamily: 'inherit',
                    padding: '10px 14px', 
                    background: showCustomFields ? 'rgba(59, 130, 246, 0.06)' : 'rgba(255, 255, 255, 0.03)', 
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {showCustomFields ? '⚙️ Tùy chỉnh các trường dữ liệu xuất' : '📋 Báo cáo tiêu chuẩn (Đầy đủ) — Nhấn để tùy chỉnh'}
                  </span>
                  {showCustomFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showCustomFields && (
                  <div style={{ padding: '16px', marginTop: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tích chọn các trường cần xuất:</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => handleSelectAllColumns(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>Chọn tất cả</button>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <button type="button" onClick={() => handleSelectAllColumns(false)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>Bỏ chọn</button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {columns.map(col => (
                        <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox" 
                            checked={!!selectedColumns[col.id]}
                            onChange={() => handleToggleColumn(col.id)}
                            style={{ accentColor: 'var(--accent-blue)' }}
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ĐỊNH DẠNG XUẤT */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  2. Định dạng đầu ra
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setFormat('xlsx')}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      border: format === 'xlsx' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: format === 'xlsx' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <FileSpreadsheet size={28} style={{ color: format === 'xlsx' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>Excel (.xlsx)</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setFormat('csv')}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      border: format === 'csv' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: format === 'csv' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <FileCode size={28} style={{ color: format === 'csv' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>CSV (.csv)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CONTEXT: USAGE REPORT */}
          {type === 'usage' && (
            <>
              {/* KHOẢNG THỜI GIAN */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  1. Khoảng thời gian thống kê
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {[
                    { id: '7days', label: '7 ngày qua' },
                    { id: '30days', label: '30 ngày qua' },
                    { id: 'month', label: 'Tháng này' },
                    { id: 'custom', label: 'Tùy chỉnh' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriodPreset(p.id)}
                      className="btn"
                      style={{
                        flex: 1, padding: '6px 12px', fontSize: '12.5px', borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: periodPreset === p.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                        color: periodPreset === p.id ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {periodPreset === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.12)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Từ ngày</span>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', height: '36px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Đến ngày</span>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', height: '36px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* PHẠM VI & PHƯƠNG THỨC TỔNG HỢP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    2. Phạm vi thiết bị
                  </label>
                  <select value={scope} onChange={e => setScope(e.target.value)} style={{ width: '100%', height: '38px', borderRadius: '6px' }}>
                    <option value="all">Tất cả thiết bị ({counts.all})</option>
                    <option value="filtered">Thiết bị đang lọc ({counts.filtered})</option>
                    {counts.selected > 0 && <option value="selected">Thiết bị đã chọn ({counts.selected})</option>}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    3. Tổng hợp theo
                  </label>
                  <select value={aggregation} onChange={e => setAggregation(e.target.value)} style={{ width: '100%', height: '38px', borderRadius: '6px' }}>
                    <option value="equipment">Mã thiết bị</option>
                    <option value="user">Người sử dụng (MSSV)</option>
                    <option value="location">Phòng / Vị trí</option>
                    <option value="time">Thời gian (Tháng)</option>
                  </select>
                </div>
              </div>

              {/* PREVIEW SUMMARY PANEL */}
              <div style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} /> Thống kê sơ bộ dự kiến
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '13px', marginTop: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Số thiết bị:</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{previewStats.numDevices} chiếc</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Lượt sử dụng:</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{previewStats.numBorrows} lượt</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Thời gian dùng:</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{Math.round(previewStats.totalDuration)} giờ</strong>
                  </div>
                </div>
              </div>

              {/* ĐỊNH DẠNG */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  4. Định dạng đầu ra
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setFormat('xlsx')}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      border: format === 'xlsx' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: format === 'xlsx' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <FileSpreadsheet size={28} style={{ color: format === 'xlsx' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>Bảng tính Excel (.xlsx)</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setFormat('pdf')}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      border: format === 'pdf' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: format === 'pdf' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <FileText size={28} style={{ color: format === 'pdf' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>Tài liệu PDF (.pdf)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CONTEXT: MAINTENANCE EXPORT */}
          {type === 'maintenance' && (
            <>
              {/* SỐ LƯỢNG ĐÃ CHỌN */}
              <div style={{
                textAlign: 'left', padding: '12px 16px', borderRadius: '8px', 
                backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <span style={{ fontSize: '14px', color: 'var(--accent-amber)', fontWeight: '600' }}>
                  Selected scope: Đã chọn {counts.selected} phiếu sửa chữa hoàn tất
                </span>
              </div>

              {/* SELECTABLE CARDS */}
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Chọn loại tài liệu xuất bản
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Card 1: Báo cáo tổng hợp */}
                  <button
                    type="button"
                    onClick={() => { setDocType('summary'); setFormat('xlsx'); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: docType === 'summary' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: docType === 'summary' ? 'rgba(59, 130, 246, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s ease',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)',
                      display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center'
                    }}>
                      <FileSpreadsheet size={22} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Báo cáo tổng hợp bảo trì</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thống kê danh sách thiết bị sửa chữa và tổng hợp chi phí.</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                      Excel (.xlsx)
                    </span>
                  </button>

                  {/* Card 2: Phiếu đề xuất sửa chữa */}
                  <button
                    type="button"
                    onClick={() => { setDocType('proposal'); setFormat('docx'); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: docType === 'proposal' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: docType === 'proposal' ? 'rgba(59, 130, 246, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s ease',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                      display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center'
                    }}>
                      <FileText size={22} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Phiếu đề xuất sửa chữa / thay thế</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tờ trình ban quản lý phê duyệt cấp kinh phí sửa chữa thiết bị.</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                      Word (.docx)
                    </span>
                  </button>

                  {/* Card 3: Biên bản nghiệm thu */}
                  <button
                    type="button"
                    onClick={() => { setDocType('handover'); setFormat('docx'); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: docType === 'handover' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: docType === 'handover' ? 'rgba(59, 130, 246, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s ease',
                      outline: 'none', color: 'inherit', fontFamily: 'inherit'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)',
                      display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center'
                    }}>
                      <ClipboardCheck size={22} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Biên bản nghiệm thu bàn giao</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hồ sơ xác thực thiết bị đã khắc phục lỗi và sẵn sàng hoạt động.</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                      Word (.docx)
                    </span>
                  </button>

                </div>
              </div>
            </>
          )}

          {/* TÙY CHỌN NÂNG CAO (Collapsible cho các setting hiếm dùng) */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', textAlign: 'left' }}>
            <button 
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', 
                color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, outline: 'none' 
              }}
            >
              <span>{showAdvanced ? '▼ Ẩn tùy chọn nâng cao' : '▶ Xem tùy chọn nâng cao'}</span>
            </button>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-blue)' }} />
                  <span>Bao gồm cả các thiết bị ngưng hoạt động (inactive)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--accent-blue)' }} />
                  <span>Nén tệp dữ liệu dạng ZIP trước khi tải về</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-blue)' }} />
                  <span>Sắp xếp dữ liệu theo thời gian giảm dần</span>
                </label>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER: 68px */}
        <div className="modal-footer" style={footerStyle}>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose} 
            disabled={isExporting}
            style={{ width: '80px' }}
          >
            Hủy
          </Button>
          
          <Button 
            type="button" 
            variant="primary" 
            onClick={handleExportClick} 
            loading={isExporting}
            disabled={type === 'device' && showCustomFields && Object.values(selectedColumns).every(v => !v)}
            style={{ minWidth: '140px' }}
            icon={Download}
            iconPosition="left"
          >
            Tải báo cáo
          </Button>
        </div>

      </div>
    </div>
  );

  const container = document.querySelector('.app-container') || document.body;
  return ReactDOM.createPortal(modalContent, container);
};

export default ExportModal;
