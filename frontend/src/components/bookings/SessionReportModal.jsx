import React, { useState } from 'react';
import useSWR from 'swr';
import { X, Plus, Trash2, CheckCircle, Package, Wrench, FileText } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { fetcher } from '../../utils/fetcher';
import Select from '../Select';
import Button from '../Button';

const SessionReportModal = ({ isOpen, onClose, booking, onSuccess, setErrorMsg }) => {
  const { data: equipmentList = [] } = useSWR(isOpen ? `${API_BASE_URL}/equipment` : null, fetcher);

  const [consumables, setConsumables] = useState([]);
  const [issues, setIssues] = useState([]);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const availableConsumables = equipmentList.filter(e => e.assetType === 'Linh kiện tiêu hao' && e.totalQty > 0);
  const availableEquipments = equipmentList.filter(e => e.assetType !== 'Linh kiện tiêu hao');

  const handleAddConsumable = () => {
    setConsumables([...consumables, { equipmentId: '', qty: 1 }]);
  };

  const handleRemoveConsumable = (index) => {
    setConsumables(consumables.filter((_, i) => i !== index));
  };

  const handleConsumableChange = (index, field, value) => {
    const newArr = [...consumables];
    newArr[index][field] = value;
    setConsumables(newArr);
  };

  const handleAddIssue = () => {
    setIssues([...issues, { equipmentId: '', issueDescription: '' }]);
  };

  const handleRemoveIssue = (index) => {
    setIssues(issues.filter((_, i) => i !== index));
  };

  const handleIssueChange = (index, field, value) => {
    const newArr = [...issues];
    newArr[index][field] = value;
    setIssues(newArr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const validConsumables = consumables.filter(c => c.equipmentId && c.qty > 0);
    const validIssues = issues.filter(i => i.equipmentId && i.issueDescription.trim() !== '');

    if (validConsumables.length === 0 && validIssues.length === 0 && notes.trim() === '') {
      return setErrorMsg('Vui lòng điền ít nhất một nội dung báo cáo');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${booking.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumables: validConsumables,
          issues: validIssues,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data.message);
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
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content fade-in" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Báo cáo Ca sử dụng phòng</h3>
          <button style={iconBtnStyle} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body flex-col" style={{ gap: '1.5rem' }}>
            
            <div style={{ background: 'var(--bg-overlay)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ca trực đang báo cáo:</div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{booking.date} - Khung giờ: {booking.slotId}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Người đại diện: {booking.representativeName} ({booking.representativeMssv})</div>
            </div>

            {/* Linh kiện tiêu hao */}
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>
                <Package size={18} /> Linh kiện đã tiêu hao
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {consumables.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        value={item.equipmentId}
                        onChange={(val) => handleConsumableChange(index, 'equipmentId', val)}
                        options={[
                          { value: '', label: '-- Chọn linh kiện --' },
                          ...availableConsumables.map(e => ({ value: e.id, label: `${e.code} - ${e.name} (Tồn: ${e.totalQty})` }))
                        ]}
                      />
                    </div>
                    <div style={{ width: '100px' }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="SL"
                        value={item.qty}
                        onChange={(e) => handleConsumableChange(index, 'qty', Number(e.target.value))}
                        style={{ height: '42px' }}
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveConsumable(index)} style={{ padding: '0.5rem', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={handleAddConsumable} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Thêm linh kiện
                </button>
              </div>
            </div>

            {/* Báo hỏng thiết bị */}
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-amber)' }}>
                <Wrench size={18} /> Báo hỏng thiết bị
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {issues.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <Select
                        value={item.equipmentId}
                        onChange={(val) => handleIssueChange(index, 'equipmentId', val)}
                        options={[
                          { value: '', label: '-- Chọn thiết bị hỏng --' },
                          ...availableEquipments.map(e => ({ value: e.id, label: `${e.code} - ${e.name}` }))
                        ]}
                      />
                      <input
                        type="text"
                        placeholder="Mô tả tình trạng lỗi (VD: Không lên nguồn)"
                        value={item.issueDescription}
                        onChange={(e) => handleIssueChange(index, 'issueDescription', e.target.value)}
                      />
                    </div>
                    <button type="button" onClick={() => handleRemoveIssue(index)} style={{ padding: '0.5rem', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={handleAddIssue} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Báo hỏng thiết bị
                </button>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                <FileText size={18} /> Ghi chú chung
              </h4>
              <textarea
                rows="3"
                placeholder="Ghi nhận tình trạng vệ sinh phòng, các vấn đề khác..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

          </div>
          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
            <Button type="submit" variant="primary" icon={CheckCircle} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionReportModal;
