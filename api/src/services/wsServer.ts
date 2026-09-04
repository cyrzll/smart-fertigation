import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { pool } from '../db.js';

interface DeviceSocket {
  ws: WebSocket;
  deviceCode: string;
  serialCode?: string;
  authCode?: string;
  telemetryDeviceCode?: string;
  connectedAt: Date;
}

export interface TelemetryAlertEvent {
  deviceCode: string;
  registeredDeviceCode: string;
  serialCode?: string;
  kelembaban: number | null;
  tds: number | null;
  createdAt: string;
}

// Store active ESP32 WebSocket connections
const activeDevices = new Map<string, DeviceSocket>();

// Store active Dashboard WebSocket connections
const activeDashboards = new Set<WebSocket>();
const lastDbTelemetryInsert = new Map<string, number>();
let telemetryAlertHandler: ((event: TelemetryAlertEvent) => Promise<void>) | null = null;

let wss: WebSocketServer | null = null;
let pingIntervalStarted = false;
let fertigationSchedulerStarted = false;
let fertigationSchedulerRunning = false;
const executedScheduleSlots = new Map<string, number>();

function jakartaDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

async function runFertigationScheduler() {
  if (fertigationSchedulerRunning) return;
  fertigationSchedulerRunning = true;

  try {
    const now = jakartaDateTimeParts();
    const [rows]: any = await pool.query(`
      SELECT fs.id, fs.valve_id, fs.duration_seconds, v.gpio, v.device_id,
             d.device_code, d.serial_code
      FROM plantings p
      JOIN fertigation_profiles fp
        ON fp.id = COALESCE(
          p.fertigation_profile_id,
          (SELECT id FROM fertigation_profiles WHERE is_active = 1 ORDER BY name ASC, id ASC LIMIT 1)
        )
      JOIN fertigation_schedules fs ON fs.fertigation_profile_id = fp.id
      JOIN valves v ON v.id = fs.valve_id AND v.is_active = 1
      LEFT JOIN devices d ON d.id = v.device_id AND d.is_active = 1
      WHERE p.is_active = 1
        AND fs.is_active = 1
        AND fs.hst_start <= DATEDIFF(?, p.planting_date)
        AND fs.hst_end >= DATEDIFF(?, p.planting_date)
        AND TIME_FORMAT(fs.start_time, '%H:%i') = ?
    `, [now.date, now.date, now.time]);

    for (const schedule of rows) {
      const slotKey = `${schedule.id}:${now.date}:${now.time}`;
      if (executedScheduleSlots.has(slotKey)) continue;

      const target = schedule.device_code || schedule.serial_code
        ? findDeviceSocket(schedule.device_code, schedule.serial_code)
        : (getOnlyConnectedDeviceCode() ? findDeviceSocket(getOnlyConnectedDeviceCode()!) : null);

      if (!target) {
        console.warn(`[Scheduler] Jadwal #${schedule.id} jatuh tempo, tetapi perangkat tidak online.`);
        continue;
      }

      const [commandResult]: any = await pool.query(`
        INSERT INTO device_commands
          (device_id, valve_id, command, duration_seconds, status, started_at, created_at)
        VALUES (
          (SELECT id FROM devices WHERE device_code = ? LIMIT 1),
          ?, 'OPEN', ?, 'running', NOW(), NOW()
        )
      `, [target.telemetryDeviceCode || target.deviceCode, schedule.valve_id, schedule.duration_seconds]);

      const sent = sendValveCommandToDevice(
        target.deviceCode,
        target.serialCode,
        commandResult.insertId,
        Number(schedule.gpio),
        'OPEN',
        Number(schedule.duration_seconds),
      );

      if (sent) {
        executedScheduleSlots.set(slotKey, Date.now());
        console.log(`[Scheduler] Jadwal #${schedule.id} dijalankan pada ${now.date} ${now.time} WIB.`);
      } else {
        await pool.query(
          "UPDATE device_commands SET status = 'failed', completed_at = NOW(), message = ? WHERE id = ?",
          ['Perangkat WebSocket tidak tersedia.', commandResult.insertId],
        );
      }
    }

    const expiry = Date.now() - 2 * 60 * 60 * 1000;
    for (const [key, timestamp] of executedScheduleSlots) {
      if (timestamp < expiry) executedScheduleSlots.delete(key);
    }
  } catch (err: any) {
    console.error('[Scheduler] Gagal memproses jadwal fertigasi:', err.message);
  } finally {
    fertigationSchedulerRunning = false;
  }
}

export function setTelemetryAlertHandler(handler: (event: TelemetryAlertEvent) => Promise<void>) {
  telemetryAlertHandler = handler;
}

// Broadcast helper to all connected browser dashboards
export function broadcastToDashboards(data: any) {
  const payload = JSON.stringify(data);
  for (const client of activeDashboards) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err: any) {
        console.error('[WebSocket] Error sending to dashboard:', err.message);
      }
    }
  }
}

// Get array of unique online device codes
export function getOnlineDeviceCodes(): string[] {
  const codes = new Set<string>();
  for (const dev of activeDevices.values()) {
    if (dev.deviceCode) codes.add(dev.deviceCode);
    if (dev.serialCode) codes.add(dev.serialCode);
  }
  return Array.from(codes);
}

export function initWebSocketServer(server: HttpServer) {
  // Allow WebSocket connections on /ws/device and /ws/dashboard
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;

    if (pathname === '/ws/device' || pathname === '/ws/dashboard' || pathname.startsWith('/ws')) {
      wss?.handleUpgrade(request, socket, head, (ws) => {
        wss?.emit('connection', ws, request);
      });
    }
  });

  // Start ping heartbeat interval to maintain active connections (25s interval)
  if (!pingIntervalStarted) {
    pingIntervalStarted = true;
    setInterval(() => {
      for (const [code, dev] of Array.from(activeDevices.entries())) {
        if (code.startsWith('serial_')) continue; // Skip secondary key

        if ((dev.ws as any).isAlive === false) {
          console.log(`🔌 [WebSocket] Heartbeat timeout on device: ${dev.deviceCode} (${dev.serialCode || 'No Serial'}) -> Marking OFFLINE`);
          try {
            dev.ws.terminate();
          } catch (_) {}

          activeDevices.delete(dev.deviceCode);
          if (dev.serialCode) activeDevices.delete(`serial_${dev.serialCode}`);

          broadcastToDashboards({
            type: 'DEVICE_STATUS',
            device_code: dev.deviceCode,
            serial_code: dev.serialCode,
            is_online: false,
            last_seen: new Date().toISOString(),
          });
          continue;
        }

        (dev.ws as any).isAlive = false;
        try {
          dev.ws.ping();
        } catch (_) {}
      }
    }, 25000);
  }

  if (!fertigationSchedulerStarted) {
    fertigationSchedulerStarted = true;
    setInterval(() => void runFertigationScheduler(), 10_000);
    void runFertigationScheduler();
    console.log('⏱️ [Scheduler] Fertigasi otomatis aktif (zona waktu Asia/Jakarta).');
  }

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;

      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      // =========================================================================
      // 1. DASHBOARD BROWSER WEBSOCKET CLIENT (/ws/dashboard)
      // =========================================================================
      if (pathname === '/ws/dashboard') {
        console.log('💻 [WebSocket] Dashboard client connected!');
        activeDashboards.add(ws);

        // Send current snapshot of online devices
        const onlineList = getOnlineDeviceCodes();
        ws.send(JSON.stringify({
          type: 'DEVICES_ONLINE_SNAPSHOT',
          online_devices: onlineList,
          server_time: new Date().toISOString(),
        }));

        ws.on('close', () => {
          activeDashboards.delete(ws);
          console.log('💻 [WebSocket] Dashboard client disconnected.');
        });

        ws.on('error', () => {
          activeDashboards.delete(ws);
        });

        return;
      }

      // =========================================================================
      // 2. ESP32 DEVICE WEBSOCKET CLIENT (/ws/device)
      // =========================================================================
      const deviceCode = url.searchParams.get('device_code') || 'ESP-FERTIGASI-01';
      const serialCode = url.searchParams.get('serial_code') || 'tes123';
      const authCode = url.searchParams.get('auth_code') || '';

      console.log(`\n🔌 [WebSocket] ESP32 Connected! Device: ${deviceCode} (Serial: ${serialCode})`);

      const deviceSocket: DeviceSocket = {
        ws,
        deviceCode,
        serialCode,
        authCode,
        telemetryDeviceCode: deviceCode,
        connectedAt: new Date(),
      };

      activeDevices.set(deviceCode, deviceSocket);
      if (serialCode) {
        activeDevices.set(`serial_${serialCode}`, deviceSocket);
      }

      // Update DB last_seen = NOW()
      try {
        const [registeredDevices]: any = await pool.query(
          `SELECT device_code
           FROM devices
           WHERE device_code = ? OR (serial_code = ? AND serial_code IS NOT NULL)
           ORDER BY (device_code = ?) DESC
           LIMIT 1`,
          [deviceCode, serialCode || '', deviceCode]
        );
        deviceSocket.telemetryDeviceCode = registeredDevices[0]?.device_code || deviceCode;

        await pool.query(`
          UPDATE devices
          SET last_seen = NOW(),
              serial_code = COALESCE(?, serial_code),
              auth_code = COALESCE(?, auth_code)
          WHERE device_code = ? OR (serial_code = ? AND serial_code IS NOT NULL)
        `, [serialCode || null, authCode || null, deviceCode, serialCode || '']);
      } catch (err: any) {
        console.error('[WebSocket] Error updating device in DB:', err.message);
      }

      // Broadcast to all Dashboards that device is ONLINE
      broadcastToDashboards({
        type: 'DEVICE_STATUS',
        device_code: deviceCode,
        serial_code: serialCode,
        is_online: true,
        last_seen: new Date().toISOString(),
      });

      // Send initial welcome message to ESP32
      ws.send(JSON.stringify({
        type: 'WELCOME',
        message: 'Connected to Smart Fertigation WebSocket Server',
        device_code: deviceCode,
        server_time: new Date().toISOString(),
      }));

      ws.on('message', async (data) => {
        try {
          (ws as any).isAlive = true;
          const payload = JSON.parse(data.toString());
          console.log(`📩 [WebSocket] Message from ${deviceCode}:`, payload);

          // Update last_seen in DB
          await pool.query(
            'UPDATE devices SET last_seen = NOW() WHERE device_code = ? OR (serial_code = ? AND serial_code IS NOT NULL)',
            [deviceCode, serialCode || '']
          );

          // Notify dashboards of active device
          broadcastToDashboards({
            type: 'DEVICE_STATUS',
            device_code: deviceCode,
            serial_code: serialCode,
            is_online: true,
            last_seen: new Date().toISOString(),
            telemetry: payload.type === 'TELEMETRY' ? payload : undefined,
          });

          if (payload.type === 'TELEMETRY') {
            const { suhu, kelembaban, media, level_air, ec, tds, status } = payload;
            const finalEc = ec != null ? Number(ec) : (tds != null ? Number(tds) / 500.0 : null);
            const finalTds = tds != null ? Number(tds) : (ec != null ? Number(ec) * 500.0 : null);

            const nowTime = Date.now();
            const lastInsert = lastDbTelemetryInsert.get(deviceCode) || 0;
            if (nowTime - lastInsert >= 10000) {
              lastDbTelemetryInsert.set(deviceCode, nowTime);
              try {
                await pool.query(
                  'INSERT INTO sensor_telemetry (device_code, suhu, kelembaban, media, level_air, ec, tds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    deviceSocket.telemetryDeviceCode || deviceCode,
                    suhu != null ? Number(suhu) : null,
                    kelembaban != null ? Number(kelembaban) : null,
                    media != null ? Number(media) : null,
                    level_air != null ? Number(level_air) : null,
                    finalEc != null ? Number(finalEc.toFixed(2)) : null,
                    finalTds != null ? Number(finalTds.toFixed(0)) : null,
                    status || 'Normal',
                  ]
                );
              } catch (dbErr: any) {
                console.error('[WebSocket] Error saving sensor telemetry:', dbErr.message);
              }
            }

            broadcastToDashboards({
              type: 'SENSOR_TELEMETRY',
              device_code: deviceCode,
              serial_code: serialCode,
              telemetry: {
                suhu,
                kelembaban,
                media,
                level_air,
                ec: finalEc != null ? Number(finalEc.toFixed(2)) : null,
                tds: finalTds != null ? Number(finalTds.toFixed(0)) : null,
                status: status || 'Normal',
                created_at: new Date().toISOString(),
              },
            });

            if (telemetryAlertHandler) {
              void telemetryAlertHandler({
                deviceCode,
                registeredDeviceCode: deviceSocket.telemetryDeviceCode || deviceCode,
                serialCode,
                kelembaban: kelembaban != null && Number.isFinite(Number(kelembaban)) ? Number(kelembaban) : null,
                tds: finalTds != null && Number.isFinite(finalTds) ? Number(finalTds.toFixed(0)) : null,
                createdAt: new Date().toISOString(),
              }).catch((alertErr: any) => {
                console.error('[WebSocket] Error processing sensor alert:', alertErr.message);
              });
            }
          }

          if (payload.type === 'HEARTBEAT') {
            ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', time: new Date().toISOString() }));
          } else if (payload.type === 'COMMAND_COMPLETE') {
            const cmdId = payload.command_id;
            if (cmdId) {
              await pool.query(
                "UPDATE device_commands SET status = 'completed', completed_at = NOW(), message = ? WHERE id = ?",
                [payload.message || 'Executed via WebSocket', cmdId]
              );
              broadcastToDashboards({
                type: 'COMMAND_STATUS',
                command_id: cmdId,
                status: 'completed',
                message: payload.message,
                completed_at: new Date().toISOString(),
              });
            }
          }
        } catch (err: any) {
          console.error('[WebSocket] Error processing message:', err.message);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 [WebSocket] Device disconnected: ${deviceCode}`);
        activeDevices.delete(deviceCode);
        if (serialCode) {
          activeDevices.delete(`serial_${serialCode}`);
        }

        // Broadcast to Dashboards that device is OFFLINE
        broadcastToDashboards({
          type: 'DEVICE_STATUS',
          device_code: deviceCode,
          serial_code: serialCode,
          is_online: false,
          last_seen: new Date().toISOString(),
        });
      });

      ws.on('error', (err) => {
        console.error(`❌ [WebSocket] Socket error on ${deviceCode}:`, err.message);
      });
    } catch (err: any) {
      console.error('[WebSocket] Connection error:', err.message);
    }
  });

  console.log('🚀 [WebSocket] Server listening on ws://localhost:3001 (Paths: /ws/device & /ws/dashboard)');
}

// Helper to find active device socket matching device_code OR serial_code
export function findDeviceSocket(deviceCode?: string, serialCode?: string): DeviceSocket | null {
  const c1 = deviceCode ? deviceCode.trim().toLowerCase() : '';
  const c2 = serialCode ? serialCode.trim().toLowerCase() : '';

  if (deviceCode && activeDevices.has(deviceCode.trim())) {
    const dev = activeDevices.get(deviceCode.trim())!;
    if (dev.ws.readyState === WebSocket.OPEN) return dev;
  }
  if (serialCode && activeDevices.has(`serial_${serialCode.trim()}`)) {
    const dev = activeDevices.get(`serial_${serialCode.trim()}`)!;
    if (dev.ws.readyState === WebSocket.OPEN) return dev;
  }

  for (const dev of activeDevices.values()) {
    if (dev.ws.readyState !== WebSocket.OPEN) continue;
    const dCode = dev.deviceCode ? dev.deviceCode.toLowerCase() : '';
    const sCode = dev.serialCode ? dev.serialCode.toLowerCase() : '';

    if (c1 && (dCode === c1 || sCode === c1)) return dev;
    if (c2 && (dCode === c2 || sCode === c2)) return dev;
  }
  return null;
}

// Instant push for LED confirmation blink (1-8 times)
export function sendBlinkToDevice(deviceCode?: string, serialCode?: string, count: number = 2, gpio: number = 4): boolean {
  const target = findDeviceSocket(deviceCode, serialCode);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify({
      type: 'BLINK',
      count,
      gpio,
      timestamp: Date.now(),
    }));
    console.log(`⚡ [WebSocket] Sent instant BLINK signal (${count}x) to ${target.deviceCode} (${target.serialCode || 'No Serial'})`);
    return true;
  }
  console.log(`⚠️ [WebSocket] Device ${deviceCode || serialCode} not active on WebSocket.`);
  return false;
}

// Instant push for approved permanent auth_code
export function sendAuthApprovedToDevice(deviceCode?: string, serialCode?: string, authCode: string = ''): boolean {
  const target = findDeviceSocket(deviceCode, serialCode);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify({
      type: 'AUTH_APPROVED',
      auth_code: authCode,
      timestamp: Date.now(),
    }));
    console.log(`🔑 [WebSocket] Sent instant AUTH_APPROVED (${authCode}) to ${target.deviceCode}`);
    return true;
  }
  return false;
}

// Instant push for valve control commands
export function sendValveCommandToDevice(
  deviceCode?: string,
  serialCode?: string,
  commandId: number = 0,
  gpio: number = 25,
  command: string = 'OPEN',
  durationSeconds: number = 5
): boolean {
  const target = findDeviceSocket(deviceCode, serialCode);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify({
      type: 'VALVE_CONTROL',
      command_id: commandId,
      gpio,
      command,
      duration: durationSeconds,
      timestamp: Date.now(),
    }));
    console.log(`🚰 [WebSocket] Sent instant VALVE_CONTROL to ${target.deviceCode} (GPIO ${gpio}, ${durationSeconds}s)`);
    return true;
  }
  console.log(`⚠️ [WebSocket] Failed to send VALVE_CONTROL to ${deviceCode || serialCode} - Socket not open`);
  return false;
}

// Instant push for LED control commands on GPIO 4 (ON / OFF / BLINK)
export function sendLedControlToDevice(
  deviceCode?: string,
  serialCode?: string,
  state: 'ON' | 'OFF' | 'BLINK' = 'ON',
  gpio: number = 4,
  durationSeconds: number = 0
): boolean {
  const target = findDeviceSocket(deviceCode, serialCode);
  if (target && target.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify({
      type: 'LED_CONTROL',
      state,
      gpio,
      duration: durationSeconds,
      timestamp: Date.now(),
    }));
    console.log(`💡 [WebSocket] Sent instant LED_CONTROL (${state}, GPIO ${gpio}) to ${target.deviceCode} (${target.serialCode || 'No Serial'})`);
    return true;
  }
  console.log(`⚠️ [WebSocket] Failed to send LED_CONTROL to ${deviceCode || serialCode} - Socket not open`);
  return false;
}

export function isDeviceSocketConnected(deviceCode?: string, serialCode?: string): boolean {
  return findDeviceSocket(deviceCode, serialCode) !== null;
}

export function getConnectedDeviceCode(deviceCode?: string, serialCode?: string): string | null {
  return findDeviceSocket(deviceCode, serialCode)?.deviceCode || null;
}

export function getOnlyConnectedDeviceCode(): string | null {
  const connectedDevices = new Set<DeviceSocket>();
  for (const device of activeDevices.values()) {
    if (device.ws.readyState === WebSocket.OPEN) connectedDevices.add(device);
  }
  if (connectedDevices.size !== 1) return null;
  return Array.from(connectedDevices)[0]?.deviceCode || null;
}
