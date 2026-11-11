Ev arkadaşları için **masraf bölüşme uygulaması** yapıyoruz. Gerçek kullanılacak, para hesabı yanlış olmamalı.

- `bolusme.js`: saf fonksiyonlar (Node ve tarayıcıda çalışsın, bağımlılık yok).
  - Kişi ekle/çıkar, masraf ekle: tutar, kim ödedi, kimler arasında bölünecek (eşit ya da kişiye özel tutarla).
  - Bakiyeler: kim ne kadar alacaklı/borçlu.
  - Hesaplaşma: borçları **en az sayıda transferle** kapatan liste ("Ayşe → Mert: 12,50 €").
  - Para kuruş hassasiyetinde: 10 € üç kişiye bölününce kuruş kaybolmamalı, toplamlar her zaman sıfırlanmalı.
- `index.html`: tek dosya arayüz (framework yok); kişi ve masraf ekleme, bakiye ve hesaplaşma listesi, localStorage'da saklama.
- Testler `node` ile çalışsın (`node test.js` gibi), dış paket kurma.
