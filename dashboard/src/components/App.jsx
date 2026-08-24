import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import { DashboardView } from './DashboardView';
import { SchedulesView } from './SchedulesView';
import { DemoView } from './DemoView';
import { ProfilesView } from './ProfilesView';
import { ValvesView } from './ValvesView';
import { PlantingsView } from './PlantingsView';
import { GrowthPhasesView } from './GrowthPhasesView';
import { UsersView } from './UsersView';
import { WaBotView } from './WaBotView';
import { AdminCenterView } from './AdminCenterView';
import { UserSettingsView } from './UserSettingsView';
import { Cpu, Plus } from 'lucide-react';
import { actions } from 'astro:actions';
import { GoeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

export const App = () => {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userDevices, setUserDevices] = useState([]);
  const [loadingUserDevices, setLoadingUserDevices] = useState(false);

  const apiUrl = import.meta.env.PUBLIC_API_URL || '';

  const fetchUserDevices = async (userId) => {
    if (!userId) return;
    try {
      setLoadingUserDevices(true);
      const { data: resData, error: actionError } = await actions.getDevices({ userId });
      if (!actionError && resData && resData.success) {
        setUserDevices(resData.devices || []);
      } else {
        const res = await fetch(`/api/auth/users/${userId}/devices`);
        const json = await res.json();
        if (json.success) setUserDevices(json.devices || []);
      }
    } catch (err) {
      try {
        const res = await fetch(`/api/auth/users/${userId}/devices`);
        const json = await res.json();
        if (json.success) setUserDevices(json.devices || []);
      } catch (_) {}
    } finally {
      setLoadingUserDevices(false);
    }
  };

  useEffect(() => {
    if (user?.id && user?.level !== 'admin') {
      fetchUserDevices(user.id);
    }
  }, [user?.id, user?.level, activeTab]);

  // Helper to sync tab with current URL pathname
  const syncRouteFromPath = (currentUser) => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    if (!currentUser) {
      if (path === '/register') {
        setAuthView('register');
      } else {
        setAuthView('login');
        if (path !== '/login') {
          window.history.replaceState({}, '', '/login');
        }
      }
      return;
    }

    // Logged in User routing logic
    if (currentUser.level === 'admin') {
      setActiveTab('admin');
      if (path !== '/admin') {
        window.history.replaceState({}, '', '/admin');
      }
    } else {
      // Level 'user' (Operator)
      if (path === '/login' || path === '/register' || path === '/admin' || path === '' || path === '/') {
        setActiveTab('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      } else if (path === '/schedules') {
        setActiveTab('schedules');
      } else if (path === '/phases') {
        setActiveTab('phases');
      } else if (path === '/demo') {
        setActiveTab('demo');
      } else if (path === '/profiles') {
        setActiveTab('profiles');
      } else if (path === '/valves') {
        setActiveTab('valves');
      } else if (path === '/plantings') {
        setActiveTab('plantings');
      } else if (path === '/settings') {
        setActiveTab('settings');
      } else if (path === '/wa') {
        setActiveTab('wa');
      } else {
        setActiveTab('dashboard');
      }
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      let parsedUser = null;
      if (storedUser) {
        parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
      syncRouteFromPath(parsedUser);
    } catch (err) {
      console.error('Error parsing stored user:', err);
    } finally {
      setCheckingAuth(false);
    }

    const handlePopState = () => {
      const storedUser = localStorage.getItem('auth_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      syncRouteFromPath(parsedUser);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const pathMap = {
        dashboard: '/dashboard',
        schedules: '/schedules',
        phases: '/phases',
        demo: '/demo',
        profiles: '/profiles',
        valves: '/valves',
        plantings: '/plantings',
        settings: '/settings',
        wa: '/wa',
        admin: '/admin',
      };
      const newPath = pathMap[tabId] || '/dashboard';
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData?.level === 'admin') {
      setActiveTab('admin');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/admin');
    } else {
      setActiveTab('dashboard');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setAuthView('login');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/login');
    }
  };

  const navigateToAuth = (view) => {
    setAuthView(view);
    if (typeof window !== 'undefined') {
      const path = view === 'register' ? '/register' : '/login';
      window.history.pushState({}, '', path);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center text-[#7BAF5A] font-medium">
        Memuat...
      </div>
    );
  }

  // Redirect to Login/Register if user is not authenticated
  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterView
          apiUrl={apiUrl}
          onRegisterSuccess={handleLoginSuccess}
          onSwitchToLogin={() => navigateToAuth('login')}
        />
      );
    }
    return (
      <LoginView
        apiUrl={apiUrl}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => navigateToAuth('register')}
      />
    );
  }

  const hasVerifiedDevice = userDevices.some((d) => d.status === 'verified');

  const isAdminPage = activeTab === 'admin' || user?.level === 'admin';

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#2D3B2D] flex flex-col">
      {/* Hide Sidebar completely for level admin or /admin route */}
      {!isAdminPage && (
        <Sidebar activeTab={activeTab} setActiveTab={handleSelectTab} user={user} onLogout={handleLogout} />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${isAdminPage ? '' : 'md:pl-16 lg:pl-56'}`}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Global reminder banner when no verified ESP32 device is registered */}
          {!hasVerifiedDevice && user?.level !== 'admin' && activeTab !== 'settings' && (
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                  <Cpu className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Perangkat ESP32 Belum Ditambahkan</h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Tambahkan perangkat terlebih dahulu untuk mulai memantau telemetri sensor, mengatur jadwal penyiraman, dan mengontrol valve fertigasi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSelectTab('settings')}
                className="shrink-0 bg-[#7BAF5A] hover:bg-[#689849] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Perangkat Sekarang</span>
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && user?.level !== 'admin' && <DashboardView apiUrl={apiUrl} setActiveTab={handleSelectTab} hasDevice={hasVerifiedDevice} />}
          {activeTab === 'schedules' && <SchedulesView apiUrl={apiUrl} />}
          {activeTab === 'phases' && <GrowthPhasesView apiUrl={apiUrl} />}
          {activeTab === 'demo' && <DemoView apiUrl={apiUrl} />}
          {activeTab === 'profiles' && <ProfilesView apiUrl={apiUrl} />}
          {activeTab === 'valves' && <ValvesView apiUrl={apiUrl} />}
          {activeTab === 'plantings' && <PlantingsView apiUrl={apiUrl} />}
          {activeTab === 'wa' && <WaBotView apiUrl={apiUrl} />}
          {activeTab === 'settings' && <UserSettingsView apiUrl={apiUrl} user={user} onUpdateUser={(u) => setUser(u)} />}
          {activeTab === 'users' && user?.level === 'admin' && <UsersView apiUrl={apiUrl} />}
          {(activeTab === 'admin' || user?.level === 'admin') && user?.level === 'admin' ? (
            <AdminCenterView
              apiUrl={apiUrl}
              user={user}
              onLogout={handleLogout}
            />
          ) : activeTab === 'admin' && user?.level !== 'admin' ? (
            <div className="border border-red-300 text-red-600 p-6 rounded-xl text-center space-y-3">
              <h3 className="text-base font-bold">Akses Ditolak</h3>
              <button
                onClick={() => handleSelectTab('dashboard')}
                className="border border-[#7BAF5A] text-[#4A7A3A] hover:bg-[#7BAF5A] hover:text-white font-medium text-xs px-4 py-2 rounded-xl transition"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : null}
        </main>
      </div>
      <GoeyToaster position="top-right" richColors />
    </div>
  );
};
