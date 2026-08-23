import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight, CheckCircle2, Sparkles, Tag, Flame } from 'lucide-react';

export const ProductKatalogSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="katalog" className="py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-[#EAF5D8] border border-[#C6E29B] px-4 py-1.5 rounded-full text-xs font-bold text-[#16381E]">
              <ShoppingBag className="w-4 h-4 text-[#4B7F38]" />
              <span>KATALOG PRODUK MELON UNGGULAN</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
              Hasil Panen <span className="text-[#4B7F38]">Melon Presisi</span> AIoT
            </h2>
            <p className="text-sm sm:text-base text-[#2E4F34] font-medium leading-relaxed">
              Ditanam dan dipanen secara presisi dari 116 Hektar Lahan Hortikultura Desa Ngablak Bersama Kelompok Tani Sido Maju Tanjung.
            </p>
          </div>

          <a
            href="/produk"
            className="inline-flex items-center space-x-2 bg-[#16381E] hover:bg-[#23502C] text-[#FAF7EE] font-bold px-6 py-3.5 rounded-2xl text-sm transition shadow-lg shadow-[#16381E]/20 shrink-0 group self-start md:self-end"
          >
            <span>Lihat Semua Produk Melon</span>
            <ArrowRight className="w-4 h-4 text-[#A3C978] group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.length > 0 ? (
            products.slice(0, 3).map((prod) => (
              <motion.div
                key={prod.id}
                whileHover={{ y: -6 }}
                className="bg-white border border-[#D8E6C3] rounded-3xl overflow-hidden shadow-xl shadow-[#16381E]/5 flex flex-col justify-between group"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-4/3 overflow-hidden bg-[#F4EFE0]">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-[#16381E]/90 backdrop-blur-md text-[#FAF7EE] px-3 py-1 rounded-full text-xs font-bold border border-[#A3C978]/30">
                      {prod.category}
                    </div>

                    {prod.sold > 0 && (
                      <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-black shadow-md flex items-center space-x-1">
                        <Flame className="w-3.5 h-3.5 fill-white" />
                        <span>{prod.sold} kg Terjual</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4B7F38] bg-[#EAF5D8] px-2.5 py-0.5 rounded-md border border-[#C6E29B]">
                        {prod.brix || '14° Brix'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {prod.weight || '1.5-2.0 kg'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-[#16381E] group-hover:text-[#4B7F38] transition-colors">
                      {prod.name}
                    </h3>

                    <p className="text-xs text-[#2E4F34] leading-relaxed font-medium line-clamp-3">
                      {prod.description}
                    </p>
                  </div>
                </div>

                {/* Footer Price & Action */}
                <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Harga Panen</span>
                    <span className="text-lg font-black text-[#16381E]">
                      Rp {prod.price.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">/{prod.priceUnit || 'kg'}</span>
                    </span>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Kelompok%20Tani%20Sido%20Maju,%20saya%20tertarik%20membeli%20${encodeURIComponent(prod.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#EAF5D8] hover:bg-[#16381E] text-[#16381E] hover:text-[#FAF7EE] font-bold px-4 py-2.5 rounded-xl text-xs transition border border-[#C6E29B]"
                  >
                    Pesan Sekarang
                  </a>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
              {loading ? 'Memuat katalog produk melon...' : 'Belum ada produk melon.'}
            </div>
          )}
        </div>

        {/* View All Products Button */}
        <div className="mt-12 text-center">
          <a
            href="/produk"
            className="inline-flex items-center space-x-2 bg-white hover:bg-[#EAF5D8] text-[#16381E] font-extrabold px-8 py-4 rounded-2xl text-sm border-2 border-[#C6E29B] shadow-md transition"
          >
            <ShoppingBag className="w-4 h-4 text-[#4B7F38]" />
            <span>Lihat Seluruh Katalog Produk Melon &amp; Detail Harga</span>
          </a>
        </div>

      </div>
    </section>
  );
};
