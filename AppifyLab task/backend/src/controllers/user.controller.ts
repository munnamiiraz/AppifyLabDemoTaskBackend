import { Request, Response } from 'express';
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiResponse } from '../utils/ApiResponce';
import { ApiError } from '../utils/ApiError';
import getPrisma from '../config/prisma';
import { AuthRequest } from '@/types/express';
import cloudinary from '../config/cloudinary';
import fs from "fs/promises";
import { uploadBufferToCloudinary } from '../utils/cloudinary-buffer';
// import { userPublicFields } from '../utils/prismaSelector';
const prisma = getPrisma();

export interface AuthFileRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    image: string;

  };
  files?: Express.Multer.File[];
}


export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user;
    // console.log("hi");
    // console.log(currentUser);
    
    
    const user = await prisma.user.findUnique({
      where: {id: currentUser._id},
      // select: userPublicFields
    })

    if(!user) {
      res.status(401).json(new ApiError(401, "User not found"));
      return;
    }
    console.log(user);
    
    res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));


  } catch (error) {
    console.error('getUser error:', error);
    res.status(500).json(new ApiError(500, 'Error getting user'));
  }
}

export const createPost = async (req: AuthFileRequest, res: Response) => {
  try {
    // Get authenticated user id (adjust if your auth middleware sets a different key)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contentRaw = req.body?.content;
    const content = typeof contentRaw === 'string' && contentRaw.trim().length > 0 ? contentRaw.trim() : null;

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    // Validation: require content or at least one file
    if (!content && files.length === 0) {
      return res.status(400).json({ message: 'Post must contain text or at least one photo' });
    }

    // Max 4 images
    if (files.length > 4) {
      return res.status(400).json({ message: 'Maximum 4 images are allowed' });
    }

    // Validate MIME types (only images)
    for (const f of files) {
      if (!f.mimetype?.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }
    }

    // Upload files to Cloudinary BEFORE transaction
    const uploadedFiles: Array<{url: string, type: string, publicId: string}> = [];
    
    if (files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await uploadBufferToCloudinary(file.buffer, file.originalname, 'posts');
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || uploadResult?.format || 'jpg';
          
          uploadedFiles.push({
            url: uploadResult.url,
            type: fileExtension,
            publicId: uploadResult.publicId
          });
        } catch (err) {
          // Cleanup any successful uploads if one fails
          for (const uploaded of uploadedFiles) {
            try {
              await cloudinary.uploader.destroy(uploaded.publicId);
            } catch (cleanupErr) {
              console.error('Cleanup error:', cleanupErr);
            }
          }
          throw new Error('Media upload failed: ' + (err as any)?.message);
        }
      }
    }

    // Now do the database transaction with uploaded file URLs
    const createdPost = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: userId,
          content,
          isPrivate: Boolean(req.body?.isPrivate === 'true' || req.body?.isPrivate === true),
        },
      });

      if (uploadedFiles.length > 0) {
        const mediaCreates = uploadedFiles.map(file => 
          tx.postMedia.create({
            data: {
              postId: post.id,
              url: file.url,
              type: file.type,
            },
          })
        );

        await Promise.all(mediaCreates);
      }

      return tx.post.findUnique({
        where: { id: post.id },
        include: { media: true },
      });
    });

    return res.status(201).json({ message: 'Post created', post: createdPost });
  } catch (err: any) {
    console.error('createPost error:', err);
    if (err.message && err.message.startsWith('Media upload failed')) {
      return res.status(500).json({ message: 'Media upload failed', error: err.message });
    }
    return res.status(500).json({ message: 'Failed to create post', error: err?.message ?? String(err) });
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        isPrivate: false,
      },
      include: {
        // Post media (images)
        media: true,
        
        // Post author info
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        
        // Post likes/reactions
        likes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        
        // Comments on the post
        comments: {
          include: {
            // Comment author
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
            
            // Comment likes/reactions
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            
            // Replies to the comment
            replies: {
              include: {
                // Reply author
                author: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    image: true,
                  },
                },
                
                // Reply likes/reactions
                likes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        image: true,
                      },
                    },
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
              },
              orderBy: {
                createdAt: 'asc', // Oldest replies first
              },
            },
          },
          orderBy: {
            createdAt: 'desc', // Newest comments first
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Newest posts first
      },
    });

    // Transform data to include counts
    const postsWithCounts = posts.map(post => ({
      ...post,
      likesCount: post.likes.length,
      commentsCount: post.comments.length,
      comments: post.comments.map(comment => ({
        ...comment,
        likesCount: comment.likes.length,
        repliesCount: comment.replies.length,
        replies: comment.replies.map(reply => ({
          ...reply,
          likesCount: reply.likes.length,
        })),
      })),
    }));

    return res.status(200).json({ 
      message: 'Posts retrieved successfully', 
      posts: postsWithCounts 
    });
  } catch (err: any) {
    console.error('getPosts error:', err);
    return res.status(500).json({ 
      message: 'Failed to retrieve posts', 
      error: err?.message ?? String(err) 
    });
  }
};

export const deletePost = async (req: AuthFileRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { postId } = req.body;
    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    // 1. Check post ownership
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { media: true },
    });

    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // 2. Delete Cloudinary media
    if (existingPost.media.length > 0) {
      for (const media of existingPost.media) {
        try {
          const urlParts = media.url.split('/');
          const fileWithExt = urlParts[urlParts.length - 1];
          const publicId = `posts/${fileWithExt.split('.')[0]}`;

          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Cloudinary delete failed:", error);
        }
      }
    }

    // 3. Delete PostMedia rows first (NO CASCADE needed)
    await prisma.postMedia.deleteMany({
      where: { postId }
    });

    // 4. Delete the post
    await prisma.post.delete({
      where: { id: postId }
    });

    return res.status(200).json({ message: "Post deleted successfully" });

  } catch (err: any) {
    console.error("deletePost error:", err);
    return res.status(500).json({
      message: "Failed to delete post",
      error: err.message || "Unknown error"
    });
  }
};


export const editPost = async (req: AuthFileRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {postId} = req.body;
    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { media: true },
    });

    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (existingPost.authorId !== userId) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const contentRaw = req.body?.content;
    const content = typeof contentRaw === 'string' && contentRaw.trim().length > 0 ? contentRaw.trim() : null;

    const newFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
    
    // Parse existing media to keep (array of media IDs from request body)
    const keepMediaIds = req.body?.keepMediaIds 
      ? (Array.isArray(req.body.keepMediaIds) ? req.body.keepMediaIds : [req.body.keepMediaIds])
      : [];

    // Calculate total media count after edit
    const totalMediaCount = keepMediaIds.length + newFiles.length;

    // Validation: require content or at least one file
    if (!content && totalMediaCount === 0) {
      return res.status(400).json({ message: 'Post must contain text or at least one photo' });
    }

    // Max 4 images
    if (totalMediaCount > 4) {
      return res.status(400).json({ message: 'Maximum 4 images are allowed' });
    }

    // Validate MIME types (only images)
    for (const f of newFiles) {
      if (!f.mimetype?.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }
    }

    // Determine which media to delete
    const mediaToDelete = existingPost.media.filter(m => !keepMediaIds.includes(m.id));

    // Upload new files to Cloudinary BEFORE transaction
    const uploadedFiles: Array<{url: string, type: string, publicId: string}> = [];
    
    if (newFiles.length > 0) {
      for (const file of newFiles) {
        try {
          const uploadResult = await uploadBufferToCloudinary(file.buffer, file.originalname, 'posts');
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || uploadResult?.format || 'jpg';
          
          uploadedFiles.push({
            url: uploadResult.url,
            type: fileExtension,
            publicId: uploadResult.publicId
          });
        } catch (err) {
          // Cleanup any successful uploads if one fails
          for (const uploaded of uploadedFiles) {
            try {
              await cloudinary.uploader.destroy(uploaded.publicId);
            } catch (cleanupErr) {
              console.error('Cleanup error:', cleanupErr);
            }
          }
          throw new Error('Media upload failed: ' + (err as any)?.message);
        }
      }
    }

    // Update post in transaction
    const updatedPost = await prisma.$transaction(async (tx) => {
      // Delete removed media records
      if (mediaToDelete.length > 0) {
        await tx.postMedia.deleteMany({
          where: {
            id: { in: mediaToDelete.map(m => m.id) },
          },
        });
      }

      // Create new media records
      if (uploadedFiles.length > 0) {
        const mediaCreates = uploadedFiles.map(file => 
          tx.postMedia.create({
            data: {
              postId: postId,
              url: file.url,
              type: file.type,
            },
          })
        );

        await Promise.all(mediaCreates);
      }

      // Update post content and privacy
      const post = await tx.post.update({
        where: { id: postId },
        data: {
          content,
          isPrivate: Boolean(req.body?.isPrivate === 'true' || req.body?.isPrivate === true),
        },
        include: { media: true },
      });

      return post;
    });

    // Delete removed media from Cloudinary AFTER successful transaction
    if (mediaToDelete.length > 0) {
      for (const media of mediaToDelete) {
        try {
          const urlParts = media.url.split('/');
          const fileWithExt = urlParts[urlParts.length - 1];
          const publicId = `posts/${fileWithExt.split('.')[0]}`;
          
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Error deleting old media from Cloudinary:', err);
          // Don't fail the request if Cloudinary cleanup fails
        }
      }
    }

    return res.status(200).json({ message: 'Post updated', post: updatedPost });
  } catch (err: any) {
    console.error('editPost error:', err);
    if (err.message && err.message.startsWith('Media upload failed')) {
      return res.status(500).json({ message: 'Media upload failed', error: err.message });
    }
    return res.status(500).json({ message: 'Failed to update post', error: err?.message ?? String(err) });
  }
};