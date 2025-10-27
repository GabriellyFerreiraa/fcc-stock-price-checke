import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const PROXY_URL = (process.env.PROXY_URL || 'https://stock-price-checker-proxy.freecodecamp.rocks').trim();
const IP_SALT = process.env.IP_SALT || 'salt';

/* --- Mongoose Model --- */
const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, index: true },
    likes: { type: Number, default: 0 },
    ipHashes: { type: [String], default: [] } // IPs anonimizadas/hasheadas
  },
  { timestamps: true }
);

const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);

/* ✅ Fallback en memoria si no hay conexión a Mongo */
const memoryStore = new Map(); // symbol -> { likes: number, ipHashes: Set<string> }

/* --- Helpers --- */
function normalizeSymbol(s) {
  return String(s || '').trim().toUpperCase();
}

function anonymizeIp(ipRaw) {
  const ip = String(ipRaw || '');
  let truncated = ip;

  const m4 = ip.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (m4) {
    truncated = `${m4[1]}.${m4[2]}.${m4[3]}.0`;
  } else {
    const idx = ip.indexOf(':');
    truncated = idx > 0 ? ip.slice(0, idx + 1) : ip;
  }

  return crypto.createHash('sha256').update(IP_SALT + truncated).digest('hex');
}

/* --- Proxy fetch robusto --- */
async function fetchQuote(symbolRaw) {
  const symbol = normalizeSymbol(symbolRaw);
  const makeUrl = (path) => new URL(path, PROXY_URL).toString();

  const candidates = [
    `/v1/stock/${encodeURIComponent(symbol)}/quote`,
    `/v1/stock/${encodeURIComponent(symbol)}/quote/`
  ];

  let lastErr = null;
  for (const path of candidates) {
    try {
      const url = makeUrl(path);
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Proxy ${res.status} on ${url} :: ${txt.slice(0, 200)}`);
      }
      const data = await res.json();

      if (!data || !data.symbol || typeof data.latestPrice !== 'number') {
        throw new Error(`Malformed proxy response: ${JSON.stringify(data).slice(0, 200)}`);
      }

      return { symbol: data.symbol.toUpperCase(), price: data.latestPrice };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Proxy unreachable');
}

/* --- Likes con fallback a memoria --- */
async function likeIfNeeded(symbol, ipHash, likeFlag) {
  if (!mongoose.connection.readyState) {
    let entry = memoryStore.get(symbol);
    if (!entry) {
      entry = { likes: 0, ipHashes: new Set() };
      memoryStore.set(symbol, entry);
    }
    if (likeFlag && !entry.ipHashes.has(ipHash)) {
      entry.likes += 1;
      entry.ipHashes.add(ipHash);
    }
    return { symbol, likes: entry.likes };
  }

  const doc = await Stock.findOne({ symbol });
  if (!doc) {
    const initial = likeFlag ? 1 : 0;
    const ips = likeFlag ? [ipHash] : [];
    const created = await Stock.create({ symbol, likes: initial, ipHashes: ips });
    return { symbol, likes: created.likes };
  }

  if (likeFlag && !doc.ipHashes.includes(ipHash)) {
    doc.likes += 1;
    doc.ipHashes.push(ipHash);
    await doc.save();
  }
  return { symbol, likes: doc.likes };
}

/* --- GET /api/stock-prices --- */
router.get('/stock-prices', async (req, res) => {
  try {
    const { stock } = req.query;
    const likeParam = req.query.like;
    const like = likeParam === true || likeParam === 'true' || likeParam === 1 || likeParam === '1';
    const ipHash = anonymizeIp(
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress
    );

    if (!stock) {
      return res.status(400).json({ error: 'stock query param is required' });
    }

    if (Array.isArray(stock)) {
      const s1 = normalizeSymbol(stock[0]);
      const s2 = normalizeSymbol(stock[1]);
      const [q1, q2] = await Promise.all([fetchQuote(s1), fetchQuote(s2)]);

      const [l1, l2] = await Promise.all([
        likeIfNeeded(q1.symbol, ipHash, like),
        likeIfNeeded(q2.symbol, ipHash, like)
      ]);

      const rel = (a, b) => (a.likes || 0) - (b.likes || 0);

      const stockData = [
        { stock: q1.symbol, price: q1.price, rel_likes: rel(l1, l2) },
        { stock: q2.symbol, price: q2.price, rel_likes: rel(l2, l1) }
      ];

      return res.json({ stockData });
    } else {
      const s = normalizeSymbol(stock);
      const q = await fetchQuote(s);
      const l = await likeIfNeeded(q.symbol, ipHash, like);

      const stockData = { stock: q.symbol, price: q.price, likes: l.likes || 0 };
      return res.json({ stockData });
    }
  } catch (err) {
    console.error('[stock-prices]', err?.message || err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
});

export default router;
