import express from 'express';
import { sendPrivateResponse } from '../controllers/responses.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireOnboarding } from '../middleware/onboarding.middleware.js';

const router = express.Router();

router.post(
  '/responses/private',
  requireAuth,
  requireOnboarding,
  sendPrivateResponse
);

export default router;
