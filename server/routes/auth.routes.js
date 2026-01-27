import express from 'express';
import { requestLink, verifyLink } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/request-link', requestLink);
router.post('/verify', verifyLink);

export default router;
