# Fable 5.2 + Opus 5.5 + Sonnet 5.5: 3 modelli ajan takımı

Fable 5.2 vs Opus 5.5 videosundaki ajan takımı testinin kurulumu ve takımın o koşuda yazdığı uygulama.

Fikir basit: en pahalı modeli her işe açma, **ekibin başına koy**.

| Rol | Model | Ne yapıyor |
|---|---|---|
| Takım lideri | Fable 5.2 | Plan yazar, kodu ve test raporunu inceler, son kararı verir. **Kod yazmaz.** |
| Geliştirici | Opus 5.5 | Planı uygular, hataları düzeltir. |
| Testçi | Sonnet 5.5 | Testleri yazar, çalıştırır, hataları raporlar. |

Videodaki koşu: 3 model toplam yaklaşık 5 dakikada bitirdi, API fiyatıyla yaklaşık 2,2 $ tuttu. Sonnet 30 test yazdı, hepsi geçti. Fable incelemede arayüzde iki gerçek hata buldu, Opus ikisini de düzeltti.

## Klasörler

- `kurulum/`: takımı kendi bilgisayarında çalıştırmak için `orkestra.py` ve görev dosyası `GOREV.md`.
- `ornek-uygulama/`: takımın videodaki koşuda yazdığı masraf bölüşme uygulaması (`index.html`, `bolusme.js`, `test.js`) ve takımın kendi aralarındaki konuşması (`TAKIM-KONUSMASI.md`).

## Örnek uygulamayı dene

```bash
cd ornek-uygulama
node test.js        # 30 testin hepsi geçmeli
open index.html     # tarayıcıda açılır, kurulum gerekmez
```

## Takımı kendin çalıştır

Gereksinimler:
- [Claude Code](https://code.claude.com/docs/en/overview) kurulu ve giriş yapılmış olmalı (`claude -p` çalışmalı).
- Python 3.9+, Node.js, git.
- Planında Fable 5.2 erişimi olmalı.

```bash
cd kurulum
python3 orkestra.py deneme1 --kuru   # önce sistem denemesi: üç rol de Haiku, çok ucuz
python3 orkestra.py deneme1          # gerçek koşu: Fable lider, Opus geliştirici, Sonnet testçi
```

Çıktı `kurulum/kayit/deneme1/` altına düşer: `proje/` (kod, her tur ayrı git commit'i) ve `olaylar.jsonl` (her mesaj, süre ve maliyet).

### Akış (7 tur, döngü yok)
1. Lider (Fable): görevi okur, plan ve iş bölümü yazar.
2. Geliştirici (Opus): planı uygular.
3. Testçi (Sonnet): test yazar, çalıştırır, hataları raporlar.
4. Lider: kodu ve raporu inceler, düzeltme listesi verir.
5. Geliştirici: düzeltir.
6. Testçi: testleri yeniden çalıştırır.
7. Lider: son karar (teslim edilebilir mi?).

### Kendi işine uyarla
- `GOREV.md` dosyasına kendi görevini yaz.
- `orkestra.py` içindeki `ROLLER` ile modelleri, `AKIS` ile turları değiştir.
- Ajanların araçları rol başına kısıtlı (`--allowedTools`): lider yalnızca okur ve `node` çalıştırır.

## Bilmen gerekenler
- Her tur ayrı bir `claude -p` çağrısıdır ve aboneliğinden ya da API kredinden düşer. Tur sayısı sabit (7), sonsuz döngü yok.
- Ajanlar çalışma klasörüne dosya yazar. Önemli bir projenin içinde değil, boş bir klasörde dene.
- Fable 5.2'nin API fiyatı Opus 5.5'in iki katı. Gerçek koşudan önce akışı `--kuru` ile dene.
- Dolar rakamları "API ile yapsaydım bu kadar tutardı" hesabıdır.

## Lisans
MIT. Ayrıntı için `LICENSE` dosyasına bak.
