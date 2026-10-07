import { S3Client, ListObjectsV2Command, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string; // e.g. https://download.thecodeyogi.com or https://pub-xxxx.r2.dev
}

const STORAGE_KEY = 'tcy_cloudflare_r2_config';

export function getStoredR2Config(): R2Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse stored R2 config:', e);
  }
  return {
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: 'tcy-one-releases',
    publicDomain: '',
  };
}

export function saveR2Config(config: R2Config): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save R2 config:', e);
  }
}

export function createR2Client(config: R2Config): S3Client {
  const accountId = config.accountId.trim();
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: 'auto',
    endpoint: endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
    },
  });
}

export async function testR2Connection(config: R2Config): Promise<{ success: boolean; error?: string }> {
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    return { success: false, error: 'Please fill in all Cloudflare R2 credentials (Account ID, Access Key, Secret Key, Bucket Name).' };
  }

  try {
    const client = createR2Client(config);
    const cmd = new ListObjectsV2Command({
      Bucket: config.bucketName.trim(),
      MaxKeys: 1,
    });
    await client.send(cmd);
    return { success: true };
  } catch (err: any) {
    console.error('R2 connection test error:', err);
    return { success: false, error: err?.message || 'Failed to connect to Cloudflare R2 bucket. Verify credentials and CORS.' };
  }
}

export interface R2UploadParams {
  file: File;
  key: string;
  config: R2Config;
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
}

export async function uploadToR2({
  file,
  key,
  config,
  onProgress,
}: R2UploadParams): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = createR2Client(config);
    const cleanKey = key.replace(/^\/+/, '');

    // Determine Content-Type
    let contentType = 'application/octet-stream';
    if (file.name.endsWith('.exe')) contentType = 'application/x-msdownload';
    else if (file.name.endsWith('.dmg')) contentType = 'application/x-apple-diskimage';
    else if (file.name.endsWith('.zip')) contentType = 'application/zip';

    const parallelUpload = new Upload({
      client,
      params: {
        Bucket: config.bucketName.trim(),
        Key: cleanKey,
        Body: file,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 5, // 5 MB chunks
      leavePartsOnError: false,
    });

    parallelUpload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total && onProgress) {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        onProgress({
          loaded: progress.loaded,
          total: progress.total,
          percentage,
        });
      }
    });

    await parallelUpload.done();

    // Construct public URL
    const baseUrl = config.publicDomain.trim().replace(/\/+$/, '');
    const publicUrl = baseUrl ? `${baseUrl}/${cleanKey}` : `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${cleanKey}`;

    return {
      success: true,
      url: publicUrl,
    };
  } catch (err: any) {
    console.error('R2 Upload error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to upload file to Cloudflare R2.',
    };
  }
}

export interface R2ObjectItem {
  key: string;
  size: number;
  lastModified?: string;
  url: string;
}

export async function listR2Objects(config: R2Config): Promise<{ success: boolean; objects?: R2ObjectItem[]; error?: string }> {
  try {
    const client = createR2Client(config);
    const cmd = new ListObjectsV2Command({
      Bucket: config.bucketName.trim(),
      MaxKeys: 100,
    });

    const response = await client.send(cmd);
    const baseUrl = config.publicDomain.trim().replace(/\/+$/, '');

    const objects: R2ObjectItem[] = (response.Contents || []).map((item) => {
      const key = item.Key || '';
      const url = baseUrl ? `${baseUrl}/${key}` : `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
      return {
        key,
        size: item.Size || 0,
        lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
        url,
      };
    });

    return { success: true, objects };
  } catch (err: any) {
    console.error('R2 list objects error:', err);
    return { success: false, error: err?.message || 'Failed to list R2 objects' };
  }
}

export async function deleteFromR2(key: string, config: R2Config): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createR2Client(config);
    const cmd = new DeleteObjectCommand({
      Bucket: config.bucketName.trim(),
      Key: key,
    });
    await client.send(cmd);
    return { success: true };
  } catch (err: any) {
    console.error('R2 delete object error:', err);
    return { success: false, error: err?.message || 'Failed to delete from R2' };
  }
}
