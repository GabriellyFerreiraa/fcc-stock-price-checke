import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const PROXY_URL = process.env.PROXY_URL || 'https://stock-price-checker-proxy.freecodecamp.rocks';
const IP_SALT = process.env.IP_SALT || 'salt';

// --- Mongoose Model ---
const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, index: true },
    likes: { type: Number, default: 0 },
    ipHashes: { type: [String], default: [] } // IPs anonimizadas/hasheadas
  },
  { timestamps: true }
);

const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);

// --- Helpers ---
function normalizeSymbol(s) {
  return String(s || '').trim().toUpperCase();
}

function anonymizeIp(ipRaw) {
  // Truncado + hash -> cumple con “anonymize before saving”
  // Ej.: ::ffff:192.168.1.55 => 192.168.1.0
  //     2001:0db8:85a3::8a2e:0370:7334 => 2001:0db8:85a3:: (truncado grosero)
  const ip = String(ipRaw || '');
  let truncated = ip;

  // IPv4
  const m4 = ip.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (m4) {
    truncated = `${m4[1]}.${m4[2]}.${m4[3]}.0`;
  } else {
    // IPv6 (muy básico)
    const idx = ip.indexOf(':');
    truncated = idx > 0 ? ip.slice(0, idx + 1) : ip;
  }

  return crypto.createHash('sha256').update(IP_SALT + truncated).digest('hex');
}

async function fetchQuote(symbol) {
  const url = `${PROXY_URL}/v1/stock/${encodeURIComponent(symbol)}/quote`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  const data = await res.json();

  // Esperamos propiedades { symbol, latestPrice }
  if (!data || !data.symbol || typeof data.latestPrice !== 'number') {
    throw new Error('Malformed proxy response');
  }

  return { symbol: data.symbol.toUpperCase(), price: data.latestPrice };
}

async function likeIfNeeded(symbol, ipHash, likeFlag) {
  if (!mongoose.connection.readyState) return { symbol, likes: 0 };

  const doc = await Stock.findOne({ symbol });
  if (!doc) {
    // crear registro
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

// --- GET /api/stock-prices ---
router.get('/stock-prices', async (req, res) => {
  try {
    const { stock } = req.query;
    const likeParam = req.query.like;
    const like = likeParam === true || likeParam === 'true' || likeParam === 1 || likeParam === '1';
    const ipHash = anonymizeIp(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress);

    if (!stock) {
      return res.status(400).json({ error: 'stock query param is required' });
    }

    if (Array.isArray(stock)) {
      // two stocks
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
      // single stock
      const s = normalizeSymbol(stock);
      const q = await fetchQuote(s);
      const l = await likeIfNeeded(q.symbol, ipHash, like);

      const stockData = { stock: q.symbol, price: q.price, likes: l.likes || 0 };
      return res.json({ stockData });
    }
  } catch (err) {
    // Para no filtrar detalles internos:
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
});

export default router;
