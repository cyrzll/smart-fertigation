import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Filter, Flame, ArrowLeft, CheckCircle2, MessageCircle, X, Sparkles } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const ProdukFullPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState(null);

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 pb-8 border-b border-[#D8E6C3]">
            <div>
              <a
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#4B7F38] hover:text-[#16381E] mb-3 transition"
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

            <div className="flex items-center space-x-2 text-xs font-bold bg-[#EAF5D8] px-4 py-2 rounded-2xl border border-[#C6E29B]">
              <Sparkles className="w-4 h-4 text-[#4B7F38]" />
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
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border ${
                    selectedCategory === cat
                      ? 'bg-[#16381E] text-[#FAF7EE] border-[#16381E] shadow-md'
                      : 'bg-white text-[#16381E] hover:bg-[#EAF5D8] border-[#D8E6C3]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari jenis melon..."
                className="w-full bg-white border border-[#D8E6C3] text-slate-900 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38] focus:ring-2 focus:ring-[#4B7F38]/20 transition"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((prod) => (
                <motion.div
                  key={prod.id}
                  whileHover={{ y: -6 }}
                  className="bg-white border border-[#D8E6C3] rounded-3xl overflow-hidden shadow-xl shadow-[#16381E]/5 flex flex-col justify-between group"
                >
                  <div>
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

                  <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Harga Panen</span>
                      <span className="text-lg font-black text-[#16381E]">
                        Rp {prod.price.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500">/{prod.priceUnit || 'kg'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedProduct(prod)}
                      className="bg-[#EAF5D8] hover:bg-[#16381E] text-[#16381E] hover:text-[#FAF7EE] font-bold px-4 py-2.5 rounded-xl text-xs transition border border-[#C6E29B]"
                    >
                      Detail &amp; Pesan
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-3 text-center py-16 text-slate-400 text-sm">
                {loading ? 'Memuat katalog produk...' : 'Produk melon tidak ditemukan.'}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white border border-[#D8E6C3] rounded-3xl overflow-hidden shadow-2xl z-10 grid grid-cols-1 sm:grid-cols-2"
            >
              <div className="relative aspect-square sm:aspect-auto bg-[#F4EFE0]">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 left-3 p-2 rounded-full bg-white/80 text-slate-700 hover:bg-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold px-3 py-1 bg-[#EAF5D8] text-[#16381E] rounded-full border border-[#C6E29B]">
                    {selectedProduct.category}
                  </span>

                  <h3 className="text-2xl font-black text-[#16381E] mt-3">{selectedProduct.name}</h3>

                  <div className="flex items-center space-x-3 my-3">
                    <span className="text-2xl font-black text-[#4B7F38]">
                      Rp {selectedProduct.price.toLocaleString('id-ID')}
                      <span className="text-xs text-slate-500 font-normal"> /{selectedProduct.priceUnit || 'kg'}</span>
                    </span>
                    {selectedProduct.sold > 0 && (
                      <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                        🔥 {selectedProduct.sold} kg Terjual
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#2E4F34] leading-relaxed font-medium">
                    {selectedProduct.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-4 text-xs font-semibold">
                    <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#D8E6C3]">
                      <span className="text-slate-400 block text-[10px]">Tingkat Kemanisan</span>
                      <span className="text-[#16381E] font-bold">{selectedProduct.brix || '14° Brix'}</span>
                    </div>
                    <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#D8E6C3]">
                      <span className="text-slate-400 block text-[10px]">Rata-rata Bobot</span>
                      <span className="text-[#16381E] font-bold">{selectedProduct.weight || '1.8 kg'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Kelompok%20Tani%20Sido%20Maju,%20saya%20tertarik%20membeli%20${encodeURIComponent(selectedProduct.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center space-x-2 bg-[#16381E] hover:bg-[#23502C] text-[#FAF7EE] font-bold py-3.5 rounded-2xl text-sm transition shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5 text-[#A3C978]" />
                    <span>Pesan Langsung via WhatsApp</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};
