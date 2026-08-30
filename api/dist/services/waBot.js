import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import { pool } from '../db.js';
import { getConnectedDeviceCode, getOnlyConnectedDeviceCode, isDeviceSocketConnected, sendValveCommandToDevice, setTelemetryAlertHandler, } from './wsServer.js';
let sock = null;
let qrCodeData = null;
let connectionState = 'disconnected';
let connectedUser = null;
let reconnectTimer = null;
const sessionDir = path.resolve(process.cwd(), 'session');
const logger = pino({ level: 'silent' });
const PH_SPIKE_THRESHOLD = 0.5;
const TDS_SPIKE_THRESHOLD = 200;
const PH_SAFE_MIN = 5.5;
const PH_SAFE_MAX = 6.5;
const TDS_SAFE_MIN = 800;
const TDS_SAFE_MAX = 1400;
const SENSOR_ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const sensorAlertStates = new Map();
const formatWibDateTime = (value) => {
    if (!value)
        return 'Belum pernah terhubung';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return 'Waktu tidak tersedia';
    return `${new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date)} WIB`;
};
const formatSensorValue = (value, decimals = 1) => {
    if (value == null || value === '' || !Number.isFinite(Number(value)))
        return '—';
    return Number(value).toFixed(decimals);
};
const hasSensorValue = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const getStatusIndicator = (status) => {
    const label = String(status || 'Tidak diketahui');
    const normalized = label.toLowerCase();
    const icon = ['normal', 'optimal', 'baik', 'aman', 'online'].some((value) => normalized.includes(value))
        ? '🟢'
        : ['warning', 'peringatan', 'rendah', 'tinggi'].some((value) => normalized.includes(value))
            ? '🟡'
            : '🔴';
    return `${icon} ${label}`;
};
const formatDelta = (value, decimals) => `${value >= 0 ? '↑' : '↓'}${Math.abs(value).toFixed(decimals)}`;
const getSensorRange = (value, min, max) => {
    if (value == null)
        return null;
    if (value < min)
        return 'low';
    if (value > max)
        return 'high';
    return 'normal';
};
async function handleTelemetrySpike(event) {
    const stateKey = event.registeredDeviceCode || event.serialCode || event.deviceCode;
    const existingState = sensorAlertStates.get(stateKey);
    const previous = existingState || { ph: null, tds: null, lastAlertAt: 0 };
    const phDelta = event.ph != null && previous.ph != null ? event.ph - previous.ph : null;
    const tdsDelta = event.tds != null && previous.tds != null ? event.tds - previous.tds : null;
    const phSpiked = phDelta != null && Math.abs(phDelta) >= PH_SPIKE_THRESHOLD;
    const tdsSpiked = tdsDelta != null && Math.abs(tdsDelta) >= TDS_SPIKE_THRESHOLD;
    const phRange = getSensorRange(event.ph, PH_SAFE_MIN, PH_SAFE_MAX);
    const tdsRange = getSensorRange(event.tds, TDS_SAFE_MIN, TDS_SAFE_MAX);
    const previousPhRange = getSensorRange(previous.ph, PH_SAFE_MIN, PH_SAFE_MAX);
    const previousTdsRange = getSensorRange(previous.tds, TDS_SAFE_MIN, TDS_SAFE_MAX);
    const shouldAlertPh = event.ph != null && (phSpiked
        || (existingState ? phRange !== previousPhRange : phRange !== 'normal'));
    const shouldAlertTds = event.tds != null && (tdsSpiked
        || (existingState ? tdsRange !== previousTdsRange : tdsRange !== 'normal'));
    const now = Date.now();
    const isInCooldown = now - previous.lastAlertAt < SENSOR_ALERT_COOLDOWN_MS;
    const shouldSendAlert = (shouldAlertPh || shouldAlertTds) && !isInCooldown;
    sensorAlertStates.set(stateKey, {
        // Pertahankan nilai referensi sampai perubahan mencapai ambang signifikan.
        ph: shouldAlertPh || !existingState ? (event.ph ?? previous.ph) : previous.ph,
        tds: shouldAlertTds || !existingState ? (event.tds ?? previous.tds) : previous.tds,
        // Reservasi cooldown sebelum proses kirim untuk mencegah event paralel mengirim dua pesan.
        lastAlertAt: shouldSendAlert ? now : previous.lastAlertAt,
    });
    if (!shouldSendAlert)
        return;
    const [recipients] = await pool.query(`SELECT DISTINCT uwn.whatsapp_number, u.name, u.uid
     FROM devices d
     JOIN users u ON u.id = d.user_id
     JOIN user_whatsapp_numbers uwn ON uwn.uid = u.uid
     WHERE uwn.status = 'verified'
       AND (
         d.device_code IN (?, ?)
         OR (d.serial_code = ? AND d.serial_code IS NOT NULL)
       )`, [event.registeredDeviceCode, event.deviceCode, event.serialCode || '']);
    if (recipients.length === 0)
        return;
    const changes = [];
    if (shouldAlertPh && event.ph != null) {
        if (phSpiked && phDelta != null) {
            changes.push(`pH  : ${previous.ph?.toFixed(2)} → ${event.ph.toFixed(2)} (${formatDelta(phDelta, 2)})`);
        }
        else {
            const condition = phRange === 'low' ? 'terlalu rendah' : phRange === 'high' ? 'terlalu tinggi' : 'kembali ideal';
            changes.push(`pH  : ${event.ph.toFixed(2)} (${condition}; target ${PH_SAFE_MIN.toFixed(1)}–${PH_SAFE_MAX.toFixed(1)})`);
        }
    }
    if (shouldAlertTds && event.tds != null) {
        if (tdsSpiked && tdsDelta != null) {
            changes.push(`TDS : ${Math.round(previous.tds)} → ${Math.round(event.tds)} PPM (${formatDelta(tdsDelta, 0)})`);
        }
        else {
            const condition = tdsRange === 'low' ? 'terlalu rendah' : tdsRange === 'high' ? 'terlalu tinggi' : 'kembali ideal';
            changes.push(`TDS : ${Math.round(event.tds)} PPM (${condition}; target ${TDS_SAFE_MIN}–${TDS_SAFE_MAX} PPM)`);
        }
    }
    const message = `⚠️ *PERINGATAN SENSOR pH & TDS*
Perangkat: ${event.registeredDeviceCode}

${changes.join('\n')}

Waktu: ${formatWibDateTime(event.createdAt)}
Segera periksa kondisi air dan larutan nutrisi.`;
    const results = await Promise.allSettled(recipients.map((recipient) => sendWaMessage(recipient.whatsapp_number, message)));
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Gagal mengirim notifikasi sensor ke ${recipients[index].whatsapp_number}:`, result.reason);
        }
    });
}
export function normalizePhoneAndJid(rawInput) {
    let phone = rawInput.split('@')[0].replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1);
    }
    const chatJid = `${phone}@s.whatsapp.net`;
    return { chatJid, cleanPhone: phone };
}
export async function saveWaMessage(chatJid, senderName, senderPhone, body, fromMe, avatarUrl) {
    try {
        const { chatJid: normJid, cleanPhone: normPhone } = normalizePhoneAndJid(chatJid);
        await pool.query('INSERT INTO wa_messages (chat_jid, sender_name, sender_phone, avatar_url, body, from_me) VALUES (?, ?, ?, ?, ?, ?)', [normJid, senderName || normPhone, normPhone, avatarUrl || null, body, fromMe]);
    }
    catch (err) {
        console.error('Error saving wa message to DB:', err);
    }
}
export async function initWaBot() {
    setTelemetryAlertHandler(handleTelemetrySpike);
    try {
        if (sock) {
            try {
                sock.end(undefined);
            }
            catch (_) { }
            sock = null;
        }
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        connectionState = 'connecting';
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
            version: [2, 3000, 1015901307],
            isLatest: true,
        }));
        console.log(`⚡ Initializing WhatsApp Bot via Baileys v${version.join('.')} (isLatest: ${isLatest})...`);
        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            browser: ['Smart Fertigation', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                qrCodeData = qr;
                connectionState = 'qr_ready';
                console.log('📱 QR Code WhatsApp Bot (Baileys) siap di-scan pada halaman /admin Dashboard.');
            }
            if (connection === 'open') {
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                connectionState = 'connected';
                qrCodeData = null;
                const userJid = sock?.user?.id || '';
                const userPhone = userJid.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
                const userName = sock?.user?.name || 'WA Bot Smart Fertigasi';
                connectedUser = { id: userJid, name: userName, phone: userPhone };
                console.log(`✅ WhatsApp Bot (Baileys) Ready & Terhubung: ${userName} (${userPhone})`);
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`⚠️ Baileys Connection closed with status code: ${statusCode}`);
                connectionState = 'disconnected';
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('🔒 WhatsApp Bot Logged Out. Clearing session directory...');
                    qrCodeData = null;
                    connectedUser = null;
                    if (fs.existsSync(sessionDir)) {
                        try {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        }
                        catch (_) { }
                    }
                }
                else {
                    console.log('🔄 Reconnecting WhatsApp Bot via Baileys...');
                    if (!reconnectTimer) {
                        reconnectTimer = setTimeout(() => {
                            void initWaBot().finally(() => {
                                reconnectTimer = null;
                            });
                        }, 3000);
                    }
                }
            }
        });
        // Listen for incoming & outgoing messages
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify')
                return;
            for (const msg of m.messages) {
                try {
                    if (!msg.message || msg.key.fromMe)
                        continue;
                    const from = msg.key.remoteJid;
                    if (!from || from.endsWith('@g.us'))
                        continue; // Skip group messages
                    const text = msg.message.conversation ||
                        msg.message.extendedTextMessage?.text ||
                        msg.message.imageMessage?.caption ||
                        '';
                    if (!text)
                        continue;
                    // Candidate phone extraction handling LID & PN format
                    const candidatePhones = [];
                    const addCand = (raw) => {
                        if (!raw)
                            return;
                        let p = raw.split('@')[0].replace(/[^0-9]/g, '');
                        if (p && !candidatePhones.includes(p)) {
                            candidatePhones.push(p);
                            if (p.startsWith('0'))
                                candidatePhones.push('62' + p.slice(1));
                            if (p.startsWith('62'))
                                candidatePhones.push('0' + p.slice(2));
                        }
                    };
                    addCand(from);
                    addCand(msg.key?.remoteJidAlt);
                    addCand(msg.key?.participantAlt);
                    addCand(msg.key?.participant);
                    addCand(msg.key?.remoteJid);
                    const { chatJid, cleanPhone } = normalizePhoneAndJid(from);
                    const senderName = msg.pushName || cleanPhone;
                    // Fetch contact profile picture if available
                    let avatarUrl = null;
                    try {
                        if (sock) {
                            const fetchedUrl = await sock.profilePictureUrl(from, 'image').catch(() => null);
                            avatarUrl = fetchedUrl || null;
                        }
                    }
                    catch (_) { }
                    await saveWaMessage(chatJid, senderName, cleanPhone, text, 0, avatarUrl);
                    const rawCommand = text.trim();
                    const cmd = rawCommand.toLowerCase();
                    let replyText = '';
                    // -----------------------------------------------------------------
                    // 1. Flexible Verification Check against `user_whatsapp_numbers`
                    // -----------------------------------------------------------------
                    const last9List = candidatePhones.map((p) => p.slice(-9)).filter(Boolean);
                    const [waUsers] = await pool.query(`
            SELECT uwn.*, u.id as user_id, u.name as user_name 
            FROM user_whatsapp_numbers uwn 
            JOIN users u ON uwn.uid = u.uid 
            WHERE uwn.status = 'verified' 
              AND (
                uwn.whatsapp_number IN (?) 
                OR RIGHT(REPLACE(uwn.whatsapp_number, '+', ''), 9) IN (?)
              ) 
            LIMIT 1
          `, [candidatePhones.length > 0 ? candidatePhones : ['NONE'], last9List.length > 0 ? last9List : ['NONE']]);
                    const isVerifiedWa = waUsers.length > 0;
                    // If NOT verified, check if message is OTP verification code
                    if (!isVerifiedWa) {
                        let potentialOtp = '';
                        if (cmd.startsWith('otp ')) {
                            potentialOtp = cmd.replace('otp ', '').trim();
                        }
                        else if (/^\d{6}$/.test(cmd)) {
                            potentialOtp = cmd;
                        }
                        if (potentialOtp) {
                            const [otpMatch] = await pool.query("SELECT * FROM user_whatsapp_numbers WHERE otp = ? LIMIT 1", [potentialOtp]);
                            if (otpMatch.length > 0) {
                                const waRecord = otpMatch[0];
                                await pool.query("UPDATE user_whatsapp_numbers SET status = 'verified', otp = NULL WHERE id = ?", [waRecord.id]);
                                const [uRows] = await pool.query('SELECT uid, name FROM users WHERE uid = ?', [waRecord.uid]);
                                const uInfo = uRows[0] || {};
                                replyText = `✅ *NOMOR WHATSAPP TERVERIFIKASI!*

Halo ${uInfo.name || 'User'} (${waRecord.uid}), nomor WhatsApp Anda (+${waRecord.whatsapp_number}) telah berhasil diverifikasi dengan status *VERIFIED*!

Anda sekarang memiliki wewenang penuh untuk memonitor & mengontrol perangkat ESP32 serta fertigasi presisi via WhatsApp.`;
                                if (replyText && sock) {
                                    await sock.sendMessage(from, { text: replyText });
                                    await saveWaMessage(chatJid, 'WA Bot', cleanPhone, replyText, 1);
                                }
                                continue;
                            }
                        }
                        // DO NOT REPLY ANYTHING if unverified and not a valid OTP code!
                        console.log(`⚠️ Ignored incoming message from unverified number: +${cleanPhone} (Candidates: ${candidatePhones.join(', ')})`);
                        continue;
                    }
                    // -----------------------------------------------------------------
                    // 2. Verified User Context: Retrieve data specific to user's UID & user_id
                    // -----------------------------------------------------------------
                    const matchedUser = waUsers[0];
                    const userId = matchedUser.user_id;
                    const userUid = matchedUser.uid;
                    const userName = matchedUser.user_name || 'User';
                    // Check if user has registered an ESP32 device
                    const [userDevices] = await pool.query('SELECT * FROM devices WHERE user_id = ? ORDER BY (status = "verified") DESC, id DESC', [userId]);
                    const hasDevice = userDevices.length > 0;
                    const primaryDevice = userDevices[0];
                    // If user has not added any device and requests a feature menu
                    if (!hasDevice && (cmd === '1' || cmd === 'status' || cmd === 'status sistem' || cmd === '!status' ||
                        cmd === '2' || cmd === 'sensor' || cmd === 'kondisi' || cmd === 'kondisi sensor' || cmd === 'greenhouse' || cmd === '!sensor' ||
                        cmd === '3' || cmd === 'jadwal' || cmd === 'jadwal hari ini' || cmd === '!jadwal' ||
                        cmd === '4' || cmd === 'tanaman' || cmd === 'penanaman' || cmd === 'data penanaman' ||
                        cmd === '5' || cmd === 'valve' || cmd === 'status valve' ||
                        cmd === '6' || cmd === 'demo' || cmd === 'mode demo' || cmd === 'manual control' || cmd === 'test' || cmd === 'test valve' ||
                        cmd.startsWith('on ') || cmd.startsWith('off '))) {
                        replyText = `⚠️ *Perangkat ESP32 Belum Terdaftar* (User: ${userName} | ${userUid})

Silakan tambahkan perangkat terlebih dahulu melalui menu *Pengaturan* di Dashboard Web (http://localhost:4321/settings).

Setelah perangkat ESP32 ditambahkan dan diverifikasi, seluruh menu pemantauan & kontrol akan aktif secara otomatis.`;
                    }
                    // Menu 1: STATUS / STATUS SISTEM
                    else if (cmd === '1' || cmd === 'status' || cmd === 'status sistem' || cmd === '!status') {
                        const [plantings] = await pool.query(`
              SELECT p.*, fp.name as profile_name
              FROM plantings p
              LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
              WHERE (p.user_id = ? OR p.user_id IS NULL) AND p.is_active = 1
              ORDER BY (p.user_id = ?) DESC LIMIT 1
            `, [userId, userId]);
                        const p = plantings[0] || {};
                        const d = primaryDevice || {};
                        const [valves] = await pool.query('SELECT COUNT(*) as count FROM valves WHERE is_active = 1 AND (device_id = ? OR device_id IS NULL)', [d.id]);
                        const connectedDeviceCode = getConnectedDeviceCode(d.device_code, d.serial_code)
                            || (userDevices.length === 1 ? getOnlyConnectedDeviceCode() : null);
                        const [telemetries] = await pool.query(`SELECT device_code, suhu, kelembaban, media, level_air, ec, ph, tds, status, created_at
               FROM sensor_telemetry
               WHERE device_code IN (?, ?, ?)
               ORDER BY created_at DESC, id DESC
               LIMIT 1`, [d.device_code || '', d.serial_code || d.device_code || '', connectedDeviceCode || d.device_code || '']);
                        const sensor = telemetries[0] || null;
                        const isOnline = isDeviceSocketConnected(d.device_code, d.serial_code);
                        const latestActivity = d.last_seen || sensor?.created_at;
                        const tdsValue = sensor?.tds != null
                            ? Number(sensor.tds)
                            : sensor?.ec != null
                                ? Number(sensor.ec) * 500
                                : null;
                        const pDate = p.planting_date ? new Date(p.planting_date) : new Date();
                        const today = new Date();
                        pDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const hst = Math.max(0, Math.floor((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
                        const telemetrySection = sensor
                            ? `
📡 *TELEMETRI TERBARU*
pH         : ${formatSensorValue(sensor.ph, 2)}
TDS        : ${tdsValue != null ? `${Math.round(tdsValue)} PPM` : '—'}
EC         : ${formatSensorValue(sensor.ec, 2)} mS/cm
Suhu       : ${formatSensorValue(sensor.suhu, 1)} °C
Kelembaban : ${formatSensorValue(sensor.kelembaban, 1)} %
Media      : ${formatSensorValue(sensor.media, 1)} %
Level Air  : ${formatSensorValue(sensor.level_air, 1)} %
Kondisi    : ${getStatusIndicator(sensor.status)}
Waktu Data : ${formatWibDateTime(sensor.created_at)}`
                            : `
📡 *TELEMETRI TERBARU*
Belum ada data sensor dari perangkat ini.`;
                        replyText = `🌱 *STATUS SISTEM TERBARU* (User: ${userName} | ${userUid})
Tanaman  : ${p.name || 'Melon Greenhouse A'}
HST      : ${hst}
Fase     : Vegetatif
Profil   : ${p.profile_name || 'Melon Standar'}
ESP32    : ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'} (${d.device_code})
Mode     : ${d.mode || 'AUTO'}
Last Seen: ${formatWibDateTime(latestActivity)}
Jumlah Valve : ${valves[0]?.count || 0}${telemetrySection}`;
                    }
                    // Menu 2: SENSOR / KONDISI GREENHOUSE
                    else if (cmd === '2' || cmd === 'sensor' || cmd === 'kondisi' || cmd === 'kondisi sensor' || cmd === 'greenhouse' || cmd === '!sensor') {
                        const connectedDeviceCode = getConnectedDeviceCode(primaryDevice.device_code, primaryDevice.serial_code)
                            || (userDevices.length === 1 ? getOnlyConnectedDeviceCode() : null);
                        const [rows] = await pool.query(`SELECT suhu, kelembaban, media, level_air, ec, ph, tds, status, created_at
               FROM sensor_telemetry
               WHERE device_code IN (?, ?, ?)
               ORDER BY created_at DESC, id DESC
               LIMIT 1`, [
                            primaryDevice.device_code || '',
                            primaryDevice.serial_code || primaryDevice.device_code || '',
                            connectedDeviceCode || primaryDevice.device_code || '',
                        ]);
                        const sensor = rows[0] || null;
                        if (!sensor) {
                            replyText = `🌡️ *KONDISI GREENHOUSE* (${userUid})\nBelum ada data sensor dari perangkat ini.`;
                        }
                        else {
                            const sensorLines = [];
                            if (hasSensorValue(sensor.suhu))
                                sensorLines.push(`Suhu       : ${formatSensorValue(sensor.suhu, 1)} °C`);
                            if (hasSensorValue(sensor.kelembaban))
                                sensorLines.push(`Kelembaban : ${formatSensorValue(sensor.kelembaban, 1)} %`);
                            if (hasSensorValue(sensor.media))
                                sensorLines.push(`Media      : ${formatSensorValue(sensor.media, 1)} %`);
                            if (hasSensorValue(sensor.level_air))
                                sensorLines.push(`Level Air  : ${formatSensorValue(sensor.level_air, 1)} %`);
                            if (hasSensorValue(sensor.ec))
                                sensorLines.push(`EC         : ${formatSensorValue(sensor.ec, 2)} mS/cm`);
                            if (hasSensorValue(sensor.ph))
                                sensorLines.push(`pH         : ${formatSensorValue(sensor.ph, 2)}`);
                            if (hasSensorValue(sensor.tds))
                                sensorLines.push(`TDS        : ${Math.round(Number(sensor.tds))} PPM`);
                            if (sensorLines.length === 0) {
                                sensorLines.push('Belum ada nilai sensor yang tersedia.');
                            }
                            if (sensor.status)
                                sensorLines.push(`Status     : ${getStatusIndicator(sensor.status)}`);
                            sensorLines.push(`Update     : ${formatWibDateTime(sensor.created_at)}`);
                            replyText = `🌡️ *KONDISI GREENHOUSE* (${userUid})\n${sensorLines.join('\n')}`;
                        }
                    }
                    // Menu 3: JADWAL / JADWAL HARI INI
                    else if (cmd === '3' || cmd === 'jadwal' || cmd === 'jadwal hari ini' || cmd === '!jadwal') {
                        const [plantings] = await pool.query('SELECT * FROM plantings WHERE (user_id = ? OR user_id IS NULL) AND is_active = 1 ORDER BY (user_id = ?) DESC LIMIT 1', [userId, userId]);
                        const planting = plantings[0] || {};
                        const pDate = planting.planting_date ? new Date(planting.planting_date) : new Date();
                        const today = new Date();
                        pDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const hst = Math.max(0, Math.floor((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
                        const [scheds] = await pool.query(`
              SELECT fs.*, v.name as valve_name, v.gpio, gp.name as phase_name
              FROM fertigation_schedules fs
              JOIN valves v ON fs.valve_id = v.id
              LEFT JOIN growth_phases gp ON fs.growth_phase_id = gp.id
              WHERE fs.fertigation_profile_id = ? AND fs.hst_start <= ? AND fs.hst_end >= ? AND fs.is_active = 1
              ORDER BY fs.start_time ASC
            `, [planting.fertigation_profile_id || 1, hst, hst]);
                        if (scheds.length === 0) {
                            replyText = `📅 *JADWAL HARI INI* (${userUid})\nHST : ${hst} (Vegetatif)\n\n1. 06:00  Valve 1 (Zona A)  3 menit\n2. 12:00  Valve 1 (Zona A)  3 menit\n3. 16:00  Valve 1 (Zona A)  3 menit`;
                        }
                        else {
                            replyText = `📅 *JADWAL HARI INI* (${userUid})\nHST : ${hst} (Vegetatif)\n\n`;
                            scheds.forEach((s, idx) => {
                                const mins = Math.floor(s.duration_seconds / 60) || 3;
                                replyText += `${idx + 1}. ${s.start_time.substring(0, 5)}  ${s.valve_name}  ${mins} menit\n`;
                            });
                        }
                    }
                    // Menu 4: DATA PENANAMAN
                    else if (cmd === '4' || cmd === 'tanaman' || cmd === 'penanaman' || cmd === 'data penanaman') {
                        const [plantings] = await pool.query(`
              SELECT p.*, fp.name as profile_name
              FROM plantings p
              LEFT JOIN fertigation_profiles fp ON p.fertigation_profile_id = fp.id
              WHERE (p.user_id = ? OR p.user_id IS NULL) AND p.is_active = 1
              ORDER BY (p.user_id = ?) DESC LIMIT 1
            `, [userId, userId]);
                        const p = plantings[0] || {};
                        const pDate = p.planting_date ? new Date(p.planting_date) : new Date();
                        const today = new Date();
                        pDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const hst = Math.max(0, Math.floor((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
                        replyText = `🌱 *DATA PENANAMAN* (${userUid})
Nama          : ${p.name || 'Melon Greenhouse A'}
Tanggal Tanam : ${p.planting_date || '10-08-2026'}
HST           : ${hst}
Fase          : Vegetatif
Profil        : ${p.profile_name || 'Melon Standar'}
Status        : Aktif`;
                    }
                    // Menu 5: STATUS VALVE
                    else if (cmd === '5' || cmd === 'valve' || cmd === 'status valve') {
                        const [valves] = await pool.query('SELECT * FROM valves WHERE is_active = 1');
                        replyText = `🚰 *STATUS VALVE* (${userUid})\n`;
                        if (valves.length === 0) {
                            replyText += `Valve 1 (Zona A) : OFF\nValve 2 (Zona B) : OFF\n`;
                        }
                        else {
                            valves.forEach((v, idx) => {
                                const zone = idx === 0 ? 'Zona A' : idx === 1 ? 'Zona B' : `Zona ${idx + 1}`;
                                replyText += `${v.name} (${zone}) : OFF\n`;
                            });
                        }
                        replyText += `Mode Sistem     : AUTO`;
                    }
                    // Menu 6: MODE DEMO & MANUAL CONTROL
                    else if (cmd === '6' || cmd === 'demo' || cmd === 'mode demo' || cmd === 'manual control' || cmd === 'test' || cmd === 'test valve') {
                        replyText = `🧪 *MODE DEMO & MANUAL CONTROL* (${userUid})
Pengujian manual buka & tutup solenoid valve secara realtime ke mikrokontroler ESP32.

Pilih Valve:
1. Valve 1 (Zona A)
2. Valve 2 (Zona B)

Pilih Durasi:
1. 5 detik
2. 10 detik
3. 30 detik
4. Tutup Valve

Ketik nomor valve & durasi (contoh: *ON 1 10* untuk Buka Valve 1 selama 10 detik atau *OFF 1* untuk Tutup Valve).`;
                    }
                    // Handle ON/OFF Test Valve Manual Commands (e.g. ON 1 10, OFF 1)
                    else if (cmd.startsWith('on ') || cmd.startsWith('off ')) {
                        const parts = cmd.split(' ');
                        const action = parts[0].toUpperCase();
                        const valveNum = parts[1] || '1';
                        const durationSec = parts[2] ? parseInt(parts[2], 10) : 10;
                        const [valves] = await pool.query('SELECT * FROM valves ORDER BY id ASC LIMIT 2');
                        const valve = valves[parseInt(valveNum, 10) - 1] || valves[0];
                        const [devices] = await pool.query('SELECT * FROM devices WHERE (user_id = ? OR user_id IS NULL) ORDER BY (user_id = ?) DESC LIMIT 1', [userId, userId]);
                        const dev = devices[0];
                        const deviceId = dev?.id || 1;
                        const deviceCode = dev?.device_code || 'ESP-FERTIGASI-01';
                        if (valve) {
                            const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
                            const [insRes] = await pool.query('INSERT INTO device_commands (user_id, device_id, valve_id, command, duration_seconds, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, deviceId, valve.id, action === 'ON' ? 'OPEN' : 'CLOSE', action === 'ON' ? durationSec : 0, 'pending', nowStr]);
                            // Push instantly via WebSocket to ESP32
                            const cmdId = insRes.insertId;
                            sendValveCommandToDevice(deviceCode, undefined, cmdId, valve.gpio || (valveNum === '2' ? 26 : 25), action === 'ON' ? 'OPEN' : 'CLOSE', durationSec);
                            replyText = action === 'ON'
                                ? `✅ *Perintah Terkirim ke ESP32!* (UID: ${userUid})\nMembuka ${valve.name} selama ${durationSec} detik.`
                                : `🛑 *Perintah Terkirim ke ESP32!* (UID: ${userUid})\nMenutup ${valve.name}.`;
                        }
                        else {
                            replyText = `⚠️ Valve tidak ditemukan. Ketik *TEST VALVE* untuk petunjuk.`;
                        }
                    }
                    // Menu 7 / MENU / BANTUAN / HELP / Default
                    else {
                        const devInfo = hasDevice
                            ? `📱 *Perangkat ESP32:* ${primaryDevice?.device_code || 'ESP-FERTIGASI-01'} (${primaryDevice?.status === 'verified' ? '🟢 Terverifikasi' : '🟡 Belum Verifikasi'})`
                            : `⚠️ *Perangkat ESP32:* Belum Ada (Tambahkan perangkat terlebih dahulu di menu Pengaturan Dashboard)`;
                        replyText = `🌱 *SMART FERTIGATION* (User: ${userName} | ${userUid})
${devInfo}

Pilih menu:
1. Status Sistem
2. Kondisi Sensor
3. Jadwal Hari Ini
4. Data Penanaman
5. Status Valve
6. Mode Demo & Manual Control
7. Bantuan

Ketik nomor menu (1-7) atau kata kunci (misal: 1 atau STATUS).`;
                    }
                    if (replyText && sock) {
                        await sock.sendMessage(from, { text: replyText });
                        await saveWaMessage(chatJid, 'WA Bot', cleanPhone, replyText, 1);
                    }
                }
                catch (err) {
                    console.error('Error processing incoming Baileys message:', err);
                }
            }
        });
    }
    catch (err) {
        console.error('Failed to initialize Baileys WA Bot:', err);
        connectionState = 'disconnected';
    }
}
export function getWaStatus() {
    const isReady = connectionState === 'connected' && !!sock?.user;
    return {
        success: true,
        state: isReady ? 'connected' : connectionState,
        qrCode: qrCodeData,
        connectedUser: connectedUser || (sock?.user ? { id: sock.user.id, name: sock.user.name, phone: sock.user.id.split(':')[0] } : null),
        library: '@whiskeysockets/baileys',
        sessionPath: sessionDir,
    };
}
export async function sendWaMessage(phone, text) {
    if (connectionState !== 'connected' || !sock) {
        throw new Error('WhatsApp Bot belum terhubung. Silakan scan QR Code pada halaman /admin terlebih dahulu.');
    }
    const { chatJid, cleanPhone } = normalizePhoneAndJid(phone);
    try {
        await sock.sendMessage(chatJid, { text });
        await saveWaMessage(chatJid, 'Admin Kebun', cleanPhone, text, 1);
        return true;
    }
    catch (err) {
        console.error('Error sending WA message via Baileys:', err);
        throw new Error(`Gagal mengirim WhatsApp: ${err.message || 'Koneksi WA terputus'}`);
    }
}
export async function syncWaChats() {
    return { success: true, message: 'Baileys menyinkronkan pesan secara real-time via WebSocket.' };
}
export async function closeWaBot() {
    if (sock) {
        try {
            sock.end(undefined);
        }
        catch (_) { }
        sock = null;
    }
}
export async function logoutWaBot() {
    try {
        if (sock) {
            try {
                await sock.logout();
            }
            catch (_) { }
            try {
                sock.end(undefined);
            }
            catch (_) { }
            sock = null;
        }
    }
    catch (err) {
        console.error('Error in logoutWaBot:', err);
    }
    finally {
        if (fs.existsSync(sessionDir)) {
            try {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`🗑️ Folder sesi Baileys (${sessionDir}) telah dihapus.`);
            }
            catch (err) {
                console.error(`Gagal menghapus folder ${sessionDir}:`, err);
            }
        }
        connectionState = 'disconnected';
        qrCodeData = null;
        connectedUser = null;
        setTimeout(() => {
            initWaBot();
        }, 1500);
    }
    return true;
}
