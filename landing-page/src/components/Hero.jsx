import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Cpu, Sprout, ArrowRight } from 'lucide-react';

export const Hero = () => {
  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-[#FAF7EE] via-[#F4EFE0] to-[#FAF7EE]">
      {/* Background Decorative Glow Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#A3C978]/30 via-[#68A64E]/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-[#CFE29C]/30 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline & Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#16381E] tracking-tight leading-[1.15]">
              Mewujudkan Ekosistem <span className="text-[#4B7F38] underline decoration-[#A3C978] decoration-4">Agribisnis Melon Presisi</span> Berbasis AIoT &amp; Smart Protection
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#2E4F34] leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
              Transformasi 116 Hektar Lahan Pertanian Desa Ngablak Bersama Kelompok Tani Sido Maju Tanjung Melalui AIoT Smart Crop Protection, Fertigasi Otomatis &amp; Strategi Zero Waste.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <a
                href="#visi-misi"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#16381E] hover:bg-[#23502C] text-[#FAF7EE] font-bold px-7 py-3.5 rounded-2xl text-sm transition shadow-xl shadow-[#16381E]/20 group"
              >
                <span>Jelajahi 4 Pilar Misi</span>
                <ArrowRight className="w-4 h-4 text-[#A3C978] group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#teknologi"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-[#EAF5D8] text-[#16381E] font-bold px-7 py-3.5 rounded-2xl text-sm transition border border-[#C6E29B] shadow-sm"
              >
                <Cpu className="w-4 h-4 text-[#4B7F38]" />
                <span>Sistem Fertigasi AIoT</span>
              </a>
            </div>

            {/* Live Stats Bar */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#D8E6C3]/80">
              <div className="bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-[#D8E6C3] text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-black text-[#16381E]">116 Ha</div>
                <div className="text-[11px] font-bold text-[#4B7F38]">Lahan Hortikultura</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-[#D8E6C3] text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-black text-[#16381E]">4 Pilar</div>
                <div className="text-[11px] font-bold text-[#4B7F38]">Misi Operasional</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-[#D8E6C3] text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-black text-[#16381E]">Zero Waste</div>
                <div className="text-[11px] font-bold text-[#4B7F38]">Integrasi SDGs #12</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: MELO Mascot Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 relative flex justify-center"
          >
            {/* Mascot Container Box */}
            <div className="relative w-full max-w-md aspect-square bg-gradient-to-tr from-[#EAF5D8] via-white to-[#FAF7EE] rounded-3xl p-6 border-2 border-[#C6E29B] shadow-2xl shadow-[#16381E]/10 flex items-center justify-center">
              {/* Pulsing Aura Effect */}
              <div className="absolute inset-4 rounded-2xl bg-[#A3C978]/20 animate-pulse -z-10" />

              {/* Main MELO Mascot Image */}
              <img
                src="/icon/melo_main.png"
                alt="MELO Mascot"
                className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
