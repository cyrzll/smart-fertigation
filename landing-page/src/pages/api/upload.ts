import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { imageData, filename } = body;

    if (!imageData) {
      return new Response(JSON.stringify({ success: false, message: 'Data gambar tidak valid.' }), { status: 400 });
    }

    const matches = imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) {
      return new Response(JSON.stringify({ success: false, message: 'Format base64 gambar tidak sesuai.' }), { status: 400 });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const targetDir = path.resolve(process.cwd(), 'public/products');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = filename ? `${filename.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}.${ext}` : `melon_${Date.now()}.${ext}`;
    const filePath = path.join(targetDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/products/${safeFilename}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl, message: 'Gambar produk berhasil diunggah!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
