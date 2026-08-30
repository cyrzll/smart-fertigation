import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function jakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function calculateHst(plantingDate: unknown) {
  const planted = String(plantingDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planted)) return null;

  const toUtcDay = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return Math.max(0, Math.floor((toUtcDay(jakartaDateParts()) - toUtcDay(planted)) / 86_400_000));
}

app.get('/', async (c) => {
  try {
    const profileIdQuery = c.req.query('profile_id');

    const [profiles]: any = await pool.query(
      'SELECT * FROM fertigation_profiles WHERE is_active = 1 ORDER BY name ASC'
    );
    const [valves]: any = await pool.query(
      'SELECT * FROM valves WHERE is_active = 1 ORDER BY name ASC'
    );
    const [phases]: any = await pool.query(
      'SELECT * FROM growth_phases WHERE is_active = 1 ORDER BY id ASC'
    );

    let selectedProfileId = profileIdQuery ? parseInt(profileIdQuery, 10) : null;
    if (!selectedProfileId && profiles.length > 0) {
      selectedProfileId = profiles[0].id;
    }

    let selectedProfile = null;
    let schedulesList: any[] = [];

    if (selectedProfileId) {
      const [pRes]: any = await pool.query(
        'SELECT * FROM fertigation_profiles WHERE id = ?',
        [selectedProfileId]
      );
      if (pRes.length > 0) {
        selectedProfile = pRes[0];

        const [scheds]: any = await pool.query(
          `SELECT fs.*, v.name as valve_name, v.gpio, gp.name as growth_phase_name
           FROM fertigation_schedules fs
           JOIN valves v ON fs.valve_id = v.id
           LEFT JOIN growth_phases gp ON fs.growth_phase_id = gp.id
           WHERE fs.fertigation_profile_id = ?
           ORDER BY fs.hst_start ASC, fs.start_time ASC`,
          [selectedProfileId]
        );
        schedulesList = scheds;
      }
    }

    const [plantings]: any = await pool.query(`
      SELECT p.*, fp.name as profile_name
      FROM plantings p
      LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      WHERE p.is_active = 1
      LIMIT 1
    `);

    const planting = plantings.length > 0 ? plantings[0] : null;
    let hst: number | null = null;
    if (planting && planting.planting_date) hst = calculateHst(planting.planting_date);

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
  } catch (err: any) {
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
    const durMins = parseInt(duration_minutes, 10);

    if (
      !Number.isInteger(profileId) || !Number.isInteger(vId) ||
      !Number.isInteger(hStart) || !Number.isInteger(hEnd) ||
      !Number.isInteger(durMins) || hStart < 0 || hEnd < hStart || hEnd > 365 ||
      durMins < 1 || durMins > 1440 || typeof start_time !== 'string' ||
      !TIME_PATTERN.test(start_time)
    ) {
      return c.json({ success: false, message: 'Data jadwal tidak valid atau tidak lengkap.' }, 400);
    }

    const duration_seconds = durMins * 60;
    const formattedStartTime = start_time.length === 5 ? `${start_time}:00` : start_time;

    let validPhaseId = null;
    if (growth_phase_id) {
      const [ph]: any = await pool.query('SELECT id FROM growth_phases WHERE id = ?', [growth_phase_id]);
      if (ph.length > 0) validPhaseId = ph[0].id;
    }

    const [res]: any = await pool.query(
      `INSERT INTO fertigation_schedules (fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_seconds, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [profileId, vId, validPhaseId, hStart, hEnd, formattedStartTime, duration_seconds]
    );

    return c.json({ success: true, message: 'Jadwal berhasil ditambahkan.', id: res.insertId });
  } catch (err: any) {
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
    const durMins = parseInt(duration_minutes, 10);

    if (
      !Number.isInteger(profileId) || !Number.isInteger(vId) ||
      !Number.isInteger(hStart) || !Number.isInteger(hEnd) ||
      !Number.isInteger(durMins) || hStart < 0 || hEnd < hStart || hEnd > 365 ||
      durMins < 1 || durMins > 1440 || typeof start_time !== 'string' ||
      !TIME_PATTERN.test(start_time)
    ) {
      return c.json({ success: false, message: 'Data jadwal tidak valid atau tidak lengkap.' }, 400);
    }

    const duration_seconds = durMins * 60;
    const formattedStartTime = start_time.length === 5 ? `${start_time}:00` : start_time;

    let validPhaseId = null;
    if (growth_phase_id) {
      const [ph]: any = await pool.query('SELECT id FROM growth_phases WHERE id = ?', [growth_phase_id]);
      if (ph.length > 0) validPhaseId = ph[0].id;
    }

    await pool.query(
      `UPDATE fertigation_schedules
       SET fertigation_profile_id = ?, valve_id = ?, growth_phase_id = ?, hst_start = ?, hst_end = ?, start_time = ?, duration_seconds = ?
       WHERE id = ?`,
      [profileId, vId, validPhaseId, hStart, hEnd, formattedStartTime, duration_seconds, id]
    );

    return c.json({ success: true, message: 'Jadwal berhasil diperbarui.' });
  } catch (err: any) {
    console.error('Error updating schedule:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.patch('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query(
      'UPDATE fertigation_schedules SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    return c.json({ success: true, message: 'Status jadwal berhasil diubah.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await pool.query('DELETE FROM fertigation_schedules WHERE id = ?', [id]);
    return c.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
