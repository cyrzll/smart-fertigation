import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const [valves]: any = await pool.query('SELECT * FROM valves ORDER BY name ASC');
    return c.json({ success: true, valves });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, message: 'Nama valve wajib diisi.' }, 400);
    }
    const [res]: any = await pool.query(
      'INSERT INTO valves (name, gpio, description, is_active) VALUES (?, ?, ?, 1)',
      [body.name, body.gpio || null, body.description || null]
    );
    return c.json({ success: true, message: 'Valve berhasil ditambahkan.', id: res.insertId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, message: 'Nama valve wajib diisi.' }, 400);
    }
    await pool.query(
      'UPDATE valves SET name = ?, gpio = ?, description = ? WHERE id = ?',
      [body.name, body.gpio || null, body.description || null, id]
    );
    return c.json({ success: true, message: 'Valve berhasil diperbarui.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.patch('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('UPDATE valves SET is_active = NOT is_active WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Status valve diubah.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const [schedules]: any = await pool.query(
      'SELECT COUNT(*) as count FROM fertigation_schedules WHERE valve_id = ?',
      [id]
    );
    if (schedules[0].count > 0) {
      return c.json({ success: false, message: 'Valve masih digunakan dalam jadwal.' }, 400);
    }
    await pool.query('DELETE FROM valves WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Valve berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
