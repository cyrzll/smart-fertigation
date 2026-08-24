import React, { useRef, useEffect } from 'react';
import { gsap } from '../hooks/useGsap';
import { Users, Sprout, MapPin, HeartHandshake, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const FarmerSidoMaju = () => {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const checklistRefs = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left column slide-in
      gsap.from(leftRef.current, {
        opacity: 0,
        x: -60,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: leftRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      // Right column slide-in
      gsap.from(rightRef.current, {
        opacity: 0,
        x: 60,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.15,
        scrollTrigger: {
          trigger: rightRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      // Checklist items stagger (fade in from bottom, resets on scroll up)
      const items = checklistRefs.current.filter(Boolean);
      items.forEach((item, i) => {
        gsap.from(item, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          delay: 0.2 + i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const checklistItems = [
    {
      title: 'Pelatihan Operasional AIoT & Fertigasi',
      desc: 'Petani dibekali pemahaman pembacaan sensor dan penjadwalan siram otomatis via perangkat smartphone.',
    },
    {
      title: 'Standardisasi Kualitas Panen Melon Unggulan',
      desc: 'Meningkatkan standar bobot, tingkat kemanisan (Brix), dan estetika buah melon untuk pasar premium.',
    },
    {
      title: 'Kepastian Margin Keuntungan Petani',
      desc: 'Meminimalkan risiko gagal panen akibat serangan virus dwarfing untuk menjaga stabilitas finansial petani.',
    },
  ];

  return (
    <section ref={sectionRef} id="mitra" className="py-16 sm:py-20 lg:py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Mascot & Info (Clean subtle outline container) */}
          <div ref={leftRef} className="lg:col-span-5 relative">
            <div className="border border-[#16381E]/15 rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mx-auto">
                <img
                  src="/icon/melo_thumbsup.png"
                  alt="MELO Thumbs Up"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <span className="text-[11px] sm:text-xs font-black text-[#4B7F38] uppercase tracking-wider">Mitra Utama Lapangan</span>
                <h3 className="text-xl sm:text-2xl font-black text-[#16381E] mt-1">Kelompok Tani Sido Maju Tanjung</h3>
                <p className="text-xs text-[#2E4F34] mt-1.5 sm:mt-2 font-semibold flex items-center justify-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-[#4B7F38]" />
                  <span>Desa Ngablak &bull; 116 Ha Lahan Hortikultura</span>
                </p>
              </div>

              <div className="p-3.5 sm:p-4 border-l-2 border-[#4B7F38] text-xs text-[#2E4F34] font-medium leading-relaxed italic text-left">
                "Petani bukan sekadar objek percobaan, melainkan Local Heroes dan penggerak utama modernisasi agribisnis melon."
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#4B7F38] pt-1 sm:pt-2">
                <HeartHandshake className="w-4 h-4" />
                <span>Kemitraan Alih Teknologi Terstruktur</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Pillars */}
          <div ref={rightRef} className="lg:col-span-7 space-y-5 sm:space-y-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#16381E] tracking-tight leading-tight">
              Pemberdayaan Eksekutor Lokal <span className="text-[#4B7F38]">(Local Heroes)</span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-[#2E4F34] font-medium leading-relaxed">
              Membangun kapasitas kemandirian dan keterampilan digital Kelompok Tani Sido Maju Tanjung melalui transfer teknologi yang terstruktur di lahan hortikultura Desa Ngablak seluas 116 hektar.
            </p>

            {/* Checklist items (Thin subtle outline) */}
            <div className="space-y-3 pt-2">
              {checklistItems.map((item, i) => (
                <div
                  key={i}
                  ref={(el) => (checklistRefs.current[i] = el)}
                  className="border border-[#16381E]/10 flex items-start space-x-3 p-3.5 sm:p-4 rounded-2xl hover:border-[#4B7F38]/60 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#4B7F38] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#16381E]">{item.title}</h4>
                    <p className="text-xs text-[#2E4F34] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
