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
  UserCheck,
  TrendingUp,
  TrendingDown,
  History,
  FileCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from '../components/Button';
import Select from '../components/Select';
import DataTable from '../components/DataTable';
import Card from '../components/Card';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

// 13 Quy tắc hành vi cộng / trừ điểm chuẩn hóa theo quy định phòng Lab
const POINT_RULE_TEMPLATES = [
  // CỘNG ĐIỂM (KHUYẾN KHÍCH)
  { label: '➕ [Thưởng] Check-in / Check-out ca trực đúng giờ (+3đ)', amount: 3, type: 'reward', key: 'checkin_ontime', desc: 'Quét QR code hệ thống / Điểm danh tự động' },
  { label: '➕ [Thưởng] Trả thiết bị đúng hạn, sạch sẽ, nguyên vẹn (+2đ)', amount: 2, type: 'reward', key: 'return_ontime', desc: 'Hệ thống tự động cộng khi đóng đơn mượn' },
  { label: '➕ [Thưởng] Phát hiện & báo cáo sớm lỗi thiết bị tiềm ẩn (+3đ)', amount: 3, type: 'reward', key: 'report_early_bug', desc: 'Báo cáo lỗi trước khi thiết bị hỏng nặng' },
  { label: '➕ [Thưởng] Hỗ trợ kỹ thuật / Sửa chữa thiết bị hư hỏng (+10đ)', amount: 10, type: 'reward', key: 'tech_support', desc: 'Admin duyệt kèm mô tả công việc' },
  { label: '➕ [Thưởng] Tham gia tổng vệ sinh phòng Lab định kỳ (+5đ)', amount: 5, type: 'reward', key: 'lab_cleanup', desc: 'Điểm danh danh sách tham gia của Ban chủ nhiệm' },
  { label: '➕ [Thưởng] Đóng góp tài liệu, code hướng dẫn, tool cho Lab (+10đ)', amount: 10, type: 'reward', key: 'doc_tool_contribution', desc: 'Admin kiểm duyệt tài nguyên và duyệt điểm' },
  
  // TRỪ ĐIỂM (XỬ LÝ VI PHẠM)
  { label: '➖ [Phạt] Trả thiết bị trễ hạn (-5đ/ngày)', amount: -5, type: 'penalty', key: 'late_return', desc: 'Cron job tự động quét hệ thống lúc 00:00' },
  { label: '➖ [Phạt] Trả thiết bị bẩn, thiếu phụ kiện nhỏ (cáp, ốc) (-10đ)', amount: -10, type: 'penalty', key: 'dirty_missing_accessories', desc: 'Admin ghi nhận biên bản khi nhận lại đồ' },
  { label: '➖ [Phạt] Bỏ ca trực Lab không báo trước (No-show) (-15đ)', amount: -15, type: 'penalty', key: 'noshow_shift', desc: 'Trưởng ban trực đánh dấu vắng không phép' },
  { label: '➖ [Phạt] Cho người khác mượn ké tài khoản / mượn ké đồ (-20đ)', amount: -20, type: 'penalty', key: 'share_account', desc: 'Vi phạm bảo mật tài khoản mượn trả' },
  { label: '➖ [Phạt] Sử dụng thiết bị sai mục đích / sai quy định Lab (-20đ)', amount: -20, type: 'penalty', key: 'misuse_equipment', desc: 'Biên bản nhắc nhở từ Ban quản trị' },
  { label: '➖ [Phạt] Mang thiết bị ra khỏi Lab trái phép (-30đ)', amount: -30, type: 'penalty', key: 'unauthorized_removal', desc: 'Phạt nặng + Khóa tài khoản tạm thời' },
  { label: '➖ [Phạt] Làm hỏng / mất thiết bị do lỗi chủ quan (-40đ)', amount: -40, type: 'penalty', key: 'damage_loss', desc: 'Trừ điểm nặng + Yêu cầu đền bù vật chất' },
  { label: '⚙️ [Tùy chỉnh] Nhập lý do và số điểm khác...', amount: 0, type: 'custom', key: 'custom_adjust', desc: 'Nhập số điểm tự do' }
];

export default function Members() {
  const { data: members = [], mutate } = useSWR(`${API_BASE_URL}/members`, fetcher);
  const { data: transactions = [], mutate: mutateTx } = useSWR(`${API_BASE_URL}/point-transactions`, fetcher);
  const { data: bountyTasks = [], mutate: mutateBounty } = useSWR(`${API_BASE_URL}/bounty-tasks`, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Điểm tín nhiệm states
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointTargetMember, setPointTargetMember] = useState(null);
  const [selectedPointRule, setSelectedPointRule] = useState('checkin_ontime');
  const [customPointAmount, setCustomPointAmount] = useState(3);
  const [pointReason, setPointReason] = useState('Check-in / Check-out ca trực đúng giờ');
  const [pointEvidence, setPointEvidence] = useState('');
  const [isSubmittingPoint, setIsSubmittingPoint] = useState(false);

  // Lịch sử điểm states
  const [showTxModal, setShowTxModal] = useState(false);
  const [txFilterMember, setTxFilterMember] = useState(null);

  // Nhiệm vụ phục hồi states
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [newBounty, setNewBounty] = useState({ title: '', description: '', points: 15, taskType: 'makeup_shift' });

  // Dọn dẹp học kỳ states
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  
  // Form states
  const [newMember, setNewMember] = useState({ 
    mssv: '', 
    name: '', 
    email: '', 
    role: 'Sinh viên',
    points: 100 
  });
  
  const [editingMember, setEditingMember] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper phân biệt Ban quản lý / Giảng viên vs Sinh viên thành viên
  const isManagerRole = (role = '') => {
    const r = (role || '').toLowerCase();
    return r.includes('chủ nhiệm') || r.includes('trưởng ban') || r.includes('quản lý kho') || r.includes('quản trị') || r.includes('admin') || r.includes('giảng viên') || r.includes('cán bộ');
  };

  // Helper tính mức độ điểm tín nhiệm
  const getReputationTier = (points = 0) => {
    const pts = Number(points) || 0;
    if (pts < 80) return { label: 'Bị khóa mượn (<80đ)', class: 'badge-danger', color: 'var(--accent-red)', locked: true };
    if (pts > 150) return { label: 'Cấp 3 (>150đ)', class: 'badge-purple', color: 'var(--accent-purple)', locked: false };
    if (pts >= 101) return { label: 'Cấp 2 (101-150đ)', class: 'badge-info', color: 'var(--accent-blue)', locked: false };
    return { label: 'Cấp 1 (80-100đ)', class: 'badge-success', color: 'var(--accent-green)', locked: false };
  };

  // Lọc thành viên theo thanh tìm kiếm & vai trò
  const filteredMembers = members.filter(m => {
    const matchSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.mssv || '').includes(searchTerm) ||
      (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.role || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (roleFilter === 'all') return true;
    if (roleFilter === 'managers') return isManagerRole(m.role);
    if (roleFilter === 'ctv') return (m.role || '').includes('Cộng tác viên');
    if (roleFilter === 'core') return (m.role || '').includes('nghiên cứu') || (m.role || '').includes('CLB');
    if (roleFilter === 'students') return (m.role || '') === 'Sinh viên';
    return true;
  });

  // Tách danh sách thành 2 nhóm Tab
  const managers = filteredMembers.filter(m => isManagerRole(m.role));
  const students = filteredMembers.filter(m => !isManagerRole(m.role));
  const [activeTab, setActiveTab] = useState('students');

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = students.length;
    const activeCount = students.filter(m => m.active).length;
    const lockedCount = students.filter(m => (Number(m.points) || 0) < 80).length;
    const ctvCount = students.filter(m => (m.role || '').includes('Cộng tác viên')).length;
    const totalPoints = students.reduce((sum, m) => sum + (Number(m.points) || 0), 0);
    const avgPoints = total > 0 ? Math.round(totalPoints / total) : 0;
    return { total, activeCount, lockedCount, ctvCount, avgPoints };
  }, [students]);

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

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.mssv.trim() || !newMember.name.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ MSSV và Họ tên');
      return;
    }

    const payload = {
      ...newMember,
      email: newMember.email.trim() || `${newMember.mssv.trim().toLowerCase()}@lhu.edu.vn`,
      points: Number(newMember.points) || 100
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
        setSuccessMsg(`Thêm thành viên ${newMember.name} thành công (Cấp 100đ khởi tạo)`);
        setNewMember({ mssv: '', name: '', email: '', role: 'Sinh viên', points: 100 });
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

  // Mở modal điều chỉnh điểm tín nhiệm
  const handleOpenPointModal = (member) => {
    setPointTargetMember(member);
    setSelectedPointRule('checkin_ontime');
    const defaultRule = POINT_RULE_TEMPLATES[0];
    setCustomPointAmount(defaultRule.amount);
    setPointReason(defaultRule.label.replace(/^.*?\]\s*/, ''));
    setPointEvidence('');
    setShowPointModal(true);
  };

  const handleRuleChange = (ruleKey) => {
    setSelectedPointRule(ruleKey);
    const rule = POINT_RULE_TEMPLATES.find(r => r.key === ruleKey);
    if (rule) {
      setCustomPointAmount(rule.amount);
      if (rule.key !== 'custom_adjust') {
        setPointReason(rule.label.replace(/^.*?\]\s*/, ''));
      }
    }
  };

  const handleSubmitPointAdjust = async (e) => {
    e.preventDefault();
    if (!pointTargetMember) return;
    if (!pointReason.trim()) {
      setErrorMsg('Bắt buộc phải nhập lý do điều chỉnh điểm để lưu Transaction Log đối soát');
      return;
    }

    setIsSubmittingPoint(true);
    try {
      const res = await fetch(`${API_BASE_URL}/members/${pointTargetMember.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(customPointAmount),
          reason: pointReason.trim(),
          evidence: pointEvidence.trim(),
          actionKey: selectedPointRule
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể điều chỉnh điểm');
      } else {
        setSuccessMsg(`Đã cập nhật điểm cho ${pointTargetMember.name} (Hiện tại: ${data.member.points}đ)`);
        setShowPointModal(false);
        mutate();
        mutateTx();
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối tới server');
    } finally {
      setIsSubmittingPoint(false);
    }
  };

  // Xử lý dọn dẹp học kỳ
  const handleExecuteCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/members/cleanup-guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Đã dọn dẹp danh sách sinh viên vãng lai');
        setShowCleanupModal(false);
        mutate();
      } else {
        setErrorMsg(data.error || 'Lỗi khi dọn dẹp');
      }
    } catch (e) {
      setErrorMsg('Lỗi kết nối tới server');
    } finally {
      setIsCleaning(false);
    }
  };

  const membersColumns = useMemo(() => {
    const cols = [
      { 
        accessorKey: 'mssv', 
        header: activeTab === 'managers' ? 'Mã cán bộ / MSSV' : 'MSSV', 
        width: '14%',
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
        width: activeTab === 'managers' ? '28%' : '22%',
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
        header: activeTab === 'managers' ? 'Chức vụ quản trị' : 'Vai trò & Cấp độ', 
        width: activeTab === 'managers' ? '24%' : '20%',
        sortable: true, 
        cell: (row) => {
          const role = row.role || 'Sinh viên';
          let badgeStyle = { fontWeight: '500' };
          let badgeClass = 'badge-info';
          let roleIcon = '🎓';

          if (role.includes('Chủ nhiệm')) {
            badgeClass = 'badge-warning';
            badgeStyle = { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: '600' };
            roleIcon = '👑';
          } else if (role.includes('Trưởng ban kỹ thuật')) {
            badgeClass = 'badge-purple';
            badgeStyle = { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: '600' };
            roleIcon = '🛠️';
          } else if (role.includes('Quản lý kho')) {
            badgeClass = 'badge-success';
            badgeStyle = { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '600' };
            roleIcon = '📦';
          } else if (role.includes('Cộng tác viên')) {
            badgeClass = 'badge-purple';
            badgeStyle = { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: '600' };
            roleIcon = '🌟';
          } else if (role.includes('nghiên cứu')) {
            badgeClass = 'badge-info';
            badgeStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontWeight: '600' };
            roleIcon = '🔬';
          } else {
            badgeClass = 'badge-secondary';
            badgeStyle = { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontWeight: '500' };
            roleIcon = '🎓';
          }
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span className={`badge ${badgeClass}`} style={badgeStyle}>
                {roleIcon} {role}
              </span>
            </div>
          );
        }
      }
    ];

    // Chỉ hiển thị Điểm tín nhiệm & Cấp độ cho tab Sinh viên
    if (activeTab === 'students') {
      cols.push({ 
        accessorKey: 'points', 
        header: 'Điểm tín nhiệm & Cấp mượn', 
        width: '24%',
        sortable: true, 
        cell: (row) => {
          const pts = Number(row.points !== undefined ? row.points : 100);
          const tier = getReputationTier(pts);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: tier.color, fontVariantNumeric: 'tabular-nums' }}>
                  {pts} đ
                </span>
                <span className={`badge ${tier.class}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                  {tier.label}
                </span>
              </div>
              {tier.locked && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: '600' }}>
                  ⚠️ Cần làm nhiệm vụ phục hồi điểm để mở khóa
                </span>
              )}
            </div>
          );
        }
      });
    }

    cols.push(
      { 
        accessorKey: 'active', 
        header: 'Trạng thái', 
        width: '12%',
        sortable: true, 
        cell: (row) => (
          row.active ? (
            <span className="badge badge-success" style={{ fontWeight: '600' }}>
              🟢 Đang trực
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
        width: activeTab === 'students' ? '18%' : '14%',
        align: 'right', 
        sortable: false, 
        cell: (row) => (
          <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '0.5rem' }}>
            {activeTab === 'students' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  icon={Award}
                  title="Cộng / Trừ điểm tín nhiệm (Có Transaction Log)"
                  aria-label="Điều chỉnh điểm"
                  onClick={() => handleOpenPointModal(row)}
                  style={{ color: 'var(--accent-amber)' }}
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  icon={History}
                  title="Xem lịch sử biến động điểm"
                  aria-label="Lịch sử điểm"
                  onClick={() => {
                    setTxFilterMember(row);
                    setShowTxModal(true);
                  }}
                  style={{ color: 'var(--accent-blue)' }}
                />
              </>
            )}
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
                  points: row.points !== undefined ? row.points : 100
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

  return (
    <div className="page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER & ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={28} color="var(--accent-blue)" />
            Quản Lý Thành Viên &amp; Điểm Tín Nhiệm CLB
          </h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Hệ thống phân cấp vai trò 3 bậc, điểm tín nhiệm (Reputation Score), phân quyền mượn thiết bị và kiểm toán minh bạch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button 
            variant="secondary" 
            icon={History} 
            onClick={() => { setTxFilterMember(null); setShowTxModal(true); }}
          >
            Nhật ký điểm ({transactions.length})
          </Button>

          <Button 
            variant="secondary" 
            icon={Sparkles} 
            onClick={() => setShowBountyModal(true)}
            style={{ color: 'var(--accent-purple)', borderColor: 'rgba(139, 92, 246, 0.4)' }}
          >
            Nhiệm vụ phục hồi ({bountyTasks.filter(t => t.status === 'open').length})
          </Button>

          <Button 
            variant="secondary" 
            icon={RefreshCw} 
            onClick={() => setShowCleanupModal(true)}
            title="Tự động dọn dẹp sinh viên vãng lai sau 1 học kỳ (120 ngày)"
          >
            Dọn dẹp học kỳ
          </Button>

          <Button 
            variant="primary" 
            icon={Plus} 
            onClick={() => { setErrorMsg(''); setShowAddModal(true); }}
          >
            Thêm thành viên
          </Button>
        </div>
      </div>

      {/* THẺ THỐNG KÊ NHANH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Tổng Sinh viên &amp; CTV</span>
            <Users size={20} color="var(--accent-blue)" />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Gồm {stats.ctvCount} Cộng tác viên ưu tiên
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Đang trực Lab thực tế</span>
            <CheckCircle2 size={20} color="var(--accent-green)" />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-green)' }}>
            {stats.activeCount}
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Check-in thời gian thực
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Điểm tín nhiệm TB</span>
            <Award size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
            {stats.avgPoints} đ
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Điểm khởi tạo chuẩn: 100 đ
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Bị khóa quyền mượn (&lt;80đ)</span>
            <ShieldAlert size={20} color="var(--accent-red)" />
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '1.75rem', fontWeight: '800', color: stats.lockedCount > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
            {stats.lockedCount}
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {stats.lockedCount > 0 ? 'Cần làm Bounty Task phục hồi' : 'Tất cả tài khoản đều hợp lệ'}
          </div>
        </div>
      </div>

      {/* THÔNG BÁO */}
      {successMsg && <div className="alert-message alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert-message alert-error">{errorMsg}</div>}

      {/* TABS & BỘ LỌC VAI TRÒ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button"
            onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
            style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'students' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'students' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
          >
            Sinh viên, CTV &amp; Thành viên ({students.length})
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('managers'); setSearchTerm(''); }}
            style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: activeTab === 'managers' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activeTab === 'managers' ? '2px solid var(--accent-blue)' : '2px solid transparent', transition: 'all 0.2s' }}
          >
            Ban Quản Lý &amp; Giảng viên ({managers.length})
          </button>
        </div>

        {/* Dropdown Lọc Vai Trò Phân Cấp */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phân cấp:</span>
            <Select
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              options={[
                { value: 'all', label: 'Tất cả vai trò' },
                { value: 'ctv', label: '🌟 Cộng tác viên (Cấp độ trên Sinh viên)' },
                { value: 'core', label: '🔬 Thành viên nghiên cứu / Nòng cốt' },
                { value: 'students', label: '🎓 Sinh viên thông thường' }
              ]}
              style={{ width: '260px' }}
            />
          </div>
        )}
      </div>

      {/* BẢNG DỮ LIỆU */}
      <Card
        title={`${activeTab === 'students' ? 'Danh sách Sinh viên, Cộng tác viên & Thành viên CLB' : 'Danh sách Ban quản lý & Giảng viên phụ trách'} (${activeTab === 'students' ? students.length : managers.length})`}
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

      {/* MODAL ĐIỀU CHỈNH ĐIỂM TÍN NHIỆM (TRANSACTION LOG + MINH CHỨNG) */}
      <Modal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        title={`Điều chỉnh Điểm Tín Nhiệm: ${pointTargetMember?.name} (${pointTargetMember?.mssv})`}
        size="md"
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => setShowPointModal(false)}>Hủy</Button>
            <Button type="submit" form="adjust-point-form" variant="primary" loading={isSubmittingPoint}>
              Xác nhận ghi nhận điểm
            </Button>
          </>
        )}
      >
        {pointTargetMember && (
          <form id="adjust-point-form" onSubmit={handleSubmitPointAdjust}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Điểm hiện tại:</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                    {pointTargetMember.points !== undefined ? pointTargetMember.points : 100} đ
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sau điều chỉnh:</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: Number(customPointAmount) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {Math.max(0, (pointTargetMember.points !== undefined ? pointTargetMember.points : 100) + Number(customPointAmount))} đ
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Quy tắc hành vi chuẩn hóa (Theo quy chế phòng Lab) *</label>
                <Select
                  value={selectedPointRule}
                  onChange={handleRuleChange}
                  options={POINT_RULE_TEMPLATES.map(r => ({ value: r.key, label: r.label }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Số điểm (+ hoặc -) *</label>
                  <TextInput
                    type="number"
                    required
                    value={customPointAmount}
                    onChange={(e) => setCustomPointAmount(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Trần tuần: tối đa +20đ, sàn điểm: 0đ
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Lý do điều chỉnh (Bắt buộc minh bạch) *</label>
                  <TextInput
                    type="text"
                    required
                    placeholder="Nhập lý do chi tiết..."
                    value={pointReason}
                    onChange={(e) => setPointReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Minh chứng đính kèm (Link ảnh thiết bị hỏng, log quá hạn, số biên bản...)</label>
                <TextInput
                  type="text"
                  placeholder="Ví dụ: BB-2026-004 hoặc Link ảnh / Log hệ thống..."
                  value={pointEvidence}
                  onChange={(e) => setPointEvidence(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Minh chứng giúp thành viên đối soát minh bạch, tránh lạm quyền Admin.
                </span>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL LỊCH SỬ BIẾN ĐỘNG ĐIỂM (TRANSACTION LOG) */}
      <Modal
        isOpen={showTxModal}
        onClose={() => setShowTxModal(false)}
        title={txFilterMember ? `Nhật ký điểm: ${txFilterMember.name} (${txFilterMember.mssv})` : `Nhật ký Điểm Tín Nhiệm Toàn Hệ Thống (${transactions.length})`}
        size="lg"
        footer={<Button variant="ghost" onClick={() => setShowTxModal(false)}>Đóng</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
          {transactions.filter(t => !txFilterMember || t.mssv === txFilterMember.mssv).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Chưa có lịch sử biến động điểm nào được ghi nhận.
            </div>
          ) : (
            transactions.filter(t => !txFilterMember || t.mssv === txFilterMember.mssv).map((tx, idx) => (
              <div 
                key={tx.id || idx}
                style={{ 
                  padding: '0.85rem 1rem', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--surface-color)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: tx.amount >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: tx.amount >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    {tx.amount >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{tx.reason}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({tx.userName} - {tx.mssv})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Thực hiện bởi: <strong>{tx.createdByName || 'Hệ thống'}</strong> • {new Date(tx.timestamp).toLocaleString('vi-VN')}
                      {tx.evidence && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--accent-blue)' }}>
                          • Minh chứng: {tx.evidence}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontWeight: '800', 
                    fontSize: '1.1rem', 
                    color: tx.amount >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}>
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} đ
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Số dư: {tx.balanceAfter !== undefined ? `${tx.balanceAfter} đ` : '—'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* MODAL NHIỆM VỤ PHỤC HỒI (BOUNTY TASKS) */}
      <Modal
        isOpen={showBountyModal}
        onClose={() => setShowBountyModal(false)}
        title="Danh Sách Nhiệm Vụ Phục Hồi Điểm Tín Nhiệm (Bounty Tasks)"
        size="lg"
        footer={<Button variant="ghost" onClick={() => setShowBountyModal(false)}>Đóng</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            💡 <strong>Cơ chế phục hồi điểm:</strong> Thành viên có điểm dưới 80 bị khóa quyền mượn đồ có thể nhận các nhiệm vụ (trực bù, dọn dẹp kho, viết tài liệu) để tích lũy điểm vượt mốc 80 mở lại quyền mượn.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bountyTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                Chưa có nhiệm vụ phục hồi nào. Admin có thể tạo thêm nhiệm vụ mới.
              </div>
            ) : (
              bountyTasks.map(task => (
                <div 
                  key={task.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{task.title}</span>
                      <span className={`badge ${task.status === 'open' ? 'badge-success' : task.status === 'claimed' ? 'badge-warning' : 'badge-info'}`}>
                        {task.status === 'open' ? '🟢 Đang mở' : task.status === 'claimed' ? `🟡 Đã nhận: ${task.claimedByName}` : '🔵 Đã hoàn thành'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {task.description || 'Không có mô tả chi tiết'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: '800', color: 'var(--accent-green)', fontSize: '1.15rem' }}>
                      +{task.points} đ
                    </div>
                    {task.status === 'claimed' && (
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={async () => {
                          const res = await fetch(`${API_BASE_URL}/bounty-tasks/${task.id}/complete`, { method: 'POST' });
                          if (res.ok) {
                            setSuccessMsg(`Đã duyệt hoàn thành nhiệm vụ và cộng +${task.points}đ cho ${task.claimedByName}`);
                            mutateBounty();
                            mutate();
                            mutateTx();
                          }
                        }}
                      >
                        Duyệt hoàn thành
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL DỌN DẸP HỌC KỲ */}
      <Modal
        isOpen={showCleanupModal}
        onClose={() => setShowCleanupModal(false)}
        title="Dọn Dẹp Danh Sách Sinh Viên Vãng Lai Theo Học Kỳ"
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setShowCleanupModal(false)}>Hủy</Button>
            <Button variant="danger" loading={isCleaning} onClick={handleExecuteCleanup}>
              Xác nhận dọn dẹp
            </Button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Hệ thống sẽ quét và dọn dẹp các tài khoản <strong>Sinh viên thông thường</strong> không thuộc CLB và không phải Cộng tác viên sau 1 học kỳ (mặc định 120 ngày không phát sinh mượn đồ).
          </p>
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
            ⚠️ <strong>Bảo vệ dữ liệu:</strong> Ban Quản Lý, Cộng tác viên và Thành viên nghiên cứu sẽ <strong>KHÔNG</strong> bao giờ bị tự động xóa.
          </div>
        </div>
      </Modal>

      {/* MODAL THÊM THÀNH VIÊN */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm thành viên mới vào CLB"
        size="md"
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button type="submit" form="add-member-form" variant="primary">Thêm mới</Button>
          </>
        )}
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
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Địa chỉ Email</label>
              <TextInput
                type="email"
                placeholder="Ví dụ: an.nv@lhu.edu.vn (Tự động tạo nếu để trống)"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: !isManagerRole(newMember.role) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Chức vụ &amp; Phân cấp trong CLB</label>
                <Select
                  value={newMember.role}
                  onChange={(val) => setNewMember({ ...newMember, role: val })}
                  options={[
                    { value: "Sinh viên", label: "🎓 Sinh viên thông thường" },
                    { value: "Cộng tác viên", label: "🌟 Cộng tác viên (Cấp độ trên Sinh viên)" },
                    { value: "Thành viên nghiên cứu", label: "🔬 Thành viên nghiên cứu CLB" },
                    { value: "Quản lý kho Lab", label: "📦 Quản lý kho Lab" },
                    { value: "Trưởng ban kỹ thuật", label: "🛠️ Trưởng ban kỹ thuật" },
                    { value: "Chủ nhiệm CLB", label: "👑 Chủ nhiệm CLB" }
                  ]}
                />
              </div>
              {!isManagerRole(newMember.role) && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Điểm tín nhiệm khởi tạo</label>
                  <TextInput
                    type="number"
                    min="0"
                    placeholder="100"
                    value={newMember.points}
                    onChange={(e) => setNewMember({ ...newMember, points: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mặc định chuẩn: 100 điểm</span>
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
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <Button type="submit" form="edit-member-form" variant="primary">Lưu thay đổi</Button>
          </>
        )}
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

              <div style={{ display: 'grid', gridTemplateColumns: !isManagerRole(editingMember.role) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Chức vụ / Vai trò</label>
                  <Select
                    value={editingMember.role}
                    onChange={(val) => setEditingMember({ ...editingMember, role: val })}
                    options={[
                      { value: "Sinh viên", label: "🎓 Sinh viên thông thường" },
                      { value: "Cộng tác viên", label: "🌟 Cộng tác viên (Cấp độ trên Sinh viên)" },
                      { value: "Thành viên nghiên cứu", label: "🔬 Thành viên nghiên cứu CLB" },
                      { value: "Quản lý kho Lab", label: "📦 Quản lý kho Lab" },
                      { value: "Trưởng ban kỹ thuật", label: "🛠️ Trưởng ban kỹ thuật" },
                      { value: "Chủ nhiệm CLB", label: "👑 Chủ nhiệm CLB" }
                    ]}
                  />
                </div>
                {!isManagerRole(editingMember.role) && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Điểm tín nhiệm</label>
                    <TextInput
                      type="number"
                      min="0"
                      value={editingMember.points}
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
        itemName={deletingMember?.name}
        itemType="thành viên"
        loading={isDeleting}
      />
    </div>
  );
}
