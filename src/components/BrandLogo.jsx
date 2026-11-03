import React from 'react';

/**
 * BrandLogo — PICS Brand Identity Component
 *
 * Official Brand Assets:
 *   - Logo Mark: Stylized xpanzion "X" icon (/xpanzion-mark.png)
 *   - Primary Brand Name: PICS
 *   - Supporting Brand Text: Pics by xpanzion
 *
 * Props:
 *   variant            — 'sidebar' | 'login' | 'auth'
 *   showSupportingText — boolean (default: false)
 *   collapsed          — boolean (default: false, for sidebar)
 */

function SidebarBrand({ collapsed = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%',
        minHeight: '36px',
      }}
    >
      <img
        src="/xpanzion-mark.png"
        alt="PICS Logo"
        style={{
          width: collapsed ? '30px' : '32px',
          height: collapsed ? '30px' : '32px',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      />
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--brand-primary, #006EB3)',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
            }}
          >
            PICS
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--text-muted, #64748b)',
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            Pics by xpanzion
          </span>
        </div>
      )}
    </div>
  );
}

function LoginBrand({ showSupportingText }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '16px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
          boxShadow: '0 4px 16px rgba(0, 110, 179, 0.15)',
          border: '1px solid rgba(0, 110, 179, 0.15)',
        }}
      >
        <img
          src="/xpanzion-mark.png"
          alt="PICS Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <span
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '0.06em',
          lineHeight: 1,
          marginTop: '4px',
        }}
      >
        PICS
      </span>

      {showSupportingText && (
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 500,
            color: '#64748b',
            letterSpacing: '0.03em',
          }}
        >
          Pics by xpanzion
        </span>
      )}
    </div>
  );
}

function AuthBrand({ showSupportingText }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '14px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 5,
          boxShadow: '0 4px 14px rgba(0, 110, 179, 0.12)',
          border: '1px solid rgba(0, 110, 179, 0.15)',
        }}
      >
        <img
          src="/xpanzion-mark.png"
          alt="PICS Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <span
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '0.06em',
          lineHeight: 1,
          marginTop: '2px',
        }}
      >
        PICS
      </span>

      {showSupportingText && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#64748b',
            letterSpacing: '0.03em',
          }}
        >
          Pics by xpanzion
        </span>
      )}
    </div>
  );
}

export default function BrandLogo({ variant = 'sidebar', showSupportingText = false, collapsed = false }) {
  if (variant === 'login') {
    return <LoginBrand showSupportingText={showSupportingText} />;
  }
  if (variant === 'auth') {
    return <AuthBrand showSupportingText={showSupportingText} />;
  }
  return <SidebarBrand collapsed={collapsed} />;
}
