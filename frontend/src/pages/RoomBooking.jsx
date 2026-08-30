import React, { useState, useEffect, useMemo, useRef } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';

import { Calendar, Users, X, ShieldAlert, Trash2, Search, CheckSquare, Clock, UserCheck, ChevronRight, CheckCircle, UserPlus, Info, Plus } from 'lucide-react';

import { API_BASE_URL } from '../config';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'mon', label: 'Thứ 2' },
  { key: 'tue', label: 'Thứ 3' },
  { key: 'wed', label: 'Thứ 4' },
  { key: 'thu', label: 'Thứ 5' },
  { key: 'fri', label: 'Thứ 6' },
  { key: 'sat', label: 'Thứ 7' },
];

const SESSIONS = [
  {
    key: 'morning', label: 'Sáng', color: 'var(--accent-amber)',
    bgColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)',
    slots: [
      { id: 'morning_1', label: '7:00 – 9:00' },
      { id: 'morning_2', label: '9:00 – 11:00' },
    ],
  },
  {
    key: 'afternoon', label: 'Chiều', color: 'var(--accent-blue)',
    bgColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)',
    slots: [
      { id: 'afternoon_1', label: '12:00 – 14:00' },
      { id: 'afternoon_2', label: '14:00 – 16:00' },
    ],
  },
  {
    key: 'evening', label: 'Tối', color: 'var(--accent-purple)',
    bgColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.3)',
    slots: [
      { id: 'evening_1', label: '16:00 – 18:00' },
      { id: 'evening_2', label: '18:00 – 20:00' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formatDateDisplay(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function avatarColor(str = '') {
  const colors = ['var(--accent-blue)','var(--accent-purple)','var(--accent-green)','var(--accent-amber)','var(--accent-red)','#06b6d4','#ec4899'];
  let h = 0;
  for (let c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoomBooking({ userRole }) {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const { data: members = [] } = useSWR(`${API_BASE_URL}/members`, fetcher);

  // Slot selection
  const [selected, setSelected] = useState(new Set());

  // Modal layers
  const [showRegModal,      setShowRegModal]      = useState(false);
  const [showMemberPicker,  setShowMemberPicker]  = useState(false); // sub-popup
  const [showCancelModal,   setShowCancelModal]   = useState(false);
  const [cancelTarget,      setCancelTarget]      = useState(null);
  
  const [showDetailsModal,  setShowDetailsModal]  = useState(false);
  const [detailsTarget,     setDetailsTarget]     = useState(null);

  // Confirmed members (after closing picker)
  const [confirmedMssvs, setConfirmedMssvs] = useState(new Set()); // final list
  const [repMssv,        setRepMssv]        = useState('');
  const [bookingPurpose, setBookingPurpose] = useState('Sử dụng chung');

  // Temp state inside picker (not committed until "Xác nhận")
  const [pickerSearch,   setPickerSearch]   = useState('');
  const [pickerMssvs,    setPickerMssvs]    = useState(new Set()); // temp selection

  // Cancel modal
  const [cancelMssv, setCancelMssv] = useState('');
  const [showCancelAllModal, setShowCancelAllModal] = useState(false);

  // Alerts
  const [errorMsg,   setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);


  // ── Derived day dates ─────────────────────────────────────────────────────
  const dayDates = useMemo(() =>
    DAYS.reduce((acc, d, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      acc[d.key] = date;
      return acc;
    }, {}),
  [weekStart]);

  // Optimize: Convert attendees array to O(1) Set for fast lookup in details modal
  const attendeesSet = useMemo(() => {
    if (!detailsTarget?.session?.attendees) return new Set();
    return new Set(detailsTarget.session.attendees.map(a => a.mssv));
  }, [detailsTarget]);

  const swrKey = `${API_BASE_URL}/bookings/week?start=${formatDate(dayDates['mon'])}&_t=${refreshKey}`;

  const fetchWeek = async () => {
    return fetch(swrKey, { cache: 'no-store' }).then(r => r.json());
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data: bookingsArray = [], mutate: mutateBookings } = useSWR(swrKey, fetchWeek);

  const bookings = useMemo(() => {
    const allBookings = {};
    for (let i = 0; i < bookingsArray.length; i++) {
      const data = bookingsArray[i];
      if (Array.isArray(data)) {
        data.forEach(b => {
          const key = `${DAYS[i].key}|${b.slotId}`;
          allBookings[key] = { ...b, dayKey: DAYS[i].key };
        });
      }
    }
    return allBookings;
  }, [bookingsArray]);

  // ── Slot toggle ───────────────────────────────────────────────────────────
  const getBooking = React.useCallback((dayKey, slotId) => {
    return bookings[`${dayKey}|${slotId}`];
  }, [bookings]);

  const toggleSlot = React.useCallback((dayKey, slotId) => {
    if (getBooking(dayKey, slotId)) return;
    const key = `${dayKey}|${slotId}`;
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, [getBooking]);

  // ── Open picker: seed temp state from confirmed ───────────────────────────
  const openPicker = () => {
    setPickerSearch('');
    setPickerMssvs(new Set(confirmedMssvs));
    setShowMemberPicker(true);
  };

  // ── Toggle inside picker (temp) ───────────────────────────────────────────
  const togglePicker = (mssv) => {
    setPickerMssvs(prev => { const n = new Set(prev); n.has(mssv) ? n.delete(mssv) : n.add(mssv); return n; });
  };

  // ── Confirm picker: commit to confirmedMssvs ──────────────────────────────
  const confirmPicker = () => {
    setConfirmedMssvs(new Set(pickerMssvs));
    // Set rep = first chosen member
    if (pickerMssvs.size > 0) {
      if (!pickerMssvs.has(repMssv)) setRepMssv([...pickerMssvs][0]);
    } else {
      setRepMssv('');
    }
    setShowMemberPicker(false);
  };

  const setAsRep = (mssv) => { if (confirmedMssvs.has(mssv)) setRepMssv(mssv); };

  // ── Filtered members in picker ────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m => m.name?.toLowerCase().includes(q) || m.mssv?.toLowerCase().includes(q));
  }, [pickerSearch, members]);

  // ── Reset reg modal ───────────────────────────────────────────────────────
  const resetModal = () => {
    setConfirmedMssvs(new Set());
    setPickerMssvs(new Set());
    setPickerSearch('');
    setRepMssv('');
    setErrorMsg('');
  };

  // ── Register submit ───────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (confirmedMssvs.size === 0) { setErrorMsg('Vui lòng chọn ít nhất một thành viên'); return; }
    if (!repMssv) { setErrorMsg('Vui lòng chỉ định người đại diện'); return; }

    const slots = [...selected].map(k => { 
      const [dayKey, slotId] = k.split('|'); 
      return { date: formatDate(dayDates[dayKey]), slotId }; 
    });
    const mssvList = [repMssv, ...[...confirmedMssvs].filter(m => m !== repMssv)];

    try {
      const res = await fetch(`${API_BASE_URL}/bookings/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slots,
          representativeMssv: repMssv, 
          purpose: bookingPurpose,
          memberMssvs: mssvList
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccessMsg(data.bookedCount > 0 ? `✓ Đăng ký thành công ${data.bookedCount} buổi${data.failedCount > 0 ? `, ${data.failedCount} buổi bị trùng` : ''}!` : `${data.failedCount} buổi đã được đặt bởi nhóm khác.`);
        setSelected(new Set()); setShowRegModal(false); resetModal(); 
        setRefreshKey(prev => prev + 1);
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi đăng ký');
      }
    } catch { 
      setErrorMsg('Lỗi kết nối server');
    }
  };

  // ── Cancel submit ─────────────────────────────────────────────────────────
  const handleCancelSubmit = async (e) => {
    e.preventDefault(); setErrorMsg('');
    
    let finalMssv = cancelMssv.trim();

    if (userRole === 'student') {
      if (finalMssv !== cancelTarget.representativeMssv) {
        setErrorMsg('Chỉ người đại diện đã đăng ký mới có quyền hủy lịch này.');
        return;
      }
      
      const dateParts = cancelTarget.date.split('-');
      let hour = 7;
      if (cancelTarget.slotId === 'morning_2') hour = 9;
      else if (cancelTarget.slotId === 'afternoon_1') hour = 12;
      else if (cancelTarget.slotId === 'afternoon_2') hour = 14;
      else if (cancelTarget.slotId === 'evening_1') hour = 16;
      else if (cancelTarget.slotId === 'evening_2') hour = 18;
      
      const slotStartTime = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2]), hour, 0, 0);
      const now = new Date();
      const diffHours = (slotStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 2) {
        setErrorMsg('Lỗi: Không thể hủy đăng ký khi chỉ còn ít hơn 2 tiếng trước giờ vào phòng.');
        return;
      }
    } else {
      finalMssv = cancelTarget.representativeMssv || 'admin';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${cancelTarget.id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: finalMssv }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Hủy thất bại'); }
      else { setSuccessMsg('Hủy lịch thành công!'); setShowCancelModal(false); setCancelTarget(null); setCancelMssv(''); setRefreshKey(prev => prev + 1); }
    } catch { setErrorMsg('Lỗi kết nối server'); }
  };

  const handleCancelAll = async (e) => {
    e?.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/cancel-all`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Đã hủy toàn bộ lịch đặt phòng thành công!');
        setRefreshKey(prev => prev + 1);
        setShowCancelAllModal(false);
      } else {
        setErrorMsg('Lỗi khi hủy toàn bộ lịch');
      }
    } catch { setErrorMsg('Lỗi kết nối server'); }
  };

  useEffect(() => { if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 6000); return () => clearTimeout(t); } }, [successMsg]);
  useEffect(() => { if (errorMsg)   { const t = setTimeout(() => setErrorMsg(''), 6000);   return () => clearTimeout(t); } }, [errorMsg]);

  const changeWeek = (d) => { const w = new Date(weekStart); w.setDate(w.getDate() + d * 7); setWeekStart(w); setSelected(new Set()); };
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 5);
  const confirmedList = members.filter(m => confirmedMssvs.has(m.mssv));

  const regModalFooter = (
    <>
      <Button type="button" variant="secondary" onClick={() => setShowRegModal(false)}>Hủy</Button>
      <Button
        type="submit"
        form="register-booking-form"
        variant="primary"
        icon={UserCheck}
        disabled={confirmedMssvs.size === 0}
      >
        Xác nhận đặt phòng {confirmedMssvs.size > 0 ? `(${confirmedMssvs.size} người)` : ''}
      </Button>
    </>
  );

  const memberPickerFooter = (
    <>
      <Button type="button" variant="secondary" onClick={() => setShowMemberPicker(false)}>Hủy bỏ</Button>
      <Button
        type="button"
        variant="primary"
        icon={UserCheck}
        onClick={confirmPicker}
        disabled={pickerMssvs.size === 0}
      >
        Xác nhận ({pickerMssvs.size} người)
      </Button>
    </>
  );

  const cancelBookingFooter = (
    <>
      <Button type="button" variant="secondary" onClick={() => setShowCancelModal(false)}>Quay lại</Button>
      <Button type="submit" form="cancel-booking-form" variant="danger" icon={Trash2} iconPosition="left">Xác nhận hủy</Button>
    </>
  );

  const cancelAllBookingsFooter = (
    <>
      <Button type="button" variant="secondary" onClick={() => setShowCancelAllModal(false)}>Hủy bỏ</Button>
      <Button type="submit" form="cancel-all-bookings-form" variant="danger" icon={Trash2} iconPosition="left">Vâng, Hủy toàn bộ</Button>
    </>
  );

  return (
    <div className="page-container fade-in" style={{ gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ paddingRight: '60px' }}>
          <h2 className="page-header">
            <Calendar className="text-blue-500" size={20} />
            Đăng ký sử dụng phòng CLB
          </h2>
          <p className="page-subtitle">Chọn các buổi muốn đăng ký, sau đó bấm nút <strong style={{ color: 'var(--accent-blue)' }}>Đăng ký</strong> ở góc dưới phải.</p>
        </div>
        <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userRole !== 'student' && (
            <Button
              variant="danger"
              icon={X}
              iconPosition="left"
              onClick={() => setShowCancelAllModal(true)}
            >
              Hủy toàn bộ lịch
            </Button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-overlay)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <Calendar size={16} style={{ color: 'var(--accent-blue)' }} />
            <button onClick={() => changeWeek(-1)} style={navBtnStyle}>‹</button>
            <span className="text-sm" style={{ color: 'var(--text-primary)', fontWeight: '600', minWidth: '160px', textAlign: 'center' }}>
              {formatDateDisplay(weekStart)} – {formatDateDisplay(weekEnd)}/{weekEnd.getFullYear()}
            </span>
            <button onClick={() => changeWeek(1)} style={navBtnStyle}>›</button>
          </div>
        </div>
      </div>

      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg   && <div className="alert-message alert-error">{errorMsg}</div>}


      {/* Weekly Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="schedule-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-overlay)' }}>
                <th style={thStyle({ width: '90px' })}>Ngày \ Ca</th>
                {SESSIONS.map(s => (
                  <th key={s.key} style={thStyle({ color: s.color, borderLeft: `3px solid ${s.color}` })}>
                    <div className="text-lg" style={{ fontWeight: '700' }}>{s.label}</div>
                    <div className="text-xs" style={{ opacity: 0.7, fontWeight: '400', marginTop: 2 }}>
                      {s.slots.map(sl => sl.label).join(' · ')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day.key} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <div className="text-md" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{day.label}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{formatDateDisplay(dayDates[day.key])}</div>
                  </td>
                  {SESSIONS.map(session => (
                    <td key={session.key} style={{ padding: '0.75rem', verticalAlign: 'top', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {session.slots.map(slot => {
                          const booking = getBooking(day.key, slot.id);
                          const sel = selected.has(`${day.key}|${slot.id}`);
                          return (
                            <SlotCell key={slot.id} slot={slot} session={session} booking={booking} selected={sel} userRole={userRole}
                              onToggle={() => toggleSlot(day.key, slot.id)}
                              onCancel={() => { setCancelTarget(booking); setCancelMssv(''); setErrorMsg(''); setShowCancelModal(true); }}
                              onViewDetails={() => { setDetailsTarget(booking); setShowDetailsModal(true); }}
                            />
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Floating Register Button */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 200, animation: 'floatIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <Button
            variant="primary"
            size="lg"
            icon={CheckSquare}
            iconPosition="left"
            onClick={() => { setShowRegModal(true); resetModal(); }}
            style={{ padding: '0 1.75rem', borderRadius: '50px', boxShadow: '0 8px 32px rgba(59,130,246,0.5)', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderColor: 'transparent' }}
          >
            Đăng ký {selected.size} buổi đã chọn
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL CHÍNH — ĐĂNG KÝ
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        title={
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <CheckSquare size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Đăng ký sử dụng phòng Lab</span>
          </div>
        }
        size="md"
        footer={regModalFooter}
      >
        <form id="register-booking-form" onSubmit={handleRegisterSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          {/* Slots summary */}
          <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'10px', padding:'0.85rem 1rem' }}>
            <div style={{ fontSize:'var(--text-2xs)', color:'var(--text-secondary)', marginBottom:'0.5rem', fontWeight:'700', letterSpacing:'0.05em' }}>
              CÁC BUỔI ĐÃ CHỌN ({selected.size})
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
              {[...selected].map(key => {
                const [dk, sid] = key.split('|');
                const day     = DAYS.find(d => d.key === dk);
                const session = SESSIONS.find(s => s.slots.some(sl => sl.id === sid));
                const slot    = session?.slots.find(sl => sl.id === sid);
                return (
                  <span key={key} style={{ background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.35)', padding:'0.2rem 0.65rem', borderRadius:'6px', fontSize:'var(--text-xs)', color:'#93c5fd' }}>
                    {day?.label} · {slot?.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ── Member picker button ── */}
          <div>
            <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)', fontWeight:'600', marginBottom:'0.75rem', display:'flex', alignItems:'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={14} /> Thành viên tham gia
              </div>
            </div>

            {/* The big picker button */}
            <button
              type="button"
              onClick={openPicker}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1.1rem',
                background: confirmedMssvs.size > 0 ? 'rgba(59,130,246,0.1)' : 'var(--bg-overlay)',
                border: confirmedMssvs.size > 0 ? '1px solid rgba(59,130,246,0.35)' : '1.5px dashed rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background: confirmedMssvs.size > 0 ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Users size={16} style={{ color: confirmedMssvs.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ textAlign:'left' }}>
                  {confirmedMssvs.size > 0 ? (
                    <>
                      <div className="text-sm" style={{ fontWeight:'600', color:'var(--text-primary)' }}>
                        {confirmedMssvs.size} thành viên đã chọn
                      </div>
                      <div className="text-xs" style={{ color:'var(--text-secondary)', marginTop:'1px' }}>
                        Nhấn để thay đổi danh sách
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm" style={{ color:'var(--text-secondary)' }}>Chọn thành viên tham gia</div>
                      <div className="text-xs" style={{ color:'#475569', marginTop:'1px' }}>Nhấn để mở danh sách CLB</div>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={18} style={{ color:'var(--text-muted)', flexShrink:0 }} />
            </button>
          </div>

          {/* Confirmed members summary */}
          {confirmedList.length > 0 && (
            <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:'10px', padding:'0.9rem 1rem' }}>
              <div style={{ fontSize:'var(--text-2xs)', color:'var(--accent-green)', marginBottom:'0.65rem', fontWeight:'700', letterSpacing:'0.05em' }}>
                DANH SÁCH THÀNH VIÊN ({confirmedList.length} người)
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                {confirmedList.map((m, i) => {
                  const isRep = repMssv === m.mssv;
                  return (
                    <div key={m.mssv} style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                      {/* Avatar */}
                      <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${avatarColor(m.name)},${avatarColor(m.mssv)})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'var(--text-2xs)', fontWeight:'700', color:'var(--text-primary)' }}>
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize:'var(--text-sm)', color:'var(--text-primary)', fontWeight:'500', whiteSpace: 'nowrap' }}>{m.name}</span>
                        <span style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)' }}>({m.mssv})</span>
                      </div>
                      {/* Rep badge / button */}
                      {isRep ? (
                        <span style={{ fontSize:'var(--text-2xs)', background:'rgba(59,130,246,0.2)', color:'var(--accent-blue)', padding:'0.18rem 0.5rem', borderRadius:'4px', fontWeight:'700', flexShrink:0 }}>
                          ⭐ Đại diện
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAsRep(m.mssv)}
                          style={{ fontSize:'var(--text-2xs)', background:'var(--bg-overlay)', color:'var(--text-secondary)', padding:'0.18rem 0.5rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', flexShrink:0 }}
                        >
                          Đặt đại diện
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && <div className="alert-message alert-error" style={{ margin:0 }}>{errorMsg}</div>}
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          POPUP CHỌN THÀNH VIÊN (z-index cao hơn modal chính)
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showMemberPicker}
        onClose={() => setShowMemberPicker(false)}
        title={
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Users size={18} style={{ color: 'var(--accent-blue)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>Chọn thành viên tham gia</span>
              <span style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>Tick vào thành viên sẽ sử dụng phòng</span>
            </div>
          </div>
        }
        size="md"
        footer={memberPickerFooter}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '70vh' }}>
          {/* Search */}
          <div style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:'0.7rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none', zIndex: 10 }} />
              <TextInput
                type="text"
                placeholder="Tìm theo tên hoặc MSSV..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                autoFocus
                style={{ paddingLeft: '2.1rem' }}
              />
            </div>
            {/* Select all / Clear */}
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button
                type="button"
                onClick={() => setPickerMssvs(new Set(members.map(m => m.mssv)))}
                style={{ fontSize:'var(--text-xs)', color:'var(--accent-blue)', background:'none', border:'none', cursor:'pointer', padding:0 }}
              >
                Chọn tất cả
              </button>
              <span style={{ color:'#475569' }}>·</span>
              <button
                type="button"
                onClick={() => setPickerMssvs(new Set())}
                style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)', background:'none', border:'none', cursor:'pointer', padding:0 }}
              >
                Bỏ chọn tất cả
              </button>
              {pickerMssvs.size > 0 && (
                <>
                  <span style={{ color:'#475569' }}>·</span>
                  <span style={{ fontSize:'var(--text-xs)', color:'var(--accent-green)', fontWeight:'600' }}>
                    Đã chọn: {pickerMssvs.size} người
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Member list */}
          <div style={{ flex:1, overflowY:'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '350px', paddingRight: '4px' }}>
            {filteredMembers.length === 0 ? (
              <div style={{ textAlign:'center', color:'#475569', padding:'2rem', fontSize:'var(--text-sm)' }}>Không tìm thấy thành viên</div>
            ) : (
              filteredMembers.map(m => {
                const checked = pickerMssvs.has(m.mssv);
                return (
                  <div
                    key={m.mssv}
                    onClick={() => togglePicker(m.mssv)}
                    style={{
                      display:'flex', alignItems:'center', gap:'0.75rem',
                      padding:'0.65rem 0.75rem',
                      background: checked ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.02)',
                      border: checked ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                      borderRadius:'10px', cursor:'pointer',
                      transition:'all 0.15s ease', userSelect:'none',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, background: checked ? 'var(--accent-blue)' : 'transparent', border: checked ? 'none' : '2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                      {checked && <span style={{ color:'var(--text-primary)', fontSize:'var(--text-xs)', fontWeight:'900' }}>✓</span>}
                    </div>

                    {/* Avatar */}
                    <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${avatarColor(m.name)},${avatarColor(m.mssv)})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'var(--text-xs)', fontWeight:'700', color:'var(--text-primary)' }}>
                      {m.name?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'var(--text-sm)', color:'var(--text-primary)', fontWeight:'500' }}>{m.name}</div>
                      <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)' }}>MSSV: {m.mssv}</div>
                    </div>

                    {checked && (
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent-blue)', flexShrink:0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          MODAL HỦY ĐẶT PHÒNG
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showCancelModal && !!cancelTarget}
        onClose={() => setShowCancelModal(false)}
        title={
          <div style={{ color:'var(--accent-red)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <ShieldAlert size={18} />
            <span>Hủy đặt phòng</span>
          </div>
        }
        size="sm"
        footer={cancelBookingFooter}
      >
        <form id="cancel-booking-form" onSubmit={handleCancelSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0 }}>Bạn đang hủy lịch đặt phòng của <strong>{cancelTarget?.representativeName}</strong>.</p>
            {userRole === 'student' ? (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: 0 }}>Chỉ người đại diện mới có thể xác nhận hủy.</p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Nhập MSSV người đại diện để xác nhận hủy</label>
                  <TextInput type="text" required placeholder="Nhập MSSV..." value={cancelMssv} onChange={e => setCancelMssv(e.target.value)} />
                </div>
              </>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                Bạn đang thao tác với tư cách Quản lý. Hệ thống cho phép hủy lịch mà không cần mã MSSV xác thực.
              </div>
            )}
            {errorMsg && <div className="alert-message alert-error" style={{ margin: 0 }}>{errorMsg}</div>}
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          MODAL HỦY TOÀN BỘ LỊCH ĐẶT PHÒNG
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showCancelAllModal}
        onClose={() => setShowCancelAllModal(false)}
        title={
          <div style={{ color:'var(--accent-red)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <ShieldAlert size={18} />
            <span>CẢNH BÁO: Hủy toàn bộ lịch</span>
          </div>
        }
        size="sm"
        footer={cancelAllBookingsFooter}
      >
        <form id="cancel-all-bookings-form" onSubmit={handleCancelAll}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <p style={{ fontWeight: 'bold', color: 'var(--accent-red)', marginBottom: '0.5rem', marginTop: 0 }}>Bạn có chắc chắn muốn hủy TOÀN BỘ lịch đặt phòng trên hệ thống không?</p>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Thao tác này sẽ xóa sạch tất cả các lịch đặt phòng hiện có. Thường chỉ nên dùng khi có sự kiện đặc biệt của Trường/CLB hoặc vào dịp nghỉ lễ dài ngày.</p>
            </div>
            {errorMsg && <div className="alert-message alert-error" style={{ margin: 0 }}>{errorMsg}</div>}
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════════════════
          MODAL CHI TIẾT ĐẶT PHÒNG / ĐIỂM DANH
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showDetailsModal && !!detailsTarget}
        onClose={() => setShowDetailsModal(false)}
        title={
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', color: 'var(--accent-blue)' }}>
            <Info size={18} />
            <span>Chi tiết điểm danh ({detailsTarget?.session?.attendees?.length || 0} người)</span>
          </div>
        }
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Đóng</Button>
        }
      >
        {detailsTarget && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Đại diện đặt phòng</p>
              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 'bold' }}>{detailsTarget.representativeName} ({detailsTarget.representativeMssv})</p>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Danh sách thành viên đăng ký</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {detailsTarget.members?.map(m => {
                  const mssv = typeof m === 'object' ? m.mssv : m;
                  const name = typeof m === 'object' ? m.name : m;
                  const isPresent = attendeesSet.has(mssv);
                  return (
                    <span key={mssv} style={{ 
                      padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: 'var(--text-xs)',
                      background: isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: isPresent ? 'var(--accent-green)' : 'var(--text-secondary)',
                      border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}`
                    }}>
                      {name} ({mssv}) {isPresent ? '(Có mặt)' : '(Vắng)'}
                    </span>
                  );
                })}
              </div>
            </div>

            {detailsTarget.session?.attendees?.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Lịch sử quẹt thẻ (Điểm danh & Vãng lai)</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 'var(--text-sm)', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Họ Tên / MSSV</th>
                        <th style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Mục đích</th>
                        <th style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Giờ vào</th>
                        <th style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Phân loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsTarget.session.attendees.map((a, i) => (
                        <tr key={i}>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>{a.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{a.mssv}</div>
                          </td>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{a.activity}</td>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {new Date(a.checkInAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {a.type === 'walk-in' ? (
                              <span style={{ color: 'var(--accent-amber)' }}>Vãng lai</span>
                            ) : (
                              <span style={{ color: 'var(--accent-green)' }}>Đăng ký</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>



      <style>{`
        @keyframes floatIn {
          from { opacity:0; transform:translateY(20px) scale(0.9); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── SlotCell ─────────────────────────────────────────────────────────────────
function SlotCell({ slot, session, booking, selected, onToggle, onCancel, onViewDetails, userRole }) {
  const booked = !!booking;
  const bg     = booked ? 'rgba(239,68,68,0.08)' : selected ? 'rgba(59,130,246,0.18)' : session.bgColor;
  const border = booked ? '1px solid rgba(239,68,68,0.3)' : selected ? '2px solid #3b82f6' : `1px solid ${session.borderColor}`;

  return (
    <div onClick={!booked ? onToggle : undefined}
      style={{ background:bg, border, borderRadius:'8px', padding:'0.5rem 0.65rem', cursor: booked?'default':'pointer', transition:'all 0.15s ease', userSelect:'none' }}>

      {/* Hàng 1: nhãn giờ */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', marginBottom:'0.25rem' }}>
        <Clock size={11} style={{ color: booked?'var(--accent-red)':session.color, flexShrink:0 }} />
        <span style={{ fontSize:'var(--text-xs)', fontWeight:'600', color: booked?'var(--accent-red)':session.color }}>{slot.label}</span>
        {selected && !booked && (
          <span style={{ marginLeft:'auto', width:14, height:14, borderRadius:'50%', background:'var(--accent-blue)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'var(--text-primary)', fontSize:'var(--text-2xs)', fontWeight:'900' }}>✓</span>
          </span>
        )}
      </div>

      {booked ? (
        /* Hàng 2: tên + số người bên trái, nút Hủy bên phải — cùng 1 hàng */
        <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'var(--text-xs)', color:'var(--text-primary)', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {booking.representativeName}
              </div>
              <div style={{ fontSize:'var(--text-2xs)', color:'var(--text-secondary)', marginTop:'1px' }}>
                {booking.participantsCount || booking.members?.length || 1} người
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <button
                onClick={e => { e.stopPropagation(); onViewDetails(); }}
                style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'2px', fontSize:'var(--text-2xs)', background:'rgba(59, 130, 246, 0.15)', color:'var(--accent-blue)', border:'1px solid rgba(59, 130, 246, 0.25)', borderRadius:'5px', padding:'0.22rem 0.5rem', cursor:'pointer' }}
              >
                <Info size={9} /> Chi tiết
              </button>
              <button
                onClick={e => { e.stopPropagation(); onCancel(); }}
                style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'2px', fontSize:'var(--text-2xs)', background:'rgba(239,68,68,0.15)', color:'var(--accent-red)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'5px', padding:'0.22rem 0.5rem', cursor:'pointer' }}
              >
                <Trash2 size={9} /> Hủy
              </button>
            </div>
          </div>
          {/* Trạng thái Check-in / Check-out */}
          {booking.checkedIn && !booking.checkedOut && (
            <div style={{ display:'inline-block', alignSelf:'flex-start', fontSize:'var(--text-2xs)', background:'rgba(16, 185, 129, 0.15)', color:'var(--accent-green)', padding:'0.15rem 0.4rem', borderRadius:'4px', fontWeight:'600', border:'1px solid rgba(16, 185, 129, 0.3)' }}>
              🟢 Đang sử dụng
            </div>
          )}
          {booking.checkedOut && (
            <div style={{ display:'inline-block', alignSelf:'flex-start', fontSize:'var(--text-2xs)', background:'rgba(255, 255, 255, 0.1)', color:'var(--text-secondary)', padding:'0.15rem 0.4rem', borderRadius:'4px', fontWeight:'600', border:'1px solid rgba(255, 255, 255, 0.15)' }}>
              ⚪ Đã trả phòng
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize:'var(--text-xs)', color:'#475569', fontStyle:'italic' }}>
          {selected ? 'Đã chọn' : 'Trống – nhấn để chọn'}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const thStyle = (extra={}) => ({ padding:'1rem 1.25rem', textAlign:'center', color:'var(--text-secondary)', fontWeight:'600', fontSize:'var(--text-sm)', borderBottom:'1px solid rgba(255,255,255,0.06)', ...extra });
const navBtnStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-primary)', width:28, height:28, borderRadius:6, cursor:'pointer', fontSize:'var(--text-lg)', display:'flex', alignItems:'center', justifyContent:'center' };
const iconBtnStyle = { background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center' };
