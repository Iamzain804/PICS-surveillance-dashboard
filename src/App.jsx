import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import ReportsPage from './pages/ReportsPage';
import BranchesPage from './pages/BranchesPage';
import StaffPage from './pages/StaffPage';
import PipelinePage from './pages/PipelinePage';
import EventsDashboardPage from './pages/EventsDashboardPage';
import RolesPage from './pages/RolesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CamerasPage from './pages/CamerasPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CameraProcessingPage from './pages/CameraProcessingPage';
import { API_BASE } from './config';

// Global fetch interceptor to append x-user-id to all API requests dynamically without duplicate headers
if (typeof window !== 'undefined' && !window.fetch.__epic_intercepted) {
  const originalFetch = window.fetch;
  window.fetch = function (url, options) {
    options = options || {};
    
    // Read user from storage
    const userString = localStorage.getItem('epic_user') || sessionStorage.getItem('epic_user');
    if (userString) {
      try {
        const parsed = JSON.parse(userString);
        if (parsed && parsed.id) {
          const uidStr = String(parsed.id);
          if (options.headers instanceof Headers) {
            options.headers.set('x-user-id', uidStr);
          } else if (Array.isArray(options.headers)) {
            options.headers = options.headers.filter(([k]) => k.toLowerCase() !== 'x-user-id');
            options.headers.push(['x-user-id', uidStr]);
          } else {
            options.headers = options.headers || {};
            delete options.headers['x-user-id'];
            delete options.headers['X-User-Id'];
            options.headers['x-user-id'] = uidStr;
          }
        }
      } catch (e) {
        console.error('Error parsing epic_user for fetch interceptor:', e);
      }
    }
    return originalFetch(url, options);
  };
  window.fetch.__epic_intercepted = true;
}

export default function App() {
  // Helper to check if user has access to a specific page
  const canAccessPage = (pageName, currentUser) => {
    if (!currentUser) return false;
    if (currentUser.is_super_admin || currentUser.username === 'admin' || currentUser.role === 'admin') return true;

    if (pageName === 'forgot-password' || pageName === 'dashboard') return true; // accessible to all logged-in users

    const pagePermissions = {
      logs: 'view_logs',
      reports: 'view_reports',
      'camera-reports': 'view_reports',
      branches: 'view_branch',
      staff: 'view_staff',
      pipeline: 'control_pipeline',
      events: 'view_events',
      roles: 'manage_roles',
      departments: 'view_department',
    };

    const reqPerm = pagePermissions[pageName];
    if (!reqPerm) return true; // Default page like dashboard needs no specific permission

    const permissions = currentUser.permissions || [];
    return permissions.includes(reqPerm) || permissions.includes('*');
  };

  // Restore session from storage (if user checked "Remember me")
  const getInitialUser = () => {
    try {
      const raw = localStorage.getItem('epic_user') || sessionStorage.getItem('epic_user');
      if (raw && raw !== 'undefined' && raw !== 'null') {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Invalid user token in storage:', e);
    }
    return null;
  };
  const savedUser = getInitialUser();

  const getPageFromPath = (currentUser) => {
    const path = window.location.pathname.replace('/', '').trim().toLowerCase();
    const validPages = ['reports', 'dashboard', 'branches', 'departments', 'cameras', 'activities', 'staff', 'pipeline', 'events', 'roles', 'forgot-password', 'logs', 'camera-reports'];
    const targetPage = validPages.includes(path) ? path : 'reports';
    
    if (currentUser && !canAccessPage(targetPage, currentUser)) {
      if (window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
      return 'reports';
    }
    return targetPage;
  };

  const [isLoggedIn, setIsLoggedIn] = useState(!!savedUser);
  const [user, setUser] = useState(savedUser);
  const [activePage, setActivePage] = useState(() => getPageFromPath(savedUser));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect to reports if the user loses permission to the active page in real-time
  useEffect(() => {
    if (isLoggedIn && user && activePage !== 'reports') {
      if (!canAccessPage(activePage, user)) {
        setActivePage('reports');
        if (window.location.pathname !== '/') {
          window.history.pushState({}, '', '/');
        }
      }
    }
  }, [user, activePage, isLoggedIn]);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromPath(user));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Real-time user profile & permissions sync
  useEffect(() => {
    if (!isLoggedIn || !user || !user.id) return;

    const syncUserProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me/${user.id}`);
        if (response.status === 401 || response.status === 403) {
          // If deactivated or invalid session, logout
          handleLogout();
          return;
        }
        if (response.ok) {
          const updatedUser = await response.json();
          
          // Verify if permissions or active status changed
          const prevPerms = JSON.stringify(user.permissions || []);
          const nextPerms = JSON.stringify(updatedUser.permissions || []);
          
          if (prevPerms !== nextPerms || user.role !== updatedUser.role || user.is_active !== updatedUser.is_active) {
            setUser(updatedUser);
            // Save updated user to local/session storage
            if (localStorage.getItem('epic_user')) {
              localStorage.setItem('epic_user', JSON.stringify(updatedUser));
            } else if (sessionStorage.getItem('epic_user')) {
              sessionStorage.setItem('epic_user', JSON.stringify(updatedUser));
            }
          }
        }
      } catch (err) {
        console.error('Error syncing user profile:', err);
      }
    };

    // Run immediately on page change/mount
    syncUserProfile();

    // Check periodically every 10 seconds for instant response
    const interval = setInterval(syncUserProfile, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, user?.id, activePage]);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (page) => {
    if (!canAccessPage(page, user)) {
      return; // Do not navigate if unauthorized
    }
    setActivePage(page);
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
    const targetPath = page === 'reports' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setActivePage('reports');
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('epic_user');
    sessionStorage.removeItem('epic_user');
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) {
    const path = window.location.pathname.replace('/', '').trim().toLowerCase();
    if (path === 'reset-password') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      return (
        <ForgotPasswordPage
          onLogout={handleLogout}
          onToggleSidebar={() => {}}
          onNavigate={handleNavigate}
          sidebarCollapsed={false}
          onBack={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}
          isFirstLogin={false}
          isResetMode={true}
          resetToken={token}
        />
      );
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  // Intercept first-time login and render split-screen password reset page (no sidebar)
  if (user?.is_first_login) {
    return (
      <ForgotPasswordPage
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => {}}
        onNavigate={handleNavigate}
        sidebarCollapsed={false}
        onBack={handleLogout}
        isFirstLogin={true}
        onPasswordUpdated={(updatedUser) => {
          setUser(updatedUser);
          if (localStorage.getItem('epic_user')) {
            localStorage.setItem('epic_user', JSON.stringify(updatedUser));
          } else {
            sessionStorage.setItem('epic_user', JSON.stringify(updatedUser));
          }
          setActivePage('reports');
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="app-layout light-theme" style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'fixed', width: '100%', top: 0, left: 0 }}>
      {isMobile && !sidebarCollapsed && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
      />

      <main className="app-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', height: '100vh', margin: 0, padding: '0 32px 32px 32px', boxSizing: 'border-box' }}>
        {activePage === 'dashboard' && <DashboardPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'pipeline' && <PipelinePage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'events' && <EventsDashboardPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'logs' && <LogsPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'reports' && <ReportsPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'camera-reports' && <CameraProcessingPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'branches' && <BranchesPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'staff' && <StaffPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'roles' && <RolesPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'departments' && <DepartmentsPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'cameras' && <CamerasPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'activities' && <ActivitiesPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} />}
        {activePage === 'forgot-password' && <ForgotPasswordPage user={user} onLogout={handleLogout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} sidebarCollapsed={sidebarCollapsed} onNavigate={handleNavigate} onBack={() => { setActivePage('reports'); window.history.pushState({}, '', '/'); }} />}
      </main>
    </div>
  );
}
