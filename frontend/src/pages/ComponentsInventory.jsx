import React, { useState, useMemo } from 'react';
import Button from '../components/Button';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import Select from '../components/Select';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle,
  Inbox,
  AlertTriangle,
  Boxes,
  Activity,
  Zap,
  PackageMinus,
  FileSpreadsheet
} from 'lucide-react';
import { useSortableTable } from '../hooks/useSortableTable.jsx';
import AddEquipmentModal from '../components/equipment/AddEquipmentModal';
import EditEquipmentModal from '../components/equipment/EditEquipmentModal';
import BorrowEquipmentModal from '../components/equipment/BorrowEquipmentModal';
import ImportExcelModal from '../components/ImportExcelModal';
import DataTable from '../components/DataTable';
import { API_BASE_URL } from '../config';
import Card from '../components/Card';

export default function ComponentsInventory() {
  const { data: equipmentList = [], mutate: mutateEquip } = useSWR(`${API_BASE_URL}/equipment`, fetcher);
  const { data: borrowTickets = [], mutate: mutateBorrows } = useSWR(`${API_BASE_URL}/equipment-borrows`, fetcher);
  const { data: members = [] } = useSWR(`${API_BASE_URL}/members`, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  
  const [selectedEquip, setSelectedEquip] = useState(null);
  
  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [borrowForm, setBorrowForm] = useState({
    mssv: '',
    qty: 1,
    expectedReturnDate: '', // Not used for consumables, but required by modal state
    initialCondition: 'Mới',
    borrowNotes: ''
  });
  
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [suggestedMembers, setSuggestedMembers] = useState([]);

  // Filter only components
  const componentsList = useMemo(() => {
    return equipmentList.filter(item => 
      item.assetType && (item.assetType.toLowerCase().includes('linh kiện') || item.assetType.toLowerCase().includes('vật tư'))
    );
  }, [equipmentList]);

  const availableCategories = useMemo(() => {
    const uniqueCats = new Set(componentsList.map(eq => eq.category).filter(Boolean));
    return Array.from(uniqueCats).sort();
  }, [componentsList]);

  // Search filter
  const filteredComponents = useMemo(() => {
    return componentsList.filter(item => {
      const matchText = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'Tất cả' || item.category === selectedCategory;
      return matchText && matchCat;
    });
  }, [componentsList, searchTerm, selectedCategory]);

  // Sortable Table
  const {
    items: sortedComponents,
    requestSort,
    sortConfig,
    getSortIcon
  } = useSortableTable(filteredComponents, 'name', 'asc');

  // Handlers
  const handleEditClick = (item) => {
    setSelectedEquip(item);
    setShowEditModal(true);
  };

  const handleDeleteEquip = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa linh kiện "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Đã xóa linh kiện "${name}"`);
        mutateEquip();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Lỗi khi xóa linh kiện');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ');
    }
  };

  const handleBorrowClick = (equip) => {
    setSelectedEquip(equip);
    setBorrowForm({
      mssv: '',
      qty: 1,
      expectedReturnDate: '', 
      initialCondition: 'Tốt',
      borrowNotes: 'Xuất dùng dự án'
    });
    setMemberSearchQuery('');
    setSuggestedMembers([]);
    setShowBorrowModal(true);
  };

  const handleMemberSearch = (query) => {
    setMemberSearchQuery(query);
    if (!query.trim()) {
      setSuggestedMembers([]);
      return;
    }
    const lowerQ = query.toLowerCase();
    const suggestions = members.filter(m => 
      m.mssv.includes(lowerQ) || m.name.toLowerCase().includes(lowerQ)
    ).slice(0, 5);
    setSuggestedMembers(suggestions);
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    const rawMssv = borrowForm.mssv || memberSearchQuery || '';
    const cleanMssv = rawMssv.includes('–') ? rawMssv.split('–')[0].trim() : (rawMssv.includes('-') ? rawMssv.split('-')[0].trim() : rawMssv.trim());
    if (!cleanMssv || Number(borrowForm.qty) <= 0) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và số lượng');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/${selectedEquip.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...borrowForm,
          mssv: cleanMssv
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Đã xuất kho ${borrowForm.qty} ${selectedEquip.name}`);
        setShowBorrowModal(false);
        mutateEquip();
        mutateBorrows();
      } else {
        setErrorMsg(data.error || 'Lỗi khi xuất kho');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối khi xuất kho');
    }
  };

  // Helper functions
  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getStatusBadge = (equip) => {
    const max = equip.maxQty || equip.totalQty || 1;
    const pct = Math.round((equip.totalQty / max) * 100);

    if (equip.totalQty === 0) {
      return <span className="badge badge-danger">Hết hàng</span>;
    }
    if (pct <= 20) {
      return <span className="badge badge-danger" title={`Tồn kho dưới 20% (${pct}%) - Có ${equip.totalQty}/${max} chiếc`}>Cần nhập thêm</span>;
    }
    if (pct <= 50) {
      return <span className="badge badge-warning" title={`Tồn kho dưới 50% (${pct}%) - Có ${equip.totalQty}/${max} chiếc`}>Sắp hết</span>;
    }
    return <span className="badge badge-success" title={`Tồn kho an toàn (${pct}%) - Có ${equip.totalQty}/${max} chiếc`}>Đầy đủ</span>;
  };

  const componentsColumns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'Mã LK',
      width: '15%',
      sortable: true,
      align: 'left',
      cell: (row) => {
        const minThreshold = row.minThreshold || 0;
        const isOutOfStock = row.totalQty <= 0;
        const isLowStock = row.totalQty <= minThreshold && row.totalQty > 0;
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
      header: 'Tên linh kiện / Vị trí',
      width: '42%',
      sortable: true,
      align: 'left',
      cell: (row) => (
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35 }}>{row.name}</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>{row.category || 'Khác'}</span>
            {row.location && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>Vị trí: <strong>{row.location}</strong></span>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'totalQty',
      header: 'Tồn kho',
      width: '18%',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const minThreshold = row.minThreshold || 0;
        const isOutOfStock = row.totalQty <= 0;
        const isLowStock = row.totalQty <= minThreshold && row.totalQty > 0;
        const unit = row.unit || 'Cái';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ fontSize: '0.95rem' }}>
              <span style={{ color: isOutOfStock ? 'var(--accent-red)' : isLowStock ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                {row.totalQty}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.8rem', marginLeft: '0.25rem' }}>
                {unit}
              </span>
            </div>
            {isOutOfStock ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', background: 'rgba(239,68,68,0.12)', padding: '2px 5px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>Hết hàng</span>
            ) : isLowStock ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.12)', padding: '2px 5px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>Sắp hết</span>
            ) : null}
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
      cell: (row) => (
        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
          <Button 
            size="sm" 
            variant="primary"
            style={{ height: '32px' }}
            onClick={() => handleBorrowClick(row)}
            disabled={row.totalQty === 0}
          >
            Xuất kho
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            icon={Edit3} 
            title="Sửa thông tin"
            aria-label="Sửa linh kiện"
            onClick={() => handleEditClick(row)} 
          />
          <Button 
            size="sm" 
            variant="danger-ghost" 
            icon={Trash2} 
            title="Xóa linh kiện"
            aria-label="Xóa linh kiện"
            onClick={() => handleDeleteEquip(row.id, row.name)} 
          />
        </div>
      )
    }
  ], []);

  const componentFieldMap = [
    { excelHeader: 'Tên linh kiện', fieldKey: 'name', required: true, type: 'string' },
    { excelHeader: 'Mã linh kiện', fieldKey: 'code', required: true, type: 'string' },
    { excelHeader: 'Số lượng tồn', fieldKey: 'totalQty', required: true, type: 'number' },
    { excelHeader: 'Vị trí', fieldKey: 'location', required: false, type: 'string' },
    { excelHeader: 'Danh mục', fieldKey: 'category', required: false, type: 'string' },
    { excelHeader: 'Đơn vị tính', fieldKey: 'unit', required: false, type: 'string' },
    { excelHeader: 'Ngưỡng cảnh báo', fieldKey: 'minThreshold', required: false, type: 'number' },
  ];

  const componentSampleRow = {
    name: 'Điện trở 10k Ohm 1/4W',
    code: 'RES-10K',
    totalQty: 100,
    location: 'Khay linh kiện A1',
    category: 'Điện trở',
    unit: 'Con',
    minThreshold: 10
  };

  const handleImportComponents = async (rows) => {
    try {
      const res = await fetch(`${API_BASE_URL}/equipment/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows.map(r => ({ ...r, assetType: 'Linh kiện tiêu hao' })))
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-header">
              <Boxes className="text-blue-500" size={20} />
              Quản lý Linh kiện
            </h2>
            <p className="page-subtitle">Theo dõi danh sách và tình trạng linh kiện tiêu hao trong Lab</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
            <Button variant="secondary" icon={FileSpreadsheet} iconPosition="left" onClick={() => { setErrorMsg(''); setSuccessMsg(''); setShowImportModal(true); }}>Import Excel</Button>
            <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => setShowAddModal(true)}>Thêm linh kiện mới</Button>
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

      <Card
        title={`Danh sách linh kiện (${sortedComponents.length})`}
        icon={Boxes}
        style={{ color: 'var(--accent-purple)' }}
      >
        <DataTable
          data={sortedComponents}
          columns={componentsColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchKeys={['name', 'code', 'category', 'location']}
          toolbarActions={
            <div style={{ width: '280px', flexShrink: 0 }}>
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={['Tất cả', ...availableCategories].map(cat => ({
                  value: cat,
                  label: cat === 'Tất cả' ? 'Tất cả danh mục' : cat
                }))}
              />
            </div>
          }
        />
      </Card>

      {/* Modals */}
      <AddEquipmentModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        mutateEquip={mutateEquip}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
        defaultAssetType="Linh kiện tiêu hao"
      />
      
      <EditEquipmentModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        selectedEquip={selectedEquip}
        mutateEquip={mutateEquip}
        setSuccessMsg={setSuccessMsg}
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

      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportComponents}
        title="Import Linh kiện từ Excel"
        fieldMap={componentFieldMap}
        sampleRow={componentSampleRow}
      />
    </div>
  );
}
