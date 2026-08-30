import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Settings as SettingsIcon, Tag, Clock, Sliders, Save, CheckCircle2 } from 'lucide-react';
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
    defaultLabLocation: 'Kho Lab'
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
        defaultLabLocation: systemSettings.defaultLabLocation ?? 'Kho Lab'
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

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setForm({
      name: '',
      codePrefix: '',
      category: 'Thiết bị đo lường',
      assetType: 'Thiết bị',
      unit: 'Cái',
      lifespanHours: 10000,
      description: ''
    });
    setErrorMsg('');
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

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

      {/* NHÓM 4: MASTER DATA - DANH MỤC THIẾT BỊ CHUẨN */}
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
    </div>
  );
}
