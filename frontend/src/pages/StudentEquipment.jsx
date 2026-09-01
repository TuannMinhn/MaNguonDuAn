import React, { useState, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import { Search, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import BorrowEquipmentModal from '../components/equipment/BorrowEquipmentModal';
import WaitlistModal from '../components/equipment/WaitlistModal';

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

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDateStr = (baseDateStr) => {
  const d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StudentEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' | 'components'
  
  const [showModal, setShowModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [selectedEq, setSelectedEq] = useState(null);
  
  const getDefaultBorrowTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 29);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  
  const [mssv, setMssv] = useState('');
  const [qty, setQty] = useState(1);
  const [borrowDate, setBorrowDate] = useState(() => getTodayDateStr());
  const [borrowTime, setBorrowTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => getTomorrowDateStr());
  const [expectedReturnTime, setExpectedReturnTime] = useState('17:00');

  const [waitlistForm, setWaitlistForm] = useState({
    mssv: '',
    qty: 1,
    purpose: 'Đồ án môn học / Khóa luận tốt nghiệp',
    neededDate: '',
    notes: ''
  });
  
  const [alert, setAlert] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [equipmentWaitlists, setEquipmentWaitlists] = useState({});

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment`);
      const data = await res.json();
      setEquipment(data);

      if (Array.isArray(data) && data.length > 0) {
        const counts = {};
        await Promise.all(data.map(async (eq) => {
          try {
            const wRes = await fetch(`${API_BASE_URL}/equipment/${eq.id}/waitlist`);
            const wData = await wRes.json();
            counts[eq.id] = Array.isArray(wData) ? wData.length : 0;
          } catch {
            counts[eq.id] = 0;
          }
        }));
        setEquipmentWaitlists(counts);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!mssv.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nhập MSSV' });
      return;
    }
    const parsedQty = Number(qty);
    const maxAvailable = selectedEq.assetType && (selectedEq.assetType.toLowerCase().includes('linh kiện') || selectedEq.assetType.toLowerCase().includes('vật tư'))
      ? selectedEq.totalQty 
      : selectedEq.totalQty - (selectedEq.borrowedQty || 0);

    if (!parsedQty || parsedQty < 1 || parsedQty > maxAvailable) {
      setToast({ type: 'error', message: 'Số lượng đặt trước không hợp lệ hoặc vượt quá số lượng khả dụng' });
      return;
    }

    setSubmitting(true);
    try {
      const formattedBorrowDate = new Date(borrowDate + 'T' + (borrowTime || '08:30') + ':00').toISOString();
      const formattedReturnDate = expectedReturnDate ? new Date(expectedReturnDate + 'T' + (expectedReturnTime || '17:00') + ':00').toISOString() : null;

      const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEq.id}/reserve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          mssv: mssv.trim(), 
          qty: parsedQty, 
          borrowDate: formattedBorrowDate,
          expectedReturnDate: formattedReturnDate 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        setToast({ type: 'success', message: 'Đã đặt trước thành công! Vui lòng đến Lab theo lịch hẹn để nhận thiết bị.' });
        fetchEquipment();
        setMssv('');
        setQty(1);
        setBorrowDate(new Date().toISOString().split('T')[0]);
        setBorrowTime('08:30');
        setExpectedReturnDate('');
        setExpectedReturnTime('17:00');
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ type: 'error', message: data.error || 'Đặt trước thất bại' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Lỗi kết nối máy chủ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    const cleanMssv = waitlistForm.mssv?.includes('–') ? waitlistForm.mssv.split('–')[0].trim() : waitlistForm.mssv?.trim();
    if (!cleanMssv || Number(waitlistForm.qty) <= 0) {
      setToast({ type: 'error', message: 'Vui lòng điền đầy đủ MSSV và số lượng' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEq.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...waitlistForm,
          mssv: cleanMssv
        })
      });
      const data = await res.json();

      setShowWaitlistModal(false);
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Lỗi đăng ký chờ' });
      } else {
        setToast({ type: 'success', message: `🔔 Đã tiếp nhận đăng ký chờ mượn ${selectedEq.name}! Hệ thống sẽ gửi thông báo ngay khi có thiết bị.` });
        setWaitlistForm({ mssv: '', qty: 1, purpose: 'Đồ án môn học / Khóa luận tốt nghiệp', neededDate: '', notes: '' });
        fetchEquipment();
        setTimeout(() => setToast(null), 4000);
      }
    } catch (error) {
      setShowWaitlistModal(false);
      setToast({ type: 'error', message: 'Lỗi kết nối tới server' });
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
    const isComponent = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
    if (activeTab === 'components' && !isComponent) return false;
    if (activeTab === 'equipment' && isComponent) return false;

    const matchSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        eq.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || eq.category === selectedCategory;
    return matchSearch && matchCat;
  }), [equipment, searchTerm, selectedCategory, activeTab]);

  const equipmentColumns = useMemo(() => [
    { 
      accessorKey: 'code', 
      header: 'Mã TB', 
      width: '12%',
      sortable: true,
      cell: (row) => <span style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>{row.code}</span>
    },
    { 
      accessorKey: 'name', 
      header: activeTab === 'equipment' ? 'Tên thiết bị' : 'Tên linh kiện', 
      width: '38%',
      sortable: true,
      cell: (row) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35 }}>{row.name}</div>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{row.category || 'Khác'}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Vị trí: <strong style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{row.location || 'Kho Lab'}</strong>
            </span>
          </div>
        </div>
      )
    },
    { 
      accessorKey: 'category', 
      header: 'Phân loại', 
      width: '20%',
      sortable: true,
      cell: (row) => <span className="text-secondary">{row.category || 'Khác'}</span>
    },
    { 
      accessorKey: 'availability', 
      header: 'Khả dụng / Tổng', 
      width: '18%',
      sortable: true, 
      align: 'center', 
      cell: (row) => {
        const isComponent = row.assetType && (row.assetType.toLowerCase().includes('linh kiện') || row.assetType.toLowerCase().includes('vật tư'));
        const available = isComponent ? row.totalQty : row.totalQty - (row.borrowedQty || 0);
        const isAvailable = available > 0;
        return (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontWeight: '700', color: isAvailable ? 'var(--accent-green)' : 'var(--accent-red)' }}>{available}</span>
            {!isComponent && <span style={{ color: 'var(--text-muted)' }}>/{row.totalQty}</span>}
          </span>
        );
      }
    },
    { 
      accessorKey: 'actions', 
      header: 'Thao tác', 
      width: '18%',
      sortable: false, 
      align: 'right', 
      cell: (row) => {
        const isComponent = row.assetType && (row.assetType.toLowerCase().includes('linh kiện') || row.assetType.toLowerCase().includes('vật tư'));
        const available = isComponent ? row.totalQty : row.totalQty - (row.borrowedQty || 0);
        const isAvailable = available > 0;
        return isAvailable ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => { 
              setSelectedEq(row); 
              setQty(1);
              setBorrowDate(getTodayDateStr());
              setBorrowTime(getDefaultBorrowTime());
              setExpectedReturnDate(getTomorrowDateStr());
              setExpectedReturnTime('17:00');
              setAlert(null); 
              setShowModal(true); 
            }}
          >
            {activeTab === 'equipment' ? 'Mượn' : 'Xin cấp phát'}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedEq(row);
              setWaitlistForm({ mssv: '', qty: 1, purpose: 'Đồ án môn học / Khóa luận tốt nghiệp', neededDate: '', notes: '' });
              setShowWaitlistModal(true);
            }}
            style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            🔔 Đăng ký chờ
          </Button>
        );
      }
    }
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
        <p className="page-subtitle">Xem trước số lượng và đặt mượn online. Vui lòng đến phòng Lab quét thẻ RFID để nhận thiết bị</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        <button
          onClick={() => { setActiveTab('equipment'); setSelectedCategory('Tất cả'); setSearchTerm(''); }}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'equipment' ? '600' : '500',
            color: activeTab === 'equipment' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'equipment' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: 'var(--font-family)', fontSize: '0.95rem'
          }}
        >
          <Package size={18} /> Thiết bị
        </button>
        <button
          onClick={() => { setActiveTab('components'); setSelectedCategory('Tất cả'); setSearchTerm(''); }}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'components' ? '600' : '500',
            color: activeTab === 'components' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'components' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: 'var(--font-family)', fontSize: '0.95rem'
          }}
        >
          <Package size={18} /> Linh kiện / Vật tư
        </button>
      </div>

      <Card
        title={`Danh sách ${activeTab === 'equipment' ? 'thiết bị' : 'linh kiện'} (${filteredEq.length})`}
        icon={Package}
        style={{ color: 'var(--accent-blue)' }}
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
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchKeys={['name', 'code', 'category', 'location']}
          searchPlaceholder="Tìm theo tên, mã thiết bị hoặc vị trí..."
        />
      </Card>

      {/* Borrow & Reserve Equipment / Components Modal */}
      {selectedEq && (
        <BorrowEquipmentModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setAlert(null); }}
          selectedEquip={selectedEq}
          borrowForm={{
            mssv,
            qty,
            borrowDate,
            borrowTime,
            expectedReturnDate,
            expectedReturnTime,
            initialCondition: 'Tốt / Hoạt động bình thường',
            borrowNotes: ''
          }}
          setBorrowForm={(updated) => {
            if (updated.mssv !== undefined) setMssv(updated.mssv);
            if (updated.qty !== undefined) setQty(updated.qty);
            if (updated.borrowDate !== undefined) setBorrowDate(updated.borrowDate);
            if (updated.borrowTime !== undefined) setBorrowTime(updated.borrowTime);
            if (updated.expectedReturnDate !== undefined) setExpectedReturnDate(updated.expectedReturnDate);
            if (updated.expectedReturnTime !== undefined) setExpectedReturnTime(updated.expectedReturnTime);
          }}
          memberSearchQuery={mssv}
          setMemberSearchQuery={setMssv}
          suggestedMembers={[]}
          setSuggestedMembers={() => {}}
          handleBorrowSubmit={handleReserve}
          getTodayDateString={() => new Date().toISOString().split('T')[0]}
          isStudentMode={true}
          submitBtnText={activeTab === 'equipment' ? 'Xác nhận Đặt mượn' : 'Xác nhận Cấp phát'}
        />
      )}

      {/* Waitlist Modal */}
      {selectedEq && (
        <WaitlistModal
          isOpen={showWaitlistModal}
          onClose={() => setShowWaitlistModal(false)}
          selectedEquip={selectedEq}
          equipmentWaitlists={equipmentWaitlists}
          waitlistForm={waitlistForm}
          setWaitlistForm={setWaitlistForm}
          memberSearchQuery={waitlistForm.mssv}
          setMemberSearchQuery={(val) => setWaitlistForm({ ...waitlistForm, mssv: val })}
          suggestedMembers={[]}
          setSuggestedMembers={() => {}}
          handleMemberSearch={() => {}}
          handleWaitlistSubmit={handleWaitlistSubmit}
          getTodayDateString={() => new Date().toISOString().split('T')[0]}
        />
      )}

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
