# Wordshift v0.3

Bağımsız kelime öğrenme, çalışma setleri ve oyun platformu. HTML/CSS ve Vanilla JavaScript (ES Modules). Node.js yalnızca lokal geliştirme sunucusu olarak kullanılıyor.

## Yerel kullanım

Node.js 18+ ile proje kökünde `npm start`, ardından http://localhost:3000. Paket yüklemek gerekmez. `npm run check` ile JavaScript sözdizimini denetle.

## GitHub Pages

Projeyi GitHub'da bir depoya yükle. Settings → Pages → Build and deployment → Source: GitHub Actions. `main` dalına push edildiğinde `.github/workflows/pages.yml` yalnızca `frontend/` klasörünü yayınlar. Node.js orada çalışmaz. Tüm URL'ler depo alt yoluyla uyumlu göreli yollardır.

## Dizinler

- `frontend/index.html` — arayüz iskeleti; `assets/css` tema ve stil.
- `frontend/src/core` — durum modeli, navigasyon, yardımcı fonksiyonlar, örnek kelimeler.
- `frontend/src/services` — yerel veri saklama adaptörü; gerçek API bağlantısı bu katmana gelecek.
- `frontend/src/features` — demo kimlik doğrulama, setler, çalışma oturumları, profil, ayarlar, liderlik.
- `frontend/src/games` — runner, amiral battı, eşleştirme/bloklar, meteor ve oyun yönlendirme.
- `frontend/src/ui` — modal, başlık, ortak bileşen, ses ve geri bildirim.
- `backend/dev-server.js` — statik yerel sunucu; üretim API'si DEĞİLDİR.
- `docs/architecture.md` — gerçek backend ve veritabanına geçiş planı.
- `.github/workflows/pages.yml` — otomatik statik dağıtım.
- `scripts/` — JavaScript ve temel modül/durum testleri (`npm run check`).

## Önemli

Bu sürüm mevcut demo davranışını korur: yerel kayıt, profil, çalışma verileri ve bot oyunları. Veriler `localStorage` içindedir. Gerçek kullanıcı doğrulaması, fotoğraf yükleme, farklı cihazlardan erişim, global sıralama ve PvP henüz sunucuya bağlı değildir. Demo için gerçek e-posta veya önemli şifreni kullanma. Parola özeti gerçek sunucu kimlik doğrulaması değildir. Şehir manuel seçilir, CEFR rozeti tahmini bir ilerleme göstergesidir. Gerçek backend kurulmadan halka açık hizmet kullanıma alınmamalıdır.

Yeni bir uygulama geliştirirken mevcut verileri geri yüklemek için önce kullanıcıların veri dışa aktarımını kullan; aynı origin'de önceki `wordshift-v1` kayıtları korunur.


## v0.3 doğrulama
Modül testleri ve sözdizimi denetimi çalıştırılır. Görsel animasyonların tam tarayıcı testi henüz yapılmadı. Gerçek üyelik, online sıralama ve topluluk setleri henüz bağlı değildir.
