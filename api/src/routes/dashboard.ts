import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const [plantings]: any = await pool.query(`
      SELECT p.*, fp.name as profile_name
      FROM plantings p
      LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      WHERE p.is_active = 1
      LIMIT 1
    `);

    const planting = plantings.length > 0 ? plantings[0] : null;
    let hst: number | null = null;
    let todaySchedules: any[] = [];

    if (planting && planting.planting_date) {
      const pDate = new Date(planting.planting_date);
      const today = new Date();
      pDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - pDate.getTime();
      hst = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (hst < 0) hst = 0;

      if (planting.fertigation_profile_id) {
        const [schedules]: any = await pool.query(
          `SELECT fs.*, v.name as valve_name, v.gpio
           FROM fertigation_schedules fs
           JOIN valves v ON fs.valve_id = v.id
           WHERE fs.fertigation_profile_id = ? AND fs.hst = ? AND fs.is_active = 1
           ORDER BY fs.start_time ASC`,
          [planting.fertigation_profile_id, hst]
        );
        todaySchedules = schedules;
      }
    }

    const [valvesCountRes]: any = await pool.query(
      'SELECT COUNT(*) as count FROM valves WHERE is_active = 1'
    );
    const valveCount = valvesCountRes[0]?.count || 0;

    return c.json({
      success: true,
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
      valveCount,
      todaySchedules,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
