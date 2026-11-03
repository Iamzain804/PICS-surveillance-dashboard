import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder,
  className = '',
  style = {},
  disabled = false,
  dropUp = false,
  name
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  // Floating Dropdown Menu
  // (within component render)
  // ...
  // style:
  //   position: 'absolute',
  //   ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),

  // Normalize options array from props or React children (<option>)
  const parsedOptions = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : opt.name),
            label: opt.label !== undefined ? opt.label : (opt.name !== undefined ? opt.name : opt.value)
          };
        }
        return { value: opt, label: String(opt) };
      });
    }

    if (children) {
      const childArray = React.Children.toArray(children);
      return childArray
        .filter(child => React.isValidElement(child) && child.type === 'option')
        .map(child => ({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children
        }));
    }

    return [];
  }, [options, children]);

  // Find selected item label
  const selectedOption = parsedOptions.find(
    opt => String(opt.value) === String(value)
  );

  const isPlaceholderSelected = !value || String(value) === '' || (selectedOption && String(selectedOption.value) === '');

  const displayLabel = selectedOption
    ? selectedOption.label
    : (placeholder || (parsedOptions[0] ? parsedOptions[0].label : 'Select...'));

  const [shouldDropUp, setShouldDropUp] = useState(dropUp);

  useEffect(() => {
    if (isOpen) {
      if (dropUp) {
        setShouldDropUp(true);
        return;
      }
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 240 && spaceAbove > spaceBelow) {
          setShouldDropUp(true);
        } else {
          setShouldDropUp(false);
        }
      }
    }
  }, [isOpen, dropUp]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue) => {
    setIsOpen(false);
    if (onChange) {
      // Simulate standard event object for seamless compatibility with e.target.value handlers
      const syntheticEvent = {
        target: { value: optValue, name },
        currentTarget: { value: optValue, name },
        value: optValue
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`epic-custom-select-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Trigger Button */}
      {(() => {
        const isActive = (value && value !== 'all' && value !== '') || isOpen;
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              width: '100%',
              minHeight: '38px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#0f172a',
              background: disabled ? '#f8fafc' : '#ffffff',
              border: isOpen ? '1px solid var(--brand-primary, #006EB3)' : '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              outline: 'none',
              boxShadow: isOpen ? '0 0 0 3px var(--brand-primary-tint, rgba(0, 110, 179, 0.15))' : 'none',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayLabel}
            </span>
            <ChevronDown
              size={15}
              style={{
                color: isActive ? 'var(--brand-primary, #006EB3)' : '#94a3b8',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                flexShrink: 0
              }}
            />
          </button>
        );
      })()}

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(shouldDropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            left: 0,
            width: '100%',
            minWidth: '160px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: 'var(--bg-card-premium, #ffffff)',
            border: '1px solid var(--border-premium, #e2e8f0)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
            padding: '0.35rem',
            zIndex: 99999,
            animation: 'epicFadeIn 0.15s ease-out'
          }}
        >
          {parsedOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={`${opt.value}-${idx}`}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-hover-premium, #f1f5f9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--brand-primary, #006EB3)' : '#1e293b',
                  background: isSelected ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ color: isSelected ? 'var(--brand-primary, #006EB3)' : '#1e293b', fontWeight: isSelected ? 700 : 500 }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check size={14} style={{ color: 'var(--brand-primary, #006EB3)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
