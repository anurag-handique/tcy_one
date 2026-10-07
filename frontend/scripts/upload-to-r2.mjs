import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accountId = 'f09e497c88cd9552e02dd2e779c8e513';
const accessKeyId = '2a98e763bb06ee4675881cdf0caa1324';
const secretAccessKey = 'caf91b26814c7c505a0447e02b4c127fbaf5c3509ef9686544ae04ba6b11d4e4';
const bucketName = 'tcy-one-releases';
const publicDomain = 'https://pub-75125c1dec6e471f88324befd8b64812.r2.dev';
const prefix = 'releases';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.log('⚠️ [R2 Upload] Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not provided.');
  console.log('ℹ️ [R2 Upload] Skipping automated Cloudflare R2 upload step.');
  process.exit(0);
}

const releaseDir = path.resolve(__dirname, '..', 'release');

if (!fs.existsSync(releaseDir)) {
  console.error(`❌ [R2 Upload] Release directory not found at: ${releaseDir}`);
  process.exit(1);
}

const allowedExtensions = ['.exe', '.dmg', '.zip', '.blockmap', '.yml', '.yaml', '.json'];

// Find all release files
const allFiles = fs.readdirSync(releaseDir);
const filesToUpload = allFiles.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(path.join(releaseDir, file));
  return stat.isFile() && allowedExtensions.includes(ext);
});

if (filesToUpload.length === 0) {
  console.log('ℹ️ [R2 Upload] No matching installer files found in release directory.');
  process.exit(0);
}

console.log(`\n======================================================`);
console.log(`🚀 Starting Cloudflare R2 Upload`);
console.log(`📦 Bucket: ${bucketName}`);
console.log(`🌐 Account: ${accountId}`);
console.log(`📁 Files found (${filesToUpload.length}):`);
filesToUpload.forEach((f) => {
  const sizeMb = (fs.statSync(path.join(releaseDir, f)).size / (1024 * 1024)).toFixed(2);
  console.log(`   • ${f} (${sizeMb} MB)`);
});
console.log(`======================================================\n`);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

function getContentType(filename) {
  if (filename.endsWith('.exe')) return 'application/x-msdownload';
  if (filename.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (filename.endsWith('.zip')) return 'application/zip';
  if (filename.endsWith('.blockmap')) return 'application/octet-stream';
  if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'text/yaml';
  if (filename.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

async function uploadFile(filename) {
  const filePath = path.join(releaseDir, filename);
  const fileStream = fs.createReadStream(filePath);
  const stat = fs.statSync(filePath);
  const fileSizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  const key = prefix ? `${prefix}/${filename}` : filename;

  console.log(`⏳ Uploading "${filename}" (${fileSizeMb} MB) to "${key}"...`);

  const parallelUpload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: getContentType(filename),
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024, // 10MB parts
    leavePartsOnError: false,
  });

  parallelUpload.on('httpUploadProgress', (progress) => {
    if (progress.loaded && progress.total) {
      const pct = Math.round((progress.loaded / progress.total) * 100);
      process.stdout.write(`\r   Progress: [${pct}%] ${filename}`);
    }
  });

  await parallelUpload.done();
  console.log(`\n✅ Upload complete: "${filename}"`);

  if (publicDomain) {
    console.log(`   🔗 URL: ${publicDomain}/${key}`);
  }
}

async function run() {
  try {
    for (const file of filesToUpload) {
      await uploadFile(file);
    }
    console.log(`\n🎉 All ${filesToUpload.length} artifacts successfully uploaded to Cloudflare R2!\n`);
  } catch (err) {
    console.error(`\n❌ Error during Cloudflare R2 upload:`, err);
    process.exit(1);
  }
}

run();
