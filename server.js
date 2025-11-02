'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet'); // <-- Importação do Helmet

const apiRoutes = require('./routes/api.js');

const app = express();

// ----------------------------------------------------------------------
// CONFIGURAÇÕES DE SEGURANÇA COM HELMET (Solução para o Teste 2)
// ----------------------------------------------------------------------

// 1. Oculta o cabeçalho X-Powered-By e aplica proteções padrão
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());      // X-Content-Type-Options: nosniff
app.use(helmet.xssFilter());    // X-XSS-Protection: 1; mode=block
app.use(helmet.referrerPolicy({ policy: "no-referrer" })); // Referrer-Policy: no-referrer

// 2. Proteção contra Clickjacking
// O FCC costuma esperar a proteção mais estrita, que é 'DENY'
app.use(helmet.frameguard({ action: 'deny' })); // X-Frame-Options: DENY

// 3. Content Security Policy (CSP)
// Restringe scripts e estilos a serem carregados apenas do seu próprio domínio ('self')
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // Permite scripts apenas de 'self'
        styleSrc: ["'self'"]   // Permite CSS apenas de 'self'
    }
}));

// ----------------------------------------------------------------------
// FIM DAS CONFIGURAÇÕES DE SEGURANÇA
// ----------------------------------------------------------------------

// A remoção de Header manual e a constante FCC_CSP não são mais necessárias
// e foram substituídas pelo Helmet acima.

// Evitar cache (manter, é bom para desenvolvimento)
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

/* ----------------- Endpoints utilitarios ----------------- */
app.get('/_api/ping', (_req, res) => {
    console.log('[PATCH] /_api/ping');
    res.json({ ok: true, ts: Date.now() });
});

/* ----------------- Ejecutar Mocha bajo demanda -----------------
   - Devuelve resultados de cada test (estado, mensaje, duración)
   - Evita ejecuciones concurrentes
----------------------------------------------------------------- */
let testsRunning = false;

app.get('/_api/get-tests', async (_req, res) => {
    try {
        if (testsRunning) {
            return res.json({ status: 'running' });
        }
        // Aseguramos que el archivo existe
        const testsFile = path.join(__dirname, 'tests', '2_functional-tests.js');
        if (!fs.existsSync(testsFile)) {
            return res.status(500).json({ status: 'error', error: 'Tests file not found' });
        }

        testsRunning = true;

        const Mocha = require('mocha');
        const mocha = new Mocha({
            timeout: 20000,      // da tiempo de sobra para las peticiones al proxy
            color: false
        });

        // IMPORTANTE: limpiar caché para recargar el archivo de tests si Render reusa proceso
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
        console.error('[PATCH] get-tests error:', e);
        res.status(500).json({ status: 'error', error: e.message || String(e) });
    }
});

/* ----------------- Página e API del proyecto ----------------- */
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.use('/api', apiRoutes);

// Estáticos mínimos (opcional)
app.get('/style.css', (_req, res) => {
    res.type('text/css').send('/* ok */ body{font-family:system-ui,Segoe UI,Arial,sans-serif;}');
});
app.get('/client.js', (_req, res) => {
    res.type('application/javascript').send('/* ok */ console.log("client.js loaded from self");');
});

// 404 Not Found Middleware (importante para o FCC)
app.use(function(req, res, next) {
    res.status(404)
        .type('text')
        .send('Not Found');
});


// Listener
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[BOOT] Server running on http://localhost:${PORT}`);
});

module.exports = app;