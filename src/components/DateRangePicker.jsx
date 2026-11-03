import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function DateRangePicker({ startDate, endDate, onChange, onClear, label = "Last Updated" }) {
  const [isOpen, setIsOpen] = useState(false);

  // Calendar view state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Date selection state (Dates or null)
  const [selectionStart, setSelectionStart] = useState(startDate ? new Date(startDate) : null);
  const [selectionEnd, setSelectionEnd] = useState(endDate ? new Date(endDate) : null);
  const [hoverDate, setHoverDate] = useState(null);

  const popoverRef = useRef(null);

  // Synchronize props
  useEffect(() => {
    setSelectionStart(startDate ? new Date(startDate) : null);
    setSelectionEnd(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = today.getFullYear();
  const yearsList = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate days grid for month view
  const getCalendarGrid = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const grid = [];

    // Previous month padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      grid.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(viewYear, viewMonth, i);
      grid.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding to fill grid 35 or 42 cells
    const remaining = 35 - grid.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(viewYear, viewMonth + 1, i);
        grid.push({ date: d, isCurrentMonth: false });
      }
    }

    return grid;
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const handleDayClick = (cellDate) => {
    if (!selectionStart || (selectionStart && selectionEnd)) {
      // Start new selection
      setSelectionStart(cellDate);
      setSelectionEnd(null);
    } else if (selectionStart && !selectionEnd) {
      if (cellDate < selectionStart) {
        setSelectionStart(cellDate);
        setSelectionEnd(null);
      } else {
        setSelectionEnd(cellDate);
      }
    }
  };

  const handleApply = () => {
    const formatDateStr = (d) => {
      if (!d) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const sStr = formatDateStr(selectionStart);
    const eStr = formatDateStr(selectionEnd || selectionStart);

    onChange({ startDate: sStr, endDate: eStr });
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const getButtonText = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDateDisplay(startDate);
      return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    }
    if (startDate) return `From ${formatDateDisplay(startDate)}`;
    if (endDate) return `Until ${formatDateDisplay(endDate)}`;
    return label;
  };

  const hasFilter = Boolean(startDate || endDate);
  const calendarCells = getCalendarGrid();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          height: '38px',
          padding: '0 0.85rem',
          background: hasFilter ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))' : '#ffffff',
          border: hasFilter ? '1px solid var(--brand-primary, #006EB3)' : '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: hasFilter ? 600 : 500,
          color: hasFilter ? 'var(--brand-primary, #006EB3)' : '#475569',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <Calendar size={16} color={hasFilter ? 'var(--brand-primary, #006EB3)' : '#64748b'} />
        <span>{getButtonText()}</span>
        <ChevronDown size={14} color={hasFilter ? 'var(--brand-primary, #006EB3)' : '#94a3b8'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {/* Calendar Popover Panel matching user screenshot */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            width: '310px',
            background: '#ffffff',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
            padding: '1.25rem',
            animation: 'epicPopIn 0.15s ease-out'
          }}
        >
          {/* Header Controls: Arrow | Month | Year | Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '0.4rem',
                background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                border: 'none',
                color: 'var(--brand-primary, #006EB3)',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              &lt;
            </button>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {/* Month Select */}
              <CustomSelect
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                options={monthsList.map((m, idx) => ({ value: idx, label: m }))}
                style={{ height: '32px', minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
              />

              {/* Year Select */}
              <CustomSelect
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                options={yearsList.map(y => ({ value: y, label: String(y) }))}
                style={{ height: '32px', minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
              />
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '0.4rem',
                background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                border: 'none',
                color: 'var(--brand-primary, #006EB3)',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              &gt;
            </button>
          </div>

          {/* Weekday Names Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', marginBottom: '0.5rem' }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', padding: '0.25rem 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', marginBottom: '1.25rem' }}>
            {calendarCells.map((cell, idx) => {
              const cellDate = cell.date;
              const isCurrMonth = cell.isCurrentMonth;
              const isStart = isSameDay(cellDate, selectionStart);
              const isEnd = isSameDay(cellDate, selectionEnd);
              const isSelected = isStart || isEnd;

              const isInRange = selectionStart && selectionEnd && cellDate > selectionStart && cellDate < selectionEnd;
              const isHoverRange = selectionStart && !selectionEnd && hoverDate && cellDate > selectionStart && cellDate <= hoverDate;

              let cellBg = 'transparent';
              let cellColor = isCurrMonth ? '#0f172a' : '#cbd5e1';

              if (isSelected) {
                cellBg = 'var(--brand-primary, #006EB3)';
                cellColor = '#ffffff';
              } else if (isInRange || isHoverRange) {
                cellBg = 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))';
                cellColor = 'var(--brand-primary, #006EB3)';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cellDate)}
                  onMouseEnter={() => setHoverDate(cellDate)}
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.825rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: isSelected ? '0.4rem' : (isInRange ? '0' : '0.4rem'),
                    background: cellBg,
                    color: cellColor,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {cellDate.getDate()}
                </div>
              );
            })}
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApply}
            style={{
              width: '100%',
              height: '42px',
              background: 'var(--brand-primary, #006EB3)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
