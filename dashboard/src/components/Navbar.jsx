import React from 'react';
import { motion } from 'motion/react';
import { Sprout, Calendar, PlayCircle, Layers, Cpu, Sliders, Droplets } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sprout },
    { id: 'schedules', label: 'Jadwal', icon: Calendar },
    { id: 'demo', label: 'Mode Demo', icon: PlayCircle },
    { id: 'profiles', label: 'Profil Fertigasi', icon: Layers },
    { id: 'valves', label: 'Master Valve', icon: Cpu },
    { id: 'plantings', label: 'Penanaman', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-emerald-100/80 shadow-sm shadow-emerald-950/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
              <Droplets className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-emerald-950 leading-tight">Smart Fertigation</h1>
              <p className="text-xs text-emerald-600 font-semibold">IoT Precision Agriculture</p>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-emerald-800'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-emerald-100/70 border border-emerald-200/80 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
