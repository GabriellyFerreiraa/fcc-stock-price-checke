import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();

/* ✅ CSP estricto: solo scripts y estilos desde 'self' */
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

/* ✅ Evitar 304 y asegurar que CSP siempre viaje */
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store'); // también evita caches intermedios
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongo
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fcc-stock';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo error:', err.message));

// Rutas
app.use('/api', apiRouter);

// Raíz: sirve para que FCC lea los headers CSP en una 200
app.get('/', (_req, res) => {
  res.type('text').send('Stock Price Checker – freeCodeCamp');
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
