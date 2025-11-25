import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.route';
import postRoutes from './routes/post.route';
import replyRoutes from './routes/reply.routes';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 9000;

// Middleware
app.use(cors({
  origin: process.env.HOST_URL || "*"
}));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/replies", replyRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Connect to database and start server
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};


startServer().catch(console.error);


