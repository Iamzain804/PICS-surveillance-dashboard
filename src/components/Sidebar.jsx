import React from 'react';
import {
  FileText,
  MapPin,
  Users,
  Cpu,
  Calendar,
  Building2,
  Camera,
  Activity,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const NAV_ITEMS = [
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'branches', label: 'Branches', icon: MapPin },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'activities', label: 'Activities', icon: Activity },
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'pipeline', label: 'AI Pipeline', icon: Cpu },
];

export default function Sidebar({ activePage, onNavigate, user, collapsed }) {
  const hasPermission = (itemKey) => {
    if (!user) return false;
    if (user.is_super_admin || user.username === 'admin' || user.role === 'admin' || (user.permissions && user.permissions.includes('*'))) return true;
    const permissions = user.permissions || [];
    switch (itemKey) {
      case 'dashboard':
        return true; // accessible to all logged in users
      case 'pipeline':
        return permissions.includes('control_pipeline');
      case 'events':
        return permissions.includes('view_events');
      case 'reports':
        return permissions.includes('view_reports');
      case 'branches':
        return permissions.includes('view_branch');
      case 'departments':
        return permissions.includes('view_department');
      case 'cameras':
        return true; // accessible to authorized users
      case 'activities':
        return true; // accessible to authorized users
      case 'staff':
        return permissions.includes('view_staff');
      case 'roles':
        return permissions.includes('manage_roles');
      case 'logs':
        return permissions.includes('view_logs');
      default:
        return false;
    }
  };

  const visibleNavItems = NAV_ITEMS.filter(item => hasPermission(item.key));

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}
      aria-label="Main Navigation"
    >
      {/* ── Brand Logo (PICS) ── */}
      <div className="sidebar-logo">
        <BrandLogo variant="sidebar" collapsed={collapsed} />
      </div>

      {/* ── Navigation List ── */}
      <nav className="sidebar-nav" aria-label="Sidebar Menu">
        {visibleNavItems.map(({ key, label, icon: Icon }) => {
          const isActive = activePage === key;
          return (
            <button
              key={key}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
              onClick={() => onNavigate(key)}
              title={collapsed ? label : ''}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="sidebar-nav-label">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
