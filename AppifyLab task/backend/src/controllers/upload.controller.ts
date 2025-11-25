import { Response } from 'express';
import { FileRequest } from '../middleware/upload';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary-buffer';

export const uploadImage = async (req: FileRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'uploads'
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: err.message,
    });
  }
};

export const deleteImage = async (req: FileRequest, res: Response) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: 'publicId required' });
    }

    await deleteFromCloudinary(publicId);

    return res.status(200).json({
      success: true,
      message: 'Image deleted',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Delete failed',
      error: err.message,
    });
  }
};
