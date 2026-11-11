/*
 * Masraf bölüşme — saf fonksiyonlar. Para her yerde tam sayı kuruş.
 * Fonksiyonlar state'i değiştirmez, yenisini döndürür. Hatalı girdide throw.
 *
 * Durum: { kisiler: string[], masraflar: Masraf[] }
 * Masraf: { id: number, aciklama: string, tutar: number, odeyen: string,
 *           paylar: { kisi: string, tutar: number }[] }
 */
(function (kok, fabrika) {
  const api = fabrika();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else kok.Bolusme = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KESIN_COZUM_SINIRI = 20; // bu sayıdan fazla sıfır olmayan bakiyede açgözlüye düşülür
  const ISIM_MAKS = 50;

  function hata(mesaj) {
    throw new Error(mesaj);
  }

  function kurusMu(x) {
    return Number.isSafeInteger(x);
  }

  function bosDurum() {
    return { kisiler: [], masraflar: [] };
  }

  function durumKontrol(durum) {
    if (!durum || !Array.isArray(durum.kisiler) || !Array.isArray(durum.masraflar)) {
      hata('Geçersiz durum');
    }
  }

  function isimTemizle(isim) {
    if (typeof isim !== 'string') hata('İsim metin olmalı');
    const temiz = isim.trim();
    if (!temiz) hata('İsim boş olamaz');
    if (temiz.length > ISIM_MAKS) hata('İsim çok uzun');
    return temiz;
  }

  function kisiVarMi(durum, isim) {
    return durum.kisiler.includes(isim);
  }

  function kisiEkle(durum, isim) {
    durumKontrol(durum);
    const temiz = isimTemizle(isim);
    const ayni = durum.kisiler.some((k) => k.toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'));
    if (ayni) hata(`"${temiz}" zaten var`);
    return { ...durum, kisiler: [...durum.kisiler, temiz] };
  }

  function kisiCikar(durum, isim) {
    durumKontrol(durum);
    if (!kisiVarMi(durum, isim)) hata(`"${isim}" bulunamadı`);
    const ilgili = durum.masraflar.some(
      (m) => m.odeyen === isim || m.paylar.some((p) => p.kisi === isim)
    );
    if (ilgili) hata(`"${isim}" masraflarda geçtiği için çıkarılamaz`);
    return { ...durum, kisiler: durum.kisiler.filter((k) => k !== isim) };
  }

  // 1000 / 3 → [334, 333, 333]: artan kuruşlar sırayla birer birer dağıtılır.
  function esitBol(tutar, adet) {
    if (!kurusMu(tutar) || tutar <= 0) hata('Tutar pozitif tam sayı kuruş olmalı');
    if (!Number.isInteger(adet) || adet <= 0) hata('En az bir kişi gerekli');
    const taban = Math.floor(tutar / adet);
    const artan = tutar - taban * adet;
    return Array.from({ length: adet }, (_, i) => taban + (i < artan ? 1 : 0));
  }

  function paylariOlustur(durum, girdi) {
    const { tutar } = girdi;
    if (girdi.ozel !== undefined) {
      if (!Array.isArray(girdi.ozel) || girdi.ozel.length === 0) hata('Özel paylar boş olamaz');
      const paylar = girdi.ozel.map((p) => {
        if (!p || !kurusMu(p.tutar) || p.tutar < 0) hata('Pay negatif olmayan tam sayı kuruş olmalı');
        return { kisi: p.kisi, tutar: p.tutar };
      });
      const toplam = paylar.reduce((t, p) => t + p.tutar, 0);
      if (toplam !== tutar) hata(`Payların toplamı (${toplam}) masraf tutarına (${tutar}) eşit değil`);
      return paylar;
    }
    const katilimcilar = girdi.katilimcilar;
    if (!Array.isArray(katilimcilar) || katilimcilar.length === 0) hata('En az bir katılımcı gerekli');
    const dilimler = esitBol(tutar, katilimcilar.length);
    return katilimcilar.map((kisi, i) => ({ kisi, tutar: dilimler[i] }));
  }

  /**
   * girdi: { aciklama?, tutar, odeyen, katilimcilar: string[] }      → eşit bölme
   *     ya { aciklama?, tutar, odeyen, ozel: {kisi, tutar}[] }         → kişiye özel
   */
  function masrafEkle(durum, girdi) {
    durumKontrol(durum);
    if (!girdi || typeof girdi !== 'object') hata('Geçersiz masraf');
    const { tutar, odeyen } = girdi;
    if (!kurusMu(tutar) || tutar <= 0) hata('Tutar pozitif tam sayı kuruş olmalı');
    if (!kisiVarMi(durum, odeyen)) hata('Ödeyen kişi bulunamadı');
    if (girdi.ozel !== undefined && girdi.katilimcilar !== undefined) {
      hata('Ya katilimcilar ya ozel verilmeli, ikisi birden değil');
    }
    const paylar = paylariOlustur(durum, girdi);
    const isimler = paylar.map((p) => p.kisi);
    if (new Set(isimler).size !== isimler.length) hata('Aynı kişi iki kez yazılmış');
    isimler.forEach((k) => {
      if (!kisiVarMi(durum, k)) hata(`"${k}" bulunamadı`);
    });
    const aciklama = typeof girdi.aciklama === 'string' ? girdi.aciklama.trim().slice(0, 100) : '';
    const id = durum.masraflar.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const masraf = { id, aciklama, tutar, odeyen, paylar };
    return { ...durum, masraflar: [...durum.masraflar, masraf] };
  }

  function masrafSil(durum, id) {
    durumKontrol(durum);
    if (!durum.masraflar.some((m) => m.id === id)) hata('Masraf bulunamadı');
    return { ...durum, masraflar: durum.masraflar.filter((m) => m.id !== id) };
  }

  /** { isim: kuruş } — pozitif: alacaklı, negatif: borçlu. Toplam her zaman 0. */
  function bakiyeler(durum) {
    durumKontrol(durum);
    const bas = Object.fromEntries(durum.kisiler.map((k) => [k, 0]));
    return durum.masraflar.reduce((b, m) => {
      const sonra = { ...b, [m.odeyen]: (b[m.odeyen] || 0) + m.tutar };
      return m.paylar.reduce((x, p) => ({ ...x, [p.kisi]: (x[p.kisi] || 0) - p.tutar }), sonra);
    }, bas);
  }

  // Sıfır toplamlı bir grubu k-1 transferle kapatır.
  function grubuKapat(uyeler) {
    const alacakli = uyeler.filter((u) => u.bakiye > 0).map((u) => ({ ...u }));
    const borclu = uyeler.filter((u) => u.bakiye < 0).map((u) => ({ ...u, bakiye: -u.bakiye }));
    const transferler = [];
    let a = 0;
    let b = 0;
    while (a < alacakli.length && b < borclu.length) {
      const miktar = Math.min(alacakli[a].bakiye, borclu[b].bakiye);
      transferler.push({ kimden: borclu[b].isim, kime: alacakli[a].isim, tutar: miktar });
      alacakli[a] = { ...alacakli[a], bakiye: alacakli[a].bakiye - miktar };
      borclu[b] = { ...borclu[b], bakiye: borclu[b].bakiye - miktar };
      if (alacakli[a].bakiye === 0) a += 1;
      if (borclu[b].bakiye === 0) b += 1;
    }
    return transferler;
  }

  /*
   * Kesin çözüm: en az transfer = n − (sıfır toplamlı ayrık gruplara en fazla bölme sayısı).
   * dp[mask] = max_i dp[mask \ i] + (toplam(mask) == 0 ? 1 : 0), O(2^n · n).
   * Geri izlemede zincirdeki sıfır toplamlı maskeler grup sınırlarını verir.
   */
  function enIyiGruplar(uyeler) {
    const n = uyeler.length;
    const boyut = 1 << n;
    const toplam = new Float64Array(boyut);
    const dp = new Int8Array(boyut);
    for (let mask = 1; mask < boyut; mask++) {
      const dusuk = mask & -mask;
      toplam[mask] = toplam[mask ^ dusuk] + uyeler[31 - Math.clz32(dusuk)].bakiye;
      let enIyi = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) enIyi = Math.max(enIyi, dp[mask ^ (1 << i)]);
      }
      dp[mask] = enIyi + (toplam[mask] === 0 ? 1 : 0);
    }
    const gruplar = [];
    let mask = boyut - 1;
    let mevcut = [];
    while (mask) {
      const ekBir = toplam[mask] === 0 ? 1 : 0;
      let secilen = -1;
      for (let i = 0; i < n && secilen < 0; i++) {
        if ((mask & (1 << i)) && dp[mask ^ (1 << i)] + ekBir === dp[mask]) secilen = i;
      }
      mevcut = [...mevcut, uyeler[secilen]];
      mask ^= 1 << secilen;
      if (toplam[mask] === 0) {
        gruplar.push(mevcut);
        mevcut = [];
      }
    }
    return gruplar;
  }

  /** bakiyeMap: { isim: kuruş } (bakiyeler() çıktısı). Dönüş: { kimden, kime, tutar }[] */
  function hesaplas(bakiyeMap) {
    if (!bakiyeMap || typeof bakiyeMap !== 'object') hata('Geçersiz bakiyeler');
    const uyeler = Object.entries(bakiyeMap).map(([isim, bakiye]) => {
      if (!kurusMu(bakiye)) hata('Bakiye tam sayı kuruş olmalı');
      return { isim, bakiye };
    });
    if (uyeler.reduce((t, u) => t + u.bakiye, 0) !== 0) hata('Bakiyelerin toplamı sıfır değil');
    const sifirDisi = uyeler.filter((u) => u.bakiye !== 0);
    if (sifirDisi.length === 0) return [];
    const gruplar = sifirDisi.length <= KESIN_COZUM_SINIRI ? enIyiGruplar(sifirDisi) : [sifirDisi];
    return gruplar.flatMap(grubuKapat);
  }

  /** "12,50" / "12.5" / "12" → 1250. Float kullanmaz. */
  function kurusaCevir(metin) {
    if (typeof metin !== 'string') hata('Tutar metin olmalı');
    const m = metin.trim().match(/^(\d{1,9})(?:[.,](\d{1,2}))?$/);
    if (!m) hata('Geçersiz tutar (örnek: 12,50)');
    const kurus = Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
    return kurus;
  }

  /** 1250 → "12,50 €" */
  function kurusYaz(kurus) {
    if (!kurusMu(kurus)) hata('Tutar tam sayı kuruş olmalı');
    const isaret = kurus < 0 ? '-' : '';
    const mutlak = Math.abs(kurus);
    const lira = Math.floor(mutlak / 100);
    const kalan = String(mutlak % 100).padStart(2, '0');
    return `${isaret}${lira},${kalan} €`;
  }

  return {
    bosDurum,
    kisiEkle,
    kisiCikar,
    esitBol,
    masrafEkle,
    masrafSil,
    bakiyeler,
    hesaplas,
    kurusaCevir,
    kurusYaz,
    KESIN_COZUM_SINIRI,
  };
});
