# Takımın gerçek konuşması

Videodaki koşunun mesajları, kayıttan olduğu gibi. Süre ve maliyet Claude Code'un bildirdiği değerlerdir (API fiyatıyla).

## Fable 5.2 · Takım lideri
_8 sn · 0.27 $_

Selam ekip, plan şöyle:

**Ortak kurallar:** Para her yerde tam sayı kuruş, float yok. Fonksiyonlar saf; state'i değiştirmez, yenisini döndürür. Hatalı girdide `throw`.

**Opus (geliştirici):** Önce `bolusme.js`, sonra `index.html`.
- `kisiEkle`, `kisiCikar` (masrafı olan kişi çıkarılamaz), `masrafEkle`, `bakiyeler`, `hesaplas`.
- Eşit bölmede artan kuruşlar listedeki sıraya göre birer birer dağıtılır: 1000 kuruş / 3 = 334, 333, 333.
- Özel tutarların toplamı masraf tutarına eşit değilse hata.
- `hesaplas` gerçekten en az transferi bulmalı: alt küme tabanlı kesin çözüm, açgözlü eşleştirme yetmez.
- Arayüzde girdi kuruşa çevrilir ("12,50" → 1250), isimler `textContent` ile basılır.

**Sonnet (testçi):** `test.js`, yalnızca `node:assert` ile.
- Bakiyeler toplamı her zaman 0.
- Kuruş dağıtımı ve özel tutarlar.
- Hesaplaşma sonrası herkes sıfırda.
- Açgözlünün fazla transfer verdiği bir örnek.
- Hatalı girdiler.

Fonksiyon imzalarını Opus ilk mesajında paylaşsın, Sonnet testleri ona göre yazsın.

## Opus 5.5 · Geliştirici
_106 sn · 0.49 $_

Sonnet, iki dosya da hazır. İmzalar:

- `bosDurum()` → `{kisiler, masraflar}`
- `kisiEkle(d, isim)`, `kisiCikar(d, isim)`: masrafta geçen kişi çıkarılamaz
- `masrafEkle(d, {aciklama?, tutar, odeyen, katilimcilar:[...]})` eşit bölmek için, `{..., ozel:[{kisi, tutar}]}` kişiye özel tutar için
- `masrafSil(d, id)`, `esitBol(1000,3)` → `[334,333,333]`
- `bakiyeler(d)` → `{isim: kuruş}`: artı alacaklı, eksi borçlu
- `hesaplas(bakiyeMap)` → `[{kimden, kime, tutar}]`
- `kurusaCevir("12,50")` → 1250, `kurusYaz(1250)` → "12,50 €"

`hesaplas` alt küme DP'siyle kesin sonucu buluyor. 2000 rastgele örnekte herkes sıfırlandı, 20 kişide ~60 ms.

Bilinen eksikler: 20'den fazla borçlu/alacaklıda açgözlüye düşüyor. index.html'i tarayıcıda ve sözdizimi kontrolüyle hiç denemedim. Sayfa yenilenince masraf id'leri baştan numaralanıyor. Tutarda binlik ayırıcı kabul edilmiyor.

## Sonnet 5.5 · Testçi
_48 sn · 0.20 $_

Opus, `test.js` hazır ve 30 testin hepsi geçiyor (`node test.js`). Şu an sadece `index.html`'e son bir bakış atıyorum.

- **Kapsam:** kuruş dağıtımı, özel tutarlar, 300 rastgele senaryoda bakiye toplamının 0 olması, hesaplaşma sonrası herkesin sıfırda olması, açgözlünün şaşırdığı örnekler, hatalı girdiler, `__proto__` gibi isimler, 20 kişide süre. Bunlarda bug çıkmadı.
- **`index.html`:** script sözdizimi temiz, `innerHTML` kullanılmıyor. Tarayıcıda açıp denemedim.
- **Zayıf nokta:** 20'den fazla sıfır olmayan bakiyede `hesaplas` en az transferi garanti etmiyor. Testim sadece herkesin sıfırlandığını doğruluyor.

Bu zayıflığı arayüzde not düşelim. Masraf id'lerinin yenilemede baştan numaralanması da düzelmeli.

## Fable 5.2 · Takım lideri
_35 sn · 0.48 $_

Opus, `bolusme.js`'i okudum, hesap tarafında hata görmedim; 30 test bende de geçiyor. Düzeltilecekler `index.html`'de, öncelik sırasıyla:

1. **Veri kaybı:** `yukle()` hata alırsa boş durumla açılıyor, sonraki ilk işlem eski kaydı eziyor. Bozuk veriyi yedek bir anahtara kopyala, üzerine yazma.
2. **Yanlış ödeyen riski:** `ciz()` her işlemde ödeyen seçimini ilk kişiye döndürüyor, işaretleri ve özel tutarları siliyor. Seçimleri koru.
3. **Tarayıcı denemesi:** Sayfayı kimse açmadı. Dosyadan açınca CSP'nin `bolusme.js`'i engellemediğini doğrula, bir masrafı baştan sona gir, sayfayı yenile.
4. **20 sınırı:** Sıfır olmayan bakiye 20'yi aşınca arayüzde "en az transfer garanti değil" notu göster.

Sonnet, id'lerin yenilemede baştan numaralanması zararsız, çünkü liste hep güncel durumdan çiziliyor; ona dokunmuyoruz.

## Opus 5.5 · Geliştirici
_64 sn · 0.42 $_

Fable, Sonnet, `index.html`'de dört düzeltmeyi yaptım:

1. **Veri kaybı:** Kayıtlı veri okunamazsa ham hali artık `masraf-bolusme-v1-bozuk-<zaman>` anahtarına kopyalanıyor ve hangi anahtara gittiği ekranda yazıyor. Yedek alınamazsa ya da depolama hiç okunamazsa kayıt kapanıyor, eski veri ezilmiyor.
2. **Seçimler:** Sayfa yeniden çizilince ödeyen seçimi, işaretler ve özel tutarlar korunuyor. Özel tutarlar sadece masraf eklenince temizleniyor.
3. **20 sınırı:** Sıfır olmayan bakiye sayısı `KESIN_COZUM_SINIRI`'nı aşınca hesaplaşma listesinde "en az transfer garanti değil" notu çıkıyor.
4. **CSP:** Dosyadan açınca `bolusme.js` engellenmesin diye `script-src`'e `file:` ekledim.

Script sözdizimi temiz, 30 test hâlâ geçiyor. Tarayıcıda yine deneyemedim, burada tarayıcı açma iznim yok. Sonnet, sayfayı dosyadan açıp bir masraf girip yeniler misin?

## Sonnet 5.5 · Testçi
_12 sn · 0.08 $_

Opus, 30 testin hepsi geçti (`node test.js`). `index.html`'in script sözdizimi de temiz.

**Doğrulananlar (kodu okuyarak, tarayıcıda değil):**
- Bozuk veri `-bozuk-<zaman>` anahtarına yedekleniyor. Yedek alınamazsa `kayitKilitli` ile kayıt kapanıyor.
- `KESIN_COZUM_SINIRI` `bolusme.js`'ten dışarı açılıyor, arayüzdeki not buna bağlı.
- CSP'ye `file:` eklenmiş. `innerHTML` hâlâ yok.

**Kalan sorunlar:**
1. **Küçük arayüz sorunu:** Yedekleme uyarısı ilk işlemde `uygula` içindeki `hataGoster('')` ile siliniyor. Kullanıcı yedek anahtar adını görmeden kaybedebilir. Uyarıyı kalıcı bir alanda tutmak daha iyi olur.
2. **Tarayıcıda denenmedi:** Ödeyen seçiminin ve işaretlerin korunması, CSP'nin dosyadan açınca `bolusme.js`'i engellememesi ve yenileme sonrası kayıt hâlâ denenmedi. Bunları ben de çalıştıramadım, çünkü burada tarayıcı yok. Selma'nın sayfayı elle bir kez açıp denemesi gerekiyor.

Para hesabında yeni bir hata görmedim.

## Fable 5.2 · Takım lideri
_14 sn · 0.30 $_

Opus, Sonnet: karar **koşullu teslim**. `bolusme.js` hazır, ama `index.html`'i hâlâ kimse tarayıcıda açmadı.

- **Hesap tarafı:** 30 test bende de geçiyor, para hesabında hata görmedim.
- **Teslim koşulu:** Selma sayfayı dosyadan açıp bir masraf girecek ve yenileyecek. CSP'nin `bolusme.js`'i engellemediği, seçimlerin korunduğu ve kaydın kaldığı ancak o zaman belli olur.
- **Açık hata:** Sonnet'in bulduğu sorun "kayıt kapalı" uyarısını da kapsıyor. İlk işlemde `hataGoster('')` uyarıyı siliyor, kullanıcı hiçbir şeyin kaydedilmediğini fark etmeden devam ediyor. Opus, uyarıyı kalıcı bir alana taşı.
- **Bilinen sınır:** 20'den fazla sıfır olmayan bakiyede en az transfer garanti değil; arayüz bunu not olarak gösteriyor.

Ekip iyi çalıştı: Opus eksiklerini kendisi açıkça yazdı, Sonnet neyi denemediğini gizlemedi.

**Toplam:** 4.8 dk ajan süresi, 2.24 $