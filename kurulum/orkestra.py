"""Üç modelli küçük ajan takımı: lider (Fable 5.2), geliştirici (Opus 5.5), testçi (Sonnet 5.5).
Her tur bir `claude -p` çağrısı; ajanlar ortak bir sohbet geçmişini görür, kendi rolüyle cevap verir.
Her mesajın zamanı, süresi ve Claude Code'un bildirdiği maliyeti kayit/olaylar.jsonl'e yazılır (videoda yeniden oynatılır).

Kullanım: python3 orkestra.py <kosu-adi> [--kuru]   (--kuru: üç rol de Haiku, sistem denemesi)
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

KOK = Path(__file__).parent
GOREV = (KOK / 'GOREV.md').read_text()
ROLLER = {
    'lider':     {'model': 'claude-fable-5-2',  'ad': 'Fable 5.2', 'unvan': 'Takım lideri',
                  'araclar': 'Read Glob Grep "Bash(node:*)" "Bash(ls:*)"'},
    'gelistirici': {'model': 'claude-opus-5-5', 'ad': 'Opus 5.5', 'unvan': 'Geliştirici',
                  'araclar': 'Read Write Edit Glob Grep "Bash(node:*)" "Bash(ls:*)"'},
    'testci':    {'model': 'claude-sonnet-5-5', 'ad': 'Sonnet 5.5', 'unvan': 'Testçi',
                  'araclar': 'Read Write Edit Glob Grep "Bash(node:*)" "Bash(ls:*)"'},
}
# Sabit akış: tavan 7 tur, para/limit güvenliği için döngü yok.
AKIS = [
    ('lider', 'Görevi oku. Geliştiriciye ve testçiye kısa, net bir plan ve iş bölümü yaz. Kod yazma.'),
    ('gelistirici', 'Liderin planına göre uygulamayı yaz: bolusme.js ve index.html ikisi de teslim edilecek. Bitince ne yaptığını ve bilinen eksikleri kısaca söyle.'),
    ('testci', 'Geliştiricinin yazdığını test et: test dosyası yaz ve `node` ile çalıştır. Bulduğun hataları somut örnekle raporla.'),
    ('lider', 'Kodu ve test raporunu incele. Geliştiriciye düzeltmesi gerekenleri öncelik sırasıyla yaz. Kod yazma.'),
    ('gelistirici', 'Liderin ve testçinin bulduklarını düzelt. Neyi düzelttiğini kısaca söyle.'),
    ('testci', 'Testleri yeniden çalıştır, düzeltmeleri doğrula. Kalan hata varsa söyle.'),
    ('lider', 'Son kararı ver: iş teslim edilebilir mi? Takımın performansını ve kalan riskleri 3-4 cümleyle özetle.'),
]
ORTAK = """Sen küçük bir yazılım ekibinin üyesisin. Ekip: Fable 5.2 (takım lideri), Opus 5.5 (geliştirici), Sonnet 5.5 (testçi).
Çalışma klasörü şu anki dizin. Cevabın ekibe yazdığın mesajdır: Türkçe, kısa (en fazla 120 kelime), sohbet dilinde, ekip arkadaşına hitap ederek.
Gereksiz dosya açma, işin dışına çıkma."""


def kaydet(dosya, olay):
    with dosya.open('a') as f:
        f.write(json.dumps(olay, ensure_ascii=False) + '\n')


def cagir(rol, talimat, gecmis, proje, kuru):
    r = ROLLER[rol]
    model = 'claude-haiku-5-5' if kuru else r['model']
    sohbet = '\n'.join(f"[{m['ad']} · {m['unvan']}]: {m['metin']}" for m in gecmis) or '(henüz mesaj yok)'
    istem = f"{ORTAK}\n\nSenin rolün: {r['unvan']} ({r['ad']}).\n\n# Görev\n{GOREV}\n\n# Ekip sohbeti şimdiye kadar\n{sohbet}\n\n# Şimdi senden istenen\n{talimat}"
    komut = f"claude -p --model {model} --effort medium --setting-sources project --strict-mcp-config --output-format json --allowedTools {r['araclar']}"
    bas = time.time()
    c = subprocess.run(komut, shell=True, input=istem, capture_output=True, text=True, cwd=proje, timeout=1800)
    try:
        j = json.loads(c.stdout)
    except json.JSONDecodeError:
        j = {'result': f'(çağrı hatası) {c.stderr[-300:]}', 'total_cost_usd': 0, 'is_error': True}
    return {'rol': rol, 'ad': r['ad'], 'unvan': r['unvan'], 'model': model, 'metin': (j.get('result') or '').strip(),
            'maliyet': j.get('total_cost_usd', 0), 'sure': round(time.time() - bas, 1), 'bas': bas,
            'tur_sayisi': j.get('num_turns'), 'hata': j.get('is_error', False)}


def main():
    ad, kuru = sys.argv[1], '--kuru' in sys.argv
    kayit = KOK / 'kayit' / ad
    proje = kayit / 'proje'
    shutil.rmtree(kayit, ignore_errors=True)
    proje.mkdir(parents=True)
    subprocess.run('git init -q && git commit -q --allow-empty -m baslangic', shell=True, cwd=proje)
    olaylar = kayit / 'olaylar.jsonl'
    kaydet(olaylar, {'tip': 'basla', 'zaman': time.time(), 'gorev': GOREV, 'kuru': kuru})
    gecmis = []
    for i, (rol, talimat) in enumerate(AKIS, 1):
        kaydet(olaylar, {'tip': 'dusunuyor', 'zaman': time.time(), 'rol': rol, 'ad': ROLLER[rol]['ad']})
        m = cagir(rol, talimat, gecmis, proje, kuru)
        gecmis.append(m)
        subprocess.run(f'git add -A && git commit -q -m "tur {i}: {m["ad"]}" || true', shell=True, cwd=proje)
        kaydet(olaylar, {'tip': 'mesaj', 'zaman': time.time(), **m})
        print(f"{i}. {m['ad']:<10} {m['sure']:>6}s  ${m['maliyet']:.3f}  {'HATA ' if m['hata'] else ''}{m['metin'][:90]!r}", flush=True)
    toplam = {}
    for m in gecmis:
        toplam[m['ad']] = round(toplam.get(m['ad'], 0) + m['maliyet'], 4)
    kaydet(olaylar, {'tip': 'bitti', 'zaman': time.time(), 'toplam': toplam})
    print('toplam:', toplam, '=', round(sum(toplam.values()), 3))


if __name__ == '__main__':
    main()
