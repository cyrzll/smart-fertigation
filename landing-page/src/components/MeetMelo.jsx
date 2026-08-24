import React, { useState, useRef, useEffect } from 'react';
import { gsap } from '../hooks/useGsap';
import { ShieldCheck, Cpu, HeartHandshake, TrendingUp, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

export const MeetMelo = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const detailRef = useRef(null);

  const features = [
    {
      id: 0,
      title: 'Smart Crop Protection Anti-Dwarfing',
      subtitle: 'Memblokir Risiko Serangan Virus Dwarfing secara Fisik',
      icon: ShieldCheck,
      meloImg: '/icon/melo_confident.png',
      desc: 'MELO mengawal proteksi tanaman melon dari ancaman virus dwarfing yang dibawa oleh vektor serangga melalui instalasi proteksi fisik terpadu (barrier/screen), menekan risiko gagal panen hingga titik nol.',
      badges: ['Proteksi Fisik Tanaman', 'Resiko Gagal Panen 0%', 'Kualitas Buah Unggulan'],
    },
    {
      id: 1,
      title: 'Fertigasi Otomatis Presisi AIoT',
      subtitle: 'Eliminasi Pemborosan Pupuk & Air (Prinsip Zero Waste)',
      icon: Cpu,
      meloImg: '/icon/melo_pointing.png',
      desc: 'Melalui kontrol mikrokontroler ESP32 dan platform dashboard, MELO mengalirkan air dan nutrisi pupuk secara presisi sesuai kebutuhan tanaman di setiap fase HST (Hari Setelah Tanam).',
      badges: ['Otomatisasi Fase HST', 'Hemat Nutrisi 30%+', 'Integrasi SDGs No. 12'],
    },
    {
      id: 2,
      title: 'Pendamping Petani Ngablak (Local Heroes)',
      subtitle: 'Mentransfer Keterampilan Digital ke Kelompok Tani Sido Maju Tanjung',
      icon: HeartHandshake,
      meloImg: '/icon/melo_thumbsup.png',
      desc: 'MELO hadir bukan untuk menggantikan petani, melainkan sebagai sahabat digital (companion) yang memperkuat kapasitas Kelompok Tani Sido Maju Tanjung menguasai teknologi hortikultura modern.',
      badges: ['Transfer Teknologi', 'Lahan 116 Hektar', 'Kemitraan Berkelanjutan'],
    },
    {
      id: 3,
      title: 'Akselerasi Ekonomi & Margin Keuntungan',
      subtitle: 'Penguatan Ekonomi Nasional Dimulai dari Tingkat Desa',
      icon: TrendingUp,
      meloImg: '/icon/melo_happy.png',
      desc: 'Menjamin kepastian hasil panen melon premium berdaya jual tinggi, mengunci margin keuntungan petani, serta berkontribusi langsung pada pencapaian Asta Cita ke-5 & SDGs No. 8.',
      badges: ['Asta Cita ke-5', 'SDGs No. 8', 'Margin Keuntungan Terkunci'],
    },
  ];

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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (imgRef.current) {
      gsap.fromTo(imgRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
    if (detailRef.current) {
      gsap.fromTo(detailRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [activeFeature]);

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

        {/* Mascot Feature Container (Clean subtle outline) */}
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-[#16381E]/10 rounded-3xl p-6 sm:p-10">
          
          {/* Left Column: Floating Mascot Image */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <img
                ref={imgRef}
                key={activeFeature}
                src={features[activeFeature].meloImg}
                alt="MELO Mascot Character"
                className="w-full h-full object-contain drop-shadow-md hover:rotate-3 transition-transform duration-300"
              />
            </div>
            <div className="text-center mt-4 space-y-1">
              <h3 className="text-2xl font-black text-[#16381E]">MELO</h3>
              <p className="text-xs font-bold text-[#4B7F38]">Smart Melon Protection &amp; AIoT Companion</p>
            </div>
          </div>

          {/* Right Column: Interactive Feature Cards */}
          <div className="lg:col-span-7 space-y-5">
            <h3 className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">
              Pilih Kemampuan MELO:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feat) => {
                const Icon = feat.icon;
                const isSelected = activeFeature === feat.id;
                return (
                  <button
                    key={feat.id}
                    onClick={() => setActiveFeature(feat.id)}
                    className={`p-3.5 rounded-2xl text-left transition-all border ${
                      isSelected
                        ? 'border border-[#16381E]/50 text-[#16381E]'
                        : 'border border-[#16381E]/10 hover:border-[#4B7F38]/50 text-[#16381E]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-[#4B7F38]' : 'text-[#16381E]/60'}`} />
                      <span className={`text-xs sm:text-sm line-clamp-1 ${isSelected ? 'font-black' : 'font-semibold'}`}>
                        {feat.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Feature Detail */}
            <div
              ref={detailRef}
              key={activeFeature}
              className="mt-6 border-t border-[#16381E]/10 pt-5 space-y-3"
            >
              <div className="flex items-center space-x-2 text-[#4B7F38]">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-extrabold text-sm text-[#16381E]">
                  {features[activeFeature].subtitle}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-[#2E4F34] leading-relaxed font-medium">
                {features[activeFeature].desc}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {features[activeFeature].badges.map((b, i) => (
                  <span key={i} className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{b}</span>
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
