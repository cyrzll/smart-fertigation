import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGsap';
import { Cpu, ShieldCheck, Database, Radio, Droplets, ArrowRight, CheckCircle2, Server } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

export const TechnologySection = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const bannerRef = useRef(null);

  const techSteps = [
    {
      step: '01',
      title: 'Proteksi Fisik Anti-Dwarfing',
      desc: 'Smart Crop Protection berbasis proteksi fisik (barrier/screen) yang efektif memblokir hama serangga vektor pembawa virus dwarfing.',
      icon: ShieldCheck,
    },
    {
      step: '02',
      title: 'Sistem Fertigasi Presisi',
      desc: 'Penyaluran air dan nutrisi pupuk otomatis langsung ke akar tanaman guna mengeliminasi pemborosan biaya input (zero waste).',
      icon: Droplets,
    },
    {
      step: '03',
      title: 'Mikrokontroler ESP32',
      desc: 'Node pintar pengontrol relay & solenoid valve yang mengeksekusi penyiraman secara otomatis sesuai jadwal fase tanam (HST).',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Hono API & Dashboard IoT',
      desc: 'Server backend Node.js dan dashboard kontrol realtime untuk memonitor dan mengontrol sistem fertigasi dari mana saja.',
      icon: Server,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Cards stagger (fade in from bottom, resets on scroll up)
      const cards = cardRefs.current.filter(Boolean);
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 40,
          duration: 0.7,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // Banner (resets on scroll up)
      if (bannerRef.current) {
        gsap.from(bannerRef.current, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bannerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="teknologi" className="pt-8 pb-20 sm:pb-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Pipeline Subtitle */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12 space-y-1.5">
          <span className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">
            Arsitektur Pipeline AIoT
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-[#16381E]">
            Empat Tahapan Proteksi &amp; Fertigasi Presisi
          </h3>
        </div>

        {/* Tech Pipeline Grid (Thin subtle outline) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {techSteps.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div
                key={t.step}
                ref={(el) => (cardRefs.current[idx] = el)}
                className="border border-[#16381E]/15 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#4B7F38]/60 transition-colors"
              >
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#4B7F38]" />
                    <span className="text-xl sm:text-2xl font-black text-[#16381E]/30 font-mono">{t.step}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-[#16381E]">{t.title}</h3>
                  <p className="text-xs text-[#2E4F34] leading-relaxed font-medium">{t.desc}</p>
                </div>

                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-[#16381E]/10 flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sistem Aktif Presisi</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dashboard Integration Banner (Thin subtle outline) */}
        <div ref={bannerRef} className="border border-[#16381E]/20 text-[#16381E] rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
              <img
                src="/icon/melo_megaphone.png"
                alt="MELO Megaphone Announcer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 text-[#4B7F38] text-xs font-bold uppercase tracking-wider">
                <Droplets className="w-4 h-4" />
                <span>Realtime IoT Monitoring</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#16381E]">Terhubung Langsung dengan Dashboard Fertigasi</h3>
              <p className="text-xs sm:text-sm text-[#2E4F34] max-w-xl font-medium leading-relaxed">
                Pantau HST tanaman melon, atur durasi siram per valve, jalankan mode demo pengujian relay, dan kelola master profil nutrisi dari mana saja.
              </p>
            </div>
          </div>

          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-black px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm transition-colors shrink-0"
          >
            <span>Buka Dashboard Fertigasi</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </a>
        </div>

      </div>
    </section>
  );
};
