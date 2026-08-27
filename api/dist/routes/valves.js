import { Hono } from 'hono';
import { pool } from '../db.js';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const [valves] = await pool.query(`
      SELECT v.*, d.name AS device_name, d.device_code, d.serial_code
      FROM valves v
      LEFT JOIN devices d ON d.id = v.device_id
      ORDER BY v.name ASC
    `);
        const [devices] = await pool.query('SELECT id, name, device_code, serial_code, status, mode FROM devices ORDER BY (status = "verified") DESC, id DESC');
        return c.json({ success: true, valves, devices });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        if (!body.name) {
            return c.json({ success: false, message: 'Nama valve wajib diisi.' }, 400);
        }
        const [res] = await pool.query('INSERT INTO valves (name, gpio, description, device_id, is_active) VALUES (?, ?, ?, ?, 1)', [body.name, body.gpio || null, body.description || null, body.device_id || null]);
        return c.json({ success: true, message: 'Valve berhasil ditambahkan.', id: res.insertId });
    }
    catch (err) {
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
        await pool.query('UPDATE valves SET name = ?, gpio = ?, description = ?, device_id = ? WHERE id = ?', [body.name, body.gpio || null, body.description || null, body.device_id || null, id]);
        return c.json({ success: true, message: 'Valve berhasil diperbarui.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.patch('/:id/toggle', async (c) => {
    try {
        const id = c.req.param('id');
        await pool.query('UPDATE valves SET is_active = NOT is_active WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Status valve diubah.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const [schedules] = await pool.query('SELECT COUNT(*) as count FROM fertigation_schedules WHERE valve_id = ?', [id]);
        if (schedules[0].count > 0) {
            return c.json({ success: false, message: 'Valve masih digunakan dalam jadwal.' }, 400);
        }
        await pool.query('DELETE FROM valves WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Valve berhasil dihapus.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
