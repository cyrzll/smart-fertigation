import React from 'react';
import { motion } from 'motion/react';
import { Globe, Award, HeartHandshake, CheckCircle2, Sparkles } from 'lucide-react';

export const SdgSection = () => {
  return (
    <section id="sdgs" className="py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Mendukung <span className="text-[#4B7F38]">SDGs Target</span> &amp; Asta Cita ke-5
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Kontribusi Nyata Tingkat Desa Ngablak untuk Penguatan Ekonomi Nasional Berkelanjutan.
          </p>
        </div>

        {/* SDGs & Asta Cita Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: SDGs No. 12 */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white border border-[#D8E6C3] rounded-3xl p-7 shadow-xl shadow-[#16381E]/5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF5D8] text-[#16381E] font-black text-xl flex items-center justify-center border border-[#C6E29B]">
                12
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#4B7F38] uppercase tracking-wider">SDGs Goal 12</span>
                <h3 className="text-lg font-black text-[#16381E] mt-1">Konsumsi &amp; Produksi Bertanggung Jawab</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#2E4F34] font-medium leading-relaxed">
                Menerapkan prinsip Zero Waste dalam penyiraman &amp; pemupukan melon lewat fertigasi presisi AIoT guna menghapus pemborosan biaya input pertanian.
              </p>
            </div>
            <div className="pt-4 border-t border-[#FAF7EE] flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pilar Misi Operasional #1</span>
            </div>
          </motion.div>

          {/* Card 2: SDGs No. 8 */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white border border-[#D8E6C3] rounded-3xl p-7 shadow-xl shadow-[#16381E]/5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF5D8] text-[#16381E] font-black text-xl flex items-center justify-center border border-[#C6E29B]">
                8
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#4B7F38] uppercase tracking-wider">SDGs Goal 8</span>
                <h3 className="text-lg font-black text-[#16381E] mt-1">Pekerjaan Layak &amp; Pertumbuhan Ekonomi</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#2E4F34] font-medium leading-relaxed">
                Meningkatkan pendapatan dan kelayakan kerja petani lokal lewat kepastian panen komoditas melon berkualitas unggul.
              </p>
            </div>
            <div className="pt-4 border-t border-[#FAF7EE] flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pilar Misi Operasional #4</span>
            </div>
          </motion.div>

          {/* Card 3: Asta Cita ke-5 */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white border border-[#D8E6C3] rounded-3xl p-7 shadow-xl shadow-[#16381E]/5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#16381E] text-[#FAF7EE] font-black text-xl flex items-center justify-center shadow-md">
                <Award className="w-7 h-7 text-[#A3C978]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#4B7F38] uppercase tracking-wider">Program Nasional</span>
                <h3 className="text-lg font-black text-[#16381E] mt-1">Asta Cita ke-5 Indonesia</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#2E4F34] font-medium leading-relaxed">
                Penguatan produktivitas ekonomi nasional yang dibangun secara inklusif dan berkelanjutan berbasis potensi desa.
              </p>
            </div>
            <div className="pt-4 border-t border-[#FAF7EE] flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Penguatan Ekonomi Desa</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
