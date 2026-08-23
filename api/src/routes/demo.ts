import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const [devices]: any = await pool.query(
      'SELECT * FROM devices WHERE is_active = 1 LIMIT 1'
    );

    let device = null;
    if (devices.length > 0) {
      const d = devices[0];
      let is_online = false;
      if (d.last_seen) {
        const lastSeenDate = new Date(d.last_seen).getTime();
        const now = Date.now();
        // Online if seen within last 60 seconds
        if (now - lastSeenDate < 60000) {
          is_online = true;
        }
      }
      device = { ...d, is_online };
    }

    const [valves]: any = await pool.query(
      'SELECT * FROM valves WHERE is_active = 1 ORDER BY name ASC'
    );

    const [commands]: any = await pool.query(`
      SELECT dc.*, v.name as valve_name, d.name as device_name
      FROM device_commands dc
      JOIN valves v ON dc.valve_id = v.id
      JOIN devices d ON dc.device_id = d.id
      ORDER BY dc.id DESC
      LIMIT 20
    `);

    return c.json({
      success: true,
      device,
      valves,
      commands,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/command', async (c) => {
  try {
    const body = await c.req.json();
    const { device_id, valve_id, command, duration_seconds } = body;

    if (!device_id || !valve_id || !command) {
      return c.json({ success: false, message: 'Device, valve, dan command wajib diisi.' }, 400);
    }

    if (!['TEST_OPEN', 'CLOSE'].includes(command)) {
      return c.json({ success: false, message: 'Command tidak valid.' }, 400);
    }

    if (command === 'TEST_OPEN' && !duration_seconds) {
      return c.json({ success: false, message: 'Durasi test valve harus diisi.' }, 400);
    }

    // Expire old pending commands
    await pool.query(
      "UPDATE device_commands SET status = 'expired' WHERE device_id = ? AND status = 'pending'",
      [device_id]
    );

    const expDate = new Date(Date.now() + 30000); // 30 seconds from now
    const expires_at = expDate.toISOString().slice(0, 19).replace('T', ' ');

    const durSec = command === 'TEST_OPEN' ? parseInt(duration_seconds, 10) : null;

    const [res]: any = await pool.query(
      `INSERT INTO device_commands (device_id, valve_id, command, duration_seconds, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [device_id, valve_id, command, durSec, expires_at]
    );

    return c.json({
      success: true,
      message: 'Perintah demo dikirim.',
      id: res.insertId,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
