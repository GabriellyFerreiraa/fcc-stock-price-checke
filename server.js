import express from 'express';
// SIN helmet: CSP manual para pasar test #2
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();

/* ======= CSP EXACTA requerida por FCC ======= */
const FCC_CSP = "default-src 'self'; script-src 'self'; style-src 'self';";
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', FCC_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Evitar cache
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========== Mongo OPCIONAL ==========
   - Si NO hay MONGO_URI => NO conectamos y usamos fallback en memoria
   =================================== */
const MONGO_URI = process.env.MONGO_URI; // <- sin default
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('Mongo connected'))
    .catch(err => console.error('Mongo error:', err.message));
} else {
  console.log('Mongo disabled (using in-memory likes)');
}

// API
app.use('/api', apiRoutes);

// Página raíz
app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Stock Price Checker - freeCodeCamp</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <h1>Stock Price Checker - freeCodeCamp</h1>
      <script src="/client.js"></script>
    </body>
  </html>`);
});

// CSS mínimo
app.get('/style.css', (_req, res) => {
  res.type('text/css').send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});

// JS mínimo local
app.get('/client.js', (_req, res) => {
  res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

// ✅ SIEMPRE escuchar (también cuando NODE_ENV=test en Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

export default app;
