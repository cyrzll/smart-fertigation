import { Hono } from 'hono';
import { pool } from '../db.js';
import { sendWaMessage, normalizePhoneAndJid } from '../services/waBot.js';

const app = new Hono();

// Helper to ensure user has a valid UID
async function ensureUserUid(user: any) {
  if (!user.uid) {
    user.uid = `USR-${String(user.id).padStart(4, '0')}`;
    await pool.query('UPDATE users SET uid = ? WHERE id = ?', [user.uid, user.id]);
  }
  return user.uid;
}

// POST /api/auth/login
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const identifier = body.email || body.username || body.identifier;
    const password = body.password;

    if (!identifier || !password) {
      return c.json({ success: false, message: 'Email/Username dan password wajib diisi.' }, 400);
    }

    const [rows]: any = await pool.query(
      'SELECT id, uid, name, username, email, phone, password, level FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return c.json({ success: false, message: 'Email/Username atau password tidak terdaftar.' }, 401);
    }

    const user = rows[0];
    if (user.password !== password) {
      return c.json({ success: false, message: 'Password salah.' }, 401);
    }

    const uid = await ensureUserUid(user);
    const token = `token-${user.id}-${Date.now()}`;

    // Fetch registered WhatsApp numbers from user_whatsapp_numbers table
    const [waNumbers]: any = await pool.query(
      "SELECT id, uid, whatsapp_number, otp, status, created_at FROM user_whatsapp_numbers WHERE uid = ? ORDER BY id ASC",
      [uid]
    );

    return c.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        uid: user.uid,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        level: user.level,
        waNumbers,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/register
app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { name, username, email, phone, password } = body;

    if (!name || !email || !password) {
      return c.json({ success: false, message: 'Nama, email, dan password wajib diisi.' }, 400);
    }

    const [existing]: any = await pool.query(
      'SELECT id, email, username FROM users WHERE email = ? OR (username IS NOT NULL AND username = ?) LIMIT 1',
      [email, username || '']
    );

    if (existing.length > 0) {
      if (existing[0].email === email) {
        return c.json({ success: false, message: 'Email sudah terdaftar.' }, 400);
      }
      if (username && existing[0].username === username) {
        return c.json({ success: false, message: 'Username sudah digunakan.' }, 400);
      }
    }

    const [res]: any = await pool.query(
      'INSERT INTO users (name, username, email, phone, password, level) VALUES (?, ?, ?, ?, ?, ?)',
      [name, username || null, email, phone || null, password, 'user']
    );

    const newUserId = res.insertId;
    const uid = `USR-${String(newUserId).padStart(4, '0')}`;
    await pool.query('UPDATE users SET uid = ? WHERE id = ?', [uid, newUserId]);

    // If phone is provided, add to user_whatsapp_numbers and generate OTP
    if (phone) {
      const { cleanPhone } = normalizePhoneAndJid(phone);
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      await pool.query(
        "INSERT INTO user_whatsapp_numbers (uid, whatsapp_number, otp, status) VALUES (?, ?, ?, 'pending')",
        [uid, cleanPhone, otpCode]
      );

      sendWaMessage(
        cleanPhone,
        `🔐 *KODE OTP VERIFIKASI SMART FERTIGATION*\n\nKode OTP Anda adalah: *${otpCode}*\n\nMasukkan kode ini pada dashboard atau balaskan *OTP ${otpCode}* via WhatsApp ini untuk memverifikasi nomor Anda.`
      ).catch(() => {});
    }

    const token = `token-${newUserId}-${Date.now()}`;

    return c.json({
      success: true,
      message: 'Pendaftaran akun berhasil!',
      token,
      user: {
        id: newUserId,
        uid,
        name,
        username: username || null,
        email,
        phone: phone || null,
        level: 'user',
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/auth/users (List all users with their UID & WhatsApp numbers)
app.get('/users', async (c) => {
  try {
    const [users]: any = await pool.query(
      'SELECT id, uid, name, username, email, phone, level, created_at FROM users ORDER BY id ASC'
    );

    for (const u of users) {
      const uid = await ensureUserUid(u);
      const [numbers]: any = await pool.query(
        "SELECT id, uid, whatsapp_number, otp, status, created_at FROM user_whatsapp_numbers WHERE uid = ? ORDER BY id ASC",
        [uid]
      );
      u.waNumbers = numbers;
    }

    return c.json({ success: true, users });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/auth/users/:userId/wa-numbers (Get WA numbers for user UID)
app.get('/users/:userId/wa-numbers', async (c) => {
  try {
    const userId = c.req.param('userId');
    const [uRows]: any = await pool.query('SELECT id, uid FROM users WHERE id = ? LIMIT 1', [userId]);

    if (uRows.length === 0) {
      return c.json({ success: false, message: 'User tidak ditemukan.' }, 404);
    }

    const uid = await ensureUserUid(uRows[0]);
    const [numbers]: any = await pool.query(
      "SELECT id, uid, whatsapp_number, otp, status, created_at FROM user_whatsapp_numbers WHERE uid = ? ORDER BY id ASC",
      [uid]
    );

    return c.json({ success: true, numbers });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/users/:userId/wa-numbers (Add a new WhatsApp number - Max 3 per user UID)
app.post('/users/:userId/wa-numbers', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { phone } = body;

    if (!phone) {
      return c.json({ success: false, message: 'Nomor WhatsApp wajib diisi.' }, 400);
    }

    const [uRows]: any = await pool.query('SELECT id, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    if (uRows.length === 0) {
      return c.json({ success: false, message: 'User tidak ditemukan.' }, 404);
    }

    const uid = await ensureUserUid(uRows[0]);

    // Enforce max 3 numbers per user UID
    const [existingCount]: any = await pool.query(
      'SELECT COUNT(*) as count FROM user_whatsapp_numbers WHERE uid = ?',
      [uid]
    );

    if (existingCount[0].count >= 3) {
      return c.json({
        success: false,
        message: 'Batas maksimal 3 nomor WhatsApp per user (UID) telah tercapai.',
      }, 400);
    }

    const { cleanPhone } = normalizePhoneAndJid(phone);

    // Check duplicate number for this user UID
    const [dup]: any = await pool.query(
      'SELECT id FROM user_whatsapp_numbers WHERE uid = ? AND whatsapp_number = ? LIMIT 1',
      [uid, cleanPhone]
    );
    if (dup.length > 0) {
      return c.json({ success: false, message: 'Nomor WhatsApp ini sudah terdaftar pada akun Anda.' }, 400);
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    const [res]: any = await pool.query(
      "INSERT INTO user_whatsapp_numbers (uid, whatsapp_number, otp, status) VALUES (?, ?, ?, 'pending')",
      [uid, cleanPhone, otpCode]
    );

    let sentWa = false;
    try {
      sentWa = await sendWaMessage(
        cleanPhone,
        `🔐 *KODE OTP VERIFIKASI SMART FERTIGATION*\n\nKode OTP Anda adalah: *${otpCode}*\n\nMasukkan kode ini pada dashboard atau balaskan *OTP ${otpCode}* via WhatsApp ini untuk memverifikasi nomor Anda.`
      );
    } catch (_) {}

    return c.json({
      success: true,
      message: sentWa
        ? 'Nomor WhatsApp berhasil ditambahkan! Kode OTP telah dikirimkan via WhatsApp Bot.'
        : 'Nomor WhatsApp berhasil ditambahkan dengan status PENDING. Kode OTP siap diproses.',
      id: res.insertId,
      uid,
      whatsapp_number: cleanPhone,
      otp: otpCode,
      status: 'pending',
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/users/:userId/wa-numbers/:numberId/verify (Verify OTP code and change status to 'verified')
app.post('/users/:userId/wa-numbers/:numberId/verify', async (c) => {
  try {
    const userId = c.req.param('userId');
    const numberId = c.req.param('numberId');
    const body = await c.req.json();
    const { otp_code } = body;

    if (!otp_code) {
      return c.json({ success: false, message: 'Kode OTP wajib diisi.' }, 400);
    }

    const [uRows]: any = await pool.query('SELECT id, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    if (uRows.length === 0) {
      return c.json({ success: false, message: 'User tidak ditemukan.' }, 404);
    }

    const uid = uRows[0].uid;

    const [rows]: any = await pool.query(
      'SELECT * FROM user_whatsapp_numbers WHERE id = ? AND uid = ? LIMIT 1',
      [numberId, uid]
    );

    if (rows.length === 0) {
      return c.json({ success: false, message: 'Data nomor WhatsApp tidak ditemukan.' }, 404);
    }

    const record = rows[0];

    if (record.status === 'verified') {
      return c.json({ success: true, message: 'Nomor WhatsApp ini sudah terverifikasi.' });
    }

    if (record.otp !== String(otp_code).trim()) {
      return c.json({ success: false, message: 'Kode OTP salah. Silakan periksa kembali.' }, 400);
    }

    await pool.query(
      "UPDATE user_whatsapp_numbers SET status = 'verified', otp = NULL WHERE id = ?",
      [numberId]
    );

    try {
      await sendWaMessage(
        record.whatsapp_number,
        `✅ *NOMOR WHATSAPP TERVERIFIKASI!*\n\nNomor WhatsApp Anda (${record.whatsapp_number}) telah terverifikasi untuk memonitor & mengontrol sistem Smart Fertigation ESP32.`
      );
    } catch (_) {}

    return c.json({ success: true, message: 'Selamat! Nomor WhatsApp berhasil terverifikasi.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/users/:userId/wa-numbers/:numberId/resend (Resend OTP code)
app.post('/users/:userId/wa-numbers/:numberId/resend', async (c) => {
  try {
    const userId = c.req.param('userId');
    const numberId = c.req.param('numberId');

    const [uRows]: any = await pool.query('SELECT id, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    if (uRows.length === 0) {
      return c.json({ success: false, message: 'User tidak ditemukan.' }, 404);
    }

    const uid = uRows[0].uid;

    const [rows]: any = await pool.query(
      'SELECT * FROM user_whatsapp_numbers WHERE id = ? AND uid = ? LIMIT 1',
      [numberId, uid]
    );

    if (rows.length === 0) {
      return c.json({ success: false, message: 'Data nomor WhatsApp tidak ditemukan.' }, 404);
    }

    const record = rows[0];
    const newOtp = String(Math.floor(100000 + Math.random() * 900000));

    await pool.query(
      "UPDATE user_whatsapp_numbers SET otp = ?, status = 'pending' WHERE id = ?",
      [newOtp, numberId]
    );

    await sendWaMessage(
      record.whatsapp_number,
      `🔐 *KODE OTP BARU SMART FERTIGATION*\n\nKode OTP Anda adalah: *${newOtp}*\n\nMasukkan kode ini pada dashboard atau balaskan *OTP ${newOtp}* via WhatsApp ini.`
    );

    return c.json({ success: true, message: 'Kode OTP baru telah dikirimkan via WhatsApp!' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/auth/users/:userId/wa-numbers/:numberId
app.delete('/users/:userId/wa-numbers/:numberId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const numberId = c.req.param('numberId');
    const [uRows]: any = await pool.query('SELECT id, uid FROM users WHERE id = ? LIMIT 1', [userId]);
    const uid = uRows[0]?.uid;

    await pool.query('DELETE FROM user_whatsapp_numbers WHERE id = ? AND uid = ?', [numberId, uid]);
    return c.json({ success: true, message: 'Nomor WhatsApp berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/auth/users/:id (CRUD Update user profile - name, username, email, phone, password)
app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, username, email, phone, password } = body;

    const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return c.json({ success: false, message: 'User tidak ditemukan.' }, 404);
    }

    const current = rows[0];
    const newName = name || current.name;
    const newUsername = username || current.username;
    const newEmail = email || current.email;
    const newPhone = phone !== undefined ? phone : current.phone;
    const newPassword = password ? password : current.password;

    // Check unique email & username constraints
    if (newEmail !== current.email) {
      const [emailDup]: any = await pool.query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [newEmail, id]);
      if (emailDup.length > 0) {
        return c.json({ success: false, message: 'Email sudah digunakan oleh akun lain.' }, 400);
      }
    }

    if (newUsername && newUsername !== current.username) {
      const [userDup]: any = await pool.query('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1', [newUsername, id]);
      if (userDup.length > 0) {
        return c.json({ success: false, message: 'Username sudah digunakan oleh akun lain.' }, 400);
      }
    }

    await pool.query(
      'UPDATE users SET name = ?, username = ?, email = ?, phone = ?, password = ? WHERE id = ?',
      [newName, newUsername, newEmail, newPhone, newPassword, id]
    );

    const [updatedRows]: any = await pool.query(
      'SELECT id, uid, name, username, email, phone, level FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    const updatedUser = updatedRows[0];
    const uid = await ensureUserUid(updatedUser);

    const [waNumbers]: any = await pool.query(
      "SELECT id, uid, whatsapp_number, otp, status, created_at FROM user_whatsapp_numbers WHERE uid = ? ORDER BY id ASC",
      [uid]
    );
    updatedUser.waNumbers = waNumbers;

    return c.json({
      success: true,
      message: 'Profil pengguna (termasuk kolom phone) berhasil diperbarui!',
      user: updatedUser,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// ESP Devices Management for User
// ---------------------------------------------------------------------------

// GET /api/auth/users/:id/devices
app.get('/users/:id/devices', async (c) => {
  try {
    const userId = c.req.param('id');
    const [devices]: any = await pool.query(
      'SELECT * FROM devices WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    return c.json({ success: true, devices });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/auth/users/:id/devices
app.post('/users/:id/devices', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { name, device_code, mode, firmware_version } = body;

    if (!name || !device_code) {
      return c.json({ success: false, message: 'Nama dan kode perangkat wajib diisi.' }, 400);
    }

    const trimmedCode = device_code.trim().toUpperCase();

    // Get user UID
    const [uRows]: any = await pool.query('SELECT uid FROM users WHERE id = ?', [userId]);
    const userUid = uRows[0]?.uid || `USR-${String(userId).padStart(4, '0')}`;

    // Check if device_code already exists
    const [existing]: any = await pool.query('SELECT * FROM devices WHERE device_code = ?', [trimmedCode]);
    if (existing.length > 0) {
      const dev = existing[0];
      if (dev.user_id && dev.user_id !== parseInt(userId, 10)) {
        return c.json({ success: false, message: 'Kode perangkat ini sudah terhubung ke akun lain.' }, 400);
      }
      await pool.query(
        'UPDATE devices SET user_id = ?, uid = ?, name = ?, mode = COALESCE(?, mode), firmware_version = COALESCE(?, firmware_version), is_active = 1 WHERE id = ?',
        [userId, userUid, name.trim(), mode || null, firmware_version || null, dev.id]
      );
      return c.json({ success: true, message: 'Perangkat ESP32 berhasil dihubungkan ke akun Anda.' });
    }

    await pool.query(
      'INSERT INTO devices (user_id, uid, name, device_code, mode, firmware_version, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [userId, userUid, name.trim(), trimmedCode, mode || 'AUTO', firmware_version || '1.0.0']
    );

    return c.json({ success: true, message: 'Perangkat ESP32 berhasil ditambahkan.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/auth/users/:id/devices/:deviceId
app.put('/users/:id/devices/:deviceId', async (c) => {
  try {
    const userId = c.req.param('id');
    const deviceId = c.req.param('deviceId');
    const body = await c.req.json();
    const { name, device_code, mode, is_active } = body;

    const [existing]: any = await pool.query('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (existing.length === 0) {
      return c.json({ success: false, message: 'Perangkat tidak ditemukan.' }, 404);
    }

    if (device_code) {
      const trimmedCode = device_code.trim().toUpperCase();
      const [dup]: any = await pool.query('SELECT id FROM devices WHERE device_code = ? AND id != ?', [trimmedCode, deviceId]);
      if (dup.length > 0) {
        return c.json({ success: false, message: 'Kode perangkat sudah digunakan.' }, 400);
      }
    }

    await pool.query(
      'UPDATE devices SET name = COALESCE(?, name), device_code = COALESCE(?, device_code), mode = COALESCE(?, mode), is_active = COALESCE(?, is_active) WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [name ? name.trim() : null, device_code ? device_code.trim().toUpperCase() : null, mode || null, is_active !== undefined ? is_active : null, deviceId, userId]
    );

    return c.json({ success: true, message: 'Perangkat berhasil diperbarui.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/auth/users/:id/devices/:deviceId
app.delete('/users/:id/devices/:deviceId', async (c) => {
  try {
    const userId = c.req.param('id');
    const deviceId = c.req.param('deviceId');
    await pool.query('DELETE FROM devices WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [deviceId, userId]);
    return c.json({ success: true, message: 'Perangkat berhasil dihapus.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
