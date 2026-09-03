import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X,
  Users,
  Mail,
  Award,
  Clock,
  CheckCircle2,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function Members() {
  const { data: members = [], mutate } = useSWR(`${API_BASE_URL}/members`, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form states
  const [newMember, setNewMember] = useState({ 
    mssv: '', 
    name: '', 
    email: '', 
    role: 'Thành viên',
    points: 0 
  });
  
  const [editingMember, setEditingMember] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.mssv.trim() || !newMember.name.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và Họ tên');
      return;
    }

    const payload = {
      ...newMember,
      email: newMember.email.trim() || `${newMember.mssv.trim().toLowerCase()}@lhu.edu.vn`,
      points: Number(newMember.points) || 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Đã xảy ra lỗi khi thêm thành viên');
      } else {
        setSuccessMsg(`Thêm thành viên ${newMember.name} thành công`);
        setNewMember({ mssv: '', name: '', email: '', role: 'Thành viên', points: 0 });
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
          role: editingMember.role,
          email: editingMember.email,
          points: Number(editingMember.points) || 0
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Đã xảy ra lỗi');
      } else {
        setSuccessMsg('Cập nhật thông tin thành viên thành công');
        setShowEditModal(false);
        mutate();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    }
  };

  const handleDeleteMember = (member) => {
    setDeletingMember(member);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/members/${deletingMember.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg(`Đã xóa thành viên ${deletingMember.name}`);
        mutate();
        setShowDeleteModal(false);
        setDeletingMember(null);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Không thể xóa thành viên');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper tính mức độ chuyên cần hợp lý cho sinh viên CLB
  const getAttendanceTier = (points = 0) => {
    if (points >= 30) return { label: 'Rất tích cực', class: 'badge-success', color: 'var(--accent-green)' };
    if (points >= 15) return { label: 'Đạt chuẩn', class: 'badge-info', color: 'var(--accent-blue)' };
    return { label: 'Mới tham gia', class: 'badge-warning', color: 'var(--accent-amber)' };
  };

  // Lọc thành viên theo thanh tìm kiếm
  const filteredMembers = members.filter(m => 
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.mssv || '').includes(searchTerm) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tách danh sách thành 2 nhóm
  const managers = filteredMembers.filter(m => !['Thành viên', 'Cộng tác viên'].includes(m.role));
  const students = filteredMembers.filter(m => ['Thành viên', 'Cộng tác viên'].includes(m.role));
  const [activeTab, setActiveTab] = useState('students');

  // Thống kê nhanh (Chỉ tính riêng nhóm sinh viên theo yêu cầu)
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeCount = students.filter(m => m.active).length;
    const totalPoints = students.reduce((sum, m) => sum + (Number(m.points) || 0), 0);
    const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    return { total: totalStudents, activeCount, avgPoints };
  }, [students]);

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

  const membersColumns = useMemo(() => {
    const cols = [
      { 
        accessorKey: 'mssv', 
        header: activeTab === 'managers' ? 'Mã cán bộ' : 'MSSV', 
        width: '15%',
        sortable: true, 
        cell: (row) => (
          <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>
            {row.mssv}
          </span>
        ) 
      },
      { 
        accessorKey: 'name', 
        header: 'Họ và Tên', 
        width: activeTab === 'managers' ? '30%' : '24%',
        sortable: true, 
        cell: (row) => (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {row.name}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {row.email || `${row.mssv.toLowerCase()}@lhu.edu.vn`}
            </span>
          </div>
        ) 
      },
      { 
        accessorKey: 'role', 
        header: activeTab === 'managers' ? 'Chức vụ quản trị' : 'Vai trò', 
        width: activeTab === 'managers' ? '25%' : '18%',
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
      }
    ];

    // Chỉ hiển thị cột Điểm chuyên cần cho tab Sinh viên
    if (activeTab === 'students') {
      cols.push({ 
        accessorKey: 'points', 
        header: 'Điểm chuyên cần', 
        width: '18%',
        sortable: true, 
        cell: (row) => {
          const pts = Number(row.points) || 0;
          const tier = getAttendanceTier(pts);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: tier.color }}>
                {pts} đ
              </span>
              <span className={`badge ${tier.class}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                {tier.label}
              </span>
            </div>
          );
        }
      });
    }

    cols.push(
      { 
        accessorKey: 'active', 
        header: 'Trạng thái', 
        width: '15%',
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
        width: '12%',
        align: 'right', 
        sortable: false, 
        cell: (row) => (
          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '0.5rem' }}>
            <Button 
              variant="ghost" 
              size="sm"
              icon={Edit3}
              title="Sửa thông tin thành viên"
              aria-label="Sửa thành viên"
              onClick={() => {
                setEditingMember({
                  ...row,
                  email: row.email || `${row.mssv.toLowerCase()}@lhu.edu.vn`,
                  points: row.points || 0
                });
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
              onClick={() => handleDeleteMember(row)}
            />
          </div>
        )
      }
    );

    return cols;
  }, [activeTab]);

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users className="text-blue-500" size={24} />
              Quản lý thành viên &amp; Điểm chuyên cần
            </h2>
            <p className="page-subtitle">Quản lý hồ sơ, địa chỉ email, ca trực và điểm rèn luyện chuyên cần trong CLB</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginRight: '4.5rem' }}>
            <Button variant="primary" icon={Plus} iconPosition="left" onClick={() => { setErrorMsg(''); setSuccessMsg(''); setShowAddModal(true); }}>
              Thêm thành viên mới
            </Button>
          </div>
        </div>

        {/* 3 Thẻ thống kê nhanh */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng thành viên</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.total} sinh viên</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đang trực tại Lab</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-green)' }}>{stats.activeCount} người</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Điểm chuyên cần TB</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-amber)' }}>{stats.avgPoints} điểm/SV</div>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo nhanh */}
      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      {/* 2 Tabs danh sách */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          type="button"
          onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'students' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'students' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Sinh viên &amp; Thành viên ({students.length})
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('managers'); setSearchTerm(''); }}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'managers' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'managers' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
        >
          Ban Quản Lý &amp; Giảng viên ({managers.length})
        </button>
      </div>

      <Card
        title={`${activeTab === 'students' ? 'Danh sách Sinh viên & Thành viên CLB' : 'Danh sách Ban quản lý & Giảng viên'} (${activeTab === 'students' ? students.length : managers.length})`}
        icon={Users}
        style={{ color: 'var(--accent-blue)' }}
      >
        <DataTable
          data={activeTab === 'students' ? students : managers}
          columns={membersColumns}
          globalFilter={searchTerm}
          setGlobalFilter={setSearchTerm}
          searchPlaceholder="Tìm theo MSSV, Họ tên, Email hoặc Chức vụ..."
        />
      </Card>

      {/* MODAL THÊM THÀNH VIÊN MỚI */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm thành viên mới vào CLB"
        size="md"
        footer={addMemberFooter}
      >
        <form id="add-member-form" onSubmit={handleAddMember}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mã số sinh viên (MSSV) *</label>
                <TextInput
                  type="text"
                  required
                  placeholder="Ví dụ: 122000537"
                  value={newMember.mssv}
                  onChange={(e) => setNewMember({ ...newMember, mssv: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Họ và tên *</label>
                <TextInput
                  type="text"
                  required
                  placeholder="Ví dụ: Trịnh Vũ Tuấn Minh"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Địa chỉ Email</label>
              <TextInput
                type="email"
                placeholder="Ví dụ: tuanminh@lhu.edu.vn (Tự động tạo nếu để trống)"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: ['Thành viên', 'Cộng tác viên'].includes(newMember.role) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Chức vụ trong CLB</label>
                <Select
                  value={newMember.role}
                  onChange={(val) => setNewMember({ ...newMember, role: val })}
                  options={[
                    { value: "Thành viên", label: "Thành viên nghiên cứu" },
                    { value: "Cộng tác viên", label: "Cộng tác viên" },
                    { value: "Quản lý kho", label: "Quản lý kho Lab" },
                    { value: "Trưởng ban kỹ thuật", label: "Trưởng ban kỹ thuật" },
                    { value: "Chủ nhiệm", label: "Chủ nhiệm CLB" }
                  ]}
                />
              </div>
              {['Thành viên', 'Cộng tác viên'].includes(newMember.role) && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Điểm chuyên cần ban đầu</label>
                  <TextInput
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newMember.points}
                    onChange={(e) => setNewMember({ ...newMember, points: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL CHỈNH SỬA THÀNH VIÊN */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh sửa thông tin thành viên"
        size="md"
        footer={editMemberFooter}
      >
        {editingMember && (
          <form id="edit-member-form" onSubmit={handleEditMember}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>MSSV (Cố định)</label>
                  <TextInput
                    type="text"
                    disabled
                    value={editingMember.mssv}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Họ và tên *</label>
                  <TextInput
                    type="text"
                    required
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Địa chỉ Email</label>
                <TextInput
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: ['Thành viên', 'Cộng tác viên'].includes(editingMember.role) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Chức vụ / Vai trò</label>
                  <Select
                    value={editingMember.role}
                    onChange={(val) => setEditingMember({ ...editingMember, role: val })}
                    options={[
                      { value: "Thành viên", label: "Thành viên nghiên cứu" },
                      { value: "Cộng tác viên", label: "Cộng tác viên" },
                      { value: "Quản lý kho", label: "Quản lý kho Lab" },
                      { value: "Trưởng ban kỹ thuật", label: "Trưởng ban kỹ thuật" },
                      { value: "Chủ nhiệm", label: "Chủ nhiệm CLB" }
                    ]}
                  />
                </div>
                {['Thành viên', 'Cộng tác viên'].includes(editingMember.role) && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Điểm chuyên cần</label>
                    <TextInput
                      type="number"
                      min="0"
                      value={editingMember.points || 0}
                      onChange={(e) => setEditingMember({ ...editingMember, points: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDeleteMember}
        title="Xác nhận xóa thành viên"
        message={`Bạn có chắc chắn muốn xóa thành viên "${deletingMember?.name}" (MSSV: ${deletingMember?.mssv}) khỏi danh sách phòng Lab không? Thao tác này không thể hoàn tác.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
