import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { X, Plus, Trash2, CheckCircle, Package, Wrench, FileText, CheckSquare, Square, UserCheck, ShieldCheck, Search, Filter, Minus } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { fetcher } from '../../utils/fetcher';
import Button from '../Button';
import TextInput from '../TextInput';
import Select from '../Select';

// ==========================================
// MODAL MINI: CHỌN NHANH NHIỀU THIẾT BỊ / LINH KIỆN
// ==========================================
const EquipmentPickerModal = ({ isOpen, onClose, title, icon: IconComp, items = [], selectedIds = [], onConfirm }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tempSelected, setTempSelected] = useState(new Set(selectedIds));

  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedIds));
      setSearch('');
      setCategoryFilter('all');
    }
  }, [isOpen, selectedIds]);

  const categoryOptions = useMemo(() => {
    const cats = new Set();
    items.forEach(it => {
      if (it.category) cats.add(it.category);
    });
    return [
      { value: 'all', label: 'Tất cả danh mục' },
      ...Array.from(cats).map(c => ({ value: c, label: c }))
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = !search.trim() || 
        (it.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (it.code || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || it.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  const toggleSelect = (id) => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredItems.map(i => i.id);
    const isAllSelected = allFilteredIds.every(id => tempSelected.has(id));
    setTempSelected(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content fade-in" style={{ maxWidth: '700px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {IconComp && <IconComp size={20} style={{ color: 'var(--accent-blue)' }} />}
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã thiết bị..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.25rem', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                autoFocus
              />
              {search && (
                <button 
                  type="button" 
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Custom Select Category để không bị lỗi nền trắng */}
            <div style={{ width: '240px' }}>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                placeholder="Chọn danh mục..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Tìm thấy <strong>{filteredItems.length}</strong> thiết bị</span>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}
            >
              {filteredItems.length > 0 && filteredItems.every(i => tempSelected.has(i.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả trong danh sách'}
            </button>
          </div>
        </div>

        {/* List of items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '260px', maxHeight: '420px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Không tìm thấy thiết bị / linh kiện nào phù hợp.
            </div>
          ) : (
            filteredItems.map(item => {
              const isChecked = tempSelected.has(item.id);
              const totalDevices = item.totalQty ?? (item.instances ? (typeof item.instances === 'string' ? JSON.parse(item.instances || '[]').length : item.instances.length) : 1);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-overlay)',
                    border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {isChecked ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-blue)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', color: isChecked ? 'var(--accent-blue)' : 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontWeight: 'bold' }}>
                        {item.code}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {item.category} • {item.location || 'Kho Lab'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: 'var(--radius-sm)', 
                      background: totalDevices > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: totalDevices > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontWeight: '600'
                    }}>
                      {totalDevices > 0 ? `Có ${totalDevices} ${item.unit || 'máy con'}` : 'Hết thiết bị'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Đã chọn: <strong style={{ color: 'var(--accent-blue)' }}>{tempSelected.size}</strong> thiết bị
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button 
              type="button" 
              variant="primary" 
              onClick={() => {
                onConfirm(Array.from(tempSelected));
                onClose();
              }}
            >
              Xác nhận chọn ({tempSelected.size})
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: BÁO CÁO CA PHÒNG LAB
// ==========================================
const SessionReportModal = ({ isOpen, onClose, booking, onSuccess, setErrorMsg, isEdit = false }) => {
  const { data: equipmentList = [] } = useSWR(isOpen ? `${API_BASE_URL}/equipment` : null, fetcher);

  const [consumables, setConsumables] = useState([]);
  const [issues, setIssues] = useState([]);
  const [notes, setNotes] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [checklist, setChecklist] = useState({
    cleanedRoom: true,
    powerTurnedOff: true,
    doorsLocked: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsumablesPicker, setShowConsumablesPicker] = useState(false);
  const [showIssuesPicker, setShowIssuesPicker] = useState(false);

  // Phân loại linh kiện tiêu hao và thiết bị thông thường
  const isConsumable = (e) => {
    const asset = (e.assetType || '').toLowerCase();
    const cat = (e.category || '').toLowerCase();
    const code = (e.code || '').toUpperCase();
    return asset.includes('tiêu hao') || asset.includes('vật tư') || cat.includes('tiêu hao') || cat.includes('vật tư') || cat.includes('linh kiện') || cat.includes('thực hành') || code.startsWith('CON-');
  };

  const availableConsumables = useMemo(() => {
    return equipmentList.filter(e => isConsumable(e) && (e.totalQty || 0) > 0);
  }, [equipmentList]);

  const availableEquipments = useMemo(() => {
    return equipmentList.filter(e => !isConsumable(e));
  }, [equipmentList]);

  useEffect(() => {
    if (booking) {
      if (booking.checkoutReport) {
        const rawConsumables = booking.checkoutReport.consumables || [];
        setConsumables(rawConsumables.map(c => {
          const eq = equipmentList.find(e => e.id === c.equipmentId);
          return {
            equipmentId: c.equipmentId,
            name: c.name || eq?.name || 'Linh kiện',
            code: c.code || eq?.code || '',
            category: c.category || eq?.category || '',
            maxQty: eq?.totalQty || 999,
            unit: c.unit || eq?.unit || 'Cái',
            qty: c.qty || 1
          };
        }));

        const rawIssues = booking.checkoutReport.issues || [];
        setIssues(rawIssues.map(i => {
          const eq = equipmentList.find(e => e.id === i.equipmentId);
          return {
            equipmentId: i.equipmentId,
            name: i.name || eq?.name || 'Thiết bị',
            code: i.code || eq?.code || '',
            category: i.category || eq?.category || '',
            maxQty: eq?.totalQty || 1,
            unit: eq?.unit || 'máy con',
            qty: i.qty || 1,
            issueDescription: i.issueDescription || ''
          };
        }));

        setNotes(booking.checkoutReport.notes || '');
        setCheckedBy(booking.checkoutReport.checkedBy || (booking.representativeName ? `${booking.representativeName} (${booking.representativeMssv || ''})` : ''));
        setChecklist({
          cleanedRoom: booking.checkoutReport.checklist?.cleanedRoom !== false,
          powerTurnedOff: booking.checkoutReport.checklist?.powerTurnedOff !== false,
          doorsLocked: booking.checkoutReport.checklist?.doorsLocked !== false
        });
      } else {
        setConsumables([]);
        setIssues([]);
        setNotes('');
        setCheckedBy(booking.representativeName ? `${booking.representativeName} (${booking.representativeMssv || ''})` : '');
        setChecklist({
          cleanedRoom: true,
          powerTurnedOff: true,
          doorsLocked: true
        });
      }
    }
  }, [booking, isOpen, equipmentList]);

  if (!isOpen || !booking) return null;

  // Xử lý xác nhận chọn linh kiện tiêu hao từ Picker Modal
  const handleConfirmConsumables = (selectedIds) => {
    const existingMap = new Map(consumables.map(c => [c.equipmentId, c]));
    const nextConsumables = selectedIds.map(id => {
      const eq = equipmentList.find(e => e.id === id);
      const existing = existingMap.get(id);
      return {
        equipmentId: id,
        name: eq?.name || existing?.name || 'Linh kiện',
        code: eq?.code || existing?.code || '',
        category: eq?.category || existing?.category || '',
        maxQty: eq?.totalQty || 999,
        unit: eq?.unit || 'Cái',
        qty: existing ? existing.qty : 1
      };
    });
    setConsumables(nextConsumables);
  };

  // Xử lý xác nhận chọn thiết bị hỏng từ Picker Modal
  const handleConfirmIssues = (selectedIds) => {
    const existingMap = new Map(issues.map(i => [i.equipmentId, i]));
    const nextIssues = selectedIds.map(id => {
      const eq = equipmentList.find(e => e.id === id);
      const existing = existingMap.get(id);
      const totalDevs = eq?.totalQty || 1;
      return {
        equipmentId: id,
        name: eq?.name || existing?.name || 'Thiết bị',
        code: eq?.code || existing?.code || '',
        category: eq?.category || existing?.category || '',
        maxQty: totalDevs,
        unit: eq?.unit || 'máy con',
        qty: existing?.qty || 1,
        issueDescription: existing ? existing.issueDescription : ''
      };
    });
    setIssues(nextIssues);
  };

  const handleRemoveConsumable = (equipmentId) => {
    setConsumables(consumables.filter(c => c.equipmentId !== equipmentId));
  };

  const handleUpdateConsumableQty = (equipmentId, newQty) => {
    setConsumables(consumables.map(c => {
      if (c.equipmentId === equipmentId) {
        const validated = Math.max(1, Math.min(Number(newQty) || 1, c.maxQty || 999));
        return { ...c, qty: validated };
      }
      return c;
    }));
  };

  const handleRemoveIssue = (equipmentId) => {
    setIssues(issues.filter(i => i.equipmentId !== equipmentId));
  };

  const handleUpdateIssueQty = (equipmentId, newQty) => {
    setIssues(issues.map(i => {
      if (i.equipmentId === equipmentId) {
        const validated = Math.max(1, Math.min(Number(newQty) || 1, i.maxQty || 999));
        return { ...i, qty: validated };
      }
      return i;
    }));
  };

  const handleUpdateIssueDesc = (equipmentId, text) => {
    setIssues(issues.map(i => {
      if (i.equipmentId === equipmentId) {
        return { ...i, issueDescription: text };
      }
      return i;
    }));
  };

  const toggleChecklistItem = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const validConsumables = consumables.filter(c => c.equipmentId && c.qty > 0);
    const validIssues = issues
      .filter(i => i.equipmentId)
      .map(i => ({
        ...i,
        issueDescription: (i.issueDescription || '').trim() || 'Hỏng hóc trong ca trực (chưa ghi chú chi tiết)',
        qty: Math.max(1, Number(i.qty) || 1)
      }));

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${booking.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumables: validConsumables,
          issues: validIssues,
          notes: notes.trim(),
          checkedBy: checkedBy.trim(),
          checklist,
          isEdit: !!booking.checkoutReport || isEdit
        })
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data.message, data.report);
        onClose();
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối đến máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const iconBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem'
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1000 }}>
        <div className="modal-content fade-in" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={22} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {booking.checkoutReport ? 'Chỉnh sửa Báo cáo Ca phòng' : 'Báo cáo Ca sử dụng phòng / Checkout'}
              </h3>
            </div>
            <button style={iconBtnStyle} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body flex-col" style={{ gap: '1.25rem' }}>
              
              {/* Thông tin ca trực */}
              <div style={{ background: 'var(--bg-overlay)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Ca trực đang báo cáo:</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {booking.date} • Khung giờ: {booking.slotLabel || booking.slotId}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Người đại diện: <strong>{booking.representativeName}</strong> {booking.representativeMssv ? `(${booking.representativeMssv})` : ''}
                </div>
              </div>

              {/* Checklist Bàn Giao & Vệ Sinh */}
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-green)' }}>
                  <CheckSquare size={18} /> Checklist bàn giao & An toàn phòng Lab
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div 
                    onClick={() => toggleChecklistItem('cleanedRoom')}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: checklist.cleanedRoom ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      border: `1px solid ${checklist.cleanedRoom ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {checklist.cleanedRoom ? <CheckSquare size={18} style={{ color: 'var(--accent-green)' }} /> : <Square size={18} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '0.85rem', color: checklist.cleanedRoom ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: checklist.cleanedRoom ? '500' : 'normal' }}>
                      Đã dọn dẹp vệ sinh phòng, bàn ghế ngăn nắp & vứt rác
                    </span>
                  </div>

                  <div 
                    onClick={() => toggleChecklistItem('powerTurnedOff')}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: checklist.powerTurnedOff ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      border: `1px solid ${checklist.powerTurnedOff ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {checklist.powerTurnedOff ? <CheckSquare size={18} style={{ color: 'var(--accent-green)' }} /> : <Square size={18} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '0.85rem', color: checklist.powerTurnedOff ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: checklist.powerTurnedOff ? '500' : 'normal' }}>
                      Đã tắt máy lạnh, đèn & ngắt nguồn thiết bị điện (máy hàn, máy in 3D...)
                    </span>
                  </div>

                  <div 
                    onClick={() => toggleChecklistItem('doorsLocked')}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: checklist.doorsLocked ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      border: `1px solid ${checklist.doorsLocked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {checklist.doorsLocked ? <CheckSquare size={18} style={{ color: 'var(--accent-green)' }} /> : <Square size={18} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '0.85rem', color: checklist.doorsLocked ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: checklist.doorsLocked ? '500' : 'normal' }}>
                      Đã đóng kín cửa sổ & khóa cửa chính phòng Lab
                    </span>
                  </div>
                </div>
              </div>

              {/* Người kiểm tra / Bàn giao */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  <UserCheck size={16} style={{ color: 'var(--accent-blue)' }} /> Người kiểm tra / Bàn giao ca trực
                </label>
                <TextInput
                  type="text"
                  placeholder="Nhập tên hoặc MSSV người kiểm tra ca trực..."
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Mặc định là người đại diện ca hoặc sinh viên trực ca chịu trách nhiệm bàn giao
                </span>
              </div>

              {/* LINH KIỆN TIÊU HAO */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--accent-blue)', fontSize: '0.9rem' }}>
                    <Package size={18} /> Linh kiện đã tiêu hao ({consumables.length})
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => setShowConsumablesPicker(true)} 
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.3)', 
                      color: 'var(--accent-blue)', 
                      padding: '0.35rem 0.75rem', 
                      borderRadius: 'var(--radius-sm)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                  >
                    <Plus size={14} /> Chọn linh kiện từ kho
                  </button>
                </div>

                {consumables.length === 0 ? (
                  <div 
                    onClick={() => setShowConsumablesPicker(true)}
                    style={{ 
                      padding: '1rem', 
                      border: '1px dashed var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      background: 'var(--bg-overlay)'
                    }}
                  >
                    Chưa có linh kiện tiêu hao. Nhấn <strong>"+ Chọn linh kiện từ kho"</strong> để thêm.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {consumables.map((item) => (
                      <div 
                        key={item.equipmentId} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '0.75rem', 
                          padding: '0.65rem 0.85rem', 
                          background: 'var(--bg-overlay)', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)' 
                        }}
                      >
                        {/* Tên & Mã linh kiện */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                              {item.name}
                            </span>
                            {item.code && (
                              <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontWeight: 'bold' }}>
                                {item.code}
                              </span>
                            )}
                          </div>
                          {item.category && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {item.category} {item.maxQty ? `• Tồn kho: ${item.maxQty} ${item.unit || ''}` : ''}
                            </div>
                          )}
                        </div>

                        {/* Ô chỉnh nhanh số lượng */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>SL dùng:</span>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateConsumableQty(item.equipmentId, item.qty - 1)}
                              disabled={item.qty <= 1}
                              style={{ width: '28px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: item.qty <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.maxQty || 999}
                              value={item.qty}
                              onChange={(e) => handleUpdateConsumableQty(item.equipmentId, Number(e.target.value))}
                              style={{ width: '45px', height: '32px', textAlign: 'center', border: 'none', background: 'none', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateConsumableQty(item.equipmentId, item.qty + 1)}
                              disabled={item.maxQty && item.qty >= item.maxQty}
                              style={{ width: '28px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: (item.maxQty && item.qty >= item.maxQty) ? 'not-allowed' : 'pointer' }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Nút Xóa */}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveConsumable(item.equipmentId)} 
                          title="Xóa linh kiện này"
                          style={{ padding: '0.4rem', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BÁO HỎNG THIẾT BỊ */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                    <Wrench size={18} /> Báo hỏng thiết bị ({issues.length})
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => setShowIssuesPicker(true)} 
                    style={{ 
                      background: 'rgba(245, 158, 11, 0.1)', 
                      border: '1px solid rgba(245, 158, 11, 0.3)', 
                      color: 'var(--accent-amber)', 
                      padding: '0.35rem 0.75rem', 
                      borderRadius: 'var(--radius-sm)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}
                  >
                    <Plus size={14} /> Chọn thiết bị hỏng
                  </button>
                </div>

                {issues.length === 0 ? (
                  <div 
                    onClick={() => setShowIssuesPicker(true)}
                    style={{ 
                      padding: '1rem', 
                      border: '1px dashed var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      background: 'var(--bg-overlay)'
                    }}
                  >
                    Không có thiết bị hỏng hóc. Nhấn <strong>"+ Chọn thiết bị hỏng"</strong> nếu phát hiện máy móc bị lỗi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {issues.map((item) => (
                      <div 
                        key={item.equipmentId} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.5rem', 
                          padding: '0.75rem', 
                          background: 'var(--bg-overlay)', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid rgba(245, 158, 11, 0.3)' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                              {item.name}
                            </span>
                            {item.code && (
                              <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontWeight: 'bold' }}>
                                {item.code}
                              </span>
                            )}
                            {item.category && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                • {item.category}
                              </span>
                            )}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveIssue(item.equipmentId)} 
                            title="Xóa thiết bị này"
                            style={{ padding: '0.3rem', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          {/* Textbox chọn số lượng máy con bị hỏng */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', fontWeight: '500' }}>SL hỏng:</span>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateIssueQty(item.equipmentId, (item.qty || 1) - 1)}
                                disabled={(item.qty || 1) <= 1}
                                style={{ width: '26px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: (item.qty || 1) <= 1 ? 'not-allowed' : 'pointer' }}
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.maxQty || 999}
                                value={item.qty || 1}
                                onChange={(e) => handleUpdateIssueQty(item.equipmentId, Number(e.target.value))}
                                style={{ width: '42px', height: '34px', textAlign: 'center', border: 'none', background: 'none', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateIssueQty(item.equipmentId, (item.qty || 1) + 1)}
                                disabled={item.maxQty && (item.qty || 1) >= item.maxQty}
                                style={{ width: '26px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: (item.maxQty && (item.qty || 1) >= item.maxQty) ? 'not-allowed' : 'pointer' }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              /{item.maxQty || 1} {item.unit || 'máy'}
                            </span>
                          </div>

                          {/* Ô nhập mô tả lỗi */}
                          <input
                            type="text"
                            placeholder="Mô tả tình trạng lỗi (VD: Không lên nguồn, đứt dây, vỡ vỏ...)"
                            value={item.issueDescription}
                            onChange={(e) => handleUpdateIssueDesc(item.equipmentId, e.target.value)}
                            style={{ flex: 1, height: '34px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú chung */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  <FileText size={18} /> Ghi chú chung
                </h4>
                <textarea
                  rows="3"
                  placeholder="Ghi nhận thêm tình trạng phòng, đề xuất hỗ trợ hoặc các vấn đề khác..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-overlay)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                ></textarea>
              </div>

            </div>
            
            <div className="modal-footer">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
              <Button type="submit" variant="primary" icon={CheckCircle} disabled={isSubmitting}>
                {isSubmitting ? 'Đang gửi...' : (booking.checkoutReport ? 'Lưu thay đổi' : 'Gửi Báo Cáo')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Mini Picker Modal: Linh kiện tiêu hao */}
      <EquipmentPickerModal
        isOpen={showConsumablesPicker}
        onClose={() => setShowConsumablesPicker(false)}
        title="Chọn Linh kiện tiêu hao từ kho"
        icon={Package}
        items={availableConsumables}
        selectedIds={consumables.map(c => c.equipmentId)}
        onConfirm={handleConfirmConsumables}
      />

      {/* Mini Picker Modal: Thiết bị báo hỏng */}
      <EquipmentPickerModal
        isOpen={showIssuesPicker}
        onClose={() => setShowIssuesPicker(false)}
        title="Chọn Thiết bị trong Lab bị lỗi / hỏng"
        icon={Wrench}
        items={availableEquipments}
        selectedIds={issues.map(i => i.equipmentId)}
        onConfirm={handleConfirmIssues}
      />
    </>
  );
};

export default SessionReportModal;
