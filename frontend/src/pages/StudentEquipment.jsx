import React, { useState, useEffect, useMemo } from 'react';
import Button from '../components/Button';
import { Search, Package, CheckCircle, AlertTriangle, ShieldAlert, Award, Sparkles, User, Lock, Check } from 'lucide-react';
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
  const [members, setMembers] = useState([]);
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
  const [studentInfo, setStudentInfo] = useState(null);
  const [borrowForm, setBorrowForm] = useState({
    equipmentId: '',
    qty: 1,
    borrowDate: getTodayDateStr(),
    borrowTime: getDefaultBorrowTime(),
    expectedReturnDate: getTomorrowDateStr(),
    expectedReturnTime: '17:00',
    notes: '',
    initialCondition: 'Tốt / Hoạt động bình thường'
  });

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
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/members`);
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
    } catch (e) {}
  };

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

  // Tra cứu thông tin sinh viên & điểm khi nhập MSSV
  useEffect(() => {
    if (!mssv.trim()) {
      setStudentInfo(null);
      return;
    }
    const found = members.find(m => m.mssv?.toLowerCase() === mssv.trim().toLowerCase());
    if (found) {
      setStudentInfo(found);
    } else {
      setStudentInfo({
        mssv: mssv.trim(),
        name: `Sinh viên ${mssv.trim()}`,
        role: 'Sinh viên',
        points: 100, // Điểm khởi tạo mặc định nếu là sinh viên mới
        isNew: true
      });
    }
  }, [mssv, members]);

  // Xác định cấp độ truy cập của sinh viên
  const studentPoints = studentInfo ? (Number(studentInfo.points !== undefined ? studentInfo.points : 100)) : 100;
  const isLocked = studentPoints < 80;
  
  // Phân cấp thiết bị hiển thị theo điểm tín nhiệm (Access Control List):
  // - Nếu điểm < 80: Khóa quyền mượn
  // - Điểm 80-100: Chỉ thấy Cấp 1
  // - Điểm 101-150: Thấy Cấp 1 & Cấp 2
  // - Điểm > 150: Thấy toàn bộ Cấp 1, 2, 3
  const allowedLevelMax = useMemo(() => {
    if (studentPoints >= 151) return 3;
    if (studentPoints >= 101) return 2;
    if (studentPoints >= 80) return 1;
    return 0; // Bị khóa
  }, [studentPoints]);

  const handleReserve = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetMssv = (borrowForm.mssv || mssv || '').trim();
    if (!targetMssv) {
      setToast({ type: 'error', message: 'Vui lòng nhập MSSV' });
      return;
    }

    const foundUser = members.find(m => m.mssv?.toLowerCase() === targetMssv.toLowerCase());
    const userPts = foundUser ? Number(foundUser.points !== undefined ? foundUser.points : 100) : 100;
    if (userPts < 80) {
      setToast({ type: 'error', message: 'Tài khoản của bạn đang dưới 80 điểm nên quyền mượn tạm thời bị khóa.' });
      return;
    }

    const parsedQty = Number(borrowForm.qty) || 1;
    const maxAvailable = selectedEq.assetType && (selectedEq.assetType.toLowerCase().includes('linh kiện') || selectedEq.assetType.toLowerCase().includes('vật tư'))
      ? selectedEq.totalQty 
      : selectedEq.totalQty - (selectedEq.borrowedQty || 0);

    if (!parsedQty || parsedQty < 1 || parsedQty > maxAvailable) {
      setToast({ type: 'error', message: 'Số lượng đặt trước không hợp lệ hoặc vượt quá số lượng khả dụng' });
      return;
    }

    setSubmitting(true);
    try {
      const formattedBorrowDate = new Date(borrowForm.borrowDate + 'T' + (borrowForm.borrowTime || '08:30') + ':00').toISOString();
      const formattedReturnDate = borrowForm.expectedReturnDate ? new Date(borrowForm.expectedReturnDate + 'T' + (borrowForm.expectedReturnTime || '17:00') + ':00').toISOString() : null;

      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEq.id}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...borrowForm,
          mssv: targetMssv,
          qty: parsedQty,
          borrowDate: formattedBorrowDate,
          expectedReturnDate: formattedReturnDate,
          borrowNotes: borrowForm.borrowNotes || borrowForm.notes || ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', message: data.error || 'Đã có lỗi xảy ra khi đặt trước' });
      } else {
        setShowModal(false);
        setToast({ type: 'success', message: `✅ Đặt trước thành công ${parsedQty}x ${selectedEq.name}! Vui lòng đến Lab quét thẻ RFID để nhận đồ.` });
        fetchEquipment();
        fetchMembers();
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối tới máy chủ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistForm.mssv.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nhập MSSV' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEq.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistForm)
      });
      const data = await res.json();
      setShowWaitlistModal(false);
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Lỗi khi đăng ký danh sách chờ' });
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

  // Lọc thiết bị: CHỈ HIỂN THỊ THIẾT BỊ NẰM TRONG CẤP ĐỘ MÀ SINH VIÊN ĐỦ ĐIỂM TRUY CẬP
  const filteredEq = useMemo(() => equipment.filter(eq => {
    const isComponent = eq.assetType && (eq.assetType.toLowerCase().includes('linh kiện') || eq.assetType.toLowerCase().includes('vật tư'));
    if (activeTab === 'components' && !isComponent) return false;
    if (activeTab === 'equipment' && isComponent) return false;

    // Phân cấp Access Control List: Ẩn đồ nếu vượt cấp độ cho phép của sinh viên
    const requiredLvl = Number(eq.requiredLevel) || 1;
    if (requiredLvl > allowedLevelMax) return false;

    const matchSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        eq.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || eq.category === selectedCategory;
    return matchSearch && matchCat;
  }), [equipment, searchTerm, selectedCategory, activeTab, allowedLevelMax]);

  const equipmentColumns = useMemo(() => [
    { 
      accessorKey: 'code', 
      header: 'Mã TB', 
      width: '12%',
      sortable: true,
      cell: (row) => <span style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>{row.code}</span>
    },
    { 
      accessorKey: 'name', 
      header: activeTab === 'equipment' ? 'Tên thiết bị' : 'Tên linh kiện', 
      width: '38%',
      sortable: true,
      cell: (row) => {
        const lvl = Number(row.requiredLevel) || 1;
        let lvlBadge = { text: '🟢 Cấp 1', color: 'var(--accent-green)', bg: 'rgba(16, 185, 129, 0.12)' };
        if (lvl === 2) lvlBadge = { text: '🔵 Cấp 2', color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.12)' };
        if (lvl === 3) lvlBadge = { text: '🟣 Cấp 3', color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.12)' };

        return (
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35 }}>{row.name}</div>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', color: lvlBadge.color, background: lvlBadge.bg }}>
                {lvlBadge.text}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ color: 'var(--text-muted)' }}>{row.category || 'Khác'}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Vị trí: <strong style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{row.location || 'Kho Lab'}</strong>
              </span>
            </div>
          </div>
        );
      }
    },
    { 
      accessorKey: 'category', 
      header: 'Phân loại', 
      width: '18%',
      sortable: true,
      cell: (row) => <span className="text-secondary">{row.category || 'Khác'}</span>
    },
    { 
      accessorKey: 'availability', 
      header: 'Khả dụng / Tổng', 
      width: '16%',
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
      width: '16%',
      sortable: false, 
      align: 'right', 
      cell: (row) => {
        const isComponent = row.assetType && (row.assetType.toLowerCase().includes('linh kiện') || row.assetType.toLowerCase().includes('vật tư'));
        const available = isComponent ? row.totalQty : row.totalQty - (row.borrowedQty || 0);
        const isAvailable = available > 0;
        
        if (isLocked) {
          return (
            <Button size="sm" variant="ghost" disabled title="Tài khoản dưới 80đ bị khóa quyền mượn">
              🔒 Đã khóa
            </Button>
          );
        }

        return isAvailable ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => { 
              setSelectedEq(row); 
              setBorrowForm({
                equipmentId: row.id,
                qty: 1,
                borrowDate: getTodayDateStr(),
                borrowTime: getDefaultBorrowTime(),
                expectedReturnDate: getTomorrowDateStr(),
                expectedReturnTime: '17:00',
                notes: '',
                initialCondition: 'Tốt / Hoạt động bình thường'
              });
              setAlert(null); 
              setShowModal(true); 
            }}
          >
            {activeTab === 'equipment' ? 'Mượn TB' : 'Xin cấp phát'}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedEq(row);
              setWaitlistForm({ mssv: mssv.trim(), qty: 1, purpose: 'Đồ án môn học / Khóa luận tốt nghiệp', neededDate: '', notes: '' });
              setShowWaitlistModal(true);
            }}
            style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            🔔 Đăng ký chờ
          </Button>
        );
      }
    }
  ], [activeTab, isLocked]);

  return (
    <div className="page-container fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header tiêu đề chuẩn hóa */}
      <div style={{ paddingRight: '60px' }}>
        <h2 className="page-header">
          <Package className="text-blue-500" size={20} />
          Kho thiết bị &amp; Linh kiện CLB
        </h2>
        <p className="page-subtitle">
          Tra cứu danh mục thiết bị, linh kiện khả dụng và bấm nút <strong style={{ color: 'var(--accent-blue)' }}>Mượn TB</strong> để đăng ký mượn sử dụng.
        </p>
      </div>

      {/* TABS THIẾT BỊ / LINH KIỆN */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => { setActiveTab('equipment'); setSelectedCategory('Tất cả'); setSearchTerm(''); }}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'equipment' ? '700' : '500',
            color: activeTab === 'equipment' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'equipment' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            fontSize: '1rem', transition: 'all 0.2s'
          }}
        >
          Thiết bị &amp; Dụng cụ Lab
        </button>
        <button
          onClick={() => { setActiveTab('components'); setSelectedCategory('Tất cả'); setSearchTerm(''); }}
          style={{
            padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'components' ? '700' : '500',
            color: activeTab === 'components' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'components' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            fontSize: '1rem', transition: 'all 0.2s'
          }}
        >
          Linh kiện &amp; Vật tư tiêu hao
        </button>
      </div>

      {/* DANH MỤC & TÌM KIẾM */}
      <Card
        title={`Danh mục ${activeTab === 'equipment' ? 'Thiết bị & Dụng cụ' : 'Linh kiện'} (${filteredEq.length})`}
        icon={Package}
        style={{ color: 'var(--accent-blue)' }}
      >
        <DataTable
          data={filteredEq}
          columns={equipmentColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchPlaceholder="Tìm theo tên thiết bị, mã TB hoặc vị trí tủ..."
        />
      </Card>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          color: '#fff',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          fontWeight: '600',
          zIndex: 9999
        }}>
          {toast.message}
        </div>
      )}

      {/* MODAL MƯỢN THIẾT BỊ */}
      <BorrowEquipmentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setAlert(null);
        }}
        selectedEquip={selectedEq}
        borrowForm={borrowForm}
        setBorrowForm={setBorrowForm}
        handleBorrowSubmit={handleReserve}
        memberSearchQuery={mssv}
        setMemberSearchQuery={setMssv}
        suggestedMembers={[]}
        setSuggestedMembers={() => {}}
        handleMemberSearch={() => {}}
        isStudentMode={true}
        submitBtnText="Xác nhận Đặt trước"
      />

      {/* MODAL DANH SÁCH CHỜ */}
      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        selectedEquip={selectedEq}
        waitlistForm={waitlistForm}
        setWaitlistForm={setWaitlistForm}
        handleWaitlistSubmit={handleWaitlistSubmit}
        memberSearchQuery={waitlistForm.mssv}
        setMemberSearchQuery={(val) => setWaitlistForm({ ...waitlistForm, mssv: val })}
        suggestedMembers={[]}
        setSuggestedMembers={() => {}}
        handleMemberSearch={() => {}}
      />
    </div>
  );
}
