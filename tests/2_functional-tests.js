const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server.js');

const { assert } = chai;
chai.use(chaiHttp);

// Símbolos para probar
const S1 = 'GOOG';
const S2 = 'MSFT';

describe('Functional Tests - /api/stock-prices', function () {
  this.timeout(15000);

  // 1) Ver un stock
  it('Viewing one stock: GET /api/stock-prices?stock=GOOG', async () => {
    const res = await chai.request(app).get('/api/stock-prices').query({ stock: S1 });
    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isObject(res.body.stockData);
    assert.property(res.body.stockData, 'stock');
    assert.property(res.body.stockData, 'price');
    assert.property(res.body.stockData, 'likes');
    assert.isString(res.body.stockData.stock);
    assert.isNumber(res.body.stockData.price);
    assert.isNumber(res.body.stockData.likes);
  });

  // 2) Ver y dar like a un stock
  it('Viewing one stock and liking it: GET /api/stock-prices?stock=GOOG&like=true', async () => {
    const res = await chai.request(app).get('/api/stock-prices').query({ stock: S1, like: true });
    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isObject(res.body.stockData);
    assert.equal(res.body.stockData.stock, S1);
    assert.isNumber(res.body.stockData.price);
    assert.isAtLeast(res.body.stockData.likes, 1);
  });

  // 3) Repetir like desde la misma IP (no debe subir)
  it('Viewing same stock and liking it again: GET /api/stock-prices?stock=GOOG&like=true', async () => {
    const first = await chai.request(app).get('/api/stock-prices').query({ stock: S1, like: true });
    const prev = first.body.stockData.likes;

    const second = await chai.request(app).get('/api/stock-prices').query({ stock: S1, like: true });
    const again = second.body.stockData.likes;

    assert.equal(second.status, 200);
    assert.equal(first.body.stockData.stock, S1);
    assert.equal(second.body.stockData.stock, S1);
    assert.equal(again, prev, 'likes should not increase from same IP');
  });

  // 4) Ver dos stocks
  it('Viewing two stocks: GET /api/stock-prices?stock=GOOG&stock=MSFT', async () => {
    const res = await chai
      .request(app)
      .get('/api/stock-prices')
      .query({ stock: [S1, S2] });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);

    const [a, b] = res.body.stockData;
    [a, b].forEach(o => {
      assert.isString(o.stock);
      assert.isNumber(o.price);
      assert.property(o, 'rel_likes');
      assert.isNumber(o.rel_likes);
    });

    assert.equal(a.rel_likes, -b.rel_likes);
  });

  // 5) Ver dos stocks y darles like
  it('Viewing two stocks and liking them: GET /api/stock-prices?stock=GOOG&stock=MSFT&like=true', async () => {
    const res = await chai
      .request(app)
      .get('/api/stock-prices')
      .query({ stock: [S1, S2], like: true });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);

    const [a, b] = res.body.stockData;
    [a, b].forEach(o => {
      assert.isString(o.stock);
      assert.isNumber(o.price);
      assert.property(o, 'rel_likes');
    });

    assert.equal(a.rel_likes, -b.rel_likes);
  });
});
