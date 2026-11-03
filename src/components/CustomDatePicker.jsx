import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function CustomDatePicker({ value, onChange, placeholder = "Select date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Synchronize internal state with value prop
  const initialDate = value ? new Date(value) : null;
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(initialDate ? initialDate.getMonth() : today.getMonth());
  const [viewYear, setViewYear] = useState(initialDate ? initialDate.getFullYear() : today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    const d = value ? new Date(value) : null;
    setSelectedDate(d);
    if (d) {
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
    }
  }, [value]);

  // Close popover on clicking outside
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
  // Wider range for birth dates (85 years back to 5 years forward)
  const yearsList = Array.from({ length: 95 }, (_, i) => currentYear - 90 + i);

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

  const getCalendarGrid = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const grid = [];

    // Prev month padding
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

    // Next month padding to fill cells
    const remaining = 42 - grid.length; // Use standard 6 rows to prevent layout shifts
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      grid.push({ date: d, isCurrentMonth: false });
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
    const year = cellDate.getFullYear();
    const month = String(cellDate.getMonth() + 1).padStart(2, '0');
    const day = String(cellDate.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    onChange(formatted);
    setIsOpen(false);
  };

  const formatDateDisplay = (d) => {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calendarCells = getCalendarGrid();

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={popoverRef}>
      {/* Clickable Wrapper mimicking text input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '42px',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          padding: '0 1rem 0 2.5rem',
          fontSize: '0.875rem',
          outline: 'none',
          color: selectedDate ? '#0f172a' : '#94a3b8',
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'all 0.15s ease'
        }}
      >
        <Calendar 
          size={15} 
          style={{ 
            position: 'absolute', 
            left: '0.85rem', 
            color: selectedDate ? 'var(--brand-primary, #006EB3)' : '#94a3b8', 
            pointerEvents: 'none' 
          }} 
        />
        <span>{selectedDate ? formatDateDisplay(selectedDate) : placeholder}</span>
        <ChevronDown 
          size={14} 
          style={{ 
            position: 'absolute', 
            right: '0.85rem', 
            color: '#94a3b8', 
            transform: isOpen ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.2s ease' 
          }} 
        />
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: '310px',
            background: '#ffffff',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
            padding: '1.25rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Month/Year Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
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
              <CustomSelect
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                options={monthsList.map((m, idx) => ({ value: idx, label: m }))}
                style={{ height: '32px', minHeight: '32px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
              />

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

          {/* Days Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', marginBottom: '0.5rem' }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', padding: '0.25rem 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid of Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
            {calendarCells.map((cell, idx) => {
              const cellDate = cell.date;
              const isCurrMonth = cell.isCurrentMonth;
              const isSelected = isSameDay(cellDate, selectedDate);

              let cellBg = 'transparent';
              let cellColor = isCurrMonth ? '#0f172a' : '#cbd5e1';

              if (isSelected) {
                cellBg = 'var(--brand-primary, #006EB3)';
                cellColor = '#ffffff';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cellDate)}
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.825rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '0.4rem',
                    background: cellBg,
                    color: cellColor,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {cellDate.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
