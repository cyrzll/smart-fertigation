import React, { useRef, useEffect } from 'react';
import { gsap } from '../hooks/useGsap';
import { Globe, Award, HeartHandshake, CheckCircle2, Sparkles } from 'lucide-react';

export const SdgSection = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const sdgCards = [
    {
      number: '12',
      tag: 'SDGs Goal 12',
      title: 'Konsumsi & Produksi Bertanggung Jawab',
      desc: 'Menerapkan prinsip Zero Waste dalam penyiraman & pemupukan melon lewat fertigasi presisi AIoT guna menghapus pemborosan biaya input pertanian.',
      footer: 'Pilar Misi Operasional #1',
      isIcon: false,
    },
    {
      number: '8',
      tag: 'SDGs Goal 8',
      title: 'Pekerjaan Layak & Pertumbuhan Ekonomi',
      desc: 'Meningkatkan pendapatan dan kelayakan kerja petani lokal lewat kepastian panen komoditas melon berkualitas unggul.',
      footer: 'Pilar Misi Operasional #4',
      isIcon: false,
    },
    {
      tag: 'Program Nasional',
      title: 'Asta Cita ke-5 Indonesia',
      desc: 'Penguatan produktivitas ekonomi nasional yang dibangun secara inklusif dan berkelanjutan berbasis potensi desa.',
      footer: 'Penguatan Ekonomi Desa',
      isIcon: true,
    },
  ];

  return (
    <section ref={sectionRef} id="sdgs" className="py-16 sm:py-20 lg:py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#16381E] tracking-tight">
            Mendukung <span className="text-[#4B7F38]">SDGs Target</span> &amp; Asta Cita ke-5
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#2E4F34] font-medium leading-relaxed">
            Kontribusi Nyata Tingkat Desa Ngablak untuk Penguatan Ekonomi Nasional Berkelanjutan.
          </p>
        </div>

        {/* SDGs & Asta Cita Cards Grid (Thin subtle outline) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {sdgCards.map((card, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className="border border-[#16381E]/15 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-[#4B7F38]/60 transition-colors"
            >
              <div className="space-y-3 sm:space-y-4">
                {card.isIcon ? (
                  <Award className="w-7 h-7 sm:w-8 sm:h-8 text-[#4B7F38]" />
                ) : (
                  <div className="text-3xl sm:text-4xl font-black text-[#4B7F38] font-mono">
                    {card.number}
                  </div>
                )}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-black text-[#4B7F38] uppercase tracking-wider">{card.tag}</span>
                  <h3 className="text-lg sm:text-xl font-black text-[#16381E] mt-1">{card.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-[#2E4F34] font-medium leading-relaxed">
                  {card.desc}
                </p>
              </div>
              <div className="pt-4 sm:pt-5 mt-4 border-t border-[#16381E]/8 flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{card.footer}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
