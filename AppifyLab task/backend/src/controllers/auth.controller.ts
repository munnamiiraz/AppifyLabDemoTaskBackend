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



export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password } = req.body;
    console.log(req.body);
    if(!firstName || !lastName || !email || !password) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }
    
    
    if(!validator.isEmail(email)) {
      res.status(400).json(new ApiError(401, "Enter a valid email"));
      return;
    }

    if (password.length < 8) {
      res.status(400).json(new ApiError(400, "Enter a strong password (min 8 chars)"));
      return;
    }

    const salt: string = await bcrypt.genSalt(10);
    const hashedPassword: string = await bcrypt.hash(password, salt);

    const user = await prisma.user.findUnique({
      where: {email: email}
    })

    if(user) {
      res.status(400).json(new ApiError(400, "User already exists"));
      return;
    }



    const newUser = await prisma.user.create({
      data: { firstName, lastName, email, password: hashedPassword }
    });

    const { password: _, ...safeUser } = newUser;
    res.status(201).json(new ApiResponse(201, safeUser, "User created successfully"));
  } catch (error) {
    console.error('SignUp error:', error);
    res.status(500).json(new ApiError(500, 'Error creating user'));
  }
};


export const signIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    if (!email || !password) {
      res.status(400).json(new ApiError(400, "Email and password are required"));
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json(new ApiError(404, "User not found"));
      return;
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      res.status(401).json(new ApiError(401, "Invalid credentials"));
      return;
    }

    // 4. Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // 5. Remove password before sending response
    const { password: _, ...safeUser } = user;

    res.status(200).json(
      new ApiResponse(200, { user: safeUser, token }, "Logged in successfully")
    );
  } catch (error) {
    console.error("SignIn error:", error);
    res.status(500).json(new ApiError(500, "Internal server error"));
  }
};










