import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

// GET /api/growth-phases
app.get('/', async (c) => {
  try {
    const [phases]: any = await pool.query('SELECT * FROM growth_phases ORDER BY id ASC');
    return c.json({ success: true, phases });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/growth-phases
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, is_active } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, message: 'Nama fase pertumbuhan wajib diisi.' }, 400);
    }

    const activeVal = is_active === undefined ? 1 : (is_active ? 1 : 0);

    const [res]: any = await pool.query(
      'INSERT INTO growth_phases (name, description, is_active) VALUES (?, ?, ?)',
      [name.trim(), description || null, activeVal]
    );

    return c.json({ success: true, message: 'Fase pertumbuhan berhasil ditambahkan.', id: res.insertId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/growth-phases/:id
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_active } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, message: 'Nama fase pertumbuhan wajib diisi.' }, 400);
    }

    const activeVal = is_active === undefined ? 1 : (is_active ? 1 : 0);

    await pool.query(
      'UPDATE growth_phases SET name = ?, description = ?, is_active = ? WHERE id = ?',
      [name.trim(), description || null, activeVal, id]
    );

    return c.json({ success: true, message: 'Fase pertumbuhan berhasil diperbarui.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PATCH /api/growth-phases/:id/toggle
app.patch('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('UPDATE growth_phases SET is_active = NOT is_active WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Status fase pertumbuhan berhasil diubah.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/growth-phases/:id
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('DELETE FROM growth_phases WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Fase pertumbuhan berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
