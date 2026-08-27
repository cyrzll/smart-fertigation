import { Hono } from 'hono';
import { pool } from '../db.js';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const [profiles] = await pool.query('SELECT * FROM fertigation_profiles ORDER BY name ASC');
        return c.json({ success: true, profiles });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        if (!body.name) {
            return c.json({ success: false, message: 'Nama profil wajib diisi.' }, 400);
        }
        const [res] = await pool.query('INSERT INTO fertigation_profiles (name, description, is_active) VALUES (?, ?, 1)', [body.name, body.description || null]);
        return c.json({ success: true, message: 'Profil berhasil ditambahkan.', id: res.insertId });
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
            return c.json({ success: false, message: 'Nama profil wajib diisi.' }, 400);
        }
        await pool.query('UPDATE fertigation_profiles SET name = ?, description = ? WHERE id = ?', [body.name, body.description || null, id]);
        return c.json({ success: true, message: 'Profil berhasil diperbarui.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.patch('/:id/toggle', async (c) => {
    try {
        const id = c.req.param('id');
        await pool.query('UPDATE fertigation_profiles SET is_active = NOT is_active WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Status profil berhasil diubah.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const [schedules] = await pool.query('SELECT COUNT(*) as count FROM fertigation_schedules WHERE fertigation_profile_id = ?', [id]);
        if (schedules[0].count > 0) {
            return c.json({ success: false, message: 'Profil masih digunakan oleh jadwal.' }, 400);
        }
        const [plantings] = await pool.query('SELECT COUNT(*) as count FROM plantings WHERE fertigation_profile_id = ?', [id]);
        if (plantings[0].count > 0) {
            return c.json({ success: false, message: 'Profil masih digunakan oleh penanaman.' }, 400);
        }
        await pool.query('DELETE FROM fertigation_profiles WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Profil berhasil dihapus.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
