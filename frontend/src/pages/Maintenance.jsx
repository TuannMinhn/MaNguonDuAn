import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import {
  Wrench,
  Search,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Inbox,
  Clock,
  Download
} from 'lucide-react';
import { useSortableTable } from '../hooks/useSortableTable.jsx';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import * as XLSX from 'xlsx';
import ExportModal from '../components/ExportModal';
import Card from '../components/Card';
import Modal from '../components/Modal';

export default function Maintenance() {
  const { data: maintenanceList = [], mutate: mutateMaintenance } = useSWR(`${API_BASE_URL}/maintenance`, fetcher);
  const { data: equipmentList = [] } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [equipSearchTerm, setEquipSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Tất cả vị trí');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả trạng thái');
  const [activeTab, setActiveTab] = useState('active'); // active, resolved
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormats, setExportFormats] = useState({ xlsx: true, docx: true });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // States cho Modal Xem chi tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null);
  
  // States cho Modal Báo hỏng 2 bước
  const [modalStep, setModalStep] = useState(1); // 1: Chọn thiết bị, 2: Nhập chi tiết hỏng
  const [priority, setPriority] = useState('Trung bình'); // Thấp, Trung bình, Khẩn cấp

  // Form States
  const [addForm, setAddForm] = useState({ equipmentId: '', issueDescription: '' });
  const [editForm, setEditForm] = useState({ issueDescription: '', status: 'Đang sửa', cost: 0, newNote: '' });

  // Lấy danh sách vị trí và trạng thái duy nhất từ thiết bị để lọc
  const locations = useMemo(() => {
    const list = equipmentList.filter(e => e.assetType !== 'Linh kiện tiêu hao').map(e => e.location).filter(Boolean);
    return ['Tất cả vị trí', ...new Set(list)];
  }, [equipmentList]);

  const statuses = useMemo(() => {
    const list = equipmentList.filter(e => e.assetType !== 'Linh kiện tiêu hao').map(e => e.status).filter(Boolean);
    return ['Tất cả trạng thái', ...new Set(list)];
  }, [equipmentList]);

  // Lọc thiết bị trực quan cho modal báo hỏng
  const filteredEquipment = useMemo(() => {
    return equipmentList
      .filter(e => e.assetType !== 'Linh kiện tiêu hao')
      .filter(e => {
        const search = equipSearchTerm.toLowerCase();
        const matchesSearch = e.name.toLowerCase().includes(search) || e.code.toLowerCase().includes(search);
        const matchesLocation = selectedLocation === 'Tất cả vị trí' || e.location === selectedLocation;
        const matchesStatus = selectedStatus === 'Tất cả trạng thái' || e.status === selectedStatus;
        return matchesSearch && matchesLocation && matchesStatus;
      });
  }, [equipmentList, equipSearchTerm, selectedLocation, selectedStatus]);

  // Filtering
  const filteredList = useMemo(() => {
    return maintenanceList.filter(item => {
      const isResolved = item.status === 'Đã sửa';
      return activeTab === 'resolved' ? isResolved : !isResolved;
    });
  }, [maintenanceList, activeTab]);

  // Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const eq = equipmentList.find(e => e.id === addForm.equipmentId);
    if (!eq) return setErrorMsg('Vui lòng chọn thiết bị');

    try {
      const res = await fetch(`${API_BASE_URL}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: eq.id,
          equipmentName: eq.name,
          issueDescription: `[Mức độ: ${priority}] ${addForm.issueDescription}`
        })
      });
      if (res.ok) {
        setSuccessMsg('Đã tạo phiếu bảo trì / báo hỏng');
        setShowAddModal(false);
        setAddForm({ equipmentId: '', issueDescription: '' });
        mutateMaintenance();
      } else {
        const data = await res.json();
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ');
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setSuccessMsg('Đã cập nhật phiếu bảo trì');
        setShowEditModal(false);
        mutateMaintenance();
      } else {
        const data = await res.json();
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối');
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if(!window.confirm('Xóa phiếu bảo trì này?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/maintenance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Đã xóa phiếu bảo trì');
        mutateMaintenance();
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối');
    }
  };

  // Stats
  const activeCount = useMemo(() => maintenanceList.filter(m => m.status !== 'Đã sửa').length, [maintenanceList]);
  const resolvedCount = useMemo(() => maintenanceList.filter(m => m.status === 'Đã sửa').length, [maintenanceList]);
  const totalCost = maintenanceList.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const activeIssues = activeCount;

  const handleExportAction = async (config) => {
    const { docType } = config;
    const selectedTickets = maintenanceList.filter(item => selectedIds.includes(item.id));
    
    if (docType === 'summary') {
      const wb = XLSX.utils.book_new();
      const headers = ["STT", "Tên thiết bị", "Mô tả lỗi", "Ngày báo hỏng", "Trạng thái", "Chi phí (VNĐ)"];
      const rows = selectedTickets.map((t, idx) => [
        idx + 1,
        t.equipmentName,
        t.issueDescription,
        new Date(t.reportedDate).toLocaleDateString('vi-VN'),
        t.status,
        t.cost
      ]);
      const total = selectedTickets.reduce((sum, t) => sum + (t.cost || 0), 0);
      rows.push(["", "TỔNG CỘNG", "", "", "", total]);
      
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Đề xuất bảo trì");
      XLSX.writeFile(wb, `De_xuat_bao_tri_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (docType === 'proposal') {
      const total = selectedTickets.reduce((sum, t) => sum + (t.cost || 0), 0);
      const totalFormatted = total.toLocaleString('vi-VN');
      const rowsHtml = selectedTickets.map((t, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${t.equipmentName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${t.issueDescription}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${new Date(t.reportedDate).toLocaleDateString('vi-VN')}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">${t.cost > 0 ? t.cost.toLocaleString('vi-VN') : '-'}</td>
        </tr>
      `).join('');
      
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Đơn đề xuất sửa chữa thiết bị</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 8px; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="text-align: center; width: 40%; border: none;">
                <strong>CLB NGHIÊN CỨU KHOA HỌC</strong><br/>
                <strong>BAN QUẢN LÝ PHÒNG LAB</strong><br/>
                -------------------
              </td>
              <td style="text-align: center; width: 60%; border: none;">
                <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
                <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
                --------------------------------
              </td>
            </tr>
          </table>
          <h2 style="text-align: center; margin-top: 30px; margin-bottom: 20px;">ĐƠN ĐỀ XUẤT SỬA CHỮA & BẢO TRÌ THIẾT BỊ</h2>
          <p>Kính gửi: Ban chủ nhiệm CLB / Ban quản lý phòng Lab</p>
          <p>Căn cứ tình trạng hoạt động thực tế của thiết bị phòng Lab, tôi xin đề xuất sửa chữa và bảo dưỡng các thiết bị hư hỏng sau đây:</p>
          <table>
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th>STT</th>
                <th>Tên Thiết Bị</th>
                <th>Mô Tả Lỗi</th>
                <th>Ngày Báo Hỏng</th>
                <th>Chi Phí Thực Tế (đ)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <p style="text-align: right; font-weight: bold;">Tổng chi phí đề xuất: ${totalFormatted} VNĐ</p>
          <p>Kính mong Ban quản lý phê duyệt kinh phí để tiến hành khắc phục sự cố sớm nhất.</p>
          <br/><br/>
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="text-align: center; width: 50%; border: none;">
                <strong>Người đề xuất</strong><br/>
                <span style="font-size: 0.8rem; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
              <td style="text-align: center; width: 50%; border: none;">
                <strong>Người phê duyệt</strong><br/>
                <span style="font-size: 0.8rem; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `De_xuat_sua_chua_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (docType === 'handover') {
      const rowsHtml = selectedTickets.map((t, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${t.equipmentName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${t.issueDescription}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${new Date(t.reportedDate).toLocaleDateString('vi-VN')}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">Đã khắc phục hoàn toàn / Hoạt động tốt</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Biên bản nghiệm thu bàn giao thiết bị</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 8px; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="text-align: center; width: 40%; border: none;">
                <strong>CLB NGHIÊN CỨU KHOA HỌC</strong><br/>
                <strong>BAN QUẢN LÝ PHÒNG LAB</strong><br/>
                -------------------
              </td>
              <td style="text-align: center; width: 60%; border: none;">
                <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
                <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
                --------------------------------
              </td>
            </tr>
          </table>
          <h2 style="text-align: center; margin-top: 30px; margin-bottom: 20px;">BIÊN BẢN NGHIỆM THU VÀ BÀN GIAO THIẾT BỊ SỬA CHỮA</h2>
          <p>Hôm nay, ngày ${new Date().toLocaleDateString('vi-VN')}, Ban quản lý phòng Lab tiến hành nghiệm thu bàn giao các thiết bị bảo dưỡng sau:</p>
          <table>
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th>STT</th>
                <th>Tên Thiết Bị</th>
                <th>Sự Cố Khắc Phục</th>
                <th>Ngày Báo Lỗi</th>
                <th>Kết Quả Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <p>Các thiết bị nêu trên đã được khắc phục hoàn toàn sự cố kỹ thuật, chạy thử hoạt động ổn định và đủ điều kiện đưa về tủ kho bảo quản phục vụ nhu cầu hoạt động chung của Lab.</p>
          <br/><br/>
          <table style="width: 100%; border: none;">
            <tr style="border: none;">
              <td style="text-align: center; width: 50%; border: none;">
                <strong>Đại diện bàn giao (Kỹ thuật)</strong><br/>
                <span style="font-size: 0.8rem; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
              <td style="text-align: center; width: 50%; border: none;">
                <strong>Đại diện tiếp nhận (Lab)</strong><br/>
                <span style="font-size: 0.8rem; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bien_ban_nghiem_thu_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    setShowExportModal(false);
    setSelectedIds([]);
  };

  const handleViewDetailClick = (item) => {
    setSelectedDetailTicket(item);
    setShowDetailModal(true);
  };

  const handleEditClick = (item) => {
    setSelectedTicket(item);
    setEditForm({ issueDescription: item.issueDescription, status: item.status, cost: item.cost, newNote: '' });
    setShowEditModal(true);
  };

  const handleDeleteClick = (id) => handleDelete(id);

  const maintenanceColumns = useMemo(() => {
    const cols = [];
    if (activeTab === 'resolved') {
      cols.push({
        accessorKey: 'select',
        header: (
          <input 
            type="checkbox"
            style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
            checked={filteredList.length > 0 && filteredList.every(item => selectedIds.includes(item.id))}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(filteredList.map(item => item.id));
              } else {
                setSelectedIds([]);
              }
            }}
          />
        ),
        width: '5%',
        sortable: false,
        cell: (row) => (
          <input 
            type="checkbox"
            style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
            checked={selectedIds.includes(row.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds([...selectedIds, row.id]);
              } else {
                setSelectedIds(selectedIds.filter(id => id !== row.id));
              }
            }}
          />
        )
      });
    }

    cols.push(
      { 
        accessorKey: 'equipmentName', 
        header: 'Thiết bị', 
        width: '28%', 
        sortable: true, 
        cell: (row) => (
          <span 
            style={{ 
              fontWeight: '600', 
              color: 'var(--accent-blue)', 
              cursor: 'pointer',
              display: 'inline-block',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => handleViewDetailClick(row)}
            title="Nhấn để xem chi tiết phiếu bảo trì"
          >
            {row.equipmentName}
          </span>
        ) 
      },
      { 
        accessorKey: 'issueDescription', 
        header: 'Mô tả lỗi', 
        width: '26%', 
        sortable: true, 
        cell: (row) => (
          <span 
            style={{ 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-block',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => handleViewDetailClick(row)}
            title="Nhấn để xem chi tiết"
          >
            {row.issueDescription}
          </span>
        ) 
      },
      { 
        accessorKey: 'reportedDate', 
        header: 'Ngày báo hỏng', 
        width: '14%', 
        sortable: true, 
        cell: (row) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {new Date(row.reportedDate).toLocaleDateString('vi-VN')}
          </span>
        )
      },
      { 
        accessorKey: 'status', 
        header: 'Trạng thái', 
        width: '14%', 
        sortable: true, 
        cell: (row) => {
          const isResolved = row.status === 'Đã sửa';
          return (
            <span className={`badge ${isResolved ? 'badge-success' : 'badge-warning'}`}>
              {row.status}
            </span>
          );
        }
      },
      { 
        accessorKey: 'cost', 
        header: 'Chi phí', 
        width: '10%', 
        sortable: true, 
        align: 'right', 
        cell: (row) => (
          <span style={{ fontWeight: row.cost ? '600' : 'normal', color: row.cost ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {row.cost ? `${row.cost.toLocaleString('vi-VN')} đ` : '-'}
          </span>
        )
      },
      { 
        accessorKey: 'actions', 
        header: 'Thao tác', 
        width: '8%', 
        sortable: false, 
        align: 'right', 
        cell: (row) => (
          <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Button 
              size="sm" 
              variant="ghost" 
              icon={Edit3} 
              title="Cập nhật tiến độ" 
              aria-label="Cập nhật ticket"
              onClick={() => handleEditClick(row)} 
            />
            <Button 
              size="sm" 
              variant="danger-ghost" 
              icon={Trash2} 
              title="Xóa phiếu" 
              aria-label="Xóa phiếu"
              onClick={() => handleDeleteClick(row.id)} 
            />
          </div>
        ) 
      }
    );
    return cols;
  }, [activeTab, selectedIds, filteredList]);

  const addModalFooter = modalStep === 1 ? (
    <>
      <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} style={{ width: '72px', height: '40px', padding: 0 }}>
        Hủy
      </Button>
      <Button type="button" variant="primary" disabled={!addForm.equipmentId} onClick={() => setModalStep(2)} style={{ width: '140px', height: '40px', padding: 0 }}>
        Tiếp tục →
      </Button>
    </>
  ) : (
    <>
      <Button type="button" variant="ghost" onClick={() => setModalStep(1)} style={{ width: '90px', height: '40px', padding: 0 }}>
        ← Quay lại
      </Button>
      <Button type="submit" form="add-ticket-form" variant="primary" disabled={!addForm.issueDescription.trim()} style={{ width: '140px', height: '40px', padding: 0 }}>
        Tạo Ticket
      </Button>
    </>
  );

  const editModalFooter = (
    <>
      <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Hủy</Button>
      <Button type="submit" form="edit-ticket-form" variant="primary">Lưu thay đổi</Button>
    </>
  );

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-header">
              <Wrench className="text-orange-500" size={20} />
              Bảo trì & Sửa chữa
            </h2>
            <p className="page-subtitle">Theo dõi tình trạng hỏng hóc, sửa chữa và bảo hành thiết bị</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
            {activeTab === 'active' ? (
              <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => { setEquipSearchTerm(''); setSelectedLocation('Tất cả vị trí'); setSelectedStatus('Tất cả trạng thái'); setModalStep(1); setPriority('Trung bình'); setAddForm({ equipmentId: '', issueDescription: '' }); setShowAddModal(true); }}>
                Báo hỏng / Bảo trì
              </Button>
            ) : (
              <Button
                variant="secondary"
                icon={Download}
                iconPosition="left"
                onClick={() => setShowExportModal(true)}
                disabled={selectedIds.length === 0}
              >
                Xuất báo cáo ({selectedIds.length})
              </Button>
            )}
          </div>
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
          <AlertTriangle size={20} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
        <button 
          type="button"
          onClick={() => { setActiveTab('active'); setSelectedIds([]); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'active' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'active' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Bảo trì & Sửa chữa ({activeCount})
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('resolved'); setSelectedIds([]); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'resolved' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'resolved' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Lịch sử sửa chữa ({resolvedCount})
        </button>
      </div>

      <Card
        title={`Danh sách phiếu bảo trì (${filteredList.length})`}
        icon={Wrench}
        style={{ color: 'var(--accent-amber)' }}
      >
        <DataTable
          data={filteredList}
          columns={maintenanceColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
        />
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '700', 
              lineHeight: '24px', 
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Wrench size={18} style={{ color: 'var(--accent-amber)' }} />
              {modalStep === 1 ? 'Báo hỏng thiết bị' : 'Chi tiết báo hỏng'}
            </h3>
            <span style={{ fontSize: '12px', lineHeight: '18px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
              {modalStep === 1 ? 'Bước 1/2: Chọn thiết bị gặp sự cố' : 'Bước 2/2: Nhập lý do và mô tả lỗi'}
            </span>
          </div>
        }
        size="lg"
        footer={addModalFooter}
      >
        <form id="add-ticket-form" onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* BƯỚC 1: CHỌN THIẾT BỊ */}
          {modalStep === 1 && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1,
              overflow: 'hidden',
              boxSizing: 'border-box',
              gap: '0.8rem'
            }}>
                    {/* Section Title: 20px, mb: 8px */}
                    <div style={{ height: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', lineHeight: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Chọn thiết bị
                      </label>
                    </div>
                    
                    {/* Search Input: 46px, mb: 10px */}
                    <div style={{ position: 'relative', height: '46px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Tìm theo tên, mã thiết bị hoặc serial..."
                        value={equipSearchTerm}
                        onChange={e => setEquipSearchTerm(e.target.value)}
                        style={{
                          paddingLeft: '40px',
                          paddingRight: '14px',
                          width: '100%',
                          height: '46px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Search 
                        size={18} 
                        style={{ 
                          position: 'absolute', 
                          left: '14px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--text-muted)' 
                        }} 
                      />
                    </div>

                    {/* Filter Bar: 32px, mb: 12px */}
                    <div style={{ 
                      height: '32px', 
                      marginBottom: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <select
                        value={selectedLocation}
                        onChange={e => setSelectedLocation(e.target.value)}
                        style={{
                          width: '140px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          padding: '0 8px',
                          cursor: 'pointer'
                        }}
                      >
                        {locations.map(loc => (
                          <option key={loc} value={loc} style={{ backgroundColor: 'var(--bg-card)' }}>{loc}</option>
                        ))}
                      </select>

                      <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        style={{
                          width: '165px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          padding: '0 8px',
                          cursor: 'pointer'
                        }}
                      >
                        {statuses.map(st => (
                          <option key={st} value={st} style={{ backgroundColor: 'var(--bg-card)' }}>{st}</option>
                        ))}
                      </select>

                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {filteredEquipment.length} thiết bị
                      </span>
                    </div>

                    {/* Device List: 292px, mb: 18px (vùng scroll duy nhất cao ~400px trong form do textarea ẩn) */}
                    <div style={{ 
                      height: '392px', 
                      minHeight: '392px',
                      maxHeight: '392px',
                      overflowY: 'auto', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '10px', 
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }} className="modal-device-list">
                      {filteredEquipment.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '13px' }}>
                          Không tìm thấy thiết bị nào phù hợp
                        </div>
                      ) : (
                        filteredEquipment.map(eq => {
                          const isSelected = addForm.equipmentId === eq.id;
                          return (
                            <div
                              key={eq.id}
                              onClick={() => setAddForm({ ...addForm, equipmentId: eq.id })}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '68px',
                                minHeight: '68px',
                                padding: isSelected ? '12px 14px 12px 11px' : '12px 14px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxSizing: 'border-box'
                              }}
                            >
                              {/* Radio: 20px */}
                              <div style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '50%', 
                                border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'}`, 
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: '10px',
                                boxSizing: 'border-box',
                                flexShrink: 0
                              }}>
                                {isSelected && (
                                  <div style={{ 
                                    width: '10px', 
                                    height: '10px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'var(--accent-blue)' 
                                  }}></div>
                                )}
                              </div>

                              {/* Content */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', overflow: 'hidden', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                  <span style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '12px', 
                                    fontWeight: '600', 
                                    lineHeight: '16px',
                                    color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    padding: '0px 4px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                  }}>
                                    {eq.code}
                                  </span>
                                  <span style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    lineHeight: '20px',
                                    color: 'var(--text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {eq.name}
                                  </span>
                                </div>
                                <div style={{ 
                                  fontSize: '11px', 
                                  lineHeight: '16px', 
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <span>📍 {eq.location || 'Kho Lab'}</span>
                                  <span>·</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ 
                                      width: '6px', 
                                      height: '6px', 
                                      borderRadius: '50%', 
                                      backgroundColor: eq.status === 'Sẵn sàng' ? 'var(--accent-green)' : 'var(--accent-amber)',
                                      display: 'inline-block'
                                    }}></span>
                                    {eq.status || 'Đang hoạt động'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
            </div>
          )}

          {/* BƯỚC 2: NHẬP LÝ DO & GHI CHÚ */}
          {modalStep === 2 && (
            <div style={{ 
              padding: '10px 0',
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1,
              boxSizing: 'border-box',
              gap: '0.8rem'
            }}>
                    {/* Thẻ hiển thị thiết bị đã chọn */}
                    {(() => {
                      const selectedEq = equipmentList.find(e => e.id === addForm.equipmentId);
                      if (!selectedEq) return null;
                      const depreciation = selectedEq.lifespanHours ? Math.min(100, Math.round((selectedEq.usedHours / selectedEq.lifespanHours) * 100)) : 0;
                      return (
                        <div style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1px dashed var(--accent-blue)',
                          backgroundColor: 'rgba(59, 130, 246, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginBottom: '20px',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '11px', 
                              fontWeight: 'bold', 
                              backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                              color: 'var(--accent-blue)',
                              padding: '2px 6px', 
                              borderRadius: '4px'
                            }}>
                              {selectedEq.code}
                            </span>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedEq.name}</strong>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span>📍 Vị trí: <strong>{selectedEq.location || 'Kho Lab'}</strong></span>
                            <span>Trạng thái máy: <strong>{selectedEq.status}</strong></span>
                          </div>

                          {/* Khấu hao thiết bị */}
                          {selectedEq.lifespanHours > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                <span>Khấu hao thiết bị:</span>
                                <strong style={{ color: depreciation > 80 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{depreciation}% ({selectedEq.usedHours}h / {selectedEq.lifespanHours}h)</strong>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${depreciation}%`, height: '100%', background: depreciation > 80 ? 'var(--accent-red)' : 'var(--accent-blue)', borderRadius: '2px' }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Mức độ khẩn cấp */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Mức độ khẩn cấp
                      </label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        style={{
                          width: '100%',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          padding: '0 12px',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Thấp" style={{ backgroundColor: 'var(--bg-card)' }}>🟢 Thấp (Sự cố nhỏ, vẫn dùng được tạm thời)</option>
                        <option value="Trung bình" style={{ backgroundColor: 'var(--bg-card)' }}>🟡 Trung bình (Không dùng được, cần sửa sớm)</option>
                        <option value="Khẩn cấp" style={{ backgroundColor: 'var(--bg-card)' }}>🔴 Khẩn cấp (Lỗi nghiêm trọng, hỏng hoàn toàn / nguy hiểm)</option>
                      </select>
                    </div>

                    {/* Nhãn nhập lý do */}
                    <div style={{ height: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', lineHeight: '20px', color: 'var(--text-secondary)' }}>
                        Mô tả tình trạng lỗi *
                      </label>
                    </div>

                    {/* Textarea nhập lý do lỗi lớn hơn */}
                    <textarea 
                      required 
                      value={addForm.issueDescription}
                      onChange={e => setAddForm({...addForm, issueDescription: e.target.value})}
                      placeholder="Nhập chi tiết triệu chứng hỏng hóc, sự cố linh kiện để kỹ thuật viên nắm rõ..."
                      style={{
                        width: '100%',
                        height: '210px',
                        minHeight: '180px',
                        maxHeight: '230px',
                        padding: '12px 14px',
                        fontSize: '14px',
                        lineHeight: '20px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    ></textarea>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Cập nhật Ticket Sửa chữa"
        size="md"
        footer={editModalFooter}
      >
        <form id="edit-ticket-form" onSubmit={handleEditSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Thiết bị:</strong> {selectedTicket?.equipmentName}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Lỗi báo cáo:</strong> {selectedTicket?.issueDescription}</div>
            </div>

            {selectedTicket?.notes && selectedTicket.notes.length > 0 && (
              <div className="form-group">
                <label>Lịch sử ghi chú</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedTicket.notes.map((note) => (
                    <div key={note.id} style={{ fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                        {new Date(note.date).toLocaleString('vi-VN')}
                      </div>
                      <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Trạng thái sửa chữa</label>
              <Select 
                value={editForm.status} 
                onChange={val => setEditForm({...editForm, status: val})}
                options={[
                  { value: "Đang sửa", label: "Đang sửa nội bộ" },
                  { value: "Bảo hành hãng", label: "Gửi hãng bảo hành" },
                  { value: "Đã sửa", label: "Đã sửa xong (Sẵn sàng)" }
                ]}
              />
            </div>
            <div className="form-group">
              <label>Chi phí sửa chữa (VNĐ)</label>
              <input 
                type="number" 
                min="0"
                value={editForm.cost} 
                onChange={e => setEditForm({...editForm, cost: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Thêm ghi chú mới</label>
              <textarea 
                rows="2"
                value={editForm.newNote}
                onChange={e => setEditForm({...editForm, newNote: e.target.value})}
                placeholder="Nhập tiến độ sửa chữa, cập nhật linh kiện..."
              ></textarea>
            </div>
          </div>
        </form>
      </Modal>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        type="maintenance"
        counts={{
          all: 0,
          filtered: 0,
          selected: selectedIds.length
        }}
        onExport={handleExportAction}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} style={{ color: 'var(--accent-blue)' }} />
              Chi tiết phiếu bảo trì
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Mã Ticket: #{selectedDetailTicket?.id.slice(0, 8)}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setShowDetailModal(false)} style={{ width: '80px', height: '40px', padding: 0 }}>Đóng</Button>
            <Button 
              type="button" 
              variant="primary" 
              onClick={() => {
                setShowDetailModal(false);
                handleEditClick(selectedDetailTicket);
              }}
              style={{ width: '120px', height: '40px', padding: 0 }}
            >
              Chỉnh sửa
            </Button>
          </>
        }
      >
        {selectedDetailTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            {/* Box info thiết bị */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '14px 16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Thiết bị báo hỏng</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>{selectedDetailTicket.equipmentName}</div>
            </div>

            {/* Grid 2 cột */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Ngày báo hỏng</span>
                <strong style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>{new Date(selectedDetailTicket.reportedDate).toLocaleString('vi-VN')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Trạng thái hiện tại</span>
                <span className={`badge ${selectedDetailTicket.status === 'Đã sửa' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                  {selectedDetailTicket.status}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Chi phí sửa chữa</span>
                <strong style={{ fontSize: '13.5px', color: selectedDetailTicket.cost ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                  {selectedDetailTicket.cost ? `${selectedDetailTicket.cost.toLocaleString('vi-VN')} đ` : 'Chưa cập nhật chi phí'}
                </strong>
              </div>
              {selectedDetailTicket.resolvedDate && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Ngày hoàn tất sửa</span>
                  <strong style={{ fontSize: '13.5px', color: 'var(--accent-green)' }}>{new Date(selectedDetailTicket.resolvedDate).toLocaleString('vi-VN')}</strong>
                </div>
              )}
            </div>

            {/* Chi tiết lỗi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mô tả chi tiết sự cố</span>
              <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '20px' }}>
                {selectedDetailTicket.issueDescription}
              </div>
            </div>

            {/* Ghi chú tiến trình */}
            {selectedDetailTicket.notes && selectedDetailTicket.notes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nhật ký sửa chữa & Cập nhật tiến độ</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid var(--border-color)', paddingLeft: '14px', marginLeft: '6px' }}>
                  {selectedDetailTicket.notes.map((note) => (
                    <div key={note.id} style={{ position: 'relative', fontSize: '13px' }}>
                      {/* Dấu chấm mốc tiến trình */}
                      <div style={{ position: 'absolute', left: '-20px', top: '5px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>
                        {new Date(note.date).toLocaleString('vi-VN')}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
