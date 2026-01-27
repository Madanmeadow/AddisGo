import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import voicesRoutes from './routes/voices.routes.js';

app.use('/api/v1/voices', voicesRoutes);

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);

export default app;
