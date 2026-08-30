import React, { useState, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import { Search, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';

const CATEGORIES = [
  'Thiết bị đo lường',
  'Kit phát triển',
  'Module chức năng',
  'Cảm biến',
  'Thiết bị hiển thị',
  'Cơ cấu chấp hành & Động cơ',
  'Dụng cụ cơ khí & Gia công',
  'Máy tính & Máy chủ',
  'Thiết bị mạng',
  'Hạ tầng nguồn & Lưu trữ',
  'Vật tư tiêu hao',
  'Thiết bị đa phương tiện & Giảng dạy',
  'Khác'
];

export default function StudentEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' | 'components'
  
  const [showModal, setShowModal] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  
  const [mssv, setMssv] = useState('');
  const [qty, setQty] = useState(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  
  const [alert, setAlert] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment`);
      const data = await res.json();
      setEquipment(data);
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!mssv.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập MSSV' });
      return;
    }
    if (qty < 1 || qty > (selectedEq.totalQty - (selectedEq.borrowedQty || 0))) {
      setAlert({ type: 'error', message: 'Số lượng đặt trước không hợp lệ' });
      return;
    }

    setSubmitting(true);
    setAlert(null);
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEq.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: mssv.trim(), qty, expectedReturnDate })
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        setToast({ type: 'success', message: 'Đã đặt trước thành công! Vui lòng đến Lab để nhận thiết bị.' });
        fetchEquipment();
        setMssv('');
        setQty(1);
        setExpectedReturnDate('');
        setAlert(null);
        setTimeout(() => {
          setToast(null);
        }, 3000);
      } else {
        setAlert({ type: 'error', message: data.error || 'Đặt trước thất bại' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối máy chủ' });
    } finally {
      setSubmitting(false);
    }
  };

  const availableCategories = useMemo(() => {
    let validEquipment = equipment;
    if (activeTab === 'components') {
      validEquipment = equipment.filter(eq => eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư')));
    } else {
      validEquipment = equipment.filter(eq => !eq.assetType || (!eq.assetType.toLowerCase().includes('linh kiện') && !eq.assetType.toLowerCase().includes('vật tư')));
    }
    const uniqueCats = new Set(validEquipment.map(eq => eq.category).filter(Boolean));
    return Array.from(uniqueCats).sort();
  }, [equipment, activeTab]);

  const filteredEq = useMemo(() => equipment.filter(eq => {
    // Tách riêng thiết bị và linh kiện
    const isComponent = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
    
    if (activeTab === 'equipment' && isComponent) return false;
    if (activeTab === 'components' && !isComponent) return false;

    const matchText = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      eq.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      eq.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || eq.category === selectedCategory;
    return matchText && matchCat;
  }), [equipment, activeTab, searchTerm, selectedCategory]);


  const equipmentColumns = React.useMemo(() => [
    { accessorKey: 'code', header: 'Mã / Danh mục', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{row.code}</div>
        <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Package size={12} /> {row.category || 'Khác'}
        </div>
      </div>
    )},
    { accessorKey: 'name', header: activeTab === 'equipment' ? 'Tên thiết bị' : 'Tên linh kiện', sortable: true, cell: (row) => (
      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{row.name}</span>
    )},
    { accessorKey: 'location', header: 'Vị trí', sortable: true, cell: (row) => (
      <span style={{ color: 'var(--text-secondary)' }}>{row.location || 'Kho Lab'}</span>
    )},
    { accessorKey: 'availability', header: 'Còn lại / Tổng', sortable: true, align: 'center', cell: (row) => {
      const isComponent = row.assetType && (row.assetType.toLowerCase().includes('linh kiện') || row.assetType.toLowerCase().includes('vật tư'));
      const available = isComponent ? row.totalQty : row.totalQty - (row.borrowedQty || 0);
      const isAvailable = available > 0;
      return (
        <span>
          <span style={{ fontWeight: '600', color: isAvailable ? 'var(--accent-green)' : 'var(--accent-red)' }}>{available}</span>
          {!isComponent && <span style={{ color: 'var(--text-muted)' }}>/{row.totalQty}</span>}
        </span>
      );
    }},
    { accessorKey: 'assetType', header: 'Phân loại', sortable: true, align: 'center', cell: (row) => (
      <span className="text-muted">{row.assetType || 'Thiết bị'}</span>
    )},
    { accessorKey: 'actions', header: 'Thao tác', sortable: false, align: 'right', cell: (row) => {
      const isComponent = row.assetType && (row.assetType.toLowerCase().includes('linh kiện') || row.assetType.toLowerCase().includes('vật tư'));
      const available = isComponent ? row.totalQty : row.totalQty - (row.borrowedQty || 0);
      const isAvailable = available > 0;
      return (
        <Button
          size="sm"
          variant="primary"
          onClick={() => { setSelectedEq(row); setShowModal(true); setAlert(null); setQty(1); }}
          disabled={!isAvailable}
        >
          {activeTab === 'equipment' ? 'Mượn' : 'Xin cấp phát'}
        </Button>
      );
    }}
  ], [activeTab]);

  return (
    <div className="page-container fade-in">
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh mục thiết bị...</div>
      ) : (<>
      <div>
        <h2 className="page-header">
          <Package className="text-blue-500" size={20} />
          Kho thiết bị & Dụng cụ
        </h2>
        <p className="page-subtitle">Xem trước số lượng và đặt mượn online. Vui lòng đến phòng Lab quét thẻ RFID để nhận thiết bị.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('equipment')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'equipment' ? '600' : '500',
            color: activeTab === 'equipment' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'equipment' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Package size={18} /> Thiết bị
        </button>
        <button
          onClick={() => setActiveTab('components')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'components' ? '600' : '500',
            color: activeTab === 'components' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'components' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Package size={18} /> Linh kiện / Vật tư
        </button>
      </div>

      <Card
        title={`Danh sách thiết bị / linh kiện (${filteredEq.length})`}
        icon={Package}
        action={
          <div style={{ width: '240px', flexShrink: 0 }}>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={['Tất cả', ...availableCategories].map(cat => ({
                value: cat,
                label: cat === 'Tất cả' ? 'Tất cả danh mục' : cat
              }))}
            />
          </div>
        }
      >
        <DataTable
          data={filteredEq}
          columns={equipmentColumns}
          searchKeys={['name', 'code', 'category', 'location']}
        />
      </Card>

      {/* Modal đặt mượn thiết bị */}
      <Modal
        isOpen={showModal && !!selectedEq}
        onClose={() => setShowModal(false)}
        title="Đặt mượn thiết bị"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button type="submit" form="reserve-equipment-form" variant="primary" loading={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận Đặt trước'}
            </Button>
          </>
        }
      >
        {selectedEq && (
          <div>
            <div style={{ background: 'var(--bg-overlay)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div className="section-heading" style={{ marginBottom: '0.25rem' }}>{selectedEq.name}</div>
              <div className="text-muted">
                {selectedEq.code} | Số lượng khả dụng: {
                  selectedEq.assetType && (selectedEq.assetType.toLowerCase().includes('linh kiện') || selectedEq.assetType.toLowerCase().includes('vật tư'))
                    ? selectedEq.totalQty 
                    : selectedEq.totalQty - (selectedEq.borrowedQty || 0)
                }
              </div>
            </div>

            {alert && (
              <div style={{ 
                padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: alert.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: alert.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                border: `1px solid ${alert.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                {alert.message}
              </div>
            )}

            <form id="reserve-equipment-form" onSubmit={handleReserve} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <label className="form-label" style={{ margin: 0 }}>Mã số sinh viên (MSSV) <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                <TextInput
                  type="text"
                  required
                  placeholder="Nhập MSSV..."
                  value={mssv}
                  onChange={(e) => setMssv(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <label className="form-label" style={{ margin: 0 }}>Số lượng <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                <TextInput
                  type="number"
                  min="1"
                  max={
                    selectedEq.assetType && (selectedEq.assetType.toLowerCase().includes('linh kiện') || selectedEq.assetType.toLowerCase().includes('vật tư'))
                      ? selectedEq.totalQty 
                      : selectedEq.totalQty - (selectedEq.borrowedQty || 0)
                  }
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </div>

              {selectedEq.assetType !== 'Linh kiện tiêu hao' && activeTab === 'equipment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <label className="form-label" style={{ margin: 0 }}>Ngày hẹn trả (Không bắt buộc)</label>
                  <input
                    type="date"
                    className="search-input"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    style={{ width: '100%', height: '40px' }}
                  />
                </div>
              )}
            </form>
          </div>
        )}
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          color: '#fff',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span style={{ fontWeight: '500' }}>{toast.message}</span>
        </div>
      )}
      
      <style>{`
        @keyframes slideInToast {
          from { transform: translateY(120%) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      </>)}
    </div>
  );
}
