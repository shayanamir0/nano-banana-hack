// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateRoutes from './routes/generate.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // use env var instead of hardcoding localhost
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Routes
app.use('/api', generateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export the app for Vercel
export default app;

// Local dev server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
    console.log(`Frontend URL: http://localhost:3000`);
    console.log(`Make sure to set GEMINI_API_KEY in your .env file`);
  });
}