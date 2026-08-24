import React, { useState, useEffect, useRef } from 'react';
import { gsap } from '../hooks/useGsap';
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const mobileMenuRef = useRef(null);

  const navLinks = [
    { name: 'Beranda', href: '/#hero', id: 'hero' },
    { name: 'Tentang MELO', href: '/#mascot', id: 'mascot' },
    { name: 'Visi & Misi', href: '/#visi-misi', id: 'visi-misi' },
    { name: 'Teknologi AIoT', href: '/#teknologi', id: 'teknologi' },
    { name: 'Katalog Produk', href: '/#katalog', id: 'katalog' },
    { name: 'Mitra Tani', href: '/#mitra', id: 'mitra' },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.pathname === '/produk') {
      setActiveSection('katalog');
      return;
    }

    const sectionIds = ['hero', 'mascot', 'visi-misi', 'teknologi', 'katalog', 'mitra'];

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Section scroll spy
      const scrollPosition = window.scrollY + 250;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuRef.current) return;
    if (mobileMenuOpen) {
      gsap.fromTo(
        mobileMenuRef.current,
        { opacity: 0, y: -10, display: 'none' },
        { opacity: 1, y: 0, display: 'block', duration: 0.25, ease: 'power2.out' }
      );
    } else {
      gsap.to(mobileMenuRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(mobileMenuRef.current, { display: 'none' });
        },
      });
    }
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF7EE]/95 backdrop-blur-xs border-b border-[#16381E]/10 py-3'
          : 'bg-transparent py-5 border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="/#hero" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/favicon.png"
                alt="PPK Ormawa Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-black text-lg text-[#16381E] tracking-tight leading-tight">PPK ORMAWA</h1>
              <p className="text-xs text-[#4B7F38] font-bold">Biro Teknik Informatika</p>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className={`text-xs lg:text-[13px] font-bold transition-colors py-1 ${
                    isActive
                      ? 'text-[#4B7F38]'
                      : 'text-[#16381E]/70 hover:text-[#4B7F38]'
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>

          {/* Action CTA (Outline button) */}
          <div className="hidden lg:flex items-center space-x-3">
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] px-4 py-2 rounded-full text-xs font-bold transition-colors group"
            >
              <span>Dashboard AIoT</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#4B7F38] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#16381E] hover:text-[#4B7F38]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        ref={mobileMenuRef}
        className="md:hidden bg-[#FAF7EE] border-b border-[#16381E]/10 px-4 pt-3 pb-6 space-y-1.5"
        style={{ display: 'none' }}
      >
        {navLinks.map((link) => {
          const isActive = activeSection === link.id;
          return (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 font-bold text-sm transition-colors rounded-xl ${
                isActive
                  ? 'text-[#4B7F38]'
                  : 'text-[#16381E] hover:text-[#4B7F38]'
              }`}
            >
              {link.name}
            </a>
          );
        })}
        <div className="pt-2 border-t border-[#16381E]/10">
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full inline-flex items-center justify-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#4B7F38]" />
            <span>Buka Dashboard Smart Fertigation</span>
          </a>
        </div>
      </div>
    </header>
  );
};
