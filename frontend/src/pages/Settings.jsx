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
import TimePicker24 from '../components/TimePicker24';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function Settings() {
  const { data: catalog, mutate } = useSWR(`${API_BASE_URL}/settings/catalog`, fetcher);
  const { data: systemSettings, mutate: mutateSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCatalog, setDeletingCatalog] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // System Settings state phân theo các nhóm
  const [sysConfig, setSysConfig] = useState({
    // Nhóm Module Toggles
    enableRoomBooking: 'true',
    enableRFID: 'true',
    enableKiosk: 'true',
    enableMaintenance: 'true',
    enableDepreciation: 'true',
    enableSchedule: 'true',
    enableAssetOverview: 'true',
    // Nhóm 1: Mượn trả & Kho
    defaultBorrowDays: 7,
    defaultReturnTime: '17:00',
    defaultLowStockThreshold: 0,
    defaultLifespanHours: 10000,
    maintenanceWarningPercent: 20,
    reserveAutoExpireHours: 2,
    reserveAdvanceNoticeMinutes: 29,
    // Nhóm 2: Trực Lab & Điểm thưởng Chuyên cần Sinh viên
    enableStudentPoints: 'true',
    attendanceMinHours: 1.0,
    attendanceStandardPoints: 5,
    attendanceShortPoints: 2,
    taskDefaultPoints: 10,
    attendanceBonusWeekend: 1.5,
    // Nhóm 2.5: Điểm Tín Nhiệm & Phân Cấp Thiết Bị (Access Control List)
    defaultScore: 100,
    borrowLockThreshold: 80,
    level1MinScore: 80,
    level2MinScore: 101,
    level3MinScore: 151,
    weeklyPointCap: 20,
    guestCleanupDays: 120,
    // Nhóm 2.6: Chính sách Mượn thiết bị cho Sinh viên ngoài CLB (Guest Policy)
    enableGuestBorrowing: 'true',
    allowMemberSponsor: 'true',
    maxActiveGuaranteesPerMember: 1,
    sponsorMinScore: 80,
    allowGuestDeposit: 'true',
    guestOverdueFinePerDay: 15000,
    // Nhóm 3: Vận hành, Bảng điều khiển & Thông báo
    adminPassword: '',
    dashboardDefaultTimeRange: '7_days',
    dashboardTopItemsCount: 5,
    maxNotificationHistory: 500,
    notifyBorrowEquipment: 'true',
    notifyReturnEquipment: 'true',
    notifyRoomBooking: 'true',
    notifyMaintenanceAlert: 'true',
    rfidScanCooldownSeconds: 5,
    defaultLabLocation: 'Kho Lab',
    kioskIdleTimeoutSeconds: 30,
    // Nhóm 4: Tự động sao lưu & Lưu trữ
    autoBackupEnabled: false,
    backupIntervalHours: 24,
    backupRetentionCount: 7,
    // Nhóm 5: Chính sách Đặt phòng Lab (Room Booking Policy)
    roomBookingCancelDeadlineHours: 2,
    roomBookingAdvanceDays: 14,
    maxBookingSlotsPerWeek: 4,
    // Nhóm 6: Cấu hình Ca Phòng Lab
    slot_morning_1_start: '07:00',
    slot_morning_1_end: '09:00',
    slot_morning_2_start: '09:00',
    slot_morning_2_end: '11:00',
    slot_afternoon_1_start: '12:00',
    slot_afternoon_1_end: '14:00',
    slot_afternoon_2_start: '14:00',
    slot_afternoon_2_end: '16:00',
    slot_evening_1_start: '16:00',
    slot_evening_1_end: '18:00',
    slot_evening_2_start: '18:00',
    slot_evening_2_end: '20:00'
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  useEffect(() => {
    if (systemSettings) {
      setSysConfig(prev => ({
        ...prev,
        // Module toggles
        enableRoomBooking: systemSettings.enableRoomBooking ?? 'true',
        enableRFID: systemSettings.enableRFID ?? 'true',
        enableKiosk: systemSettings.enableKiosk ?? 'true',
        enableMaintenance: systemSettings.enableMaintenance ?? 'true',
        enableDepreciation: systemSettings.enableDepreciation ?? 'true',
        enableSchedule: systemSettings.enableSchedule ?? 'true',
        enableAssetOverview: systemSettings.enableAssetOverview ?? 'true',
        // Nhóm 1: Mượn trả & Kho
        defaultBorrowDays: systemSettings.defaultBorrowDays ?? 7,
        defaultReturnTime: systemSettings.defaultReturnTime ?? '17:00',
        defaultLowStockThreshold: systemSettings.defaultLowStockThreshold ?? 0,
        defaultLifespanHours: systemSettings.defaultLifespanHours ?? 10000,
        maintenanceWarningPercent: systemSettings.maintenanceWarningPercent ?? 20,
        reserveAutoExpireHours: Number(systemSettings.reserveAutoExpireHours) ?? 2,
        reserveAdvanceNoticeMinutes: Number(systemSettings.reserveAdvanceNoticeMinutes) ?? 29,
        // Nhóm 2: Trực Lab & Điểm thưởng Chuyên cần
        enableStudentPoints: systemSettings.enableStudentPoints ?? 'true',
        attendanceMinHours: systemSettings.attendanceMinHours ?? 1.0,
        attendanceStandardPoints: systemSettings.attendanceStandardPoints ?? 5,
        attendanceShortPoints: systemSettings.attendanceShortPoints ?? 2,
        taskDefaultPoints: systemSettings.taskDefaultPoints ?? 10,
        attendanceBonusWeekend: Number(systemSettings.attendanceBonusWeekend) || 1.5,
        // Nhóm 2.5: Điểm Tín Nhiệm & Phân Cấp Thiết Bị
        defaultScore: Number(systemSettings.defaultScore) || 100,
        borrowLockThreshold: Number(systemSettings.borrowLockThreshold) || 80,
        level1MinScore: Number(systemSettings.level1MinScore) || 80,
        level2MinScore: Number(systemSettings.level2MinScore) || 101,
        level3MinScore: Number(systemSettings.level3MinScore) || 151,
        weeklyPointCap: Number(systemSettings.weeklyPointCap) || 20,
        guestCleanupDays: Number(systemSettings.guestCleanupDays) || 120,
        // Nhóm 2.6: Chính sách Mượn thiết bị cho Sinh viên ngoài CLB (Guest Policy)
        enableGuestBorrowing: systemSettings.enableGuestBorrowing ?? 'true',
        allowMemberSponsor: systemSettings.allowMemberSponsor ?? 'true',
        maxActiveGuaranteesPerMember: Number(systemSettings.maxActiveGuaranteesPerMember) || 1,
        sponsorMinScore: Number(systemSettings.sponsorMinScore) || 80,
        allowGuestDeposit: systemSettings.allowGuestDeposit ?? 'true',
        guestOverdueFinePerDay: Number(systemSettings.guestOverdueFinePerDay) || 15000,
        // Nhóm 3: Vận hành, Bảng điều khiển & Thông báo
        dashboardDefaultTimeRange: systemSettings.dashboardDefaultTimeRange ?? '7_days',
        dashboardTopItemsCount: Number(systemSettings.dashboardTopItemsCount) || 5,
        maxNotificationHistory: systemSettings.maxNotificationHistory ?? 500,
        notifyBorrowEquipment: systemSettings.notifyBorrowEquipment ?? 'true',
        notifyReturnEquipment: systemSettings.notifyReturnEquipment ?? 'true',
        notifyRoomBooking: systemSettings.notifyRoomBooking ?? 'true',
        notifyMaintenanceAlert: systemSettings.notifyMaintenanceAlert ?? 'true',
        rfidScanCooldownSeconds: systemSettings.rfidScanCooldownSeconds ?? 5,
        defaultLabLocation: systemSettings.defaultLabLocation ?? 'Kho Lab',
        kioskIdleTimeoutSeconds: Number(systemSettings.kioskIdleTimeoutSeconds) || 30,
        // Nhóm 4: Sao lưu
        autoBackupEnabled: String(systemSettings.autoBackupEnabled) === 'true' || systemSettings.autoBackupEnabled === true,
        backupIntervalHours: Number(systemSettings.backupIntervalHours) || 24,
        backupRetentionCount: Number(systemSettings.backupRetentionCount) || 7,
        // Nhóm 5: Đặt phòng
        roomBookingCancelDeadlineHours: Number(systemSettings.roomBookingCancelDeadlineHours) || 2,
        roomBookingAdvanceDays: Number(systemSettings.roomBookingAdvanceDays) || 14,
        maxBookingSlotsPerWeek: Number(systemSettings.maxBookingSlotsPerWeek) || 4,
        // Nhóm 6: Ca giờ phòng lab
        slot_morning_1_start: systemSettings.slot_morning_1_start ?? '07:00',
        slot_morning_1_end: systemSettings.slot_morning_1_end ?? '09:00',
        slot_morning_2_start: systemSettings.slot_morning_2_start ?? '09:00',
        slot_morning_2_end: systemSettings.slot_morning_2_end ?? '11:00',
        slot_afternoon_1_start: systemSettings.slot_afternoon_1_start ?? '12:00',
        slot_afternoon_1_end: systemSettings.slot_afternoon_1_end ?? '14:00',
        slot_afternoon_2_start: systemSettings.slot_afternoon_2_start ?? '14:00',
        slot_afternoon_2_end: systemSettings.slot_afternoon_2_end ?? '16:00',
        slot_evening_1_start: systemSettings.slot_evening_1_start ?? '16:00',
        slot_evening_1_end: systemSettings.slot_evening_1_end ?? '18:00',
        slot_evening_2_start: systemSettings.slot_evening_2_start ?? '18:00',
        slot_evening_2_end: systemSettings.slot_evening_2_end ?? '20:00',
        // Nhóm 7: Báo cáo Ca phòng & Bảo trì
        autoCreateMaintenanceOnIssue: systemSettings.autoCreateMaintenanceOnIssue ?? 'true',
        requireCheckoutChecklist: systemSettings.requireCheckoutChecklist ?? 'true',
        allowReportEdit: systemSettings.allowReportEdit ?? 'true',
        allowWalkInExtraAttendees: systemSettings.allowWalkInExtraAttendees ?? 'true'
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
    requiredLevel: 1,
    description: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setForm({
      name: '',
      codePrefix: '',
      category: CATEGORIES[0],
      assetType: ASSET_TYPES[0],
      unit: 'Cái',
      minThreshold: 0,
      lifespanHours: 10000,
      requiredLevel: 1,
      description: ''
    });
  };

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

  const handleDelete = (item) => {
    setDeletingCatalog(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteCatalog = async () => {
    if (!deletingCatalog) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/catalog/${deletingCatalog.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa');
      setSuccessMsg(`Đã xóa "${deletingCatalog.name}" khỏi danh mục gốc`);
      mutate();
      setShowDeleteModal(false);
      setDeletingCatalog(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
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
    { accessorKey: 'requiredLevel', header: 'Cấp độ (ACL)', sortable: true, align: 'center', cell: (row) => {
      const level = Number(row.requiredLevel) || 1;
      const badges = {
        1: { label: '🟢 Cấp 1', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
        2: { label: '🔵 Cấp 2', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' },
        3: { label: '🟣 Cấp 3', bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }
      };
      const badge = badges[level] || badges[1];
      return (
        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: badge.bg, color: badge.color, fontSize: '0.75rem', fontWeight: '600' }}>
          {badge.label}
        </span>
      );
    }},
    { accessorKey: 'lifespanHours', header: 'Tuổi thọ dự kiến', sortable: true, align: 'center', cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)' }}>
        <Clock size={14} /> {row.lifespanHours} giờ
      </span>
    )},
    { accessorKey: 'actions', header: 'Thao tác', sortable: false, align: 'right', cell: (row) => (
      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
        <Button variant="secondary" size="sm" onClick={() => setEditingItem(row)}><Edit3 size={15} /></Button>
        <Button variant="danger-tertiary" size="sm" onClick={() => handleDelete(row)}><Trash2 size={15} /></Button>
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
          <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowAddModal(true)}>
            Thêm danh mục gốc
          </Button>
        </div>
      </div>

      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      {/* NHÓM 0: BẬT/TẮT MODULE CHỨC NĂNG */}
      <Card
        title="Bật / Tắt Module Chức Năng"
        icon={Sliders}
        style={{ color: 'var(--accent-purple)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Tắt module sẽ ẩn toàn bộ menu liên quan khỏi Sidebar và chặn truy cập trang đó. Tất cả dữ liệu vẫn được giữ nguyên.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { key: 'enableRoomBooking',  label: 'Phòng Lab (Đặt phòng & Lịch sử)', color: 'var(--accent-blue)' },
              { key: 'enableRFID',         label: 'Thẻ RFID (Quản lý thẻ & Lịch sử)', color: 'var(--accent-green)' },
              { key: 'enableKiosk',        label: 'Kiosk (Màn hình tự phục vụ)',       color: 'var(--accent-amber)' },
              { key: 'enableMaintenance',  label: 'Bảo trì thiết bị',                  color: 'var(--accent-red)' },
              { key: 'enableDepreciation', label: 'Khấu hao & Dự báo thay thế',        color: 'var(--accent-purple)' },
              { key: 'enableSchedule',     label: 'Lịch trực Lab',                     color: 'var(--accent-teal, #14b8a6)' },
              { key: 'enableAssetOverview',label: 'Tổng quan Tài sản',                 color: 'var(--accent-blue)' },
            ].map(({ key, label, color }) => {
              const isOn = String(sysConfig[key]) !== 'false';
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isOn ? 'var(--bg-secondary)' : 'var(--bg-overlay)',
                    border: `1px solid ${isOn ? color : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isOn ? 1 : 0.65,
                  }}
                  onClick={() => setSysConfig(prev => ({ ...prev, [key]: isOn ? 'false' : 'true' }))}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>{label}</span>
                  {/* Toggle switch */}
                  <div style={{
                    position: 'relative',
                    width: '42px',
                    height: '24px',
                    background: isOn ? color : 'var(--border-color)',
                    borderRadius: '12px',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    marginLeft: '0.75rem'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: isOn ? '21px' : '3px',
                      width: '18px',
                      height: '18px',
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình module'}
            </Button>
          </div>
        </form>
      </Card>

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
              <TimePicker24
                value={sysConfig.defaultReturnTime || '17:00'}
                onChange={(newTime) => setSysConfig({ ...sysConfig, defaultReturnTime: newTime })}
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

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Tự động hủy phiếu đặt trước (Giờ)
              </label>
              <TextInput
                type="number"
                min="0"
                max="72"
                required
                value={sysConfig.reserveAutoExpireHours}
                onChange={(e) => setSysConfig({ ...sysConfig, reserveAutoExpireHours: Number(e.target.value) })}
                placeholder="2"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Tự động hủy & hoàn kho nếu quá giờ hẹn (0: Tắt, Mặc định: 2h)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Thời gian đặt trước tối thiểu (Phút)
              </label>
              <TextInput
                type="number"
                min="0"
                max="1440"
                required
                value={sysConfig.reserveAdvanceNoticeMinutes}
                onChange={(e) => setSysConfig({ ...sysConfig, reserveAdvanceNoticeMinutes: Number(e.target.value) })}
                placeholder="29"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Khóa giờ mượn trong vòng X phút tới để CLB chuẩn bị (Mặc định: 29p)
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

      {/* NHÓM 2: TRỰC LAB & ĐIỂM THƯỞNG CHUYÊN CẦN SINH VIÊN */}
      <Card
        title="Chính sách Trực Lab & Điểm thưởng Chuyên cần Sinh viên"
        icon={Tag}
        style={{ color: 'var(--accent-amber)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          {/* Toggle Bật/Tắt tích lũy điểm cho sinh viên */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: sysConfig.enableStudentPoints !== 'false' ? 'rgba(245,158,11,0.08)' : 'var(--bg-overlay)',
              border: `1px solid ${sysConfig.enableStudentPoints !== 'false' ? 'var(--accent-amber)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              marginBottom: '1.25rem',
              transition: 'all 0.2s'
            }}
            onClick={() => setSysConfig(prev => ({ ...prev, enableStudentPoints: prev.enableStudentPoints !== 'false' ? 'false' : 'true' }))}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Tự động tích lũy điểm chuyên cần cho sinh viên
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Hệ thống tự động cộng điểm khi sinh viên trực Lab hoặc hoàn thành task (Quản lý/Admin không cần tích lũy điểm)
              </div>
            </div>
            <div style={{
              position: 'relative',
              width: '42px',
              height: '24px',
              background: sysConfig.enableStudentPoints !== 'false' ? 'var(--accent-amber)' : 'var(--border-color)',
              borderRadius: '12px',
              transition: 'background 0.2s',
              flexShrink: 0
            }}>
              <div style={{
                position: 'absolute',
                top: '3px',
                left: sysConfig.enableStudentPoints !== 'false' ? '21px' : '3px',
                width: '18px',
                height: '18px',
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
          </div>

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

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Hệ số nhân ca tối / cuối tuần
              </label>
              <TextInput
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                required
                value={sysConfig.attendanceBonusWeekend || 1.5}
                onChange={(e) => setSysConfig({ ...sysConfig, attendanceBonusWeekend: Number(e.target.value) })}
                placeholder="1.5"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Nhân hệ số điểm khi trực ca muộn / T7-CN (Mặc định: x1.5)
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
              {isSavingConfig ? 'Đang lưu...' : 'Lưu chính sách điểm chuyên cần'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 2.5: ĐIỂM TÍN NHIỆM & PHÂN CẤP THIẾT BỊ (ACCESS CONTROL LIST) */}
      <Card
        title="Hệ thống Điểm Tín Nhiệm & Phân Cấp Thiết Bị (Access Control List)"
        icon={Sliders}
        style={{ color: 'var(--accent-purple)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Cấu hình hạn mức điểm tín nhiệm, cơ chế phân cấp thiết bị 3 Cấp độ, ngưỡng khóa quyền mượn, và thời gian dọn dẹp tài khoản sinh viên theo học kỳ.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Điểm khởi tạo (Thành viên mới)
              </label>
              <TextInput
                type="number"
                min="50"
                max="200"
                required
                value={sysConfig.defaultScore}
                onChange={(e) => setSysConfig({ ...sysConfig, defaultScore: Number(e.target.value) })}
                placeholder="100"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Điểm cấp tự động khi quẹt thẻ lần đầu (Mặc định: 100đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--accent-red)' }}>
                Ngưỡng khóa quyền mượn (Điểm)
              </label>
              <TextInput
                type="number"
                min="1"
                max="100"
                required
                value={sysConfig.borrowLockThreshold}
                onChange={(e) => setSysConfig({ ...sysConfig, borrowLockThreshold: Number(e.target.value) })}
                placeholder="80"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Dưới mức này sẽ bị khóa nút Mượn (Mặc định: &lt; 80đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--accent-green)' }}>
                Điểm tối thiểu Cấp 1
              </label>
              <TextInput
                type="number"
                min="1"
                max="200"
                required
                value={sysConfig.level1MinScore}
                onChange={(e) => setSysConfig({ ...sysConfig, level1MinScore: Number(e.target.value) })}
                placeholder="80"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Cáp, breadboard, cảm biến... (Mặc định: &ge; 80đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--accent-blue)' }}>
                Điểm tối thiểu Cấp 2
              </label>
              <TextInput
                type="number"
                min="1"
                max="300"
                required
                value={sysConfig.level2MinScore}
                onChange={(e) => setSysConfig({ ...sysConfig, level2MinScore: Number(e.target.value) })}
                placeholder="101"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Kit vi điều khiển, mỏ hàn, đồng hồ đo... (Mặc định: 101 - 150đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--accent-purple)' }}>
                Điểm tối thiểu Cấp 3
              </label>
              <TextInput
                type="number"
                min="1"
                max="500"
                required
                value={sysConfig.level3MinScore}
                onChange={(e) => setSysConfig({ ...sysConfig, level3MinScore: Number(e.target.value) })}
                placeholder="151"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Máy hiện sóng, máy in 3D, nguồn DC... (Mặc định: &gt; 150đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--accent-amber)' }}>
                Trần điểm cộng tuần (Point Cap)
              </label>
              <TextInput
                type="number"
                min="5"
                max="100"
                required
                value={sysConfig.weeklyPointCap}
                onChange={(e) => setSysConfig({ ...sysConfig, weeklyPointCap: Number(e.target.value) })}
                placeholder="20"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Tối đa điểm cộng/tuần chống lạm phát (Mặc định: +20đ)
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Dọn dẹp sinh viên theo học kỳ (Ngày)
              </label>
              <TextInput
                type="number"
                min="30"
                max="365"
                required
                value={sysConfig.guestCleanupDays}
                onChange={(e) => setSysConfig({ ...sysConfig, guestCleanupDays: Number(e.target.value) })}
                placeholder="120"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Xóa sinh viên vãng lai không hoạt động sau X ngày (Mặc định: 120 ngày)
              </span>
            </div>
          </div>

          {/* Bảng cấu hình 13 Quy tắc hành vi: Tự động vs Giáo viên duyệt */}
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} style={{ color: 'var(--accent-purple)' }} /> Cấu hình Chế độ Thực thi 13 Quy tắc Hành vi (Tự động vs Giáo viên duyệt)
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Tùy chỉnh hành vi nào được hệ thống tự động cộng/trừ điểm và hành vi nào cần Giáo viên / Quản trị viên duyệt xác nhận.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
              {/* CỘNG ĐIỂM */}
              <div style={{ padding: '0.85rem', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-green)' }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent-green)', marginBottom: '0.75rem' }}>🟢 6 Hành vi Cộng Điểm Khuyến khích</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { key: 'rule_mode_return_ontime', label: '+2đ: Trả thiết bị đúng hạn & nguyên vẹn', defaultMode: 'auto' },
                    { key: 'rule_mode_checkin_ontime', label: '+3đ: Check-in ca trực đúng giờ', defaultMode: 'auto' },
                    { key: 'rule_mode_lab_cleanup', label: '+5đ: Tham gia dọn dẹp vệ sinh Lab', defaultMode: 'manual' },
                    { key: 'rule_mode_bounty_task', label: '+15đ: Hoàn thành nhiệm vụ phục hồi điểm', defaultMode: 'manual' },
                    { key: 'rule_mode_tech_support', label: '+10đ: Hỗ trợ kỹ thuật / Sửa chữa thiết bị', defaultMode: 'manual' },
                    { key: 'rule_mode_doc_contribution', label: '+10đ: Đóng góp tài liệu / Code cho Lab', defaultMode: 'manual' }
                  ].map(rule => {
                    const currentMode = sysConfig[rule.key] || rule.defaultMode;
                    return (
                      <div key={rule.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)', flex: 1, paddingRight: '0.5rem' }}>{rule.label}</span>
                        <select
                          value={currentMode}
                          onChange={(e) => setSysConfig({ ...sysConfig, [rule.key]: e.target.value })}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: currentMode === 'auto' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: currentMode === 'auto' ? 'var(--accent-green)' : 'var(--accent-blue)',
                            border: `1px solid ${currentMode === 'auto' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="auto">⚡ Tự động</option>
                          <option value="manual">👨‍🏫 GV duyệt</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TRỪ ĐIỂM */}
              <div style={{ padding: '0.85rem', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-red)' }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>🔴 7 Hành vi Trừ Điểm Vi phạm</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { key: 'rule_mode_late_return', label: '-5đ/ngày: Quá hạn trả thiết bị (Lũy tiến)', defaultMode: 'auto' },
                    { key: 'rule_mode_noshow_shift', label: '-15đ: Bỏ ca trực không phép / Check-in ảo', defaultMode: 'manual' },
                    { key: 'rule_mode_dirty_accessories', label: '-10đ: Trả thiết bị bẩn / Thiếu phụ kiện', defaultMode: 'manual' },
                    { key: 'rule_mode_misuse', label: '-20đ: Sử dụng thiết bị sai mục đích Lab', defaultMode: 'manual' },
                    { key: 'rule_mode_share_account', label: '-20đ: Cho người khác mượn ké tài khoản', defaultMode: 'manual' },
                    { key: 'rule_mode_damage_loss', label: '-40đ: Làm hỏng hóc hoặc mất mát thiết bị', defaultMode: 'manual' },
                    { key: 'rule_mode_report_bug', label: '+3đ: Phát hiện & báo cáo sớm lỗi thiết bị', defaultMode: 'manual' }
                  ].map(rule => {
                    const currentMode = sysConfig[rule.key] || rule.defaultMode;
                    return (
                      <div key={rule.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)', flex: 1, paddingRight: '0.5rem' }}>{rule.label}</span>
                        <select
                          value={currentMode}
                          onChange={(e) => setSysConfig({ ...sysConfig, [rule.key]: e.target.value })}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: currentMode === 'auto' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: currentMode === 'auto' ? 'var(--accent-red)' : 'var(--accent-blue)',
                            border: `1px solid ${currentMode === 'auto' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="auto">⚡ Tự động</option>
                          <option value="manual">👨‍🏫 GV duyệt</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình điểm & ACL'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 2.6: CHÍNH SÁCH MƯỢN THIẾT BỊ CHO SINH VIÊN NGOÀI CLB */}
      <Card
        title="Chính sách Mượn thiết bị cho Sinh viên ngoài CLB (Guest Policy)"
        icon={ShieldAlert}
        style={{ color: 'var(--accent-purple)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Quy định các cơ chế kiểm soát rủi ro, bảo lãnh, ký quỹ và bảng chế tài vi phạm áp dụng riêng cho sinh viên vãng lai không có điểm tích lũy hệ thống.
          </p>

          {/* Toggle Bật/Tắt mượn thiết bị cho khách */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: sysConfig.enableGuestBorrowing !== 'false' ? 'rgba(168,85,247,0.08)' : 'var(--bg-overlay)',
              border: `1px solid ${sysConfig.enableGuestBorrowing !== 'false' ? 'var(--accent-purple)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              marginBottom: '1.25rem',
              transition: 'all 0.2s'
            }}
            onClick={() => setSysConfig(prev => ({ ...prev, enableGuestBorrowing: prev.enableGuestBorrowing !== 'false' ? 'false' : 'true' }))}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Cho phép sinh viên ngoài CLB mượn / sử dụng thiết bị
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Bật/tắt toàn bộ tính năng tiếp nhận đơn mượn từ sinh viên ngoài CLB (Guest Accounts)
              </div>
            </div>
            <div style={{
              position: 'relative',
              width: '42px',
              height: '24px',
              background: sysConfig.enableGuestBorrowing !== 'false' ? 'var(--accent-purple)' : 'var(--border-color)',
              borderRadius: '12px',
              transition: 'background 0.2s',
              flexShrink: 0
            }}>
              <div style={{
                position: 'absolute',
                top: '3px',
                left: sysConfig.enableGuestBorrowing !== 'false' ? '21px' : '3px',
                width: '18px',
                height: '18px',
                background: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Cấu hình Phương án A */}
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛡️ Phương án A: Bảo lãnh qua Thành viên CLB
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Sinh viên ngoài CLB mượn đồ phải có thành viên chính thức bảo lãnh. Trách nhiệm đền bù và điểm số tính trực tiếp vào tài khoản người bảo lãnh.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>
                    Điểm uy tín tối thiểu để bảo lãnh
                  </label>
                  <TextInput
                    type="number"
                    min="80"
                    max="200"
                    value={sysConfig.sponsorMinScore}
                    onChange={(e) => setSysConfig({ ...sysConfig, sponsorMinScore: Number(e.target.value) })}
                    placeholder="80"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Chỉ thành viên có điểm $\ge$ ngưỡng này mới được bảo lãnh (Mặc định: 80đ)
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>
                    Số đơn bảo lãnh tối đa cùng lúc / thành viên
                  </label>
                  <TextInput
                    type="number"
                    min="1"
                    max="5"
                    value={sysConfig.maxActiveGuaranteesPerMember}
                    onChange={(e) => setSysConfig({ ...sysConfig, maxActiveGuaranteesPerMember: Number(e.target.value) })}
                    placeholder="1"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Giới hạn 1 đơn/thành viên để tránh nể nang nhận bảo lãnh hộ bừa bãi (Mặc định: 1 đơn)
                  </span>
                </div>
              </div>
            </div>

            {/* Cấu hình Phương án B & Chế tài tiền mặt */}
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-amber)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💵 Phương án B & Mức phạt Tiền mặt
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Ký quỹ tiền đặt cọc hiện vật hoặc giữ Thẻ SV / CCCD gốc tại Ban chủ nhiệm trong suốt thời gian mượn.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>
                    Mức phạt trả trễ hạn (VNĐ / Ngày)
                  </label>
                  <TextInput
                    type="number"
                    step="5000"
                    min="5000"
                    max="100000"
                    value={sysConfig.guestOverdueFinePerDay}
                    onChange={(e) => setSysConfig({ ...sysConfig, guestOverdueFinePerDay: Number(e.target.value) })}
                    placeholder="15000"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Phạt tiền nộp vào quỹ CLB nếu trả trễ hạn (Mặc định: 15.000đ/ngày)
                  </span>
                </div>

                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: sysConfig.allowGuestDeposit !== 'false' ? 'rgba(245,158,11,0.08)' : 'var(--bg-overlay)',
                    border: `1px solid ${sysConfig.allowGuestDeposit !== 'false' ? 'var(--accent-amber)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    marginTop: '0.35rem'
                  }}
                  onClick={() => setSysConfig(prev => ({ ...prev, allowGuestDeposit: prev.allowGuestDeposit !== 'false' ? 'false' : 'true' }))}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Cho phép Ký quỹ tiền mặt / Giữ Thẻ SV
                  </div>
                  <div style={{
                    width: '36px',
                    height: '20px',
                    background: sysConfig.allowGuestDeposit !== 'false' ? 'var(--accent-amber)' : 'var(--border-color)',
                    borderRadius: '10px',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: sysConfig.allowGuestDeposit !== 'false' ? '18px' : '2px',
                      width: '16px',
                      height: '16px',
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG QUY ĐỔI / XỬ LÝ VI PHẠM DÀNH CHO SINH VIÊN NGOÀI CLB */}
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ Bảng Quy Chế / Xử lý Vi phạm Dành cho Sinh viên Ngoài CLB
            </div>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'var(--bg-overlay)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', width: '35%', color: 'var(--text-primary)' }}>Tình huống phát sinh</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>Hình thức xử lý & Chế tài</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--accent-amber)' }}>Trả thiết bị trễ hạn</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    Phạt tiền mặt theo quy định quỹ CLB ({Number(sysConfig.guestOverdueFinePerDay || 15000).toLocaleString('vi-VN')}đ/ngày) hoặc báo cáo về Khoa/Giám thị phụ trách nếu quá 3 ngày.
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--accent-red)' }}>Làm hỏng / Mất thiết bị</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    Buộc đền bù 100% giá trị thiết bị theo giá thị trường hiện tại; trường hợp không hợp tác sẽ gửi danh sách về Đoàn Thanh niên / Khoa quản lý sinh viên.
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--accent-purple)' }}>Mang thiết bị ra khỏi Lab không phép</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    Khóa vĩnh viễn quyền ra vào phòng Lab, thông báo vi phạm kỷ luật cấp Khoa/Trường.
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Lưu ý thực tế & Mô hình Open Labs / MakerSpace */}
            <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: '700', color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>
                🔗 Mô hình tham khảo: MakerSpace / Open Labs Policy
              </div>
              <div>
                Áp dụng cơ chế <em>"External User Agreement"</em> kết hợp lưu số định danh / scan CCCD gốc và phân định trách nhiệm 1:1 với người bảo lãnh nội bộ để kiểm soát rủi ro thất thoát tài sản tuyệt đối.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu chính sách khách ngoài CLB'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 3: VẬN HÀNH, BẢNG ĐIỀU KHIỂN & THÔNG BÁO */}
      <Card
        title="Vận hành Hệ thống, Bảng điều khiển & Thông báo"
        icon={SettingsIcon}
        style={{ color: 'var(--accent-green)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Mốc thời gian mặc định (Dashboard)
              </label>
              <Select
                value={sysConfig.dashboardDefaultTimeRange || '7_days'}
                onChange={(val) => setSysConfig({ ...sysConfig, dashboardDefaultTimeRange: val })}
                options={[
                  { value: '7_days', label: '7 ngày qua' },
                  { value: '30_days', label: '30 ngày qua' },
                  { value: '3_months', label: '3 tháng gần nhất' },
                  { value: '6_months', label: '6 tháng gần nhất' },
                  { value: 'all', label: 'Toàn thời gian' }
                ]}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Thời gian hiển thị mặc định trên Bảng điều khiển
              </span>
            </div>

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
                Chỉ nhập khi muốn đổi mật khẩu đăng nhập Quản lý
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
                Tên vị trí kho thiết bị khi thêm mới
              </span>
            </div>
          </div>

          {/* Cấu hình các loại thông báo tự động */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block', color: 'var(--text-secondary)' }}>
              CÁC SỰ KIỆN PHÁT THÔNG BÁO REALTIME:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {[
                { key: 'notifyBorrowEquipment', label: 'Mượn thiết bị & Xuất linh kiện', color: 'var(--accent-blue)' },
                { key: 'notifyReturnEquipment', label: 'Hoàn trả thiết bị & Kiểm tra', color: 'var(--accent-green)' },
                { key: 'notifyRoomBooking', label: 'Đăng ký ca phòng & Điểm danh', color: 'var(--accent-purple)' },
                { key: 'notifyMaintenanceAlert', label: 'Báo hỏng & Lịch bảo trì', color: 'var(--accent-red)' },
              ].map(item => {
                const isOn = sysConfig[item.key] !== 'false';
                return (
                  <div
                    key={item.key}
                    onClick={() => setSysConfig(prev => ({ ...prev, [item.key]: isOn ? 'false' : 'true' }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: isOn ? 'var(--bg-secondary)' : 'var(--bg-overlay)',
                      border: `1px solid ${isOn ? item.color : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                    <div style={{
                      position: 'relative',
                      width: '36px',
                      height: '20px',
                      background: isOn ? item.color : 'var(--border-color)',
                      borderRadius: '10px',
                      transition: 'background 0.2s',
                      flexShrink: 0
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: isOn ? '18px' : '2px',
                        width: '16px',
                        height: '16px',
                        background: '#fff',
                        borderRadius: '50%',
                        transition: 'left 0.2s'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình vận hành & thông báo'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM 4: CHÍNH SÁCH ĐẶT PHÒNG LAB & KIOSK */}
      <Card
        title="Chính sách Đặt phòng Lab & Màn hình Kiosk"
        icon={Clock}
        style={{ color: 'var(--accent-blue)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>
                Kiosk: Thời gian tự thoát (Giây)
              </label>
              <TextInput
                type="number"
                min="5"
                max="600"
                required
                value={sysConfig.kioskIdleTimeoutSeconds}
                onChange={(e) => setSysConfig({ ...sysConfig, kioskIdleTimeoutSeconds: Number(e.target.value) })}
                placeholder="30"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Tự động về màn hình chờ khi không có thao tác (Mặc định: 30s)
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
              {isSavingConfig ? 'Đang lưu...' : 'Lưu chính sách đặt phòng & kiosk'}
            </Button>
          </div>
        </form>
      </Card>

      {/* NHÓM: QUY ĐỊNH BÁO CÁO CA PHÒNG & BIÊN BẢN BÀN GIAO */}
      <Card
        title="Quy định Báo cáo Ca phòng & Biên bản Bàn giao"
        icon={ShieldAlert}
        style={{ color: 'var(--accent-amber)' }}
      >
        <form onSubmit={handleSaveSysConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              {
                key: 'autoCreateMaintenanceOnIssue',
                label: 'Tự động tạo phiếu Bảo trì khi báo hỏng',
                desc: 'Tự động đẩy thiết bị báo hỏng sang tab Bảo trì & gửi thông báo cho quản lý'
              },
              {
                key: 'requireCheckoutChecklist',
                label: 'Bắt buộc hoàn thành Checklist',
                desc: 'Yêu cầu kiểm tra đủ 3 mục (Vệ sinh, Tắt điện, Khóa cửa) khi nộp báo cáo'
              },
              {
                key: 'allowReportEdit',
                label: 'Cho phép Chỉnh sửa Báo cáo',
                desc: 'Người đại diện hoặc quản lý có thể cập nhật lại báo cáo ca trực sau khi nộp'
              },
              {
                key: 'allowWalkInExtraAttendees',
                label: 'Ghi nhận khách ngoài danh sách',
                desc: 'Ghi nhận và hiển thị sinh viên vãng lai (+ ngoài) khi quẹt thẻ vào phòng'
              }
            ].map(item => {
              const isOn = String(sysConfig[item.key]) === 'true';
              return (
                <div 
                  key={item.key}
                  onClick={() => setSysConfig(prev => ({ ...prev, [item.key]: isOn ? 'false' : 'true' }))}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-overlay)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isOn ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '0.75rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </div>

                  <div style={{
                    position: 'relative',
                    width: '42px',
                    height: '24px',
                    background: isOn ? 'var(--accent-blue)' : 'var(--border-color)',
                    borderRadius: '12px',
                    transition: 'background 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: isOn ? '21px' : '3px',
                      width: '18px',
                      height: '18px',
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              iconPosition="left"
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu quy định báo cáo'}
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

        {/* Cấu hình Ca Phòng Lab */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} style={{ color: 'var(--accent-purple)' }} /> Cấu hình Ca Phòng Lab
          </div>
          <form onSubmit={handleSaveSysConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { startKey: 'slot_morning_1_start',   endKey: 'slot_morning_1_end',   label: 'Ca Sáng 1',   color: '#f59e0b' },
                { startKey: 'slot_morning_2_start',   endKey: 'slot_morning_2_end',   label: 'Ca Sáng 2',   color: '#f59e0b' },
                { startKey: 'slot_afternoon_1_start', endKey: 'slot_afternoon_1_end', label: 'Ca Chiều 1',  color: '#3b82f6' },
                { startKey: 'slot_afternoon_2_start', endKey: 'slot_afternoon_2_end', label: 'Ca Chiều 2',  color: '#3b82f6' },
                { startKey: 'slot_evening_1_start',   endKey: 'slot_evening_1_end',   label: 'Ca Tối 1',    color: '#8b5cf6' },
                { startKey: 'slot_evening_2_start',   endKey: 'slot_evening_2_end',   label: 'Ca Tối 2',    color: '#8b5cf6' },
              ].map(({ startKey, endKey, label, color }) => (
                <div key={startKey} style={{ padding: '0.75rem', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color, marginBottom: '0.6rem' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Bắt đầu</div>
                      <TimePicker24
                        value={sysConfig[startKey]}
                        onChange={(t) => setSysConfig(prev => ({ ...prev, [startKey]: t }))}
                      />
                    </div>
                    <div style={{ color: 'var(--text-muted)', paddingTop: '1.2rem' }}>→</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Kết thúc</div>
                      <TimePicker24
                        value={sysConfig[endKey]}
                        onChange={(t) => setSysConfig(prev => ({ ...prev, [endKey]: t }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                iconPosition="left"
                disabled={isSavingConfig}
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu giờ ca phòng Lab'}
              </Button>
            </div>
          </form>
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
              <label>Cấp độ thiết bị (Access Control List)</label>
              <Select
                value={form.requiredLevel || 1}
                onChange={(val) => setForm({...form, requiredLevel: Number(val)})}
                options={[
                  { value: 1, label: '🟢 Cấp 1 (Từ 80 điểm: Cáp, Breadboard, Cảm biến...)' },
                  { value: 2, label: '🔵 Cấp 2 (Từ 101 - 150 điểm: Kit STM32, ESP32, Mỏ hàn...)' },
                  { value: 3, label: '🟣 Cấp 3 (Trên 150 điểm: Máy hiện sóng, Máy in 3D, Nguồn DC...)' }
                ]}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Chỉ thành viên đạt đủ điểm tín nhiệm mới nhìn thấy và mượn được thiết bị này.
              </span>
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
        size="xl"
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

      {/* Confirm Delete Catalog Item Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingCatalog(null); }}
        onConfirm={handleConfirmDeleteCatalog}
        title="Xác nhận xóa danh mục gốc"
        itemName={deletingCatalog?.name}
        itemCode={deletingCatalog?.codePrefix ? `Prefix: ${deletingCatalog.codePrefix}` : ''}
        itemCategory={deletingCatalog?.category ? `Phân loại: ${deletingCatalog.category}` : ''}
        warningMessage="Mục danh mục gốc này sẽ bị xóa. Các thiết bị hiện tại vẫn giữ nguyên nhưng sẽ không còn gợi ý tự động khi tạo mới!"
        confirmText="Xác nhận xóa danh mục"
        isDeleting={isDeleting}
      />
    </div>
  );
}
