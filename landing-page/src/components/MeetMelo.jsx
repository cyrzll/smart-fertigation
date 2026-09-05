import React, { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from '../hooks/useGsap';
import { Cpu, HeartHandshake, TrendingUp, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

const AUTO_PLAY_INTERVAL = 5000; // 5 seconds per slide

export const MeetMelo = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const containerRef = useRef(null);
  const imgWrapperRef = useRef(null);
  const imgRef = useRef(null);
  const detailRef = useRef(null);
  const timerRef = useRef(null);
  const floatTweenRef = useRef(null);
  const activeFeatureRef = useRef(activeFeature);

  // Keep ref in sync so interval always reads latest value
  activeFeatureRef.current = activeFeature;

  const features = [
    {
      id: 0,
      title: 'Fertigasi Otomatis Presisi AIoT',
      subtitle: 'Eliminasi Pemborosan Pupuk & Air (Prinsip Zero Waste)',
      icon: Cpu,
      meloImg: '/icon/melo_pointing.png',
      desc: 'Melalui kontrol mikrokontroler ESP32 dan platform dashboard, MELO mengalirkan air dan nutrisi pupuk secara presisi sesuai kebutuhan tanaman di setiap fase HST (Hari Setelah Tanam).',
      badges: ['Otomatisasi Fase HST', 'Hemat Nutrisi 30%+', 'Integrasi SDGs No. 12'],
    },
    {
      id: 1,
      title: 'Pendamping Petani Ngablak (Local Heroes)',
      subtitle: 'Mentransfer Keterampilan Digital ke Kelompok Tani Sido Maju Tanjung',
      icon: HeartHandshake,
      meloImg: '/icon/melo_thumbsup.png',
      desc: 'MELO hadir bukan untuk menggantikan petani, melainkan sebagai sahabat digital (companion) yang memperkuat kapasitas Kelompok Tani Sido Maju Tanjung menguasai teknologi hortikultura modern.',
      badges: ['Transfer Teknologi', 'Lahan 116 Hektar', 'Kemitraan Berkelanjutan'],
    },
    {
      id: 2,
      title: 'Akselerasi Ekonomi & Margin Keuntungan',
      subtitle: 'Penguatan Ekonomi Nasional Dimulai dari Tingkat Desa',
      icon: TrendingUp,
      meloImg: '/icon/melo_happy.png',
      desc: 'Menjamin kepastian hasil panen melon premium berdaya jual tinggi, mengunci margin keuntungan petani, serta berkontribusi langsung pada pencapaian Asta Cita ke-5 & SDGs No. 8.',
      badges: ['Asta Cita ke-5', 'SDGs No. 8', 'Margin Keuntungan Terkunci'],
    },
  ];

  const totalFeatures = features.length;

  const goToSlide = useCallback((newIndex, newDirection = 1) => {
    setDirection(newDirection);
    setActiveFeature(newIndex);
  }, []);

  const handleNext = useCallback(() => {
    goToSlide((activeFeature + 1) % totalFeatures, 1);
  }, [activeFeature, totalFeatures, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide((activeFeature - 1 + totalFeatures) % totalFeatures, -1);
  }, [activeFeature, totalFeatures, goToSlide]);

  // Entrance animations on scroll
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
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
      }

      if (containerRef.current) {
        gsap.from(containerRef.current, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // GSAP Slide animation for Mascot Image & Detail content
  useEffect(() => {
    const slideOffset = direction * 60;

    if (imgRef.current) {
      gsap.killTweensOf(imgRef.current);
      gsap.fromTo(
        imgRef.current,
        {
          opacity: 0,
          x: slideOffset,
          scale: 0.86,
          rotation: direction * 4,
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: 'power3.out',
        }
      );
    }

    if (detailRef.current) {
      gsap.killTweensOf(detailRef.current);
      gsap.fromTo(
        detailRef.current,
        {
          opacity: 0,
          x: slideOffset * 0.5,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          delay: 0.08,
          ease: 'power3.out',
        }
      );
    }
  }, [activeFeature, direction]);

  // Auto-play timer using GSAP for reliable timing + progress bar animation
  const progressBarRef = useRef(null);
  const progressTweenRef = useRef(null);

  const startAutoPlay = useCallback(() => {
    // Kill any existing progress tween
    if (progressTweenRef.current) {
      progressTweenRef.current.kill();
      progressTweenRef.current = null;
    }

    // Reset progress bar to 0 width
    if (progressBarRef.current) {
      gsap.set(progressBarRef.current, { width: '0%' });
    }

    // Animate progress bar from 0% to 100% over AUTO_PLAY_INTERVAL, then advance slide
    if (progressBarRef.current) {
      progressTweenRef.current = gsap.to(progressBarRef.current, {
        width: '100%',
        duration: AUTO_PLAY_INTERVAL / 1000,
        ease: 'none',
        onComplete: () => {
          const next = (activeFeatureRef.current + 1) % totalFeatures;
          goToSlide(next, 1);
        },
      });
    }
  }, [totalFeatures, goToSlide]);

  // Start/stop auto-play based on isPaused
  useEffect(() => {
    if (isPaused) {
      if (progressTweenRef.current) {
        progressTweenRef.current.pause();
      }
      return;
    }

    startAutoPlay();

    return () => {
      if (progressTweenRef.current) {
        progressTweenRef.current.kill();
        progressTweenRef.current = null;
      }
    };
  }, [isPaused, activeFeature, startAutoPlay]);

  return (
    <section ref={sectionRef} id="mascot" className="py-20 bg-[#FAF7EE] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Kenalan dengan <span className="text-[#4B7F38]">MELO</span>
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Maskot Resmi PPK Ormawa Biro Teknik Informatika yang Siap Mengawal Akselerasi Ekosistem Agribisnis Melon Presisi Desa Ngablak.
          </p>
        </div>

        {/* Mascot Feature Container with Auto-slide & Hover Pause */}
        <div
          ref={containerRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center border border-[#16381E]/10 rounded-3xl p-6 sm:p-8 lg:p-10 bg-white/40 backdrop-blur-xs shadow-xs"
        >
          {/* Left Column: Floating Mascot Image with GSAP Slide Animation */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-4">
            {/* Background Halo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#E8F2DF]/60 blur-3xl" />
            </div>

            {/* Float wrapper — no overflow-hidden so GSAP slide animation stays visible */}
            <div
              ref={imgWrapperRef}
              className="relative w-52 h-52 sm:w-60 sm:h-60 lg:w-64 lg:h-64 flex items-center justify-center"
            >
              <img
                ref={imgRef}
                key={`melo-${activeFeature}`}
                src={features[activeFeature].meloImg}
                alt={`MELO Mascot - ${features[activeFeature].title}`}
                className="w-full h-full object-contain drop-shadow-lg select-none will-change-transform"
              />
            </div>

            {/* Mascot Title */}
            <div className="text-center mt-3 space-y-0.5">
              <h3 className="text-xl sm:text-2xl font-black text-[#16381E]">MELO</h3>
              <p className="text-[11px] sm:text-xs font-bold text-[#4B7F38]">Smart Melon Protection &amp; AIoT Companion</p>
            </div>

            {/* Slide Navigation Controls & Indicators */}
            <div className="flex items-center gap-2.5 mt-4">
              <button
                onClick={handlePrev}
                aria-label="Kemampuan Sebelumnya"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#16381E]/15 bg-[#FAF7EE] text-[#16381E] hover:border-[#4B7F38] hover:text-[#4B7F38] hover:bg-[#E8F2DF] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Slide Dots */}
              <div className="flex items-center gap-1.5">
                {features.map((feat, idx) => (
                  <button
                    key={feat.id}
                    onClick={() => goToSlide(idx, idx > activeFeature ? 1 : -1)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      activeFeature === idx
                        ? 'w-6 bg-[#4B7F38]'
                        : 'w-2 bg-[#16381E]/20 hover:bg-[#4B7F38]/50'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                aria-label="Kemampuan Selanjutnya"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#16381E]/15 bg-[#FAF7EE] text-[#16381E] hover:border-[#4B7F38] hover:text-[#4B7F38] hover:bg-[#E8F2DF] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Pause/Play */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? 'Lanjutkan Auto Slide' : 'Jeda Auto Slide'}
                title={isPaused ? 'Auto Slide Dijeda' : 'Auto Slide Aktif'}
                className="ml-0.5 text-[10px] sm:text-[11px] font-semibold text-[#5A6B5A] hover:text-[#4B7F38] flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#16381E]/10 bg-[#FAF7EE] transition-colors"
              >
                {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                <span>{isPaused ? 'Dijeda' : 'Otomatis'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Feature Cards & Auto-Slide Content */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">
                Kemampuan &amp; Peran MELO:
              </h3>
              <span className="text-[11px] font-semibold text-[#5A6B5A]">
                {activeFeature + 1} dari {totalFeatures}
              </span>
            </div>

            {/* Feature Select Buttons with GSAP Progress Indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {features.map((feat) => {
                const Icon = feat.icon;
                const isSelected = activeFeature === feat.id;
                return (
                  <button
                    key={feat.id}
                    onClick={() => goToSlide(feat.id, feat.id > activeFeature ? 1 : -1)}
                    className={`relative overflow-hidden p-3 sm:p-3.5 rounded-2xl text-left transition-all duration-300 border cursor-pointer ${
                      isSelected
                        ? 'border-[#4B7F38] bg-[#E8F2DF]/50 text-[#16381E] shadow-xs'
                        : 'border-[#16381E]/10 hover:border-[#4B7F38]/40 bg-[#FAF7EE]/60 text-[#16381E]'
                    }`}
                  >
                    {/* GSAP-driven progress bar — only rendered inside the active card */}
                    {isSelected && (
                      <div
                        ref={progressBarRef}
                        className="absolute bottom-0 left-0 h-[2.5px] bg-[#4B7F38] rounded-full"
                        style={{ width: '0%' }}
                      />
                    )}

                    {/* Static border indicator for non-active cards */}
                    {!isSelected && (
                      <div className="absolute bottom-0 left-0 h-[2px] bg-[#4B7F38] rounded-full w-0 opacity-0" />
                    )}

                    <div className="flex flex-col gap-1.5 sm:gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                          isSelected
                            ? 'bg-[#4B7F38] text-[#FAF7EE]'
                            : 'bg-[#FAF7EE] text-[#16381E]/70 border border-[#16381E]/10'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs sm:text-sm leading-snug line-clamp-2 transition-colors duration-300 ${isSelected ? 'font-black text-[#16381E]' : 'font-semibold text-[#2E4F34]'}`}>
                        {feat.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Feature Detail with Slide Transition */}
            <div
              ref={detailRef}
              key={`detail-${activeFeature}`}
              className="mt-5 sm:mt-6 border-t border-[#16381E]/10 pt-4 sm:pt-5 space-y-3 will-change-transform"
            >
              <h4 className="font-extrabold text-sm sm:text-base text-[#16381E] leading-snug">
                {features[activeFeature].subtitle}
              </h4>
              <p className="text-xs sm:text-sm text-[#2E4F34] leading-relaxed font-medium">
                {features[activeFeature].desc}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {features[activeFeature].badges.map((b, i) => (
                  <span
                    key={i}
                    className="text-[11px] sm:text-xs font-bold text-[#16381E] bg-[#E8F2DF] border border-[#C8D9B0] px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default MeetMelo;
