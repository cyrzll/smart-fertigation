import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGsap';
import { Target, ShieldCheck, Sprout, Users, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const VisiMisi = () => {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const visiCardRef = useRef(null);
  const horizontalRef = useRef(null);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const techIntroRef = useRef(null);

  const misiPillars = [
    {
      no: '01',
      title: 'Eksekusi Teknologi Presisi',
      sdgTag: 'Integrasi SDGs No. 12 (Zero Waste)',
      icon: ShieldCheck,
      desc: 'Mengimplementasikan infrastruktur AIoT Smart Crop Protection dan fertigasi otomatis untuk memblokir risiko serangan virus dwarfing secara fisik, serta mengeliminasi pemborosan biaya produksi (input) guna menciptakan sistem pertanian yang efisien dan tanpa limbah.',
    },
    {
      no: '02',
      title: 'Eskalasi Kapasitas Produksi',
      sdgTag: 'Optimalisasi 116 Ha Lahan',
      icon: Sprout,
      desc: 'Mengubah potensi 116 hektar lahan pertanian konvensional Desa Ngablak menjadi sentra produksi hortikultura modern yang mampu mencetak komoditas melon unggulan dengan standar kualitas dan kuantitas panen yang terus meningkat di setiap musimnya.',
    },
    {
      no: '03',
      title: 'Pemberdayaan Eksekutor Lokal',
      sdgTag: 'Sinergi Kemitraan Local Heroes',
      icon: Users,
      desc: 'Membangun kapasitas kemandirian dan keterampilan digital Kelompok Tani Sido Maju Tanjung melalui transfer teknologi yang terstruktur, menempatkan mereka bukan sebagai objek percobaan, melainkan sebagai mitra aktif dan penggerak utama di lapangan.',
    },
    {
      no: '04',
      title: 'Akselerasi Keuntungan Finansial',
      sdgTag: 'Integrasi Asta Cita ke-5 & SDGs No. 8',
      icon: TrendingUp,
      desc: 'Memutus rantai kerugian operasional akibat gagal panen untuk mengunci kepastian margin keuntungan. Peningkatan pendapatan dan kelayakan kerja petani ini ditargetkan sebagai kontribusi nyata dari tingkat desa terhadap penguatan produktivitas ekonomi nasional.',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header scroll reveal
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

      // Visi card entrance
      gsap.from(visiCardRef.current, {
        opacity: 0,
        y: 60,
        scale: 0.95,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: visiCardRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      // Horizontal scroll for 4 pilar misi
      const track = trackRef.current;
      const cards = cardRefs.current.filter(Boolean);
      
      if (track && cards.length > 0) {
        // Create the horizontal scroll animation with dynamic scroll width computation
        const horizontalTween = gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: horizontalRef.current,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
          },
        });

        // Entrance animation for each card (resets when scrolling back)
        cards.forEach((card) => {
          gsap.from(card, {
            opacity: 0,
            x: 80,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              containerAnimation: horizontalTween,
              start: 'left 95%',
              toggleActions: 'play none none reverse',
            },
          });
        });

        // Entrance animation for the final Smart Crop Protection & Fertigasi Otomatis panel
        if (techIntroRef.current) {
          gsap.from(techIntroRef.current, {
            opacity: 0,
            y: 80,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: techIntroRef.current,
              containerAnimation: horizontalTween,
              start: 'left 80%',
              toggleActions: 'play none none reverse',
            },
          });
        }
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="visi-misi" className="bg-[#FAF7EE] relative">
      {/* Section Title Header */}
      <div className="py-16">
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16 space-y-3 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Visi &amp; 4 Pilar Misi <span className="text-[#4B7F38]">Strategis</span>
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Komitmen Nyata Membangun Ekosistem Pertanian Melon Modern yang Berdaya Saing Tinggi &amp; Berkelanjutan.
          </p>
        </div>

        {/* VISI CARD (Thin subtle outline) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={visiCardRef}
            className="border border-[#16381E]/15 text-[#16381E] rounded-3xl p-6 sm:p-8 lg:p-12 relative overflow-hidden mb-8"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 sm:space-y-4 flex-1">
                <div className="inline-flex items-center space-x-2 text-xs font-black text-[#4B7F38] uppercase tracking-wider">
                  <span>VISI UTAMA PROGRAM</span>
                </div>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-black leading-snug tracking-tight text-[#16381E]">
                  "Mewujudkan ekosistem agribisnis melon Desa Ngablak yang presisi, efisien, dan berkelanjutan berbasis integrasi kecerdasan buatan (AIoT) guna memimpin akselerasi ekonomi daerah dan menjamin peningkatan kesejahteraan petani secara absolut."
                </h3>
              </div>
              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 shrink-0 self-center">
                <img
                  src="/icon/melo_surprised.png"
                  alt="MELO Surprised"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#2E4F34] font-bold pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-[#16381E]/10 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#4B7F38] shrink-0" />
              <span>Pilar Penguat Kesejahteraan Petani Ngablak &amp; Kelompok Tani Sido Maju Tanjung</span>
            </p>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLL SECTION — 4 Pilar Misi & Smart Protection Transition */}
      <div ref={horizontalRef} className="horizontal-scroll-section relative overflow-hidden min-h-screen">

        {/* Horizontal track */}
        <div
          ref={trackRef}
          className="flex items-center gap-6 sm:gap-12 lg:gap-20"
          style={{ width: 'max-content', minHeight: '100vh' }}
        >
          {/* Intro title panel — full viewport width, centered */}
          <div className="shrink-0 w-screen h-screen flex flex-col items-center justify-center px-4 sm:px-8">
            <div className="text-center space-y-3 sm:space-y-4 max-w-2xl">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#16381E] tracking-tight">
                Empat Pilar Misi <span className="text-[#4B7F38]">Operasional</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#2E4F34] font-medium leading-relaxed max-w-md mx-auto">
                Scroll untuk menjelajahi strategi eksekusi program
              </p>
              <div className="pt-2 sm:pt-4 flex items-center justify-center space-x-2 text-[#4B7F38] animate-pulse">
                <span className="text-xs font-bold">Scroll</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Cards (Thin subtle outline) */}
          {misiPillars.map((misi, index) => {
            const Icon = misi.icon;
            return (
              <React.Fragment key={misi.no}>
                <div
                  ref={(el) => (cardRefs.current[index] = el)}
                  className="shrink-0 w-[85vw] max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] min-h-[420px] sm:min-h-[460px] lg:h-[480px] rounded-3xl p-6 sm:p-8 border border-[#16381E]/15 flex flex-col justify-between relative overflow-hidden group hover:border-[#4B7F38]/60 transition-colors"
                >
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex items-center justify-between">
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#4B7F38]" />
                      <span className="text-3xl sm:text-4xl font-black text-[#16381E]/30 font-mono">{misi.no}</span>
                    </div>

                    <div>
                      <span className="text-[11px] sm:text-xs font-black text-[#4B7F38] uppercase tracking-wider">
                        {misi.sdgTag}
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black text-[#16381E] mt-1.5 sm:mt-2">{misi.title}</h4>
                    </div>

                    <p className="text-xs sm:text-sm text-[#2E4F34] leading-relaxed font-medium">
                      {misi.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#16381E]/10 flex items-center text-xs font-bold text-[#4B7F38]">
                    <span>Implementasi Aktif</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Final slide panel — Smart Crop Protection & Fertigasi Otomatis (Directly appears in center as cards 1-4 exit left) */}
          <div className="shrink-0 w-screen h-screen flex flex-col items-center justify-center px-4 sm:px-8">
            <div ref={techIntroRef} className="text-center space-y-4 max-w-3xl">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#16381E] tracking-tight">
                Smart Crop Protection &amp; <span className="text-[#4B7F38]">Fertigasi Otomatis</span>
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-[#2E4F34] font-medium leading-relaxed max-w-2xl mx-auto">
                Integrasi AIoT Terpadu Mengeliminasi Pemborosan Pupuk (Zero Waste) dan Memutus Risiko Gagal Panen Virus Dwarfing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
