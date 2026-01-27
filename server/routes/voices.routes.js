import express from 'express';
import { createVoice } from '../controllers/voices.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireOnboarding } from '../middleware/onboarding.middleware.js';

const router = express.Router();

router.post('/', requireAuth, requireOnboarding, createVoice);

export default router;
