import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Calendar, RefreshCw, Search, ChevronLeft, ChevronRight, ChevronDown, Check, RotateCcw,
  Play, X, Users, CheckCircle, XCircle, Clock, AlertCircle,
  Eye, Filter, ArrowUpDown, Video, Loader2, Activity
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

import { API } from '../config';
import PageLoader from '../components/PageLoader';
import StaffAvatar from '../components/StaffAvatar';
import PageHeader from '../components/PageHeader';
import { hasPerm } from '../utils/permissions';

const STATUS_CONFIG = {
  recognized: { label: 'Recognized', color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  unrecognized: { label: 'Unrecognized', color: '#b45309', bg: '#fef3c7', icon: XCircle },
  no_face: { label: 'No Face', color: '#475569', bg: '#f1f5f9', icon: AlertCircle },
  pending: { label: 'Pending', color: '#1d4ed8', bg: '#dbeafe', icon: Clock },
};

/**
 * CameraFilterPicker — single hierarchical dropdown:
 *   All Cameras
 *   Attendance → Check In / Check Out
 *   Break → [Cafeteria 1 → Break In / Break Out] [Cafeteria 2 → Break In / Break Out]
 */
function CameraFilterPicker({ cameraType, subLocation, cameraRole, branchActivities = [], globalActivities = [], branchFilter, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(cameraType === 'all' ? 'attendance' : cameraType);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync activeCategory when cameraType changes
  useEffect(() => {
    if (cameraType && cameraType !== 'all') {
      setActiveCategory(cameraType);
    }
  }, [cameraType]);

  const getLabel = () => {
    if (cameraType === 'all') return 'Events';

    const actName = cameraType.charAt(0).toUpperCase() + cameraType.slice(1);

    if (subLocation && subLocation !== 'all') {
      if (cameraRole && cameraRole !== 'all') {
        const roleLabel = (cameraRole === 'checkin' || cameraRole === 'breakin') ? 'In' : 'Out';
        return `${actName}: ${subLocation} (${roleLabel})`;
      }
      return `${actName}: ${subLocation}`;
    }

    if (cameraRole && cameraRole !== 'all') {
      const roleLabel = (cameraRole === 'checkin' || cameraRole === 'breakin') ? 'Check In' : 'Check Out';
      return `${actName}: ${roleLabel}`;
    }

    return actName;
  };

  const isActive = cameraType !== 'all' || (subLocation && subLocation !== 'all') || (cameraRole && cameraRole !== 'all');

  const select = (type, subLoc, role) => {
    onChange(type, subLoc, role);
    setOpen(false);
  };

  // Group activities directly from Assign Activity records
  const activitiesList = useMemo(() => {
    const map = new Map();

    // 1. First add all assigned activities from branchActivities (filtered by branchFilter)
    (branchActivities || []).forEach(ba => {
      const rawName = (ba.name || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name: rawName,
          type: key,
          types: [],
          assignments: []
        });
      }

      const item = map.get(key);
      const floorVal = (ba.floor || '').trim();
      if (floorVal && !item.types.includes(floorVal)) {
        item.types.push(floorVal);
      }

      item.assignments.push({
        id: ba.id,
        floor: floorVal || 'Ground Floor',
        camera_id: ba.camera_id,
        camera_name: ba.camera_name,
        camera_direction: ba.camera_direction || ''
      });
    });

    // 2. If globalActivities has activities not yet in map, add them
    (globalActivities || []).forEach(ga => {
      const rawName = (ga.name || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!map.has(key)) {
        if (!branchFilter || branchFilter === 'all') {
          map.set(key, {
            name: rawName,
            type: key,
            types: Array.isArray(ga.types) ? ga.types.filter(t => t && t.trim()) : [],
            assignments: []
          });
        }
      } else {
        if (!branchFilter || branchFilter === 'all') {
          const item = map.get(key);
          if (Array.isArray(ga.types)) {
            ga.types.forEach(t => {
              const tr = (t || '').trim();
              if (tr && !item.types.includes(tr)) {
                item.types.push(tr);
              }
            });
          }
        }
      }
    });

    const result = Array.from(map.values());

    // Ensure Attendance and Break exist at least as fallbacks if DB is completely empty
    if (result.length === 0) {
      result.push({ name: 'Attendance', type: 'attendance', types: [], assignments: [] });
      result.push({ name: 'Break', type: 'break', types: [], assignments: [] });
    }

    return result;
  }, [branchActivities, globalActivities, branchFilter]);

  const selectedActivityObj = activitiesList.find(a => a.type === activeCategory) || activitiesList[0];

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.5rem 0.75rem',
          minHeight: '38px',
          border: `1px solid ${isActive ? '#10b981' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          background: isActive ? '#ecfdf5' : '#f8fafc',
          cursor: 'pointer',
          outline: 'none',
          fontWeight: 600,
          color: isActive ? '#059669' : '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s'
        }}
      >
        {getLabel()}
        <ChevronDown size={14} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: '#fff', borderRadius: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0', display: 'flex', overflow: 'hidden', minWidth: 490, maxHeight: 440
        }}>
          {/* Left Column: Activities List */}
          <div style={{ width: 180, background: '#f8fafc', borderRight: '1px solid #f1f5f9', padding: '0.5rem', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', padding: '0.4rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ACTIVITIES
            </div>

            {/* 1. All Events */}
            <div
              onClick={() => select('all', 'all', 'all')}
              onMouseEnter={() => setActiveCategory('all')}
              style={{
                padding: '0.5rem 0.65rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: (cameraType === 'all' && activeCategory === 'all') ? 700 : 500,
                color: (cameraType === 'all' && activeCategory === 'all') ? '#059669' : '#334155',
                background: (cameraType === 'all' && activeCategory === 'all') ? '#ecfdf5' : activeCategory === 'all' ? '#f1f5f9' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px'
              }}
            >
              <span>All Events</span>
              {cameraType === 'all' && <Check size={13} color="#059669" />}
            </div>

            {/* 2. Dynamic Assigned Activities */}
            {activitiesList.map(act => {
              const isSelectedCategory = (activeCategory === act.type);
              const isApplied = (cameraType === act.type);
              const totalItems = act.assignments && act.assignments.length > 0 ? act.assignments.length : act.types.length;
              return (
                <div
                  key={act.type}
                  onMouseEnter={() => setActiveCategory(act.type)}
                  onClick={() => setActiveCategory(act.type)}
                  style={{
                    padding: '0.5rem 0.65rem', borderRadius: '0.4rem', fontSize: '0.8rem',
                    fontWeight: (isSelectedCategory || isApplied) ? 700 : 500,
                    color: (isSelectedCategory || isApplied) ? '#059669' : '#334155',
                    background: isSelectedCategory ? '#ecfdf5' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{act.name}</span>
                    {totalItems > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={13} opacity={0.6} />
                </div>
              );
            })}
          </div>

          {/* Right Column: Assigned Types & Cameras (100% Dynamic from BranchActivity) */}
          <div style={{ flex: 1, minWidth: 300, maxWidth: 360, padding: '0.6rem', overflowY: 'auto' }}>
            {activeCategory === 'all' ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>All Events Selected</p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', lineHeight: '1.4' }}>
                  Shows all events across all activities and cameras.
                </p>
              </div>
            ) : selectedActivityObj ? (
              <>
                {/* 1. All [Activity] General Option */}
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', padding: '0.2rem 0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedActivityObj.name.toUpperCase()} - GENERAL
                </div>
                {(() => {
                  const isAllSel = cameraType === selectedActivityObj.type && (subLocation === 'all' || !subLocation) && (cameraRole === 'all' || !cameraRole);
                  return (
                    <div
                      onClick={() => select(selectedActivityObj.type, 'all', 'all')}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.8rem',
                        fontWeight: isAllSel ? 700 : 500,
                        color: isAllSel ? '#059669' : '#1e293b',
                        background: isAllSel ? '#ecfdf5' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}
                      onMouseEnter={e => !isAllSel && (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => !isAllSel && (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>All {selectedActivityObj.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>
                          All types & cameras for {selectedActivityObj.name}
                        </div>
                      </div>
                      {isAllSel && <Check size={14} color="#059669" />}
                    </div>
                  );
                })()}

                {/* 2. Dynamic Assigned Cameras & Types */}
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', padding: '0.4rem 0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>
                  ASSIGNED TYPES & CAMERAS ({selectedActivityObj.assignments?.length || selectedActivityObj.types?.length || 0})
                </div>

                {selectedActivityObj.assignments && selectedActivityObj.assignments.length > 0 ? (
                  selectedActivityObj.assignments.map((asgn, idx) => {
                    const roleParam = asgn.camera_direction
                      ? (asgn.camera_direction.toLowerCase().includes('in')
                        ? (selectedActivityObj.type === 'break' ? 'breakin' : 'checkin')
                        : (selectedActivityObj.type === 'break' ? 'breakout' : 'checkout'))
                      : 'all';

                    const isSel = cameraType === selectedActivityObj.type && subLocation === asgn.floor && (cameraRole === roleParam || roleParam === 'all');

                    return (
                      <div
                        key={asgn.id || idx}
                        onClick={() => select(selectedActivityObj.type, asgn.floor, roleParam)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: isSel ? 700 : 500,
                          color: isSel ? '#059669' : '#1e293b',
                          background: isSel ? '#ecfdf5' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '3px'
                        }}
                        onMouseEnter={e => !isSel && (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => !isSel && (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{asgn.floor}</span>
                            {asgn.camera_id && (
                              <span style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#3730a3', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                {asgn.camera_id}
                              </span>
                            )}
                            {asgn.camera_direction && (
                              <span style={{
                                fontSize: '0.65rem',
                                background: asgn.camera_direction.toLowerCase().includes('in') ? '#ecfdf5' : '#eff6ff',
                                color: asgn.camera_direction.toLowerCase().includes('in') ? '#059669' : '#2563eb',
                                border: `1px solid ${asgn.camera_direction.toLowerCase().includes('in') ? '#a7f3d0' : '#bfdbfe'}`,
                                padding: '0.05rem 0.35rem',
                                borderRadius: '0.25rem',
                                fontWeight: 700
                              }}>
                                {asgn.camera_direction}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>
                            {asgn.camera_id
                              ? `Assigned to ${asgn.camera_name || asgn.camera_id}${asgn.camera_direction ? ` (${asgn.camera_direction})` : ''}`
                              : `Filter events for ${asgn.floor}`}
                          </div>
                        </div>
                        {isSel && <Check size={14} color="#059669" />}
                      </div>
                    );
                  })
                ) : selectedActivityObj.types && selectedActivityObj.types.length > 0 ? (
                  selectedActivityObj.types.map(subT => {
                    const isSubSel = cameraType === selectedActivityObj.type && subLocation === subT;
                    return (
                      <div
                        key={subT}
                        onClick={() => select(selectedActivityObj.type, subT, 'all')}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: isSubSel ? 700 : 500,
                          color: isSubSel ? '#059669' : '#1e293b',
                          background: isSubSel ? '#ecfdf5' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px'
                        }}
                        onMouseEnter={e => !isSubSel && (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => !isSubSel && (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{subT}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>
                            Filter events for {subT}
                          </div>
                        </div>
                        {isSubSel && <Check size={14} color="#059669" />}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0.65rem' }}>
                    No specific types assigned for this activity in {branchFilter && branchFilter !== 'all' ? 'this branch' : 'the system'}.
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [viewDate, setViewDate] = useState(new Date(2026, 7, 1)); // Default August 2026 (03/08/26 video date)

  const popoverRef = useRef(null);
  const today = new Date();

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (dateFrom) {
      const parts = dateFrom.split('-');
      if (parts.length === 3) {
        const d1 = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        setTempStart(d1);
        setViewDate(new Date(d1.getFullYear(), d1.getMonth(), 1));
        if (dateTo) {
          const parts2 = dateTo.split('-');
          if (parts2.length === 3) {
            setTempEnd(new Date(Number(parts2[0]), Number(parts2[1]) - 1, Number(parts2[2])));
          } else {
            setTempEnd(d1);
          }
        } else {
          setTempEnd(d1);
        }
      }
    } else {
      setTempStart(null);
      setTempEnd(null);
    }
  }, [dateFrom, dateTo, open]);

  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const month = parts[1];
      const year = parts[0].slice(-2);
      return `${day}/${month}/${year}`;
    }
    return dStr;
  };

  const renderLabelText = () => {
    if (!dateFrom) return 'Duration';
    const s = formatDisplayDate(dateFrom);
    const e = formatDisplayDate(dateTo || dateFrom);
    return (dateFrom === dateTo || !dateTo) ? s : `${s} - ${e}`;
  };

  const handleDateClick = (dayDate) => {
    // Prevent future dates selection
    const todayCutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    if (dayDate > todayCutoff) return;

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dayDate);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dayDate < tempStart) {
        setTempStart(dayDate);
        setTempEnd(null);
      } else {
        setTempEnd(dayDate);
      }
    }
  };

  const formatDateStr = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleApply = () => {
    if (!tempStart) {
      onChange('', '');
    } else {
      const s = formatDateStr(tempStart);
      const e = tempEnd ? formatDateStr(tempEnd) : s;
      onChange(s, e);
    }
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', '');
    setTempStart(null);
    setTempEnd(null);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const yearsList = [2024, 2025, 2026, 2027, 2028].filter(y => y <= today.getFullYear());

  const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const isBetween = (d) => {
    if (!tempStart || !tempEnd) return false;
    return d > tempStart && d < tempEnd;
  };

  const isNextDisabled = (year > today.getFullYear()) || (year === today.getFullYear() && month >= today.getMonth());

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 0.75rem',
          minHeight: '38px',
          border: '1px solid',
          borderColor: dateFrom ? '#a7f3d0' : '#e2e8f0',
          borderRadius: '0.5rem',
          background: dateFrom ? '#ecfdf5' : '#f8fafc',
          color: dateFrom ? '#059669' : '#1e293b',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: 'none',
          transition: 'all 0.15s'
        }}
      >
        {dateFrom ? (
          <>
            <span>{renderLabelText()}</span>
            <span onClick={handleClear} style={{ display: 'flex', alignItems: 'center', color: '#059669', padding: '2px', borderRadius: '50%' }} title="Clear Date">
              <X size={14} />
            </span>
          </>
        ) : (
          <span>Duration</span>
        )}
        <Calendar size={15} color={dateFrom ? '#059669' : '#94a3b8'} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 100,
          width: '310px',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          border: '1px solid #f1f5f9',
          padding: '1.25rem',
          fontFamily: 'Inter, sans-serif'
        }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              style={{ width: 28, height: 28, borderRadius: '50%', background: '#ecfdf5', border: 'none', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <CustomSelect
                value={month}
                onChange={e => setViewDate(new Date(year, Number(e.target.value), 1))}
                options={monthsList.map((m, idx) => ({ value: idx, label: m, disabled: year === today.getFullYear() && idx > today.getMonth() }))}
                style={{ height: '32px', minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
              />
              <CustomSelect
                value={year}
                onChange={e => setViewDate(new Date(Number(e.target.value), month, 1))}
                options={yearsList.map(y => ({ value: y, label: String(y) }))}
                style={{ height: '32px', minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
              />
            </div>
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={() => !isNextDisabled && setViewDate(new Date(year, month + 1, 1))}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isNextDisabled ? '#f1f5f9' : '#ecfdf5',
                border: 'none',
                color: isNextDisabled ? '#cbd5e1' : '#059669',
                cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of Week */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0', marginBottom: '1.25rem' }}>
            {calendarDays.map((item, idx) => {
              const isStart = isSameDay(item.date, tempStart);
              const isEnd = isSameDay(item.date, tempEnd);
              const inRange = isBetween(item.date);
              const isSelected = isStart || isEnd;

              const todayCutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
              const isFuture = item.date > todayCutoff;

              let borderRadius = '0';
              if (isStart && isEnd) borderRadius = '50%';
              else if (isStart) borderRadius = '50% 0 0 50%';
              else if (isEnd) borderRadius = '0 50% 50% 0';

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={isFuture}
                  onClick={() => handleDateClick(item.date)}
                  style={{
                    height: '34px',
                    border: 'none',
                    background: isSelected ? '#059669' : inRange ? '#d1fae5' : 'transparent',
                    color: isSelected ? '#fff' : isFuture ? '#e2e8f0' : !item.isCurrentMonth ? '#cbd5e1' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: isSelected ? (isStart && !tempEnd ? '50%' : borderRadius) : '0',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s'
                  }}
                >
                  {item.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApply}
            style={{
              width: '100%',
              padding: '0.625rem',
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '0.625rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#047857'}
            onMouseLeave={e => e.currentTarget.style.background = '#059669'}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default function EventsDashboardPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [cameraRole, setCameraRole] = useState('all');
  const [cameraType, setCameraType] = useState('all');
  const [subLocation, setSubLocation] = useState('all');
  const [cafeterias, setCafeterias] = useState([]);
  const [globalActivities, setGlobalActivities] = useState([]);
  const [branchActivities, setBranchActivities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('timestamp');
  const [order, setOrder] = useState('desc');

  // Video player
  const [videoPanel, setVideoPanel] = useState(null); // { videoId, seekSeconds, filename }
  const videoRef = useRef(null);

  const fetchBranches = useCallback(async () => {
    try {
      const r = await fetch(`${API}/branches`);
      if (r.ok) setBranches(await r.json());
    } catch { }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const qs = branchFilter !== 'all' ? `?branch_id=${branchFilter}` : '';
      const r = await fetch(`${API}/api/v1/departments${qs}`);
      if (r.ok) setDepartments(await r.json());
    } catch { }
  }, [branchFilter]);

  const fetchCafeterias = useCallback(async () => {
    try {
      const params = new URLSearchParams({ camera_type: 'break' });
      if (branchFilter !== 'all') params.set('branch_id', branchFilter);
      const r = await fetch(`${API}/api/v1/cameras/locations?${params}`);
      if (r.ok) setCafeterias(await r.json());
      else setCafeterias([]);
    } catch { setCafeterias([]); }
  }, [branchFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v1/events/stats`);
      if (r.ok) setStats(await r.json());
    } catch { }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: perPage, sort_by: sortBy, order });
      if (staffSearch) params.set('staff', staffSearch);
      if (cameraRole !== 'all') params.set('camera_role', cameraRole);
      if (cameraType !== 'all') params.set('camera_type', cameraType);
      if (subLocation !== 'all') params.set('sub_location', subLocation);
      if (statusFilter !== 'all') params.set('status_filter', statusFilter);
      if (branchFilter !== 'all') params.set('branch_id', branchFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);


      const r = await fetch(`${API}/api/v1/events?${params}`);
      if (r.ok) {
        const data = await r.json();
        setEvents(data.data || []);
        setTotalPages(data.total_pages || 0);
        setTotal(data.total || 0);
      }
    } catch { } finally { setLoading(false); }
  }, [page, perPage, sortBy, order, staffSearch, cameraRole, cameraType, subLocation, statusFilter, branchFilter, departmentFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
    fetchBranches();
    fetch(`${API}/api/v1/global-activities`).then(r => r.ok ? r.json() : []).then(setGlobalActivities).catch(() => { });
  }, []);
  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  useEffect(() => {
    const qs = (branchFilter && branchFilter !== 'all') ? `?branch_id=${branchFilter}` : '';
    fetch(`${API}/api/v1/branch-activities${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(setBranchActivities)
      .catch(() => setBranchActivities([]));
  }, [branchFilter]);
  useEffect(() => { fetchCafeterias(); }, [fetchCafeterias]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleEventClick = async (eventId) => {
    try {
      const r = await fetch(`${API}/api/v1/events/${eventId}`);
      if (!r.ok) return;
      const ev = await r.json();
      if (ev.video) {
        setVideoPanel({
          videoId: ev.video.id,
          seekSeconds: ev.video.seek_seconds || 0,
          filename: ev.video.filename,
          eventTimestamp: ev.timestamp,
          staffName: ev.employee_name || ev.staff_name || ev.STAFF_name,
        });
      }
    } catch { }
  };

  useEffect(() => {
    if (videoPanel && videoRef.current) {
      videoRef.current.currentTime = videoPanel.seekSeconds;
    }
  }, [videoPanel]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const renderEventBadge = (ev) => {
    const role = (ev.camera_role || '').toLowerCase();
    const type = (ev.event_type || '').toLowerCase();

    // 1. Break In
    if (role === 'breakin' || type === 'break in') {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap'
          }}>
            <span> </span>
            <span>Break In</span>
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Break Session</span>
        </div>
      );
    }

    // 2. Break Out
    if (role === 'breakout' || type === 'break out') {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: '#f3e8ff',
            color: '#7e22ce',
            border: '1px solid #e9d5ff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap'
          }}>
            <span>Break Out</span>
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Break Session</span>
        </div>
      );
    }

    // 3. Attendance Check In
    if (role === 'checkin' || type === 'check_in' || type === 'check in') {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span>Check In</span>
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Attendance</span>
        </div>
      );
    }

    // 4. Attendance Check Out
    if (role === 'checkout' || type === 'check_out' || type === 'check out') {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '0.375rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
            <span>Check Out</span>
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Attendance</span>
        </div>
      );
    }

    // 5. General Attendance / Passage
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{
          padding: '0.25rem 0.65rem',
          borderRadius: '0.375rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #e2e8f0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          whiteSpace: 'nowrap'
        }}>
          <span>🏢</span>
          <span>Attendance</span>
        </span>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{ev.event_type || 'Passage'}</span>
      </div>
    );
  };

  const statCards = stats ? [
    { label: 'Total Events', value: stats.total, color: '#3b82f6', bg: '#dbeafe', icon: Calendar },
    { label: 'Recognized', value: stats.recognized, color: '#059669', bg: '#d1fae5', icon: CheckCircle },
    { label: 'Unrecognized', value: stats.unrecognized, color: '#b45309', bg: '#fef3c7', icon: XCircle },
    { label: 'No Face', value: stats.no_face, color: '#475569', bg: '#f1f5f9', icon: AlertCircle },
    { label: 'Pending', value: stats.pending, color: '#1d4ed8', bg: '#eff6ff', icon: Clock },
    { label: 'Unique Staff', value: stats.unique_staff, color: '#7c3aed', bg: '#ede9fe', icon: Users },
  ] : [];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <PageHeader title="Events" icon={Activity} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Filters Container */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.875rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 220, flex: '1 1 240px', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by staff name or ID..."
                value={staffSearch}
                onChange={e => { setStaffSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  minHeight: '38px',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  outline: 'none',
                  background: '#f8fafc',
                  fontWeight: 600,
                  color: '#1e293b',
                  transition: 'all 0.15s'
                }}
                onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#10b981'; }}
                onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            {/* Branch Filter */}
            <CustomSelect
              value={branchFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setBranchFilter(val);
                setDepartmentFilter('all');
                setSubLocation('all');
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Branches' },
                ...branches.map(b => ({ value: String(b.id), label: b.name }))
              ]}
              style={{ minWidth: 150 }}
            />

            {/* Department Filter */}
            <CustomSelect
              value={departmentFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setDepartmentFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Departments' },
                ...departments.map(d => ({ value: d.name, label: d.name }))
              ]}
              style={{ minWidth: 160 }}
            />

            {/* Camera Filter — single hierarchical picker */}
            <CameraFilterPicker
              cameraType={cameraType}
              subLocation={subLocation}
              cameraRole={cameraRole}
              branchActivities={branchActivities}
              globalActivities={globalActivities}
              branchFilter={branchFilter}
              onChange={(type, loc, role) => {
                setCameraType(type);
                setSubLocation(loc);
                setCameraRole(role);
                setPage(1);
              }}
            />

            {/* Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Status' },
                { value: 'recognized', label: 'Recognized' },
                { value: 'unrecognized', label: 'Unrecognized' },
                { value: 'no_face', label: 'No Face' },
                { value: 'pending', label: 'Pending' }
              ]}
              style={{ minWidth: 140 }}
            />

            {/* Custom Date Range Picker */}
            <CustomDatePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(f, t) => {
                setDateFrom(f);
                setDateTo(t);
                setPage(1);
              }}
            />
            {/* Clear Filters Button — sits right next to the filters! */}
            {(staffSearch || cameraType !== 'all' || subLocation !== 'all' || cameraRole !== 'all' || statusFilter !== 'all' || branchFilter !== 'all' || departmentFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setStaffSearch('');
                  setCameraType('all');
                  setSubLocation('all');
                  setCameraRole('all');
                  setStatusFilter('all');
                  setBranchFilter('all');
                  setDepartmentFilter('all');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  fontSize: '0.82rem',
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
        </div>

        {/* Category Quick Switcher: All Events | Attendance | Break */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{
            display: 'inline-flex',
            gap: '0.35rem',
            background: '#fff',
            borderRadius: '0.75rem',
            padding: '0.3rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {[
              { id: 'all', label: 'All Events' },
              { id: 'attendance', label: '🏢 Attendance' },
              { id: 'break', label: '  Break Sessions' }
            ].map(cat => {
              const active = cameraType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCameraType(cat.id);
                    setCameraRole('all');
                    setSubLocation('all');
                    setPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 1.15rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 600,
                    background: active ? '#1e293b' : 'transparent',
                    color: active ? '#fff' : '#64748b',
                    boxShadow: active ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            Showing <span style={{ color: '#0f172a', fontWeight: 700 }}>{events.length}</span> of <span style={{ color: '#0f172a', fontWeight: 700 }}>{(total || 0).toLocaleString()}</span> events
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Table */}
          <div style={{ flex: 1, background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <PageLoader />
            ) : events.length === 0 ? (
              <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>
                <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>No events match your filters.</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>Try adjusting or clearing your filter criteria.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {[
                          { label: 'BRANCH' },
                          { label: 'STAFF' },
                          { label: 'DEPARTMENT' },
                          { label: 'EVENT TYPE' },
                          { label: 'TIMESTAMP' },
                          { label: 'CAMERA / TRACK ID' },
                          { label: 'MATCH SCORE' },
                          { label: 'STATUS' },
                          { label: 'ACTION' },
                        ].map((col, idx) => (
                          <th key={idx}
                            style={{ padding: '0.875rem 0.875rem', textAlign: 'left', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => {
                        const sc = STATUS_CONFIG[ev.recognition_status] || STATUS_CONFIG.pending;
                        const confPct = Math.round((ev.recognition_confidence || 0) * 100);
                        const StatusIcon = sc.icon;

                        // Format timestamp: "30 Jul 2026, 08:55:00"
                        let formattedTs = ev.timestamp || '—';
                        if (ev.timestamp && ev.timestamp.includes('-')) {
                          const parts = ev.timestamp.split(' ');
                          const dateParts = parts[0].split('-');
                          if (dateParts.length === 3) {
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const mIdx = parseInt(dateParts[1], 10) - 1;
                            if (mIdx >= 0 && mIdx < 12) {
                              formattedTs = `${dateParts[0]} ${monthNames[mIdx]} ${dateParts[2]}${parts[1] ? ', ' + parts[1] : ''}`;
                            }
                          }
                        }

                        return (
                          <tr key={ev.id}
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => handleEventClick(ev.id)}>

                            {/* 1. BRANCH */}
                            <td style={{ padding: '0.75rem 0.875rem', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {ev.branch_name || 'Main Branch'}
                            </td>

                            {/* 2. STAFF */}
                            <td style={{ padding: '0.75rem 0.875rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.825rem' }}>
                                  {ev.STAFF_name || ev.staff_name || ev.employee_name || 'Unknown'}
                                </div>
                                {(ev.STAFF || ev.staff_id || ev.employee_id) && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                                    {ev.STAFF || ev.staff_id || ev.employee_id}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 3. DEPARTMENT */}
                            <td style={{ padding: '0.75rem 0.875rem', color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>
                              {ev.department || 'General'}
                            </td>

                            {/* 4. DIRECTION / EVENT TYPE */}
                            <td style={{ padding: '0.75rem 0.875rem' }}>
                              {renderEventBadge(ev)}
                            </td>

                            {/* 5. TIMESTAMP */}
                            <td style={{ padding: '0.75rem 0.875rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formattedTs}
                            </td>

                            {/* 6. CAMERA / TRACK ID */}
                            <td style={{ padding: '0.75rem 0.875rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                              {ev.sub_location || 'Cam 01'} <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.7rem' }}>({`#TRK-${ev.track_id}`})</span>
                            </td>

                            {/* 7. MATCH SCORE */}
                            <td style={{ padding: '0.75rem 0.875rem' }}>
                              {confPct > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${confPct}%`, background: confPct >= 60 ? '#10b981' : confPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{confPct}%</span>
                                </div>
                              ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>

                            {/* 8. STATUS */}
                            <td style={{ padding: '0.75rem 0.875rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '2rem', fontSize: '0.68rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                                <StatusIcon size={12} /> {sc.label}
                              </span>
                            </td>

                            {/* 9. ACTION */}
                            <td style={{ padding: '0.75rem 0.875rem' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleEventClick(ev.id); }}
                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '0.3rem 0.6rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                                onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                                title="Play video at this moment">
                                <Play size={12} /> Video
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Per page:</span>
                      <CustomSelect
                        value={perPage}
                        onChange={val => { setPerPage(Number(val)); setPage(1); }}
                        dropUp={true}
                        style={{ minWidth: 70 }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </CustomSelect>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          padding: '0.35rem 0.65rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          background: page <= 1 ? '#f1f5f9' : '#fff',
                          color: page <= 1 ? '#94a3b8' : '#334155',
                          cursor: page <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          transition: 'all 0.15s'
                        }}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>

                      <div style={{
                        padding: '0.35rem 0.75rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        borderRadius: '0.375rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)'
                      }}>
                        {page} / {totalPages || 1}
                      </div>

                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          padding: '0.35rem 0.65rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0.375rem',
                          background: page >= totalPages ? '#f1f5f9' : '#fff',
                          color: page >= totalPages ? '#94a3b8' : '#334155',
                          cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          transition: 'all 0.15s'
                        }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Video Player Panel */}
          {videoPanel && (
            <div style={{ width: 420, flexShrink: 0, background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', alignSelf: 'flex-start', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: '#0f172a', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                  <Video size={16} /> Video Player
                </div>
                <button onClick={() => setVideoPanel(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
              <video
                ref={videoRef}
                src={`${API}/videos/stream/${videoPanel.videoId}`}
                controls autoPlay
                style={{ width: '100%', display: 'block', background: '#000' }}
                onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = videoPanel.seekSeconds; }}
              />
              <div style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>EVENT DETAILS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#94a3b8' }}>File:</span> <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.72rem' }}>{videoPanel.filename}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Jump:</span> <span style={{ color: '#3b82f6', fontWeight: 700 }}>{videoPanel.seekSeconds}s</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Time:</span> <span style={{ color: '#0f172a', fontWeight: 600 }}>{videoPanel.eventTimestamp || '—'}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Staff:</span> <span style={{ color: '#0f172a', fontWeight: 600 }}>{videoPanel.staffName || '—'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
