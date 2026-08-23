import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

const getProductsPath = () => path.resolve(process.cwd(), 'src/data/products.json');
const getPublicProductsPath = () => path.resolve(process.cwd(), 'public/data/products.json');

const readProducts = () => {
  try {
    const p = getProductsPath();
    if (!fs.existsSync(p)) return [];
    const content = fs.readFileSync(p, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
};

const writeProducts = (products: any[]) => {
  const jsonStr = JSON.stringify(products, null, 2);
  fs.writeFileSync(getProductsPath(), jsonStr, 'utf-8');
  
  const pubDir = path.resolve(process.cwd(), 'public/data');
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }
  fs.writeFileSync(getPublicProductsPath(), jsonStr, 'utf-8');
};

export const GET: APIRoute = async () => {
  const products = readProducts();
  return new Response(JSON.stringify({ success: true, products }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const products = readProducts();

    if (body.id) {
      const index = products.findIndex((p: any) => p.id === body.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...body };
      } else {
        products.push(body);
      }
    } else {
      const newProduct = {
        id: `prod-${Date.now()}`,
        name: body.name || 'Melon Baru',
        category: body.category || 'Melon',
        image: body.image || '/products/melon_golden_inthanon.jpg',
        price: Number(body.price) || 0,
        priceUnit: body.priceUnit || 'kg',
        sold: Number(body.sold) || 0,
        stock: Number(body.stock) || 0,
        brix: body.brix || '14° Brix',
        weight: body.weight || '1.5 - 2.0 kg',
        description: body.description || '',
        featured: Boolean(body.featured),
      };
      products.unshift(newProduct);
    }

    writeProducts(products);

    return new Response(JSON.stringify({ success: true, message: 'Produk berhasil disimpan.', products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'ID produk tidak ditemukan.' }), { status: 400 });
    }

    let products = readProducts();
    products = products.filter((p: any) => p.id !== id);
    writeProducts(products);

    return new Response(JSON.stringify({ success: true, message: 'Produk berhasil dihapus.', products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
