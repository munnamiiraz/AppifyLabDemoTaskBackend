import { Router } from 'express';
import {protect} from '../middleware/auth.middleware';

import { 
  createComment, 
  deleteComment, 
  getComments, 
  toggleCommentLike, 
  updateComment,
  createReply,
  deleteReply,
  getReplies,
  toggleReplyLike,
  updateReply,
  toggleLike,
  getPostLikes
} from '../controllers/post.controller';

const router = Router();

// Comment routes
router.get("/likes/:postId", protect, getPostLikes);


router.post("/:postId/comments", protect, createComment);
router.get("/:postId/comments", protect, getComments);
router.put("/comments/:commentId", protect, updateComment);
router.delete("/comments/:commentId", protect, deleteComment);
router.post("/comments/:commentId/like", protect, toggleCommentLike);

router.post("/:postId/react", protect, toggleLike);

// Reply routes
router.post("/comments/:commentId/replies", protect, createReply);
router.get("/comments/:commentId/replies", protect, getReplies);
router.put("/replies/:replyId", protect, updateReply);
router.delete("/replies/:replyId", protect, deleteReply);
router.post("/replies/:replyId/like", protect, toggleReplyLike);

export default router;