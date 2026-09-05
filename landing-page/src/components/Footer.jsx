import React, { useRef, useEffect } from 'react';
import { gsap } from '../hooks/useGsap';
import { ArrowUpRight } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

// Exact SVG path from /public/icon/instagram.svg with fill="currentColor"
const InstagramSvgIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
  </svg>
);

// Exact SVG path from /public/icon/tiktok.svg with fill="currentColor"
const TiktokSvgIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>
  </svg>
);

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
              <a
                href="https://www.instagram.com/ppk.ormawatikediri/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram PPK Ormawa TI Kediri"
                className="inline-flex items-center gap-1.5 border border-[#16381E]/20 rounded-full px-3 py-1.5 text-xs font-bold text-[#16381E] hover:border-[#4B7F38] hover:text-[#4B7F38] hover:bg-[#E8F2DF]/50 transition-all duration-200"
              >
                <InstagramSvgIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href="https://www.tiktok.com/@ppk.ormawatikediri"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok PPK Ormawa TI Kediri"
                className="inline-flex items-center gap-1.5 border border-[#16381E]/20 rounded-full px-3 py-1.5 text-xs font-bold text-[#16381E] hover:border-[#4B7F38] hover:text-[#4B7F38] hover:bg-[#E8F2DF]/50 transition-all duration-200"
              >
                <TiktokSvgIcon className="w-3.5 h-3.5 shrink-0" />
                <span>TikTok</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 text-center text-xs text-[#2E4F34]/70 font-medium flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 PPK Ormawa Biro Teknik Informatika. All rights reserved.</p>
          <p>
            
          </p>
        </div>
      </div>
    </footer>
  );
};
