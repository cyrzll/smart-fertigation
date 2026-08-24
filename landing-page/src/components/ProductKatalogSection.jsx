import React, { useEffect, useState, useRef } from 'react';
import { gsap } from '../hooks/useGsap';
import { ShoppingBag, ArrowRight, CheckCircle2, Sparkles, Tag, Flame } from 'lucide-react';

export const ProductKatalogSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardRefs = useRef([]);

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

  // Animate cards after products load
  useEffect(() => {
    if (products.length === 0) return;

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

      const cards = cardRefs.current.filter(Boolean);
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 40,
          duration: 0.7,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [products]);

  return (
    <section ref={sectionRef} id="katalog" className="py-16 sm:py-20 lg:py-24 bg-[#FAF7EE] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-xs font-black text-[#4B7F38] uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4" />
              <span>KATALOG PRODUK MELON UNGGULAN</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#16381E] tracking-tight">
              Hasil Panen <span className="text-[#4B7F38]">Melon Presisi</span> AIoT
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#2E4F34] font-medium leading-relaxed">
              Ditanam dan dipanen secara presisi dari 116 Hektar Lahan Hortikultura Desa Ngablak Bersama Kelompok Tani Sido Maju Tanjung.
            </p>
          </div>

          <a
            href="/produk"
            className="inline-flex items-center space-x-2 border border-[#16381E] text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-colors shrink-0 group self-start md:self-end"
          >
            <span>Lihat Semua Produk Melon</span>
            <ArrowRight className="w-4 h-4 text-[#4B7F38] group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Product Cards Grid (Thin subtle outline) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {products.length > 0 ? (
            products.slice(0, 3).map((prod, idx) => (
              <div
                key={prod.id}
                ref={(el) => (cardRefs.current[idx] = el)}
                className="border border-[#16381E]/15 rounded-3xl overflow-hidden flex flex-col justify-between group hover:border-[#4B7F38]/60 transition-colors"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-4/3 overflow-hidden border-b border-[#16381E]/8">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 border border-[#16381E]/20 bg-[#FAF7EE]/90 text-[#16381E] px-3 py-0.5 rounded-full text-xs font-bold">
                      {prod.category}
                    </div>

                    {prod.sold > 0 && (
                      <div className="absolute top-3 right-3 border border-amber-600/25 bg-[#FAF7EE]/90 text-amber-800 px-3 py-0.5 rounded-full text-xs font-black flex items-center space-x-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        <span>{prod.sold} kg Terjual</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#4B7F38]">
                        {prod.brix || '14° Brix'}
                      </span>
                      <span className="text-xs font-semibold text-[#2E4F34]/70">
                        {prod.weight || '1.5-2.0 kg'}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-[#16381E] group-hover:text-[#4B7F38] transition-colors">
                      {prod.name}
                    </h3>

                    <p className="text-xs text-[#2E4F34] leading-relaxed font-medium line-clamp-3">
                      {prod.description}
                    </p>
                  </div>
                </div>

                {/* Footer Price & Action */}
                <div className="p-5 sm:p-6 pt-0 border-t border-[#16381E]/8 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-[#2E4F34]/60 font-bold uppercase tracking-wider block">Harga Panen</span>
                    <span className="text-base sm:text-lg font-black text-[#16381E]">
                      Rp {prod.price.toLocaleString('id-ID')} <span className="text-xs font-normal text-[#2E4F34]/70">/{prod.priceUnit || 'kg'}</span>
                    </span>
                  </div>

                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Kelompok%20Tani%20Sido%20Maju,%20saya%20tertarik%20membeli%20${encodeURIComponent(prod.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs transition-colors"
                  >
                    Pesan
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[#2E4F34]/60 text-sm">
              {loading ? 'Memuat katalog produk melon...' : 'Belum ada produk melon.'}
            </div>
          )}
        </div>

        {/* View All Products Button */}
        <div className="mt-10 sm:mt-12 text-center">
          <a
            href="/produk"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-[#4B7F38]" />
            <span>Lihat Seluruh Katalog Produk Melon &amp; Detail Harga</span>
          </a>
        </div>

      </div>
    </section>
  );
};
