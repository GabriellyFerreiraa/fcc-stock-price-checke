// server.js (COMPLETO)
'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');

const apiRoutes = require('./routes/api.js');

// ⚠️ Endpoints de pruebas de FCC (no editar esos archivos)
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

/* Seguridad (pide FCC: solo scripts y CSS desde tu servidor) */
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
app.use(helmet.frameguard({ action: 'deny' })); // X-Frame-Options: DENY
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  })
);

// Evitar cache en respuestas (ayuda al bot de FCC)
app.disable('etag');
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Mongo opcional */
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('[BOOT] Mongo connected'))
    .catch(err => console.error('[BOOT] Mongo error:', err.message));
} else {
  console.log('[BOOT] Mongo disabled (using in-memory likes)');
}

/* Página */
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

/* ⚙️ Rutas internas de FCC para los tests */
fccTestingRoutes(app);   // <- monta /_api/app-info, /_api/get-tests, /_api/run-tests

/* API */
app.use('/api', apiRoutes);

/* 404 */
app.use(function (_req, res) {
  res.status(404).type('text').send('Not Found');
});

/* Listener */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[BOOT] Server running on http://localhost:${PORT}`);

  // Si querés que Mocha se ejecute automáticamente en NODE_ENV=test
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.log(e);
      }
    }, 3500);
  }
});

module.exports = app;
