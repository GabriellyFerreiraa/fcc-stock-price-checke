import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();

/* ============================
   🔒 Seguridad (CSP exacta FCC)
   ============================
   - Desactivamos la CSP global de Helmet.
   - Aplicamos SOLO estas 3 directivas con 'self':
       default-src, script-src, style-src
   - No agregamos defaults para que no se cuelen otras directivas.
*/
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  })
);

// Evitar cacheos que pueden ocultar la cabecera en el runner de FCC
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongo (opcional para FCC; si no conecta, likes usan fallback en memoria)
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fcc-stock';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo error:', err.message));

// Rutas API
app.use('/api', apiRouter);

// Página raíz simple (FCC hace GET aquí)
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
    </body>
  </html>`);
});

// CSS mínimo para evitar 404
app.get('/style.css', (_req, res) => {
  res
    .type('text/css')
    .send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});

// Arranque
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
}

export default app;
