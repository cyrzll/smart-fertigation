import { mysqlTable, serial, int, varchar, text, tinyint, datetime, date, time, float, mysqlEnum, index, uniqueIndex, } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
// 1. users table
export const users = mysqlTable('users', {
    id: serial('id').primaryKey(),
    uid: varchar('uid', { length: 50 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 50 }),
    password: varchar('password', { length: 255 }).notNull(),
    level: mysqlEnum('level', ['admin', 'user']).default('user'),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 2. user_whatsapp_numbers table
export const userWhatsappNumbers = mysqlTable('user_whatsapp_numbers', {
    id: serial('id').primaryKey(),
    uid: varchar('uid', { length: 50 }).notNull(),
    whatsappNumber: varchar('whatsapp_number', { length: 50 }).notNull(),
    otp: varchar('otp', { length: 10 }),
    status: mysqlEnum('status', ['pending', 'verified']).default('pending'),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_uid').on(table.uid),
    index('idx_whatsapp_number').on(table.whatsappNumber),
]);
// 3. growth_phases table
export const growthPhases = mysqlTable('growth_phases', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 4. fertigation_profiles table
export const fertigationProfiles = mysqlTable('fertigation_profiles', {
    id: serial('id').primaryKey(),
    userId: int('user_id'),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 5. plantings table
export const plantings = mysqlTable('plantings', {
    id: serial('id').primaryKey(),
    userId: int('user_id'),
    name: varchar('name', { length: 255 }).notNull(),
    plantingDate: date('planting_date').notNull(),
    fertigationProfileId: int('fertigation_profile_id'),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 6. valves table
export const valves = mysqlTable('valves', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    gpio: varchar('gpio', { length: 50 }),
    description: text('description'),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 7. fertigation_schedules table
export const fertigationSchedules = mysqlTable('fertigation_schedules', {
    id: serial('id').primaryKey(),
    fertigationProfileId: int('fertigation_profile_id').notNull(),
    valveId: int('valve_id').notNull(),
    growthPhaseId: int('growth_phase_id'),
    hstStart: int('hst_start').notNull().default(0),
    hstEnd: int('hst_end').notNull().default(99),
    startTime: time('start_time').notNull(),
    durationSeconds: int('duration_seconds').notNull(),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_profile_hst_range').on(table.fertigationProfileId, table.hstStart, table.hstEnd),
]);
// 8. devices table
export const devices = mysqlTable('devices', {
    id: serial('id').primaryKey(),
    userId: int('user_id'),
    uid: varchar('uid', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    deviceCode: varchar('device_code', { length: 255 }).notNull().unique(),
    serialCode: varchar('serial_code', { length: 100 }),
    confirmationCode: int('confirmation_code'),
    authCode: varchar('auth_code', { length: 255 }),
    status: varchar('status', { length: 50 }).default('verified'),
    blinkPending: tinyint('blink_pending').default(0),
    mode: varchar('mode', { length: 50 }).default('AUTO'),
    currentHst: int('current_hst'),
    lastSeen: datetime('last_seen'),
    scheduleUpdatedAt: datetime('schedule_updated_at'),
    ipAddress: varchar('ip_address', { length: 100 }),
    firmwareVersion: varchar('firmware_version', { length: 50 }),
    isActive: tinyint('is_active').default(1),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
// 9. device_commands table
export const deviceCommands = mysqlTable('device_commands', {
    id: serial('id').primaryKey(),
    userId: int('user_id'),
    deviceId: int('device_id').notNull(),
    valveId: int('valve_id').notNull(),
    command: varchar('command', { length: 50 }).notNull(),
    durationSeconds: int('duration_seconds'),
    status: varchar('status', { length: 50 }).default('pending'),
    expiresAt: datetime('expires_at'),
    startedAt: datetime('started_at'),
    completedAt: datetime('completed_at'),
    message: text('message'),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at').default(sql `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_device_status_exp').on(table.deviceId, table.status, table.expiresAt),
]);
// 10. wa_messages table
export const waMessages = mysqlTable('wa_messages', {
    id: serial('id').primaryKey(),
    chatJid: varchar('chat_jid', { length: 255 }).notNull(),
    senderName: varchar('sender_name', { length: 255 }),
    senderPhone: varchar('sender_phone', { length: 50 }).notNull(),
    avatarUrl: text('avatar_url'),
    body: text('body').notNull(),
    fromMe: tinyint('from_me').default(0),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_chat_jid').on(table.chatJid),
]);
// 11. sensor_telemetry table
export const sensorTelemetry = mysqlTable('sensor_telemetry', {
    id: serial('id').primaryKey(),
    deviceCode: varchar('device_code', { length: 255 }).default('ESP-FERTIGASI-01'),
    suhu: float('suhu').default(29.4),
    kelembaban: float('kelembaban').default(76.0),
    media: float('media').default(63.0),
    levelAir: float('level_air').default(72.0),
    ec: float('ec').default(1.8),
    status: varchar('status', { length: 50 }).default('Normal'),
    createdAt: datetime('created_at').default(sql `CURRENT_TIMESTAMP`),
});
