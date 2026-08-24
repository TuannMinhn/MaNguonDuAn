import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { API_BASE_URL } from '../config';
import { fetcher } from '../utils/fetcher';
import DataTable from '../components/DataTable';
import ExportModal from '../components/ExportModal';
import * as XLSX from 'xlsx';
import Button from '../components/Button';
import Select from '../components/Select';
import SessionReportModal from '../components/bookings/SessionReportModal';
import { Users, Clock, Calendar, Info, X, CheckCircle, XCircle, UserPlus, Download, Zap, Briefcase, FileText, Plus } from 'lucide-react';

const SESSIONS = [
  {
    key: 'morning', label: 'Sáng',
    slots: [
      { id: 'morning_1', label: '7:00 – 9:00' },
      { id: 'morning_2', label: '9:00 – 11:00' },
    ],
  },
  {
    key: 'afternoon', label: 'Chiều',
    slots: [
      { id: 'afternoon_1', label: '12:00 – 14:00' },
      { id: 'afternoon_2', label: '14:00 – 16:00' },
    ],
  },
  {
    key: 'evening', label: 'Tối',
    slots: [
      { id: 'evening_1', label: '16:00 – 18:00' },
      { id: 'evening_2', label: '18:00 – 20:00' },
    ],
  },
];

export default function RoomHistory() {
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    let start, end;
    const today = new Date();
    
    if (period === '1week') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      end = today;
    } else if (period === '1month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      end = today;
    } else if (period === '1quarter') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      end = today;
    } else if (period === '1year') {
      start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      end = today;
    } else if (period === 'custom') {
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      }
    } else if (period === 'all') {
      start = null;
      end = null;
    }

    if (start && end) {
      const sDate = start.toISOString().split('T')[0];
      const eDate = end.toISOString().split('T')[0];
      setReportUrl(`${API_BASE_URL}/reports/comprehensive?start=${sDate}&end=${eDate}`);
    } else if (period !== 'custom') {
      setReportUrl(`${API_BASE_URL}/reports/comprehensive`);
    }
  }, [period, customStart, customEnd]);

  const { data: report } = useSWR(reportUrl, fetcher);
  const { data: historyData, error, mutate: mutateHistory } = useSWR(`${API_BASE_URL}/bookings/history`, fetcher);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const history = useMemo(() => {
    if (!historyData) return null;
    let start, end;
    const today = new Date();
    
    if (period === '1week') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      end = today;
    } else if (period === '1month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      end = today;
    } else if (period === '1quarter') {
      start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      end = today;
    } else if (period === '1year') {
      start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      end = today;
    } else if (period === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
    }
    
    if (period === 'all') {
      return historyData;
    }
    
    if (start && end) {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return historyData.filter(h => {
        const d = new Date(h.date);
        return d >= start && d <= end;
      });
    }
    return historyData;
  }, [historyData, period, customStart, customEnd]);


  const roomHistoryExportColumns = [
    { id: 'date', label: 'Thời gian', defaultChecked: true },
    { id: 'slotId', label: 'Ca / Khung giờ', defaultChecked: true },
    { id: 'representativeName', label: 'Người đại diện', defaultChecked: true },
    { id: 'representativeMssv', label: 'MSSV', defaultChecked: true },
    { id: 'members', label: 'Số thành viên', defaultChecked: true },
    { id: 'status', label: 'Trạng thái', defaultChecked: true },
    { id: 'feedback', label: 'Phản hồi', defaultChecked: false }
  ];

  const handleAdvancedRoomHistoryExport = async (config) => {
    const { scope, format, selectedColumns } = config;
    let dataToExport = history || [];

    const headers = [];
    const keys = [];
    roomHistoryExportColumns.forEach(col => {
      if (selectedColumns.includes(col.id)) {
        headers.push(col.label);
        keys.push(col.id);
      }
    });

    const rows = dataToExport.map((h, idx) => {
      return keys.map(key => {
        let val = h[key];
        if (key === 'slotId') {
          const sessionLabel = SESSIONS.find(s => s.slots.some(sl => sl.id === h.slotId))?.slots.find(sl => sl.id === h.slotId)?.label || h.slotId;
          return sessionLabel;
        }
        if (key === 'members') {
          return h.members ? h.members.length : 0;
        }
        if (val === undefined || val === null) return '';
        return val;
      });
    });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filename = `lich_su_phong_${timestamp}.${format}`;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        const formattedRow = row.map(cell => {
          let cellStr = String(cell).replace(/"/g, '""');
          if (cellStr.includes(',') || cellStr.includes('\n')) cellStr = `"${cellStr}"`;
          return cellStr;
        });
        csvContent += formattedRow.join(",") + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Lịch sử phòng");
      XLSX.writeFile(wb, filename);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Đã hoàn thành':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'Đang diễn ra':
        return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'Vắng mặt':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.2)' };
      case 'Sắp tới':
      case 'Hôm nay':
      default:
        return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.2)' };
    }
  };

  const getSlotLabel = (slotId) => {
    for (let s of SESSIONS) {
      const found = s.slots.find(x => x.id === slotId);
      if (found) {
        return `${s.label} (${found.label})`;
      }
    }
    return slotId;
  };

  const historyColumns = React.useMemo(() => [
    { accessorKey: 'date', header: 'Thời gian', sortable: true, cell: (row) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: '600' }}>{new Date(row.date).toLocaleDateString('vi-VN')}</span>
        <span className="text-xs text-muted">
          {new Date(row.date).toLocaleDateString('vi-VN', { weekday: 'long' })}
        </span>
      </div>
    )},
    { accessorKey: 'slotId', header: 'Ca / Khung giờ', sortable: true, cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontWeight: '500', background: 'rgba(59, 130, 246, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
        <Clock size={14} /> {getSlotLabel(row.slotId)}
      </span>
    )},
    { accessorKey: 'representativeName', header: 'Người đại diện', sortable: true, cell: (row) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: '500' }}>{row.representativeName}</span>
        <span className="text-sm text-muted" style={{ fontFamily: 'monospace' }}>
          {row.representativeMssv}
        </span>
      </div>
    )},
    { accessorKey: 'membersCount', header: 'Thành viên tham gia', sortable: true, cell: (row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
        <Users size={15} /> {row.members ? row.members.length : 0} người
      </span>
    )},
    { accessorKey: 'status', header: 'Trạng thái', sortable: true, cell: (row) => {
      const style = getStatusStyle(row.status);
      return (
        <span className="text-sm" style={{ background: style.bg, color: style.color, border: style.border, padding: '0.3rem 0.6rem', borderRadius: '20px', fontWeight: '500', display: 'inline-block' }}>
          {row.status}
        </span>
      );
    }}
  ], []);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-header">
            <Calendar className="text-blue-500" size={20} />
            Lịch sử sử dụng phòng
          </h2>
          <p className="page-subtitle">Xem lại các ca đăng ký phòng trong quá khứ và đánh giá tình trạng tham gia.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
          <div style={{ width: '280px' }}>
            <Select 
              value={period}
              onChange={setPeriod}
              options={[
                { value: "all", label: "Tất cả các ca" },
                { value: "1week", label: "1 Tuần qua" },
                { value: "1month", label: "1 Tháng qua" },
                { value: "1quarter", label: "1 Quý (3 tháng) qua" },
                { value: "1year", label: "1 Năm qua" },
                { value: "custom", label: "Tùy chỉnh..." }
              ]}
            />
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="date" className="search-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <span> - </span>
              <input type="date" className="search-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          )}

          <Button 
            variant="secondary"
            icon={Download}
            onClick={() => setIsExportModalOpen(true)}
            disabled={!report || !history}
          >
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success flex items-center gap-2 mb-4">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger flex items-center gap-2 mb-4">
          <XCircle size={20} />
          {errorMsg}
        </div>
      )}

      {report && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', color: 'var(--accent-blue)' }}>
                <Clock size={18} />
              </div>
              <span className="stat-label">Tổng giờ sử dụng (h)</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalHours}</span>
            </div>
          </div>
          
          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }}>
                <Calendar size={18} />
              </div>
              <span className="stat-label">Tổng số ca dùng phòng</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalSessions}</span>
            </div>
          </div>

          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', color: 'var(--accent-purple)' }}>
                <Users size={18} />
              </div>
              <span className="stat-label">Tổng lượt người</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.totalAttendees}</span>
            </div>
          </div>

          <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
                <UserPlus size={18} />
              </div>
              <span className="stat-label">Người không đăng ký</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{report.roomStats.walkInCount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <div style={{ color: 'var(--accent-red)', padding: '1rem', textAlign: 'center' }}>
            Không thể tải dữ liệu lịch sử.
          </div>
        ) : !history ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Đang tải dữ liệu...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Chưa có dữ liệu lịch sử dùng phòng.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={20} style={{ color: 'var(--accent-blue)' }} />
                Danh sách các ca đã dùng ({history.length})
              </h2>
            </div>
            
            <DataTable
              data={history.map(item => ({...item, membersCount: item.members ? item.members.length : 0}))}
              columns={historyColumns}
              onRowClick={(row) => setSelectedItem({...row, slotLabel: getSlotLabel(row.slotId)})}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content glass-card fade-in" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết ca sử dụng phòng</h3>
              <Button variant="ghost" icon={X} onClick={() => setSelectedItem(null)} style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }} />
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div className="text-xs text-muted">Thời gian</div>
                  <div style={{ fontWeight: '600' }}>{selectedItem.date}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Khung giờ</div>
                  <div style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>{selectedItem.slotLabel}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Users size={18} color="var(--accent-purple)" /> Nhóm đăng ký ({selectedItem.members ? selectedItem.members.length : 0})
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(selectedItem.members || []).map(m => {
                    const isRep = m.mssv === selectedItem.representativeMssv;
                    const isPresent = selectedItem.session?.attendees?.some(a => a.mssv === m.mssv);
                    
                    return (
                      <div key={m.mssv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: isPresent ? '3px solid var(--accent-green)' : '3px solid var(--accent-red)' }}>
                        <div>
                          <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {m.name} 
                            {isRep && <span className="text-tiny" style={{ padding: '0.1rem 0.4rem', background: 'var(--accent-amber)', color: '#000', borderRadius: '4px', fontWeight: 'bold' }}>Đại diện</span>}
                          </div>
                          <div className="text-xs text-muted">MSSV: {m.mssv}</div>
                        </div>
                        <div>
                          {isPresent ? (
                            <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-green)' }}>
                              <CheckCircle size={14} /> Có mặt
                            </span>
                          ) : (
                            <span className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-red)' }}>
                              <XCircle size={14} /> Vắng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lên ké */}
              {selectedItem.session && (() => {
                const registeredMssvs = (selectedItem.members || []).map(m => m.mssv);
                const extraAttendees = (selectedItem.session.attendees || []).filter(a => !registeredMssvs.includes(a.mssv));
                
                if (extraAttendees.length === 0) return null;
                
                return (
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-amber)' }}>
                      <UserPlus size={18} /> Khách / Thành viên đi cùng ({extraAttendees.length})
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {extraAttendees.map(a => (
                        <div key={a.mssv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
                          <div>
                            <div style={{ fontWeight: '500' }}>{a.name}</div>
                            <div className="text-xs text-muted">MSSV/ĐV: {a.mssv}</div>
                          </div>
                          <div className="text-xs text-muted">
                            (Quẹt thẻ vào phòng)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Báo cáo ca trực */}
              {selectedItem.checkoutReport && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-green)' }}>
                    <FileText size={18} /> Báo cáo Ca trực / Bàn giao
                  </h4>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
                      Được báo cáo lúc: {new Date(selectedItem.checkoutReport.reportedAt).toLocaleString('vi-VN')}
                    </div>
                    
                    {selectedItem.checkoutReport.consumables?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>Linh kiện tiêu hao:</strong>
                        <ul className="text-sm" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          {selectedItem.checkoutReport.consumables.map((c, idx) => (
                            <li key={idx}>{c.name} - SL: {c.qty}</li>
                          ))}
                        </ul>
                      </div>
                    )}
 
                    {selectedItem.checkoutReport.issues?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong className="text-sm" style={{ color: 'var(--accent-amber)' }}>Báo hỏng thiết bị:</strong>
                        <ul className="text-sm" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          {selectedItem.checkoutReport.issues.map((i, idx) => (
                            <li key={idx}>{i.name}: {i.issueDescription}</li>
                          ))}
                        </ul>
                      </div>
                    )}
 
                    {selectedItem.checkoutReport.notes && (
                      <div>
                        <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>Ghi chú:</strong>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          "{selectedItem.checkoutReport.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {selectedItem.status !== 'Sắp tới' && !selectedItem.checkoutReport && (
                  <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowReportModal(true)}>
                    Tạo Báo cáo ca trực / Checkout
                  </Button>
                )}
                {selectedItem.checkoutReport && (
                  <div style={{ padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={18} /> Đã báo cáo ca trực
                  </div>
                )}
              </div>
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Báo cáo Modal */}
      {selectedItem && showReportModal && (
        <SessionReportModal 
          isOpen={showReportModal} 
          onClose={() => setShowReportModal(false)} 
          booking={selectedItem}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            setSelectedItem(null);
            mutateHistory();
            setTimeout(() => setSuccessMsg(''), 3000);
          }}
          setErrorMsg={(msg) => {
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 3000);
          }}
        />
      )}

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={roomHistoryExportColumns}
        counts={{
          all: history?.length || 0,
          filtered: history?.length || 0,
          selected: 0
        }}
        onExport={handleAdvancedRoomHistoryExport}
      />
    </div>
  );
}
