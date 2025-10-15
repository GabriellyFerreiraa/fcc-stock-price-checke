import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import apiRouter from './routes/api.js';

dotenv.config();

const app = express();

// Seguridad: Content Security Policy SOLO permite scripts y CSS desde el propio server
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"], // las llamadas a proxy se hacen en el servidor, no desde el cliente
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"]
      }
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a Mongo
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fcc-stock';
mongoose.connect(MONGO_URI).then(
  () => console.log('Mongo connected'),
  err => console.error('Mongo error:', err)
);

// Rutas API
app.use('/api', apiRouter);

// Raíz (puedes servir una página mínima si quieres)
app.get('/', (_req, res) => {
  res.type('text').send('Stock Price Checker – freeCodeCamp');
});

// Arrancar server (en tests, mocha levanta su propio server con chai-http)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
