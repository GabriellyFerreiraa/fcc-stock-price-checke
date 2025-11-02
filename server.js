'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js'); // ← Rutas oficiales FCC
// const runner = require('./test-runner'); // (no lo usamos directo; lo invoca fcctesting)

const app = express();

/* ===================== Seguridad (CSP “solo self”) ===================== */
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
app.use(helmet.frameguard({ action: 'deny' }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  })
);
/* ====================================================================== */

app.disable('etag');
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================== Mongo (opcional) ===================== */
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('[BOOT] Mongo connected'))
    .catch((err) => console.error('[BOOT] Mongo error:', err.message));
} else {
  console.log('[BOOT] Mongo disabled (using in-memory likes)');
}
/* ============================================================ */

/* ===================== Página ===================== */
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

/* ========== Rutas oficiales de testing de freeCodeCamp ========== */
/* ¡NO editar los archivos de FCC! Solo montarlos acá. */
fccTestingRoutes(app);
/* ================================================================ */

/* ===================== API del proyecto ===================== */
app.use('/api', apiRoutes);

/* ===================== Estáticos mínimos (opcionales) ===================== */
app.get('/style.css', (_req, res) => {
  res
    .type('text/css')
    .send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});
app.get('/client.js', (_req, res) => {
  res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

/* ===================== 404 ===================== */
app.use(function (req, res) {
  res.status(404).type('text').send('Not Found');
});

/* ===================== Listener ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[BOOT] Server running on http://localhost:${PORT}`);
});

module.exports = app;
