import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { CATEGORIES, ASSET_TYPES } from '../../utils/constants';
import useSWR from 'swr';
import { fetcher } from '../../utils/fetcher';
import Select from '../Select';
import Modal from '../Modal';

const AddEquipmentModal = ({ isOpen, onClose, onSuccess, setErrorMsg, equipmentList = [] }) => {
  const [newEquip, setNewEquip] = useState({
    name: '',
    code: '',
    category: 'Thiết bị đo lường',
    location: '',
    totalQty: 1,
    maxQty: 1,
    unit: 'Cái',
    minThreshold: 0,
    lifespanHours: 10000,
    assetType: 'Thiết bị',
    status: 'Sẵn sàng',
    instances: []
  });

  const { data: catalog } = useSWR(`${API_BASE_URL}/settings/catalog`, fetcher);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCatalog, setFilteredCatalog] = useState([]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNewEquip({ ...newEquip, name: val });
    
    if (val.trim() && catalog) {
      const filtered = catalog.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
      setFilteredCatalog(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    // Find next sequence number
    let nextSeq = 1;
    if (equipmentList && equipmentList.length > 0) {
      // Tìm các mã đang có prefix giống item.codePrefix (ví dụ SEN-01, SEN-02)
      // Chú ý: thiết bị trong equipmentList có thể là "SEN-01", không phải "SEN"
      // Nhưng nếu catalog codePrefix là "SEN", ta tìm eq.code bắt đầu bằng "SEN-"
      const prefixCodes = equipmentList
        .filter(eq => eq.code.startsWith(item.codePrefix + '-'))
        .map(eq => {
          const parts = eq.code.split('-');
          return parseInt(parts[parts.length - 1], 10);
        })
        .filter(num => !isNaN(num));
      
      if (prefixCodes.length > 0) {
        nextSeq = Math.max(...prefixCodes) + 1;
      } else {
        // Nếu không có mã nào "SEN-...", thử tìm xem có mã nào "SEN" trơn không
        const exactMatch = equipmentList.find(eq => eq.code === item.codePrefix);
        if (exactMatch) nextSeq = 2; // Nếu có SEN, thì mã tiếp theo là SEN-02
      }
    }

    const nextCode = `${item.codePrefix}-${nextSeq.toString().padStart(2, '0')}`;

    setNewEquip(prev => ({
      ...prev,
      name: item.name,
      code: nextCode,
      category: item.category,
      assetType: item.assetType,
      unit: item.unit,
      lifespanHours: item.lifespanHours || 10000
    }));
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (newEquip.assetType === 'Thiết bị' && newEquip.code) {
      const targetLen = newEquip.totalQty || 0;
      const currentLen = newEquip.instances.length;

      if (currentLen !== targetLen) {
        let updatedInstances = [...newEquip.instances];
        if (targetLen > currentLen) {
          for (let i = currentLen + 1; i <= targetLen; i++) {
            updatedInstances.push({
              id: 'inst-' + Math.random().toString(36).substr(2, 9),
              serialNumber: `${newEquip.code}-${i.toString().padStart(2, '0')}`,
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
        setNewEquip(prev => ({ ...prev, instances: updatedInstances }));
      }
    } else if (newEquip.assetType !== 'Thiết bị') {
      if (newEquip.instances.length > 0) {
        setNewEquip(prev => ({ ...prev, instances: [] }));
      }
    }
  }, [newEquip.totalQty, newEquip.assetType, newEquip.code]);

  const handleAddEquip = async (e) => {
    e.preventDefault();
    if (!newEquip.name.trim() || !newEquip.code.trim() || Number(newEquip.totalQty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ tên, mã thiết bị và số lượng lớn hơn 0');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquip)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Lỗi thêm thiết bị');
      } else {
        setNewEquip({
          name: '',
          code: '',
          totalQty: 1,
          location: 'Kho Lab',
          category: 'Thiết bị đo lường',
          assetType: 'Thiết bị',
          unit: 'Cái',
          minThreshold: 0,
          status: 'Sẵn sàng',
          instances: []
        });
        onSuccess(newEquip.name);
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const modalFooter = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
      <button type="submit" form="add-equip-form" className="btn btn-primary">Thêm thiết bị</button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm thiết bị vào kho"
      size="lg"
      footer={modalFooter}
    >
      <form id="add-equip-form" onSubmit={handleAddEquip}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ position: 'relative' }}>
              <label>Tên thiết bị / Linh kiện</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Kit phát triển ESP32..."
                value={newEquip.name}
                onChange={handleNameChange}
                onFocus={() => {
                  if (newEquip.name.trim() && filteredCatalog.length > 0) setShowSuggestions(true);
                  else if (!newEquip.name.trim() && catalog && catalog.length > 0) {
                    setFilteredCatalog(catalog.slice(0, 10)); // Hiện 10 cái mặc định khi focus vào ô trống
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {showSuggestions && filteredCatalog.length > 0 && (
                <ul style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0 0 8px 8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  zIndex: 100,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  {filteredCatalog.map(item => (
                    <li 
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã chuẩn: {item.codePrefix}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label>Mã thiết bị (Viết liền, duy nhất)</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: ESP32-05"
                value={newEquip.code}
                onChange={(e) => setNewEquip({ ...newEquip, code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Vị trí lưu trữ trong Lab</label>
              <input
                type="text"
                placeholder="Ví dụ: Tủ A2, Kệ kỹ thuật B"
                value={newEquip.location}
                onChange={(e) => setNewEquip({ ...newEquip, location: e.target.value })}
              />
            </div>

            <div className="grid-2col" style={{ gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Danh mục phân chia</label>
                <Select
                  value={newEquip.category}
                  onChange={(val) => setNewEquip({ ...newEquip, category: val })}
                  options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Hạng mục quản lý (Asset Type)</label>
                <Select
                  value={newEquip.assetType}
                  onChange={(val) => setNewEquip({ ...newEquip, assetType: val })}
                  options={ASSET_TYPES.map(type => ({ value: type.value, label: type.label }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tuổi thọ dự kiến của nhà sản xuất (Giờ hoạt động)</label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ví dụ: 10000"
                value={newEquip.lifespanHours}
                onChange={(e) => setNewEquip({ ...newEquip, lifespanHours: Number(e.target.value) })}
              />
            </div>

            <div className="grid-3col" style={{ gap: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="form-group">
                <label>Tồn kho hiện tại</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newEquip.totalQty}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setNewEquip(prev => ({ 
                      ...prev, 
                      totalQty: val,
                      maxQty: prev.maxQty < val ? val : prev.maxQty // tự động nâng maxQty nếu totalQty lớn hơn
                    }));
                  }}
                />
              </div>
              <div className="form-group">
                <label>Định mức tối đa (100%)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ví dụ: 100"
                  value={newEquip.maxQty}
                  onChange={(e) => setNewEquip({ ...newEquip, maxQty: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Đơn vị tính</label>
                <input
                  type="text"
                  placeholder="Cái, Cuộn, Hộp..."
                  value={newEquip.unit}
                  onChange={(e) => setNewEquip({ ...newEquip, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2col" style={{ gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
              <div className="form-group">
                <label>Định mức cảnh báo</label>
                <input
                  type="number"
                  min="0"
                  value={newEquip.minThreshold}
                  onChange={(e) => setNewEquip({ ...newEquip, minThreshold: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Trạng thái kỹ thuật</label>
                <Select
                  value={newEquip.status}
                  onChange={(val) => setNewEquip({ ...newEquip, status: val })}
                  options={[
                    { value: "Sẵn sàng", label: "Sẵn sàng (Tốt)" },
                    { value: "Đang bảo trì / Sửa chữa", label: "Đang bảo trì / Sửa chữa" },
                    { value: "Đã thất lạc / Hỏng hóc", label: "Đã thất lạc / Hỏng hóc" }
                  ]}
                />
              </div>
            </div>

            {newEquip.assetType === 'Thiết bị' && newEquip.instances.length > 0 && (
              <div className="form-group" style={{ marginTop: '0.5rem', background: 'var(--bg-overlay)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
                  <Settings size={16} /> Quản lý Serial Cá thể ({newEquip.instances.length})
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {newEquip.instances.map((inst, index) => (
                    <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '24px' }}>#{index + 1}</span>
                      <input
                        type="text"
                        value={inst.serialNumber}
                        onChange={(e) => {
                          const updated = [...newEquip.instances];
                          updated[index].serialNumber = e.target.value;
                          setNewEquip({ ...newEquip, instances: updated });
                        }}
                        style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>Mã Serial được sinh tự động dựa trên Mã thiết bị. Bạn có thể sửa lại theo Serial của NSX.</small>
              </div>
            )}
        </div>
      </form>
    </Modal>
  );
};

export default AddEquipmentModal;
