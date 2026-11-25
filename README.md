# Wordshift

**Kelimelerini ekle, kartlarla öğren, sorularla pekiştir, oyunlarla tekrar et.**

Wordshift; kendi çalışma setlerini oluşturabildiğin, dil alıştırmaları yapabildiğin ve kelimelerini oyunlarla tekrar edebildiğin bir web uygulamasıdır. Kurulum gerektirmez, tarayıcıdan açılır; telefonda ve bilgisayarda çalışır.

### [▶ Uygulamayı aç](https://goktoog.github.io/Wordshift/)

## Nasıl kullanılır?

1. Siteyi aç. Hemen denemek için **Misafir olarak dene**'yi seç; hesap istemez, ilerlemen tarayıcıda kalır ve çıkış yaptığında veya site verilerini temizlediğinde silinir.
2. Çalışmalarını cihazlar arasında saklamak, setlerini paylaşmak ve sıralamaya girmek için **Google** veya **e-posta** ile üye ol.
3. **Yeni çalışma seti** oluştur, kelimelerini veya sorularını ekle. Hazır **başlangıç setleriyle** de hemen çalışmaya başlayabilirsin.
4. Kartlarla öğren, **Öğren / Test / Deneme** ile kendini sına, **Oyunlar** bölümünde eğlenerek tekrar et.

## Özellikler

- **Kişisel kütüphane:** Çalışma setleri, kelimeler ve kalıplar oluşturma; setlerin adını değiştirme ve silme; toplu kelime ekleme.
- **Öğrenme:** Çevrilebilir ve kaydırılabilir kartlar, yazılı cevaplar, "bilmediklerim ve boş bıraktıklarım" tekrar listesi.
- **Soru çeşitleri:** Çoktan seçmeli, boşluk doldurma, çeviri ve paragraf.
- **Çalışma seçenekleri:** Öğren, Test ve süreli Deneme; içerik türü ve 20 / 50 / tümü seçimi.
- **Oyunlar:** Dokuz oyunun tamamında tek oyunculu / botlu ve iki oyunculu çevrimiçi seçenekleri bulunur.
- **Canlı oyuncu havuzları:** Her oyunda bekleyen oyuncu sayısı, seviyene uygun rakip sayısı ve yeterli veri varsa geçmiş eşleşmelere dayanan bekleme ortalaması.
- **Maç geçmişi:** Profilinde rakip, sonuç, puanlar, doğru/yanlış sayıları, canlar, süre ve Amiral Battı atışları.
- **Keşfet:** Diğer kullanıcıların herkese açık setlerini ara, çalış veya kendi kütüphanene bağımsız kopya olarak ekle.
- **Gizli veya herkese açık setler:** Set oluştururken seçersin, istediğin zaman değiştirebilirsin. Setler varsayılan olarak yalnızca senindir; herkese açık seçersen Keşfet'te görünür.
- **Liderlik tablosu:** XP'ye göre global ve şehir sıralaması.
- **Profil ve arkadaşlar:** Profil fotoğrafı, kapak görseli, şehir ve seviye. Diğer kullanıcıları takip edebilir, onların profilini, herkese açık setlerini, takipçilerini ve takip ettiklerini görebilirsin.
- **Temalar:** Koyu ve açık tema.

## Başlangıç kütüphanesi

Hazır setler herkes için görünür. Kişisel setlerine otomatik eklenmez; ilerleme ve tekrar listeleri her kullanıcı için ayrı saklanır.

| Set | Kelime / kalıp | Soru |
| --- | ---: | ---: |
| A1 | 853 | 55 |
| A2 | 827 | 55 |
| B1 | 768 | 55 |
| B2 | 703 | 55 |
| C1 | 90 | 55 |
| YDS | 634 | 145 |
| YÖKDİL | 441 | 45 |

Toplam **4.316 kelime/kalıp kaydı ve 465 soru** vardır. Setler arasında ortak kelimeler bulunabilir. Soruların 385'i üretilmiş alıştırma, 80'i projeye sağlanan 2026 Nisan YDS PDF'indendir.

Kaynak sınavı çözmek için **YDS → Çalışılacak içerik → PDF’deki YDS soruları (80) → Test / Deneme** yolunu kullan. Sorular ve gerekli okuma parçaları kaynak görselleriyle gösterilir. Kaynak soru seçiminde deneme süresi 180 dakika, diğer seçimlerde 30 dakikadır.

## Gizlilik

- Setlerin varsayılan olarak **özeldir**. Yalnızca herkese açık yaptığın setler başkalarına görünür.
- Hesabıyla giriş yaptıysan adın, profil fotoğrafın, kapak görselin, şehrin, XP'n ve seviyen herkese açık profilinde görünür. E-posta adresin hiçbir zaman gösterilmez.
- Misafirler global ve şehir sıralamalarını, oyuncu profillerini ve paylaşılan setleri inceleyebilir. Misafirler için kalıcı profil oluşturulmaz. XP ve çalışma ilerlemesi bu tarayıcıda saklanır. Misafir adı sabittir. Set oluşturma ve kopyalama ile profil fotoğrafı yükleme kayıtlı hesaplara açıktır.

## Kullanılan teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Arayüz | HTML, CSS, vanilla JavaScript (ES Modules) |
| Yayınlama | GitHub Pages ve GitHub Actions |
| Hesaplar | Supabase Auth (Google ve e-posta/şifre) |
| Veri | Supabase PostgreSQL |
| Görseller | Supabase Storage |

## Proje yapısı

| Yol | İçerik |
| --- | --- |
| `frontend/` | Uygulamanın kendisi: sayfa, stiller, kod ve başlangıç setleri |
| `supabase/` | Veritabanı yapısını tanımlayan SQL dosyaları |
| `tests/` | Otomatik testler |

## Sınırlar

- Misafirler ve kayıtlı oyuncular aynı odalarda ve kuyruklarda eşleşebilir.
- PvP’de doğru cevaplar XP kazandırır. Misafirlerin puanları ve seviye ilerlemesi yalnızca kendi tarayıcılarında tutulur.
- Kuyruklar yaklaşık 3 saniyede, maç durumu yaklaşık 1 saniyede güncellenir. Hareket animasyonları cihazda çalışır; cevap, süre, can ve sonuçlar Supabase tarafından belirlenir.
- XP ve seviye rozetleri çalışma göstergesidir; resmî bir dil yeterlilik sonucu değildir.
- Profil fotoğrafı ve kapak görseli düzenleme kayıtlı hesaplara açıktır.

## Kafanı Kırarım ve misafir erişimi

Mevcut sosyal özellikleri olan Supabase projesinde bu sürümle verilen **Wordshift-Guncelleme.sql** dosyasının tamamını SQL Editor’da bir kez çalıştır. Ardından ön yüzü yayınla. Tek tek kurmak için aynı değişiklikler sırasıyla `supabase/admin-badge.sql` ve `supabase/pvp.sql` içinde bulunur.

Bot maçı için bir setten veya Oyunlar bölümünden **Kafanı Kırarım** seç. İki oyuncu **Çevrimiçi PvP → Kafanı Kırarım** ile eşleşebilir veya oda kodu kullanabilir. Oyuncular üçer canla başlar. Doğru cevap rakibin bir canını götürür. İlk basan on saniye içinde cevaplayamazsa veya yanlış cevaplarsa aynı soru rakibe geçer. İki oyuncu da bilemezse yeni soru gelir. Kelime, cümle ve boşluk doldurma soruları seçilen setin içeriğinden gelir.

## Misafir erişimi ve admin rozeti güncellemesi

Sosyal özellikleri kurulu projelerde, bu sürümü yayınlamadan önce Supabase SQL Editor içinde güncel `supabase/admin-badge.sql` dosyasını çalıştır. İlk kurulumda sıra `setup.sql`, `community.sql`, `social.sql`, `admin-badge.sql` şeklindedir. Adminler **Profilim → Profili düzenle → Admin rozeti rengi** alanından renk seçebilir.

Oyun salonu, kişisel setler, hazır setler ve topluluk setleri aynı tek oyunculu oyun listesini kullanır. Cümle Düellosu sette belirtilen seviyenin hazır cümlelerini kullanır. Set adında seviye yoksa içeriklerde en sık görülen seviye, içeriklerde de yoksa oyuncunun seviyesi kullanılır. Kelime Geçidi’nde doğru cevap geçiş hakkı verir. “Şeridi geç” ile güvenli anı seçersin. Üç şeritlik yolu tamamlarsan karşı kıyıya ulaşırsın. Çarpışmada kaldırıma dönüp aynı hakkı yeniden kullanırsın. Kelime Kulesi’nde doğru anlamı taşıyan platforma zıplayarak kat çıkarsın. Kelime Dedektifi’nde Türkçe ipucunun İngilizcesini beş yanlış tahmin hakkıyla harf harf çözersin.

## 0.9 çevrimiçi oyun kurulumu

Mevcut Supabase projesini ve GitHub Pages adresini kullanır. Yeni bir Node.js / Socket.io sunucusu açman gerekmez. Bu ZIP, gönderdiğin güncel proje üzerine hazırlanmıştır; sosyal özellikler, seviye sınavı ve mevcut içerikler korunmuştur.

1. ZIP içindeki `Wordshift-GitHub/supabase/pvp.sql` dosyasını VS Code'da aç. **Ctrl+A → Ctrl+C** ile tamamını kopyala.
2. [Supabase projenin SQL Editor sayfasını](https://supabase.com/dashboard/project/ageaooejmhwxpaajelbw/sql/new) aç. **New query** seç, yapıştır ve **Run** düğmesine bas. `Success. No rows returned` normaldir. Dosya tekrar çalıştırılabilir. Önceden kullanılan `setup.sql` kurulmuş olmalı; mevcut tabloları veya hesapları silmez.
3. ZIP'in içindeki proje dosyalarını mevcut Git bağlantılı **Wordshift-GitHub** klasörünün içine kopyala, aynı dosyaları değiştir. `.git` klasörünü silme. Yeni clone veya Initialize Repository yapma.
4. VS Code → **Source Control → Stage All → Commit → Push / Sync Changes**. GitHub Actions başarılı olunca siteyi **Ctrl+F5** ile yenile.
5. İki farklı tarayıcı profili veya iki ayrı hesap kullan: birinci tarayıcıda **Oyunlar → Oda oluştur / Koda katıl → oyun ve set seç → Arkadaş için oda oluştur**. İkinci hesapta aynı ekrandan 10 karakterli kodu gir. Aynı hesabın iki sekmesi iki rakip sayılmaz.
6. Hızlı eşleşme için oyun havuzundaki **Online rakip ara** düğmesini kullan. Aynı oyun ve aynı profil seviyesindeki oyuncular eşleşir. Kimse yoksa beklenir; bot gerçek oyuncu gibi gösterilmez. Başka oyunun havuzuna geçilebilir. Oda koduyla farklı seviyedeki arkadaşlar da oynayabilir.
7. Maç bittiğinde **Profilim → Çevrimiçi maç geçmişim** bölümüne bak. Satıra dokunarak ayrıntıları aç.

### Oyun kuralları

| Oyun | Çevrimiçi kural |
| --- | --- |
| Word Runner | Ortak başlangıç, 3 can. Engel sorusuna 10 saniye. Yanlış / boş cevap bir can götürür. Canı tükenen kaybeder. |
| Meteor Avı | 3 can. Her hedef için 10 saniye. Yanlış hedef / sürede ateş etmemek bir can götürür. Roket sabittir; hedefe döner ve füze atar. |
| Amiral Battı | 3, 2 ve 1 hücrelik gemiyi yerleştir/döndür. Filo hazırlığı 120 saniye. Cevap için 10 saniye, doğru cevaptan sonra atış için ayrıca 10 saniye. Sıralı oynanır; rakibin tüm gemilerini batıran kazanır. |
| Kelime Blokları | Solda İngilizce, sağda Türkçe. En fazla 8 çift, 60 saniye. Doğru +100, yanlış −15 (puan sıfırın altına inmez). Yüksek puan; eşitse daha erken bitiren kazanır. |
| Kelime Kulesi | Her doğru platform bir kat ve 100 puan kazandırır. |
| Kelime Geçidi | Doğru cevap geçiş hakkı verir. Güvenli geçiş 100 puan kazandırır. Çarpışmada kaldırıma dönersin. |
| Kelime Dedektifi | Türkçe ipucunun İngilizcesini 35 saniyede ve en fazla beş yanlış harf tahminiyle çöz. |
| Kafanı Kırarım | Düğmeye ilk basan on saniye içinde cevap verir. Yanlışta soru rakibe geçer. Üç isabet kazanır. |
| Cümle Düellosu | Seviyeye göre 6 hazır cümle, cümle başına 90 saniye. Karışık kelimelerden Türkçe anlamına uygun İngilizce cümle kur; yanlış gönderim cümleyi bitirmez, süre dolana kadar düzeltebilirsin. Çevrimiçi maçta cümleyi ilk doğru tamamlayan +100 alır ve hemen sonraki cümleye geçilir; 90 saniyede kimse tamamlayamazsa kimse puan almaz. |

- Runner ve Meteor'da iki oyuncu aynı turu tamamladıktan sonra canlar karşılaştırılır; ikisi de aynı turda son canını kaybederse berabere olur. Kelime havuzu bittiğinde yaşam mücadelesi devam eder. Maçın üst sınırı 15 dakikadır; bu sınıra ulaşılırsa önce kalan can, sonra puan karşılaştırılır.
- Bağlantı kesilince **30 saniye** yeniden bağlanma süresi vardır. **Oyunlar → Oda oluştur / Koda katıl** devam eden odayı açar. Süre geçerse bağlı oyuncu kazanır; ikisi de kopmuşsa beraberlik kaydedilir. **Odadan ayrıl** düğmesi maç başladıktan sonra yenilgi sayılır.
- Kuyrukta en fazla 10 dakika beklenir. Bekleme sayıları seni ve özel kodlu odaları içermez. “Uygun rakip” sayısı profil seviyene göre filtrelenir. Bekleme tahmini son 24 saatte en az 3 eşleşme varsa gösterilen ortalamadır; yeni oyuncunun ne zaman geleceğini garanti etmez.
- Kelime oyunlarında en az 4 farklı kelime ve farklı karşılık gerekir. Seçilen setin en fazla 20 kelimesi (bloklarda 8) rakiple paylaşılır; setin bütünü veya hesap verileri paylaşılmaz. Hızlı eşleşme oyun salonundan açıldığında varsayılan olarak seviyene uygun başlangıç setini kullanır. Cümle oyunu hazır cümle havuzunu kullanır.
- Misafirin gördüğü maç özeti bu tarayıcıya kaydedilir ve çıkışta silinir. İki misafirin maçı sunucudaki maç geçmişine yazılmaz. Kayıtlı oyuncunun geçmişinde misafir rakip yalnızca “Misafir” olarak görünür. Sunucuda bir kez kaydedilir; skor/can doğrudan tarayıcıdan yazılamaz. Aktif oda kayıtları 24 saat sonra temizlenir, maç geçmişi korunur.
- Bu sürüm küçük ölçekli oyunlar için Supabase RPC üzerinden düzenli durum sorgular. WebSocket tabanlı hareket senkronizasyonu kullanmaz. Canlı projedeki kullanıcı ve ağ koşullarını iki ayrı hesapla test et.

### Geliştirme ve test

`npm run check` sözdizimi kontrolünü, `npm run test:games` temel oyun mantığı kontrollerini çalıştırır. Ayrıntılı testler için Node.js 24 ile `npm install --prefix tests` ve `npm test --prefix tests` kullan. PvP testleri gömülü PostgreSQL'de iki hesap, yetkiler, süreler, canlar, eşleşme, maç sonuçları ve kayıtları kontrol eder. Arayüz testleri DOM / animasyon zamanlamasını taklit eder; gerçek tarayıcı çizimini veya canlı Supabase bağlantısını doğrulamaz.

## Kaynaklar

- A1–B2 listeleri projeye sağlanan Ozan Dur hazırlamalı kelime PDF'lerinden; akademik ek kelimeler Ahmet Akın / Akın Dil YDS & YÖKDİL listesinden aktarılmıştır. Kaynaklar içeriklerde belirtilir.
- C1 seçkisi ve ek alıştırmalar proje için hazırlanmıştır; düzeyler yaklaşık çalışma etiketidir.
- Kaynak YDS soruları sağlanan PDF'nin görsellerini ve cevap anahtarını kullanır. PDF'nin resmî özgünlüğü bağımsız olarak doğrulanmamıştır. Üretilen sorular kaynak sınav sorularından ayrı işaretlenir.

## Sesler ve cevap gösterimi

- Süreli sorularda son 3 saniyede saniyede bir kısa bip çalar. Çevrimiçi eşleşme bulunduğunda üç kısa "dın" sesi çalar; sekme arka plandayken de rakip aranmaya ve ses çalmaya devam eder (tarayıcı sesi engellemiyorsa).
- Yanlış, boş veya süresi dolan sorularda doğru cevap ekranda kalır: tek oyunculu oyunlarda yaklaşık 4 saniye, çevrimiçi maçlarda 3,5 saniye. Çalışma modunda "Boş bırak" doğru cevabı gösterir ve "Sonraki" ile devam edilir.
