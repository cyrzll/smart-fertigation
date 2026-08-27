import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Calendar, PlayCircle, Layers, Cpu, Sliders, Droplets, Menu, X, ChevronRight, LogOut, Shield, Settings } from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminView = activeTab === 'admin';

  const navItems = isAdminView
    ? [
        { id: 'admin', label: 'Admin', icon: Shield },
        { id: 'dashboard', label: 'Dashboard', icon: Sprout },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: Sprout },
        { id: 'devices', label: 'Perangkat', icon: Cpu },
        { id: 'valves', label: 'Valve', icon: Sliders },
        { id: 'schedules', label: 'Jadwal', icon: Calendar },
        { id: 'phases', label: 'Fase', icon: Sprout },
        { id: 'demo', label: 'Demo', icon: PlayCircle },
        { id: 'profiles', label: 'Profil', icon: Layers },
        { id: 'plantings', label: 'Tanam', icon: Droplets },
        { id: 'settings', label: 'Pengaturan', icon: Settings },
        ...(user?.level === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
      ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#D4DFC8] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => handleSelectTab('dashboard')}>
          <img src="/favicon.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-sm text-[#2D3B2D]">Smart Fertigation</span>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={onLogout} title="Keluar" className="p-2 rounded-lg border border-red-300 text-red-500">
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg border border-[#C8D9B0] text-[#5A6B5A]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-[#2D3B2D]/20 backdrop-blur-xs"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="md:hidden fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#D4DFC8] flex flex-col p-5 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E8EDE0] mb-5">
                <div className="flex items-center space-x-2.5">
                  <img src="/favicon.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain" />
                  <span className="font-bold text-sm text-[#2D3B2D]">Smart Fertigation</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[#8A9B7A] hover:text-[#2D3B2D]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="mb-4 p-3 rounded-xl border border-[#D4DFC8] flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-[#2D3B2D] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#8A9B7A] truncate">{user.email}</p>
                  </div>
                  <button onClick={onLogout} className="p-2 rounded-lg border border-red-300 text-red-500">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? 'border border-[#7BAF5A] text-[#3A6B2A] font-bold'
                          : 'text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#7BAF5A]' : 'text-[#9CAF88]'}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#7BAF5A]" />}
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30 bg-white/95 backdrop-blur-md border-r border-[#D4DFC8] transition-all duration-300 w-16 lg:w-56 p-3 lg:p-4">
        {/* Brand */}
        <div className="flex items-center lg:space-x-2.5 pb-4 mb-4 border-b border-[#E8EDE0] justify-center lg:justify-start">
          <img src="/favicon.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain shrink-0" />
          <span className="hidden lg:block font-bold text-sm text-[#2D3B2D] truncate">Smart Fertigation</span>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative w-full flex items-center justify-center lg:justify-start lg:space-x-2.5 px-2.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#3A6B2A] font-bold'
                    : 'text-[#5A6B5A] hover:text-[#3A6B2A] hover:bg-[#F0F4EA] font-medium'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#7BAF5A]' : 'text-[#9CAF88]'}`} />
                <span className="hidden lg:block text-sm truncate">{item.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="desktopActiveTab"
                    className="absolute inset-0 border border-[#7BAF5A] rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        {user && (
          <div className="pt-3 border-t border-[#E8EDE0] flex items-center justify-between">
            <div className="hidden lg:block overflow-hidden pr-2">
              <p className="font-semibold text-xs text-[#2D3B2D] truncate">{user.name}</p>
              <p className="text-[10px] text-[#8A9B7A] truncate">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Keluar"
              className="p-2 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
