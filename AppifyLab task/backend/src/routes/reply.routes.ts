import { Router } from 'express';
import { createReply, deleteReply, getReplies, toggleReplyLike, updateReply } from "../controllers/post.controller"
import {protect} from '../middleware/auth.middleware';

const router = Router();


router.post("/:commentId/replies", protect, createReply)
router.get("/comments/:commentId/replies", protect, getReplies)
router.put("/replies/:replyId", protect, updateReply)
router.delete("/replies/:replyId", protect, deleteReply)
router.post("/replies/:replyId/like", protect, toggleReplyLike)


export default router;
