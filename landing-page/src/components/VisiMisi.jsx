import React from 'react';
import { motion } from 'motion/react';
import { Target, ShieldCheck, Sprout, Users, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const VisiMisi = () => {
  const misiPillars = [
    {
      no: '01',
      title: 'Eksekusi Teknologi Presisi',
      sdgTag: 'Integrasi SDGs No. 12 (Zero Waste)',
      icon: ShieldCheck,
      desc: 'Mengimplementasikan infrastruktur AIoT Smart Crop Protection dan fertigasi otomatis untuk memblokir risiko serangan virus dwarfing secara fisik, serta mengeliminasi pemborosan biaya produksi (input) guna menciptakan sistem pertanian yang efisien dan tanpa limbah.',
      color: 'from-[#16381E] to-[#4B7F38]',
    },
    {
      no: '02',
      title: 'Eskalasi Kapasitas Produksi',
      sdgTag: 'Optimalisasi 116 Ha Lahan',
      icon: Sprout,
      desc: 'Mengubah potensi 116 hektar lahan pertanian konvensional Desa Ngablak menjadi sentra produksi hortikultura modern yang mampu mencetak komoditas melon unggulan dengan standar kualitas dan kuantitas panen yang terus meningkat di setiap musimnya.',
      color: 'from-[#4B7F38] to-[#68A64E]',
    },
    {
      no: '03',
      title: 'Pemberdayaan Eksekutor Lokal',
      sdgTag: 'Sinergi Kemitraan Local Heroes',
      icon: Users,
      desc: 'Membangun kapasitas kemandirian dan keterampilan digital Kelompok Tani Sido Maju Tanjung melalui transfer teknologi yang terstruktur, menempatkan mereka bukan sebagai objek percobaan, melainkan sebagai mitra aktif dan penggerak utama di lapangan.',
      color: 'from-[#16381E] to-[#23502C]',
    },
    {
      no: '04',
      title: 'Akselerasi Keuntungan Finansial',
      sdgTag: 'Integrasi Asta Cita ke-5 & SDGs No. 8',
      icon: TrendingUp,
      desc: 'Memutus rantai kerugian operasional akibat gagal panen untuk mengunci kepastian margin keuntungan. Peningkatan pendapatan dan kelayakan kerja petani ini ditargetkan sebagai kontribusi nyata dari tingkat desa terhadap penguatan produktivitas ekonomi nasional.',
      color: 'from-[#68A64E] to-[#4B7F38]',
    },
  ];

  return (
    <section id="visi-misi" className="py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Visi &amp; 4 Pilar Misi <span className="text-[#4B7F38]">Strategis</span>
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Komitmen Nyata Membangun Ekosistem Pertanian Melon Modern yang Berdaya Saing Tinggi &amp; Berkelanjutan.
          </p>
        </div>

        {/* VISI CARD (Featured Showcase) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-[#16381E] via-[#1C4425] to-[#2B5E36] text-[#FAF7EE] rounded-3xl p-8 sm:p-12 shadow-2xl shadow-[#16381E]/20 relative overflow-hidden mb-16 border border-[#A3C978]/30"
        >
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#A3C978]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center space-x-2 bg-[#A3C978]/20 border border-[#A3C978]/40 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#A3C978]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>VISI UTAMA PROGRAM</span>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black leading-snug tracking-tight text-[#FAF7EE]">
                "Mewujudkan ekosistem agribisnis melon Desa Ngablak yang presisi, efisien, dan berkelanjutan berbasis integrasi kecerdasan buatan (AIoT) guna memimpin akselerasi ekonomi daerah dan menjamin peningkatan kesejahteraan petani secara absolut."
              </h3>
            </div>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/10 p-2 border border-[#A3C978]/30 shrink-0 self-center">
              <img
                src="/icon/melo_surprised.png"
                alt="MELO Surprised"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs sm:text-sm text-[#D8E6C3] font-medium pt-4 mt-4 border-t border-white/10 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#A3C978]" />
              <span>Pilar Penguat Kesejahteraan Petani Ngablak &amp; Kelompok Tani Sido Maju Tanjung</span>
            </p>
          </div>
        </motion.div>

        {/* 4 PILAR MISI GRID */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-[#16381E] flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#4B7F38]" />
              <span>Empat Pilar Misi Operasional</span>
            </h3>
            <span className="text-xs font-bold text-[#4B7F38] bg-[#EAF5D8] px-3 py-1 rounded-full border border-[#C6E29B]">
              4 Strategi Eksekusi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {misiPillars.map((misi, index) => {
              const Icon = misi.icon;
              return (
                <motion.div
                  key={misi.no}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="bg-white border border-[#D8E6C3] rounded-3xl p-7 shadow-xl shadow-[#16381E]/5 hover:shadow-2xl hover:shadow-[#16381E]/10 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#16381E] to-[#4B7F38] text-[#FAF7EE] flex items-center justify-center shadow-md">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-[#C6E29B] font-mono">{misi.no}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#EAF5D8] text-[#16381E] border border-[#C6E29B]">
                        {misi.sdgTag}
                      </span>
                      <h4 className="text-lg font-extrabold text-[#16381E] mt-3">{misi.title}</h4>
                    </div>

                    <p className="text-xs sm:text-sm text-[#2E4F34] leading-relaxed font-medium">
                      {misi.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#FAF7EE] flex items-center text-xs font-bold text-[#4B7F38]">
                    <span>Implementasi Aktif</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
