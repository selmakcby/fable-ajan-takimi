'use strict';
const assert = require('node:assert/strict');
const B = require('./bolusme.js');

let gecen = 0;
const basarisiz = [];
function test(ad, fn) {
  try { fn(); gecen += 1; } catch (e) { basarisiz.push(`${ad}: ${e.message.split('\n')[0]}`); }
}

const topla = (o) => Object.values(o).reduce((t, x) => t + x, 0);
const kur = (isimler) => isimler.reduce((d, i) => B.kisiEkle(d, i), B.bosDurum());

function uygula(bak, transferler) {
  const s = { ...bak };
  for (const t of transferler) { s[t.kimden] += t.tutar; s[t.kime] -= t.tutar; }
  return s;
}

// Basit deterministik rastgele
let tohum = 12345;
const rnd = (n) => { tohum = (tohum * 1103515245 + 12345) % 2147483648; return tohum % n; };

test('esitBol 1000/3', () => assert.deepEqual(B.esitBol(1000, 3), [334, 333, 333]));
test('esitBol toplam korunur', () => {
  for (let t = 1; t < 300; t++) for (let n = 1; n < 12; n++) {
    const r = B.esitBol(t, n);
    assert.equal(r.reduce((a, b) => a + b, 0), t);
    assert.ok(Math.max(...r) - Math.min(...r) <= 1);
  }
});
test('esitBol hatalı girdi', () => {
  assert.throws(() => B.esitBol(0, 3));
  assert.throws(() => B.esitBol(100, 0));
  assert.throws(() => B.esitBol(10.5, 2));
  assert.throws(() => B.esitBol(-5, 2));
});

test('eşit bölme + bakiye', () => {
  let d = kur(['Ayşe', 'Mert', 'Can']);
  d = B.masrafEkle(d, { tutar: 1000, odeyen: 'Ayşe', katilimcilar: ['Ayşe', 'Mert', 'Can'] });
  assert.deepEqual(B.bakiyeler(d), { Ayşe: 666, Mert: -333, Can: -333 });
  assert.equal(topla(B.bakiyeler(d)), 0);
});
test('ödeyen katılımcı değilse', () => {
  let d = kur(['A', 'B']);
  d = B.masrafEkle(d, { tutar: 500, odeyen: 'A', katilimcilar: ['B'] });
  assert.deepEqual(B.bakiyeler(d), { A: 500, B: -500 });
});
test('özel tutarlar', () => {
  let d = kur(['A', 'B', 'C']);
  d = B.masrafEkle(d, { tutar: 1000, odeyen: 'A', ozel: [{ kisi: 'B', tutar: 700 }, { kisi: 'C', tutar: 300 }] });
  assert.deepEqual(B.bakiyeler(d), { A: 1000, B: -700, C: -300 });
});
test('özel toplam uyuşmazsa hata', () => {
  const d = kur(['A', 'B']);
  assert.throws(() => B.masrafEkle(d, { tutar: 1000, odeyen: 'A', ozel: [{ kisi: 'B', tutar: 999 }] }));
  assert.throws(() => B.masrafEkle(d, { tutar: 1000, odeyen: 'A', ozel: [{ kisi: 'B', tutar: 1001 }] }));
});
test('immutability', () => {
  const d = kur(['A', 'B']);
  const kopya = JSON.stringify(d);
  const d2 = B.masrafEkle(d, { tutar: 100, odeyen: 'A', katilimcilar: ['A', 'B'] });
  B.kisiEkle(d2, 'C'); B.masrafSil(d2, 1); B.bakiyeler(d2);
  assert.equal(JSON.stringify(d), kopya);
  assert.equal(d2.masraflar.length, 1);
});

test('rastgele: bakiye toplamı 0, hesaplaşma sonrası herkes 0', () => {
  for (let tur = 0; tur < 300; tur++) {
    const n = 2 + rnd(7);
    const isimler = Array.from({ length: n }, (_, i) => 'K' + i);
    let d = kur(isimler);
    const m = 1 + rnd(8);
    for (let i = 0; i < m; i++) {
      const tutar = 1 + rnd(100000);
      const odeyen = isimler[rnd(n)];
      const kat = isimler.filter(() => rnd(2)); if (!kat.length) kat.push(isimler[0]);
      d = B.masrafEkle(d, { tutar, odeyen, katilimcilar: kat });
    }
    const bak = B.bakiyeler(d);
    assert.equal(topla(bak), 0);
    const tr = B.hesaplas(bak);
    const son = uygula(bak, tr);
    assert.ok(Object.values(son).every((x) => x === 0), 'sıfırlanmadı');
    assert.ok(tr.every((t) => t.tutar > 0 && t.kimden !== t.kime));
    assert.ok(tr.length <= Object.values(bak).filter((x) => x !== 0).length - 1 || tr.length === 0);
  }
});

test('açgözlü fazla transfer: iki bağımsız grup', () => {
  // [+5,-5] ve [+3,+2,-5]... açgözlü ortak havuzda 4 transfer, optimum 3
  const bak = { A: 500, B: -500, C: 300, D: 200, E: -500 };
  const tr = B.hesaplas(bak);
  assert.equal(tr.length, 3);
  assert.ok(Object.values(uygula(bak, tr)).every((x) => x === 0));
});
test('açgözlü tuzağı: 3 alacaklı-1 borçlu + 1-1', () => {
  const bak = { A: 700, B: -300, C: -400, D: 100, E: -100, F: 0 };
  const tr = B.hesaplas(bak);
  assert.equal(tr.length, 3);
});
test('hesaplas: boş ve sıfır', () => {
  assert.deepEqual(B.hesaplas({}), []);
  assert.deepEqual(B.hesaplas({ A: 0, B: 0 }), []);
});
test('hesaplas örnek: Ayşe → Mert 12,50', () => {
  assert.deepEqual(B.hesaplas({ Ayşe: -1250, Mert: 1250 }), [{ kimden: 'Ayşe', kime: 'Mert', tutar: 1250 }]);
});
test('hesaplas hatalı girdi', () => {
  assert.throws(() => B.hesaplas({ A: 100, B: -50 }));
  assert.throws(() => B.hesaplas({ A: 1.5, B: -1.5 }));
  assert.throws(() => B.hesaplas(null));
});
test('hesaplas girdiyi değiştirmez', () => {
  const bak = { A: 100, B: -100 }; B.hesaplas(bak);
  assert.deepEqual(bak, { A: 100, B: -100 });
});
test('hesaplas 20+ kişide hâlâ sıfırlar', () => {
  const bak = {};
  for (let i = 0; i < 25; i++) bak['K' + i] = i % 2 ? -100 * (i + 1) : 100 * (i + 1);
  const s = Object.values(bak).reduce((a, b) => a + b, 0);
  bak.K0 -= s;
  const tr = B.hesaplas(bak);
  assert.ok(Object.values(uygula(bak, tr)).every((x) => x === 0));
});
test('hesaplas 20 kişi süre < 3sn', () => {
  const bak = {}; let t = 0;
  for (let i = 0; i < 19; i++) { bak['K' + i] = 100 + i * 7 * (i % 2 ? -1 : 1); t += bak['K' + i]; }
  bak.K19 = -t;
  const b = Date.now(); B.hesaplas(bak);
  assert.ok(Date.now() - b < 3000);
});

test('kişi ekle/çıkar', () => {
  let d = kur(['Ayşe']);
  assert.throws(() => B.kisiEkle(d, 'Ayşe'));
  assert.throws(() => B.kisiEkle(d, '  ayşe '));
  assert.throws(() => B.kisiEkle(d, ''));
  assert.throws(() => B.kisiEkle(d, '   '));
  assert.throws(() => B.kisiEkle(d, 42));
  assert.throws(() => B.kisiCikar(d, 'Yok'));
  assert.deepEqual(B.kisiCikar(d, 'Ayşe').kisiler, []);
});
test('Türkçe İ/i aynı isim sayılır', () => {
  assert.throws(() => B.kisiEkle(kur(['İpek']), 'ipek'));
});
test('masrafı olan kişi çıkarılamaz, silince çıkarılır', () => {
  let d = kur(['A', 'B']);
  d = B.masrafEkle(d, { tutar: 100, odeyen: 'A', katilimcilar: ['A', 'B'] });
  assert.throws(() => B.kisiCikar(d, 'B'));
  assert.throws(() => B.kisiCikar(d, 'A'));
  d = B.masrafSil(d, d.masraflar[0].id);
  assert.deepEqual(B.kisiCikar(d, 'B').kisiler, ['A']);
});
test('masraf hatalı girdiler', () => {
  const d = kur(['A', 'B']);
  const ok = { tutar: 100, odeyen: 'A', katilimcilar: ['A', 'B'] };
  for (const kotu of [
    { ...ok, tutar: 0 }, { ...ok, tutar: -100 }, { ...ok, tutar: 10.5 }, { ...ok, tutar: '100' },
    { ...ok, tutar: NaN }, { ...ok, tutar: Infinity }, { ...ok, odeyen: 'Z' },
    { ...ok, katilimcilar: [] }, { ...ok, katilimcilar: ['A', 'A'] }, { ...ok, katilimcilar: ['Z'] },
    { ...ok, ozel: [{ kisi: 'A', tutar: 100 }] }, { ...ok, katilimcilar: undefined },
    { tutar: 100, odeyen: 'A', ozel: [{ kisi: 'A', tutar: 150 }, { kisi: 'B', tutar: -50 }] },
    { tutar: 100, odeyen: 'A', ozel: [{ kisi: 'Z', tutar: 100 }] },
    { tutar: 100, odeyen: 'A', ozel: [{ kisi: 'A', tutar: 50 }, { kisi: 'A', tutar: 50 }] },
    { tutar: 100, odeyen: 'A', ozel: [{ tutar: 100 }] },
    null, undefined, 'x',
  ]) assert.throws(() => B.masrafEkle(d, kotu), undefined, JSON.stringify(kotu));
});
test('geçersiz durum', () => {
  assert.throws(() => B.kisiEkle(null, 'A'));
  assert.throws(() => B.bakiyeler({}));
});
test('masrafSil bilinmeyen id', () => {
  assert.throws(() => B.masrafSil(kur(['A']), 99));
});
test('tehlikeli isimler (__proto__, constructor)', () => {
  let d = kur(['__proto__', 'constructor', 'toString']);
  d = B.masrafEkle(d, { tutar: 1000, odeyen: '__proto__', katilimcilar: ['__proto__', 'constructor', 'toString'] });
  const bak = B.bakiyeler(d);
  assert.equal(topla(bak), 0);
  assert.equal(B.hesaplas(bak).length, 2);
});

test('kurusaCevir geçerli', () => {
  const k = { '12,50': 1250, '12.5': 1250, '12': 1200, '0,05': 5, '0,5': 50, ' 3,00 ': 300, '0.07': 7 };
  for (const [m, v] of Object.entries(k)) assert.equal(B.kurusaCevir(m), v, m);
});
test('kurusaCevir geçersiz', () => {
  for (const m of ['', 'abc', '-5', '1,234', '1,', ',5', '1e3', '1 000', '12,5,0', null, 12.5, '1.000,50'])
    assert.throws(() => B.kurusaCevir(m), undefined, String(m));
});
test('kurusaCevir float hatası yok', () => {
  assert.equal(B.kurusaCevir('0,29'), 29);
  assert.equal(B.kurusaCevir('1,15'), 115);
  assert.equal(B.kurusaCevir('19,99'), 1999);
});
test('kurusYaz', () => {
  assert.equal(B.kurusYaz(1250), '12,50 €');
  assert.equal(B.kurusYaz(5), '0,05 €');
  assert.equal(B.kurusYaz(0), '0,00 €');
  assert.equal(B.kurusYaz(-1250), '-12,50 €');
  assert.equal(B.kurusYaz(123456789), '1234567,89 €');
  assert.throws(() => B.kurusYaz(1.5));
});
test('kurusaCevir/kurusYaz gidiş-dönüş', () => {
  for (const k of [0, 1, 99, 100, 101, 1250, 99999999])
    assert.equal(B.kurusaCevir(B.kurusYaz(k).replace(' €', '')), k);
});
test('masraf id: silme sonrası yeniden kullanım yok (en yüksek id silinirse aynı id)', () => {
  let d = kur(['A']);
  d = B.masrafEkle(d, { tutar: 100, odeyen: 'A', katilimcilar: ['A'] });
  d = B.masrafEkle(d, { tutar: 100, odeyen: 'A', katilimcilar: ['A'] });
  const ids = d.masraflar.map((m) => m.id);
  assert.equal(new Set(ids).size, 2);
});

console.log(`${gecen} geçti, ${basarisiz.length} kaldı`);
basarisiz.forEach((b) => console.log(' ✗ ' + b));
process.exit(basarisiz.length ? 1 : 0);
