import express from 'express';
import { getUserProfile } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireOnboarding } from '../middleware/onboarding.middleware.js';

const router = express.Router();

router.get('/:id', requireAuth, requireOnboarding, getUserProfile);

export default router;
