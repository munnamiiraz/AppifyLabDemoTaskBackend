import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

// ============================================
// COMMENT ENDPOINTS
// ============================================

// POST /api/posts/:postId/comments
// Create a new comment on a post
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Assuming user is attached to request via auth middleware

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: userId,
        postId: postId
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        likes: true,
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true
              }
            },
            likes: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
};

// GET /api/posts/:postId/comments
// Get all comments for a post
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get comments with pagination
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              image: true
            }
          },
          likes: true,
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  image: true
                }
              },
              likes: true
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.comment.count({ where: { postId } })
    ]);

    return res.status(200).json({
      success: true,
      comments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// PUT /api/comments/:commentId
// Update a comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this comment' });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        likes: true,
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true
              }
            },
            likes: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      comment: updatedComment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({ error: 'Failed to update comment' });
  }
};

// DELETE /api/comments/:commentId
// Delete a comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    // Delete comment (cascades to replies and likes)
    await prisma.comment.delete({
      where: { id: commentId }
    });

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// ============================================
// REPLY ENDPOINTS
// ============================================

// POST /api/comments/:commentId/replies
// Create a reply to a comment
export const createReply = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Create reply
    const reply = await prisma.reply.create({
      data: {
        content: content.trim(),
        authorId: userId,
        commentId: commentId
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        likes: true
      }
    });

    return res.status(201).json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('Create reply error:', error);
    return res.status(500).json({ error: 'Failed to create reply' });
  }
};

// GET /api/comments/:commentId/replies
// Get all replies for a comment
export const getReplies = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Get replies
    const replies = await prisma.reply.findMany({
      where: { commentId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        likes: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      success: true,
      replies
    });
  } catch (error) {
    console.error('Get replies error:', error);
    return res.status(500).json({ error: 'Failed to fetch replies' });
  }
};

// PUT /api/replies/:replyId
// Update a reply
export const updateReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    // Check if reply exists and user is the author
    const reply = await prisma.reply.findUnique({
      where: { id: replyId }
    });

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.authorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this reply' });
    }

    // Update reply
    const updatedReply = await prisma.reply.update({
      where: { id: replyId },
      data: { content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        likes: true
      }
    });

    return res.status(200).json({
      success: true,
      reply: updatedReply
    });
  } catch (error) {
    console.error('Update reply error:', error);
    return res.status(500).json({ error: 'Failed to update reply' });
  }
};

// DELETE /api/replies/:replyId
// Delete a reply
export const deleteReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;

    // Check if reply exists and user is the author
    const reply = await prisma.reply.findUnique({
      where: { id: replyId }
    });

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    if (reply.authorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this reply' });
    }

    // Delete reply
    await prisma.reply.delete({
      where: { id: replyId }
    });

    return res.status(200).json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    return res.status(500).json({ error: 'Failed to delete reply' });
  }
};

// ============================================
// LIKE ENDPOINTS (for comments and replies)
// ============================================

// POST /api/comments/:commentId/like
// Toggle like on a comment
export const toggleCommentLike = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already liked the comment
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        commentId
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      return res.status(200).json({
        success: true,
        liked: false,
        message: 'Comment unliked'
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId,
          commentId
        }
      });

      return res.status(200).json({
        success: true,
        liked: true,
        message: 'Comment liked'
      });
    }
  } catch (error) {
    console.error('Toggle comment like error:', error);
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// POST /api/replies/:replyId/like
// Toggle like on a reply
export const toggleReplyLike = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;

    // Check if reply exists
    const reply = await prisma.reply.findUnique({
      where: { id: replyId }
    });

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    // Check if user already liked the reply
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        replyId
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id }
      });

      return res.status(200).json({
        success: true,
        liked: false,
        message: 'Reply unliked'
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId,
          replyId
        }
      });

      return res.status(200).json({
        success: true,
        liked: true,
        message: 'Reply liked'
      });
    }
  } catch (error) {
    console.error('Toggle reply like error:', error);
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
};


import { ApiError } from "../utils/ApiError";

export const toggleLike = async (req: Request, res: Response): Promise<void> => {

  try {
    const userId = req.user?.id;
    const { postId, commentId, replyId } = req.body;

    if (!userId) throw new ApiError(401, "Unauthorized");

    // Validate only one target at a time
    const countSelected = [postId, commentId, replyId].filter(Boolean).length;
    if (countSelected !== 1) {
      throw new ApiError(400, "Provide exactly one target: postId, commentId, or replyId");
    }

    // Check existing like
    const existing = await prisma.like.findFirst({
      where: {
        userId,
        postId: postId || undefined,
        commentId: commentId || undefined,
        replyId: replyId || undefined
      }
    });

    // UNLIKE
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.status(200).json({
        success: true,
        liked: false,
        message: "Like removed"
      });
      return;
    }

    // LIKE
    await prisma.like.create({
      data: {
        userId,
        postId: postId || undefined,
        commentId: commentId || undefined,
        replyId: replyId || undefined
      }
    });

    res.status(200).json({
      success: true,
      liked: true,
      message: "Liked successfully"
    });

  } catch (error: any) {
    const status = error.status || 500;

    res.status(status).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getPostLikes = async (req: Request, res: Response): Promise<void> => {

  try {
    const { postId } = req.params;

    if (!postId) {
      res.status(400).json({ success: false, message: "postId is required" });
      return;
    }

    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      total: likes.length,
      users: likes.map(like => like.user)
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post likes"
    });
  }
};

export const getPostComments = async (req: Request, res: Response): Promise<void> => {

  try {
    const { postId } = req.params;

    if (!postId) {
      res.status(400).json({ success: false, message: "postId is required" });
      return;
    }

    // Fetch top-level comments
    const comments = await prisma.comment.findMany({
      where: {
        postId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments,
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
};
