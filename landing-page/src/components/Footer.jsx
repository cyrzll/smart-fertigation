import React, { useRef, useEffect } from 'react';
import { gsap } from '../hooks/useGsap';
import { ArrowUpRight, Camera, Music2 } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

export const Footer = () => {
  const footerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(footerRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 95%',
          toggleActions: 'play none none reverse',
        },
      });
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="bg-[#FAF7EE] text-[#16381E] pt-12 sm:pt-16 pb-10 sm:pb-12 border-t border-[#16381E]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 pb-10 sm:pb-12 border-b border-[#16381E]/8">
          
          {/* Brand Info */}
          <div className="sm:col-span-2 md:col-span-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <img
                  src="/favicon.png"
                  alt="PPK Ormawa Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#16381E]">PPK ORMAWA</h3>
                <p className="text-xs text-[#4B7F38] font-bold">Biro Teknik Informatika</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#2E4F34] max-w-md font-medium leading-relaxed">
              Program Penguatan Kapasitas Organisasi Kemahasiswaan (PPK Ormawa) Biro Teknik Informatika. Mewujudkan Agribisnis Melon Presisi Berbasis AIoT &amp; Smart Protection di Desa Ngablak.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="sm:col-span-1 md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">Navigasi Utama</h4>
            <ul className="space-y-2 text-xs font-semibold text-[#2E4F34]">
              <li><a href="#hero" className="hover:text-[#4B7F38] transition-colors">Beranda</a></li>
              <li><a href="#mascot" className="hover:text-[#4B7F38] transition-colors">Tentang MELO Mascot</a></li>
              <li><a href="#visi-misi" className="hover:text-[#4B7F38] transition-colors">Visi &amp; 4 Pilar Misi</a></li>
              <li><a href="#teknologi" className="hover:text-[#4B7F38] transition-colors">Sistem Fertigasi AIoT</a></li>
              <li><a href="#sdgs" className="hover:text-[#4B7F38] transition-colors">Integrasi SDGs &amp; Asta Cita</a></li>
              <li><a href="#mitra" className="hover:text-[#4B7F38] transition-colors">Kelompok Tani Sido Maju</a></li>
            </ul>
          </div>

          {/* Akses Dashboard (Thin subtle outline button) */}
          <div className="sm:col-span-1 md:col-span-3 space-y-3">
            <h4 className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">Kontrol IoT</h4>
            <p className="text-xs text-[#2E4F34]">Akses kontrol realtime dashboard fertigasi otomatis:</p>
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 border border-[#16381E]/25 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-bold px-4 py-2 rounded-full text-xs transition-colors"
            >
              <span>Dashboard Fertigasi</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href="https://www.instagram.com/ppk.ormawatikediri/" target="_blank" rel="noopener noreferrer" aria-label="Instagram PPK Ormawa TI Kediri" className="inline-flex items-center gap-1.5 border border-[#16381E]/20 rounded-full px-3 py-1.5 text-xs font-bold hover:border-[#4B7F38] hover:text-[#4B7F38] transition-colors">
                <Camera className="w-3.5 h-3.5" /> Instagram
              </a>
              <a href="https://www.tiktok.com/@ppk.ormawatikediri" target="_blank" rel="noopener noreferrer" aria-label="TikTok PPK Ormawa TI Kediri" className="inline-flex items-center gap-1.5 border border-[#16381E]/20 rounded-full px-3 py-1.5 text-xs font-bold hover:border-[#4B7F38] hover:text-[#4B7F38] transition-colors">
                <Music2 className="w-3.5 h-3.5" /> TikTok
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 text-center text-xs text-[#2E4F34]/70 font-medium flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 PPK Ormawa Biro Teknik Informatika. All rights reserved.</p>
          <p>
            <span>Dikembangkan Bersama MELO Mascot</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
