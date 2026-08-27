import { Hono } from 'hono';
import { pool } from '../db.js';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const [plantings] = await pool.query(`
      SELECT p.*, fp.name as profile_name
      FROM plantings p
      LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      ORDER BY p.id DESC
    `);
        return c.json({ success: true, plantings });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { name, planting_date, fertigation_profile_id } = body;
        if (!name || !planting_date) {
            return c.json({ success: false, message: 'Nama dan tanggal tanam wajib diisi.' }, 400);
        }
        // Set all other plantings inactive if creating a new active planting
        await pool.query('UPDATE plantings SET is_active = 0');
        const [res] = await pool.query('INSERT INTO plantings (name, planting_date, fertigation_profile_id, is_active) VALUES (?, ?, ?, 1)', [name, planting_date, fertigation_profile_id || null]);
        return c.json({ success: true, message: 'Penanaman berhasil ditambahkan dan diaktifkan.', id: res.insertId });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.patch('/:id/activate', async (c) => {
    try {
        const id = c.req.param('id');
        await pool.query('UPDATE plantings SET is_active = 0');
        await pool.query('UPDATE plantings SET is_active = 1 WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Penanaman aktif berhasil diubah.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
