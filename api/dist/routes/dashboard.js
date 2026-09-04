import { Hono } from 'hono';
import { pool } from '../db.js';
import { isDeviceSocketConnected } from '../services/wsServer.js';
const app = new Hono();
function jakartaDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}
app.get('/', async (c) => {
    try {
        const [plantings] = await pool.query(`
      SELECT p.*,
             COALESCE(fp.id, fallback_fp.id) AS effective_profile_id,
             COALESCE(fp.name, fallback_fp.name) AS profile_name,
             COALESCE(fp.description, fallback_fp.description) AS profile_description,
             COALESCE(fp.is_active, fallback_fp.is_active) AS profile_is_active
      FROM plantings p
      LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
      LEFT JOIN fertigation_profiles fallback_fp ON fallback_fp.id = (
        SELECT id FROM fertigation_profiles
        WHERE is_active = 1
        ORDER BY name ASC, id ASC
        LIMIT 1
      )
      WHERE p.is_active = 1
      LIMIT 1
    `);
        const planting = plantings.length > 0 ? plantings[0] : null;
        let hst = null;
        let todaySchedules = [];
        if (planting && planting.planting_date) {
            const [hstResult] = await pool.query('SELECT GREATEST(0, DATEDIFF(?, ?)) AS hst', [jakartaDate(), planting.planting_date]);
            hst = Number(hstResult[0]?.hst || 0);
            if (planting.effective_profile_id) {
                const [schedules] = await pool.query(`SELECT fs.*, v.name as valve_name, v.gpio
           FROM fertigation_schedules fs
           JOIN valves v ON fs.valve_id = v.id
           WHERE fs.fertigation_profile_id = ?
             AND fs.hst_start <= ? AND fs.hst_end >= ?
             AND fs.is_active = 1
           ORDER BY fs.start_time ASC`, [planting.effective_profile_id, hst, hst]);
                todaySchedules = schedules;
            }
        }
        let activeProfile = null;
        if (planting?.effective_profile_id) {
            const [profileRows] = await pool.query(`SELECT fp.id, fp.name, fp.description, fp.is_active,
                COUNT(fs.id) AS schedule_count
         FROM fertigation_profiles fp
         LEFT JOIN fertigation_schedules fs
           ON fs.fertigation_profile_id = fp.id AND fs.is_active = 1
         WHERE fp.id = ?
         GROUP BY fp.id, fp.name, fp.description, fp.is_active`, [planting.effective_profile_id]);
            activeProfile = profileRows[0] || null;
        }
        const [valvesCountRes] = await pool.query('SELECT COUNT(*) as count FROM valves WHERE is_active = 1');
        const valveCount = valvesCountRes[0]?.count || 0;
        // Ambil data telemetri sensor terbaru (suhu, kelembapan udara, TDS/EC)
        const [telemetryRes] = await pool.query('SELECT * FROM sensor_telemetry ORDER BY created_at DESC LIMIT 1');
        const latestTelemetry = telemetryRes.length > 0 ? telemetryRes[0] : null;
        // Ambil satu pencatatan terbaru untuk setiap menit agar status tidak berulang
        // saat ESP32 mengirim telemetri beberapa kali dalam menit yang sama.
        const [recentTelemetries] = await pool.query(`SELECT st.id, st.device_code, st.suhu, st.suhu_air, st.kelembaban, st.media,
              st.level_air, st.ec, st.tds, st.status, st.created_at
       FROM sensor_telemetry st
       INNER JOIN (
         SELECT MAX(id) AS id
         FROM sensor_telemetry
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
         ORDER BY MAX(created_at) DESC
         LIMIT 15
       ) per_minute ON per_minute.id = st.id
       ORDER BY st.created_at DESC`);
        // Rata-rata per jam, dipisahkan berdasarkan tanggal, untuk grafik 7 hari terakhir.
        const [hourlyTelemetries] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
              HOUR(created_at) AS hour,
              ROUND(AVG(kelembaban), 1) AS avg_kelembaban,
              ROUND(AVG(media), 1) AS avg_media,
              ROUND(AVG(COALESCE(tds, ec * 500)), 0) AS avg_tds,
              ROUND(AVG(suhu), 1) AS avg_suhu,
              ROUND(AVG(suhu_air), 1) AS avg_suhu_air,
              COUNT(*) AS sample_count
       FROM sensor_telemetry
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), HOUR(created_at)
       ORDER BY day DESC, hour ASC`);
        // Ambil data perangkat ESP32 dan status konektivitas realtime
        const [devices] = await pool.query('SELECT id, name, device_code, serial_code, status, last_seen FROM devices ORDER BY (status = "verified") DESC, (user_id IS NOT NULL) DESC, id ASC');
        const mappedDevices = devices.map((d) => {
            const isOnlineWs = isDeviceSocketConnected(d.device_code, d.serial_code);
            const lastSeenDate = d.last_seen ? new Date(d.last_seen).getTime() : 0;
            const is_online = isOnlineWs || (Date.now() - lastSeenDate < 60000);
            return { ...d, is_online };
        });
        return c.json({
            success: true,
            planting: planting
                ? {
                    id: planting.id,
                    name: planting.name,
                    planting_date: planting.planting_date,
                    fertigation_profile_id: planting.effective_profile_id,
                    profile_name: planting.profile_name,
                }
                : null,
            hst,
            activeProfile,
            valveCount,
            todaySchedules,
            latestTelemetry,
            recentTelemetries: recentTelemetries || [],
            hourlyTelemetries: hourlyTelemetries || [],
            devices: mappedDevices,
            primaryDevice: mappedDevices[0] || null,
        });
    }
    catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});
export default app;
