import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadImage, deleteImage } from "../controllers/upload.controller";

const router = Router();

router.post('/upload', upload.single('file'), uploadImage as any);
router.delete('/delete', deleteImage as any);

export default router;
