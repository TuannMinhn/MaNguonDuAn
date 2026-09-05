import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Settings } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { fetcher } from '../../utils/fetcher';
import { CATEGORIES, ASSET_TYPES } from '../../utils/constants';
import Select from '../Select';
import Modal from '../Modal';

const EditEquipmentModal = ({ 
  isOpen, 
  onClose, 
  equip, 
  selectedEquip, 
  onSuccess, 
  mutateEquip, 
  setSuccessMsg, 
  setErrorMsg 
}) => {
  const activeEquip = equip || selectedEquip;
  const [editingEquip, setEditingEquip] = useState(null);
  const { data: categoriesData = [] } = useSWR(`${API_BASE_URL}/categories`, fetcher);
  
  const categoryOptions = categoriesData.length > 0 
    ? categoriesData.map(c => ({ value: c.name, label: c.name }))
    : CATEGORIES.map(c => ({ value: c, label: c }));

  useEffect(() => {
    if (editingEquip && editingEquip.assetType === 'Thiết bị' && editingEquip.code) {
      const targetLen = editingEquip.totalQty || 0;
      const currentLen = editingEquip.instances ? editingEquip.instances.length : 0;

      if (currentLen !== targetLen) {
        let updatedInstances = [...(editingEquip.instances || [])];
        if (targetLen > currentLen) {
          for (let i = currentLen + 1; i <= targetLen; i++) {
            updatedInstances.push({
              id: 'inst-' + Math.random().toString(36).substr(2, 9),
              serialNumber: `${editingEquip.code}-${i.toString().padStart(2, '0')}`,
              status: 'Sẵn sàng',
              usedHours: 0,
              healthPercent: 100, // Thêm healthPercent
              borrowedBy: null,
              notes: ''
            });
          }
        } else {
          updatedInstances = updatedInstances.slice(0, targetLen);
        }
        setEditingEquip(prev => ({ ...prev, instances: updatedInstances }));
      }
    } else if (editingEquip && editingEquip.assetType !== 'Thiết bị') {
      if (editingEquip.instances && editingEquip.instances.length > 0) {
        setEditingEquip(prev => ({ ...prev, instances: [] }));
      }
    }
  }, [editingEquip?.totalQty, editingEquip?.assetType, editingEquip?.code]);

  useEffect(() => {
    if (activeEquip) {
      setEditingEquip({ ...activeEquip });
    }
  }, [activeEquip]);

  const handleEditEquip = async (e) => {
    e.preventDefault();
    if (!editingEquip.name?.trim() || !editingEquip.code?.trim() || Number(editingEquip.totalQty) <= 0) {
      if (setErrorMsg) setErrorMsg('Thông tin không hợp lệ');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${editingEquip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEquip)
      });
      const data = await res.json();

      if (!res.ok) {
        if (setErrorMsg) setErrorMsg(data.error || 'Lỗi chỉnh sửa thông tin');
      } else {
        if (onSuccess) onSuccess();
        if (mutateEquip) mutateEquip();
        if (setSuccessMsg) setSuccessMsg(`Đã cập nhật thông tin "${editingEquip.name}"`);
        onClose();
      }
    } catch (error) {
      if (setErrorMsg) setErrorMsg('Lỗi kết nối tới server');
    }
  };

  if (!editingEquip) return null;

  const modalFooter = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      <button type="submit" form="edit-equip-form" className="btn btn-primary">Lưu thay đổi</button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sửa thông tin thiết bị"
      size="xl"
      footer={modalFooter}
    >
      <style>{`
        .edit-modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          padding-bottom: var(--space-md);
        }
        .edit-modal-form .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin: 0;
        }
        .edit-modal-form .form-group label {
          margin: 0;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }
        .edit-modal-form .grid-2col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-md);
        }
        .edit-modal-form .grid-3col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-md);
        }
      `}</style>
      <form id="edit-equip-form" onSubmit={handleEditEquip}>
        <div className="edit-modal-form">
          <div className="form-group">
            <label>Tên thiết bị</label>
            <input
              type="text"
              required
              value={editingEquip.name}
              onChange={(e) => setEditingEquip({ ...editingEquip, name: e.target.value })}
            />
          </div>

          <div className="grid-2col">
            <div className="form-group">
              <label>Mã thiết bị</label>
              <input
                type="text"
                required
                value={editingEquip.code}
                onChange={(e) => setEditingEquip({ ...editingEquip, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Vị trí</label>
              <input
                type="text"
                value={editingEquip.location}
                onChange={(e) => setEditingEquip({ ...editingEquip, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2col">
            <div className="form-group">
              <label>Danh mục</label>
              <Select
                value={editingEquip.category || 'Khác'}
                onChange={(val) => setEditingEquip({ ...editingEquip, category: val })}
                options={categoryOptions}
              />
            </div>
            <div className="form-group">
              <label>Loại tài sản</label>
              <Select
                value={editingEquip.assetType || 'Thiết bị'}
                onChange={(val) => setEditingEquip({ ...editingEquip, assetType: val })}
                options={ASSET_TYPES.map(type => ({ value: type.value, label: type.label }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Cấp độ thiết bị theo điểm tín nhiệm (Access Control List)</label>
            <Select
              value={editingEquip.requiredLevel || 1}
              onChange={(val) => setEditingEquip({ ...editingEquip, requiredLevel: Number(val) })}
              options={[
                { value: 1, label: "🟢 Cấp 1 (Từ 80 điểm: Cáp, Breadboard, Cảm biến, Module...)" },
                { value: 2, label: "🔵 Cấp 2 (Từ 101 - 150 điểm: Kit STM32, ESP32, Mỏ hàn, Đồng hồ VOM...)" },
                { value: 3, label: "🟣 Cấp 3 (Trên 150 điểm: Máy hiện sóng, Máy in 3D, Nguồn DC...)" }
              ]}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Chỉ sinh viên có đủ điểm tín nhiệm theo cấp độ này mới có thể nhìn thấy và mượn thiết bị.
            </span>
          </div>

          <div className="form-group">
            <label>Tuổi thọ dự kiến của nhà sản xuất (Giờ hoạt động)</label>
            <input
              type="number"
              min="1"
              required
              placeholder="Ví dụ: 10000"
              value={editingEquip.lifespanHours || 10000}
              onChange={(e) => setEditingEquip({ ...editingEquip, lifespanHours: Number(e.target.value) })}
            />
          </div>

          <div className="grid-3col">
            <div className="form-group">
              <label>Tổng số lượng</label>
              <input
                type="number"
                min={editingEquip.borrowedQty || 0}
                required
                value={editingEquip.totalQty}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditingEquip(prev => ({ 
                    ...prev, 
                    totalQty: val,
                    maxQty: prev.maxQty < val ? val : (prev.maxQty || val)
                  }));
                }}
              />
              <small style={{ color: 'var(--text-muted)' }}>Đang mượn: {editingEquip.borrowedQty || 0} chiếc</small>
            </div>
            <div className="form-group">
              <label>Định mức tối đa (100%)</label>
              <input
                type="number"
                min="1"
                required
                value={editingEquip.maxQty || editingEquip.totalQty || 1}
                onChange={(e) => setEditingEquip({ ...editingEquip, maxQty: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Đơn vị tính</label>
              <input
                type="text"
                placeholder="Ví dụ: Cái, Cuộn, Hộp..."
                value={editingEquip.unit || ''}
                onChange={(e) => setEditingEquip({ ...editingEquip, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2col">
            <div className="form-group">
              <label>Định mức cảnh báo</label>
              <input
                type="number"
                min="0"
                value={editingEquip.minThreshold !== undefined ? editingEquip.minThreshold : ''}
                onChange={(e) => setEditingEquip({ ...editingEquip, minThreshold: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Trạng thái kỹ thuật chung</label>
              <Select
                value={editingEquip.status}
                onChange={(val) => setEditingEquip({ ...editingEquip, status: val })}
                options={[
                  { value: "Sẵn sàng", label: "Sẵn sàng (Tốt)" },
                  { value: "Đang bảo trì / Sửa chữa", label: "Đang bảo trì / Sửa chữa" },
                  { value: "Đã thất lạc / Hỏng hóc", label: "Đã thất lạc / Hỏng hóc" }
                ]}
              />
            </div>
          </div>

          {editingEquip.assetType === 'Thiết bị' && editingEquip.instances && editingEquip.instances.length > 0 && (
            <div className="form-group" style={{ marginTop: 'var(--space-xs)', background: 'var(--bg-overlay)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
                <Settings size={16} /> Quản lý Serial Cá thể ({editingEquip.instances.length})
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {editingEquip.instances.map((inst, index) => (
                  <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '24px' }}>#{index + 1}</span>
                    <input
                      type="text"
                      value={inst.serialNumber}
                      onChange={(e) => {
                        const updated = [...editingEquip.instances];
                        updated[index].serialNumber = e.target.value;
                        setEditingEquip({ ...editingEquip, instances: updated });
                      }}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    />
                    <span className={`status-badge ${inst.status === 'Sẵn sàng' ? 'status-ready' : 'status-borrowed'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}>
                      {inst.status}
                    </span>
                  </div>
                ))}
              </div>
              <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>Khi bạn tăng số lượng tổng, hệ thống sẽ tự sinh thêm mã Serial mới vào cuối danh sách.</small>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default EditEquipmentModal;
