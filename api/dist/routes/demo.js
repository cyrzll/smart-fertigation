import { Hono } from 'hono';
import { pool } from '../db.js';
import { sendValveCommandToDevice, isDeviceSocketConnected, broadcastToDashboards } from '../services/wsServer.js';
const app = new Hono();
app.get('/', async (c) => {
    try {
        // Auto-expire stale running/pending commands older than 45s or past expires_at
        try {
            await pool.query(`
        UPDATE device_commands
        SET status = 'expired', completed_at = NOW(), message = 'Waktu eksekusi habis (ESP32 tidak merespon)'
        WHERE status IN ('running', 'pending')
          AND (expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 45 SECOND))
      `);
        }
        catch (_) { }
        const [devices] = await pool.query('SELECT * FROM devices ORDER BY (status = "verified") DESC, (user_id IS NOT NULL) DESC, id DESC');
        const mappedDevices = devices.map((d) => {
            const isOnlineWs = isDeviceSocketConnected(d.device_code, d.serial_code);
            const lastSeenDate = d.last_seen ? new Date(d.last_seen).getTime() : 0;
            const is_online = isOnlineWs || (Date.now() - lastSeenDate < 60000);
            return { ...d, is_online };
        });
        const device = mappedDevices.length > 0 ? mappedDevices[0] : null;
        const [valves] = await pool.query('SELECT * FROM valves ORDER BY name ASC');
        const [commands] = await pool.query(`
      SELECT dc.*, v.name AS valve_name, COALESCE(v.gpio, 25) AS gpio_pin, d.name AS device_name, d.device_code
      FROM device_commands dc
      LEFT JOIN valves v ON v.id = dc.valve_id
      LEFT JOIN devices d ON d.id = dc.device_id
      ORDER BY dc.id DESC
      LIMIT 20
    `);
        return c.json({
            success: true,
            device,
            devices: mappedDevices,
            valves,
            commands,
        });
    }
    catch (err) {
        console.error('❌ [Demo] Error in GET /api/demo:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});
app.post('/command', async (c) => {
    try {
        const body = await c.req.json();
        const { device_id, valve_id, command, duration_seconds } = body;
        const [devices] = await pool.query('SELECT * FROM devices WHERE id = ?', [device_id]);
        if (devices.length === 0) {
            return c.json({ success: false, message: 'Device tidak ditemukan' }, 404);
        }
        const [valves] = await pool.query('SELECT * FROM valves WHERE id = ?', [valve_id]);
        if (valves.length === 0) {
            return c.json({ success: false, message: 'Valve tidak ditemukan' }, 404);
        }
        const dev = devices[0];
        const valve = valves[0];
        const gpio = Number(valve.gpio || valve.gpio_pin || 25);
        const durSec = duration_seconds ? Number(duration_seconds) : 5;
        const actionCmd = command === 'CLOSE' ? 'CLOSE' : 'OPEN';
        // Insert command to device_commands
        const expires_at = new Date(Date.now() + 45000); // 45 seconds timeout
        const [res] = await pool.query(`INSERT INTO device_commands (device_id, valve_id, command, duration_seconds, status, expires_at)
       VALUES (?, ?, ?, ?, 'running', ?)`, [device_id, valve_id, command, durSec, expires_at]);
        const cmdId = res.insertId;
        // Send instant WebSocket event to ESP32
        const wsSent = sendValveCommandToDevice(dev.device_code, dev.serial_code, cmdId, gpio, actionCmd, durSec);
        console.log(`🚰 [Demo] Sent command #${cmdId} (${actionCmd}, GPIO ${gpio}, ${durSec}s) to ${dev.device_code}: WS result = ${wsSent}`);
        if (!wsSent) {
            await pool.query("UPDATE device_commands SET status = 'failed', completed_at = NOW(), message = 'ESP32 sedang offline / tidak terhubung ke WebSocket' WHERE id = ?", [cmdId]);
        }
        // Broadcast instant update to all open dashboards
        broadcastToDashboards({
            type: 'COMMAND_STATUS',
            command_id: cmdId,
            status: wsSent ? 'running' : 'failed',
            message: wsSent ? 'Perintah dikirim ke ESP32' : 'ESP32 sedang offline',
            completed_at: wsSent ? null : new Date().toISOString(),
        });
        return c.json({
            success: true,
            message: wsSent
                ? `Perintah ${command} berhasil dikirim ke ESP32 secara instan via WebSocket!`
                : `Perintah ${command} tercatat, namun ESP32 saat ini offline.`,
            id: cmdId,
            ws_sent: wsSent,
        });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
