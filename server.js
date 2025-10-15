import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import apiRouter from './routes/api.js';

dotenv.config();

const app = express();

/**
 * ✅ Content Security Policy:
 *  - SOLO permite scripts y CSS desde TU servidor ('self')
 *  - Bloquea iframes y objetos
 *  - Permite imágenes locales y data: (por si pones un favicon inline)
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "font-src": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"]
      }
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false
  })
);

// CORS opcional (tu API igual funciona sin exponer nada externo)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a Mongo (Atlas o local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fcc-stock';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Mongo connected'))
  .catch((err) => console.error('Mongo error:', err.message));

// Rutas
app.use('/api', apiRouter);

// Raíz: cualquier respuesta sirve; lo importante es que incluya el header CSP
app.get('/', (_req, res) => {
  res.type('text').send('Stock Price Checker – freeCodeCamp');
});

// Arranque
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
