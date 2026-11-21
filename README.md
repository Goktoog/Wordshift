# Wordshift

**Kelimelerini ekle, kartlarla öğren, sorularla pekiştir, oyunlarla tekrar et.**

Wordshift; kişisel çalışma setlerini, dil alıştırmalarını ve kelime oyunlarını bir araya getiren bir web uygulamasıdır. HTML, CSS ve JavaScript ile geliştirilmiştir. Arayüz GitHub Pages üzerinde, hesap ve veri hizmetleri Supabase üzerinde çalışır.

[Uygulamayı aç](https://goktoog.github.io/Wordshift/)

## Özellikler

- **Kişisel kütüphane:** Klasörler, çalışma setleri, kelimeler ve kalıplar oluşturma.
- **Öğrenme:** Çevrilebilir ve kaydırılabilir kartlar, yazılı cevaplar, bilmediklerim ve boş bıraktıklarım listesi.
- **Soru çeşitleri:** Çoktan seçmeli, boşluk doldurma, çeviri ve paragraf.
- **Çalışma seçenekleri:** Öğren, Test ve süreli Deneme; içerik türü ve 20 / 50 / tümü seçimi.
- **Oyunlar:** Word Runner, Amiral Battı (bot), Eşleştirme, Bloklar ve Meteor Avı.
- **Hesaplar:** Google veya e-posta/şifre ile giriş ve kayıt; şifre sıfırlama, şifre görünürlüğü ve kayıt şifresi eşleştirme.
- **Profil:** Görünen ad; doğrudan fotoğraf/kapak üzerinden kalem düğmesiyle düzenleme; sürükleme ve yakınlaştırmalı kırpma; arama yapılabilen 81 il listesi.
- **Keşfet:** Kullanıcıların özellikle paylaştığı setlerde arama ve bağımsız kopya oluşturma.
- **Site simgesi:** Markanın elmas sembolü ve yeşil noktası; SVG favicon, ICO yedeği ve Apple dokunmatik simgesi.
- **Temalar:** Koyu ve açık tema; doğru/yanlış cevap efektleri.

## Profil görselleri ve şehir seçimi

- Profil fotoğrafının veya kapak görselinin üzerine gelince kalem düğmesi görünür. Dokunmatik cihazlarda düğmeler sürekli görünür.
- Görseli seçince kırpma ekranı açılır. Sürükleyerek konumlandır, kaydırıcıyla yakınlaştır ve **Kırp ve kaydet** düğmesine bas. Vazgeç mevcut görseli korur; kayıt hatasında kırpma ekranı açık kalır.
- Profil fotoğrafı dairesel önizlemeyle, kapak 4:1 oranıyla gösterilir. Önizleme ve kaydedilen görsel aynı kırpma alanını kullanır. PNG/JPG/WebP, en fazla 10 MB ve 40 milyon piksel kabul edilir. Çıktı WebP'dir: fotoğraf 512×512, kapak 1600×400.
- **Profili düzenle** düğmesi kullanılmaya devam eder. Bu formdan da fotoğraf ve kapak seçilebilir; görseller kırpma ekranında ayrı kaydedilir.
- Şehir seçimini açınca 81 il alfabetik ve kaydırılabilir listelenir. Arama adın başlangıcına göre filtreler: `a` → Adana, Amasya, Ankara… Türkçe karakter olmadan `sanli` veya `istanbul` da yazılabilir. Ok tuşları ve Enter ile seçim, Escape ile listeyi kapatma desteklenir. Şehir belirtmek isteğe bağlıdır.
- Bu profil güncellemesi yeni SQL veya Supabase ayarı gerektirmez. Hesap görselleri mevcut Storage üzerinden, misafir görselleri tarayıcıda saklanır.

## Başlangıç kütüphanesi

Hazır setler herkes için görünür. Kişisel setlere otomatik eklenmez; ilerleme ve tekrar listeleri her kullanıcı için ayrı saklanır.

| Set | Kelime / kalıp | Soru |
| --- | ---: | ---: |
| A1 | 853 | 35 |
| A2 | 827 | 35 |
| B1 | 768 | 35 |
| B2 | 703 | 35 |
| C1 | 90 | 35 |
| YDS | 278 | 115 |
| YÖKDİL | 441 | 35 |

Toplam **3.960 kelime/kalıp kaydı ve 325 soru** vardır. Setler arasında ortak kelimeler bulunabilir. Soruların 245'i üretilmiş alıştırma, 80'i projeye sağlanan 2026 Nisan YDS PDF'indendir. YDS kelimelerinin 198'i bu PDF'nin seçeneklerinden seçilmiştir.

Kaynak sınavı çözmek için **YDS → Çalışılacak içerik → PDF’deki YDS soruları (80) → Test / Deneme** yolunu kullan. Sorular ve gerekli okuma parçaları kaynak görselleriyle gösterilir; cevap A–E düğmelerinden seçilir. Kaynak soru seçiminde deneme süresi 180 dakika, diğer seçimlerde 30 dakikadır.

## Kullanılan teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Arayüz | HTML, CSS, vanilla JavaScript / ES Modules |
| Yayınlama | GitHub Pages ve GitHub Actions |
| Kimlik doğrulama | Supabase Auth; Google OAuth, e-posta/şifre |
| Veri | Supabase PostgreSQL; kullanıcıya özel JSONB çalışma alanı |
| Görseller | Supabase Storage |
| Yerel geliştirme | Node.js statik sunucusu |
| Kontroller | Node.js, Happy DOM ve PGlite |

Node.js sunucusu yerel geliştirme içindir; GitHub Pages üzerinde çalıştırılmaz.

## Yerelde çalıştırma

Node.js 18 veya üzeri kurulu olmalıdır. Proje kökünde:

```bash
npm start
```

Tarayıcıda `http://localhost:3000` adresini aç. Uygulamayı çalıştırmak için ek paket kurulumu gerekmez. Test araçlarının kurulumu ayrıdır.

Google ve e-posta bağlantıları varsayılan olarak canlı siteye döner. Yerelde kimlik doğrulama testi yapılacaksa `frontend/src/services/cloud.js` içindeki `SITE_URL` ile Supabase'in izin verilen yönlendirme adresleri birlikte ayarlanmalıdır.

## Supabase kurulumu

Mevcut projede tamamlanmış adımları yeniden yapmaya gerek yoktur.

### 1. Veritabanı

Supabase projesinde **SQL Editor → New query** aç:

1. `supabase/setup.sql` içeriğini çalıştır: kişisel çalışma alanı, erişim kuralları ve görsel deposu.
2. `supabase/community.sql` içeriğini çalıştır: topluluk setleri ve arama.

Hazır başlangıç setleri site dosyalarıyla dağıtılır; bunlar için ayrıca SQL çalıştırılmaz.

### 2. Site ve yönlendirme adresleri

**Authentication → URL Configuration** ekranında **Site URL**:

```text
https://goktoog.github.io/Wordshift/
```

**Redirect URLs** listesine iki adresi ayrı ayrı ekle:

```text
https://goktoog.github.io/Wordshift/
https://goktoog.github.io/Wordshift/?auth=recovery
```

İkinci adres şifre sıfırlama ekranını açar. İlk adresi silme; değişiklikleri kaydet.

### 3. Google ile giriş

Google Auth Platform'da oluşturulan OAuth istemcisinin türü **Web application** olmalıdır.

| Google alanı | Değer |
| --- | --- |
| Authorized JavaScript origins | `https://goktoog.github.io` |
| Authorized redirect URIs | `https://ageaooejmhwxpaajelbw.supabase.co/auth/v1/callback` |

Google'dan alınan **Client ID** ve **Client Secret**, Supabase → **Authentication → Sign In / Providers → Google** alanlarına girilir. Google sağlayıcısı etkinleştirilip kaydedilir. Client Secret frontend'e veya GitHub'a eklenmez.

İlk Google girişinde hesap oluşturulur; sonraki girişlerde aynı hesap kullanılır. Canlıya geçtikten sonra farklı bir Google hesabıyla da giriş denenmelidir. Google test kullanıcısı/yayın durumu uyarısı gösterirse Google Auth Platform → Audience ayarları kontrol edilir.

### 4. E-posta doğrulama ve şifre sıfırlama

Email sağlayıcısı ve **Confirm email** açık tutulmalıdır. Supabase'in varsayılan e-posta servisi herkese açık teslimat için uygun değildir; proje ekibi dışındaki adreslere gönderim için özel SMTP kurulmalıdır.

1. SMTP destekleyen bir e-posta hizmetinde gönderici adresini doğrula.
2. Hizmetin verdiği SMTP host, port, kullanıcı adı ve SMTP şifresini al.
3. Supabase → **Authentication → Emails → SMTP Settings** üzerinden özel SMTP'yi aç.
4. Doğrulanmış gönderici adresini, `Wordshift` gönderici adını ve SMTP bilgilerini gir; kaydet.
5. E-posta şablonlarını düzenlersen doğrulama bağlantısındaki `{{ .ConfirmationURL }}` değişkenini koru.
6. Kayıt ve şifre sıfırlama e-postasının gerçek alıcıya ulaştığını dene.

SMTP kurulumu Google sağlayıcısı ayarından ayrıdır. Google girişini yapılandırmak, e-posta gönderimini otomatik olarak yapılandırmaz.

## GitHub Pages ile yayınlama ve güncelleme

GitHub deposunda **Settings → Pages → Source: GitHub Actions** seçilir. `.github/workflows/pages.yml`, `main` dalına gönderilen değişikliklerden sonra yalnızca `frontend/` klasörünü yayınlar.

Mevcut Git bağlantılı klasörü güncellemek için:

1. Yeni ZIP'i çıkart ve içindeki `Wordshift` klasörünü aç.
2. Dosya ve klasörlerin tamamını mevcut `Wordshift-GitHub` klasörünün **içine** kopyala; aynı adlı dosyaları değiştir. İkinci bir iç proje klasörü oluşturma.
3. Mevcut `.git` klasörünü silme. Tekrar clone veya Initialize Repository yapma.
4. Bu README'yi `package.json` ile aynı seviyeye koy.
5. VS Code'da **File → Open Folder → Wordshift-GitHub** seç.
6. **Source Control → Stage All (+)** ile değişiklikleri hazırla.
7. Bir commit mesajı yazıp **Commit**, ardından **Sync Changes / Push** seç.
8. GitHub → **Actions** bölümünde son dağıtımın başarılı olduğunu kontrol et.
9. Canlı siteyi **Ctrl+F5** ile yenile.

README ve diğer kök Markdown belgeleri uygulama çalışması için gerekli değildir. Bu README tüm temel kurulum bilgisini içerir; diğer açıklama Markdown dosyaları kaldırılabilir. `.github/workflows/pages.yml` ve `.git` farklı görevler taşır ve korunmalıdır.

## Dosya düzeni

| Yol | İçerik |
| --- | --- |
| `frontend/index.html` | Ana sayfa ve hesap arayüzü |
| `frontend/assets/` | Stiller ve kaynak soru görselleri |
| `frontend/src/core/` | Durum yönetimi, gezinme ve yardımcılar |
| `frontend/src/features/` | Hesap, setler, öğrenme, profil ve keşif |
| `frontend/src/games/` | Kelime oyunları |
| `frontend/src/services/` | Yerel kayıt ve Supabase bağlantıları |
| `frontend/src/data/starter-sets.js` | Ortak başlangıç kataloğu |
| `frontend/src/ui/` | Ortak arayüz bileşenleri ve efektler |
| `backend/dev-server.js` | Yerel statik sunucu |
| `supabase/` | SQL kurulum dosyaları |
| `scripts/` | Sözdizimi ve oyun kontrolleri |
| `tests/` | Arayüz, veri izolasyonu ve içerik testleri |
| `.github/workflows/pages.yml` | Pages yayınlama iş akışı |

## Doğrulama

Proje kökünde, testlerin tamamı için Node.js 24 kullan:

```bash
npm run check
npm run test:games
npm install --prefix tests
npm test --prefix tests
```

Testler kişisel veri izolasyonunu, topluluk paylaşımını, öğrenme/oyun akışlarını, hesap arayüzünü, başlangıç setlerini, 80 kaynak sorunun cevap eşleşmesini, il seçimini ve kırpma geometrisini kontrol eder. Kırpma arayüzü testlerinde tarayıcı görsel API’leri taklit edilir; gerçek tarayıcı görüntüleme kontrolünün yerini tutmaz. Kimlik doğrulama testlerinde taklit servis kullanılır; canlı Google girişini veya SMTP teslimatını kanıtlamaz.

Yayın sonrası kontrol:

- Google ile giriş yap, profil adını kontrol et.
- Bir set oluştur; **Buluta kaydedildi** mesajını bekle.
- Çıkış yapıp aynı hesapla tekrar gir; setin korunduğunu doğrula.
- Başka hesapla girişte özel setlerin görünmediğini kontrol et.
- Şifremi unuttum bağlantısının yeni şifre ekranına döndüğünü dene.
- Yedi başlangıç setini, bir kaynak YDS sorusunu ve bir kelime oyununu aç.

## Mevcut sınırlar ve kaynaklar

- Çevrimiçi PvP ve rekabetçi global leaderboard henüz uygulanmamıştır. Amiral Battı botla oynanır.
- XP ve CEFR rozetleri çalışma göstergesidir; resmî dil yeterliliği ölçümü değildir.
- Misafir verileri aynı tarayıcıda saklanır; hesaba otomatik taşınmaz.
- Profil görsel deposu herkese açıktır; görsel URL'sini bilen görüntüleyebilir. Eski görseller otomatik temizlenmez.
- Kullanıcı setleri varsayılan olarak özeldir. Topluluk paylaşımı açık bir yayınlama işlemiyle yapılır.
- A1–B2 listeleri projeye sağlanan Ozan Dur hazırlamalı kelime PDF'lerinden; akademik ek kelimeler Ahmet Akın / Akın Dil YDS & YÖKDİL listesinden aktarılmıştır. Kaynaklar içeriklerde belirtilir.
- C1 seçkisi ve ek alıştırmalar proje için hazırlanmıştır; düzeyler yaklaşık çalışma etiketidir.
- Kaynak YDS soruları sağlanan PDF'nin görsellerini ve cevap anahtarını kullanır. PDF'nin resmî özgünlüğü bağımsız olarak doğrulanmamıştır. Üretilen sorular kaynak sınav sorularından ayrı işaretlenir.

Kurulum belgeleri: [Supabase Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Yönlendirme adresleri](https://supabase.com/docs/guides/auth/redirect-urls), [Özel SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
