import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check, X } from 'lucide-react';

/**
 * CustomTimePicker - A beautiful, theme-compatible Time Selection Window for EPIC
 * Works seamlessly with 24-hour ('09:00', '17:00') or 12-hour ('09:00 AM') formats.
 */
export default function CustomTimePicker({
  value = '',
  onChange,
  placeholder = 'Select time...',
  disabled = false,
  dropUp = false,
  style = {},
  className = '',
  label = ''
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse time into 12-hour parts (hours 1-12, mins 0-59, ampm 'AM'/'PM')
  const parseTimeTo12h = (val) => {
    if (!val || typeof val !== 'string') {
      return { hour: 9, minute: 0, ampm: 'AM' };
    }
    const clean = val.trim().toUpperCase();
    let hour = 9;
    let minute = 0;
    let ampm = 'AM';

    if (clean.includes('AM') || clean.includes('PM')) {
      ampm = clean.includes('PM') ? 'PM' : 'AM';
      const parts = clean.replace(/AM|PM/g, '').trim().split(':');
      if (parts.length >= 2) {
        hour = parseInt(parts[0], 10) || 12;
        minute = parseInt(parts[1], 10) || 0;
      }
    } else if (clean.includes(':')) {
      const parts = clean.split(':');
      const h24 = parseInt(parts[0], 10) || 0;
      minute = parseInt(parts[1], 10) || 0;
      ampm = h24 >= 12 ? 'PM' : 'AM';
      hour = h24 % 12 || 12;
    }

    return {
      hour: hour >= 1 && hour <= 12 ? hour : 12,
      minute: minute >= 0 && minute <= 59 ? minute : 0,
      ampm
    };
  };

  const current12h = parseTimeTo12h(value);
  const [selectedHour, setSelectedHour] = useState(current12h.hour);
  const [selectedMinute, setSelectedMinute] = useState(current12h.minute);
  const [selectedAmpm, setSelectedAmpm] = useState(current12h.ampm);

  useEffect(() => {
    const p = parseTimeTo12h(value);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedAmpm(p.ampm);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Convert 12h to 24h string 'HH:MM'
  const to24hString = (h, m, ap) => {
    let h24 = h;
    if (ap === 'PM' && h < 12) h24 = h + 12;
    if (ap === 'AM' && h === 12) h24 = 0;
    return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Convert 12h to Display string 'HH:MM AM/PM'
  const toDisplayString = (val) => {
    if (!val) return '';
    const p = parseTimeTo12h(val);
    return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${p.ampm}`;
  };

  const handleApply = (h = selectedHour, m = selectedMinute, ap = selectedAmpm) => {
    const val24 = to24hString(h, m, ap);
    if (onChange) {
      // Support both event target style and raw value
      onChange({ target: { value: val24 } });
    }
    setOpen(false);
  };

  const handlePreset = (h, m, ap) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedAmpm(ap);
    handleApply(h, m, ap);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange({ target: { value: '' } });
    setOpen(false);
  };

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const presets = [
    { label: '09:00 AM', h: 9, m: 0, ap: 'AM' },
    { label: '11:00 AM', h: 11, m: 0, ap: 'AM' },
    { label: '01:00 PM', h: 1, m: 0, ap: 'PM' },
    { label: '02:00 PM', h: 2, m: 0, ap: 'PM' },
    { label: '05:00 PM', h: 5, m: 0, ap: 'PM' },
    { label: '06:00 PM', h: 6, m: 0, ap: 'PM' },
    { label: '08:45 PM', h: 8, m: 45, ap: 'PM' },
  ];

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', ...style }}
      className={`epic-custom-timepicker ${className}`}
    >
      {/* ── Trigger Box (Clicking anywhere opens the modal window) ── */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 0.75rem',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: `1px solid ${open ? 'var(--brand-primary, #006EB3)' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          minHeight: '38px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          <Clock size={15} color={open ? 'var(--brand-primary, #006EB3)' : '#64748b'} />
          <span style={{
            fontSize: '0.825rem',
            fontWeight: value ? 600 : 400,
            color: value ? '#0f172a' : '#94a3b8',
            fontFamily: value ? 'monospace' : 'inherit',
            letterSpacing: value ? '0.02em' : 'normal'
          }}>
            {value ? toDisplayString(value) : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {value && !disabled && (
            <span
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#64748b',
                cursor: 'pointer'
              }}
              title="Clear time"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            color="#64748b"
            style={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease'
            }}
          />
        </div>
      </div>

      {/* ── Theme-Compatible Popover Window ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            [dropUp ? 'bottom' : 'top']: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            width: '280px',
            background: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(0,0,0,0.12), 0 4px 6px rgba(0,0,0,0.04)',
            padding: '0.875rem',
            boxSizing: 'border-box',
            animation: 'fadeInTimePicker 0.15s ease-out'
          }}
        >
          {/* Header & AM/PM Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label || 'Select Time'}
            </span>

            {/* AM / PM Segmented Control */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '0.375rem'
            }}>
              {['AM', 'PM'].map(ap => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => setSelectedAmpm(ap)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    border: 'none',
                    borderRadius: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedAmpm === ap ? 'var(--brand-primary, #006EB3)' : 'transparent',
                    color: selectedAmpm === ap ? '#ffffff' : '#64748b',
                    boxShadow: selectedAmpm === ap ? '0 1px 2px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* Time Picker Columns (Hours & Minutes) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {/* Hours Column */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem', textAlign: 'center' }}>
                HOURS
              </div>
              <div style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid #f1f5f9',
                borderRadius: '0.4rem',
                padding: '2px',
                background: '#f8fafc'
              }}>
                {hoursList.map(h => (
                  <div
                    key={h}
                    onClick={() => setSelectedHour(h)}
                    style={{
                      padding: '0.3rem 0',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: selectedHour === h ? 700 : 500,
                      color: selectedHour === h ? '#ffffff' : '#334155',
                      background: selectedHour === h ? 'var(--brand-primary, #006EB3)' : 'transparent',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      marginBottom: '1px',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {String(h).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem', textAlign: 'center' }}>
                MINUTES
              </div>
              <div style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid #f1f5f9',
                borderRadius: '0.4rem',
                padding: '2px',
                background: '#f8fafc'
              }}>
                {minutesList.map(m => (
                  <div
                    key={m}
                    onClick={() => setSelectedMinute(m)}
                    style={{
                      padding: '0.3rem 0',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: selectedMinute === m ? 700 : 500,
                      color: selectedMinute === m ? '#ffffff' : '#334155',
                      background: selectedMinute === m ? 'var(--brand-primary, #006EB3)' : 'transparent',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      marginBottom: '1px',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {String(m).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div style={{ marginBottom: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              Quick Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {presets.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.h, p.m, p.ap)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.3rem',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))'; e.currentTarget.style.color = 'var(--brand-primary, #006EB3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply()}
              style={{
                flex: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                padding: '0.4rem 0.6rem',
                background: 'var(--brand-primary, #006EB3)',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
              }}
            >
              <Check size={13} /> Apply Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
