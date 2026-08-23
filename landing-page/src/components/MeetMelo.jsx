import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cpu, HeartHandshake, TrendingUp, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

export const MeetMelo = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 0,
      title: 'Smart Crop Protection Anti-Dwarfing',
      subtitle: 'Memblokir Risiko Serangan Virus Dwarfing secara Fisik & Digital',
      icon: ShieldCheck,
      meloImg: '/icon/melo_confident.png',
      desc: 'MELO mengawal proteksi tanaman melon dari ancaman virus dwarfing yang berpotensi memicu gagal panen massal. Dengan sistem proteksi pintar, risiko penyakit dapat ditekan hingga titik nol.',
      badges: ['Proteksi Fisik & AIoT', 'Resiko Gagal Panen 0%', 'Kualitas Buah Unggulan'],
    },
    {
      id: 1,
      title: 'Fertigasi Otomatis Presisi AIoT',
      subtitle: 'Eliminasi Pemborosan Pupuk & Air (Prinsip Zero Waste)',
      icon: Cpu,
      meloImg: '/icon/melo_pointing.png',
      desc: 'Melalui pembacaan sensor tanah dan mikrokontroler ESP32, MELO mengalirkan dosis air dan nutrisi secara presisi sesuai kebutuhan tanaman di setiap HST (Hari Setelah Tanam).',
      badges: ['Sensor Presisi real-time', 'Hemat Nutrisi 30%+', 'Integrasi SDGs No. 12'],
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

  return (
    <section id="mascot" className="py-20 bg-[#FAF7EE] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Kenalan dengan <span className="text-[#4B7F38]">MELO</span>
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Maskot Resmi PPK Ormawa Biro Teknik Informatika yang Siap Mengawal Akselerasi Ekosistem Agribisnis Melon Presisi Desa Ngablak.
          </p>
        </div>

        {/* Mascot Feature Tabs Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-[#D8E6C3] rounded-3xl p-6 sm:p-10 shadow-xl shadow-[#16381E]/5">
          
          {/* Left Column: Mascot Image & Aura */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#EAF5D8] to-[#FAF7EE] rounded-2xl border border-[#C6E29B]">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#A3C978]/30 animate-pulse" />
              <motion.img
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={features[activeFeature].meloImg}
                alt="MELO Mascot Character"
                className="w-full h-full object-contain drop-shadow-lg hover:rotate-3 transition-transform duration-300"
              />
            </div>
            <div className="text-center mt-4 space-y-1">
              <h3 className="text-xl font-black text-[#16381E]">MELO</h3>
              <p className="text-xs font-bold text-[#4B7F38]">Smart Melon Protection &amp; AIoT Companion</p>
            </div>
          </div>

          {/* Right Column: Interactive Feature Cards */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-extrabold text-[#4B7F38] uppercase tracking-wider mb-2">
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
                    className={`p-4 rounded-2xl text-left transition-all border ${
                      isSelected
                        ? 'bg-[#16381E] text-[#FAF7EE] border-[#16381E] shadow-lg shadow-[#16381E]/20'
                        : 'bg-[#FAF7EE] hover:bg-[#EAF5D8] text-[#16381E] border-[#D8E6C3]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#A3C978] text-[#16381E]' : 'bg-white text-[#4B7F38]'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-xs sm:text-sm line-clamp-1">{feat.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Feature Detail Showcase */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-6 bg-[#EAF5D8]/60 border border-[#C6E29B] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#4B7F38]" />
                  <h4 className="font-extrabold text-sm text-[#16381E]">
                    {features[activeFeature].subtitle}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[#2E4F34] leading-relaxed font-medium">
                  {features[activeFeature].desc}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {features[activeFeature].badges.map((b, i) => (
                    <span key={i} className="inline-flex items-center space-x-1 text-[11px] font-bold px-3 py-1 bg-white text-[#16381E] rounded-full border border-[#C6E29B]">
                      <CheckCircle2 className="w-3 h-3 text-[#4B7F38]" />
                      <span>{b}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

          </div>

        </div>

      </div>
    </section>
  );
};
