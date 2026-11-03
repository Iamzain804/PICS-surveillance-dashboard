import React, { useState, useEffect, useRef } from 'react';
import {
  Users, MapPin, Search, ArrowLeft, Plus, Mail,
  X, Edit, Trash2, Building2, UserCheck, Activity, Shield, Upload, Camera, Layers, Loader2, ChevronRight, MoreVertical, Eye, EyeOff, CheckCircle, RotateCcw, Calendar
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import { API_BASE } from '../config';
import PageLoader from '../components/PageLoader';
import StaffAvatar from '../components/StaffAvatar';
import DateRangePicker from '../components/DateRangePicker';
import CustomDatePicker from '../components/CustomDatePicker';
import PageHeader from '../components/PageHeader';
import { hasPerm, hasAnyWritePerm } from '../utils/permissions';

const formatDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

export default function StaffPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const actionsMenuRef = useRef(null);

  // View state
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Cropper state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleOpenCropModal = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = () => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.src = rawImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const displayHeight = 250;
      const baseScale = displayHeight / (img.height || 250);
      const canvasScale = size / displayHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      ctx.translate(size / 2, size / 2);
      ctx.translate(offset.x * canvasScale, offset.y * canvasScale);
      ctx.scale(zoom, zoom);

      const drawW = img.width * baseScale * canvasScale;
      const drawH = img.height * baseScale * canvasScale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'cropped_avatar.jpg', { type: 'image/jpeg' });
          setPhotoFile(croppedFile);
        }
        setCropModalOpen(false);
      }, 'image/jpeg', 0.95);
    };
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all');

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [mediaVerificationModal, setMediaVerificationModal] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newStaff, setNewStaff] = useState({
    staff_id: '',
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    send_email_credentials: true,
    role: 'STAFF',
    branch_id: '',
    department_id: '',
    shift_start_time: '',
    shift_end_time: '',
    is_visitor: false,
    dob: '',
    gender: ''
  });

  const [roles, setRoles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const canOverrideShift = user?.is_super_admin || (user?.permissions || []).includes('update_staff');

  // Dynamic Role Options fetched from Roles & Permissions API
  const dynamicRoleOptions = React.useMemo(() => {
    const optionsMap = new Map();
    optionsMap.set('all', { value: 'all', label: 'Roles' });

    // Dynamic roles fetched from Roles & Permissions
    if (roles && roles.length > 0) {
      roles.forEach(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        if (roleName) {
          const val = roleName.toLowerCase();
          if (!optionsMap.has(val)) {
            optionsMap.set(val, { value: val, label: roleName });
          }
        }
      });
    }

    // Include roles present in active staff data
    if (staff && staff.length > 0) {
      staff.forEach(s => {
        if (s.role) {
          const val = s.role.toLowerCase();
          if (!optionsMap.has(val)) {
            const label = s.role.charAt(0).toUpperCase() + s.role.slice(1);
            optionsMap.set(val, { value: val, label });
          }
        }
      });
    }

    return Array.from(optionsMap.values());
  }, [roles, staff]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActiveActionsMenu(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleToggleStaffStatus = async (member) => {
    const newStatus = member.is_active === false ? true : false;
    try {
      const res = await fetch(`${API_BASE}/staff/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: newStatus
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update staff status.');
        return;
      }
      setActiveActionsMenu(null);
      setSuccess(`Staff member "${member.name}" marked as ${newStatus ? 'Active' : 'Inactive'} successfully!`);
      fetchStaff();
    } catch (err) {
      alert('Failed to connect to backend server.');
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
    fetchRoles();
    fetchDepartments();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/roles`);
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };


  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        setLoading(false);

        // Auto-select stored branch or default to first branch
        const savedId = sessionStorage.getItem('epic_staff_selected_branch');
        if (savedId) {
          const match = data.find(b => String(b.id) === String(savedId));
          if (match) setSelectedBranch(match);
          else if (data.length > 0) setSelectedBranch(data[0]);
        } else if (data.length > 0) {
          setSelectedBranch(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/staff`);
      if (!res.ok) throw new Error('Failed to fetch staff');
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // ── Helper to handle department change (manual shift selection required) ──
  const handleDeptChangeNewStaff = (deptId) => {
    setNewStaff(prev => ({
      ...prev,
      department_id: deptId,
      selected_shift_id: '',
      shift_start_time: '',
      shift_end_time: ''
    }));
  };

  const handleDeptChangeEditStaff = (deptId) => {
    setEditingStaff(prev => ({
      ...prev,
      department_id: deptId,
      selected_shift_id: '',
      shift_start_time: '',
      shift_end_time: ''
    }));
  };
  const generateNextStaffId = () => {
    if (!staff || staff.length === 0) {
      return 'STF-001';
    }
    const numericIds = staff
      .map(s => {
        const match = (s.staff_id || '').match(/STF-(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => n !== null);

    if (numericIds.length === 0) {
      const rawNumbers = staff
        .map(s => {
          const num = parseInt(s.staff_id, 10);
          return isNaN(num) ? null : num;
        })
        .filter(n => n !== null);

      if (rawNumbers.length === 0) {
        return `STF-${String(staff.length + 1).padStart(3, '0')}`;
      }
      const maxVal = Math.max(...rawNumbers);
      return `STF-${String(maxVal + 1).padStart(3, '0')}`;
    }

    const maxVal = Math.max(...numericIds);
    return `STF-${String(maxVal + 1).padStart(3, '0')}`;
  };

  const handleOpenAddModal = () => {
    const nextId = generateNextStaffId();
    const activeRoles = (roles || []).filter(r => r.is_active !== false);
    const defaultRole = activeRoles.length > 0 ? (activeRoles.find(r => r.name.toLowerCase() === 'viewer')?.name || activeRoles[0].name) : 'STAFF';
    setNewStaff({
      staff_id: nextId,
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      send_email_credentials: true,
      role: defaultRole,
      branch_id: selectedBranch ? selectedBranch.id : '',
      department_id: '',
      shift_start_time: '',
      shift_end_time: '',
      is_visitor: false,
      dob: '',
      gender: ''
    });
    setIsAddModalOpen(true);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const fullName = `${newStaff.firstName || ''} ${newStaff.lastName || ''}`.trim() || newStaff.name;
    if (!newStaff.staff_id || !fullName || !newStaff.email) {
      alert("Please fill required fields: Staff ID, Name, Email");
      return;
    }
    if (!photoFile) {
      alert("Please upload a Profile Photo.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('staff_id', newStaff.staff_id);
      formData.append('name', fullName);
      formData.append('email', newStaff.email);
      if (newStaff.phone) formData.append('phone', newStaff.phone);
      formData.append('role', newStaff.role);

      const branchId = newStaff.branch_id ? parseInt(newStaff.branch_id) : (selectedBranch ? selectedBranch.id : null);
      if (branchId) formData.append('branch_id', branchId);

      if (newStaff.department_id) formData.append('department_id', parseInt(newStaff.department_id));

      if (newStaff.shift_start_time) formData.append('shift_start_time', newStaff.shift_start_time);
      if (newStaff.shift_end_time) formData.append('shift_end_time', newStaff.shift_end_time);
      formData.append('is_visitor', newStaff.is_visitor);

      if (newStaff.password) formData.append('password', newStaff.password);
      formData.append('send_email_credentials', newStaff.send_email_credentials);

      if (videoFile) {
        formData.append('video', videoFile);
      }
      formData.append('photo', photoFile);

      const res = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add staff');
      }

      setIsAddModalOpen(false);
      setNewStaff({
        staff_id: '', firstName: '', lastName: '', name: '', email: '', phone: '', role: 'STAFF',
        branch_id: '', department_id: '', shift_start_time: '', shift_end_time: '', is_visitor: false,
        dob: '', gender: ''
      });
      setVideoFile(null);
      setPhotoFile(null);
      fetchStaff();
      // Refresh branches to update staff counts
      fetchBranches();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const res = await fetch(`${API_BASE}/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete staff');
      fetchStaff();
      fetchBranches();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditModal = (member) => {
    const nameParts = (member.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    setEditingStaff({
      id: member.id,
      staff_id: member.staff_id || '',
      name: member.name || '',
      firstName: firstName,
      lastName: lastName,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'STAFF',
      branch_id: member.branch_id || '',
      department_id: member.department_id || '',
      shift_start_time: member.shift_start_time || '',
      shift_end_time: member.shift_end_time || '',
      is_visitor: member.is_visitor || false,
      is_active: member.is_active !== false,
      dob: member.dob || '',
      gender: member.gender || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    const fullName = `${editingStaff.firstName || ''} ${editingStaff.lastName || ''}`.trim() || editingStaff.name;
    try {
      const res = await fetch(`${API_BASE}/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: editingStaff.email,
          phone: editingStaff.phone,
          role: editingStaff.role,
          branch_id: editingStaff.branch_id ? parseInt(editingStaff.branch_id) : null,
          department_id: editingStaff.department_id ? parseInt(editingStaff.department_id) : null,
          shift_start_time: editingStaff.shift_start_time,
          shift_end_time: editingStaff.shift_end_time,
          is_visitor: editingStaff.is_visitor,
          is_active: editingStaff.is_active !== false
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update staff');
      }
      setIsEditModalOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Error: {error}</div>;

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKFORCE CONSOLE VIEW (TABLE)
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredStaff = staff.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.staff_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || String(s.branch_id) === String(branchFilter);
    const matchesDept = deptFilter === 'all' || String(s.department_id) === String(deptFilter);
    const matchesRole = roleFilter === 'all' || (s.role || '').toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active !== false) ||
      (statusFilter === 'inactive' && s.is_active === false) ||
      (statusFilter === 'enrolled' && s.has_face_encoding) ||
      (statusFilter === 'pending' && !s.has_face_encoding);
    return matchesSearch && matchesBranch && matchesDept && matchesRole && matchesStatus;
  });



  // Slicing for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);

  return (
    <div className="bm-page" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <style>{`
        /* Pagination */
        .epic-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          background: var(--bg-card-premium, #fff);
          border-top: 1px solid var(--border-premium, #f1f5f9);
        }

        .dark-theme .epic-pagination {
          background: transparent;
          border-top-color: var(--border-card, rgba(255, 255, 255, 0.08));
        }

        .epic-pagination-btn {
          background: var(--bg-btn-premium, #f1f5f9);
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.375rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-subtle-premium, #475569);
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .epic-pagination-btn:hover:not(:disabled) {
          border-color: var(--brand-primary, #006EB3);
          color: var(--brand-primary, #006EB3);
          background: var(--bg-card-premium, #fff);
        }

        /* Back button */
        .epic-back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-subtle-premium, #475569);
          background: transparent;
          border: none;
          cursor: pointer;
          margin-bottom: 1.5rem;
          padding: 0;
          transition: color 0.2s;
        }

        .epic-back-button:hover {
          color: var(--brand-primary, #006EB3);
        }
      `}</style>

      {isAddModalOpen ? (
        <>
          <PageHeader title="Add Staff" icon={Users} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                className="epic-back-button"
                style={{ marginBottom: '1.25rem' }}
                onClick={() => setIsAddModalOpen(false)}
              >
                <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Back to Staff Listings
              </button>

              <form onSubmit={handleAddStaff}>

                {/* SECTION 1: Basic Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Personal Information</h2>

                  {/* First Name & Last Name Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        First Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter name"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={newStaff.firstName}
                        onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Last Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={newStaff.lastName}
                        onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Phone Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={newStaff.email}
                        onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Phone Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '0 0.75rem', gap: '0.35rem', fontSize: '0.875rem', color: '#475569' }}>
                          <span>🇵🇰</span> <span>+92</span>
                        </div>
                        <input
                          type="text"
                          placeholder="3001234567"
                          style={{ flex: 1, border: 'none', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                          value={newStaff.phone}
                          onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* DOB & Gender Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Date of Birth
                      </label>
                      <CustomDatePicker
                        value={newStaff.dob}
                        onChange={val => setNewStaff({ ...newStaff, dob: val })}
                        placeholder="Select date of birth"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Gender <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <CustomSelect
                        value={newStaff.gender}
                        onChange={e => setNewStaff({ ...newStaff, gender: e.target.value })}
                        placeholder="Select gender"
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' }
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Staff Identification & Biometrics */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Identification & Biometrics</h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    {/* Card 1: Profile Photo Upload */}
                    <div>
                      <div style={{ position: 'relative', border: '1.5px dashed #e2e8f0', borderRadius: '0.75rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', cursor: 'pointer', minHeight: '160px' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleOpenCropModal(e.target.files[0]);
                            }
                          }}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                        />
                        <Upload size={32} color="var(--brand-primary, #006EB3)" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                          Drag & drop to or click to <span style={{ color: 'var(--brand-primary, #006EB3)', textDecoration: 'underline', fontWeight: 600 }}>upload</span> profile picture
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                          {photoFile ? photoFile.name : 'Upload face image (Required)'}
                        </p>
                      </div>
                      {photoFile && (
                        <button
                          type="button"
                          onClick={() => handleOpenCropModal(photoFile)}
                          style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            padding: '0.4rem',
                            background: 'var(--brand-primary, #006EB3)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          Crop Photo
                        </button>
                      )}
                    </div>

                    {/* Card 2: Training Video */}
                    <div style={{ position: 'relative', border: '1.5px dashed #e2e8f0', borderRadius: '0.75rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', cursor: 'pointer', minHeight: '160px' }}>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={e => setVideoFile(e.target.files[0])}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                      />
                      <Upload size={32} color="var(--brand-primary, #006EB3)" style={{ marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                        Drag & drop to or click to <span style={{ color: 'var(--brand-primary, #006EB3)', textDecoration: 'underline', fontWeight: 600 }}>upload</span> training video
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                        {videoFile ? videoFile.name : 'Upload 5-10s video of face for learning (Required)'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* SECTION 3: Organizational Settings */}
                <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Organizational Details</h2>

                  {/* ROW 1: STAFF ID, BRANCH, REGISTER AS VISITOR */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>STAFF ID</label>
                      <input
                        type="text"
                        placeholder="e.g. STF-001 (optional)"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={newStaff.staff_id}
                        onChange={e => setNewStaff({ ...newStaff, staff_id: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BRANCH</label>
                      <CustomSelect
                        value={newStaff.branch_id || ''}
                        onChange={e => setNewStaff({ ...newStaff, branch_id: e.target.value })}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        placeholder="Select branch..."
                        options={[
                          { value: '', label: 'Select branch...' },
                          ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={newStaff.is_visitor}
                          onChange={e => setNewStaff({ ...newStaff, is_visitor: e.target.checked })}
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--brand-primary, #006EB3)', cursor: 'pointer' }}
                        />
                        Register as Visitor (Temporary Access)
                      </label>
                    </div>
                  </div>

                  {/* ROW 2: DEPARTMENT (FIRST), ASSIGNED SHIFT, SHIFT START, SHIFT END, BREAK START, BREAK END */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DEPARTMENT</label>
                      <CustomSelect
                        value={newStaff.department_id || ''}
                        onChange={e => handleDeptChangeNewStaff(e.target.value)}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        options={[
                          { value: '', label: 'No Department' },
                          ...departments
                            .filter(d => !newStaff.branch_id || !d.branch_id || String(d.branch_id) === String(newStaff.branch_id))
                            .map(d => ({ value: d.id, label: d.name }))
                        ]}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ASSIGNED SHIFT</label>
                      <CustomSelect
                        value={newStaff.selected_shift_id || ''}
                        disabled={!newStaff.department_id}
                        onChange={e => {
                          const shiftId = e.target.value;
                          if (!shiftId) {
                            setNewStaff(prev => ({
                              ...prev,
                              selected_shift_id: '',
                              shift_start_time: '',
                              shift_end_time: '',
                              break_start_time: '',
                              break_end_time: ''
                            }));
                            return;
                          }
                          const selectedDept = departments.find(d => String(d.id) === String(newStaff.department_id));
                          const availShifts = (selectedDept && selectedDept.shifts && selectedDept.shifts.length > 0)
                            ? selectedDept.shifts
                            : (selectedDept && selectedDept.shift_start ? [{
                              id: `dept-${selectedDept.id}`,
                              shift_name: selectedDept.shift_name || 'Standard Shift',
                              shift_start: selectedDept.shift_start,
                              shift_end: selectedDept.shift_end,
                              grace_time_mins: selectedDept.grace_time_mins || 10,
                              break_start: selectedDept.break_start || '01:00 PM',
                              break_end: selectedDept.break_end || '02:00 PM',
                              days: 'Mon,Tue,Wed,Thu,Fri,Sat'
                            }] : []);
                          const match = availShifts.find(s => String(s.id) === String(shiftId));
                          if (match) {
                            setNewStaff(prev => ({
                              ...prev,
                              selected_shift_id: shiftId,
                              shift_start_time: match.shift_start || match.start_time || '',
                              shift_end_time: match.shift_end || match.end_time || '',
                              break_start_time: match.break_start || '',
                              break_end_time: match.break_end || ''
                            }));
                          } else {
                            setNewStaff(prev => ({ ...prev, selected_shift_id: shiftId }));
                          }
                        }}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        options={[
                          { value: '', label: newStaff.department_id ? 'Select department shift...' : 'Select department first...' },
                          ...(() => {
                            const selectedDept = departments.find(d => String(d.id) === String(newStaff.department_id));
                            const availShifts = (selectedDept && selectedDept.shifts && selectedDept.shifts.length > 0)
                              ? selectedDept.shifts
                              : (selectedDept && selectedDept.shift_start ? [{
                                id: `dept-${selectedDept.id}`,
                                shift_name: selectedDept.shift_name || 'Standard Shift',
                                shift_start: selectedDept.shift_start,
                                shift_end: selectedDept.shift_end,
                                grace_time_mins: selectedDept.grace_time_mins || 10,
                                break_start: selectedDept.break_start || '01:00 PM',
                                break_end: selectedDept.break_end || '02:00 PM',
                                days: 'Mon,Tue,Wed,Thu,Fri,Sat'
                              }] : []);
                            return availShifts.map(s => ({
                              value: s.id,
                              label: s.days
                                ? `${s.shift_name} (${s.days} | ${s.shift_start || s.start_time} - ${s.shift_end || s.end_time} | ${s.grace_time_mins || 10}m grace)`
                                : `${s.shift_name} (${s.shift_start || s.start_time} - ${s.shift_end || s.end_time})`
                            }));
                          })()
                        ]}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>SHIFT START {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={newStaff.shift_start_time || ''}
                        onChange={e => setNewStaff({ ...newStaff, shift_start_time: e.target.value })}
                        disabled={!canOverrideShift || !newStaff.department_id || !newStaff.selected_shift_id}
                        placeholder="Select shift start time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>SHIFT END {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={newStaff.shift_end_time || ''}
                        onChange={e => setNewStaff({ ...newStaff, shift_end_time: e.target.value })}
                        disabled={!canOverrideShift || !newStaff.department_id || !newStaff.selected_shift_id}
                        placeholder="Select shift end time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BREAK START {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={newStaff.break_start_time || ''}
                        onChange={e => setNewStaff({ ...newStaff, break_start_time: e.target.value })}
                        disabled={!canOverrideShift || !newStaff.department_id || !newStaff.selected_shift_id}
                        placeholder="Select break start time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BREAK END {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={newStaff.break_end_time || ''}
                        onChange={e => setNewStaff({ ...newStaff, break_end_time: e.target.value })}
                        disabled={!canOverrideShift || !newStaff.department_id || !newStaff.selected_shift_id}
                        placeholder="Select break end time"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Submit Action */}
                <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', width: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flex: 'none' }}
                    className="bm-btn-premium-submit"
                  >
                    Save
                  </button>
                </div>

              </form>
            </div>
          </div>
        </>
      ) : isEditModalOpen && editingStaff ? (
        <>
          <PageHeader title="Edit Staff" icon={Users} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <button
                type="button"
                className="epic-back-button"
                style={{ marginBottom: '1.25rem' }}
                onClick={() => setIsEditModalOpen(false)}
              >
                <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Back to Staff Listings
              </button>

              <form onSubmit={handleUpdateStaff}>

                {/* SECTION 1: Basic Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Basic Information</h2>

                  {/* First Name & Last Name Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        First Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter name"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={editingStaff.firstName}
                        onChange={e => setEditingStaff({ ...editingStaff, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Last Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={editingStaff.lastName}
                        onChange={e => setEditingStaff({ ...editingStaff, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Phone Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={editingStaff.email}
                        onChange={e => setEditingStaff({ ...editingStaff, email: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Phone Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '0 0.75rem', gap: '0.35rem', fontSize: '0.875rem', color: '#475569' }}>
                          <span>🇵🇰</span> <span>+92</span>
                        </div>
                        <input
                          type="text"
                          placeholder="3001234567"
                          style={{ flex: 1, border: 'none', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                          value={editingStaff.phone}
                          onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* DOB & Gender Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Date of Birth
                      </label>
                      <CustomDatePicker
                        value={editingStaff.dob}
                        onChange={val => setEditingStaff({ ...editingStaff, dob: val })}
                        placeholder="Select date of birth"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        Gender <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <CustomSelect
                        value={editingStaff.gender}
                        onChange={e => setEditingStaff({ ...editingStaff, gender: e.target.value })}
                        placeholder="Select gender"
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' }
                        ]}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Citizen Identification & Biometrics */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Citizen Identification & Biometrics</h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    {/* Card 1: Profile Photo Upload */}
                    <div>
                      <div style={{ position: 'relative', border: '1.5px dashed #e2e8f0', borderRadius: '0.75rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', cursor: 'pointer', minHeight: '160px' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleOpenCropModal(e.target.files[0]);
                            }
                          }}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                        />
                        <Upload size={32} color="var(--brand-primary, #006EB3)" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                          Drag & drop to or click to <span style={{ color: 'var(--brand-primary, #006EB3)', textDecoration: 'underline', fontWeight: 600 }}>upload</span> profile picture
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                          {photoFile ? photoFile.name : editingStaff.profile_picture ? 'Picture is already uploaded' : 'Upload face image (Required)'}
                        </p>
                      </div>
                      {photoFile && (
                        <button
                          type="button"
                          onClick={() => handleOpenCropModal(photoFile)}
                          style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            padding: '0.4rem',
                            background: 'var(--brand-primary, #006EB3)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          Crop Photo
                        </button>
                      )}
                    </div>

                    {/* Card 2: Training Video */}
                    <div style={{ position: 'relative', border: '1.5px dashed #e2e8f0', borderRadius: '0.75rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', cursor: 'pointer', minHeight: '160px' }}>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={e => setVideoFile(e.target.files[0])}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                      />
                      <Upload size={32} color="var(--brand-primary, #006EB3)" style={{ marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, textAlign: 'center', fontWeight: 500 }}>
                        Drag & drop to or click to <span style={{ color: 'var(--brand-primary, #006EB3)', textDecoration: 'underline', fontWeight: 600 }}>upload</span> training video
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'center' }}>
                        {videoFile ? videoFile.name : 'Upload 5-10s video of face for learning (Optional)'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* SECTION 3: Organizational Settings */}
                <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.5rem 0' }}>Organizational Settings</h2>

                  {/* ROW 1: STAFF ID, BRANCH, REGISTER AS VISITOR */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>STAFF ID</label>
                      <input
                        type="text"
                        style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                        value={editingStaff.staff_id}
                        disabled
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BRANCH</label>
                      <CustomSelect
                        value={editingStaff.branch_id || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, branch_id: e.target.value })}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        options={[
                          { value: '', label: 'No Branch' },
                          ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={editingStaff.is_visitor}
                          onChange={e => setEditingStaff({ ...editingStaff, is_visitor: e.target.checked })}
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--brand-primary, #006EB3)', cursor: 'pointer' }}
                        />
                        Register as Visitor (Temporary Access)
                      </label>
                    </div>
                  </div>

                  {/* ROW 2: DEPARTMENT (FIRST), ASSIGNED SHIFT, SHIFT START, SHIFT END, BREAK START, BREAK END */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>DEPARTMENT</label>
                      <CustomSelect
                        value={editingStaff.department_id || ''}
                        onChange={e => handleDeptChangeEditStaff(e.target.value)}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        options={[
                          { value: '', label: 'No Department' },
                          ...departments
                            .filter(d => !editingStaff.branch_id || !d.branch_id || String(d.branch_id) === String(editingStaff.branch_id))
                            .map(d => ({ value: d.id, label: d.name }))
                        ]}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>ASSIGNED SHIFT</label>
                      <CustomSelect
                        value={editingStaff.selected_shift_id || ''}
                        disabled={!editingStaff.department_id}
                        onChange={e => {
                          const shiftId = e.target.value;
                          if (!shiftId) {
                            setEditingStaff(prev => ({
                              ...prev,
                              selected_shift_id: '',
                              shift_start_time: '',
                              shift_end_time: '',
                              break_start_time: '',
                              break_end_time: ''
                            }));
                            return;
                          }
                          const selectedDept = departments.find(d => String(d.id) === String(editingStaff.department_id));
                          const availShifts = (selectedDept && selectedDept.shifts && selectedDept.shifts.length > 0)
                            ? selectedDept.shifts
                            : (selectedDept && selectedDept.shift_start ? [{
                              id: `dept-${selectedDept.id}`,
                              shift_name: selectedDept.shift_name || 'Standard Shift',
                              shift_start: selectedDept.shift_start,
                              shift_end: selectedDept.shift_end,
                              grace_time_mins: selectedDept.grace_time_mins || 10,
                              break_start: selectedDept.break_start || '01:00 PM',
                              break_end: selectedDept.break_end || '02:00 PM',
                              days: 'Mon,Tue,Wed,Thu,Fri,Sat'
                            }] : []);
                          const match = availShifts.find(s => String(s.id) === String(shiftId));
                          if (match) {
                            setEditingStaff(prev => ({
                              ...prev,
                              selected_shift_id: shiftId,
                              shift_start_time: match.shift_start || match.start_time || '',
                              shift_end_time: match.shift_end || match.end_time || '',
                              break_start_time: match.break_start || '',
                              break_end_time: match.break_end || ''
                            }));
                          } else {
                            setEditingStaff(prev => ({ ...prev, selected_shift_id: shiftId }));
                          }
                        }}
                        style={{ height: '42px', width: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff' }}
                        options={[
                          { value: '', label: editingStaff.department_id ? 'Select department shift...' : 'Select department first...' },
                          ...(() => {
                            const selectedDept = departments.find(d => String(d.id) === String(editingStaff.department_id));
                            const availShifts = (selectedDept && selectedDept.shifts && selectedDept.shifts.length > 0)
                              ? selectedDept.shifts
                              : (selectedDept && selectedDept.shift_start ? [{
                                id: `dept-${selectedDept.id}`,
                                shift_name: selectedDept.shift_name || 'Standard Shift',
                                shift_start: selectedDept.shift_start,
                                shift_end: selectedDept.shift_end,
                                grace_time_mins: selectedDept.grace_time_mins || 10,
                                break_start: selectedDept.break_start || '01:00 PM',
                                break_end: selectedDept.break_end || '02:00 PM',
                                days: 'Mon,Tue,Wed,Thu,Fri,Sat'
                              }] : []);
                            return availShifts.map(s => ({
                              value: s.id,
                              label: s.days
                                ? `${s.shift_name} (${s.days} | ${s.shift_start || s.start_time} - ${s.shift_end || s.end_time} | ${s.grace_time_mins || 10}m grace)`
                                : `${s.shift_name} (${s.shift_start || s.start_time} - ${s.shift_end || s.end_time})`
                            }));
                          })()
                        ]}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>SHIFT START {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={editingStaff.shift_start_time || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, shift_start_time: e.target.value })}
                        disabled={!canOverrideShift || !editingStaff.department_id || !editingStaff.selected_shift_id}
                        placeholder="Select shift start time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>SHIFT END {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={editingStaff.shift_end_time || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, shift_end_time: e.target.value })}
                        disabled={!canOverrideShift || !editingStaff.department_id || !editingStaff.selected_shift_id}
                        placeholder="Select shift end time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BREAK START {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={editingStaff.break_start_time || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, break_start_time: e.target.value })}
                        disabled={!canOverrideShift || !editingStaff.department_id || !editingStaff.selected_shift_id}
                        placeholder="Select break start time"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>BREAK END {!canOverrideShift && '(READ ONLY)'}</label>
                      <CustomTimePicker
                        value={editingStaff.break_end_time || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, break_end_time: e.target.value })}
                        disabled={!canOverrideShift || !editingStaff.department_id || !editingStaff.selected_shift_id}
                        placeholder="Select break end time"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Submit Action */}
                <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', width: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flex: 'none' }}
                    className="bm-btn-premium-submit"
                  >
                    Save
                  </button>
                </div>

              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Staff" icon={Users} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} sidebarCollapsed={sidebarCollapsed} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

            {/* Filters & Add Staff Button in 1 Row */}
            <div className="epic-toolbar">
              <div className="epic-filters-group">
                <div className="epic-search-wrapper">
                  <Search size={16} className="epic-search-icon" />
                  <input
                    type="text"
                    className="epic-search-input"
                    placeholder="Search staff by name, email, or ID..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <CustomSelect
                  value={branchFilter}
                  onChange={e => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Branches' },
                    ...branches.map(b => ({ value: String(b.id), label: b.name }))
                  ]}
                />
                <CustomSelect
                  value={deptFilter}
                  onChange={e => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Departments' },
                    ...departments.map(d => ({ value: String(d.id), label: d.name }))
                  ]}
                />
                <CustomSelect
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />
                <CustomSelect
                  value={enrollmentFilter}
                  onChange={e => { setEnrollmentFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Enrollment' },
                    { value: 'enrolled', label: 'Enrolled' },
                    { value: 'pending', label: 'Pending' }
                  ]}
                />
                {/* Theme Date Range Picker */}
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(range) => { setDateRange(range); setCurrentPage(1); }}
                  onClear={() => { setDateRange({ startDate: '', endDate: '' }); setCurrentPage(1); }}
                />

                {(searchTerm !== '' || branchFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all' || enrollmentFilter !== 'all' || dateRange.startDate !== '' || dateRange.endDate !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setBranchFilter('all');
                      setDeptFilter('all');
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setEnrollmentFilter('all');
                      setDateRange({ startDate: '', endDate: '' });
                      setCurrentPage(1);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-primary, #006EB3)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.4rem 0.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RotateCcw size={13} /> Clear All
                  </button>
                )}
              </div>

              {hasPerm(user, ['add_staff', 'create_staff']) && (
                <button className="epic-btn epic-btn-primary" onClick={handleOpenAddModal}>
                  <Plus size={16} /> Add Staff
                </button>
              )}
            </div>

            {/* Table Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {(() => {
                const canEditStaff = hasAnyWritePerm(user, 'staff');
                const filteredStaff = staff.filter(member => {
                  const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (member.staff_id && member.staff_id.toLowerCase().includes(searchTerm.toLowerCase()));
                  const matchesBranch = branchFilter === 'all' || String(member.branch_id) === String(branchFilter);
                  const matchesDept = deptFilter === 'all' || String(member.department_id) === String(deptFilter);
                  const matchesStatus = statusFilter === 'all' ||
                    (statusFilter === 'active' && member.is_active !== false) ||
                    (statusFilter === 'inactive' && member.is_active === false);
                  const matchesEnrollment = enrollmentFilter === 'all' ||
                    (enrollmentFilter === 'enrolled' && (member.has_face_encoding || member.photo_url || member.is_enrolled || member.profile_picture)) ||
                    (enrollmentFilter === 'pending' && !(member.has_face_encoding || member.photo_url || member.is_enrolled || member.profile_picture));
                  const matchesDate = (() => {
                    if (!dateRange.startDate && !dateRange.endDate) return true;
                    const rawDate = member.updated_at || member.created_at;
                    if (!rawDate) return true;
                    const dStr = rawDate.split('T')[0];
                    if (dateRange.startDate && dStr < dateRange.startDate) return false;
                    if (dateRange.endDate && dStr > dateRange.endDate) return false;
                    return true;
                  })();
                  return matchesSearch && matchesBranch && matchesDept && matchesStatus && matchesEnrollment && matchesDate;
                });

                const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);

                const gridCols = canEditStaff ? '1.8fr 1.5fr 1.1fr 1.1fr 1fr 0.9fr 1fr 80px' : '1.8fr 1.5fr 1.1fr 1.1fr 1fr 0.9fr 1fr';
                return (
                  <div style={{ background: 'var(--bg-card-premium, #fff)', borderRadius: '0.75rem', border: '1px solid var(--border-premium, #e2e8f0)', overflow: 'hidden' }}>

                    {/* Table Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '1rem', padding: '1rem 1.5rem', background: 'var(--bg-header-premium, #f8fafc)', borderBottom: '1px solid var(--border-premium, #e2e8f0)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', letterSpacing: '0.05em' }}>
                      <div>PROFILE</div>
                      <div>CONTACT INFO</div>
                      <div>BRANCH</div>
                      <div>DEPARTMENT</div>
                      <div>ENROLLMENT</div>
                      <div>STATUS</div>
                      <div>UPDATED AT</div>
                      {canEditStaff && <div>ACTIONS</div>}
                    </div>

                    {/* Table Body */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {filteredStaff.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted-premium, #64748b)', fontSize: '0.875rem' }}>
                          No staff members found.
                        </div>
                      ) : (
                        currentStaff.map((member, idx) => (
                          <div key={member.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '1rem', padding: '1rem 1.5rem', borderBottom: idx < currentStaff.length - 1 ? '1px solid var(--border-premium, #f1f5f9)' : 'none', alignItems: 'center', background: idx % 2 === 0 ? 'var(--bg-card-premium, #fff)' : 'var(--bg-header-premium, #f8fafc)' }}>

                            {/* Profile */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div
                                style={{ position: 'relative', cursor: 'pointer' }}
                                onClick={() => setMediaVerificationModal(member)}
                                title="Click to view saved picture & registration video"
                              >
                                <StaffAvatar
                                  name={member.name}
                                  profilePicture={member.profile_picture ? (member.profile_picture.startsWith('http') ? member.profile_picture : `${API_BASE}${member.profile_picture}`) : ''}
                                  size={40}
                                />
                                {member.has_face_encoding && (
                                  <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#10b981', border: '2px solid #fff', borderRadius: '50%', width: '12px', height: '12px', zIndex: 2 }} />
                                )}
                              </div>
                              <div>
                                <div
                                  onClick={() => setMediaVerificationModal(member)}
                                  style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main-premium, #0f172a)', cursor: 'pointer', textDecoration: 'underline decoration-transparent transition-all' }}
                                  title="Click to view saved picture & registration video"
                                >
                                  {member.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted-premium, #64748b)' }}>ID: {member.staff_id}</div>
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle-premium, #334155)', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#94a3b8' }}>✉</span> {member.email}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle-premium, #334155)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span style={{ color: '#94a3b8' }}>📞</span> {member.phone || 'N/A'}
                              </div>
                            </div>

                            {/* Branch */}
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main-premium, #334155)' }}>
                                {branches.find(b => String(b.id) === String(member.branch_id))?.name || member.branch_name || 'Branches'}
                              </span>
                            </div>

                            {/* Department */}
                            <div>
                              {(() => {
                                const deptName = member.department_name || departments.find(d => String(d.id) === String(member.department_id))?.name;
                                return deptName ? (
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main-premium, #334155)' }}>
                                    {deptName}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unassigned</span>
                                );
                              })()}
                            </div>

                            {/* ENROLLMENT */}
                            <div>
                              {(() => {
                                const isEnrolled = !!(member.has_face_encoding || member.photo_url || member.is_enrolled || member.profile_picture);
                                return (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: isEnrolled ? '#10b981' : '#ef4444'
                                  }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isEnrolled ? '#10b981' : '#ef4444' }} />
                                    {isEnrolled ? 'Enrolled' : 'Pending'}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Status Badge */}
                            <div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: member.is_active !== false ? '#10b981' : '#94a3b8'
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: member.is_active !== false ? '#10b981' : '#94a3b8' }} />
                                {member.is_active !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {/* UPDATED AT */}
                            <div style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>
                              {formatDate(member.updated_at || member.created_at)}
                            </div>

                            {/* Actions (Left Aligned - Hidden if read-only) */}
                            {hasAnyWritePerm(user, 'staff') && (
                              <div style={{ display: 'flex', justifyContent: 'flex-start', position: 'relative' }} ref={activeActionsMenu === member.id ? actionsMenuRef : null}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionsMenu(activeActionsMenu === member.id ? null : member.id);
                                  }}
                                  style={{ background: 'var(--bg-btn-premium, #f1f5f9)', border: 'none', borderRadius: '0.375rem', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted-premium, #64748b)' }}
                                  title="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {activeActionsMenu === member.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: (currentStaff.length > 3 && idx >= currentStaff.length - 2) ? 'auto' : '32px',
                                      bottom: (currentStaff.length > 3 && idx >= currentStaff.length - 2) ? '32px' : 'auto',
                                      background: '#ffffff',
                                      borderRadius: '0.5rem',
                                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                      border: '1px solid #e2e8f0',
                                      padding: '0.35rem 0',
                                      zIndex: 50,
                                      minWidth: '130px'
                                    }}
                                  >
                                    {hasPerm(user, 'update_staff') && (
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          handleOpenEditModal(member);
                                        }}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem 0.85rem',
                                          background: 'transparent',
                                          border: 'none',
                                          fontSize: '0.8rem',
                                          fontWeight: 500,
                                          color: '#475569',
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <Edit size={14} /> Edit Info
                                      </button>
                                    )}

                                    {hasPerm(user, ['status_staff', 'remove_staff']) && (
                                      <button
                                        onClick={() => handleToggleStaffStatus(member)}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem 0.85rem',
                                          background: 'transparent',
                                          border: 'none',
                                          fontSize: '0.8rem',
                                          fontWeight: 500,
                                          color: member.is_active === false ? '#10b981' : '#64748b',
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        {member.is_active === false ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {member.is_active === false ? 'Active' : 'Inactive'}
                                      </button>
                                    )}

                                    {hasPerm(user, ['delete_staff', 'remove_staff']) && (
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          handleDeleteStaff(member.id);
                                        }}
                                        style={{
                                          width: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          padding: '0.5rem 0.85rem',
                                          background: 'transparent',
                                          border: 'none',
                                          fontSize: '0.8rem',
                                          fontWeight: 500,
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <Trash2 size={14} /> Delete Staff
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination at the bottom */}
                    <div className="epic-pagination" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-premium, #f1f5f9)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CustomSelect
                          value={itemsPerPage}
                          onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          dropUp={true}
                          options={[
                            { value: 10, label: '10 / page' },
                            { value: 25, label: '25 / page' },
                            { value: 50, label: '50 / page' },
                            { value: 100, label: '100 / page' }
                          ]}
                        />

                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--border-premium, #cbd5e1)', borderRadius: '0.375rem', background: currentPage <= 1 ? 'var(--bg-header-premium, #f1f5f9)' : 'var(--bg-card-premium, #fff)', color: currentPage <= 1 ? '#cbd5e1' : 'var(--text-main-premium, #475569)', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Prev
                          </button>

                          <span style={{ padding: '0.375rem 0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
                            {currentPage} / {totalPages || 1}
                          </span>

                          <button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--border-premium, #cbd5e1)', borderRadius: '0.375rem', background: currentPage >= totalPages ? 'var(--bg-header-premium, #f1f5f9)' : 'var(--bg-card-premium, #fff)', color: currentPage >= totalPages ? '#cbd5e1' : 'var(--text-main-premium, #475569)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* IMAGE CROPPER MODAL */}
      {cropModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.75rem',
            width: '90%',
            maxWidth: '420px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              Adjust Profile Photo
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
              Drag the photo to pan and slide the zoom bar to align the face inside the circular crop guide.
            </p>

            {/* Viewport container */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              style={{
                width: '100%',
                height: '250px',
                background: '#0f172a',
                borderRadius: '0.5rem',
                position: 'relative',
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
            >
              {/* Render raw image */}
              {rawImageSrc && (
                <img
                  src={rawImageSrc}
                  alt="Source"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    maxHeight: '100%',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Viewport circular guide overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '25px solid rgba(15, 23, 42, 0.6)',
                borderRadius: '0.5rem',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Inner circle guide */}
                <div style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  border: '2px dashed var(--brand-primary, #006EB3)',
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.4)'
                }} />
              </div>
            </div>

            {/* Zoom controls */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--brand-primary, #006EB3)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'var(--brand-primary, #006EB3)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px var(--brand-primary-tint, rgba(0,110,179,0.2))'
                }}
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOP-RIGHT SUCCESS TOAST */}
      {success && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            borderRadius: '0.6rem',
            padding: '0.75rem 1rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 99999,
            maxWidth: '380px'
          }}
        >
          <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', flex: 1 }}>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              borderRadius: '0.25rem'
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {/* MEDIA VERIFICATION MODAL (PHOTO & VIDEO) */}
      {mediaVerificationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '1rem',
            width: '90%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' }}>
                  {mediaVerificationModal.name ? mediaVerificationModal.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    {mediaVerificationModal.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                    <span>Staff ID: <strong>{mediaVerificationModal.staff_id}</strong></span>
                    <span>•</span>
                    <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      Biometric Enrolled (512-dim ArcFace)
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMediaVerificationModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '0.375rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', fontWeight: 700, transition: 'all 0.2s' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>

              {/* Left Column: Saved Profile Photo */}
              <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📷 Saved Registration Picture</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600 }}>Verified Photo</span>
                </div>
                <div style={{ width: '100%', height: '280px', borderRadius: '0.5rem', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                  {mediaVerificationModal.profile_picture ? (
                    <img
                      src={mediaVerificationModal.profile_picture.startsWith('http') ? mediaVerificationModal.profile_picture : `${API_BASE}${mediaVerificationModal.profile_picture}`}
                      alt={mediaVerificationModal.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No Profile Photo Saved</div>
                  )}
                </div>
              </div>

              {/* Right Column: Registration Video Player */}
              {(() => {
                const videoRel = mediaVerificationModal.registration_video || mediaVerificationModal.video_url;
                const fullVideoSrc = videoRel ? (videoRel.startsWith('http') ? videoRel : `${API_BASE}${videoRel}`) : null;

                return (
                  <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>🎥 Registration Video (20-30s)</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', background: fullVideoSrc ? '#eff6ff' : '#fef2f2', color: fullVideoSrc ? '#1d4ed8' : '#b91c1c', border: fullVideoSrc ? '1px solid #bfdbfe' : '1px solid #fecaca', fontWeight: 600 }}>
                        {fullVideoSrc ? 'HD Video Active' : 'No Video Binary'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '280px', borderRadius: '0.5rem', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                      {fullVideoSrc ? (
                        <video
                          controls
                          autoPlay={false}
                          preload="metadata"
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        >
                          <source
                            src={fullVideoSrc}
                            type="video/mp4"
                          />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Photo Enrolled Biometrics</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Face vectors extracted directly from verified picture.</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer - Employee Meta Details */}
            <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Role</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{mediaVerificationModal.role}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Department</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{mediaVerificationModal.department_name || 'General Operations'}</div>
              </div>
              <div style={{ wordBreak: 'break-all' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Email</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{mediaVerificationModal.email}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Shift Hours</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{mediaVerificationModal.shift_start_time || '11:00 AM'} - {mediaVerificationModal.shift_end_time || '8:45 PM'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
