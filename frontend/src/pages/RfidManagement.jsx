import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import {
  ShieldCheck, CreditCard, History, Plus, Search, Edit2, Trash2,
  X, CheckCircle, XCircle, Clock, User, Tag, Filter, RefreshCw,
  AlertTriangle, Wifi, Shield, Play, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExportModal from '../components/ExportModal';
import { API_BASE_URL } from '../config';
import DataTable from '../components/DataTable';
import Select from '../components/Select';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import Card from '../components/Card';

export default function RfidManagement({ userRole }) {
  const [activeTab, setActiveTab] = useState('cards');
  const [cards, setCards] = useState([]);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyFilter, setHistoryFilter] = useState({ cardId: '', mssv: '', module: '' });
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRfidScanModal, setShowRfidScanModal] = useState(false);

  // Form states
  const [newCard, setNewCard] = useState({ cardId: '', mssv: '' });
  const [editCard, setEditCard] = useState(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const historyExportColumns = [
    { id: 'timestamp', label: 'Thời gian', defaultChecked: true },
    { id: 'cardId', label: 'Mã thẻ', defaultChecked: true },
    { id: 'mssv', label: 'MSSV', defaultChecked: true },
    { id: 'userName', label: 'Họ và tên', defaultChecked: true },
    { id: 'module', label: 'Module', defaultChecked: true },
    { id: 'action', label: 'Hành động', defaultChecked: true },
    { id: 'status', label: 'Kết quả', defaultChecked: true },
    { id: 'details', label: 'Chi tiết', defaultChecked: false }
  ];

  const handleAdvancedHistoryExport = async (config) => {
    const { scope, format, selectedColumns } = config;
    let dataToExport = history;

    const headers = [];
    const keys = [];
    
    historyExportColumns.forEach(col => {
      if (selectedColumns.includes(col.id)) {
        headers.push(col.label);
        keys.push(col.id);
      }
    });

    const rows = dataToExport.map(row => {
      return keys.map(key => {
        let val = row[key];
        if (val === undefined || val === null) return '';
        if (key === 'timestamp') {
          try { val = new Date(val).toLocaleString('vi-VN'); } catch (e) {}
        }
        return val;
      });
    });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filename = `lich_su_quet_the_${timestamp}.${format}`;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        const formattedRow = row.map(cell => {
          let cellStr = String(cell).replace(/"/g, '""');
          if (cellStr.includes(',') || cellStr.includes('\n')) {
            cellStr = `"${cellStr}"`;
          }
          return cellStr;
        });
        csvContent += formattedRow.join(",") + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Lịch sử quét thẻ");
      XLSX.writeFile(wb, filename);
    }
  };

  // Auto-dismiss alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Fetch data
  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rfid-cards`);
      const data = await res.json();
      setCards(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thẻ:', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (historyFilter.cardId) params.set('cardId', historyFilter.cardId);
      if (historyFilter.mssv) params.set('mssv', historyFilter.mssv);
      if (historyFilter.module) params.set('module', historyFilter.module);
      const res = await fetch(`${API_BASE_URL}/rfid-history?${params.toString()}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    }
  }, [historyFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/members`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách thành viên:', err);
    }
  }, []);

  useEffect(() => {
    fetchCards();
    fetchUsers();
  }, [fetchCards, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // RFID Scan Modal - keyboard listener
  useEffect(() => {
    if (!showRfidScanModal) return;

    const handleKeyPress = async (e) => {
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const cardId = `CARD-00${e.key}`;
        setNewCard(prev => ({ ...prev, cardId }));
        setShowRfidScanModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showRfidScanModal]);

  // Register new card
  const handleRegisterCard = async () => {
    if (!newCard.cardId || !newCard.mssv) {
      setAlert({ type: 'error', message: 'Vui lòng nhập đầy đủ mã thẻ và chọn thành viên' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rfid-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: 'error', message: data.error });
      } else {
        setAlert({ type: 'success', message: data.message });
        setNewCard({ cardId: '', mssv: '' });
        setShowAddModal(false);
        fetchCards();
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  // Edit card
  const handleEditCard = async () => {
    if (!editCard) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rfid-cards/${editCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: editCard.mssv, status: editCard.status })
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: 'error', message: data.error });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowEditModal(false);
        setEditCard(null);
        fetchCards();
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  // Delete card
  const handleDeleteCard = async (card) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rfid-cards/${card.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: 'error', message: data.error });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowDeleteConfirm(null);
        fetchCards();
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle card status
  const handleToggleStatus = async (card) => {
    const newStatus = card.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_BASE_URL}/rfid-cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: 'error', message: data.error });
      } else {
        setAlert({ type: 'success', message: `Thẻ ${card.cardId} đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'}` });
        fetchCards();
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi kết nối server' });
    }
  };

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Stats
  const totalCards = cards.length;
  const activeCards = cards.filter(c => c.status === 'active').length;
  const inactiveCards = cards.filter(c => c.status === 'inactive').length;
  const totalScans = cards.reduce((sum, c) => sum + (c.usageCount || 0), 0);

  // Action label mapping
  const actionLabel = (action) => {
    const map = {
      'scan': 'Quét thẻ',
      'check-in': 'Check-in',
      'check-out': 'Check-out',
      'room-checkin': 'Nhận phòng',
      'room-checkout': 'Trả phòng',
      'room-access-denied': 'Từ chối ra vào',
      'register': 'Đăng ký',
      'update': 'Cập nhật',
      'delete': 'Xóa',
      'attendance-denied': 'Từ chối điểm danh'
    };
    return map[action] || action;
  };

  const moduleLabel = (mod) => {
    const map = {
      'attendance': 'Điểm danh',
      'system': 'Hệ thống',
      'management': 'Quản lý',
      'equipment': 'Thiết bị',
      'booking': 'Đặt phòng',
      'room_booking': 'Cửa ra vào'
    };
    return map[mod] || mod;
  };

  const cardsColumns = React.useMemo(() => [
    { accessorKey: 'cardId', header: 'Mã thẻ', sortable: true, cell: (row) => (
      <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
        {row.cardId}
      </span>
    )},
    { accessorKey: 'mssv', header: 'MSSV', sortable: true, cell: (row) => <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{row.mssv}</span> },
    { accessorKey: 'userName', header: 'Họ và tên', sortable: true, cell: (row) => row.userName },
    { accessorKey: 'status', header: 'Trạng thái', sortable: true, align: 'center', cell: (row) => (
      <button
        onClick={() => handleToggleStatus(row)}
        className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}
        style={{ cursor: 'pointer', border: 'none', background: row.status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', fontFamily: 'var(--font-family)', color: row.status === 'active' ? 'var(--accent-green)' : 'var(--accent-red)' }}
        title="Nhấn để đổi trạng thái"
      >
        {row.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
      </button>
    )},
    { accessorKey: 'createdAt', header: 'Ngày đăng ký', sortable: true, cell: (row) => formatTime(row.createdAt) },
    { accessorKey: 'lastUsed', header: 'Lần quét cuối', sortable: true, cell: (row) => formatTime(row.lastUsed) },
    { accessorKey: 'usageCount', header: 'Tổng lượt', align: 'center', sortable: true, cell: (row) => (
      <span className="badge badge-info">{row.usageCount || 0}</span>
    )},
    { accessorKey: 'actions', header: 'Hành động', align: 'right', sortable: false, cell: (row) => (
      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
        <Button size="sm" variant="ghost" icon={Edit2} onClick={() => { setEditCard(row); setShowEditModal(true); }} title="Cập nhật thẻ" />
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(row)} title="Xóa thẻ" />
      </div>
    )}
  ], []);

  const historyColumns = React.useMemo(() => [
    { accessorKey: 'timestamp', header: 'Thời gian', sortable: true, cell: (row) => (
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        <Clock size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
        {formatTime(row.timestamp)}
      </span>
    )},
    { accessorKey: 'cardId', header: 'Mã thẻ', sortable: true, cell: (row) => (
      <span style={{ fontFamily: 'monospace', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.82rem' }}>
        {row.cardId}
      </span>
    )},
    { accessorKey: 'mssv', header: 'MSSV', sortable: true, cell: (row) => <span style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{row.mssv || '—'}</span> },
    { accessorKey: 'userName', header: 'Họ và tên', sortable: true, cell: (row) => row.userName || '—' },
    { accessorKey: 'module', header: 'Module', sortable: true, cell: (row) => <span className="badge badge-info">{moduleLabel(row.module)}</span> },
    { accessorKey: 'action', header: 'Hành động', sortable: true, cell: (row) => (
      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: row.action === 'attendance-denied' || row.action === 'delete' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
        {actionLabel(row.action)}
      </span>
    )},
    { accessorKey: 'status', header: 'Kết quả', sortable: true, cell: (row) => (
      row.success ? (
        <span className="badge badge-success"><CheckCircle size={12} style={{ marginRight: '0.25rem' }} /> OK</span>
      ) : (
        <span className="badge badge-danger"><XCircle size={12} style={{ marginRight: '0.25rem' }} /> Lỗi</span>
      )
    )}
  ], []);

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ paddingRight: '60px' }}>
          <h2 className="page-header">
            <CreditCard className="text-purple-500" size={20} />
            Quản lý thẻ RFID
          </h2>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>Đăng ký, quản lý và theo dõi lịch sử quét thẻ RFID</p>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowAddModal(true)}>Đăng ký thẻ mới</Button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`alert-message ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {alert.type === 'success' ? <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> : <XCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />}
          {alert.message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', color: 'var(--accent-blue)' }}>
              <CreditCard size={18} />
            </div>
            <span className="stat-label">Tổng thẻ</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalCards}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }}>
              <CheckCircle size={18} />
            </div>
            <span className="stat-label">Đang hoạt động</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{activeCards}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
              <XCircle size={18} />
            </div>
            <span className="stat-label">Vô hiệu hóa</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{inactiveCards}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-amber) 15%, transparent)', color: 'var(--accent-amber)' }}>
              <Wifi size={18} />
            </div>
            <span className="stat-label">Lượt quét (30 ngày)</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalScans}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          {[
            { id: 'cards', label: 'Danh sách thẻ', icon: CreditCard },
            { id: 'history', label: 'Lịch sử quét', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '1rem 1.5rem',
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)'
                    : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-family)'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Tab 1: Cards List */}
          {activeTab === 'cards' && (
            <Card
              title={`Danh sách thẻ đã cấp (${cards.length})`}
              icon={CreditCard}
              action={
                <Button variant="secondary" icon={RefreshCw} iconPosition="left" onClick={fetchCards}>Làm mới</Button>
              }
            >
              <DataTable
                data={cards}
                columns={cardsColumns}
                searchKeys={['cardId', 'mssv', 'userName']}
              />
            </Card>
          )}

          {/* Tab 2: History */}
          {activeTab === 'history' && (
            <Card
              title={`Lịch sử quẹt thẻ (${history.length})`}
              icon={History}
              action={
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="secondary" icon={RefreshCw} iconPosition="left" onClick={fetchHistory}>Làm mới</Button>
                  <Button variant="secondary" icon={Download} iconPosition="left" onClick={() => setIsExportModalOpen(true)}>Xuất báo cáo</Button>
                </div>
              }
            >
              <DataTable
                data={history}
                columns={historyColumns}
                searchKeys={['cardId', 'action', 'details', 'userName', 'mssv']}
              />
            </Card>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Card Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Đăng ký thẻ RFID mới"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button variant="primary" loading={loading} onClick={handleRegisterCard}>
              {loading ? 'Đang xử lý...' : 'Đăng ký thẻ'}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label>Mã thẻ (Card ID)</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <TextInput
                placeholder="VD: CARD-005"
                value={newCard.cardId}
                onChange={(e) => setNewCard(prev => ({ ...prev, cardId: e.target.value }))}
              />
            </div>
            <Button variant="secondary" size="md" onClick={() => setShowRfidScanModal(true)}>🔐 Quét thẻ</Button>
          </div>
        </div>

        <div className="form-group">
          <label>Chọn thành viên (MSSV)</label>
          <Select
            value={newCard.mssv}
            onChange={(val) => setNewCard(prev => ({ ...prev, mssv: val }))}
            options={[
              { value: "", label: "-- Chọn thành viên --" },
              ...users.map(u => ({ value: u.mssv, label: `${u.mssv} - ${u.name} (${u.role})` }))
            ]}
          />
        </div>

        {newCard.cardId && newCard.mssv && (
          <div style={{
            padding: '1rem',
            background: 'rgba(59, 130, 246, 0.08)',
            borderRadius: '10px',
            border: '1px solid rgba(59, 130, 246, 0.15)'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Xác nhận:</p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              Thẻ <strong style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{newCard.cardId}</strong>
              {' → '}
              {users.find(u => u.mssv === newCard.mssv)?.name || newCard.mssv}
            </p>
          </div>
        )}
      </Modal>

      {/* Edit Card Modal */}
      <Modal
        isOpen={showEditModal && !!editCard}
        onClose={() => { setShowEditModal(false); setEditCard(null); }}
        title={`Sửa thông tin thẻ ${editCard?.cardId || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditCard(null); }}>Hủy</Button>
            <Button variant="primary" loading={loading} onClick={handleEditCard}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </>
        }
      >
        {editCard && (
          <>
            <div className="form-group">
              <label>Mã thẻ</label>
              <TextInput value={editCard.cardId} disabled />
            </div>

            <div className="form-group">
              <label>Gán cho thành viên (MSSV)</label>
              <Select
                value={editCard.mssv}
                onChange={(val) => setEditCard(prev => ({ ...prev, mssv: val }))}
                options={users.map(u => ({ value: u.mssv, label: `${u.mssv} - ${u.name} (${u.role})` }))}
              />
            </div>

            <div className="form-group">
              <label>Trạng thái</label>
              <Select
                value={editCard.status}
                onChange={(val) => setEditCard(prev => ({ ...prev, status: val }))}
                options={[
                  { value: "active", label: "Active (Hoạt động)" },
                  { value: "inactive", label: "Inactive (Vô hiệu hóa)" }
                ]}
              />
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Xác nhận xóa thẻ"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>Hủy bỏ</Button>
            <Button
              variant="danger"
              loading={loading}
              onClick={() => handleDeleteCard(showDeleteConfirm)}
            >
              {loading ? 'Đang xóa...' : 'Xóa thẻ'}
            </Button>
          </div>
        }
      >
        {showDeleteConfirm && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              Bạn có chắc muốn xóa thẻ <strong style={{ color: 'var(--accent-red)', fontFamily: 'monospace' }}>{showDeleteConfirm.cardId}</strong>?
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Thẻ của {showDeleteConfirm.userName} ({showDeleteConfirm.mssv})
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--accent-red)', marginTop: '0.75rem' }}>
              ⚠️ Hành động này không thể hoàn tác
            </p>
          </div>
        )}
      </Modal>

      {/* RFID Scan Modal */}
      <Modal
        isOpen={showRfidScanModal}
        onClose={() => setShowRfidScanModal(false)}
        title="🔐 Quét thẻ RFID mới"
        size="sm"
      >
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            animation: 'pulse 2s infinite'
          }}>
            <CreditCard size={36} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: 'var(--text-lg)' }}>Đang chờ quét thẻ...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Đặt thẻ RFID mới vào đầu đọc để đọc mã thẻ
          </p>
        </div>
      </Modal>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={historyExportColumns}
        counts={{
          all: history.length,
          filtered: history.length,
          selected: 0
        }}
        onExport={handleAdvancedHistoryExport}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

