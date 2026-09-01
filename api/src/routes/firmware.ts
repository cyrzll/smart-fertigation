import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const app = new Hono();
const firmwareDir = fileURLToPath(new URL('../../firmware/', import.meta.url));
const firmwareFile = fileURLToPath(new URL('../../firmware/firmware.bin', import.meta.url));
const metadataFile = fileURLToPath(new URL('../../firmware/firmware.json', import.meta.url));
const sourceFile = fileURLToPath(new URL('../../firmware/firmware.ino', import.meta.url));
const execFileAsync = promisify(execFile);
let compileInProgress = false;

type FirmwareMetadata = {
  version: string;
  notes?: string;
  mandatory?: boolean;
  published_at?: string;
};

async function requireAdmin(c: any) {
  const authorization = c.req.header('Authorization') || '';
  const match = authorization.match(/^Bearer token-(\d+)-(\d+)$/);
  if (!match) return false;
  const [rows]: any = await pool.query('SELECT level FROM users WHERE id = ? LIMIT 1', [Number(match[1])]);
  return rows.length > 0 && rows[0].level === 'admin';
}

function nextVersion(currentVersion: string, bumpType: string) {
  const parts = normalizeVersion(currentVersion).split('.').map((part) => Number.parseInt(part, 10) || 0);
  let [major, minor, patch] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `v${major}.${minor}.${patch}`;
}

function jakartaIsoTimestamp() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().replace('Z', '+07:00');
}

async function currentMetadata() {
  return JSON.parse(await readFile(metadataFile, 'utf8')) as FirmwareMetadata;
}

async function getFirmwareInfo() {
  const [metadataRaw, fileInfo, binary] = await Promise.all([
    readFile(metadataFile, 'utf8'),
    stat(firmwareFile),
    readFile(firmwareFile),
  ]);
  const metadata = JSON.parse(metadataRaw) as FirmwareMetadata;
  if (!metadata.version) throw new Error('version wajib tersedia di firmware.json');

  return {
    metadata,
    size: fileInfo.size,
    md5: createHash('md5').update(binary).digest('hex'),
  };
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '').split('-')[0];
}

function compareVersions(left: string, right: string) {
  const a = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const b = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// GET /api/firmware/update?current_version=v2.6.0-BLE-OTA
app.get('/update', async (c) => {
  try {
    const currentVersion = c.req.query('current_version') || '';
    const metadata = await currentMetadata();
    let size = 0;
    let md5 = '';
    let firmwareAvailable = false;
    try {
      const binary = await readFile(firmwareFile);
      size = binary.length;
      md5 = createHash('md5').update(binary).digest('hex');
      firmwareAvailable = binary.length > 0;
    } catch (_) {
      // Metadata tetap dapat diperiksa sebelum binary pertama berhasil diterbitkan.
    }
    const configuredBaseUrl = process.env.FIRMWARE_PUBLIC_BASE_URL?.replace(/\/$/, '');
    const requestOrigin = new URL(c.req.url).origin;
    const downloadUrl = `${configuredBaseUrl || requestOrigin}/api/firmware`;
    const newerVersionExists = currentVersion ? compareVersions(metadata.version, currentVersion) > 0 : true;

    return c.json({
      success: true,
      current_version: currentVersion || null,
      latest_version: metadata.version,
      firmware_available: firmwareAvailable,
      update_available: firmwareAvailable && newerVersionExists,
      status: !firmwareAvailable ? 'BINARY_NOT_PUBLISHED' : newerVersionExists ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE',
      mandatory: Boolean(metadata.mandatory),
      notes: metadata.notes || '',
      published_at: metadata.published_at || null,
      size,
      md5,
      download_url: firmwareAvailable ? downloadUrl : null,
    });
  } catch (error: any) {
    return c.json({
      success: false,
      message: 'Metadata firmware belum tersedia di server.',
      error: error.message,
      expected_directory: firmwareDir,
    }, 404);
  }
});

app.get('/admin/status', async (c) => {
  try {
    if (!(await requireAdmin(c))) {
      return c.json({ success: false, message: 'Akses admin diperlukan.' }, 403);
    }
    const metadata = await currentMetadata();
    const cli = process.env.ARDUINO_CLI_PATH || 'arduino-cli';
    let compilerReady = false;
    let compilerVersion = '';
    let compilerError = '';
    try {
      const result = await execFileAsync(cli, ['version'], { timeout: 5000 });
      compilerReady = true;
      compilerVersion = result.stdout.trim();
    } catch (error: any) {
      compilerError = error.code === 'ENOENT'
        ? `Executable tidak ditemukan: ${cli}`
        : error.message;
    }
    let binaryInfo: { size: number; md5: string } | null = null;
    try {
      const binary = await readFile(firmwareFile);
      binaryInfo = { size: binary.length, md5: createHash('md5').update(binary).digest('hex') };
    } catch (_) {}
    return c.json({
      success: true,
      firmware: { ...metadata, ...binaryInfo },
      next_versions: {
        patch: nextVersion(metadata.version, 'patch'),
        minor: nextVersion(metadata.version, 'minor'),
        major: nextVersion(metadata.version, 'major'),
      },
      compiler: {
        ready: compilerReady,
        compiling: compileInProgress,
        cli,
        version: compilerVersion,
        error: compilerError,
        fqbn: process.env.ESP32_FQBN || 'esp32:esp32:esp32',
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: 'Metadata firmware tidak dapat dibaca.', error: error.message }, 500);
  }
});

// GET /api/firmware - file hasil kompilasi Arduino/PlatformIO
app.get('/', async (c) => {
  try {
    const { metadata, size, md5 } = await getFirmwareInfo();
    const binary = await readFile(firmwareFile);
    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Length', String(size));
    c.header('Content-Disposition', `attachment; filename="esp32-fertigation-${metadata.version}.bin"`);
    c.header('Cache-Control', 'public, max-age=300');
    c.header('ETag', `"${md5}"`);
    c.header('X-Firmware-Version', metadata.version);
    c.header('X-Firmware-MD5', md5);
    return c.body(binary);
  } catch (error: any) {
    return c.json({ success: false, message: 'File firmware belum tersedia.', error: error.message }, 404);
  }
});

// POST /api/firmware/publish (admin only)
// Multipart: firmware (.ino), bump_type (patch|minor|major), notes, mandatory
app.post('/publish', async (c) => {
  let buildRoot = '';
  let ownsCompileLock = false;
  try {
    if (!(await requireAdmin(c))) {
      return c.json({ success: false, message: 'Hanya admin yang dapat menerbitkan firmware.' }, 403);
    }

    const form = await c.req.formData();
    const upload = form.get('firmware');
    const bumpType = String(form.get('bump_type') || 'patch').toLowerCase();
    const notes = String(form.get('notes') || '').trim();
    const mandatory = String(form.get('mandatory') || 'false') === 'true';

    if (!(upload instanceof File) || !upload.name.toLowerCase().endsWith('.ino')) {
      return c.json({ success: false, message: 'File firmware wajib berformat .ino.' }, 400);
    }
    if (upload.size <= 0 || upload.size > 2 * 1024 * 1024) {
      return c.json({ success: false, message: 'Ukuran source .ino harus antara 1 byte dan 2 MB.' }, 400);
    }
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
      return c.json({ success: false, message: 'bump_type harus patch, minor, atau major.' }, 400);
    }
    if (!notes) {
      return c.json({ success: false, message: 'Catatan perubahan wajib diisi.' }, 400);
    }
    if (compileInProgress) {
      return c.json({ success: false, message: 'Kompilasi firmware lain sedang berjalan. Tunggu sampai selesai.' }, 409);
    }
    compileInProgress = true;
    ownsCompileLock = true;

    const oldMetadata = await currentMetadata();
    const version = nextVersion(oldMetadata.version, bumpType);
    const publishedAt = jakartaIsoTimestamp();
    const uploadedSource = Buffer.from(await upload.arrayBuffer()).toString('utf8');
    const versionDeclaration = /const\s+char\s*\*\s*firmware_version\s*=\s*"[^"]*"\s*;/;
    if (!versionDeclaration.test(uploadedSource)) {
      return c.json({
        success: false,
        message: 'Source .ino harus memiliki deklarasi const char* firmware_version agar versi dapat diperbarui otomatis.',
      }, 400);
    }
    const source = Buffer.from(uploadedSource.replace(versionDeclaration, `const char* firmware_version = "${version}";`), 'utf8');

    buildRoot = await mkdtemp(join(tmpdir(), 'fertigation-firmware-'));
    const sketchDir = join(buildRoot, 'firmware');
    const outputDir = join(buildRoot, 'output');
    await mkdir(sketchDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(sketchDir, 'firmware.ino'), source);

    const cli = process.env.ARDUINO_CLI_PATH || 'arduino-cli';
    const fqbn = process.env.ESP32_FQBN || 'esp32:esp32:esp32';
    const { stdout, stderr } = await execFileAsync(cli, [
      'compile',
      '--fqbn', fqbn,
      '--output-dir', outputDir,
      sketchDir,
    ], {
      timeout: 30 * 60 * 1000,
      maxBuffer: 4 * 1024 * 1024,
    });

    const outputFiles = await readdir(outputDir);
    const compiledName = outputFiles.find((name) => name === 'firmware.ino.bin')
      || outputFiles.find((name) => name.endsWith('.ino.bin') && !name.includes('bootloader') && !name.includes('partitions'));
    if (!compiledName) {
      throw new Error(`Kompilasi selesai tetapi binary aplikasi tidak ditemukan. Output: ${outputFiles.join(', ')}`);
    }
    const compiledFile = join(outputDir, compiledName);
    const compiled = await readFile(compiledFile);
    const md5 = createHash('md5').update(compiled).digest('hex');
    const newMetadata: FirmwareMetadata = {
      version,
      notes,
      mandatory,
      published_at: publishedAt,
    };

    await mkdir(firmwareDir, { recursive: true });
    const pendingBinary = join(firmwareDir, '.firmware.bin.pending');
    const pendingSource = join(firmwareDir, '.firmware.ino.pending');
    const pendingMetadata = join(firmwareDir, '.firmware.json.pending');
    await writeFile(pendingBinary, compiled);
    await writeFile(pendingSource, source);
    await writeFile(pendingMetadata, `${JSON.stringify(newMetadata, null, 2)}\n`);
    await rename(pendingBinary, firmwareFile);
    await rename(pendingSource, sourceFile);
    await rename(pendingMetadata, metadataFile);

    return c.json({
      success: true,
      message: `Firmware ${version} berhasil dikompilasi dan diterbitkan.`,
      firmware: { ...newMetadata, size: compiled.length, md5, fqbn },
      compiler_output: `${stdout || ''}${stderr || ''}`.slice(-6000),
    });
  } catch (error: any) {
    const compilerOutput = `${error.stdout || ''}${error.stderr || ''}`.slice(-6000);
    const missingCli = error.code === 'ENOENT';
    return c.json({
      success: false,
      message: missingCli
        ? 'arduino-cli belum terpasang atau ARDUINO_CLI_PATH belum benar pada server.'
        : 'Kompilasi firmware gagal. Firmware aktif tidak diubah.',
      error: error.message,
      compiler_output: compilerOutput,
    }, missingCli ? 503 : 422);
  } finally {
    if (ownsCompileLock) compileInProgress = false;
    if (buildRoot) await rm(buildRoot, { recursive: true, force: true }).catch(() => {});
  }
});

export default app;
