// server.js  (CommonJS)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js'); // boilerplate FCC
const runner = require('./test-runner.js');

dotenv.config();

const app = express();

/* ======= CSP EXACTA requerida por freeCodeCamp ======= */
const FCC_CSP = "default-src 'self'; script-src 'self'; style-src 'self';";
app.use((req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Security-Policy', FCC_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Evitar caché (para que el validador siempre lea la CSP correcta)
app.disable('etag');
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mongo opcional
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('[BOOT] Mongo connected'))
    .catch(err => console.error('[BOOT] Mongo error:', err.message));
} else {
  console.log('[BOOT] Mongo disabled (using in-memory likes)');
}

/* ------------------------------------------------------------------
   1) Montamos el boilerplate de FCC (NO editamos ese archivo)
   ------------------------------------------------------------------ */
fccTestingRoutes(app);
console.log('[BOOT] Mounted FCC testing routes');

/* ------------------------------------------------------------------
   2) Añadimos endpoints “rápidos” para evitar cuelgues en Render
      (si fallan, el boilerplate ya está montado igual)
   ------------------------------------------------------------------ */
app.get('/_api/ping', (_req, res) => {
  console.log('[PATCH] /_api/ping');
  res.json({ ok: true, ts: Date.now() });
});

app.get('/_api/get-tests', (_req, res) => {
  try {
    console.log('[PATCH] /_api/get-tests');
    const filePath = path.join(__dirname, 'tests', '2_functional-tests.js');
    const src = fs.readFileSync(filePath, 'utf8');
    const tests = [];
    const re = /it\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
    let m;
    while ((m = re.exec(src)) !== null) tests.push(m[1]);
    res.json({ status: 'ok', count: tests.length, tests });
  } catch (e) {
    console.error('[PATCH] get-tests error:', e.message);
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.get('/_api/run-tests', (_req, res) => {
  try {
    console.log('[PATCH] /_api/run-tests -> starting runner');
    setTimeout(() => {
      try { runner.run(); }
      catch (e) { console.error('[PATCH] runner error:', e.message); }
    }, 250);
    res.json({ status: 'running' });
  } catch (e) {
    console.error('[PATCH] run-tests error:', e.message);
    res.status(500).json({ status: 'error', error: e.message });
  }
});

/* ----------------- Página e API del proyecto ----------------- */
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use('/api', apiRoutes); // << asegúrate que routes/api.js exporta module.exports = router

// Estáticos mínimos (opcional)
app.get('/style.css', (_req, res) => {
  res.type('text/css').send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});
app.get('/client.js', (_req, res) => {
  res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

// Listener (también en NODE_ENV=test para Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[BOOT] Server running on http://localhost:${PORT}`);

  if (process.env.NODE_ENV === 'test') {
    console.log('[BOOT] Running Tests (on boot)...');
    setTimeout(() => {
      try { runner.run(); }
      catch (e) { console.log('[BOOT] Tests are not valid:'); console.error(e); }
    }, 1500);
  }
});

module.exports = app;
