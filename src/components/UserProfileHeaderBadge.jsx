import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Key, User, ChevronDown, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../config';

export default function UserProfileHeaderBadge({ user, onLogout, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setModalError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setModalError('New password must be at least 6 characters.');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to change password.');
      }

      setModalSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto close modal after 2 seconds
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setModalSuccess(null);
      }, 2000);

    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const getDisplayName = () => {
    const raw = user?.full_name || user?.username || 'PICS Super Admin';
    return raw.replace(/\bEPIC\b/gi, 'PICS');
  };

  const getDisplayRole = () => {
    if (user?.is_super_admin) return 'Super Admin';
    if (!user?.role) return 'User';
    return (user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')).replace(/\bEPIC\b/gi, 'PICS');
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Profile Header Button wrapper */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* User pic circle */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary, #006EB3)',
            border: '1.5px solid var(--brand-border-accent, rgba(0, 110, 179, 0.16))',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <User size={19} style={{ strokeWidth: 2.2 }} />
        </div>

        {/* Name + Role */}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', padding: '0 6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading, #0f172a)', lineHeight: 1.2 }}>
            {getDisplayName()}
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--brand-primary, #006EB3)', lineHeight: 1.2, marginTop: '1px' }}>
            {getDisplayRole()}
          </span>
        </div>

        {/* Chevron button */}
        <div
          style={{
            width: '26px',
            height: '26px',
            background: 'var(--bg-hover, #f1f5f9)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted, #64748b)',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <ChevronDown size={15} style={{ strokeWidth: 2.2 }} />
        </div>
      </div>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            width: '200px',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-primary, #e2e8f0)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 110, 179, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Change Password Item */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onNavigate) onNavigate('forgot-password');
              else setIsChangePasswordOpen(true);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Key size={15} style={{ color: 'var(--brand-primary, #006EB3)' }} />
            Change Password
          </button>

          {/* Logout Item */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              if (onLogout) {
                onLogout();
              } else {
                localStorage.removeItem('epic_user');
                sessionStorage.removeItem('epic_user');
                window.location.href = '/';
              }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#ef4444',
              borderTop: '1px solid #f1f5f9',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={15} style={{ color: '#ef4444' }} />
            Logout
          </button>
        </div>
      )}

      {/* Change Password Modal Overlay */}
      {isChangePasswordOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setIsChangePasswordOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#ffffff',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 110, 179, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderRadius: '1rem',
              padding: '1.75rem',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {modalError && (
                <div style={{ padding: '0.75rem', borderRadius: '0.375rem', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '0.8rem', fontWeight: 500 }}>
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div style={{ padding: '0.75rem', borderRadius: '0.375rem', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#10b981', fontSize: '0.8rem', fontWeight: 500 }}>
                  {modalSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>CURRENT PASSWORD</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  style={{
                    height: '42px',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-primary, #006EB3)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 110, 179, 0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-primary, #e2e8f0)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>NEW PASSWORD</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  style={{
                    height: '42px',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-primary, #006EB3)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 110, 179, 0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-primary, #e2e8f0)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>CONFIRM NEW PASSWORD</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  style={{
                    height: '42px',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-primary, #006EB3)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 110, 179, 0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-primary, #e2e8f0)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="epic-btn epic-btn-primary"
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                {modalLoading ? <Loader2 size={16} className="epic-animate-spin" /> : 'Save Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
