import cloudinary from '../config/cloudinary';

export interface UploadResponse {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  filename = 'file',
  folder = ''
): Promise<UploadResponse> => {
  return new Promise((resolve, reject) => {
    const opts = {
      folder,
      resource_type: 'auto' as const,
      public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}`,
    };

    const stream = cloudinary.uploader.upload_stream(
      opts,
      (err: any, result: any) => {
        if (err) return reject(err);
        if (!result) {
          return reject(new Error('Cloudinary returned no result'));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err: any) {
    throw new Error('Cloudinary delete failed: ' + (err.message || String(err)));
  }
};
