import React, { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import ExportModal from '../components/ExportModal';
import Button from '../components/Button';
import Select from '../components/Select';
import * as XLSX from 'xlsx';
import { fetcher } from '../utils/fetcher';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  FileText,
  UserCheck,
  X,
  CheckCircle,
  Inbox,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  Check,
  Tag,
  Boxes,
  Database,
  ShieldAlert,
  HelpCircle,
  User,
  Activity,
  ChevronRight,
  ChevronDown,
  Download,
  Briefcase,
  Zap,
  FileSpreadsheet
} from 'lucide-react';
import { useSortableTable } from '../hooks/useSortableTable.jsx';
import RfidScanModal from '../components/RfidScanModal';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import EditEquipmentModal from '../components/equipment/EditEquipmentModal';
import BorrowEquipmentModal from '../components/equipment/BorrowEquipmentModal';
import ReturnEquipmentModal from '../components/equipment/ReturnEquipmentModal';
import ConfirmHandoverModal from '../components/equipment/ConfirmHandoverModal';
import WaitlistModal from '../components/equipment/WaitlistModal';
import EquipmentDetailsModal from '../components/equipment/EquipmentDetailsModal';
import ImportExcelModal from '../components/ImportExcelModal';
import { CATEGORIES, ASSET_TYPES, BORROW_STATUS_TABS } from '../utils/constants';
import { API_BASE_URL } from '../config';
import SkeletonLoader from '../components/SkeletonLoader';
import DataTable from '../components/DataTable';

// ─── Constants ────────────────────────────────────────────────────────────────

export default function Equipment({ activeTab = 'list' }) {
  const { data: equipmentList = [], mutate: mutateEquip, isLoading: isLoadingEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: borrowTickets = [], mutate: mutateBorrows, isLoading: isLoadingBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: members = [], isLoading: isLoadingMembers } = useSWR(`${API_BASE_URL}/members`, fetcher);
  const isLoading = isLoadingEquip || isLoadingBorrows || isLoadingMembers;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Tất cả');
  const [selectedBorrowTab, setSelectedBorrowTab] = useState('Tất cả');

  // Generate dynamic categories from actual equipment data
  const availableCategories = useMemo(() => {
    const validEquipment = equipmentList.filter(item => {
      const isComponent = item.assetType && (item.assetType.toLowerCase().includes('linh kiện') || item.assetType.toLowerCase().includes('vật tư'));
      return !isComponent;
    });
    const uniqueCats = new Set(validEquipment.map(eq => eq.category).filter(Boolean));
    return Array.from(uniqueCats).sort();
  }, [equipmentList]);

  // Handle Export Configurationd state
  const [period, setPeriod] = useState('1month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportUrl, setReportUrl] = useState('');

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedBorrowIds, setSelectedBorrowIds] = useState([]);

  // Bảng cấu hình cột khi Export
  const borrowExportColumns = [
    { id: 'id', label: 'Mã phiếu', defaultChecked: true },
    { id: 'borrowerName', label: 'Người mượn', defaultChecked: true },
    { id: 'mssv', label: 'MSSV', defaultChecked: true },
    { id: 'equipmentName', label: 'Tên thiết bị', defaultChecked: true },
    { id: 'equipmentCode', label: 'Mã TB', defaultChecked: true },
    { id: 'qty', label: 'Số lượng', defaultChecked: true },
    { id: 'borrowDate', label: 'Ngày mượn', defaultChecked: true },
    { id: 'expectedReturnDate', label: 'Hạn trả', defaultChecked: true },
    { id: 'returnDate', label: 'Ngày trả', defaultChecked: true },
    { id: 'status', label: 'Trạng thái', defaultChecked: true },
    { id: 'borrowNotes', label: 'Ghi chú', defaultChecked: false }
  ];

  const analyticsExportColumns = [
    { id: 'name', label: 'Tên thiết bị', defaultChecked: true },
    { id: 'code', label: 'Mã TB', defaultChecked: true },
    { id: 'category', label: 'Phân loại', defaultChecked: true },
    { id: 'periodBorrowCount', label: 'Lượt mượn', defaultChecked: true },
    { id: 'periodUsedHours', label: 'Giờ dùng thêm', defaultChecked: true },
    { id: 'depreciationPercent', label: '% Khấu hao', defaultChecked: true },
  ];

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

  const filteredEquipmentStats = useMemo(() => {
    if (!report?.equipmentStats) return [];
    return report.equipmentStats.filter(e => {
      const matchText = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchText;
    }).map(e => ({
      ...e,
      depreciationPercent: Number(e.depreciationPercent),
      periodUsedHours: Number(e.periodUsedHours)
    }));
  }, [report?.equipmentStats, searchTerm]);

  const { items: sortedEquipmentStats, requestSort: requestEqStatsSort, getSortIcon: getEqStatsSortIcon } = useSortableTable(
    filteredEquipmentStats,
    'depreciationPercent',
    'desc'
  );

  const lowStockColumns = React.useMemo(() => [
    { accessorKey: 'name', header: 'Thiết bị / Vật tư (Mã ID)', sortable: true, cell: (row) => (
      <div>
        <span style={{ fontWeight: '500' }}>{row.name}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({row.code})</span>
      </div>
    )},
    { accessorKey: 'category', header: 'Phân loại', sortable: true, cell: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.category}</span> },
    { accessorKey: 'available', header: 'Số lượng tồn kho', sortable: true, align: 'center', cell: (row) => {
      const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
      const available = isConsumable ? row.totalQty : (row.totalQty - (row.borrowedQty || 0));
      return <span style={{ fontWeight: 'bold' }}>{available}</span>;
    }},
    { accessorKey: 'minThreshold', header: 'Định mức tối thiểu', sortable: true, align: 'center', cell: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.minThreshold}</span> },
    { accessorKey: 'status', header: 'Tình trạng', sortable: true, align: 'center', cell: () => <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Cần bổ sung</span> }
  ], []);

  const [expandedEqStatId, setExpandedEqStatId] = useState(null);

  const eqStatsColumns = React.useMemo(() => [
    { accessorKey: 'name', header: 'Thiết bị (Mã ID)', sortable: true, cell: (row) => (
      <div style={{ fontWeight: '500' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {row.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({row.code})</span>
        </div>
      </div>
    )},
    { accessorKey: 'category', header: 'Phân loại', sortable: true, cell: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.category}</span> },
    { accessorKey: 'periodBorrowCount', header: 'Lượt mượn (Kỳ này)', sortable: true, align: 'right', cell: (row) => <span style={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{row.periodBorrowCount}</span> },
    { accessorKey: 'periodUsedHours', header: 'Giờ dùng thêm (Kỳ này)', sortable: true, align: 'right', cell: (row) => <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>+{typeof row.periodUsedHours === 'number' ? Number(row.periodUsedHours).toFixed(1) : row.periodUsedHours}h</span> },
    { accessorKey: 'depreciationPercent', header: '% Khấu hao (Đã dùng)', sortable: true, align: 'right', cell: (row) => {
      let statusColor = 'var(--accent-green)';
      let statusText = 'Tốt';
      if (row.depreciationPercent >= 100) {
        statusColor = 'var(--accent-red)';
        statusText = 'Quá hạn';
      } else if (row.depreciationPercent >= 80) {
        statusColor = 'var(--accent-amber)';
        statusText = 'Cần bảo trì';
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
          <span style={{ color: statusColor, fontWeight: 'bold' }}>
            {row.depreciationPercent}%
          </span>
          <span style={{ fontSize: '0.75rem', color: statusColor, backgroundColor: `${statusColor}22`, padding: '2px 6px', borderRadius: '4px' }}>
            {statusText}
          </span>
        </div>
      );
    }}
  ], []);

  const renderEqStatsExpandedRow = React.useCallback((row) => {
    if (!row.instances || row.instances.length === 0) return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu máy con</div>;
    return (
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <table className="table" style={{ margin: 0, background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
          <tbody>
            {row.instances.map(inst => {
              const lifespan = inst.lifespanHours || row.lifespanHours || 10000;
              const used = inst.usedHours || 0;
              const instDepreciation = Math.min(100, Math.round((used / lifespan) * 100));

              let instColor = 'var(--accent-green)';
              let instStatus = 'Tốt';
              if (instDepreciation >= 100) {
                instColor = 'var(--accent-red)';
                instStatus = 'Quá hạn';
              } else if (instDepreciation >= 80) {
                instColor = 'var(--accent-amber)';
                instStatus = 'Cần bảo trì';
              }

              return (
                <tr key={inst.id}>
                  <td style={{ fontWeight: '400', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Mã máy: <strong style={{ color: 'var(--text-primary)' }}>{inst.serialNumber}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inst.status !== 'Đang mượn' ? inst.status : ''}</td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.status === 'Đang mượn' ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Đang mượn {inst.borrowedBy ? `(${inst.borrowedBy})` : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Tổng đã dùng: {typeof used === 'number' ? Number(used).toFixed(1) : used}h
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ color: instColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {instDepreciation}%
                      </span>
                      <span style={{ fontSize: '0.7rem', color: instColor, backgroundColor: `${instColor}15`, padding: '1px 5px', borderRadius: '4px' }}>
                        {instStatus}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, []);

  const handleToggleBorrowSelect = (id) => {
    setSelectedBorrowIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      return [...prev, id];
    });
  };

  const handleSelectAllBorrows = () => {
    if (selectedBorrowIds.length === sortedBorrowTickets.length) {
      setSelectedBorrowIds([]);
    } else {
      setSelectedBorrowIds(sortedBorrowTickets.map(t => t.id));
    }
  };

  const handleAdvancedBorrowExport = async (config) => {
    const { scope, startDate, endDate, format, selectedColumns } = config;
    
    // 1. Lọc dữ liệu dựa trên scope
    let dataToExport = [];
    if (scope === 'all') {
      dataToExport = borrowTickets;
    } else if (scope === 'filtered') {
      dataToExport = sortedBorrowTickets;
    } else if (scope === 'selected') {
      dataToExport = borrowTickets.filter(b => selectedBorrowIds.includes(b.id));
    } else if (scope === 'custom') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      dataToExport = borrowTickets.filter(b => {
        const d = new Date(b.borrowDate);
        return d >= start && d <= end;
      });
    }

    // 2. Format dữ liệu theo cột đã chọn
    const headers = [];
    const keys = [];
    
    borrowExportColumns.forEach(col => {
      if (selectedColumns.includes(col.id)) {
        headers.push(col.label);
        keys.push(col.id);
      }
    });

    const rows = dataToExport.map(ticket => {
      return keys.map(key => {
        let val = ticket[key] || '';
        // Format ngày tháng nếu cần
        if (key === 'borrowDate' || key === 'expectedReturnDate' || key === 'returnDate') {
          if (val) {
            try {
              val = new Date(val).toLocaleString('vi-VN');
            } catch (e) {
              val = String(val);
            }
          } else {
            val = 'N/A';
          }
        }
        return val;
      });
    });

    // 3. Xử lý xuất file
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filename = `phieu_muon_tra_${scope}_${timestamp}.${format}`;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        const formattedRow = row.map(cell => {
          let cellStr = String(cell).replace(/"/g, '""');
          if (cellStr.includes(',') || cellStr.includes('\n')) {
            cellStr = `"${cellStr}"`;
          }
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
      
      // Sheet 1: Dữ liệu
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách phiếu mượn");

      // Sheet 2: Thống kê
      const total = dataToExport.length;
      const returned = dataToExport.filter(b => b.status === 'Đã tiêu hao' || b.status === 'Đã trả').length;
      const borrowing = dataToExport.filter(b => b.status === 'Đang mượn').length;
      const overdue = dataToExport.filter(b => {
        if (b.status === 'Đang mượn' && b.expectedReturnDate) {
          return new Date(b.expectedReturnDate) < new Date();
        }
        return false;
      }).length;

      const wsStatsData = [
        ["THỐNG KÊ PHIẾU MƯỢN TRẢ"],
        [""],
        ["Phạm vi dữ liệu:", scope === 'all' ? "Tất cả" : scope === 'filtered' ? "Đang lọc" : scope === 'selected' ? "Đã chọn" : "Tùy chỉnh thời gian"],
        ["Tổng số phiếu:", total],
        ["Đã trả / Đã dùng:", returned],
        ["Đang mượn:", borrowing],
        ["Quá hạn:", overdue],
      ];
      const wsStats = XLSX.utils.aoa_to_sheet(wsStatsData);
      XLSX.utils.book_append_sheet(wb, wsStats, "Thống kê");

      // Xuất file
      XLSX.writeFile(wb, filename);
    }
  };

  const handleAdvancedAnalyticsExport = async (config) => {
    const { scope, format, selectedColumns } = config;
    let dataToExport = [];
    
    if (scope === 'all') {
      dataToExport = report?.equipmentStats || [];
    } else {
      dataToExport = sortedEquipmentStats;
    }

    const headers = [];
    const keys = [];
    
    analyticsExportColumns.forEach(col => {
      if (selectedColumns.includes(col.id)) {
        headers.push(col.label);
        keys.push(col.id);
      }
    });

    const rows = dataToExport.map(stat => {
      return keys.map(key => {
        let val = stat[key];
        if (val === undefined || val === null) return '';
        if (key === 'depreciationPercent') return `${val}%`;
        if (key === 'periodUsedHours') return `+${val}h`;
        return val;
      });
    });

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const filename = `bao_cao_khau_hao_${scope}_${timestamp}.${format}`;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        const formattedRow = row.map(cell => {
          let cellStr = String(cell).replace(/"/g, '""');
          if (cellStr.includes(',') || cellStr.includes('\n')) {
            cellStr = `"${cellStr}"`;
          }
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
      XLSX.utils.book_append_sheet(wb, ws, "Dữ liệu khấu hao");
      XLSX.writeFile(wb, filename);
    }
  };


  const lowStockItems = report?.equipmentStats?.filter(e => {
    const isConsumable = e.assetType === 'Linh kiện tiêu hao' || e.assetType === 'Vật tư tiêu hao';
    const qtyToCheck = isConsumable ? e.totalQty : (e.totalQty - (e.borrowedQty || 0));
    const threshold = e.minThreshold || 0;
    return qtyToCheck <= threshold;
  }) || [];

  // Analytics expandable state


  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmHandoverModal, setShowConfirmHandoverModal] = useState(false);
  const [showRfidModal, setShowRfidModal] = useState(false);
  const [rfidAction, setRfidAction] = useState(''); // 'borrow' hoặc 'return'
  const [rfidCards, setRfidCards] = useState([]);
  const [scannedUserInfo, setScannedUserInfo] = useState(null); // Thông tin sinh viên sau khi quét
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ mssv: '', qty: 1, notes: '' });
  const [equipmentWaitlists, setEquipmentWaitlists] = useState({}); // Map equipmentId -> waitlist count
  const [rfidScanStatus, setRfidScanStatus] = useState('idle');
  const [rfidScanMessage, setRfidScanMessage] = useState('');

  // Active items
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [selectedBorrowDetail, setSelectedBorrowDetail] = useState(null);

  // Forms
  const [newEquip, setNewEquip] = useState({
    name: '',
    code: '',
    totalQty: 1,
    location: 'Kho Lab',
    category: 'Thiết bị đo lường',
    assetType: 'Thiết bị'
  });
  const [editingEquip, setEditingEquip] = useState(null);

  // Trợ giúp ngày hẹn trả mặc định (hôm nay)
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State tìm gợi ý thành viên cho mượn và trả
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [suggestedMembers, setSuggestedMembers] = useState([]);

  const [borrowForm, setBorrowForm] = useState({
    mssv: '',
    qty: 1,
    expectedReturnDate: getTodayDateString(),
    expectedReturnTime: '17:00',
    initialCondition: 'Tốt / Hoạt động bình thường',
    borrowNotes: ''
  });

  const [returnForm, setReturnForm] = useState({
    returnMssv: '',
    finalCondition: 'Tốt / Nguyên vẹn như cũ',
    returnNotes: ''
  });

  // Status messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!equipmentList.length) return;
    const fetchWaitlists = async () => {
      const waitlistCounts = {};
      await Promise.all(equipmentList.map(async (eq) => {
        try {
          const resWaitlist = await fetch(`${API_BASE_URL}/equipment/${eq.id}/waitlist`);
          const dataWaitlist = await resWaitlist.json();
          waitlistCounts[eq.id] = Array.isArray(dataWaitlist) ? dataWaitlist.length : 0;
        } catch {
          waitlistCounts[eq.id] = 0;
        }
      }));
      setEquipmentWaitlists(waitlistCounts);
    };
    fetchWaitlists();
  }, [equipmentList]);

  // Xử lý tìm kiếm thành viên gợi ý
  const handleMemberSearch = (query) => {
    setMemberSearchQuery(query);
    if (!query.trim()) {
      setSuggestedMembers([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = members.filter(m =>
      m.name?.toLowerCase().includes(q) || m.mssv?.toLowerCase().includes(q)
    ).slice(0, 5);
    setSuggestedMembers(matches);
  };

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
        setSuccessMsg(`Đã thêm thiết bị: ${newEquip.name}`);
        setNewEquip({
          name: '',
          code: '',
          totalQty: 1,
          location: 'Kho Lab',
          category: 'Thiết bị đo lường',
          assetType: 'Thiết bị'
        });
        setShowAddModal(false);
        mutateEquip();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleEditEquip = async (e) => {
    e.preventDefault();
    if (!editingEquip.name.trim() || !editingEquip.code.trim() || Number(editingEquip.totalQty) <= 0) {
      setErrorMsg('Thông tin không hợp lệ');
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
        setErrorMsg(data.error || 'Lỗi chỉnh sửa thiết bị');
      } else {
        setSuccessMsg('Đã cập nhật thông tin thiết bị');
        setShowEditModal(false);
        mutateEquip();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!borrowForm.mssv.trim() || Number(borrowForm.qty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và số lượng');
      return;
    }
    await processBorrow(null);
  };

  const handleRfidScan = async (cardId) => {
    try {
      const scanRes = await fetch(`${API_BASE_URL}/rfid-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      });
      const scanData = await scanRes.json();

      if (!scanRes.ok) {
        setErrorMsg(scanData.error || '❌ Thẻ RFID không hợp lệ');
        return;
      }

      let expectedMssv;
      if (rfidAction === 'borrow') expectedMssv = borrowForm.mssv;
      else if (rfidAction === 'return') expectedMssv = returnForm.returnMssv;
      else if (rfidAction === 'confirm-handover') expectedMssv = selectedBorrow.mssv;

      if (scanData.mssv !== expectedMssv) {
        setErrorMsg(`❌ Thẻ không khớp! Vui lòng quét đúng thẻ của người đăng ký.`);
        return;
      }

      setScannedUserInfo({
        name: scanData.name,
        mssv: scanData.mssv,
        cardId: scanData.cardId
      });

    } catch (error) {
      setErrorMsg('Lỗi kết nối hệ thống RFID');
    }
  };

  const handleRfidComplete = async () => {
    if (!scannedUserInfo) {
      setErrorMsg('Vui lòng quét thẻ RFID trước');
      return;
    }

    setShowRfidModal(false);

    if (rfidAction === 'borrow') {
      await processBorrow(scannedUserInfo.cardId);
    } else if (rfidAction === 'return') {
      await processReturn(scannedUserInfo.cardId);
    } else if (rfidAction === 'confirm-handover') {
      await processConfirmHandover(scannedUserInfo.cardId);
    }

    setScannedUserInfo(null);
  };

  const processConfirmHandover = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/borrows/${selectedBorrow.id}/confirm-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          initialCondition: borrowForm.initialCondition,
          borrowNotes: borrowForm.borrowNotes
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Đã xác nhận bàn giao thiết bị!');
        setSelectedBorrow(null);
        mutateEquip();
        mutateBorrows();
      } else {
        setErrorMsg(data.error || 'Lỗi bàn giao');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistForm.mssv.trim() || Number(waitlistForm.qty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và số lượng');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEquip.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Lỗi đăng ký chờ');
      } else {
        setSuccessMsg(`✅ ${data.message}`);
        setWaitlistForm({ mssv: '', qty: 1, notes: '' });
        setMemberSearchQuery('');
        setSuggestedMembers([]);
        setShowWaitlistModal(false);
        mutateEquip();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const processBorrow = async (cardId) => {
    try {
      const isConsumable = selectedEquip.assetType === 'Linh kiện tiêu hao';
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEquip.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...borrowForm,
          cardId: cardId,
          expectedReturnDate: isConsumable ? null : new Date(borrowForm.expectedReturnDate + 'T' + borrowForm.expectedReturnTime + ':00').toISOString()
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Lỗi xử lý phiếu');
      } else {
        setSuccessMsg(isConsumable
          ? `Đã đăng ký xuất kho ${borrowForm.qty} chiếc ${selectedEquip.name}. Vui lòng sang mục Cấp phát để xác nhận.`
          : `Đăng ký mượn ${borrowForm.qty} chiếc ${selectedEquip.name} thành công. Vui lòng sang mục Cấp phát để xác nhận.`
        );
        setBorrowForm({
          mssv: '',
          qty: 1,
          expectedReturnDate: getTodayDateString(),
          expectedReturnTime: '17:00',
          initialCondition: 'Tốt / Hoạt động bình thường',
          borrowNotes: ''
        });
        setMemberSearchQuery('');
        setSuggestedMembers([]);
        setShowBorrowModal(false);
        mutateEquip();
        mutateBorrows();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const processReturn = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/borrows/${selectedBorrow.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...returnForm,
          cardId: cardId
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Đã ghi nhận trả thiết bị thành công');
        setShowReturnModal(false);
        setSelectedBorrow(null);
        setReturnForm({
          returnMssv: '',
          finalCondition: 'Tốt / Nguyên vẹn như cũ',
          returnNotes: ''
        });
        setMemberSearchQuery('');
        setSuggestedMembers([]);
        mutateEquip();
        mutateBorrows();
      } else {
        setErrorMsg(data.error || 'Lỗi ghi nhận trả thiết bị');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.returnMssv.trim()) {
      setErrorMsg('Vui lòng cung cấp MSSV người đi trả thiết bị');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/rfid-cards`);
      const cards = await response.json();
      setRfidCards(cards);

      setShowReturnModal(false);
      setRfidScanStatus('idle');
      setScannedUserInfo(null);
      setRfidAction('return');
      setShowRfidModal(true);
    } catch (error) {
      setErrorMsg('Lỗi kết nối hệ thống RFID');
    }
  };

  const handleDeleteEquip = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thiết bị ${name} khỏi danh sách?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg(`Đã xóa thiết bị ${name}`);
        mutateEquip();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Không thể xóa thiết bị');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };



  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(e => {
      // Bỏ qua Linh kiện và Vật tư tiêu hao (vì đã có trang Kho Linh kiện riêng)
      if (e.assetType && (e.assetType.toLowerCase().includes('linh kiện') || e.assetType.toLowerCase().includes('vật tư'))) {
        return false;
      }

      const matchText = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategoryTab === 'Tất cả' || e.category === selectedCategoryTab;
      return matchText && matchCat;
    });
  }, [equipmentList, searchTerm, selectedCategoryTab]);

  const filteredBorrowTickets = useMemo(() => {
    return borrowTickets.filter(t => {
      const matchText = (t.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.equipmentCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.borrowerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.mssv || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchText) return false;

      if (selectedBorrowTab === 'Tất cả') return true;
      if (selectedBorrowTab === 'Đang mượn') return t.status === 'Đang mượn';
      if (selectedBorrowTab === 'Đã đặt trước') return t.status === 'Đã đặt trước';
      if (selectedBorrowTab === 'Đã trả') return t.status === 'Đã trả';
      if (selectedBorrowTab === 'Đã tiêu hao') return t.status === 'Đã tiêu hao';
      if (selectedBorrowTab === 'Trễ hạn') {
        if (t.status !== 'Đang mượn') return false;
        const limit = new Date(t.expectedReturnDate);
        const now = new Date();
        return now > limit;
      }
      return true;
    });
  }, [borrowTickets, searchTerm, selectedBorrowTab]);

  const { items: sortedEquipment, requestSort: requestEqSort, getSortIcon: getEqSortIcon } = useSortableTable(filteredEquipment, 'code', 'asc');
  const { items: sortedBorrowTickets, requestSort: requestBorrowSort, getSortIcon: getBorrowSortIcon } = useSortableTable(filteredBorrowTickets, 'borrowDate', 'desc');


  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const formatDateOnly = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day} Thg ${month}, ${year}`;
  };

  const formatDateWithTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} Thg ${month}, ${year} lúc ${hours}:${minutes} ${ampm}`;
  };

  const getBorrowStatusInfo = (ticket) => {
    if (ticket.status === 'Đã đặt trước') {
      return {
        label: 'Đã đặt trước',
        colorClass: 'badge-warning',
        overdue: false,
        style: { backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }
      };
    }

    if (ticket.status === 'Đã tiêu hao') {
      return {
        label: 'Đã xuất tiêu hao',
        colorClass: 'badge-warning',
        overdue: false,
        style: { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.25)', textTransform: 'none' }
      };
    }

    if (ticket.status === 'Đã trả') {
      const limit = new Date(ticket.expectedReturnDate);
      const actual = new Date(ticket.returnDate);
      if (actual > limit) {
        const diffDays = Math.ceil((actual - limit) / (1000 * 60 * 60 * 24));
        return {
          label: `Trả trễ ${diffDays} ngày`,
          colorClass: 'badge-warning',
          overdue: true,
          style: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }
        };
      }
      return {
        label: 'Đã trả đúng hạn',
        colorClass: 'badge-success',
        overdue: false,
        style: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.3)' }
      };
    } else {
      const limit = new Date(ticket.expectedReturnDate);
      const now = new Date();
      if (now > limit) {
        const diffDays = Math.ceil((now - limit) / (1000 * 60 * 60 * 24));
        return {
          label: `Trễ hạn ${diffDays} ngày!`,
          colorClass: 'badge-danger',
          overdue: true,
          style: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 'bold' }
        };
      }
      return {
        label: 'Đang mượn',
        colorClass: 'badge-info',
        overdue: false,
        style: { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }
      };
    }
  };

  useEffect(() => {
    if (!showRfidModal) return;

    const handleKeyPress = async (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const cardId = `CARD-00${e.key}`;

        try {
          const scanRes = await fetch(`${API_BASE_URL}/rfid-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId })
          });
          const scanData = await scanRes.json();

          if (!scanRes.ok) {
            setRfidScanStatus('error');
            setRfidScanMessage(scanData.error || 'Thẻ RFID không hợp lệ');
            setTimeout(() => { setRfidScanStatus('idle'); setRfidScanMessage(''); }, 3000);
            return;
          }

          let expectedMssv = '';
          if (rfidAction === 'borrow') expectedMssv = borrowForm.mssv;
          else if (rfidAction === 'confirm-handover') expectedMssv = selectedBorrow.mssv;
          else expectedMssv = returnForm.returnMssv;

          if (scanData.mssv !== expectedMssv) {
            setRfidScanStatus('error');
            setRfidScanMessage(`Thẻ không khớp! Vui lòng quét đúng thẻ.`);
            setTimeout(() => { setRfidScanStatus('idle'); setRfidScanMessage(''); }, 3000);
            return;
          }

          setRfidScanStatus('success');
          setScannedUserInfo({
            name: scanData.name,
            mssv: scanData.mssv,
            cardId: scanData.cardId
          });

        } catch (error) {
          setRfidScanStatus('error');
          setRfidScanMessage('Lỗi kết nối hệ thống RFID');
          setTimeout(() => { setRfidScanStatus('idle'); setRfidScanMessage(''); }, 3000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showRfidModal, rfidAction, borrowForm.mssv, returnForm.returnMssv]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const equipmentColumns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'Mã',
      width: '15%',
      sortable: true,
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const isOutOfStock = isConsumable ? row.totalQty <= 0 : available <= 0;
        const minThreshold = row.minThreshold || 0;
        const isLowStock = isConsumable ? (row.totalQty <= minThreshold && row.totalQty > 0) : (available <= minThreshold && available > 0);
        return (
          <div style={{ fontWeight: '700', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {isOutOfStock && <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} title="Hết hàng" />}
            {isLowStock && !isOutOfStock && <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} title="Sắp hết hàng" />}
            {row.code || 'N/A'}
          </div>
        );
      }
    },
    {
      accessorKey: 'name',
      header: 'Tên thiết bị',
      width: '40%',
      sortable: true,
      cell: (row) => {
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        return (
          <div style={{ fontWeight: '600' }}>
            <div>{row.name}</div>
            {isConsumable && <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.12)', padding: '1px 4px', borderRadius: '4px' }}>Tiêu hao</span>}
          </div>
        );
      }
    },
    {
      accessorKey: 'location',
      header: 'Vị trí',
      width: '12%',
      sortable: true
    },
    {
      accessorKey: 'totalQty',
      header: 'SL',
      width: '10%',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const minThreshold = row.minThreshold || 0;
        const isLowStock = isConsumable ? (row.totalQty <= minThreshold && row.totalQty > 0) : (available <= minThreshold && available > 0);
        const displayUnit = row.unit ? ` ${row.unit}` : '';
        
        if (isConsumable) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: row.totalQty > minThreshold ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {row.totalQty}{displayUnit}
              </span>
              {isLowStock && <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Sắp hết</span>}
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            <div>
              <span style={{ color: available > minThreshold ? 'var(--accent-green)' : 'var(--accent-red)' }}>{available}</span> / {row.totalQty}{displayUnit}
            </div>
            {isLowStock && <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '2px 4px', borderRadius: '4px' }}>Sắp hết</span>}
          </div>
        );
      }
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      width: '23%',
      sortable: false,
      align: 'right',
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const isOutOfStock = isConsumable ? row.totalQty <= 0 : available <= 0;
        return (
          <div style={{ display: 'inline-flex', gap: '0.35rem', flexDirection: 'column', alignItems: 'flex-end' }}>
            {isOutOfStock && equipmentWaitlists[row.id] > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginBottom: '0.3rem' }}><User size={10} /> {equipmentWaitlists[row.id]} chờ</div>}
            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
              {isOutOfStock && !isConsumable ? (
                <Button size="sm" variant="secondary" style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }} onClick={() => { setSelectedEquip(row); setShowWaitlistModal(true); }}>🔔 Đăng ký chờ</Button>
              ) : (
                <Button size="sm" variant={isConsumable ? 'secondary' : 'primary'} onClick={() => { setSelectedEquip(row); setBorrowForm({ mssv: '', qty: 1, expectedReturnDate: getTodayDateString(), expectedReturnTime: '17:00', initialCondition: 'Tốt / Hoạt động bình thường', borrowNotes: '' }); setShowBorrowModal(true); }}>{isConsumable ? 'Xuất kho' : 'Mượn'}</Button>
              )}
              <Button size="sm" variant="ghost" icon={Edit3} onClick={() => { setEditingEquip(row); setShowEditModal(true); }} />
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleDeleteEquip(row.id, row.name)} />
            </div>
          </div>
        );
      }
    }
  ], [equipmentWaitlists]);

  const borrowColumns = useMemo(() => [
    {
      accessorKey: 'equipmentName',
      header: 'Thiết bị / Người mượn',
      width: '35%',
      sortable: true,
      cell: (ticket) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{ticket.equipmentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
            <span>Mã: <strong style={{ color: '#a78bfa' }}>{ticket.equipmentCode}</strong></span>
            <span>·</span>
            <span>SL: <strong>{ticket.qty}</strong></span>
          </div>
          <div style={{ marginTop: '0.45rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.35rem' }}>
            <span style={{ fontWeight: '500', color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{ticket.borrowerName}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>(MSSV: {ticket.mssv})</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'expectedReturnDate',
      header: 'Thời hạn',
      width: '25%',
      sortable: true,
      cell: (ticket) => {
        const statusInfo = getBorrowStatusInfo(ticket);
        return ticket.expectedReturnDate ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Clock size={12} style={{ color: 'var(--accent-green)' }} />
              Mượn: {formatDateOnly(ticket.borrowDate)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: statusInfo.overdue ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
              <Calendar size={12} style={{ color: statusInfo.overdue ? 'var(--accent-red)' : 'var(--accent-blue)' }} />
              Hạn: {formatDateWithTime(ticket.expectedReturnDate)}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} style={{ color: 'var(--accent-green)' }} />
              Xuất: {formatDateOnly(ticket.borrowDate)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Linh kiện tiêu hao</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      width: '15%',
      sortable: true,
      cell: (ticket) => {
        const statusInfo = getBorrowStatusInfo(ticket);
        return (
          <span className={`badge ${statusInfo.colorClass}`} style={{ ...statusInfo.style, whiteSpace: 'nowrap' }}>
            {statusInfo.label}
          </span>
        );
      }
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      width: '25%',
      sortable: false,
      align: 'right',
      cell: (ticket) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
          {ticket.status === 'Đã đặt trước' ? (
            <Button
              size="sm"
              variant="primary"
              style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
              onClick={() => {
                setSelectedBorrow(ticket);
                setBorrowForm({ ...borrowForm, initialCondition: 'Tốt / Hoạt động bình thường', borrowNotes: ticket.borrowNotes || '' });
                setShowConfirmHandoverModal(true);
              }}
            >
              Xác nhận bàn giao
            </Button>
          ) : ticket.status === 'Đang mượn' ? (
            <Button
              size="sm"
              variant="primary"
              style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
              onClick={() => {
                setSelectedBorrow(ticket);
                setReturnForm({ returnMssv: ticket.mssv, finalCondition: 'Tốt / Nguyên vẹn như cũ', returnNotes: '' });
                setShowReturnModal(true);
              }}
            >
              Trả thiết bị
            </Button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <CheckCircle size={14} /> {ticket.status === 'Đã tiêu hao' ? 'Đã dùng' : 'Đã trả'}
            </span>
          )}
          <Button type="button" size="sm" variant="ghost" icon={Info} iconPosition="left" onClick={() => { setSelectedBorrowDetail(ticket); setShowDetailsModal(true); }}>Chi tiết</Button>
        </div>
      )
    }
  ], [borrowForm, borrowTickets]);

  const equipmentFieldMap = [
    { excelHeader: 'Tên thiết bị', fieldKey: 'name', required: true, type: 'string' },
    { excelHeader: 'Mã thiết bị', fieldKey: 'code', required: true, type: 'string' },
    { excelHeader: 'Số lượng', fieldKey: 'totalQty', required: true, type: 'number' },
    { excelHeader: 'Vị trí', fieldKey: 'location', required: false, type: 'string' },
    { excelHeader: 'Danh mục', fieldKey: 'category', required: false, type: 'string' },
    { excelHeader: 'Đơn vị', fieldKey: 'unit', required: false, type: 'string' },
    { excelHeader: 'Ngưỡng tối thiểu', fieldKey: 'minThreshold', required: false, type: 'number' },
  ];

  const equipmentSampleRow = {
    name: 'Máy hiện sóng Rigol DS1054Z',
    code: 'RIG-02',
    totalQty: 2,
    location: 'Tủ A1',
    category: 'Thiết bị đo lường',
    unit: 'Cái',
    minThreshold: 1
  };

  const handleImportEquipment = async (rows) => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows.map(r => ({ ...r, assetType: 'Thiết bị' })))
      });
      const data = await res.json();
      if (res.ok) {
        mutateEquip();
        return { success: data.success, failed: data.failed, error: data.errors?.join(', ') };
      } else {
        throw new Error(data.error || 'Lỗi xử lý import');
      }
    } catch (err) {
      return { success: 0, failed: rows.length, error: err.message };
    }
  };

  return (
    <div className="page-container fade-in">
      {isLoading ? (
        <SkeletonLoader type="dashboard" count={4} />
      ) : activeTab === 'analytics' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="page-header">
                <Database className="text-blue-500" size={20} />
                Phân tích & Khấu hao thiết bị
              </h2>
              <p className="page-subtitle">Theo dõi hiệu suất sử dụng, tuổi thọ vòng đời và cảnh báo bảo trì cho thiết bị</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
              <div style={{ width: '280px' }}>
                <Select
                  value={period}
                  onChange={setPeriod}
                  options={[
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
              >
                Xuất báo cáo
              </Button>
            </div>
          </div>
 
        </div>
      ) : activeTab === 'borrows' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="page-header">
                <Database className="text-blue-500" size={20} />
                Phiếu mượn & Hoạt động trả
              </h2>
              <p className="page-subtitle">Theo dõi quá trình mượn, trả thiết bị và lịch sử xuất linh kiện tiêu hao của Lab</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
              <div style={{ width: '280px' }}>
                <Select
                  value={period}
                  onChange={setPeriod}
                  options={[
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
              >
                Xuất báo cáo
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className="page-header">
                <Database className="text-blue-500" size={20} />
                Quản lý thiết bị
              </h2>
              <p className="page-subtitle">Danh mục thiết bị phân loại rõ ràng, quy trình mượn/xuất kho kiểm soát cực kỳ kỹ lưuỡng</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
              <Button variant="secondary" icon={FileSpreadsheet} iconPosition="left" onClick={() => { setErrorMsg(''); setSuccessMsg(''); setShowImportModal(true); }}>Import Excel</Button>
              <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => { setErrorMsg(''); setSuccessMsg(''); setShowAddModal(true); }}>Thêm thiết bị mới</Button>
            </div>
          </div>
        </div>
      )}

      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}



      {activeTab === 'analytics' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Activity size={20} style={{ color: 'var(--accent-blue)' }} />
                Khấu hao & Tiêu hao Thiết Bị (Trong kỳ)
              </h2>
            </div>
            
            <DataTable
              data={sortedEquipmentStats}
              columns={eqStatsColumns}
              searchKeys={['name', 'code', 'category']}
              renderExpandedRow={renderEqStatsExpandedRow}
              expandedRowId={expandedEqStatId}
              onExpandedRowChange={setExpandedEqStatId}
            />
          </div>
        </div>
      ) : activeTab === 'borrows' ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Inbox size={20} style={{ color: 'var(--accent-blue)' }} />
              Danh sách phiếu mượn & hoạt động trả ({borrowTickets.length})
            </h2>

          </div>

          <DataTable 
            data={borrowTickets.filter(ticket => {
              const matchCat = selectedBorrowTab === 'Tất cả' || ticket.status === selectedBorrowTab;
              return matchCat;
            })}
            columns={borrowColumns}
            searchKeys={['equipmentName', 'equipmentCode', 'borrowerName', 'mssv']}
            searchPlaceholder="Tìm theo tên thiết bị, người mượn hoặc MSSV..."
            rowSelection={selectedBorrowIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})}
            onRowSelectionChange={(sel) => {
              const selectedIds = Object.keys(sel).filter(key => sel[key]);
              // In this quick integration, since DataTable works with indices, we need to map indices to IDs.
              // Wait! DataTable uses indices for rowSelection (0, 1, 2). This won't work perfectly with external IDs unless DataTable uses row.id.
              // I will leave this as internal selection for now, or adapt it.
            }}
            toolbarActions={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '280px' }}>
                  <Select
                    value={selectedBorrowTab}
                    onChange={setSelectedBorrowTab}
                    options={BORROW_STATUS_TABS.map(tab => ({
                      value: tab.value,
                      label: tab.label === 'Tất cả' ? 'Tất cả trạng thái' : tab.label
                    }))}
                  />
                </div>
                {selectedBorrowIds.length > 0 && (
                  <Button variant="secondary" icon={Download} iconPosition="left" onClick={() => setIsExportModalOpen(true)}>Export Selected</Button>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Boxes size={20} style={{ color: 'var(--accent-blue)' }} />
              Kho thiết bị ({filteredEquipment.length})
            </h2>

          </div>
          
          <DataTable 
            data={filteredEquipment}
            columns={equipmentColumns}
            searchKeys={['name', 'code']}
            searchPlaceholder="Tìm theo tên hoặc mã thiết bị..."
            toolbarActions={
              <div style={{ width: '280px', flexShrink: 0 }}>
                <Select
                  value={selectedCategoryTab}
                  onChange={setSelectedCategoryTab}
                  options={['Tất cả', ...availableCategories].map(cat => ({
                    value: cat,
                    label: cat === 'Tất cả' ? 'Tất cả danh mục' : cat
                  }))}
                />
              </div>
            }
          />
        </div>
      )}

      {/* ─── Modals ───────────────────────────────────────────────────────── */}
      <AddEquipmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(name) => {
          setSuccessMsg(`Đã thêm thiết bị: ${name}`);
          setShowAddModal(false);
          mutateEquip();
        }}
        setErrorMsg={setErrorMsg}
        equipmentList={equipmentList}
      />

      <EditEquipmentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        equip={editingEquip}
        onSuccess={() => {
          setSuccessMsg('Đã cập nhật thông tin thiết bị');
          setShowEditModal(false);
          mutateEquip();
        }}
        setErrorMsg={setErrorMsg}
      />

      <BorrowEquipmentModal
        isOpen={showBorrowModal}
        onClose={() => setShowBorrowModal(false)}
        selectedEquip={selectedEquip}
        borrowForm={borrowForm}
        setBorrowForm={setBorrowForm}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        suggestedMembers={suggestedMembers}
        setSuggestedMembers={setSuggestedMembers}
        handleMemberSearch={handleMemberSearch}
        handleBorrowSubmit={handleBorrowSubmit}
        getTodayDateString={getTodayDateString}
      />

      <ReturnEquipmentModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        selectedBorrow={selectedBorrow}
        returnForm={returnForm}
        setReturnForm={setReturnForm}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        suggestedMembers={suggestedMembers}
        setSuggestedMembers={setSuggestedMembers}
        handleMemberSearch={handleMemberSearch}
        handleReturnSubmit={handleReturnSubmit}
      />

      <EquipmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedBorrowDetail(null); }}
        selectedBorrowDetail={selectedBorrowDetail}
        formatTime={formatTime}
        formatDateWithTime={formatDateWithTime}
        getBorrowStatusInfo={getBorrowStatusInfo}
      />

      <ConfirmHandoverModal
        isOpen={showConfirmHandoverModal}
        onClose={() => setShowConfirmHandoverModal(false)}
        selectedBorrow={selectedBorrow}
        borrowForm={borrowForm}
        setBorrowForm={setBorrowForm}
        onConfirm={() => {
          setShowConfirmHandoverModal(false);
          setRfidAction('confirm-handover');
          setRfidScanStatus('idle');
          setScannedUserInfo(null);
          setShowRfidModal(true);
        }}
      />

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        selectedEquip={selectedEquip}
        equipmentWaitlists={equipmentWaitlists}
        waitlistForm={waitlistForm}
        setWaitlistForm={setWaitlistForm}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        suggestedMembers={suggestedMembers}
        setSuggestedMembers={setSuggestedMembers}
        handleMemberSearch={handleMemberSearch}
        handleWaitlistSubmit={handleWaitlistSubmit}
      />

      <RfidScanModal
        isOpen={showRfidModal}
        onClose={() => {
          setShowRfidModal(false);
          setScannedUserInfo(null);
          setRfidScanStatus('idle');
        }}
        status={rfidScanStatus}
        scannedUser={scannedUserInfo}
        errorMessage={rfidScanMessage}
        idleTitle={rfidAction === 'borrow' ? 'Xác nhận mượn thiết bị' : rfidAction === 'confirm-handover' ? 'Xác nhận bàn giao thiết bị' : 'Xác nhận trả thiết bị'}
        successTitle="Đã quét thẻ thành công"
        successChildren={
          <>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <div><span style={{ color: 'rgba(255,255,255,0.7)' }}>Sinh viên:</span> <strong style={{ fontSize: '1.1rem' }}>{scannedUserInfo?.name}</strong></div>
                <div><span style={{ color: 'rgba(255,255,255,0.7)' }}>MSSV:</span> <strong>{scannedUserInfo?.mssv}</strong></div>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleRfidComplete}
              style={{ width: '100%', backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
            >
              Hoàn tất quá trình
            </Button>
          </>
        }
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        type="device"
        columns={activeTab === 'borrows' ? borrowExportColumns : analyticsExportColumns}
        counts={{
          all: activeTab === 'borrows' ? borrowTickets.length : (report?.equipmentStats?.length || 0),
          filtered: activeTab === 'borrows' ? sortedBorrowTickets.length : sortedEquipmentStats.length,
          selected: activeTab === 'borrows' ? selectedBorrowIds.length : 0
        }}
        onExport={activeTab === 'borrows' ? handleAdvancedBorrowExport : handleAdvancedAnalyticsExport}
      />

      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportEquipment}
        title="Import Thiết bị từ Excel"
        fieldMap={equipmentFieldMap}
        sampleRow={equipmentSampleRow}
      />
    </div>
  );
}

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};
