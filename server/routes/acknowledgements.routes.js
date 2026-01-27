import express from 'express';
import { acknowledgeVoice } from '../controllers/acknowledgements.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireOnboarding } from '../middleware/onboarding.middleware.js';

const router = express.Router();

router.post(
  '/voices/:id/acknowledge',
  requireAuth,
  requireOnboarding,
  acknowledgeVoice
);

export default router;
