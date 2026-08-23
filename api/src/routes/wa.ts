import { Hono } from 'hono';
import { getWaStatus, sendWaMessage, logoutWaBot, syncWaChats } from '../services/waBot.js';
import { pool } from '../db.js';

const app = new Hono();

// GET /api/wa/status
app.get('/status', (c) => {
  const status = getWaStatus();
  return c.json(status);
});

// GET /api/wa/chats (Get list of active WhatsApp chat threads)
app.get('/chats', async (c) => {
  try {
    const [chats]: any = await pool.query(`
      SELECT 
        m1.chat_jid,
        m1.sender_name,
        m1.sender_phone,
        m1.avatar_url,
        m1.body as last_message,
        m1.from_me as last_from_me,
        m1.created_at as last_time
      FROM wa_messages m1
      INNER JOIN (
        SELECT chat_jid, MAX(id) as max_id
        FROM wa_messages
        GROUP BY chat_jid
      ) m2 ON m1.id = m2.max_id
      ORDER BY m1.created_at DESC
    `);

    return c.json({ success: true, chats });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/wa/messages/:jid (Get message thread for specific contact JID or phone)
app.get('/messages/:jid', async (c) => {
  try {
    const rawJid = c.req.param('jid');
    let cleanPhone = rawJid.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const searchJid = `${cleanPhone}@c.us`;

    const [messages]: any = await pool.query(
      `SELECT * FROM wa_messages 
       WHERE chat_jid = ? OR sender_phone = ? OR sender_phone = ?
       ORDER BY created_at ASC`,
      [searchJid, cleanPhone, rawJid]
    );

    return c.json({ success: true, messages });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/wa/sync (Sync all previous chats from WhatsApp Web)
app.post('/sync', async (c) => {
  try {
    const res = await syncWaChats();
    return c.json(res);
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// POST /api/wa/send
app.post('/send', async (c) => {
  try {
    const body = await c.req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return c.json({ success: false, message: 'Nomor HP dan isi pesan wajib diisi.' }, 400);
    }

    await sendWaMessage(phone, message);
    return c.json({ success: true, message: 'Pesan WhatsApp berhasil dikirim!' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Gagal mengirim pesan WhatsApp.' }, 400);
  }
});

// POST /api/wa/restart
app.post('/restart', async (c) => {
  try {
    await logoutWaBot();
    return c.json({ success: true, message: 'WhatsApp Bot berhasil direstart.' });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

export default app;
