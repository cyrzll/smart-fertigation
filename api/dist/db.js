import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import dotenv from 'dotenv';
import * as schema from './db/schema.js';
dotenv.config();
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'ppko';
export const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
});
export const db = drizzle(pool, { schema, mode: 'default' });
export async function initDb() {
    try {
        // First, ensure the database exists
        const rootConn = await mysql.createConnection({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await rootConn.end();
        const conn = await pool.getConnection();
        await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(50) UNIQUE NULL,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) NULL,
        password VARCHAR(255) NOT NULL,
        level ENUM('admin', 'user') DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        // Safely ensure user columns exist for existing tables
        try {
            await conn.query('ALTER TABLE users ADD COLUMN uid VARCHAR(50) UNIQUE NULL AFTER id');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE NULL AFTER name');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER email');
        }
        catch (_) { }
        // Auto-generate UID for users if missing
        try {
            await conn.query("UPDATE users SET uid = CONCAT('USR-', LPAD(id, 4, '0')) WHERE uid IS NULL OR uid = ''");
        }
        catch (_) { }
        // Clean up old unused user_wa_numbers table if it exists
        try {
            await conn.query('DROP TABLE IF EXISTS user_wa_numbers');
        }
        catch (_) { }
        // Create user_whatsapp_numbers table (Exact columns: id, uid, whatsapp_number, otp, status 'pending'/'verified')
        await conn.query(`
      CREATE TABLE IF NOT EXISTS user_whatsapp_numbers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid VARCHAR(50) NOT NULL,
        whatsapp_number VARCHAR(50) NOT NULL,
        otp VARCHAR(10) NULL,
        status ENUM('pending', 'verified') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_uid (uid),
        INDEX idx_whatsapp_number (whatsapp_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS growth_phases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS fertigation_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS plantings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        name VARCHAR(255) NOT NULL,
        planting_date DATE NOT NULL,
        fertigation_profile_id INT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (fertigation_profile_id) REFERENCES fertigation_profiles(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS valves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id INT NULL,
        name VARCHAR(255) NOT NULL,
        gpio VARCHAR(50) NULL,
        description TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        try {
            await conn.query('ALTER TABLE valves ADD COLUMN device_id INT NULL AFTER id');
        }
        catch (_) { }
        await conn.query(`
      CREATE TABLE IF NOT EXISTS fertigation_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fertigation_profile_id INT NOT NULL,
        valve_id INT NOT NULL,
        growth_phase_id INT NULL,
        hst_start INT UNSIGNED NOT NULL DEFAULT 0,
        hst_end INT UNSIGNED NOT NULL DEFAULT 99,
        start_time TIME NOT NULL,
        duration_seconds INT UNSIGNED NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_profile_hst_range (fertigation_profile_id, hst_start, hst_end),
        FOREIGN KEY (fertigation_profile_id) REFERENCES fertigation_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (valve_id) REFERENCES valves(id) ON DELETE CASCADE,
        FOREIGN KEY (growth_phase_id) REFERENCES growth_phases(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        try {
            await conn.query('ALTER TABLE fertigation_schedules MODIFY COLUMN hst INT NULL DEFAULT 0');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE fertigation_schedules ADD COLUMN hst_start INT UNSIGNED NOT NULL DEFAULT 0');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE fertigation_schedules ADD COLUMN hst_end INT UNSIGNED NOT NULL DEFAULT 99');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE devices ADD COLUMN user_id INT NULL AFTER id');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE devices ADD COLUMN uid VARCHAR(50) NULL AFTER user_id');
        }
        catch (_) { }
        try {
            await conn.query("ALTER TABLE devices ADD COLUMN serial_code VARCHAR(100) NULL AFTER device_code");
        }
        catch (_) { }
        try {
            await conn.query("ALTER TABLE devices ADD COLUMN confirmation_code INT NULL AFTER serial_code");
        }
        catch (_) { }
        try {
            await conn.query("ALTER TABLE devices ADD COLUMN auth_code VARCHAR(255) NULL AFTER confirmation_code");
        }
        catch (_) { }
        try {
            await conn.query("ALTER TABLE devices ADD COLUMN status VARCHAR(50) DEFAULT 'verified' AFTER auth_code");
        }
        catch (_) { }
        try {
            await conn.query("ALTER TABLE devices ADD COLUMN blink_pending TINYINT DEFAULT 0 AFTER status");
        }
        catch (_) { }
        try {
            await conn.query('UPDATE devices d JOIN users u ON d.user_id = u.id SET d.uid = u.uid WHERE d.uid IS NULL AND d.user_id IS NOT NULL');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE device_commands ADD COLUMN user_id INT NULL AFTER device_id');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE plantings ADD COLUMN user_id INT NULL AFTER id');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE fertigation_profiles ADD COLUMN user_id INT NULL AFTER id');
        }
        catch (_) { }
        await conn.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        uid VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        device_code VARCHAR(255) UNIQUE NOT NULL,
        serial_code VARCHAR(100) NULL,
        confirmation_code INT NULL,
        auth_code VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'verified',
        blink_pending TINYINT DEFAULT 0,
        mode VARCHAR(50) DEFAULT 'AUTO',
        current_hst INT UNSIGNED NULL,
        last_seen DATETIME NULL,
        schedule_updated_at DATETIME NULL,
        ip_address VARCHAR(100) NULL,
        firmware_version VARCHAR(50) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS device_commands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        device_id INT NOT NULL,
        valve_id INT NOT NULL,
        command VARCHAR(50) NOT NULL,
        duration_seconds INT UNSIGNED NULL,
        status VARCHAR(50) DEFAULT 'pending',
        expires_at DATETIME NULL,
        started_at DATETIME NULL,
        completed_at DATETIME NULL,
        message TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_device_status_exp (device_id, status, expires_at),
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (valve_id) REFERENCES valves(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS wa_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_jid VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255) NULL,
        sender_phone VARCHAR(50) NOT NULL,
        avatar_url TEXT NULL,
        body TEXT NOT NULL,
        from_me TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_jid (chat_jid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await conn.query(`
      CREATE TABLE IF NOT EXISTS sensor_telemetry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_code VARCHAR(255) DEFAULT 'ESP-FERTIGASI-01',
        suhu FLOAT DEFAULT NULL,
        suhu_air FLOAT DEFAULT NULL,
        kelembaban FLOAT DEFAULT NULL,
        media FLOAT DEFAULT NULL,
        level_air FLOAT DEFAULT NULL,
        ec FLOAT DEFAULT NULL,
        tds FLOAT DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'Normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        try {
            await conn.query('ALTER TABLE sensor_telemetry ADD COLUMN tds FLOAT NULL AFTER ec');
        }
        catch (_) { }
        try {
            await conn.query('ALTER TABLE sensor_telemetry ADD COLUMN suhu_air FLOAT NULL AFTER suhu');
        }
        catch (_) { }
        const [sensorCount] = await conn.query('SELECT COUNT(*) as count FROM sensor_telemetry');
        if (sensorCount[0].count === 0) {
            await conn.query('INSERT INTO sensor_telemetry (device_code, suhu, kelembaban, media, level_air, ec, tds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['ESP-FERTIGASI-01', null, null, null, null, 1.8, 900.0, 'Normal']);
        }
        // Seed default users if empty
        const [usersCount] = await conn.query('SELECT COUNT(*) as count FROM users');
        if (usersCount[0].count === 0) {
            await conn.query('INSERT INTO users (uid, name, username, email, phone, password, level) VALUES (?, ?, ?, ?, ?, ?, ?)', ['USR-0001', 'Administrator', 'admin', 'admin@smart.com', '081234567890', 'admin123', 'admin']);
            await conn.query('INSERT INTO users (uid, name, username, email, phone, password, level) VALUES (?, ?, ?, ?, ?, ?, ?)', ['USR-0002', 'Operator Kebun', 'operator', 'user@smart.com', '089876543210', 'user123', 'user']);
        }
        // Seed default growth phases if empty
        const [phasesCount] = await conn.query('SELECT COUNT(*) as count FROM growth_phases');
        if (phasesCount[0].count === 0) {
            const defaultPhases = [
                ['Masa Awal', 'Fase adaptasi dan pertumbuhan awal tanaman'],
                ['Vegetatif', 'Fase pertumbuhan batang, daun, dan akar'],
                ['Pembungaan', 'Fase pembentukan dan perkembangan bunga'],
                ['Penyerbukan', 'Fase pembungaan dan proses penyerbukan'],
                ['Pembentukan Buah', 'Fase awal pembentukan buah setelah penyerbukan'],
                ['Pembesaran Buah', 'Fase perkembangan ukuran dan bobot buah'],
                ['Pematangan', 'Fase pematangan buah menjelang panen'],
            ];
            for (const [pName, pDesc] of defaultPhases) {
                await conn.query('INSERT INTO growth_phases (name, description, is_active) VALUES (?, ?, 1)', [pName, pDesc]);
            }
        }
        // Seed default fertigation profile
        const [profiles] = await conn.query('SELECT COUNT(*) as count FROM fertigation_profiles');
        if (profiles[0].count === 0) {
            const [resProfile] = await conn.query('INSERT INTO fertigation_profiles (name, description, is_active) VALUES (?, ?, 1)', ['Melon Standar', 'Profil fertigasi standar tanaman melon berdasarkan fase pertumbuhan dan HST.']);
            const profileId = resProfile.insertId;
            // Seed default valves
            const [valvesCount] = await conn.query('SELECT COUNT(*) as count FROM valves');
            if (valvesCount[0].count === 0) {
                await conn.query('INSERT INTO valves (name, gpio, description) VALUES (?, ?, ?)', ['Valve 1 (Zona A)', '25', 'Solenoide Valve Utama Zona Barat']);
                await conn.query('INSERT INTO valves (name, gpio, description) VALUES (?, ?, ?)', ['Valve 2 (Zona B)', '26', 'Solenoide Valve Tambahan Zona Timur']);
            }
            const [valvesList] = await pool.query('SELECT * FROM valves ORDER BY id ASC');
            const v1 = valvesList[0]?.id || 1;
            const v2 = valvesList[1]?.id || 2;
            // Seed default schedules
            await conn.query('INSERT INTO fertigation_schedules (fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_seconds) VALUES (?, ?, 2, 1, 30, ?, ?)', [profileId, v1, '06:00:00', 180]);
            await conn.query('INSERT INTO fertigation_schedules (fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_seconds) VALUES (?, ?, 2, 1, 30, ?, ?)', [profileId, v1, '12:00:00', 180]);
            await conn.query('INSERT INTO fertigation_schedules (fertigation_profile_id, valve_id, growth_phase_id, hst_start, hst_end, start_time, duration_seconds) VALUES (?, ?, 2, 1, 30, ?, ?)', [profileId, v1, '16:00:00', 180]);
            // Seed default active planting
            const [plantingsCount] = await conn.query('SELECT COUNT(*) as count FROM plantings');
            if (plantingsCount[0].count === 0) {
                await conn.query('INSERT INTO plantings (name, planting_date, fertigation_profile_id, is_active) VALUES (?, ?, ?, 1)', ['Melon Greenhouse A', '2026-08-10', profileId]);
            }
            // Seed default ESP32 device
            const [devicesCount] = await conn.query('SELECT COUNT(*) as count FROM devices');
            if (devicesCount[0].count === 0) {
                await conn.query('INSERT INTO devices (name, device_code, mode, current_hst, firmware_version) VALUES (?, ?, ?, ?, ?)', ['ESP32 Fertigasi Utama', 'ESP-FERTIGASI-01', 'AUTO', 11, 'v2.0.0-Baileys']);
            }
        }
        conn.release();
        console.log('✅ Database Drizzle ORM & MariaDB initialized successfully.');
    }
    catch (err) {
        console.error('Database initialization error:', err);
    }
}
