import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { API_BASE } from '../config';

export default function ReportFilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  branches = [],
  departments = [],
  cameras = [],
  activityTypes = [],
  initialFilters = {}
}) {
  const [selectedBranch, setSelectedBranch] = useState(initialFilters.branch || '');
  const [selectedDept, setSelectedDept] = useState(initialFilters.department || '');
  const [selectedActivityType, setSelectedActivityType] = useState(initialFilters.activityType || '');
  const [selectedType, setSelectedType] = useState(initialFilters.area || initialFilters.type || '');
  const [datePreset, setDatePreset] = useState(initialFilters.datePreset || 'Custom Range');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || new Date().toISOString().split('T')[0]);

  // Branch-specific activities loaded from API
  const [branchActivities, setBranchActivities] = useState([]);
  const [loadingBranchActs, setLoadingBranchActs] = useState(false);

  // Fetch activities for selected branch
  const fetchBranchActivities = useCallback(async (branchId) => {
    if (!branchId) {
      setBranchActivities([]);
      return;
    }
    setLoadingBranchActs(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/branch-activities?branch_id=${branchId}`);
      if (res.ok) {
        const data = await res.json();
        setBranchActivities(Array.isArray(data) ? data : []);
      } else {
        const res2 = await fetch(`${API_BASE}/api/v1/branches/${branchId}/activities`);
        if (res2.ok) {
          const data2 = await res2.json();
          setBranchActivities(Array.isArray(data2) ? data2 : []);
        } else {
          const b = branches.find(item => String(item.id) === String(branchId));
          setBranchActivities(b && Array.isArray(b.activities) ? b.activities : []);
        }
      }
    } catch {
      const b = branches.find(item => String(item.id) === String(branchId));
      setBranchActivities(b && Array.isArray(b.activities) ? b.activities : []);
    } finally {
      setLoadingBranchActs(false);
    }
  }, [branches]);

  // When modal opens or initial filters change
  useEffect(() => {
    if (isOpen) {
      setSelectedBranch(initialFilters.branch || '');
      setSelectedDept(initialFilters.department || '');
      setSelectedType(initialFilters.area || initialFilters.type || '');
      setDatePreset(initialFilters.datePreset || 'Custom Range');
      setDateFrom(initialFilters.dateFrom || new Date().toISOString().split('T')[0]);
      setDateTo(initialFilters.dateTo || new Date().toISOString().split('T')[0]);

      if (initialFilters.branch) {
        fetchBranchActivities(initialFilters.branch);
      } else {
        setBranchActivities([]);
      }
    }
  }, [isOpen, initialFilters, fetchBranchActivities]);

  // When branch dropdown selection changes
  const handleBranchChange = (newBranchId) => {
    setSelectedBranch(newBranchId);
    setSelectedType('');
    if (newBranchId) {
      fetchBranchActivities(newBranchId);
    } else {
      setBranchActivities([]);
    }
  };

  // 1. ACTIVITY TYPE (Strictly scoped to selected branch if chosen, otherwise global)
  const activityOptions = useMemo(() => {
    const list = [];
    
    if (selectedBranch) {
      // Find branch activities from state or from branches prop
      const branchActs = branchActivities.length > 0 
        ? branchActivities 
        : (branches.find(b => String(b.id) === String(selectedBranch))?.activities || []);

      if (branchActs.length > 0) {
        branchActs.forEach(act => {
          const rawName = (act.name || act.activity_id || '').trim();
          if (!rawName) return;
          const val = rawName.toLowerCase();
          if (!list.some(item => item.value === val)) {
            list.push({ value: val, label: rawName });
          }
        });
      } else if (!loadingBranchActs) {
        list.push({ value: '', label: 'No activities assigned to this branch' });
      }
      return list;
    }

    // No branch selected: list global activities
    if (activityTypes && activityTypes.length > 0) {
      activityTypes.forEach(act => {
        const rawName = (act.name || act.activity_id || '').trim();
        if (!rawName) return;
        const val = rawName.toLowerCase();
        if (!list.some(item => item.value === val)) {
          list.push({ value: val, label: rawName });
        }
      });
    }

    if (list.length === 0) {
      list.push(
        { value: 'attendance', label: 'Attendance' },
        { value: 'break', label: 'Break' }
      );
    }

    return list;
  }, [selectedBranch, branchActivities, branches, loadingBranchActs, activityTypes]);

  // Ensure selectedActivityType is valid for current branch
  useEffect(() => {
    if (activityOptions.length > 0) {
      const exists = activityOptions.some(opt => opt.value === selectedActivityType);
      if (!exists) {
        const firstValid = activityOptions.find(opt => opt.value !== '');
        setSelectedActivityType(firstValid ? firstValid.value : '');
        setSelectedType('');
      }
    }
  }, [activityOptions, selectedActivityType]);

  // 2. TYPES List: Shows the Types strictly for the selected Branch & Activity
  const dynamicTypesList = useMemo(() => {
    const typesMap = new Map();
    const actTypeLower = (selectedActivityType || '').toLowerCase().trim();
    if (!actTypeLower) return [];

    if (selectedBranch) {
      const branchActs = branchActivities.length > 0 
        ? branchActivities 
        : (branches.find(b => String(b.id) === String(selectedBranch))?.activities || []);

      const matchingBranchActs = branchActs.filter(act => {
        const actName = (act.name || '').toLowerCase().trim();
        const actId = (act.activity_id || '').toLowerCase().trim();
        return actName === actTypeLower || actId === actTypeLower;
      });

      matchingBranchActs.forEach(act => {
        const manualType = (act.floor || act.type || '').trim();
        if (manualType) {
          const key = manualType.toLowerCase();
          if (!typesMap.has(key)) {
            typesMap.set(key, {
              id: manualType,
              name: manualType,
              camera_id: act.camera_id
            });
          }
        }
      });

      // If branch activity exists but no specific floor string was entered, fallback to global activity types
      if (typesMap.size === 0 && matchingBranchActs.length > 0) {
        const matchingGlobal = (activityTypes || []).find(g => 
          (g.name || '').toLowerCase().trim() === actTypeLower ||
          (g.activity_id || '').toLowerCase().trim() === actTypeLower
        );
        if (matchingGlobal && Array.isArray(matchingGlobal.types)) {
          matchingGlobal.types.forEach(t => {
            const typeStr = String(t).trim();
            if (typeStr) {
              const key = typeStr.toLowerCase();
              if (!typesMap.has(key)) {
                typesMap.set(key, { id: typeStr, name: typeStr });
              }
            }
          });
        }
      }

      return Array.from(typesMap.values());
    }

    // No branch selected: show configured types from global activity
    const matchingGlobal = (activityTypes || []).find(g => 
      (g.name || '').toLowerCase().trim() === actTypeLower ||
      (g.activity_id || '').toLowerCase().trim() === actTypeLower
    );

    if (matchingGlobal && Array.isArray(matchingGlobal.types) && matchingGlobal.types.length > 0) {
      matchingGlobal.types.forEach(t => {
        const typeStr = String(t).trim();
        if (typeStr) {
          const key = typeStr.toLowerCase();
          if (!typesMap.has(key)) {
            typesMap.set(key, {
              id: typeStr,
              name: typeStr
            });
          }
        }
      });
    }

    return Array.from(typesMap.values());
  }, [selectedActivityType, selectedBranch, branchActivities, branches, activityTypes]);

  if (!isOpen) return null;

  // Format date helper: YYYY-MM-DD to DD/MM/YY
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    }
    return dateStr;
  };

  // Date range presets calculator
  const handlePresetSelect = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'Today') {
      const t = fmt(now);
      setDateFrom(t);
      setDateTo(t);
    } else if (preset === 'This Week') {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
      const end = new Date(mon);
      end.setDate(mon.getDate() + 6);
      setDateFrom(fmt(mon));
      setDateTo(fmt(end > now ? now : end));
    } else if (preset === 'Previous Week') {
      const day = now.getDay();
      const prevMon = new Date(now);
      prevMon.setDate(now.getDate() - day + (day === 0 ? -6 : 1) - 7);
      const prevSun = new Date(prevMon);
      prevSun.setDate(prevMon.getDate() + 6);
      setDateFrom(fmt(prevMon));
      setDateTo(fmt(prevSun));
    } else if (preset === 'This Month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(fmt(first));
      setDateTo(fmt(now));
    } else if (preset === 'Previous Month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(fmt(first));
      setDateTo(fmt(last));
    }
  };

  const handleToggleType = (typeName) => {
    // Single selection: toggle selection
    setSelectedType(prev => (prev === typeName ? '' : typeName));
  };

  const handleFindClick = () => {
    onApplyFilters({
      branch: selectedBranch,
      department: selectedDept,
      activityType: selectedActivityType,
      type: selectedType,
      area: selectedType,
      datePreset,
      dateFrom,
      dateTo
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '620px',
        padding: '1.75rem',
        animation: 'epicFadeIn 0.2s ease-out',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Configure Report Filters
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.35rem 0 0 0' }}>
              Set your filters below. The report table will load on the next step.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '0.4rem',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Row 1: Branch & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                BRANCH
              </label>
              <CustomSelect
                value={selectedBranch}
                onChange={e => handleBranchChange(e.target.value)}
                placeholder="Branch"
                options={[
                  { value: '', label: 'Branch' },
                  ...branches.map(b => ({ value: String(b.id), label: b.name }))
                ]}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                DEPARTMENT
              </label>
              <CustomSelect
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                placeholder="Department"
                options={[
                  { value: '', label: 'Department' },
                  ...departments.map(d => ({ value: d.name, label: d.name }))
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Row 2: Dynamic Activity Type (From Activities View / Global Activities) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
              ACTIVITY TYPE
            </label>
            <CustomSelect
              value={selectedActivityType}
              onChange={e => {
                setSelectedActivityType(e.target.value);
                setSelectedType('');
              }}
              options={activityOptions}
              style={{ width: '100%' }}
            />
          </div>

          {/* Row 3: Select Date Calendar */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              SELECT DATE
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setDateTo(e.target.value);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  background: '#fff'
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)' }}>
                {formatDateDisplay(dateFrom)}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '0.625rem',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFindClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.5rem',
              borderRadius: '0.625rem',
              border: 'none',
              background: 'var(--brand-primary, #006EB3)',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px var(--brand-primary-tint, rgba(0, 110, 179, 0.25))'
            }}
          >
            <Search size={15} />
            <span>Find</span>
          </button>
        </div>

      </div>
    </div>
  );
}
