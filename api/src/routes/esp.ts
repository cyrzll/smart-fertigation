import { Hono } from 'hono';
import { pool } from '../db.js';

const app = new Hono();

// GET /api/fertigation/schedule
app.get('/fertigation/schedule', async (c) => {
  try {
    const [plantings]: any = await pool.query(`
      SELECT p.*, fp.name as profile_name
      FROM plantings p
      JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      WHERE p.is_active = 1
      LIMIT 1
    `);

    if (plantings.length === 0) {
      return c.json({
        success: false,
        message: 'Tidak ada penanaman aktif.',
      }, 404);
    }

    const planting = plantings[0];
    const pDate = new Date(planting.planting_date);
    const today = new Date();
    pDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - pDate.getTime();
    let hst = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (hst < 0) hst = 0;

    const [schedules]: any = await pool.query(`
      SELECT fs.*, v.name as valve_name, v.gpio
      FROM fertigation_schedules fs
      JOIN valves v ON fs.valve_id = v.id
      WHERE fs.fertigation_profile_id = ? AND fs.hst_start <= ? AND fs.hst_end >= ? AND fs.is_active = 1
      ORDER BY fs.start_time ASC
    `, [planting.fertigation_profile_id, hst, hst]);

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    return c.json({
      success: true,
      server_time: nowStr,
      planting: {
        id: planting.id,
        name: planting.name,
        planting_date: planting.planting_date,
        hst,
      },
      profile: {
        id: planting.fertigation_profile_id,
        name: planting.profile_name,
      },
      schedules: schedules.map((s: any) => ({
        id: s.id,
        valve_id: s.valve_id,
        valve_name: s.valve_name,
        gpio: s.gpio,
        start_time: s.start_time,
        duration_seconds: s.duration_seconds,
      })),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/device/heartbeat
app.post('/device/heartbeat', async (c) => {
  try {
    const body = await c.req.json();
    const { device_code, serial_code, mode, current_hst, ip_address, firmware_version } = body;

    if (!device_code && !serial_code) {
      return c.json({ success: false, message: 'device_code atau serial_code wajib diisi.' }, 400);
    }

    const [devices]: any = await pool.query(
      'SELECT * FROM devices WHERE device_code = ? OR (serial_code = ? AND serial_code IS NOT NULL) LIMIT 1',
      [device_code || '', serial_code || '']
    );

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (devices.length === 0) {
      // Auto-register unregistered device
      const [insertRes]: any = await pool.query(`
        INSERT INTO devices (name, device_code, serial_code, mode, current_hst, last_seen, ip_address, firmware_version, status, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unverified', 1)
      `, [
        `ESP32 (${(device_code || serial_code).slice(-6)})`,
        device_code || `ESP-${Date.now().toString().slice(-6)}`,
        serial_code || null,
        mode || 'AUTO',
        current_hst || null,
        nowStr,
        ip_address || null,
        firmware_version || null
      ]);

      return c.json({
        success: true,
        server_time: nowStr,
        device: { id: insertRes.insertId, mode: mode || 'AUTO' },
        should_blink: false,
        blink_count: 0,
      });
    }

    const device = devices[0];
    const shouldBlink = device.blink_pending === 1;

    await pool.query(`
      UPDATE devices
      SET last_seen = NOW(),
          serial_code = COALESCE(?, serial_code),
          mode = COALESCE(?, mode),
          current_hst = COALESCE(?, current_hst),
          ip_address = COALESCE(?, ip_address),
          firmware_version = COALESCE(?, firmware_version),
          blink_pending = 0
      WHERE id = ?
    `, [serial_code || null, mode || null, current_hst || null, ip_address || null, firmware_version || null, device.id]);

    return c.json({
      success: true,
      server_time: new Date().toISOString(),
      device: {
        id: device.id,
        name: device.name,
        mode: mode || device.mode,
        status: device.status || 'verified',
      },
      verified: device.status === 'verified' && !!device.auth_code,
      auth_code: device.auth_code || null,
      should_blink: shouldBlink,
      blink_count: device.confirmation_code || 0,
      blink_gpio: 4,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/device/blink-check
app.get('/device/blink-check', async (c) => {
  try {
    const device_code = c.req.query('device_code');
    const serial_code = c.req.query('serial_code');

    if (!device_code && !serial_code) {
      return c.json({ success: false, should_blink: false, verified: false });
    }

    const [devices]: any = await pool.query(
      'SELECT * FROM devices WHERE device_code = ? OR (serial_code = ? AND serial_code IS NOT NULL) LIMIT 1',
      [device_code || '', serial_code || '']
    );

    if (devices.length === 0) {
      return c.json({ success: false, should_blink: false, verified: false });
    }

    const device = devices[0];
    const isVerified = device.status === 'verified' && !!device.auth_code;
    const shouldBlink = device.blink_pending === 1;

    // Update last_seen to NOW() whenever ESP32 polls
    await pool.query('UPDATE devices SET last_seen = NOW() WHERE id = ?', [device.id]);

    if (shouldBlink) {
      await pool.query('UPDATE devices SET blink_pending = 0 WHERE id = ?', [device.id]);
    }

    return c.json({
      success: true,
      verified: isVerified,
      auth_code: device.auth_code || null,
      should_blink: shouldBlink,
      blink_count: device.confirmation_code || 0,
      blink_gpio: 4,
      device_code: device.device_code,
      serial_code: device.serial_code,
      status: device.status || 'unverified',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/device/commands/claim
app.post('/device/commands/claim', async (c) => {
  try {
    const body = await c.req.json();
    const { device_code } = body;

    if (!device_code) {
      return c.json({ success: false, message: 'device_code wajib diisi.' }, 400);
    }

    const [devices]: any = await pool.query('SELECT * FROM devices WHERE device_code = ?', [device_code]);
    if (devices.length === 0) {
      return c.json({ success: false, message: 'Device tidak ditemukan.' }, 404);
    }

    const device = devices[0];
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Expire old pending commands
    await pool.query(`
      UPDATE device_commands
      SET status = 'expired'
      WHERE device_id = ? AND status = 'pending' AND expires_at < ?
    `, [device.id, nowStr]);

    // Find pending command
    const [commands]: any = await pool.query(`
      SELECT dc.*, v.name as valve_name, v.gpio
      FROM device_commands dc
      JOIN valves v ON dc.valve_id = v.id
      WHERE dc.device_id = ? AND dc.status = 'pending' AND (dc.expires_at IS NULL OR dc.expires_at > ?)
      ORDER BY dc.id ASC
      LIMIT 1
    `, [device.id, nowStr]);

    if (commands.length === 0) {
      return c.json({ success: true, command: null });
    }

    const command = commands[0];
    await pool.query(`
      UPDATE device_commands
      SET status = 'running', started_at = ?
      WHERE id = ?
    `, [nowStr, command.id]);

    return c.json({
      success: true,
      command: {
        id: command.id,
        type: command.command,
        valve_id: command.valve_id,
        valve_name: command.valve_name,
        gpio: command.gpio,
        duration_seconds: command.duration_seconds,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/device/commands/:id/complete
app.post('/device/commands/:id/complete', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { device_code, success, message } = body;

    if (!device_code) {
      return c.json({ success: false, message: 'device_code wajib diisi.' }, 400);
    }

    const [devices]: any = await pool.query('SELECT * FROM devices WHERE device_code = ?', [device_code]);
    if (devices.length === 0) {
      return c.json({ success: false, message: 'Device tidak ditemukan.' }, 404);
    }

    const device = devices[0];
    const [cmds]: any = await pool.query('SELECT * FROM device_commands WHERE id = ?', [id]);

    if (cmds.length === 0 || cmds[0].device_id !== device.id) {
      return c.json({ success: false, message: 'Command tidak valid.' }, 403);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const status = success ? 'completed' : 'failed';

    await pool.query(`
      UPDATE device_commands
      SET status = ?, completed_at = ?, message = ?
      WHERE id = ?
    `, [status, nowStr, message || null, id]);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/device/telemetry (Get latest greenhouse sensor readings)
app.get('/device/telemetry', async (c) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM sensor_telemetry ORDER BY created_at DESC LIMIT 1'
    );
    if (rows.length === 0) {
      return c.json({
        success: true,
        data: { suhu: 29.4, kelembaban: 76, media: 63, level_air: 72, ec: 1.8, ph: 6.2, status: 'Normal' }
      });
    }
    return c.json({ success: true, data: rows[0] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/device/telemetry (Record ESP32 greenhouse sensor data)
app.post('/device/telemetry', async (c) => {
  try {
    const body = await c.req.json();
    const { device_code, suhu, kelembaban, media, level_air, ec, ph, status } = body;

    await pool.query(
      'INSERT INTO sensor_telemetry (device_code, suhu, kelembaban, media, level_air, ec, ph, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [device_code || 'ESP-FERTIGASI-01', suhu ?? 29.4, kelembaban ?? 76, media ?? 63, level_air ?? 72, ec ?? 1.8, ph ?? 6.2, status || 'Normal']
    );

    return c.json({ success: true, message: 'Telemetry data stored successfully.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
