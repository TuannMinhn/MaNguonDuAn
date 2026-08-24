import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, HelpCircle } from 'lucide-react';
import Button from '../components/Button';
import { API_BASE_URL } from '../config';

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [mssv, setMssv] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const shiftsOfDay = [
    'Sáng (08:00 - 11:30)',
    'Chiều (13:30 - 17:00)',
    'Tối (18:00 - 21:00)'
  ];

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/schedules`);
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      console.error('Lỗi khi tải lịch trực Lab:', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Tối ưu hóa: Chuyển array thành Dictionary để tra cứu O(1)
  const scheduleDict = React.useMemo(() => {
    const dict = {};
    schedules.forEach(s => {
      const shiftPrefix = s.shift.split(' ')[0];
      const key = `${s.day}-${shiftPrefix}`;
      dict[key] = s;
    });
    return dict;
  }, [schedules]);

  // Tìm ca trực tương ứng trong danh sách từ Backend O(1)
  const getShiftData = (day, shiftName) => {
    const shiftPrefix = shiftName.split(' ')[0];
    return scheduleDict[`${day}-${shiftPrefix}`];
  };

  const handleRegisterClick = (day, shiftName) => {
    const shiftData = getShiftData(day, shiftName);
    if (!shiftData) {
      // Nếu Backend chưa có ca trực này, ta sẽ thông báo
      setErrorMsg('Ca trực này hiện không mở đăng ký.');
      return;
    }
    setSelectedShift(shiftData);
    setMssv('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowRegModal(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!mssv.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/schedules/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: selectedShift.id,
          mssv: mssv.trim()
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Đăng ký ca trực thất bại');
      } else {
        setSuccessMsg(data.message);
        setShowRegModal(false);
        fetchSchedules();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
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

  return (
    <div className="page-container fade-in">
      <div>
        <h2 className="page-header">
          <Calendar className="text-blue-500" size={20} />
          Lịch trực phòng Lab
        </h2>
        <p className="page-subtitle">Xem danh sách ca trực Lab trong tuần và đăng ký lịch trực cá nhân để tích lũy điểm chuyên cần</p>
      </div>

      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={22} style={{ color: 'var(--accent-purple)' }} />
          <h2>Lịch trực tuần hiện tại</h2>
        </div>

        {/* Lịch trực Grid */}
        <div className="schedule-grid">
          {/* Header */}
          <div className="schedule-header">Ngày \ Ca</div>
          {shiftsOfDay.map((shift, idx) => (
            <div key={idx} className="schedule-header">{shift}</div>
          ))}

          {/* Các hàng tương ứng với từng ngày */}
          {daysOfWeek.map((day, dayIdx) => (
            <React.Fragment key={dayIdx}>
              {/* Cột 1: Tên ngày */}
              <div className="schedule-day-label">{day}</div>
              
              {/* 3 Cột ca trực */}
              {shiftsOfDay.map((shiftName, shiftIdx) => {
                const shiftData = getShiftData(day, shiftName);
                const isRegistered = shiftData && shiftData.members.length > 0;
                
                return (
                  <div 
                    key={shiftIdx} 
                    className={`schedule-cell ${isRegistered ? 'has-registrations' : ''}`}
                    onClick={() => handleRegisterClick(day, shiftName)}
                    style={{ cursor: 'pointer' }}
                    title="Click để Đăng ký / Hủy đăng ký"
                  >
                    <div>
                      <div className="shift-title">{shiftName.split(' ')[0]}</div>
                      <div className="shift-members">
                        {shiftData && shiftData.members.map((member, mIdx) => (
                          <span key={mIdx} className="shift-member-tag">
                            {member.name}
                          </span>
                        ))}
                        {(!shiftData || shiftData.members.length === 0) && (
                          <span className="text-xs text-muted" style={{ fontStyle: 'italic' }}>Trống ca trực</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs" style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--accent-blue)', fontWeight: '500' }}>
                      <span>Đăng ký →</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <HelpCircle size={20} style={{ color: 'var(--accent-amber)' }} />
        <p className="text-sm">
          <strong>Lưu ý:</strong> Ca trực sáng từ 08:00 đến 11:30. Ca trực chiều từ 13:30 đến 17:00. Ca trực tối từ 18:00 đến 21:00. 
          Vui lòng bấm trực tiếp vào ca trực để đăng ký MSSV của bạn (hoặc nhập lại MSSV đã đăng ký để HỦY ca trực). 
          Khi check-in vào phòng Lab trùng với ca trực đã đăng ký, bạn sẽ nhận được điểm tích lũy chuyên cần cao hơn.
        </p>
      </div>

      {/* MODAL ĐĂNG KÝ/HỦY ĐĂNG KÝ CA TRỰC */}
      {showRegModal && selectedShift && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Đăng ký ca trực Lab</h3>
              <Button variant="ghost" icon={X} onClick={() => setShowRegModal(false)} style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }} />
            </div>
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body">
                <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p>Thời gian: <strong>{selectedShift.day}</strong> - ca <strong>{selectedShift.shift}</strong></p>
                  <p>Danh sách đã đăng ký: {selectedShift.members.map(m => m.name).join(', ') || 'Chưa có ai'}</p>
                </div>
                <div className="form-group">
                  <label>Nhập MSSV của bạn để Đăng ký / Hủy đăng ký</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 20220003"
                    value={mssv}
                    onChange={(e) => setMsv(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    * Hệ thống sẽ tự động đăng ký tên bạn nếu bạn chưa tham gia, hoặc hủy đăng ký nếu bạn đã đăng ký ca này trước đó.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <Button type="button" variant="ghost" onClick={() => setShowRegModal(false)}>Đóng</Button>
                <Button type="submit" variant="primary">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
