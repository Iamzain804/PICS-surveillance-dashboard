import React, { useState } from 'react';

export default function StaffAvatar({ name = '', profilePicture = '', size = 40, style = {}, className = '' }) {
  const [imgError, setImgError] = useState(false);

  // Compute initials from name (e.g. "John Doe" -> "JD", "Ali Khan" -> "AK", "" -> "ST")
  const initials = React.useMemo(() => {
    if (!name || typeof name !== 'string') return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const hasImage = profilePicture && typeof profilePicture === 'string' && profilePicture.trim() !== '' && !imgError;

  return (
    <div
      className={`epic-staff-avatar ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'var(--bg-avatar-premium, #ecfdf5)',
        border: '1px solid var(--border-avatar-premium, #a7f3d0)',
        color: 'var(--epic-green, #10b981)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${Math.round(size * 0.4)}px`,
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        letterSpacing: '0.02em',
        ...style
      }}
    >
      {hasImage ? (
        <img
          src={profilePicture}
          alt={name || 'Staff Avatar'}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
