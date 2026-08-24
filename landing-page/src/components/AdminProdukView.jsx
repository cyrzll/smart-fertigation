import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Edit2, Trash2, Upload, CheckCircle2, AlertCircle, RefreshCw, Flame, Tag } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AdminProdukView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Golden Melon');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('kg');
  const [sold, setSold] = useState('');
  const [stock, setStock] = useState('');
  const [brix, setBrix] = useState('14 - 16° Brix');
  const [weight, setWeight] = useState('1.5 - 2.0 kg');
  const [description, setDescription] = useState('');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.success && json.products) {
        setProducts(json.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setNotice(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: reader.result,
            filename: file.name.split('.')[0],
          }),
        });
        const json = await res.json();
        if (json.success) {
          setImage(json.url);
          setNotice({ type: 'success', text: 'Gambar produk berhasil diunggah ke /public/products/' });
        } else {
          setNotice({ type: 'error', text: json.message || 'Gagal mengunggah gambar' });
        }
      } catch (err) {
        setNotice({ type: 'error', text: 'Gagal mengunggah file gambar' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    try {
      setSubmitting(true);
      setNotice(null);

      const payload = {
        id: editingId || undefined,
        name,
        category,
        image: image || '/products/melon_golden_inthanon.jpg',
        price: Number(price),
        priceUnit,
        sold: Number(sold) || 0,
        stock: Number(stock) || 0,
        brix,
        weight,
        description,
        featured: true,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setNotice({ type: 'success', text: editingId ? 'Produk melon berhasil diperbarui.' : 'Produk melon baru berhasil ditambahkan.' });
        resetForm();
        setProducts(json.products || []);
      } else {
        setNotice({ type: 'error', text: json.message || 'Gagal menyimpan produk.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Gagal terhubung ke API server.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (prod) => {
    setEditingId(prod.id);
    setName(prod.name);
    setCategory(prod.category);
    setImage(prod.image);
    setPrice(prod.price);
    setPriceUnit(prod.priceUnit || 'kg');
    setSold(prod.sold);
    setStock(prod.stock);
    setBrix(prod.brix || '14° Brix');
    setWeight(prod.weight || '1.8 kg');
    setDescription(prod.description || '');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus produk melon ini?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setNotice({ type: 'success', text: 'Produk berhasil dihapus.' });
        setProducts(json.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategory('Golden Melon');
    setImage('');
    setPrice('');
    setSold('');
    setStock('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#16381E] selection:bg-[#4B7F38] selection:text-[#FAF7EE] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#D8E6C3]">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#16381E] tracking-tight">
                Admin CRUD <span className="text-[#4B7F38]">Katalog Produk Melon</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#2E4F34] mt-1 font-medium">
                Kelola data varietas melon, foto, harga, stok, dan total penjualan (Terjual). Simpan otomatis ke JSON &amp; /public.
              </p>
            </div>

            <button
              onClick={fetchProducts}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#EAF5D8] text-[#16381E] text-xs font-bold transition border border-[#C6E29B] shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#4B7F38]' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>

          {notice && (
            <div className={`px-4 py-3 rounded-2xl text-sm flex items-center space-x-2 shadow-sm ${
              notice.type === 'success' ? 'bg-[#EAF5D8] border border-[#C6E29B] text-[#16381E]' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {notice.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-[#4B7F38]" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          <div className="bg-white border border-[#D8E6C3] rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#16381E]/5">
            <h2 className="text-lg font-black text-[#16381E] mb-6 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-[#4B7F38]" />
              <span>{editingId ? 'Edit Produk Melon' : 'Tambah Produk Melon Baru'}</span>
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Nama Melon</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Melon Golden Inthanon RZ"
                    required
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Jenis / Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  >
                    <option value="Golden Melon">Golden Melon</option>
                    <option value="Green Melon">Green Melon</option>
                    <option value="Rock Melon">Rock Melon</option>
                    <option value="Cantaloupe">Cantaloupe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Harga (Rp) / Satuan</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="45000"
                      required
                      className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                    />
                    <select
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(e.target.value)}
                      className="bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-3 py-2.5 text-xs font-semibold"
                    >
                      <option value="kg">kg</option>
                      <option value="buah">buah</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Melon Terjual (kg)</label>
                  <input
                    type="number"
                    value={sold}
                    onChange={(e) => setSold(e.target.value)}
                    placeholder="350"
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Stok Tersedia (kg)</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="80"
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Brix Kemanisan</label>
                  <input
                    type="text"
                    value={brix}
                    onChange={(e) => setBrix(e.target.value)}
                    placeholder="14 - 16° Brix"
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Rata-rata Bobot</label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="1.5 - 2.2 kg"
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>
              </div>

              {/* Upload Foto Melon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Foto Melon (Simpan ke /public/products/)</label>
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer inline-flex items-center space-x-2 bg-[#EAF5D8] hover:bg-[#16381E] text-[#16381E] hover:text-[#FAF7EE] font-bold px-4 py-2.5 rounded-2xl text-xs transition border border-[#C6E29B]">
                      <Upload className="w-4 h-4" />
                      <span>{uploading ? 'Mengunggah...' : 'Pilih File Gambar'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <span className="text-xs text-slate-400 font-mono truncate">{image || 'Belum ada gambar terpilih'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Atau URL Gambar Direct</label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="/products/melon_golden_inthanon.jpg"
                    className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16381E] uppercase tracking-wider mb-2">Deskripsi Produk Melon</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat rasa, tekstur, aroma, dan informasi panen melon..."
                  className="w-full bg-[#FAF7EE] border border-[#D8E6C3] text-slate-900 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:border-[#4B7F38]"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#16381E] hover:bg-[#23502C] text-[#FAF7EE] font-bold px-7 py-3 rounded-2xl text-xs transition shadow-md flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4 text-[#A3C978]" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Produk Melon'}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-100 text-slate-600 font-bold px-5 py-3 rounded-2xl text-xs"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table List Products */}
          <div className="bg-white border border-[#D8E6C3] rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#16381E]/5">
            <h2 className="text-lg font-black text-[#16381E] mb-6">Daftar Produk Melon Terdaftar</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D8E6C3] text-[#4B7F38] uppercase font-bold bg-[#FAF7EE]">
                    <th className="py-3 px-4 rounded-l-xl">Foto</th>
                    <th className="py-3 px-4">Nama Melon</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Harga / Satuan</th>
                    <th className="py-3 px-4">Terjual</th>
                    <th className="py-3 px-4">Stok</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.length > 0 ? (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#EAF5D8]/40 transition">
                        <td className="py-3 px-4">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#D8E6C3]"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-[#16381E] text-sm">{p.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#EAF5D8] text-[#16381E] font-bold border border-[#C6E29B]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#4B7F38]">
                          Rp {p.price?.toLocaleString('id-ID')} /{p.priceUnit || 'kg'}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-700">
                          🔥 {p.sold || 0} kg
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {p.stock || 0} kg
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 rounded-xl bg-[#EAF5D8] hover:bg-[#16381E] text-[#16381E] hover:text-white border border-[#C6E29B] transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada data produk melon.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};
