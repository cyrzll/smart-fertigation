import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Beranda', href: '/#hero' },
    { name: 'Tentang MELO', href: '/#mascot' },
    { name: 'Visi & Misi', href: '/#visi-misi' },
    { name: 'Teknologi AIoT', href: '/#teknologi' },
    { name: 'Katalog Produk', href: '/produk' },
    { name: 'Mitra Tani', href: '/#mitra' },
    { name: 'Admin Produk', href: '/admin/produk' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF7EE]/90 backdrop-blur-md border-b border-[#D8E6C3] shadow-md shadow-[#112D19]/5 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="#hero" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#16381E] to-[#4B7F38] p-1 flex items-center justify-center shadow-md shadow-[#16381E]/20 group-hover:scale-105 transition-transform">
              <img
                src="/favicon.png"
                alt="PPK Ormawa Logo"
                className="w-full h-full object-contain rounded-xl bg-white p-0.5"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-[#16381E] tracking-tight leading-tight">PPK ORMAWA</h1>
              <p className="text-[11px] text-[#4B7F38] font-semibold">Biro Teknik Informatika</p>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#D8E6C3] shadow-sm">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3.5 py-1.5 text-xs font-bold text-[#16381E] hover:text-[#4B7F38] hover:bg-[#F3EFE0] rounded-full transition-all"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Action CTA */}
          <div className="hidden lg:flex items-center space-x-3">
            <a
              href="http://localhost:4321"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-[#16381E] hover:bg-[#23502C] text-[#FAF7EE] px-5 py-2.5 rounded-full text-xs font-bold transition shadow-lg shadow-[#16381E]/20 group"
            >
              <Sparkles className="w-4 h-4 text-[#A3C978]" />
              <span>Dashboard AIoT</span>
              <ArrowUpRight className="w-4 h-4 text-[#A3C978] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-2xl bg-[#F3EFE0] text-[#16381E] border border-[#D8E6C3]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-[#FAF7EE] border-b border-[#D8E6C3] px-4 pt-4 pb-6 space-y-3 shadow-xl"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl font-bold text-sm text-[#16381E] hover:bg-[#EAF5D8]"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-2">
              <a
                href="http://localhost:4321"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center space-x-2 bg-[#16381E] text-[#FAF7EE] px-5 py-3 rounded-xl text-sm font-bold shadow-md"
              >
                <Sparkles className="w-4 h-4 text-[#A3C978]" />
                <span>Buka Dashboard Smart Fertigation</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
