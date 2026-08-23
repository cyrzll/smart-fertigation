import React from 'react';
import { Sparkles, ArrowUpRight, HeartHandshake } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#16381E] text-[#FAF7EE] pt-16 pb-12 border-t border-[#A3C978]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A3C978] to-[#4B7F38] p-1 flex items-center justify-center shadow-md">
                <img
                  src="/favicon.png"
                  alt="PPK Ormawa Logo"
                  className="w-full h-full object-contain rounded-xl bg-white p-0.5"
                />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#FAF7EE]">PPK ORMAWA</h3>
                <p className="text-xs text-[#A3C978] font-bold">Biro Teknik Informatika</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#D8E6C3] max-w-md font-medium leading-relaxed">
              Program Penguatan Kapasitas Organisasi Kemahasiswaan (PPK Ormawa) Biro Teknik Informatika. Mewujudkan Agribisnis Melon Presisi Berbasis AIoT &amp; Smart Protection di Desa Ngablak.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-[#A3C978] uppercase tracking-wider">Navigasi Utama</h4>
            <ul className="space-y-2 text-xs font-semibold text-[#D8E6C3]">
              <li><a href="#hero" className="hover:text-white transition-colors">Beranda</a></li>
              <li><a href="#mascot" className="hover:text-white transition-colors">Tentang MELO Mascot</a></li>
              <li><a href="#visi-misi" className="hover:text-white transition-colors">Visi &amp; 4 Pilar Misi</a></li>
              <li><a href="#teknologi" className="hover:text-white transition-colors">Sistem Fertigasi AIoT</a></li>
              <li><a href="#sdgs" className="hover:text-white transition-colors">Integrasi SDGs &amp; Asta Cita</a></li>
              <li><a href="#mitra" className="hover:text-white transition-colors">Kelompok Tani Sido Maju</a></li>
            </ul>
          </div>

          {/* Akses Dashboard */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-[#A3C978] uppercase tracking-wider">Kontrol IoT</h4>
            <p className="text-xs text-[#D8E6C3]">Akses kontrol realtime dashboard fertigasi otomatis:</p>
            <a
              href="http://localhost:4321"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-[#A3C978] hover:bg-[#b5da8c] text-[#16381E] font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md"
            >
              <span>Dashboard Fertigasi</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
            </a>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 text-center text-xs text-[#D8E6C3]/80 font-medium flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 PPK Ormawa Biro Teknik Informatika. All rights reserved.</p>
          <p>
            <span>Dikembangkan Bersama MELO Mascot</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
