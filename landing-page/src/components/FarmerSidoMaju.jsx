import React from 'react';
import { motion } from 'motion/react';
import { Users, Sprout, MapPin, HeartHandshake, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const FarmerSidoMaju = () => {
  return (
    <section id="mitra" className="py-24 bg-gradient-to-b from-[#FAF7EE] via-[#F4EFE0] to-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image/Mascot Banner */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 relative"
          >
            <div className="bg-white border-2 border-[#C6E29B] rounded-3xl p-8 shadow-2xl shadow-[#16381E]/10 space-y-6 text-center">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-b from-[#EAF5D8] to-[#FAF7EE] p-2 flex items-center justify-center mx-auto shadow-md border border-[#C6E29B]">
                <img
                  src="/icon/melo_thumbsup.png"
                  alt="MELO Thumbs Up"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <span className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">Mitra Utama Lapangan</span>
                <h3 className="text-2xl font-black text-[#16381E] mt-1">Kelompok Tani Sido Maju Tanjung</h3>
                <p className="text-xs text-[#2E4F34] mt-2 font-semibold flex items-center justify-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-[#4B7F38]" />
                  <span>Desa Ngablak &bull; 116 Ha Lahan Hortikultura</span>
                </p>
              </div>

              <div className="p-4 bg-[#FAF7EE] rounded-2xl border border-[#D8E6C3] text-xs text-[#2E4F34] font-medium leading-relaxed">
                "Petani bukan sekadar objek percobaan, melainkan Local Heroes dan penggerak utama modernisasi agribisnis melon."
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs font-extrabold text-[#4B7F38] bg-[#EAF5D8] py-2 px-4 rounded-xl border border-[#C6E29B]">
                <HeartHandshake className="w-4 h-4" />
                <span>Kemitraan Alih Teknologi Terstruktur</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Information & Pillars */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-7 space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight leading-tight">
              Pemberdayaan Eksekutor Lokal <span className="text-[#4B7F38]">(Local Heroes)</span>
            </h2>

            <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
              Membangun kapasitas kemandirian dan keterampilan digital Kelompok Tani Sido Maju Tanjung melalui transfer teknologi yang terstruktur di lahan hortikultura Desa Ngablak seluas 116 hektar.
            </p>

            {/* Checklist items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3 bg-white p-4 rounded-2xl border border-[#D8E6C3] shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#4B7F38] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-[#16381E]">Pelatihan Operasional AIoT &amp; Fertigasi</h4>
                  <p className="text-xs text-[#2E4F34] mt-0.5">Petani dibekali pemahaman pembacaan sensor dan penjadwalan siram otomatis via perangkat smartphone.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white p-4 rounded-2xl border border-[#D8E6C3] shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#4B7F38] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-[#16381E]">Standardisasi Kualitas Panen Melon Unggulan</h4>
                  <p className="text-xs text-[#2E4F34] mt-0.5">Meningkatkan standar bobot, tingkat kemanisan (Brix), dan estetika buah melon untuk pasar premium.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white p-4 rounded-2xl border border-[#D8E6C3] shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-[#4B7F38] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-[#16381E]">Kepastian Margin Keuntungan Petani</h4>
                  <p className="text-xs text-[#2E4F34] mt-0.5">Meminimalkan risiko gagal panen akibat serangan virus dwarfing untuk menjaga stabilitas finansial petani.</p>
                </div>
              </div>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
};
