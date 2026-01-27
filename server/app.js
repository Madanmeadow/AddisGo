import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import voicesRoutes from './routes/voices.routes.js';
import usersRoutes from './routes/users.routes.js';
import responsesRoutes from './routes/responses.routes.js';
import acknowledgementsRoutes from './routes/acknowledgements.routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/voices', voicesRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1', responsesRoutes);
app.use('/api/v1', acknowledgementsRoutes);

export default app;
