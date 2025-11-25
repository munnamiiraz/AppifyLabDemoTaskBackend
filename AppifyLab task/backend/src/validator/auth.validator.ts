import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(2, "name must be at least 2 characters"),
  email: z.string().email("invalid email"),
  password: z.string().min(6, "password must be at least 6 characters")
});

// useful for typed params or query later
export const idParamSchema = z.object({
  id: z.string().uuid().optional() // or .uuid() if you use uuid params
});

// types for TS convenience
export type SignUpInput = z.infer<typeof signUpSchema>;
