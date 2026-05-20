import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;

let storageGcs;

try {
    if (isCloudRun) {
        console.log('[storage] Cloud Run — using automatic credentials');
        storageGcs = new Storage();
    } else {
        const keyFile = path.join(__dirname, '../../json-key.json');
        if (fs.existsSync(keyFile)) {
            console.log(`[storage] Local — using key file: ${keyFile}`);
            storageGcs = new Storage({ keyFilename: keyFile });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('[storage] Local — using GOOGLE_APPLICATION_CREDENTIALS');
            storageGcs = new Storage();
        } else {
            console.warn('[storage] No GCS credentials found');
        }
    }
} catch (err) {
    console.error('[storage] Error initializing GCS:', err.message);
}

export const GCS_BUCKET = process.env.GCS_BUCKET || 'hojas_vida_logyser';
export const GCS_BUCKET_FIRMAS = process.env.GCS_BUCKET_FIRMAS || 'firmas-images';

export const bucket = storageGcs ? storageGcs.bucket(GCS_BUCKET) : null;
export const bucketFirmas = storageGcs ? storageGcs.bucket(GCS_BUCKET_FIRMAS) : null;

console.log(`[storage] Buckets ready: ${bucket ? GCS_BUCKET : 'N/A'} | ${bucketFirmas ? GCS_BUCKET_FIRMAS : 'N/A'}`);
