import React from 'react';
import { motion } from 'motion/react';
import { Cpu, ShieldCheck, Database, Radio, Droplets, ArrowRight, CheckCircle2, Server } from 'lucide-react';

export const TechnologySection = () => {
  const techSteps = [
    {
      step: '01',
      title: 'Sensor Lapang Presisi',
      desc: 'Membaca kelembaban tanah, suhu lingkungan, dan kadar nutrisi secara realtime dari lahan pertanian 116 Ha Ngablak.',
      icon: Radio,
    },
    {
      step: '02',
      title: 'Proteksi Anti-Dwarfing',
      desc: 'Smart Crop Protection fisik & digital yang memblokir serangan hama serangga pembawa virus dwarfing pada tanaman melon.',
      icon: ShieldCheck,
    },
    {
      step: '03',
      title: 'Mikrokontroler ESP32',
      desc: 'Node pintar pengontrol relay solenoid valve yang mengeksekusi penyiraman sesuai instruksi jadwal HST.',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Hono API & Dashboard',
      desc: 'Server backend Node.js ultra-cepat yang menghubungkan data ke dashboard kontrol petani secara realtime.',
      icon: Server,
    },
  ];

  return (
    <section id="teknologi" className="py-24 bg-gradient-to-b from-[#FAF7EE] via-[#F4EFE0] to-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
            Smart Crop Protection &amp; <span className="text-[#4B7F38]">Fertigasi Otomatis</span>
          </h2>
          <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
            Integrasi AIoT Terpadu Mengeliminasi Pemborosan Pupuk (Zero Waste) dan Memutus Risiko Gagal Panen Virus Dwarfing.
          </p>
        </div>

        {/* Tech Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {techSteps.map((t, idx) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white border border-[#D8E6C3] rounded-3xl p-6 shadow-xl shadow-[#16381E]/5 flex flex-col justify-between relative overflow-hidden group hover:border-[#4B7F38] transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF5D8] text-[#16381E] flex items-center justify-center font-bold group-hover:bg-[#16381E] group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-black text-[#C6E29B] font-mono">{t.step}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#16381E]">{t.title}</h3>
                  <p className="text-xs text-[#2E4F34] leading-relaxed font-medium">{t.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#FAF7EE] flex items-center space-x-1 text-[11px] font-bold text-[#4B7F38]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sistem Aktif Presisi</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dashboard Integration Banner */}
        <div className="bg-[#16381E] text-[#FAF7EE] rounded-3xl p-8 sm:p-10 border border-[#A3C978]/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="w-24 h-24 rounded-2xl bg-white/10 p-2 flex items-center justify-center shrink-0 border border-[#A3C978]/30">
              <img
                src="/icon/melo_megaphone.png"
                alt="MELO Megaphone Announcer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#A3C978]/20 text-[#A3C978] text-xs font-bold border border-[#A3C978]/30">
                <Droplets className="w-3.5 h-3.5" />
                <span>Realtime IoT Monitoring</span>
              </span>
              <h3 className="text-2xl font-black text-[#FAF7EE]">Terhubung Langsung dengan Dashboard Fertigasi</h3>
              <p className="text-xs sm:text-sm text-[#D8E6C3] max-w-xl font-medium">
                Pantau HST tanaman melon, atur durasi siram per valve, jalankan mode demo pengujian relay, dan kelola master profil nutrisi dari mana saja.
              </p>
            </div>
          </div>

          <a
            href="http://localhost:4321"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-[#A3C978] hover:bg-[#b5da8c] text-[#16381E] font-black px-7 py-3.5 rounded-2xl text-sm transition shadow-lg shrink-0"
          >
            <span>Buka Dashboard Fertigasi</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </a>
        </div>

      </div>
    </section>
  );
};
