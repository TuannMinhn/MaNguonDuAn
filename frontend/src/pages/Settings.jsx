import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Settings as SettingsIcon, Tag, Clock } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { API_BASE_URL } from '../config';
import { CATEGORIES, ASSET_TYPES } from '../utils/constants';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';

export default function Settings() {
  const { data: catalog, mutate } = useSWR(`${API_BASE_URL}/settings/catalog`, fetcher);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
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

  if (!catalog) return <div className="page-container"><div className="glass-card">Đang tải...</div></div>;

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

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h2 className="section-heading">
            <SettingsIcon size={20} style={{ color: 'var(--accent-blue)' }} />
            Danh mục thiết bị chuẩn ({catalog.length})
          </h2>
        </div>
        
        <DataTable
          data={catalog}
          columns={catalogColumns}
          searchKeys={['name', 'codePrefix', 'category']}
          searchPlaceholder="Tìm theo tên mẫu, mã prefix hoặc phân loại..."
        />
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingItem ? 'Sửa danh mục gốc' : 'Thêm thiết bị vào danh mục gốc'}</h3>
              <Button variant="ghost" icon={Plus} onClick={closeModal} style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, transform: 'rotate(45deg)' }} />
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}
                
                <div className="form-group">
                  <label>Tên thiết bị chuẩn</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    placeholder="Ví dụ: Mỏ hàn JBC CD-2BQF"
                  />
                </div>

                <div className="grid-2col" style={{ gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Mã Prefix (Ví dụ: JBC)</label>
                    <input
                      type="text"
                      required
                      value={form.codePrefix}
                      onChange={(e) => setForm({...form, codePrefix: e.target.value})}
                      placeholder="JBC"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Tuổi thọ dự kiến (giờ)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.lifespanHours}
                      onChange={(e) => setForm({...form, lifespanHours: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid-2col" style={{ gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
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

                <div className="form-group">
                  <label>Mô tả thêm (Tùy chọn)</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Mô tả tóm tắt"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <Button type="button" variant="ghost" onClick={closeModal}>Hủy</Button>
                <Button type="submit" variant="primary">{editingItem ? 'Cập nhật' : 'Thêm mới'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
