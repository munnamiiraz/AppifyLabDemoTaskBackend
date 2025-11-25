import { Router } from 'express';
import {  getUser } from '../controllers/user.controller';
import {  signUp, signIn } from '../controllers/auth.controller';
import {protect} from '../middleware/auth.middleware';

const router = Router();

router.post("/sign-up", signUp)
router.post("/sign-in", signIn)

export default router;