import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X,
  Users
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';

export default function Members() {
  const { data: members = [], mutate } = useSWR(`${API_BASE_URL}/members`, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [newMember, setNewMember] = useState({ mssv: '', name: '', role: 'Thành viên' });
  const [editingMember, setEditingMember] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.mssv.trim() || !newMember.name.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và Họ tên');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Đã xảy ra lỗi khi thêm thành viên');
      } else {
        setSuccessMsg(`Thêm thành viên ${newMember.name} thành công`);
        setNewMember({ mssv: '', name: '', role: 'Thành viên' });
        setShowAddModal(false);
        mutate();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember.name.trim()) {
      setErrorMsg('Tên thành viên không được để trống');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMember.name,
          role: editingMember.role
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Đã xảy ra lỗi');
      } else {
        setSuccessMsg('Cập nhật thông tin thành công');
        setShowEditModal(false);
        mutate();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };



  const handleDeleteMember = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên ${name} khỏi phòng Lab?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg(`Đã xóa thành viên ${name}`);
        mutate();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Không thể xóa thành viên');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  // Lọc thành viên theo thanh tìm kiếm
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.mssv.includes(searchTerm) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );



  // Reset messages after 5 seconds
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

  // Tách danh sách thành 2 nhóm
  const managers = filteredMembers.filter(m => !['Thành viên', 'Cộng tác viên'].includes(m.role));
  const students = filteredMembers.filter(m => ['Thành viên', 'Cộng tác viên'].includes(m.role));
  const [activeTab, setActiveTab] = useState('managers');

  const membersColumns = React.useMemo(() => [
    { 
      accessorKey: 'mssv', 
      header: activeTab === 'managers' ? 'Mã số' : 'MSSV', 
      width: '18%',
      sortable: true, 
      cell: (row) => (
        <span style={{ fontWeight: '700', color: 'var(--accent-purple)', fontVariantNumeric: 'tabular-nums' }}>
          {row.mssv}
        </span>
      ) 
    },
    { 
      accessorKey: 'name', 
      header: 'Họ và Tên', 
      width: '32%',
      sortable: true, 
      cell: (row) => (
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
          {row.name}
        </span>
      ) 
    },
    { 
      accessorKey: 'role', 
      header: 'Chức vụ', 
      width: '24%',
      sortable: true, 
      cell: (row) => {
        const isManager = !['Thành viên', 'Cộng tác viên'].includes(row.role);
        return (
          <span 
            className={`badge ${isManager ? 'badge-warning' : 'badge-info'}`} 
            style={isManager ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: '600' } : { fontWeight: '500' }}
          >
            {row.role}
          </span>
        );
      }
    },
    { 
      accessorKey: 'active', 
      header: 'Trạng thái', 
      width: '16%',
      sortable: true, 
      cell: (row) => (
        row.active ? (
          <span className="badge badge-success" style={{ fontWeight: '600' }}>
            🟢 Đang trực Lab
          </span>
        ) : (
          <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' }}>
            ⚪ Vắng mặt
          </span>
        )
      )
    },
    { 
      accessorKey: 'actions', 
      header: 'Thao tác', 
      width: '10%',
      align: 'right', 
      sortable: false, 
      cell: (row) => (
        <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button 
            variant="ghost" 
            size="sm"
            icon={Edit3}
            title="Sửa thông tin thành viên"
            aria-label="Sửa thành viên"
            onClick={() => {
              setEditingMember(row);
              setErrorMsg('');
              setShowEditModal(true);
            }}
          />
          <Button 
            variant="danger-ghost" 
            size="sm"
            icon={Trash2}
            title="Xóa thành viên khỏi Lab"
            aria-label="Xóa thành viên"
            onClick={() => handleDeleteMember(row.id, row.name)}
          />
        </div>
      )
    }
  ], [activeTab]);

  const addMemberFooter = (
    <>
      <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Hủy</Button>
      <Button type="submit" form="add-member-form" variant="primary">Thêm mới</Button>
    </>
  );

  const editMemberFooter = (
    <>
      <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Hủy</Button>
      <Button type="submit" form="edit-member-form" variant="primary">Lưu thay đổi</Button>
    </>
  );

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-header">
              <Users className="text-blue-500" size={20} />
              Quản lý thành viên
            </h2>
            <p className="page-subtitle">Quản lý hồ sơ thành viên và vai trò hoạt động trong CLB</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
            <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => { setErrorMsg(''); setSuccessMsg(''); setShowAddModal(true); }}>
              Thêm thành viên mới
            </Button>
          </div>
        </div>
      </div>

      {/* Thông báo nhanh */}
      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      {/* 2 Bảng danh sách */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          type="button"
          onClick={() => { setActiveTab('managers'); setSearchTerm(''); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'managers' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'managers' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Ban Quản Lý ({managers.length})
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'students' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'students' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Sinh viên / Thành viên ({students.length})
        </button>
      </div>

      <Card
        title={`${activeTab === 'managers' ? 'Danh sách Ban quản lý' : 'Danh sách Sinh viên & Thành viên'} (${activeTab === 'managers' ? managers.length : students.length})`}
        icon={Users}
        style={{ color: 'var(--accent-blue)' }}
      >
        <DataTable
          data={activeTab === 'managers' ? managers : students}
          columns={membersColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchPlaceholder="Tìm theo tên, MSSV hoặc chức vụ..."
        />
      </Card>

      {/* MODAL THÊM THÀNH VIÊN MỚI */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm thành viên mới"
        size="sm"
        footer={addMemberFooter}
      >
        <form id="add-member-form" onSubmit={handleAddMember}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Mã số / MSSV</label>
              <TextInput
                type="text"
                required
                placeholder="Ví dụ: 20220003"
                value={newMember.mssv}
                onChange={(e) => setNewMember({ ...newMember, mssv: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Họ và tên</label>
              <TextInput
                type="text"
                required
                placeholder="Ví dụ: Lê Văn C"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Chức vụ / Ban hoạt động</label>
              <Select
                value={newMember.role}
                onChange={(val) => setNewMember({ ...newMember, role: val })}
                options={[
                  { value: "Chủ nhiệm", label: "Chủ nhiệm" },
                  { value: "Phó chủ nhiệm", label: "Phó chủ nhiệm" },
                  { value: "Trưởng ban Kỹ thuật", label: "Trưởng ban Kỹ thuật" },
                  { value: "Trưởng ban Truyền thông", label: "Trưởng ban Truyền thông" },
                  { value: "Thành viên", label: "Thành viên" },
                  { value: "Cộng tác viên", label: "Cộng tác viên" }
                ]}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL SỬA THÔNG TIN THÀNH VIÊN */}
      <Modal
        isOpen={showEditModal && !!editingMember}
        onClose={() => setShowEditModal(false)}
        title="Sửa thông tin thành viên"
        size="sm"
        footer={editMemberFooter}
      >
        {editingMember && (
          <form id="edit-member-form" onSubmit={handleEditMember}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mã số / MSSV (Không thể sửa)</label>
                <TextInput type="text" disabled value={editingMember.mssv} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Họ và tên</label>
                <TextInput
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Chức vụ / Ban hoạt động</label>
                <Select
                  value={editingMember.role}
                  onChange={(val) => setEditingMember({ ...editingMember, role: val })}
                  options={[
                    { value: "Chủ nhiệm", label: "Chủ nhiệm" },
                    { value: "Phó chủ nhiệm", label: "Phó chủ nhiệm" },
                    { value: "Trưởng ban Kỹ thuật", label: "Trưởng ban Kỹ thuật" },
                    { value: "Trưởng ban Truyền thông", label: "Trưởng ban Truyền thông" },
                    { value: "Thành viên", label: "Thành viên" },
                    { value: "Cộng tác viên", label: "Cộng tác viên" }
                  ]}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
