import React, { useState, useRef, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './Button';

const ExportButton = ({
  data,
  filteredData,
  onExport,
  filenamePrefix = 'export',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const dropdownRef = useRef(null);

  const hasData = data && data.length > 0;
  const hasFilteredData = filteredData && filteredData.length > 0;
  const isFiltered = hasData && hasFilteredData && data.length !== filteredData.length;

  const isDisabled = disabled || !hasData || status === 'loading';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (type) => {
    setIsOpen(false);
    setStatus('loading');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const dataToExport = type === 'filtered' ? filteredData : data;
      const csvContent = onExport(dataToExport);

      if (!csvContent) throw new Error("No content generated");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

      const filename = `${filenamePrefix}_${type === 'filtered' ? 'filtered_' : ''}${timestamp}.csv`;

      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      console.error("Export failed:", err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getButtonContent = () => {
    if (status === 'loading') return <><div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> Exporting...</>;
    if (status === 'success') return <><CheckCircle size={16} /> Completed</>;
    if (status === 'error') return <><AlertCircle size={16} /> Error</>;
    return <><Download size={16} /> Export {isFiltered ? '▼' : ''}</>;
  };

  return (
    <div className="export-button-container" style={{ position: 'relative' }} ref={dropdownRef}>
      <Button
        variant="primary"
        hasIcon={true}
        style={{
          backgroundColor: status === 'success' ? 'var(--accent-green)' : status === 'error' ? 'var(--accent-red)' : undefined,
          borderColor: status === 'success' ? 'var(--accent-green)' : status === 'error' ? 'var(--accent-red)' : undefined,
        }}
        onClick={() => {
          if (isDisabled) return;
          if (isFiltered) {
            setIsOpen(!isOpen);
          } else {
            handleExport('all');
          }
        }}
        disabled={isDisabled}
        title={!hasData ? "Không có dữ liệu để xuất" : ""}
      >
        {getButtonContent()}
      </Button>

      {isOpen && isFiltered && status === 'idle' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 1000,
          minWidth: '220px',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            LỰA CHỌN XUẤT DỮ LIỆU
          </div>
          <button
            style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-overlay)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            onClick={() => handleExport('filtered')}
          >
            Xuất dữ liệu đang lọc ({filteredData.length} dòng)
          </button>
          <button
            style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-overlay)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            onClick={() => handleExport('all')}
          >
            Xuất toàn bộ dữ liệu ({data.length} dòng)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
