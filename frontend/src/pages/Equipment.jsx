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
  Bell,
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
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CancelReservationModal from '../components/equipment/CancelReservationModal';
import ImportExcelModal from '../components/ImportExcelModal';
import { CATEGORIES, ASSET_TYPES, BORROW_STATUS_TABS } from '../utils/constants';
import { API_BASE_URL } from '../config';
import SkeletonLoader from '../components/SkeletonLoader';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import TextInput from '../components/TextInput';

// ─── Constants ────────────────────────────────────────────────────────────────

export default function Equipment({ activeTab = 'list', pageParams = {} }) {
  const { data: equipmentList = [], mutate: mutateEquip, isLoading: isLoadingEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: borrowTickets = [], mutate: mutateBorrows, isLoading: isLoadingBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: allWaitlists = [], mutate: mutateWaitlists, isLoading: isLoadingWaitlists } = useSWR(`${API_BASE_URL}/waitlist`, fetcher);
  const { data: members = [], isLoading: isLoadingMembers } = useSWR(`${API_BASE_URL}/members`, fetcher);
  const { data: systemSettings } = useSWR(`${API_BASE_URL}/settings`, fetcher);
  const isLoading = isLoadingEquip || isLoadingBorrows || isLoadingMembers;
  const [searchTerm, setSearchTerm] = useState(pageParams.searchTerm || '');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Tất cả');
  const [selectedBorrowTab, setSelectedBorrowTab] = useState(pageParams.borrowTab || 'Tất cả');

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

  const [analyticsCategory, setAnalyticsCategory] = useState('Tất cả');

  const analyticsCategories = useMemo(() => {
    if (!report?.equipmentStats) return [{ value: 'Tất cả', label: 'Tất cả danh mục' }];
    const cats = Array.from(new Set(report.equipmentStats.map(e => e.category).filter(Boolean)));
    return [
      { value: 'Tất cả', label: 'Tất cả danh mục' },
      ...cats.map(c => ({ value: c, label: c }))
    ];
  }, [report?.equipmentStats]);

  const filteredEquipmentStats = useMemo(() => {
    if (!report?.equipmentStats) return [];
    return report.equipmentStats.filter(e => {
      const matchText = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = analyticsCategory === 'Tất cả' || e.category === analyticsCategory;
      return matchText && matchCategory;
    }).map(e => {
      const instances = e.instances || [];
      const batchCount = instances.length > 0 ? instances.length : Math.max(e.totalQty || 1, 1);
      const singleLifespan = Number(e.lifespanHours) || 10000;
      const totalBatchLifespan = Number(e.totalBatchLifespan) || (batchCount * singleLifespan);
      return {
        ...e,
        depreciationPercent: Number(e.depreciationPercent) || 0,
        periodUsedHours: Number(e.periodUsedHours) || 0,
        totalUsedHours: Number(e.totalUsedHours) || 0,
        lifespanHours: singleLifespan,
        totalBatchLifespan: totalBatchLifespan,
        batchCount: batchCount
      };
    });
  }, [report?.equipmentStats, searchTerm, analyticsCategory]);

  const { items: sortedEquipmentStats, requestSort: requestEqStatsSort, getSortIcon: getEqStatsSortIcon } = useSortableTable(
    filteredEquipmentStats,
    'periodUsedHours',
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
          <span>{row.name}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({row.code})</span>
        </div>
      </div>
    )},
    { accessorKey: 'category', header: 'Phân loại', sortable: true, cell: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.category}</span> },
    { accessorKey: 'periodBorrowCount', header: 'Lượt mượn (Kỳ này)', sortable: true, align: 'right', cell: (row) => <span style={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{row.periodBorrowCount}</span> },
    { accessorKey: 'periodUsedHours', header: 'Giờ dùng thêm (Kỳ này)', sortable: true, align: 'right', cell: (row) => <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>+{typeof row.periodUsedHours === 'number' ? Number(row.periodUsedHours).toFixed(1) : row.periodUsedHours}h</span> },
    { accessorKey: 'totalUsedHours', header: 'Tổng thời gian đã dùng', sortable: true, align: 'right', cell: (row) => {
      const used = typeof row.totalUsedHours === 'number' ? Number(row.totalUsedHours).toFixed(1) : row.totalUsedHours;
      const totalBatch = row.totalBatchLifespan || ((row.batchCount || 1) * (row.lifespanHours || 10000));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {used}h
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            / {totalBatch.toLocaleString()}h tổng định mức
          </span>
        </div>
      );
    }},
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
    let instances = row.instances || [];
    const count = Math.max(
      row.totalQty || 0,
      row.periodBorrowCount || 0,
      instances.length,
      1
    );
    const lifespan = row.lifespanHours || 10000;
    const avgUsed = row.totalUsedHours ? (row.totalUsedHours / count) : 0;

    if (instances.length === 0) {
      instances = Array.from({ length: count }, (_, idx) => ({
        id: `auto-${row.id}-${idx + 1}`,
        serialNumber: `${row.code}-${String(idx + 1).padStart(2, '0')}`,
        status: row.status || 'Sẵn sàng',
        usedHours: Number(avgUsed.toFixed(1)),
        lifespanHours: lifespan
      }));
    }

    return (
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <table className="table" style={{ margin: 0, background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
          <thead>
            <tr style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tên thiết bị con & Số hiệu máy</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Trạng thái</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Tình trạng mượn</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Thời gian đã dùng (Máy này)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>% Khấu hao (Máy này)</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst, idx) => {
              const instLifespan = inst.lifespanHours || lifespan;
              const used = Number(inst.usedHours) || (Number(avgUsed.toFixed(1)) || 0);
              const instDepreciation = Math.min(100, Math.round((used / instLifespan) * 100));

              let instColor = 'var(--accent-green)';
              let instStatus = 'Tốt';
              if (instDepreciation >= 100) {
                instColor = 'var(--accent-red)';
                instStatus = 'Quá hạn';
              } else if (instDepreciation >= 80) {
                instColor = 'var(--accent-amber)';
                instStatus = 'Cần bảo trì';
              }

              const instanceNumber = String(idx + 1).padStart(2, '0');
              const instanceCode = inst.serialNumber || `${row.code}-${instanceNumber}`;

              return (
                <tr key={inst.id || `${row.id}-${idx}`}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {row.name} <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>#{instanceNumber}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Mã định danh: {instanceCode}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem', padding: '8px 12px' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{inst.status || 'Sẵn sàng'}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    {inst.status === 'Đang mượn' ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Đang mượn {inst.borrowedBy ? `(${inst.borrowedBy})` : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sẵn sàng trong kho</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '8px 12px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{used.toFixed(1)}h</strong> / {instLifespan.toLocaleString()}h
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: instColor, fontWeight: 'bold', fontSize: '0.875rem' }}>
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState(null);
  const [isCancellingReservation, setIsCancellingReservation] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeletingEquip, setIsDeletingEquip] = useState(false);
  const [showDeleteWaitlistModal, setShowDeleteWaitlistModal] = useState(false);
  const [deletingWaitlist, setDeletingWaitlist] = useState(null);
  const [isDeletingWaitlist, setIsDeletingWaitlist] = useState(false);
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

  // Trợ giúp ngày mượn và ngày hẹn trả mặc định
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowDateString = (baseDateStr) => {
    const d = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State tìm gợi ý thành viên cho mượn và trả
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [suggestedMembers, setSuggestedMembers] = useState([]);

  const getDefaultBorrowTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 29);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [borrowForm, setBorrowForm] = useState({
    mssv: '',
    qty: 1,
    borrowDate: getTodayDateString(),
    borrowTime: getDefaultBorrowTime(),
    expectedReturnDate: getTomorrowDateString(),
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

  // Xử lý điều hướng từ Dashboard sang: tự động chọn tab và mở modal chi tiết phiếu
  useEffect(() => {
    if (pageParams.borrowTab) {
      setSelectedBorrowTab(pageParams.borrowTab);
    }
    if (pageParams.searchTerm !== undefined) {
      setSearchTerm(pageParams.searchTerm);
    }
    if (pageParams.ticketId && borrowTickets.length > 0) {
      const found = borrowTickets.find(t => t.id === pageParams.ticketId);
      if (found) {
        setSelectedBorrowDetail(found);
        setShowDetailsModal(true);
      }
    }
  }, [pageParams, borrowTickets]);

  // Xử lý tìm kiếm thành viên gợi ý
  const handleMemberSearch = (query) => {
    setMemberSearchQuery(query);
    if (!query || !query.trim()) {
      // Khi click vào hoặc input rỗng, hiển thị toàn bộ danh sách thành viên (giới hạn 30)
      setSuggestedMembers(members.slice(0, 30));
      return;
    }
    const q = query.toLowerCase();
    const matches = members.filter(m =>
      m.name?.toLowerCase().includes(q) || m.mssv?.toLowerCase().includes(q)
    ).slice(0, 30);
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
    const rawMssv = borrowForm.mssv || memberSearchQuery || '';
    const cleanMssv = rawMssv.includes('–') ? rawMssv.split('–')[0].trim() : (rawMssv.includes('-') ? rawMssv.split('-')[0].trim() : rawMssv.trim());
    if (!cleanMssv || Number(borrowForm.qty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và số lượng');
      return;
    }
    if (borrowForm.mssv !== cleanMssv) {
      borrowForm.mssv = cleanMssv;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/equipment/borrows/${selectedBorrow.id}/confirm-handover`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cardId,
          initialCondition: borrowForm.initialCondition,
          borrowNotes: borrowForm.borrowNotes
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Đã xác nhận bàn giao thiết bị "${selectedBorrow.equipmentName}" cho ${scannedUserInfo?.name || 'sinh viên'}!`);
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
    const cleanMssv = waitlistForm.mssv?.includes('–') ? waitlistForm.mssv.split('–')[0].trim() : waitlistForm.mssv?.trim();
    if (!cleanMssv || Number(waitlistForm.qty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và số lượng');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEquip.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...waitlistForm,
          mssv: cleanMssv
        })
      });
      const data = await res.json();

      setShowWaitlistModal(false);
      if (!res.ok) {
        setErrorMsg(data.error || 'Lỗi đăng ký chờ');
      } else {
        setSuccessMsg(`🔔 Đã tiếp nhận đăng ký chờ mượn ${selectedEquip.name}! Hệ thống sẽ gửi thông báo ngay khi có thiết bị.`);
        setWaitlistForm({ mssv: '', qty: 1, purpose: 'Đồ án môn học / Khóa luận tốt nghiệp', neededDate: '', notes: '' });
        setMemberSearchQuery('');
        setSuggestedMembers([]);
        mutateEquip();
      }
    } catch (error) {
      setShowWaitlistModal(false);
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const processBorrow = async (cardId) => {
    try {
      const isConsumable = selectedEquip.assetType === 'Linh kiện tiêu hao' || (selectedEquip.assetType && (selectedEquip.assetType.toLowerCase().includes('linh kiện') || selectedEquip.assetType.toLowerCase().includes('vật tư')));
      const availableInstances = (selectedEquip.instances || []).filter(i => i.status === 'Sẵn sàng');
      const selectedInstanceIds = !isConsumable && availableInstances.length > 0 
        ? availableInstances.slice(0, Number(borrowForm.qty)).map(i => i.id) 
        : [];

      const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEquip.id}/borrow`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...borrowForm,
          selectedInstanceIds,
          cardId: cardId,
          borrowDate: (borrowForm.borrowDate && borrowForm.borrowTime)
            ? new Date(borrowForm.borrowDate + 'T' + borrowForm.borrowTime + ':00').toISOString()
            : (borrowForm.borrowDate ? new Date(borrowForm.borrowDate).toISOString() : new Date().toISOString()),
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
          borrowDate: getTodayDateString(),
          borrowTime: '08:30',
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/equipment/borrows/${selectedBorrow.id}/return`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...returnForm,
          cardId: cardId
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Đã ghi nhận trả thiết bị thành công');
        setShowReturnModal(false);
        setShowRfidModal(false);
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/rfid-cards`, { headers });
      const cards = await response.json();
      if (Array.isArray(cards)) {
        setRfidCards(cards);
      }

      setShowReturnModal(false);
      setRfidScanStatus('idle');
      setScannedUserInfo(null);
      setRfidAction('return');
      setShowRfidModal(true);
    } catch (error) {
      setErrorMsg('Lỗi kết nối hệ thống RFID');
    }
  };

  const handleDeleteEquip = (row) => {
    // Nhận cả object thiết bị hoặc (id, name)
    const item = typeof row === 'object' ? row : { id: row, name: arguments[1] || 'Thiết bị' };
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteEquip = async () => {
    if (!deletingItem) return;
    setIsDeletingEquip(true);
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${deletingItem.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg(`Đã xóa thiết bị ${deletingItem.name}`);
        mutateEquip();
        setShowDeleteModal(false);
        setDeletingItem(null);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Không thể xóa thiết bị');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    } finally {
      setIsDeletingEquip(false);
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
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} Thg ${month}, ${year} lúc ${hours}:${minutes}`;
  };

  const getBorrowStatusInfo = (ticket) => {
    if (ticket.status === 'Đã hủy') {
      return {
        label: 'Đã hủy giữ chỗ',
        colorClass: 'badge-danger',
        overdue: false,
        style: { backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--text-muted)', border: '1px solid rgba(239, 68, 68, 0.25)', textDecoration: 'line-through' }
      };
    }

    if (ticket.status === 'Đã đặt trước') {
      if (ticket.borrowDate) {
        const scheduledTime = new Date(ticket.borrowDate);
        const now = new Date();
        if (now > scheduledTime) {
          const diffMs = now - scheduledTime;
          const diffMinutesTotal = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMinutesTotal / 60);
          const remainingMinutes = diffMinutesTotal % 60;

          let overdueText = '';
          if (diffHours >= 1) {
            overdueText = remainingMinutes > 0 
              ? `Quá giờ nhận (${diffHours}h${remainingMinutes}p)`
              : `Quá giờ nhận (${diffHours}h)`;
          } else {
            overdueText = `Quá giờ nhận (${diffMinutesTotal}p)`;
          }

          return {
            label: `⚠️ ${overdueText}`,
            colorClass: 'badge-danger',
            overdue: true,
            isPickupOverdue: true,
            style: { backgroundColor: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: '600' }
          };
        }
      }

      return {
        label: 'Đang chờ nhận',
        colorClass: 'badge-warning',
        overdue: false,
        isPickupOverdue: false,
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
      const key = e.key;
      let cardNum = null;
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
        cardNum = key;
      } else if (key.startsWith('Numpad') && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key.replace('Numpad', ''))) {
        cardNum = key.replace('Numpad', '');
      }

      if (cardNum) {
        const cardId = `CARD-00${cardNum}`;

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
            setRfidScanMessage(`Thẻ không khớp! Vui lòng quét đúng thẻ của sinh viên (${expectedMssv}).`);
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
      header: 'Mã TB',
      width: '15%',
      sortable: true,
      align: 'left',
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const isOutOfStock = isConsumable ? row.totalQty <= 0 : available <= 0;
        const minThreshold = row.minThreshold || 0;
        const isLowStock = isConsumable ? (row.totalQty <= minThreshold && row.totalQty > 0) : (available <= minThreshold && available > 0);
        return (
          <div style={{ fontWeight: '700', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {isOutOfStock && <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} title="Hết hàng" />}
            {isLowStock && !isOutOfStock && <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} title="Sắp hết hàng" />}
            <span>{row.code || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'name',
      header: 'Tên thiết bị',
      width: '42%',
      sortable: true,
      align: 'left',
      cell: (row) => {
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        return (
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35 }}>{row.name}</div>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.76rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)' }}>{row.category || 'Khác'}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Vị trí: <strong style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{row.location || 'Kho Lab'}</strong>
              </span>
              {isConsumable && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.12)', padding: '1px 5px', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
                    Tiêu hao
                  </span>
                </>
              )}
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'totalQty',
      header: 'Tồn kho',
      width: '18%',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const minThreshold = row.minThreshold || 0;
        const isLowStock = isConsumable ? (row.totalQty <= minThreshold && row.totalQty > 0) : (available <= minThreshold && available > 0);
        
        if (isConsumable) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: row.totalQty > minThreshold ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '0.95rem' }}>
                {row.totalQty}
              </span>
              {isLowStock && <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.12)', padding: '2px 5px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>Sắp hết</span>}
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ fontSize: '0.95rem' }}>
              <span style={{ color: available > minThreshold ? 'var(--accent-green)' : 'var(--accent-red)' }}>{available}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}> / {row.totalQty}</span>
            </div>
            {isLowStock && <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.12)', padding: '2px 5px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>Sắp hết</span>}
          </div>
        );
      }
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      width: '25%',
      sortable: false,
      align: 'right',
      cell: (row) => {
        const available = row.totalQty - (row.borrowedQty || 0);
        const isConsumable = row.assetType === 'Linh kiện tiêu hao' || row.assetType === 'Vật tư tiêu hao';
        const isOutOfStock = isConsumable ? row.totalQty <= 0 : available <= 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end', width: '100%' }}>
            {isOutOfStock && equipmentWaitlists[row.id] > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                <User size={12} /> {equipmentWaitlists[row.id]} đang chờ
              </div>
            )}
            <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              {isOutOfStock && !isConsumable ? (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', height: '32px' }} 
                  onClick={() => { setSelectedEquip(row); setShowWaitlistModal(true); }}
                >
                  🔔 Đăng ký chờ
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="primary" 
                  style={{ height: '32px' }}
                  onClick={() => { 
                    setSelectedEquip(row); 
                    const firstReadyInst = row.instances?.find(i => i.status === 'Sẵn sàng');
                    setBorrowForm({ 
                      mssv: '', 
                      qty: 1, 
                      selectedInstanceIds: firstReadyInst ? [firstReadyInst.id] : [],
                      borrowDate: getTodayDateString(),
                      borrowTime: getDefaultBorrowTime(),
                      expectedReturnDate: getTomorrowDateString(), 
                      expectedReturnTime: systemSettings?.defaultReturnTime || '17:00', 
                      initialCondition: 'Tốt / Hoạt động bình thường', 
                      borrowNotes: '' 
                    }); 
                    setShowBorrowModal(true); 
                  }}
                >
                  {isConsumable ? 'Xuất kho' : 'Mượn TB'}
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                icon={Edit3} 
                title="Sửa thông tin" 
                aria-label="Sửa thiết bị"
                onClick={() => { setEditingEquip(row); setShowEditModal(true); }} 
              />
              <Button 
                size="sm" 
                variant="danger-ghost" 
                icon={Trash2} 
                title="Xóa thiết bị" 
                aria-label="Xóa thiết bị"
                onClick={() => handleDeleteEquip(row)} 
              />
            </div>
          </div>
        );
      }
    }
  ], [equipmentWaitlists, systemSettings]);

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
        if (ticket.isWaitlist || ticket.status === 'waiting') {
          return (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Clock size={12} style={{ color: 'var(--accent-amber)' }} />
                Đăng ký: {formatDateWithTime ? formatDateWithTime(ticket.registeredDate || ticket.borrowDate) : formatTime(ticket.registeredDate || ticket.borrowDate)}
              </span>
              {ticket.neededDate && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', whiteSpace: 'nowrap' }}>
                  <Calendar size={12} />
                  Ngày cần: {ticket.neededDate}
                </span>
              )}
            </div>
          );
        }

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
        if (ticket.isWaitlist || ticket.status === 'waiting') {
          return (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: '600',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-amber)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              whiteSpace: 'nowrap'
            }}>
              ⏳ Đang chờ lượt
            </span>
          );
        }

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
      cell: (ticket) => {
        if (ticket.isWaitlist || ticket.status === 'waiting') {
          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hàng chờ</span>
              <Button
                size="sm"
                variant="danger-ghost"
                icon={Trash2}
                title="Xóa khỏi danh sách chờ"
                onClick={() => handleDeleteWaitlist(ticket.id, ticket.mssv, ticket.borrowerName || ticket.userName, ticket.equipmentName)}
              />
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
            {ticket.status === 'Đã đặt trước' ? (
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <Button
                  size="sm"
                  variant="primary"
                  style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)', height: '32px' }}
                  onClick={() => {
                    setSelectedBorrow(ticket);
                    setBorrowForm({ ...borrowForm, initialCondition: 'Tốt / Hoạt động bình thường', borrowNotes: ticket.borrowNotes || '' });
                    setShowConfirmHandoverModal(true);
                  }}
                >
                  Bàn giao
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  style={{ height: '32px' }}
                  title="Hủy phiếu đặt trước & Hoàn trả thiết bị lại kho"
                  onClick={() => {
                    setCancellingTicket(ticket);
                    setShowCancelModal(true);
                  }}
                >
                  Hủy giữ chỗ
                </Button>
              </div>
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
            ) : ticket.status === 'Đã hủy' ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <X size={14} style={{ color: 'var(--accent-red)' }} /> Đã hủy
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <CheckCircle size={14} /> {ticket.status === 'Đã tiêu hao' ? 'Đã dùng' : 'Đã trả'}
              </span>
            )}
            <Button type="button" size="sm" variant="ghost" icon={Info} iconPosition="left" onClick={() => { setSelectedBorrowDetail(ticket); setShowDetailsModal(true); }}>Chi tiết</Button>
          </div>
        );
      }
    }
  ], [borrowForm, borrowTickets, mutateBorrows, mutateEquip, formatDateWithTime, formatTime]);

  const handleDeleteWaitlist = (waitlistId, mssv, userName, equipmentName) => {
    setDeletingWaitlist({ id: waitlistId, mssv, userName, equipmentName });
    setShowDeleteWaitlistModal(true);
  };

  const handleConfirmDeleteWaitlist = async () => {
    if (!deletingWaitlist) return;
    setIsDeletingWaitlist(true);
    try {
      const res = await fetch(`${API_BASE_URL}/waitlist/${deletingWaitlist.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: deletingWaitlist.mssv })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Đã xóa ${deletingWaitlist.userName} khỏi danh sách chờ`);
        mutateWaitlists();
        mutateEquip();
        setShowDeleteWaitlistModal(false);
        setDeletingWaitlist(null);
      } else {
        setErrorMsg(data.error || 'Lỗi khi xóa đăng ký chờ');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setIsDeletingWaitlist(false);
    }
  };

  const waitlistColumns = useMemo(() => [
    {
      accessorKey: 'equipmentName',
      header: 'Thiết bị / Người chờ',
      width: '35%',
      sortable: true,
      cell: (row) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{row.equipmentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
            <span>Mã: <strong style={{ color: '#a78bfa' }}>{row.equipmentCode}</strong></span>
            <span>·</span>
            <span>Số lượng cần: <strong style={{ color: 'var(--accent-amber)' }}>{row.qty} chiếc</strong></span>
          </div>
          <div style={{ marginTop: '0.45rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.35rem' }}>
            <span style={{ fontWeight: '500', color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{row.userName}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>(MSSV: {row.mssv})</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'registeredDate',
      header: 'Thời gian đăng ký & Dự kiến',
      width: '35%',
      sortable: true,
      cell: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Đăng ký: </span>
            <strong>{formatDateWithTime ? formatDateWithTime(row.registeredDate) : formatTime(row.registeredDate)}</strong>
          </div>
          {row.neededDate && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Ngày cần: </span>
              <strong style={{ color: 'var(--accent-amber)' }}>{row.neededDate}</strong>
            </div>
          )}
          {row.purpose && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Mục đích: <em>{row.purpose}</em>
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      width: '15%',
      sortable: true,
      align: 'center',
      cell: (row) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '0.78rem',
          fontWeight: '600',
          backgroundColor: row.status === 'waiting' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.15)',
          color: row.status === 'waiting' ? 'var(--accent-amber)' : 'var(--text-muted)',
          border: row.status === 'waiting' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)'
        }}>
          {row.status === 'waiting' ? '⏳ Đang chờ lượt' : row.status}
        </span>
      )
    },
    {
      accessorKey: 'actions',
      header: 'Thao tác',
      width: '15%',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
          <Button
            size="sm"
            variant="danger-ghost"
            icon={Trash2}
            title="Xóa khỏi danh sách chờ"
            onClick={() => handleDeleteWaitlist(row.id, row.mssv, row.userName, row.equipmentName)}
          />
        </div>
      )
    }
  ], [formatDateWithTime, formatTime]);

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
                  <TextInput type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '150px' }} />
                  <span> - </span>
                  <TextInput type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '150px' }} />
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
                  <TextInput type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: '150px' }} />
                  <span> - </span>
                  <TextInput type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: '150px' }} />
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
          <Card
            title={`Khấu hao & Tiêu hao Thiết Bị (Trong kỳ) (${sortedEquipmentStats.length})`}
            icon={Activity}
            style={{ color: 'var(--accent-blue)' }}
          >
            <DataTable
              data={sortedEquipmentStats}
              columns={eqStatsColumns}
              searchKeys={['name', 'code', 'category']}
              searchPlaceholder="Tìm theo tên thiết bị, mã hoặc phân loại..."
              toolbarActions={
                <div style={{ width: '240px' }}>
                  <Select
                    value={analyticsCategory}
                    onChange={setAnalyticsCategory}
                    options={analyticsCategories}
                  />
                </div>
              }
              renderExpandedRow={renderEqStatsExpandedRow}
              expandedRowId={expandedEqStatId}
              onExpandedRowChange={setExpandedEqStatId}
            />
          </Card>
        </div>
      ) : activeTab === 'borrows' ? (
        <Card
          title={selectedBorrowTab === 'waitlist' ? `Danh sách đăng ký chờ mượn (Waitlist - ${allWaitlists.filter(w => w.status === 'waiting').length} người)` : `Danh sách phiếu mượn & hoạt động trả (${borrowTickets.length})`}
          icon={selectedBorrowTab === 'waitlist' ? Bell : Inbox}
          style={{ color: selectedBorrowTab === 'waitlist' ? 'var(--accent-amber)' : 'var(--accent-blue)' }}
        >
          {selectedBorrowTab === 'waitlist' ? (
            <DataTable 
              data={allWaitlists.filter(w => w.status === 'waiting')}
              columns={waitlistColumns}
              searchKeys={['equipmentName', 'equipmentCode', 'userName', 'mssv', 'purpose']}
              searchPlaceholder="Tìm theo tên thiết bị, sinh viên hoặc MSSV..."
              toolbarActions={
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
              }
            />
          ) : (
            <DataTable 
              data={(() => {
                if (selectedBorrowTab === 'Tất cả') {
                  const waitingItems = allWaitlists
                    .filter(w => w.status === 'waiting')
                    .map(w => ({
                      ...w,
                      isWaitlist: true,
                      borrowerName: w.userName,
                      borrowDate: w.registeredDate
                    }));
                  return [...waitingItems, ...borrowTickets];
                }
                return borrowTickets.filter(ticket => ticket.status === selectedBorrowTab);
              })()}
              columns={borrowColumns}
              searchKeys={['equipmentName', 'equipmentCode', 'borrowerName', 'userName', 'mssv']}
              searchPlaceholder="Tìm theo tên thiết bị, người mượn hoặc MSSV..."
              rowSelection={selectedBorrowIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})}
              onRowSelectionChange={(sel) => {
                const selectedIds = Object.keys(sel).filter(key => sel[key]);
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
          )}
        </Card>
      ) : (
        <Card
          title={`Kho thiết bị (${filteredEquipment.length})`}
          icon={Boxes}
          style={{ color: 'var(--accent-blue)' }}
        >
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
        </Card>
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
        formatDateWithTime={formatDateWithTime}
        formatTime={formatTime}
        onConfirm={() => {
          setShowConfirmHandoverModal(false);
          setRfidAction('confirm-handover');
          setRfidScanStatus('idle');
          setScannedUserInfo(null);
          setShowRfidModal(true);
        }}
      />

      <CancelReservationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingTicket(null);
        }}
        ticket={cancellingTicket}
        isCancelling={isCancellingReservation}
        formatDateWithTime={formatDateWithTime}
        formatTime={formatTime}
        onConfirm={async (cancelReason) => {
          if (!cancellingTicket) return;
          setIsCancellingReservation(true);
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('lab_auth_token') : null;
            const res = await fetch(`${API_BASE_URL}/equipment/borrows/${cancellingTicket.id}/cancel-reservation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ cancelReason: cancelReason || 'Quản lý hủy giữ chỗ' })
            });
            const data = await res.json();
            if (!res.ok) {
              setErrorMsg(data.error || 'Lỗi khi hủy giữ chỗ');
            } else {
              setSuccessMsg(`✓ Đã hủy phiếu đặt trước của ${cancellingTicket.borrowerName}. Tồn kho đã được hoàn trả.`);
              setShowCancelModal(false);
              setCancellingTicket(null);
              mutateBorrows();
              mutateEquip();
            }
          } catch (err) {
            setErrorMsg('Lỗi kết nối máy chủ');
          } finally {
            setIsCancellingReservation(false);
          }
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

      {/* Confirm Delete Equipment Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingItem(null); }}
        onConfirm={handleConfirmDeleteEquip}
        title="Xác nhận xóa thiết bị"
        itemName={deletingItem?.name}
        itemCode={deletingItem?.code}
        itemCategory={deletingItem?.category}
        warningMessage="Hành động này sẽ xóa vĩnh viễn thiết bị khỏi danh mục và hệ thống quản lý. Không thể hoàn tác sau khi thực hiện!"
        confirmText="Xác nhận xóa thiết bị"
        isDeleting={isDeletingEquip}
      />

      {/* Confirm Delete Waitlist Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteWaitlistModal}
        onClose={() => { setShowDeleteWaitlistModal(false); setDeletingWaitlist(null); }}
        onConfirm={handleConfirmDeleteWaitlist}
        title="Xóa khỏi danh sách chờ"
        itemName={deletingWaitlist?.equipmentName ? `Đăng ký chờ: ${deletingWaitlist.equipmentName}` : 'Đăng ký chờ mượn'}
        itemCode={deletingWaitlist?.mssv ? `MSSV: ${deletingWaitlist.mssv}` : ''}
        itemCategory={deletingWaitlist?.userName ? `Sinh viên: ${deletingWaitlist.userName}` : ''}
        warningMessage="Hành động này sẽ hủy yêu cầu trong hàng chờ của sinh viên. Nếu muốn mượn lại sinh viên sẽ phải đăng ký lại từ đầu."
        confirmText="Xác nhận xóa khỏi hàng chờ"
        isDeleting={isDeletingWaitlist}
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
