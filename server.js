import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';   // ⬅️ para cargar CJS

// Rutas propias (ESM)
import apiRoutes from './routes/api.js';

dotenv.config();

const require = createRequire(import.meta.url); // ⬅️ require en ESM
// Estos dos son del boilerplate y suelen ser CommonJS:
const fccTestingRoutes = require('./routes/fcctesting.js'); // module.exports = (app)=>{...}
const runner = require('./test-runner.js');                 // exports.run = ()=>{...}

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongo OPCIONAL (si no hay URI, likes usan fallback en memoria dentro de routes/api.js)
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Mongo connected'))
    .catch(err => console.error('Mongo error:', err.message));
} else {
  console.log('Mongo disabled (using in-memory likes)');
}

// Rutas especiales del runner FCC
fccTestingRoutes(app);

// Página raíz del boilerplate
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API del proyecto
app.use('/api', apiRoutes);

// CSS/JS mínimos (cargados desde 'self' para confirmar CSP)
app.get('/style.css', (_req, res) => {
  res.type('text/css').send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});
app.get('/client.js', (_req, res) => {
  res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

// Listener (también en NODE_ENV=test para Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(() => {
      try { runner.run(); }
      catch (e) { console.log('Tests are not valid:'); console.error(e); }
    }, 1500);
  }
});

export default app;
