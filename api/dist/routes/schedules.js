import { Hono } from 'hono';
import { pool } from '../db.js';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const profileIdQuery = c.req.query('profile_id');
        const [profiles] = await pool.query('SELECT * FROM fertigation_profiles WHERE is_active = 1 ORDER BY name ASC');
        const [valves] = await pool.query('SELECT * FROM valves WHERE is_active = 1 ORDER BY name ASC');
        const [phases] = await pool.query('SELECT * FROM growth_phases WHERE is_active = 1 ORDER BY id ASC');
        let selectedProfileId = profileIdQuery ? parseInt(profileIdQuery, 10) : null;
        if (!selectedProfileId && profiles.length > 0) {
            selectedProfileId = profiles[0].id;
        }
        let selectedProfile = null;
        let schedulesList = [];
        if (selectedProfileId) {
            const [pRes] = await pool.query('SELECT * FROM fertigation_profiles WHERE id = ?', [selectedProfileId]);
            if (pRes.length > 0) {
                selectedProfile = pRes[0];
                const [scheds] = await pool.query(`SELECT fs.*, v.name as valve_name, v.gpio, gp.name as growth_phase_name
           FROM fertigation_schedules fs
           JOIN valves v ON fs.valve_id = v.id
           LEFT JOIN growth_phases gp ON fs.growth_phase_id = gp.id
           WHERE fs.fertigation_profile_id = ?
           ORDER BY fs.hst_start ASC, fs.start_time ASC`, [selectedProfileId]);
                schedulesList = scheds;
            }
        }
        const [plantings] = await pool.query(`
      SELECT p.*, fp.name as profile_name
      FROM plantings p
      LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      WHERE p.is_active = 1
      LIMIT 1
    `);
        const planting = plantings.length > 0 ? plantings[0] : null;
        let hst = null;
        if (planting && planting.planting_date) {
            const pDate = new Date(planting.planting_date);
            const today = new Date();
            pDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - pDate.getTime();
            hst = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (hst < 0)
                hst = 0;
        }
        return c.json({
            success: true,
            profiles,
            valves,
            phases,
            profile: selectedProfile,
            schedules: schedulesList,
            planting: planting
                ? {
                    id: planting.id,
                    name: planting.name,
                    planting_date: planting.planting_date,
                    fertigation_profile_id: planting.fertigation_profile_id,
                    profile_name: planting.profile_name,
                }
                : null,
            hst,
        });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_minutes } = body;
        const profileId = parseInt(fertigation_profile_id, 10);
        const vId = parseInt(valve_id, 10);
        const hStart = parseInt(hst_start !== undefined ? hst_start : 0, 10);
        const hEnd = parseInt(hst_end !== undefined ? hst_end : 99, 10);
        const durMins = parseInt(duration_minutes || 5, 10);
        if (isNaN(profileId) || isNaN(vId) || isNaN(hStart) || isNaN(hEnd) || isNaN(durMins) || !start_time) {
            return c.json({ success: false, message: 'Data jadwal tidak valid atau tidak lengkap.' }, 400);
        }
        const duration_seconds = durMins * 60;
        const formattedStartTime = start_time.length === 5 ? `${start_time}:00` : start_time;
        let validPhaseId = null;
        if (growth_phase_id) {
            const [ph] = await pool.query('SELECT id FROM growth_phases WHERE id = ?', [growth_phase_id]);
            if (ph.length > 0)
                validPhaseId = ph[0].id;
        }
        const [res] = await pool.query(`INSERT INTO fertigation_schedules (fertigation_profile_id, valve_id, growth_phase_id, hst, hst_start, hst_end, start_time, duration_seconds, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`, [profileId, vId, validPhaseId, hStart, hStart, hEnd, formattedStartTime, duration_seconds]);
        return c.json({ success: true, message: 'Jadwal berhasil ditambahkan.', id: res.insertId });
    }
    catch (err) {
        console.error('Error adding schedule:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_minutes } = body;
        const profileId = parseInt(fertigation_profile_id, 10);
        const vId = parseInt(valve_id, 10);
        const hStart = parseInt(hst_start !== undefined ? hst_start : 0, 10);
        const hEnd = parseInt(hst_end !== undefined ? hst_end : 99, 10);
        const durMins = parseInt(duration_minutes || 5, 10);
        if (isNaN(profileId) || isNaN(vId) || isNaN(hStart) || isNaN(hEnd) || isNaN(durMins) || !start_time) {
            return c.json({ success: false, message: 'Data jadwal tidak valid atau tidak lengkap.' }, 400);
        }
        const duration_seconds = durMins * 60;
        const formattedStartTime = start_time.length === 5 ? `${start_time}:00` : start_time;
        let validPhaseId = null;
        if (growth_phase_id) {
            const [ph] = await pool.query('SELECT id FROM growth_phases WHERE id = ?', [growth_phase_id]);
            if (ph.length > 0)
                validPhaseId = ph[0].id;
        }
        await pool.query(`UPDATE fertigation_schedules
       SET fertigation_profile_id = ?, valve_id = ?, growth_phase_id = ?, hst = ?, hst_start = ?, hst_end = ?, start_time = ?, duration_seconds = ?
       WHERE id = ?`, [profileId, vId, validPhaseId, hStart, hStart, hEnd, formattedStartTime, duration_seconds, id]);
        return c.json({ success: true, message: 'Jadwal berhasil diperbarui.' });
    }
    catch (err) {
        console.error('Error updating schedule:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.patch('/:id/toggle', async (c) => {
    try {
        const id = c.req.param('id');
        await pool.query('UPDATE fertigation_schedules SET is_active = NOT is_active WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Status jadwal berhasil diubah.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await pool.query('DELETE FROM fertigation_schedules WHERE id = ?', [id]);
        return c.json({ success: true, message: 'Jadwal berhasil dihapus.' });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
