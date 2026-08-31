import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Settings as SettingsIcon, Tag, Clock, Sliders, Save, CheckCircle2, Database, RotateCcw, ShieldAlert, HardDrive, AlertTriangle, FileText, Search, RefreshCw, Eye } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { API_BASE_URL } from '../config';
import { CATEGORIES, ASSET_TYPES } from '../utils/constants';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import EmptyState from '../components/EmptyState';

export default function Settings() {
  const { data: catalog, mutate } = useSWR(`${API_BASE_URL}/settings/catalog`, fetcher);
  const { data: systemSettings, mutate: mutateSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // System Settings state phân theo 3 nhóm
  const [sysConfig, setSysConfig] = useState({
    // Nhóm 1: Mượn trả & Kho
    defaultBorrowDays: 7,
    defaultReturnTime: '17:00',
    defaultLowStockThreshold: 0,
    defaultLifespanHours: 10000,
    maintenanceWarningPercent: 20,
    // Nhóm 2: Trực Lab & Điểm thưởng
    attendanceMinHours: 1.0,
    attendanceStandardPoints: 5,
    attendanceShortPoints: 2,
    taskDefaultPoints: 10,
    // Nhóm 3: Vận hành & Bảo mật
    adminPassword: '',
    maxNotificationHistory: 500,
    rfidScanCooldownSeconds: 5,
    defaultLabLocation: 'Kho Lab',
    // Nhóm 4: Tự động sao lưu & Lưu trữ
    autoBackupEnabled: false,
    backupIntervalHours: 24,
    backupRetentionCount: 7,
    // Nhóm 5: Chính sách Đặt phòng Lab (Room Booking Policy)
    roomBookingCancelDeadlineHours: 2,
    roomBookingAdvanceDays: 14,
    maxBookingSlotsPerWeek: 4
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  useEffect(() => {
    if (systemSettings) {
      setSysConfig(prev => ({
        ...prev,
        defaultBorrowDays: systemSettings.defaultBorrowDays ?? 7,
        defaultReturnTime: systemSettings.defaultReturnTime ?? '17:00',
        defaultLowStockThreshold: systemSettings.defaultLowStockThreshold ?? 0,
        defaultLifespanHours: systemSettings.defaultLifespanHours ?? 10000,
        maintenanceWarningPercent: systemSettings.maintenanceWarningPercent ?? 20,
        attendanceMinHours: systemSettings.attendanceMinHours ?? 1.0,
        attendanceStandardPoints: systemSettings.attendanceStandardPoints ?? 5,
        attendanceShortPoints: systemSettings.attendanceShortPoints ?? 2,
        taskDefaultPoints: systemSettings.taskDefaultPoints ?? 10,
        maxNotificationHistory: systemSettings.maxNotificationHistory ?? 500,
        rfidScanCooldownSeconds: systemSettings.rfidScanCooldownSeconds ?? 5,
        defaultLabLocation: systemSettings.defaultLabLocation ?? 'Kho Lab',
        autoBackupEnabled: String(systemSettings.autoBackupEnabled) === 'true' || systemSettings.autoBackupEnabled === true,
        backupIntervalHours: Number(systemSettings.backupIntervalHours) || 24,
        backupRetentionCount: Number(systemSettings.backupRetentionCount) || 7,
        roomBookingCancelDeadlineHours: Number(systemSettings.roomBookingCancelDeadlineHours) || 2,
        roomBookingAdvanceDays: Number(systemSettings.roomBookingAdvanceDays) || 14,
        maxBookingSlotsPerWeek: Number(systemSettings.maxBookingSlotsPerWeek) || 4
      }));
    }
  }, [systemSettings]);
  
  const [form, setForm] = useState({
    name: '',
    codePrefix: '',
    category: 'Thiết bị đo lường',
    assetType: 'Thiết bị',
    unit: 'Cái',
    lifespanHours: 10000,
    description: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveSysConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sysConfig)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu cấu hình hệ thống');
      setSuccessMsg('Đã lưu cấu hình hệ thống thành công');
      setSysConfig(prev => ({ ...prev, adminPassword: '' }));
      mutateSettings();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    if (editingItem) {
      setForm(editingItem);
      setShowAddModal(true);
    }
  }, [editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.codePrefix.trim()) {
      setErrorMsg('Vui lòng nhập Tên và Mã thiết bị (Prefix)');
      return;
    }

    try {
      const url = editingItem ? `${API_BASE_URL}/settings/catalog/${editingItem.id}` : `${API_BASE_URL}/settings/catalog`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setSuccessMsg(editingItem ? 'Đã cập nhật danh mục gốc' : 'Đã thêm vào danh mục gốc');
      closeModal();
      mutate();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi Danh mục gốc?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/settings/catalog/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa');
      setSuccessMsg('Đã xóa thành công');
      mutate();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Backup & Restore State & Handlers (Super Admin)
  const token = localStorage.getItem('lab_auth_token');
  const userRole = localStorage.getItem('lab_auth_role');
  const isSuperAdmin = userRole === 'admin' || userRole === 'super_admin' || !userRole; // Fallback an toàn
  const isManagerOrAdmin = ['admin', 'super_admin', 'manager', 'quản lý', 'chủ nhiệm', 'trưởng ban kỹ thuật'].includes(String(userRole || 'admin').toLowerCase());

  const { data: backupsData, mutate: mutateBackups, isValidating: isValidatingBackups } = useSWR(
    isSuperAdmin ? `${API_BASE_URL}/backups` : null,
    fetcher
  );
  const backupsList = backupsData?.backups || [];

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Audit Logs State & Pagination & Filters
  const [auditFilter, setAuditFilter] = useState({
    action: '',
    targetType: '',
    actorRole: '',
    success: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState(null);
  const [showAuditDetailModal, setShowAuditDetailModal] = useState(false);

  // Build SWR Key cho Audit Logs
  const buildAuditLogsUrl = () => {
    if (!isManagerOrAdmin) return null;
    const params = new URLSearchParams();
    params.set('page', auditPage);
    params.set('limit', auditLimit);
    if (auditFilter.action) params.set('action', auditFilter.action);
    if (auditFilter.targetType) params.set('targetType', auditFilter.targetType);
    if (auditFilter.actorRole) params.set('actorRole', auditFilter.actorRole);
    if (auditFilter.success !== '') params.set('success', auditFilter.success);
    if (auditFilter.dateFrom) params.set('dateFrom', auditFilter.dateFrom);
    if (auditFilter.dateTo) params.set('dateTo', auditFilter.dateTo);
    if (auditFilter.search) params.set('search', auditFilter.search.trim());
    return `${API_BASE_URL}/audit-logs?${params.toString()}`;
  };

  const { data: auditLogsData, mutate: mutateAuditLogs, isValidating: isValidatingAuditLogs } = useSWR(
    buildAuditLogsUrl(),
    fetcher
  );

  const auditLogsList = auditLogsData?.data || [];
  const auditPagination = auditLogsData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo bản sao lưu');
      setSuccessMsg('Đã tạo bản sao lưu thành công: ' + data.backup.filename);
      mutateBackups();
      mutateAuditLogs();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupToRestore) return;
    setIsRestoring(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/backups/${selectedBackupToRestore.filename}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi khôi phục cơ sở dữ liệu');
      setSuccessMsg(`Khôi phục thành công từ bản sao lưu ${selectedBackupToRestore.filename}. Tự động tạo bản an toàn: ${data.safetyBackup || ''}`);
      setShowRestoreModal(false);
      setSelectedBackupToRestore(null);
      mutateSettings();
      mutate();
      mutateBackups();
      mutateAuditLogs();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  if (!catalog) return <div className="page-container"><Card>Đang tải danh mục gốc...</Card></div>;

  const catalogColumns = [
    { accessorKey: 'name', header: 'Tên thiết bị (Mẫu chuẩn)', sortable: true, cell: (row) => (
      <div>
        <div style={{ fontWeight: '500' }}>{row.name}</div>
        <div className="text-muted">{row.description}</div>
      </div>
    )},
    { accessorKey: 'codePrefix', header: 'Mã Prefix', sortable: true, cell: (row) => (
      <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{row.codePrefix}</span>
    )},
    { accessorKey: 'category', header: 'Phân loại', sortable: true, cell: (row) => (
      <div>
        <div>{row.category}</div>
        <div className="text-muted">{row.assetType} • {row.unit}</div>
      </div>
    )},
    { accessorKey: 'lifespanHours', header: 'Tuổi thọ dự kiến', sortable: true, align: 'center', cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)' }}>
        <Clock size={14} /> {row.lifespanHours} giờ
      </span>
    )},
    { accessorKey: 'actions', header: 'Thao tác', sortable: false, align: 'right', cell: (row) => (
      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
        <Button variant="secondary" size="sm" onClick={() => setEditingItem(row)}><Edit3 size={15} /></Button>
        <Button variant="danger-tertiary" size="sm" onClick={() => handleDelete(row.id, row.name)}><Trash2 size={15} /></Button>
      </div>
    )}
  ];

  const backupColumns = [
    { accessorKey: 'filename', header: 'Tên bản sao lưu', sortable: true, cell: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={16} style={{ color: row.isSafety ? 'var(--accent-amber)' : 'var(--accent-purple)' }} />
        <div>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{row.filename}</span>
          {row.isSafety && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', fontWeight: '600' }}>
              Safety Backup
            </span>
          )}
        </div>
      </div>
    )},
    { accessorKey: 'createdAt', header: 'Thời gian tạo', sortable: true, cell: (row) => (
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {formatTimestamp(row.createdAt)}
      </span>
    )},
    { accessorKey: 'size', header: 'Kích thước', sortable: true, cell: (row) => (
      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        {formatFileSize(row.size)}
      </span>
    )},
    { accessorKey: 'actions', header: 'Thao tác', sortable: false, align: 'right', cell: (row) => (
      isSuperAdmin && (
        <Button
          variant="danger"
          size="sm"
          icon={RotateCcw}
          iconPosition="left"
          disabled={isRestoring || isBackingUp}
          onClick={() => {
            setSelectedBackupToRestore(row);
            setShowRestoreModal(true);
          }}
        >
          Phục hồi
        </Button>
      )
    )}
  ];

  const renderActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', fontWeight: '600', fontSize: '0.75rem' }}>CREATE</span>;
      case 'UPDATE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '0.75rem' }}>UPDATE</span>;
      case 'DELETE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', fontWeight: '600', fontSize: '0.75rem' }}>DELETE</span>;
      case 'BORROW':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', fontWeight: '600', fontSize: '0.75rem' }}>BORROW</span>;
      case 'RETURN':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', fontWeight: '600', fontSize: '0.75rem' }}>RETURN</span>;
      case 'RESERVE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', fontWeight: '600', fontSize: '0.75rem' }}>RESERVE</span>;
      case 'APPROVE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', fontWeight: '600', fontSize: '0.75rem' }}>APPROVE</span>;
      case 'BACKUP':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', fontWeight: '600', fontSize: '0.75rem' }}>BACKUP</span>;
      case 'RESTORE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', fontWeight: '600', fontSize: '0.75rem' }}>RESTORE</span>;
      case 'SETTINGS_CHANGE':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '0.75rem' }}>SETTINGS</span>;
      case 'CHECK_IN':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', fontWeight: '600', fontSize: '0.75rem' }}>CHECK IN</span>;
      case 'CHECK_OUT':
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.75rem' }}>CHECK OUT</span>;
      default:
        return <span style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>{action}</span>;
    }
  };

  const auditColumns = [
    { accessorKey: 'createdAt', header: 'Thời gian', sortable: false, cell: (row) => (
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        {formatTimestamp(row.createdAt)}
      </span>
    )},
    { accessorKey: 'actorName', header: 'Người thực hiện', sortable: false, cell: (row) => (
      <div>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{row.actorName || 'System'}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {row.actorMssv ? `MSSV: ${row.actorMssv}` : (row.actorRole ? `Vai trò: ${row.actorRole}` : '')}
        </div>
      </div>
    )},
    { accessorKey: 'action', header: 'Hành động', sortable: false, cell: (row) => (
      renderActionBadge(row.action)
    )},
    { accessorKey: 'targetType', header: 'Đối tượng', sortable: false, cell: (row) => (
      <div>
        <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{row.targetType}</span>
        {row.targetId && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            ID: {String(row.targetId).slice(0, 16)}...
          </div>
        )}
      </div>
    )},
    { accessorKey: 'success', header: 'Trạng thái', sortable: false, align: 'center', cell: (row) => (
      row.success ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: '600' }}>
          <CheckCircle2 size={14} /> Thành công
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: '600' }}>
          <ShieldAlert size={14} /> Thất bại
        </span>
      )
    )},
    { accessorKey: 'actions', header: 'Chi tiết', sortable: false, align: 'right', cell: (row) => (
      <Button
        variant="ghost"
        size="sm"
        icon={Eye}
        onClick={() => {
          setSelectedAuditDetail(row);
          setShowAuditDetailModal(true);
        }}
      >
        Xem
      </Button>
    )}
  ];

  const settingsModalFooter = (
    <>
      <Button type="button" variant="ghost" onClick={closeModal}>Hủy</Button>
      <Button type="submit" form="settings-form" variant="primary">{editingItem ? 'Cập nhật' : 'Thêm mới'}</Button>
    </>
  );

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-header">
            <SettingsIcon className="text-blue-500" size={20} />
            Cài đặt hệ thống
          </h2>
          <p className="page-subtitle">Quản lý danh mục thiết bị gốc để hỗ trợ việc thêm thiết bị vào kho nhanh chóng hơn.</p>
        </div>
        <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowAddModal(true)}>
          Thêm danh mục gốc
        </Button>
      </div>

      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      {/* NHÓM 1: QUY ĐỊNH MƯỢN TRẢ & KHO */}
      <Card
        title="Quy định Mượn Trả & Quản lý Kho"
        icon={Sliders}
        style={{ color: 'var(--accent-blue)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Thời hạn mượn mặc định (Ngày)
              </label>
              <TextInput
                type="number"
                min="1"
                max="90"
                required
                value={sysConfig.defaultBorrowDays}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultBorrowDays: Number(e.target.value) })}
                placeholder="7"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Hạn trả khi không chỉ định ngày (Mặc định: 7 ngày)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Giờ hẹn trả mặc định
              </label>
              <TextInput
                type="time"
                required
                value={sysConfig.defaultReturnTime}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultReturnTime: e.target.value })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Giờ hết hạn mượn trong ngày (Mặc định: 17:00)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Ngưỡng cảnh báo tồn kho mặc định
              </label>
              <TextInput
                type="number"
                min="0"
                max="100"
                required
                value={sysConfig.defaultLowStockThreshold}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultLowStockThreshold: Number(e.target.value) })}
                placeholder="0"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Mức báo động "Sắp hết" khi thêm mới (Mặc định: 0)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Tuổi thọ thiết bị mặc định (Giờ)
              </label>
              <TextInput
                type="number"
                min="100"
                max="100000"
                required
                value={sysConfig.defaultLifespanHours}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultLifespanHours: Number(e.target.value) })}
                placeholder="10000"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Thời gian khấu hao dự kiến (Mặc định: 10000h)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Ngưỡng cảnh báo bảo trì (%)
              </label>
              <TextInput
                type="number"
                min="1"
                max="50"
                required
                value={sysConfig.maintenanceWarningPercent}
                onChange={(e) => setSysConfig({ ...sysConfig, maintenanceWarningPercent: Number(e.target.value) })}
                placeholder="20"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Báo "Cần bảo trì" khi tuổi thọ dưới % này (Mặc định: 20%)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình mượn trả & kho'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 2: TRỰC LAB & ĐIỂM THƯỞNG */}
      <Card
        title="Chính sách Trực Lab & Điểm thưởng"
        icon={Tag}
        style={{ color: 'var(--accent-amber)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Số giờ trực tối thiểu (Giờ)
              </label>
              <TextInput
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                required
                value={sysConfig.attendanceMinHours}
                onChange={(e) => setSysConfig({ ...sysConfig, attendanceMinHours: Number(e.target.value) })}
                placeholder="1.0"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Ngưỡng đạt ca trực chuẩn (Mặc định: 1.0h)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Điểm thưởng ca chuẩn (Điểm)
              </label>
              <TextInput
                type="number"
                min="1"
                max="100"
                required
                value={sysConfig.attendanceStandardPoints}
                onChange={(e) => setSysConfig({ ...sysConfig, attendanceStandardPoints: Number(e.target.value) })}
                placeholder="5"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Cộng khi trực đủ giờ tối thiểu (Mặc định: +5đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Điểm thưởng ca ngắn (Điểm)
              </label>
              <TextInput
                type="number"
                min="0"
                max="50"
                required
                value={sysConfig.attendanceShortPoints}
                onChange={(e) => setSysConfig({ ...sysConfig, attendanceShortPoints: Number(e.target.value) })}
                placeholder="2"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Cộng khi trực chưa đủ giờ chuẩn (Mặc định: +2đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Điểm nhiệm vụ mặc định (Điểm)
              </label>
              <TextInput
                type="number"
                min="1"
                max="200"
                required
                value={sysConfig.taskDefaultPoints}
                onChange={(e) => setSysConfig({ ...sysConfig, taskDefaultPoints: Number(e.target.value) })}
                placeholder="10"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Điểm tích lũy khi tạo task mới (Mặc định: 10đ)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu chính sách điểm'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 3: VẬN HÀNH & BẢO MẬT */}
      <Card
        title="Vận hành Hệ thống & Bảo mật"
        icon={SettingsIcon}
        style={{ color: 'var(--accent-green)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Mật khẩu Quản trị viên mới (Admin)
              </label>
              <TextInput
                type="password"
                value={sysConfig.adminPassword}
                onChange={(e) => setSysConfig({ ...sysConfig, adminPassword: e.target.value })}
                placeholder="Để trống nếu không đổi mật khẩu"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Chỉ nhập khi muốn đổi mật khẩu đăng nhập Quản lý (để trống sẽ giữ nguyên)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Lưu tối đa thông báo (Mục)
              </label>
              <TextInput
                type="number"
                min="50"
                max="5000"
                required
                value={sysConfig.maxNotificationHistory}
                onChange={(e) => setSysConfig({ ...sysConfig, maxNotificationHistory: Number(e.target.value) })}
                placeholder="500"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Giới hạn lịch sử chuông báo (Mặc định: 500)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Thời gian chờ quét lại RFID (Giây)
              </label>
              <TextInput
                type="number"
                min="1"
                max="60"
                required
                value={sysConfig.rfidScanCooldownSeconds}
                onChange={(e) => setSysConfig({ ...sysConfig, rfidScanCooldownSeconds: Number(e.target.value) })}
                placeholder="5"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Chống quét nhầm check-in/out liên tiếp (Mặc định: 5s)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Vị trí lưu kho mặc định
              </label>
              <TextInput
                type="text"
                required
                value={sysConfig.defaultLabLocation}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultLabLocation: e.target.value })}
                placeholder="Kho Lab"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Tên vị trí kho thiết bị khi thêm mới (Mặc định: Kho Lab)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Hạn chót hủy đặt phòng (Giờ)
              </label>
              <TextInput
                type="number"
                min="0"
                max="72"
                required
                value={sysConfig.roomBookingCancelDeadlineHours}
                onChange={(e) => setSysConfig({ ...sysConfig, roomBookingCancelDeadlineHours: Number(e.target.value) })}
                placeholder="2"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Số giờ tối thiểu trước khi ca bắt đầu để được hủy (Mặc định: 2h)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Thời gian đặt trước tối đa (Ngày)
              </label>
              <TextInput
                type="number"
                min="1"
                max="90"
                required
                value={sysConfig.roomBookingAdvanceDays}
                onChange={(e) => setSysConfig({ ...sysConfig, roomBookingAdvanceDays: Number(e.target.value) })}
                placeholder="14"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Giới hạn số ngày tối đa được đặt trước (Mặc định: 14 ngày)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Giới hạn ca đặt phòng / tuần
              </label>
              <TextInput
                type="number"
                min="0"
                max="30"
                required
                value={sysConfig.maxBookingSlotsPerWeek}
                onChange={(e) => setSysConfig({ ...sysConfig, maxBookingSlotsPerWeek: Number(e.target.value) })}
                placeholder="4"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Số ca tối đa 1 sinh viên được đại diện đặt trong 1 tuần (Mặc định: 4 ca)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình vận hành'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 4: SAO LƯU & PHỤC HỒI DỮ LIỆU (SQLITE BACKUP & RESTORE) */}
      <Card
        title={`Backup & Phục hồi dữ liệu (${backupsList.length})`}
        icon={Database}
        style={{ color: 'var(--accent-purple)' }}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={HardDrive}
            iconPosition="left"
            onClick={handleCreateBackup}
            disabled={isBackingUp || !isSuperAdmin}
          >
            {isBackingUp ? 'Đang sao lưu...' : 'Backup ngay'}
          </Button>
        }
      >
        <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Tạo bản sao lưu toàn bộ cơ sở dữ liệu SQLite và phục hồi trạng thái hệ thống khi cần thiết.
        </div>

        {/* Cấu hình Tự động sao lưu & Chính sách lưu giữ (Auto Backup & Retention Policy) */}
        <form onSubmit={handleSaveSysConfig} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Tự động sao lưu (Auto Backup)
              </label>
              <Select
                value={sysConfig.autoBackupEnabled ? 'true' : 'false'}
                onChange={(val) => setSysConfig({ ...sysConfig, autoBackupEnabled: val === 'true' })}
                options={[
                  { value: 'false', label: 'Tắt (Thủ công)' },
                  { value: 'true', label: 'Bật (Tự động)' }
                ]}
                disabled={!isSuperAdmin}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                {sysConfig.autoBackupEnabled ? 'Đang bật theo lịch định kỳ' : 'Đang tắt (chỉ sao lưu khi bấm)'}
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Chu kỳ sao lưu (Giờ)
              </label>
              <TextInput
                type="number"
                min="1"
                max="168"
                required
                value={sysConfig.backupIntervalHours}
                onChange={(e) => setSysConfig({ ...sysConfig, backupIntervalHours: Number(e.target.value) })}
                disabled={!isSuperAdmin || !sysConfig.autoBackupEnabled}
                placeholder="24"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Mặc định: 24 giờ (1 ngày/lần)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Giữ lại tối đa (Bản auto)
              </label>
              <TextInput
                type="number"
                min="1"
                max="100"
                required
                value={sysConfig.backupRetentionCount}
                onChange={(e) => setSysConfig({ ...sysConfig, backupRetentionCount: Number(e.target.value) })}
                disabled={!isSuperAdmin}
                placeholder="7"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Tối đa {sysConfig.backupRetentionCount} bản auto gần nhất
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                iconPosition="left"
                size="md"
                disabled={isSavingConfig || !isSuperAdmin}
                style={{ width: '100%' }}
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình Auto Backup'}
              </Button>
            </div>
          </div>
        </form>

        {backupsList.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Chưa có bản sao lưu nào"
            description="Nhấn 'Backup ngay' để tạo bản sao lưu dữ liệu SQLite đầu tiên cho Lab."
          />
        ) : (
          <DataTable
            data={backupsList}
            columns={backupColumns}
            searchKeys={['filename']}
            searchPlaceholder="Tìm theo tên bản sao lưu..."
          />
        )}
      </Card>

      {/* NHÓM 5: MASTER DATA - DANH MỤC THIẾT BỊ CHUẨN */}
      <Card
        title={`Danh mục thiết bị chuẩn (${catalog.length})`}
        icon={SettingsIcon}
      >
        <DataTable
          data={catalog}
          columns={catalogColumns}
          searchKeys={['name', 'codePrefix', 'category']}
          searchPlaceholder="Tìm theo tên mẫu, mã prefix hoặc phân loại..."
        />
      </Card>

      {/* NHÓM 6: NHẬT KÝ HOẠT ĐỘNG (AUDIT LOGS - VẬN HÀNH & BẢO MẬT) */}
      {isManagerOrAdmin && (
        <Card
          title={`Nhật ký hoạt động hệ thống (${auditPagination.total})`}
          icon={FileText}
          style={{ color: 'var(--accent-blue)' }}
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              iconPosition="left"
              disabled={isValidatingAuditLogs}
              onClick={() => mutateAuditLogs()}
            >
              {isValidatingAuditLogs ? 'Đang tải...' : 'Làm mới'}
            </Button>
          }
        >
          <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Theo dõi chi tiết các thao tác thay đổi dữ liệu, mượn trả, phân quyền, cấu hình và bảo mật trong Lab.
          </div>

          {/* Bộ lọc & Tìm kiếm Audit Log */}
          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Tìm kiếm</label>
                <TextInput
                  type="text"
                  value={auditFilter.search}
                  onChange={(e) => {
                    setAuditFilter({ ...auditFilter, search: e.target.value });
                    setAuditPage(1);
                  }}
                  placeholder="Tên, MSSV hoặc Target ID..."
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Hành động (Action)</label>
                <Select
                  value={auditFilter.action}
                  onChange={(val) => {
                    setAuditFilter({ ...auditFilter, action: val });
                    setAuditPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả hành động' },
                    { value: 'CREATE', label: 'CREATE (Tạo mới)' },
                    { value: 'UPDATE', label: 'UPDATE (Cập nhật)' },
                    { value: 'DELETE', label: 'DELETE (Xóa)' },
                    { value: 'BORROW', label: 'BORROW (Mượn thiết bị)' },
                    { value: 'RETURN', label: 'RETURN (Trả thiết bị)' },
                    { value: 'RESERVE', label: 'RESERVE (Đặt trước)' },
                    { value: 'ISSUE', label: 'ISSUE (Xuất linh kiện)' },
                    { value: 'APPROVE', label: 'APPROVE (Bàn giao)' },
                    { value: 'BACKUP', label: 'BACKUP (Sao lưu)' },
                    { value: 'RESTORE', label: 'RESTORE (Phục hồi)' },
                    { value: 'SETTINGS_CHANGE', label: 'SETTINGS_CHANGE (Đổi cài đặt)' },
                    { value: 'CHECK_IN', label: 'CHECK_IN (Điểm danh)' },
                    { value: 'CHECK_OUT', label: 'CHECK_OUT (Rời Lab)' },
                    { value: 'REGISTER', label: 'REGISTER (Đăng ký ca trực)' },
                    { value: 'CANCEL', label: 'CANCEL (Hủy đăng ký)' },
                    { value: 'MARK_READ', label: 'MARK_READ (Đã xem thông báo)' }
                  ]}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Phân hệ (Target Type)</label>
                <Select
                  value={auditFilter.targetType}
                  onChange={(val) => {
                    setAuditFilter({ ...auditFilter, targetType: val });
                    setAuditPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả phân hệ' },
                    { value: 'equipment', label: 'Thiết bị (Equipment)' },
                    { value: 'component', label: 'Linh kiện (Component)' },
                    { value: 'borrow_ticket', label: 'Phiếu mượn trả (Borrow)' },
                    { value: 'reserve_ticket', label: 'Phiếu đặt trước (Reserve)' },
                    { value: 'maintenance_ticket', label: 'Bảo trì (Maintenance)' },
                    { value: 'room_booking', label: 'Đăng ký phòng (Booking)' },
                    { value: 'room_booking_bulk', label: 'Đặt phòng nhiều buổi' },
                    { value: 'schedule_shift', label: 'Lịch trực (Schedule)' },
                    { value: 'attendance_record', label: 'Điểm danh (Attendance)' },
                    { value: 'rfid_card', label: 'Thẻ RFID (RFID Cards)' },
                    { value: 'notification', label: 'Thông báo (Notification)' },
                    { value: 'user', label: 'Thành viên (Member)' },
                    { value: 'user_points', label: 'Điểm thành viên (Points)' },
                    ...(isSuperAdmin ? [
                      { value: 'system_settings', label: 'Cài đặt hệ thống (Super Admin)' },
                      { value: 'sqlite_database', label: 'Cơ sở dữ liệu SQLite (Super Admin)' }
                    ] : [])
                  ]}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Vai trò (Role)</label>
                <Select
                  value={auditFilter.actorRole}
                  onChange={(val) => {
                    setAuditFilter({ ...auditFilter, actorRole: val });
                    setAuditPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả vai trò' },
                    { value: 'super_admin', label: 'Super Admin' },
                    { value: 'manager', label: 'Manager / Quản lý' },
                    { value: 'student', label: 'Student / Sinh viên' },
                    { value: 'kiosk', label: 'Kiosk Station' },
                    { value: 'system', label: 'System (Tự động)' }
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Từ ngày</label>
                <TextInput
                  type="date"
                  value={auditFilter.dateFrom}
                  onChange={(e) => {
                    setAuditFilter({ ...auditFilter, dateFrom: e.target.value });
                    setAuditPage(1);
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Đến ngày</label>
                <TextInput
                  type="date"
                  value={auditFilter.dateTo}
                  onChange={(e) => {
                    setAuditFilter({ ...auditFilter, dateTo: e.target.value });
                    setAuditPage(1);
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Kết quả</label>
                <Select
                  value={auditFilter.success}
                  onChange={(val) => {
                    setAuditFilter({ ...auditFilter, success: val });
                    setAuditPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'true', label: 'Thành công (Success)' },
                    { value: 'false', label: 'Thất bại (Failed)' }
                  ]}
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setAuditFilter({
                      action: '',
                      targetType: '',
                      actorRole: '',
                      success: '',
                      dateFrom: '',
                      dateTo: '',
                      search: ''
                    });
                    setAuditPage(1);
                  }}
                  style={{ width: '100%' }}
                >
                  Đặt lại bộ lọc
                </Button>
              </div>
            </div>
          </div>

          {/* Table hiển thị Audit Logs */}
          {auditLogsList.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Không tìm thấy nhật ký kiểm toán"
              description="Chưa có hành động nào phù hợp với điều kiện lọc hiện tại."
            />
          ) : (
            <>
              <DataTable
                data={auditLogsList}
                columns={auditColumns}
                hideSearch
              />

              {/* Phân trang Server-side */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-muted)' }}>
                  Trang <strong style={{ color: 'var(--text-primary)' }}>{auditPagination.page}</strong> / <strong>{auditPagination.totalPages || 1}</strong> (Tổng <strong style={{ color: 'var(--text-primary)' }}>{auditPagination.total}</strong> bản ghi)
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage <= 1 || isValidatingAuditLogs}
                    onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage >= auditPagination.totalPages || isValidatingAuditLogs}
                    onClick={() => setAuditPage(prev => prev + 1)}
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* MODAL XÁC NHẬN PHỤC HỒI DỮ LIỆU (RESTORE CONFIRMATION) */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => {
          if (!isRestoring) {
            setShowRestoreModal(false);
            setSelectedBackupToRestore(null);
          }
        }}
        title="Xác nhận phục hồi cơ sở dữ liệu"
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={isRestoring}
              onClick={() => {
                setShowRestoreModal(false);
                setSelectedBackupToRestore(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={RotateCcw}
              iconPosition="left"
              disabled={isRestoring}
              onClick={handleConfirmRestore}
            >
              {isRestoring ? 'Đang phục hồi...' : 'Xác nhận phục hồi'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent-red)' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>Cảnh báo quan trọng:</strong> Hành động này sẽ thay thế toàn bộ dữ liệu hiện tại bằng dữ liệu từ bản sao lưu đã chọn.
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div>Bạn đang chuẩn bị phục hồi từ file:</div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.25rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
              {selectedBackupToRestore?.filename}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Kích thước: {formatFileSize(selectedBackupToRestore?.size)} • Thời gian tạo: {formatTimestamp(selectedBackupToRestore?.createdAt)}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hệ thống sẽ tự động tạo một bản sao lưu an toàn (Safety Backup) của trạng thái hiện tại trước khi tiến hành ghi đè.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddModal}
        onClose={closeModal}
        title={editingItem ? 'Sửa danh mục gốc' : 'Thêm thiết bị vào danh mục gốc'}
        size="md"
        footer={settingsModalFooter}
      >
        <form id="settings-form" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errorMsg && <div className="alert-message alert-error" style={{ margin: 0 }}>{errorMsg}</div>}
            
            <div className="form-group" style={{ margin: 0 }}>
              <label>Tên thiết bị chuẩn</label>
              <TextInput
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Ví dụ: Mỏ hàn JBC CD-2BQF"
              />
            </div>

            <div className="grid-2col" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mã Prefix (Ví dụ: JBC)</label>
                <TextInput
                  type="text"
                  required
                  value={form.codePrefix}
                  onChange={(e) => setForm({...form, codePrefix: e.target.value})}
                  placeholder="JBC"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Tuổi thọ dự kiến (giờ)</label>
                <TextInput
                  type="number"
                  min="1"
                  required
                  value={form.lifespanHours}
                  onChange={(e) => setForm({...form, lifespanHours: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid-2col" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Danh mục</label>
                <Select
                  value={form.category}
                  onChange={(val) => setForm({...form, category: val})}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Hạng mục quản lý</label>
                <Select
                  value={form.assetType}
                  onChange={(val) => setForm({...form, assetType: val})}
                  options={ASSET_TYPES.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Mô tả thêm (Tùy chọn)</label>
              <TextInput
                type="text"
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Mô tả tóm tắt"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL XEM CHI TIẾT AUDIT LOG (AUDIT LOG DETAIL) */}
      <Modal
        isOpen={showAuditDetailModal}
        onClose={() => {
          setShowAuditDetailModal(false);
          setSelectedAuditDetail(null);
        }}
        title="Chi tiết Nhật ký kiểm toán"
        size="lg"
        footer={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowAuditDetailModal(false);
              setSelectedAuditDetail(null);
            }}
          >
            Đóng
          </Button>
        }
      >
        {selectedAuditDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Thời gian</span>
                <strong>{formatTimestamp(selectedAuditDetail.createdAt)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Hành động</span>
                <div>{renderActionBadge(selectedAuditDetail.action)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Phân hệ</span>
                <strong>{selectedAuditDetail.targetType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Trạng thái</span>
                <strong style={{ color: selectedAuditDetail.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {selectedAuditDetail.success ? 'Thành công' : 'Thất bại'}
                </strong>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Người thực hiện (Actor)</div>
              <div><strong>{selectedAuditDetail.actorName || 'System'}</strong> (Vai trò: {selectedAuditDetail.actorRole || 'N/A'}{selectedAuditDetail.actorMssv ? ` • MSSV: ${selectedAuditDetail.actorMssv}` : ''})</div>
              {selectedAuditDetail.targetId && (
                <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  Target ID: {selectedAuditDetail.targetId}
                </div>
              )}
            </div>

            {/* Dữ liệu thay đổi: oldValue / newValue */}
            {(selectedAuditDetail.oldValue || selectedAuditDetail.newValue) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {selectedAuditDetail.oldValue && (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.4rem', color: 'var(--accent-amber)' }}>Giá trị trước (Old Value):</div>
                    <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '220px' }}>
                      {typeof selectedAuditDetail.oldValue === 'object' ? JSON.stringify(selectedAuditDetail.oldValue, null, 2) : String(selectedAuditDetail.oldValue)}
                    </pre>
                  </div>
                )}
                {selectedAuditDetail.newValue && (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.4rem', color: 'var(--accent-green)' }}>Giá trị mới (New Value):</div>
                    <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '220px' }}>
                      {typeof selectedAuditDetail.newValue === 'object' ? JSON.stringify(selectedAuditDetail.newValue, null, 2) : String(selectedAuditDetail.newValue)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Metadata nếu có */}
            {selectedAuditDetail.metadata && Object.keys(selectedAuditDetail.metadata).length > 0 && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.4rem', color: 'var(--accent-blue)' }}>Thông tin bổ sung (Metadata):</div>
                <pre style={{ margin: 0, padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '180px' }}>
                  {typeof selectedAuditDetail.metadata === 'object' ? JSON.stringify(selectedAuditDetail.metadata, null, 2) : String(selectedAuditDetail.metadata)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
