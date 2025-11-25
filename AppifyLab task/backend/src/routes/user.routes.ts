import { Router } from 'express';
import {  getUser } from '../controllers/user.controller';
import {protect} from '../middleware/auth.middleware';
import { createPost, getPosts, deletePost, editPost} from '../controllers/user.controller';
import { upload } from '../config/multer';

const router = Router();

router.get("/get-profile", protect, getUser as any)
router.get("/get-posts" , protect, getPosts as any)
router.post("/post" , protect, upload.array('files', 4), createPost as any)
router.delete("/post", protect, deletePost as any)
router.put("/post/", protect, upload.array('files', 4), editPost as any)



export default router;