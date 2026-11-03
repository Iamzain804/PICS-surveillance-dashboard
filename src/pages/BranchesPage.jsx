import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Plus, Trash2, Edit2, Edit, Eye, EyeOff, CheckCircle,
  X, AlertCircle, RefreshCw, MoreVertical, RotateCcw,
  Search, Calendar, ArrowLeft, ChevronDown, ChevronUp, ChevronRight, MapPin, Phone, Activity,
  Video, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { API_BASE } from '../config';
import PageLoader from '../components/PageLoader';
import DateRangePicker from '../components/DateRangePicker';
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

export default function BranchesPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [success, setSuccess] = useState(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const actionsMenuRef = useRef(null);

  // Dedicated Sub-page / Detailed View State
  const [selectedBranchForActivities, setSelectedBranchForActivities] = useState(null);
  const [branchActivities, setBranchActivities] = useState([]);
  const [branchCameras, setBranchCameras] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityStatusFilter, setActivityStatusFilter] = useState('all');

  // Modals state
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  // Active activity row menu
  const [activeActivityMenu, setActiveActivityMenu] = useState(null);
  const activityMenuRef = useRef(null);

  // Forms state
  const initialBranchForm = {
    name: '',
    address: ''
  };

  const [branchForm, setBranchForm] = useState(initialBranchForm);
  const [editingBranch, setEditingBranch] = useState(null);
  const [globalActivities, setGlobalActivities] = useState([]);

  const [activityForm, setActivityForm] = useState({
    activity_id: '',
    name: '',
    floor: 'Ground Floor',
    camera_direction: 'In',
    description: '',
    status: 'active'
  });

  // Pagination state for Branches
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination state for Activities View
  const [actCurrentPage, setActCurrentPage] = useState(1);
  const [actItemsPerPage, setActItemsPerPage] = useState(10);

  // Helper to generate unique Activity ID per branch (e.g. ACT-01, ACT-02, ACT-03...)
  const generateUniqueActivityId = (currentActs = []) => {
    const existingIds = new Set();
    (currentActs || []).forEach(a => {
      if (a && a.activity_id) existingIds.add(a.activity_id.trim().toUpperCase());
    });

    let num = 1;
    let candidate = `ACT-${String(num).padStart(2, '0')}`;
    while (existingIds.has(candidate)) {
      num++;
      candidate = `ACT-${String(num).padStart(2, '0')}`;
    }
    return candidate;
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActiveActionsMenu(null);
      }
      if (activityMenuRef.current && !activityMenuRef.current.contains(e.target)) {
        setActiveActivityMenu(null);
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

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/branches`);
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setBranches([]);
      setLoading(false);
    }
  };

  const fetchActivitiesForBranch = async (branchId) => {
    setActivitiesLoading(true);
    try {
      const [actRes, camRes, globRes] = await Promise.all([
        fetch(`${API_BASE}/branches/${branchId}/activities`),
        fetch(`${API_BASE}/api/v1/cameras?branch_id=${branchId}`),
        fetch(`${API_BASE}/api/v1/global-activities`)
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setBranchActivities(Array.isArray(data) ? data : []);
      } else {
        setBranchActivities([]);
      }

      if (camRes.ok) {
        const cams = await camRes.json();
        setBranchCameras(Array.isArray(cams) ? cams : []);
      } else {
        setBranchCameras([]);
      }

      if (globRes.ok) {
        const globs = await globRes.json();
        setGlobalActivities(Array.isArray(globs) ? globs : []);
      }
    } catch (e) {
      console.error(e);
      setBranchActivities([]);
      setBranchCameras([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // ── Helpers for Activity Camera Directions ──
  const getCameraDirectionOptions = (activityName) => {
    const actName = (activityName || '').toLowerCase();
    if (actName.includes('attend')) {
      return [
        { value: 'Check In', label: 'Check In' },
        { value: 'Check Out', label: 'Check Out' },
        { value: 'Single Camera', label: 'Single Camera (Bi-directional)' }
      ];
    } else if (actName.includes('break')) {
      return [
        { value: 'Break In', label: 'Break In' },
        { value: 'Break Out', label: 'Break Out' },
        { value: 'Single Camera', label: 'Single Camera (Bi-directional)' }
      ];
    } else {
      return [
        { value: 'Check In', label: 'Check In' },
        { value: 'Check Out', label: 'Check Out' },
        { value: 'Single Camera', label: 'Single Camera (Bi-directional)' }
      ];
    }
  };

  const getDefaultDirection = (activityName) => {
    const actName = (activityName || '').toLowerCase();
    if (actName.includes('break')) return 'Break In';
    return 'Check In';
  };

  // ── Open Activities View for Branch ──
  const handleOpenActivitiesView = async (branch) => {
    setActiveActionsMenu(null);
    setSelectedBranchForActivities(branch);
    setActivitySearchQuery('');
    setActivityStatusFilter('all');
    setActCurrentPage(1);

    setActivitiesLoading(true);
    try {
      const [actRes, camRes, globRes] = await Promise.all([
        fetch(`${API_BASE}/branches/${branch.id}/activities`),
        fetch(`${API_BASE}/api/v1/cameras?branch_id=${branch.id}`),
        fetch(`${API_BASE}/api/v1/global-activities`)
      ]);

      let acts = [];
      if (actRes.ok) {
        const data = await actRes.json();
        acts = Array.isArray(data) ? data : [];
        setBranchActivities(acts);
      } else {
        setBranchActivities([]);
      }

      let cams = [];
      if (camRes.ok) {
        const camsData = await camRes.json();
        cams = Array.isArray(camsData) ? camsData : [];
        setBranchCameras(cams);
      } else {
        setBranchCameras([]);
      }

      let globs = [];
      if (globRes.ok) {
        const globsData = await globRes.json();
        globs = Array.isArray(globsData) ? globsData : [];
        setGlobalActivities(globs);
      }

      const defaultActivity = globs.length > 0 ? globs[0] : { activity_id: 'ACT-001', name: 'Attendance' };
      const defaultCam = cams.length > 0 ? cams[0].camera_id : '';
      const defaultFloor = (defaultActivity.types && defaultActivity.types.length > 0) ? defaultActivity.types[0] : 'Ground Floor';

      setActivityForm({
        activity_id: defaultActivity.activity_id,
        name: defaultActivity.name,
        floor: defaultFloor,
        camera_id: defaultCam,
        camera_direction: getDefaultDirection(defaultActivity.name),
        status: 'active'
      });
    } catch (e) {
      console.error(e);
      setBranchActivities([]);
      setBranchCameras([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleBackToBranches = () => {
    setSelectedBranchForActivities(null);
    setBranchActivities([]);
    setBranchCameras([]);
    fetchBranches();
  };

  // ── Branch CRUD Handlers ──
  const handleOpenAddBranch = () => {
    setBranchForm(initialBranchForm);
    setIsAddBranchOpen(true);
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      alert('Please write branch Title.');
      return;
    }
    if (!branchForm.address.trim()) {
      alert('Please write branch Address.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchForm.name.trim(),
          address: branchForm.address.trim(),
          activities: []
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create branch.');
        return;
      }
      setIsAddBranchOpen(false);
      const name = branchForm.name;
      setBranchForm(initialBranchForm);
      setSuccess(`Branch "${name}" created successfully!`);
      fetchBranches();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name.trim()) {
      alert('Please write branch Title.');
      return;
    }
    if (!editingBranch.address.trim()) {
      alert('Please write branch Address.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/branches/${editingBranch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBranch.name.trim(),
          address: editingBranch.address.trim(),
          status: editingBranch.status
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update branch.');
        return;
      }
      const name = editingBranch.name;
      setIsEditBranchOpen(false);
      setEditingBranch(null);
      setSuccess(`Branch "${name}" updated successfully!`);
      fetchBranches();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  const handleToggleBranchStatus = async (branch) => {
    const newStatus = branch.status === 'inactive' ? 'active' : 'inactive';
    try {
      const res = await fetch(`${API_BASE}/branches/${branch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branch.name,
          address: branch.address || '',
          status: newStatus
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update branch status.');
        return;
      }
      setActiveActionsMenu(null);
      setSuccess(`Branch "${branch.name}" marked as ${newStatus === 'active' ? 'Active' : 'Inactive'} successfully!`);
      fetchBranches();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  const handleDeleteBranch = async (branch) => {
    setActiveActionsMenu(null);
    if (!window.confirm(`Are you sure you want to delete branch "${branch.name}"? This will unassign any linked staff and cameras.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/branches/${branch.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to delete branch.');
        return;
      }
      setSuccess(`Branch "${branch.name}" deleted successfully!`);
      fetchBranches();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  // ── Activities CRUD inside Activities View ──
  const handleOpenAddActivity = () => {
    const nextId = generateUniqueActivityId(branchActivities);
    setActivityForm({
      activity_id: nextId,
      name: '',
      description: '',
      status: 'active'
    });
    setIsAddActivityOpen(true);
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.name.trim()) {
      alert('Please select an Activity.');
      return;
    }

    if (!activityForm.camera_id) {
      alert('Please select and assign a Camera (Mandatory).');
      return;
    }

    const finalFloor = (activityForm.floor || '').trim() || 'Ground Floor';
    const trimmedName = activityForm.name.trim().toLowerCase();
    const isExactDup = branchActivities.some(a => 
      a.name?.trim().toLowerCase() === trimmedName &&
      (a.floor || 'Ground Floor').trim().toLowerCase() === finalFloor.toLowerCase() &&
      String(a.camera_id || '') === String(activityForm.camera_id || '')
    );
    if (isExactDup) {
      alert(`Activity "${activityForm.name.trim()}" with Type "${finalFloor}" and this camera is already assigned to this branch.`);
      return;
    }

    let targetActivityId = (activityForm.activity_id || 'ACT-001').trim();
    const existingIds = new Set(branchActivities.map(a => (a.activity_id || '').toUpperCase()));
    if (existingIds.has(targetActivityId.toUpperCase())) {
      let count = 1;
      while (existingIds.has(`${targetActivityId}-${count}`.toUpperCase())) {
        count++;
      }
      targetActivityId = `${targetActivityId}-${count}`;
    }

    const finalDirection = activityForm.camera_direction || getDefaultDirection(activityForm.name);

    const selectedCamObj = branchCameras.find(c => c.camera_id === activityForm.camera_id || c.id === activityForm.camera_id);

    try {
      const res = await fetch(`${API_BASE}/branches/${selectedBranchForActivities.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: targetActivityId,
          name: activityForm.name.trim(),
          floor: finalFloor,
          camera_direction: finalDirection,
          camera_id: activityForm.camera_id,
          camera_name: selectedCamObj ? selectedCamObj.name : null,
          camera_ids: [activityForm.camera_id],
          description: '',
          status: 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to assign activity.');
        return;
      }

      const addedName = activityForm.name;
      setIsAddActivityOpen(false);
      setSuccess(`Activity "${addedName}" assigned to ${selectedBranchForActivities.name} successfully!`);
      fetchActivitiesForBranch(selectedBranchForActivities.id);
      // Reset camera selection so next assignment is easy
      setActivityForm(prev => ({
        ...prev,
        camera_id: ''
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleOpenEditActivity = (act) => {
    setActiveActivityMenu(null);
    setEditingActivity({
      id: act.id,
      activity_id: act.activity_id,
      name: act.name,
      floor: act.floor || 'Ground Floor',
      camera_direction: act.camera_direction || getDefaultDirection(act.name),
      camera_id: act.camera_id || (branchCameras.length > 0 ? branchCameras[0].camera_id : ''),
      status: act.status || 'active'
    });
    setIsEditActivityOpen(true);
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.name.trim()) {
      alert('Please select an Activity.');
      return;
    }

    if (!editingActivity.camera_id) {
      alert('Please select and assign a Camera (Mandatory).');
      return;
    }

    const finalFloor = (editingActivity.floor || '').trim() || 'Ground Floor';
    const finalDirection = editingActivity.camera_direction || getDefaultDirection(editingActivity.name);

    const selectedCamObj = branchCameras.find(c => c.camera_id === editingActivity.camera_id || c.id === editingActivity.camera_id);

    try {
      const res = await fetch(`${API_BASE}/branches/${selectedBranchForActivities.id}/activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: editingActivity.activity_id.trim(),
          name: editingActivity.name.trim(),
          floor: finalFloor,
          camera_direction: finalDirection,
          camera_id: editingActivity.camera_id,
          camera_name: selectedCamObj ? selectedCamObj.name : null,
          camera_ids: [editingActivity.camera_id],
          description: '',
          status: editingActivity.status || 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update activity.');
        return;
      }

      setIsEditActivityOpen(false);
      setEditingActivity(null);
      setSuccess(`Activity "${editingActivity.name}" updated successfully!`);
      fetchActivitiesForBranch(selectedBranchForActivities.id);
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleDeleteActivity = async (act) => {
    if (!window.confirm(`Are you sure you want to delete activity "${act.name}" (${act.activity_id})?`)) return;
    try {
      const res = await fetch(`${API_BASE}/branches/${selectedBranchForActivities.id}/activities/${act.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to delete activity.');
        return;
      }
      setActiveActivityMenu(null);
      setSuccess(`Activity "${act.name}" deleted successfully!`);
      fetchActivitiesForBranch(selectedBranchForActivities.id);
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  // ── Filtered Branches ──
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || (branch.status || 'active') === statusFilter;

    let matchesDate = true;
    if (dateRange.startDate && branch.created_at) {
      const itemDate = new Date(branch.created_at);
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && itemDate >= start;
    }
    if (dateRange.endDate && branch.created_at) {
      const itemDate = new Date(branch.created_at);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && itemDate <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const currentBranches = filteredBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Filtered Activities for Selected Branch ──
  const filteredActivities = branchActivities.filter(act => {
    const q = activitySearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (act.name && act.name.toLowerCase().includes(q)) ||
      (act.activity_id && act.activity_id.toLowerCase().includes(q)) ||
      (act.description && act.description.toLowerCase().includes(q));

    const matchesStatus = activityStatusFilter === 'all' || (act.status || 'active') === activityStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const actTotalPages = Math.max(1, Math.ceil(filteredActivities.length / actItemsPerPage));
  const currentActivities = filteredActivities.slice(
    (actCurrentPage - 1) * actItemsPerPage,
    actCurrentPage * actItemsPerPage
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DEDICATED ADD ACTIVITY PAGE (IF BRANCH SELECTED)
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedBranchForActivities) {
    return (
      <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Page Header matching Add Staff */}
        <PageHeader
          title="Assign Activity"
          subtitle={`Assign and configure operational activities for ${selectedBranchForActivities.name}`}
          icon={Activity}
          user={user}
          onLogout={onLogout}
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={onNavigate}
        />

        {/* White Card Container matching Add Staff */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
            
            {/* Back Button matching Add Staff */}
            <button
              type="button"
              onClick={handleBackToBranches}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#475569',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: '1.5rem',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary, #006EB3)'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
            >
              <ArrowLeft size={16} /> Back to Branches
            </button>

            {/* Form Title */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                Activity Information
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Branch: <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedBranchForActivities.name}</span> (ID: BR-{String(selectedBranchForActivities.id).padStart(3, '0')})
              </p>
            </div>

            {/* Assign Activity Form */}
            <form onSubmit={handleCreateActivity}>
              {/* Row 1: Branch, Activity Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Branch Name (Read-Only) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    BRANCH
                  </label>
                  <input
                    type="text"
                    value={selectedBranchForActivities.name}
                    readOnly
                    style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'not-allowed' }}
                  />
                </div>

                {/* Activity Selection from Global Activities */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    SELECT ACTIVITY <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {globalActivities.length > 0 ? (
                    <CustomSelect
                      value={activityForm.name}
                      onChange={e => {
                        const sel = globalActivities.find(g => g.name === e.target.value);
                        const chosenName = sel ? sel.name : e.target.value;
                        const chosenId = sel ? sel.activity_id : activityForm.activity_id;
                        const defaultFloor = (sel && sel.types && sel.types.length > 0) ? sel.types[0] : (activityForm.floor || 'Ground Floor');
                        setActivityForm({
                          ...activityForm,
                          name: chosenName,
                          activity_id: chosenId,
                          floor: defaultFloor,
                          camera_direction: getDefaultDirection(chosenName)
                        });
                      }}
                      options={globalActivities.map(g => ({
                        value: g.name,
                        label: g.name
                      }))}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Attendance, Break..."
                      value={activityForm.name}
                      onChange={e => {
                        const val = e.target.value;
                        setActivityForm({
                          ...activityForm,
                          name: val,
                          camera_direction: getDefaultDirection(val)
                        });
                      }}
                      required
                      style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Type, Camera Selection, Camera Direction */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Type (Populated automatically from Global Activity types) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    TYPE <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {(() => {
                    const selAct = globalActivities.find(g => g.name === activityForm.name);
                    const typesList = (selAct && Array.isArray(selAct.types) && selAct.types.length > 0)
                      ? [...selAct.types]
                      : ['Ground Floor', '1st Floor'];
                    if (activityForm.floor && !typesList.includes(activityForm.floor)) {
                      typesList.unshift(activityForm.floor);
                    }
                    return (
                      <CustomSelect
                        value={activityForm.floor || typesList[0]}
                        onChange={e => setActivityForm({ ...activityForm, floor: e.target.value })}
                        options={typesList.map(t => ({ value: t, label: t }))}
                      />
                    );
                  })()}
                </div>

                {/* Assigned Camera (Mandatory with *) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    ASSIGN CAMERA <span style={{ color: '#ef4444' }}>*</span> <span style={{ color: '#64748b', fontWeight: 400 }}>(BRANCH CCTV)</span>
                  </label>
                  <CustomSelect
                    value={activityForm.camera_id || ''}
                    onChange={e => setActivityForm({ ...activityForm, camera_id: e.target.value })}
                    options={[
                      { value: '', label: 'Select Camera *' },
                      ...branchCameras.map(c => ({
                        value: c.camera_id,
                        label: `${c.camera_id} - ${c.name}`
                      }))
                    ]}
                  />
                </div>

                {/* Camera Direction (Always enabled for all activities with dynamic options) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    CAMERA DIRECTION <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <CustomSelect
                    value={activityForm.camera_direction || getDefaultDirection(activityForm.name)}
                    onChange={e => setActivityForm({ ...activityForm, camera_direction: e.target.value })}
                    options={getCameraDirectionOptions(activityForm.name)}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleBackToBranches}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.375rem', width: '100px', height: '38px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!activityForm.name.trim() || !activityForm.camera_id}
                  style={{
                    background: (activityForm.name.trim() && activityForm.camera_id) ? 'var(--brand-primary, #006EB3)' : '#94a3b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0 1.5rem',
                    height: '38px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: (activityForm.name.trim() && activityForm.camera_id) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: (activityForm.name.trim() && activityForm.camera_id) ? '0 1px 2px rgba(16,185,129,0.2)' : 'none',
                    opacity: (activityForm.name.trim() && activityForm.camera_id) ? 1 : 0.7,
                    transition: 'all 0.15s ease'
                  }}
                >
                  Assign Activity
                </button>
              </div>
            </form>

            {/* Divider */}
            <div style={{ margin: '2.5rem 0 2rem 0', borderTop: '1px solid #e2e8f0' }} />

            {/* Assigned Activities Table Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span>Assigned Activities</span>
                    <span style={{ fontSize: '0.75rem', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', color: 'var(--brand-primary, #006EB3)', border: '1px solid rgba(0, 110, 179, 0.25)', padding: '0.15rem 0.65rem', borderRadius: '1rem', fontWeight: 700 }}>
                      {branchActivities.length} {branchActivities.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    Overview of all activities, types, and cameras configured for {selectedBranchForActivities.name}
                  </p>
                </div>
              </div>

              {activitiesLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  Loading assigned activities...
                </div>
              ) : branchActivities.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                  <Activity size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>No Activities Assigned Yet</p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Use the form above to assign cameras and types to this branch.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: 'var(--brand-primary, #006EB3)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 1rem', width: '60px' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Activity</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Type / Floor</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Assigned Camera</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Direction</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '100px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Trash2 size={13} /> Action
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchActivities.map((act, index) => {
                        const isDirIn = (act.camera_direction || '').toLowerCase().includes('in');
                        return (
                          <tr
                            key={act.id || index}
                            style={{ borderBottom: index < branchActivities.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontWeight: 600 }}>
                              {String(index + 1).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{act.name}</div>
                                  {act.activity_id && (
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>ID: {act.activity_id}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.875rem 1rem', color: '#334155', fontWeight: 600 }}>
                              {act.floor || 'Ground Floor'}
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              {act.camera_id ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.75rem' }}>
                                  <Video size={12} />
                                  <span>{act.camera_id}</span>
                                  {act.camera_name && <span style={{ color: '#6366f1', fontWeight: 500 }}>({act.camera_name})</span>}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Camera</span>
                              )}
                            </td>
                            <td style={{ padding: '0.875rem 1rem' }}>
                              {act.camera_direction ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  background: isDirIn ? '#ecfdf5' : '#eff6ff',
                                  color: isDirIn ? '#059669' : '#2563eb',
                                  border: `1px solid ${isDirIn ? '#a7f3d0' : '#bfdbfe'}`
                                }}>
                                  {isDirIn ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                  {act.camera_direction}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                title="Delete / Unassign Activity"
                                onClick={() => handleDeleteActivity(act)}
                                style={{
                                  background: '#fee2e2',
                                  border: '1px solid #fecaca',
                                  padding: '0.35rem 0.65rem',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  borderRadius: '0.375rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#fca5a5';
                                  e.currentTarget.style.color = '#b91c1c';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.color = '#dc2626';
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Success Toast */}
        {success && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '0.875rem 1.25rem',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: MAIN BRANCHES LISTING VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* ── Page Header ── */}
      <PageHeader
        title="Branches"
        subtitle="Manage organizational branches, activities, and operational locations"
        icon={Building2}
        user={user}
        onLogout={onLogout}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onNavigate={onNavigate}
      />

      {/* ── Top Controls & Filter Bar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.65rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        marginTop: '0.25rem'
      }}>
        {/* Left Side: Search + Dropdown Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '240px', maxWidth: '280px' }}>
            <Search size={16} className="epic-search-icon" />
            <input
              type="text"
              className="epic-search-input"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ width: '105px' }}>
            <CustomSelect
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              placeholder="Status"
              options={[
                { value: 'all', label: 'Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(range) => { setDateRange(range); setCurrentPage(1); }}
            onClear={() => { setDateRange({ startDate: '', endDate: '' }); setCurrentPage(1); }}
          />

          {(searchQuery !== '' || statusFilter !== 'all' || dateRange.startDate !== '' || dateRange.endDate !== '') && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDateRange({ startDate: '', endDate: '' }); setCurrentPage(1); }}
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

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          {hasPerm(user, 'add_branch') && (
            <button
              className="epic-btn epic-btn-primary"
              onClick={handleOpenAddBranch}
              style={{
                background: 'var(--brand-primary, #006EB3)',
                color: 'var(--brand-button-text, #ffffff)',
                border: 'none',
                borderRadius: '0.5rem',
                height: '38px',
                padding: '0 1.15rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px var(--brand-primary-tint, rgba(0, 110, 179, 0.2))'
              }}
            >
              <Plus size={16} /> Add Branch
            </button>
          )}
        </div>
      </div>

      {/* ── Main Table Content Area ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {(() => {
          const canEditBranches = hasAnyWritePerm(user, 'branch');
          const gridCols = canEditBranches ? '2.5fr 2.5fr 1.1fr 0.9fr 1.1fr 1.3fr 70px' : '2.5fr 2.5fr 1.1fr 0.9fr 1.1fr 1.3fr';
          return (
            <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '1rem', padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', letterSpacing: '0.05em' }}>
                <div>TITLE</div>
                <div>ADDRESS</div>
                <div>ACTIVITIES</div>
                <div>STAFF</div>
                <div>STATUS</div>
                <div>UPDATED AT</div>
                {canEditBranches && <div>ACTIONS</div>}
              </div>

              {/* Table Body */}
              <div>
                {loading ? (
                  <PageLoader />
                ) : currentBranches.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No branches found</div>
                ) : (
                  currentBranches.map((branch, idx) => (
                    <div
                      key={branch.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: gridCols,
                        gap: '1rem',
                        padding: '1rem 1.5rem',
                        borderBottom: idx < currentBranches.length - 1 ? '1px solid #f1f5f9' : 'none',
                        alignItems: 'center',
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                    >
                      {/* Branch Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '0.5rem', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary, #006EB3)', flexShrink: 0 }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{branch.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: BR-{String(branch.id).padStart(3, '0')}</div>
                        </div>
                      </div>

                      {/* Address */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={14} color="var(--brand-primary, #006EB3)" style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                            {branch.address || 'No address provided'}
                          </span>
                        </div>
                      </div>

                      {/* Activities Count */}
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                        {branch.activities ? branch.activities.length : (branch.activities_count || 0)}
                      </div>

                      {/* Staff Count */}
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                        {branch.staff_count || 0}
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span style={{ display: 'inline-flex', padding: '0.25rem 0.65rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: branch.status !== 'inactive' ? '#f0fdf4' : '#f1f5f9', color: branch.status !== 'inactive' ? '#166534' : '#64748b', border: branch.status !== 'inactive' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                          {branch.status !== 'inactive' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* UPDATED AT */}
                      <div style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>
                        {formatDate(branch.updated_at || branch.created_at)}
                      </div>

                      {/* Actions Menu */}
                      {hasAnyWritePerm(user, 'branch') && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', position: 'relative' }} ref={activeActionsMenu === branch.id ? actionsMenuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionsMenu(activeActionsMenu === branch.id ? null : branch.id);
                            }}
                            style={{ background: 'var(--bg-btn-premium, #f1f5f9)', border: 'none', borderRadius: '0.375rem', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted-premium, #64748b)' }}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeActionsMenu === branch.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: (currentBranches.length > 3 && idx >= currentBranches.length - 2) ? 'auto' : '32px',
                                bottom: (currentBranches.length > 3 && idx >= currentBranches.length - 2) ? '32px' : 'auto',
                                background: '#ffffff',
                                borderRadius: '0.5rem',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                                border: '1px solid #e2e8f0',
                                padding: '0.35rem 0',
                                zIndex: 50,
                                minWidth: '150px'
                              }}
                            >
                              {hasPerm(user, 'update_branch') && (
                                <button
                                  onClick={() => {
                                    setActiveActionsMenu(null);
                                    setEditingBranch({
                                      id: branch.id,
                                      name: branch.name,
                                      address: branch.address || '',
                                      status: branch.status || 'active'
                                    });
                                    setIsEditBranchOpen(true);
                                  }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: 500, color: '#475569', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <Edit size={14} /> Edit Branch
                                </button>
                              )}

                              {hasPerm(user, 'update_branch') && (
                                <button
                                  onClick={() => handleOpenActivitiesView(branch)}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: 500, color: 'var(--brand-primary, #006EB3)', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <Activity size={14} /> Assign Activity
                                </button>
                              )}

                              <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />

                              {hasPerm(user, ['status_branch', 'remove_branch']) && (
                                <button
                                  onClick={() => handleToggleBranchStatus(branch)}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: 500, color: branch.status === 'inactive' ? '#10b981' : '#64748b', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  {branch.status === 'inactive' ? <Eye size={14} /> : <EyeOff size={14} />}
                                  {branch.status === 'inactive' ? 'Active' : 'Inactive'}
                                </button>
                              )}

                              {hasPerm(user, ['remove_branch', 'delete_branch']) && (
                                <>
                                  <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />
                                  <button
                                    onClick={() => handleDeleteBranch(branch)}
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
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <Trash2 size={14} color="#dc2626" /> Delete Branch
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>

              {/* Table Footer / Pagination */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#fff', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '100px' }}>
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
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: currentPage <= 1 ? '#f1f5f9' : '#fff', color: currentPage <= 1 ? '#cbd5e1' : '#475569', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Prev
                    </button>

                    <span style={{ padding: '0.375rem 0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
                      {currentPage} / {totalPages || 1}
                    </span>

                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: currentPage >= totalPages ? '#f1f5f9' : '#fff', color: currentPage >= totalPages ? '#cbd5e1' : '#475569', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
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

      {/* ── Modal 1: Add Branch (Simple Branch Info Only) ── */}
      {isAddBranchOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add Branch</h3>
              <button onClick={() => setIsAddBranchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    TITLE<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter branch title..."
                    value={branchForm.name}
                    onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    ADDRESS<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter branch address..."
                    value={branchForm.address}
                    onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.375rem', width: '100px', height: '36px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', width: '100px', height: '36px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Edit Branch (Simple Branch Info Only) ── */}
      {isEditBranchOpen && editingBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit Branch</h3>
              <button onClick={() => setIsEditBranchOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    TITLE<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter branch title..."
                    value={editingBranch.name}
                    onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    ADDRESS<span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter branch address..."
                    value={editingBranch.address}
                    onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditBranchOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.375rem', width: '120px', height: '36px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', width: '120px', height: '36px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {success && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
