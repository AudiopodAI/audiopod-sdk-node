import axios from 'axios';
import * as fs from 'node:fs';
import type AudioPod from '../client';
import type { UploadLimits, PresignUpload, PresignedUpload } from '../workflow-contracts';

export class Uploads {
  constructor(private client: AudioPod) {}
  limits(service = 'dubbing'): Promise<UploadLimits> { return this.client.get('/api/v1/uploads/limits', { service }); }
  presign(body: PresignUpload): Promise<PresignedUpload> { return this.client.post('/api/v1/uploads/presign', body); }
  /** Send original bytes to the presigned destination without API credentials. */
  async put(upload: PresignedUpload, file: string): Promise<{ upload_session_id: string; etag: string | null }> {
    if (upload.method !== 'PUT') throw new TypeError('Unsupported presigned upload method');
    const stream = fs.createReadStream(file);
    try {
      const response = await axios.put(upload.url, stream, {
        headers: { ...upload.headers, Authorization: undefined, 'X-API-Key': undefined },
        auth: null as never, maxRedirects: 0, maxBodyLength: Infinity,
      });
      return { upload_session_id: upload.upload_id, etag: response.headers.etag ?? null };
    } finally { stream.destroy(); }
  }
}
