'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

const apiRoutes = require('./routes/api.js');

const app = express();

/* ----------------------------------------------------------------------
   SEGURIDAD (Test #2): CSP EXACTA y headers básicos
   ---------------------------------------------------------------------- */
// Helmet “base”
app.use(helmet());

// CSP EXACTA que valida freeCodeCamp (#2): solo 'self' en scripts y estilos
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  })
);

// Headers útiles (no rompen tests)
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'sameorigin' })); // SAMEORIGIN está OK para FCC
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

// Evitar cache (para que la CSP siempre viaje)
app.disable('etag');
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------------------------------------------------------
   Mongo opcional (usa fallback en memoria si no hay URI)
   ---------------------------------------------------------------------- */
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('[BOOT] Mongo connected'))
    .catch(err => console.error('[BOOT] Mongo error:', err.message));
} else {
  console.log('[BOOT] Mongo disabled (using in-memory likes)');
}

/* ----------------- Utilitarios para diagnóstico ----------------- */
app.get('/_api/ping', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Opcional: ver versiones instaladas en producción (útil para Render)
app.get('/_api/versions', (_req, res) => {
  try {
    const chaiV = require('chai/package.json').version;
    const chaiHttpV = require('chai-http/package.json').version;
    const mochaV = require('mocha/package.json').version;
    const expressV = require('express/package.json').version;
    const helmetV = require('helmet/package.json').version;
    res.json({ chai: chaiV, chai_http: chaiHttpV, mocha: mochaV, express: expressV, helmet: helmetV });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/* ----------------- Runner Mocha bajo demanda (Test #7) -----------------
   Devuelve JSON con los resultados reales de tests al abrir /_api/get-tests
----------------------------------------------------------------- */
let testsRunning = false;

app.get('/_api/get-tests', async (_req, res) => {
  try {
    if (testsRunning) return res.json({ status: 'running' });

    const testsFile = path.join(__dirname, 'tests', '2_functional-tests.js');
    if (!fs.existsSync(testsFile)) {
      return res.status(500).json({ status: 'error', error: 'Tests file not found' });
    }

    testsRunning = true;
    const Mocha = require('mocha');
    const mocha = new Mocha({ timeout: 20000, color: false });

    delete require.cache[require.resolve(testsFile)];
    mocha.addFile(testsFile);

    const results = [];
    const runner = mocha.run(() => {
      testsRunning = false;
    });

    runner.on('pass', test => {
      results.push({
        title: test.title,
        fullTitle: test.fullTitle(),
        state: 'passed',
        duration: test.duration
      });
    });

    runner.on('fail', (test, err) => {
      results.push({
        title: test.title,
        fullTitle: test.fullTitle(),
        state: 'failed',
        err: (err && (err.message || String(err))) || 'Unknown error'
      });
    });

    runner.on('end', () => {
      res.json({
        status: 'finished',
        stats: {
          tests: runner.stats.tests,
          passes: runner.stats.passes,
          failures: runner.stats.failures,
          duration: runner.stats.duration
        },
        tests: results
      });
    });
  } catch (e) {
    testsRunning = false;
    console.error('[get-tests] error:', e);
    res.status(500).json({ status: 'error', error: e.message || String(e) });
  }
});

/* ----------------- Página y API ----------------- */
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use('/api', apiRoutes);

// Estáticos mínimos (si tu index los requiere)
app.get('/style.css', (_req, res) => {
  res.type('text/css').send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});
app.get('/client.js', (_req, res) => {
  res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

/* 404 Not Found (FCC lo espera) */
app.use(function (_req, res, _next) {
  res.status(404).type('text').send('Not Found');
});

/* Listener */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[BOOT] Server running on http://localhost:${PORT}`);
});

module.exports = app;
