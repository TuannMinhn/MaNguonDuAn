import React, { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { Search, Clock, ShieldCheck, Inbox, Award, X, User, Tag, CheckCircle, ShieldAlert } from 'lucide-react';
import RfidScanModal from '../components/RfidScanModal';
import Button from '../components/Button';
import { API_BASE_URL } from '../config';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
export default function Attendance() {
  const { data: logs = [], mutate: mutateLogs } = useSWR(`${API_BASE_URL}/attendance`, fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRfidModal, setShowRfidModal] = useState(false);
  const [scannedUser, setScannedUser] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const scanningRef = useRef(false);

  const totalHours = useMemo(() => {
    const hours = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    return Math.round(hours * 10) / 10;
  }, [logs]);

  // Bắt sự kiện bàn phím khi modal mở
  useEffect(() => {
    if (!showRfidModal) return;

    const handleKeyPress = async (e) => {
      if (scanningRef.current) return; // Chặn ngay lập tức (đồng bộ)
      if (['1', '2', '3', '4'].includes(e.key)) {
        scanningRef.current = true; // Khóa ngay trước khi gọi API
        const cardId = `CARD-00${e.key}`;
        await handleRfidScan(cardId);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showRfidModal]);

  const handleRfidScan = async (cardId) => {
    try {
      // Gọi API quét thẻ để lấy thông tin
      const scanRes = await fetch(`${API_BASE_URL}/rfid-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      });
      const scanData = await scanRes.json();

      if (!scanRes.ok) {
        setCheckResult({ type: 'error', message: scanData.error || 'Thẻ không hợp lệ' });
        scanningRef.current = false;
        return;
      }

      setScannedUser(scanData);

      // Tự động check-in/out sau 1 giây
      setTimeout(async () => {
        await performCheckInOut(cardId);
      }, 1000);

    } catch (error) {
      setCheckResult({ type: 'error', message: 'Lỗi kết nối hệ thống RFID' });
      scanningRef.current = false;
    }
  };

  const performCheckInOut = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      });
      const data = await res.json();

      if (!res.ok) {
        setCheckResult({ type: 'error', message: data.error });
      } else {
        setCheckResult({ 
          type: 'success', 
          message: data.message,
          checkType: data.type,
          user: data.user,
          duration: data.duration,
          points: data.pointsEarned
        });
        
        // Refresh logs sau 3 giây
        setTimeout(() => {
          mutateLogs();
          setShowRfidModal(false);
          setScannedUser(null);
          setCheckResult(null);
          scanningRef.current = false;
        }, 3000);
      }
    } catch (error) {
      setCheckResult({ type: 'error', message: 'Lỗi kết nối tới server' });
      scanningRef.current = false;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
           date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const attendanceColumns = React.useMemo(() => [
    { accessorKey: 'mssv', header: 'MSSV', sortable: true, cell: (row) => <span style={{ fontWeight: '500' }}>{row.mssv}</span> },
    { accessorKey: 'name', header: 'Họ Tên', sortable: true, cell: (row) => <span style={{ fontWeight: '500' }}>{row.name}</span> },
    { accessorKey: 'checkInTime', header: 'Thời gian Check-in', sortable: true, cell: (row) => formatTime(row.checkInTime) },
    { accessorKey: 'checkOutTime', header: 'Thời gian Check-out', sortable: true, cell: (row) => formatTime(row.checkOutTime) },
    { accessorKey: 'duration', header: 'Thời lượng', sortable: true, cell: (row) => (
      <span style={{ fontWeight: '600', color: 'var(--accent-green)' }}>
        {row.duration !== null ? `${row.duration} giờ` : '-'}
      </span>
    )},
    { accessorKey: 'status', header: 'Trạng thái', sortable: true, cell: (row) => (
      row.checkOutTime ? (
        <span className="badge badge-info">Đã hoàn thành</span>
      ) : (
        <span className="badge badge-success">Đang trực Lab</span>
      )
    )}
  ], []);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-header">
            <Clock className="text-blue-500" size={20} />
            Nhật ký điểm danh trực Lab
          </h2>
          <p className="page-subtitle">Lịch sử chi tiết hoạt động Check-in và Check-out của các thành viên CLB</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setShowRfidModal(true);
            setScannedUser(null);
            setCheckResult(null);
          }}
        >
          🔐 Quét thẻ điểm danh
        </Button>
      </div>

      {/* Thống kê nhanh */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', color: 'var(--accent-blue)' }}>
              <ShieldCheck size={18} />
            </div>
            <span className="stat-label">Tổng lượt Check-in</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{logs.length}</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', color: 'var(--accent-green)' }}>
              <Clock size={18} />
            </div>
            <span className="stat-label">Tổng thời gian trực Lab</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalHours} giờ</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-amber) 15%, transparent)', color: 'var(--accent-amber)' }}>
              <Award size={18} />
            </div>
            <span className="stat-label">Đang ở Lab hiện tại</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">{logs.filter(l => !l.checkOutTime).length}</span>
          </div>
        </div>
      </div>

      {/* Nhật ký chi tiết */}
      <Card
        title={`Lịch sử chi tiết (${logs.length})`}
        icon={Clock}
      >
        <DataTable
          data={logs}
          columns={attendanceColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchKeys={['mssv', 'name']}
          searchPlaceholder="Tìm theo MSSV hoặc Họ tên thành viên..."
        />
      </Card>

      {/* MODAL RFID ĐIỂM DANH (Giao diện Kiosk) */}
      <RfidScanModal
        isOpen={showRfidModal}
        onClose={() => {
          setShowRfidModal(false);
          setScannedUser(null);
          setCheckResult(null);
        }}
        status={checkResult?.type === 'error' ? 'error' : checkResult?.type === 'success' ? 'success' : 'idle'}
        scannedUser={checkResult?.user}
        errorMessage={checkResult?.message}
        idleTitle="Điểm danh trực Lab"
        successTitle={checkResult?.message || "Thành công!"}
        successChildren={
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.7)' }}>Thành viên:</span> <strong style={{ fontSize: '1.1rem' }}>{checkResult?.user?.name}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.7)' }}>Vai trò:</span> <strong>{checkResult?.user?.role}</strong></div>
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {checkResult?.checkType === 'check_in' ? (
                  <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={16} /> Thời gian vào: {formatTime(new Date())}
                  </span>
                ) : (
                  <span style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={16} /> Thời gian ra: {formatTime(new Date())}
                    {checkResult?.duration && ` (Đã trực: ${checkResult.duration} giờ)`}
                  </span>
                )}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
