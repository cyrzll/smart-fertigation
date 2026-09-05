import React, { useEffect, useState, useRef, useCallback } from 'react';
import { gsap } from '../hooks/useGsap';
import { ShoppingBag, Search, Filter, Flame, ArrowLeft, CheckCircle2, MessageCircle, X, Sparkles } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingCreatorBadge } from './FloatingCreatorBadge';

export const ProdukFullPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const modalOverlayRef = useRef(null);
  const modalContentRef = useRef(null);

  const openModal = useCallback((prod) => {
    setSelectedProduct(prod);
    requestAnimationFrame(() => {
      if (modalOverlayRef.current) {
        gsap.fromTo(modalOverlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      }
      if (modalContentRef.current) {
        gsap.fromTo(modalContentRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
      }
    });
  }, []);

  const closeModal = useCallback(() => {
    if (modalOverlayRef.current) {
      gsap.to(modalOverlayRef.current, { opacity: 0, duration: 0.2 });
    }
    if (modalContentRef.current) {
      gsap.to(modalContentRef.current, { opacity: 0, scale: 0.95, y: 10, duration: 0.2, onComplete: () => setSelectedProduct(null) });
    } else {
      setSelectedProduct(null);
    }
  }, []);

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

  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#16381E] selection:bg-[#4B7F38] selection:text-[#FAF7EE] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 pb-8 border-b border-[#16381E]/10">
            <div>
              <a
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38] hover:text-[#16381E] mb-3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </a>
              <h1 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
                Katalog Produk <span className="text-[#4B7F38]">Melon Presisi</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#2E4F34] mt-1 font-medium">
                Koleksi Varietas Melon Unggulan Panen 116 Ha Hortikultura Desa Ngablak &amp; Kelompok Tani Sido Maju Tanjung.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-bold text-[#4B7F38]">
              <Sparkles className="w-4 h-4" />
              <span>Smart Protection &amp; Zero Waste</span>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
            {/* Categories */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors border ${
                    selectedCategory === cat
                      ? 'border border-[#16381E]/50 text-[#16381E]'
                      : 'border border-[#16381E]/15 text-[#16381E] hover:border-[#4B7F38]/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#2E4F34]/50 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari jenis melon..."
                className="w-full bg-transparent border border-[#16381E]/15 text-[#16381E] placeholder:text-[#2E4F34]/50 rounded-full pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#4B7F38] transition-colors"
              />
            </div>
          </div>

          {/* Products Grid (Thin subtle outline) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="border border-[#16381E]/15 rounded-3xl overflow-hidden flex flex-col justify-between group hover:border-[#4B7F38]/60 transition-colors"
                >
                  <div>
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

                    <div className="p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4B7F38]">
                          {prod.brix || '14° Brix'}
                        </span>
                        <span className="text-xs font-semibold text-[#2E4F34]/70">
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

                  <div className="p-6 pt-0 border-t border-[#16381E]/8 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] text-[#2E4F34]/60 font-bold uppercase tracking-wider block">Harga Panen</span>
                      <span className="text-lg font-black text-[#16381E]">
                        Rp {prod.price.toLocaleString('id-ID')} <span className="text-xs font-normal text-[#2E4F34]/70">/{prod.priceUnit || 'kg'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => openModal(prod)}
                      className="border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-bold px-4 py-2 rounded-full text-xs transition-colors"
                    >
                      Detail &amp; Pesan
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-16 text-[#2E4F34]/60 text-sm">
                {loading ? 'Memuat katalog produk...' : 'Produk melon tidak ditemukan.'}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={modalOverlayRef}
            onClick={closeModal}
            className="fixed inset-0 bg-[#16381E]/40 backdrop-blur-xs"
          />

          <div
            ref={modalContentRef}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FAF7EE] border border-[#16381E]/20 rounded-3xl shadow-2xl z-10 grid grid-cols-1 sm:grid-cols-2"
          >
            <div className="relative aspect-square sm:aspect-auto border-b sm:border-b-0 sm:border-r border-[#16381E]/8">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={closeModal}
                className="absolute top-3 left-3 p-1.5 rounded-full border border-[#16381E]/25 bg-[#FAF7EE] text-[#16381E] hover:text-[#4B7F38]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-[#4B7F38] uppercase tracking-wider">
                  {selectedProduct.category}
                </span>

                <h3 className="text-2xl font-black text-[#16381E] mt-2">{selectedProduct.name}</h3>

                <div className="flex items-center space-x-3 my-3">
                  <span className="text-2xl font-black text-[#4B7F38]">
                    Rp {selectedProduct.price.toLocaleString('id-ID')}
                    <span className="text-xs text-[#2E4F34]/70 font-normal"> /{selectedProduct.priceUnit || 'kg'}</span>
                  </span>
                  {selectedProduct.sold > 0 && (
                    <span className="text-xs font-bold text-amber-800 border border-amber-600/25 px-2.5 py-0.5 rounded-full">
                      🔥 {selectedProduct.sold} kg Terjual
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#2E4F34] leading-relaxed font-medium">
                  {selectedProduct.description}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-4 text-xs">
                  <div className="p-3 border border-[#16381E]/10 rounded-xl">
                    <span className="text-[#2E4F34]/60 block text-[10px] uppercase font-bold">Tingkat Kemanisan</span>
                    <span className="text-[#16381E] font-black">{selectedProduct.brix || '14° Brix'}</span>
                  </div>
                  <div className="p-3 border border-[#16381E]/10 rounded-xl">
                    <span className="text-[#2E4F34]/60 block text-[10px] uppercase font-bold">Rata-rata Bobot</span>
                    <span className="text-[#16381E] font-black">{selectedProduct.weight || '1.8 kg'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#16381E]/8">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Kelompok%20Tani%20Sido%20Maju,%20saya%20tertarik%20membeli%20${encodeURIComponent(selectedProduct.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center space-x-2 border border-[#16381E]/30 text-[#16381E] hover:text-[#4B7F38] hover:border-[#4B7F38] font-black py-3 rounded-full text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#4B7F38]" />
                  <span>Pesan Langsung via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <FloatingCreatorBadge />
    </div>
  );
};
