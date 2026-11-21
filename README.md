# Wordshift

**Kelimelerini ekle, kartlarla öğren, sorularla pekiştir, oyunlarla tekrar et.**

Wordshift; kendi çalışma setlerini oluşturabildiğin, dil alıştırmaları yapabildiğin ve kelimelerini oyunlarla tekrar edebildiğin bir web uygulamasıdır. Kurulum gerektirmez, tarayıcıdan açılır; telefonda ve bilgisayarda çalışır.

### [▶ Uygulamayı aç](https://goktoog.github.io/Wordshift/)

## Nasıl kullanılır?

1. Siteyi aç. Hemen denemek için **Misafir olarak dene**'yi seç; hesap istemez, çalışmaların yalnızca o tarayıcıda saklanır.
2. Çalışmalarını cihazlar arasında saklamak, setlerini paylaşmak ve sıralamaya girmek için **Google** veya **e-posta** ile üye ol.
3. **Yeni çalışma seti** oluştur, kelimelerini veya sorularını ekle. Hazır **başlangıç setleriyle** de hemen çalışmaya başlayabilirsin.
4. Kartlarla öğren, **Öğren / Test / Deneme** ile kendini sına, **Oyunlar** bölümünde eğlenerek tekrar et.

## Özellikler

- **Kişisel kütüphane:** Klasörler, çalışma setleri, kelimeler ve kalıplar oluşturma; toplu kelime ekleme.
- **Öğrenme:** Çevrilebilir ve kaydırılabilir kartlar, yazılı cevaplar, "bilmediklerim ve boş bıraktıklarım" tekrar listesi.
- **Soru çeşitleri:** Çoktan seçmeli, boşluk doldurma, çeviri ve paragraf.
- **Çalışma seçenekleri:** Öğren, Test ve süreli Deneme; içerik türü ve 20 / 50 / tümü seçimi.
- **Oyunlar:** Word Runner, Amiral Battı (botla), Eşleştirme, Bloklar ve Meteor Avı.
- **Keşfet:** Diğer kullanıcıların herkese açık setlerini ara, çalış veya kendi kütüphanene bağımsız kopya olarak ekle.
- **Gizli veya herkese açık setler:** Set oluştururken seçersin, istediğin zaman değiştirebilirsin. Setler varsayılan olarak yalnızca senindir; herkese açık seçersen Keşfet'te görünür.
- **Liderlik tablosu:** XP'ye göre global ve şehir sıralaması.
- **Profil ve arkadaşlar:** Profil fotoğrafı, kapak görseli, şehir ve seviye. Diğer kullanıcıları takip edebilir, onların profilini, herkese açık setlerini, takipçilerini ve takip ettiklerini görebilirsin.
- **Temalar:** Koyu ve açık tema.

## Başlangıç kütüphanesi

Hazır setler herkes için görünür. Kişisel setlerine otomatik eklenmez; ilerleme ve tekrar listeleri her kullanıcı için ayrı saklanır.

| Set | Kelime / kalıp | Soru |
| --- | ---: | ---: |
| A1 | 853 | 35 |
| A2 | 827 | 35 |
| B1 | 768 | 35 |
| B2 | 703 | 35 |
| C1 | 90 | 35 |
| YDS | 278 | 115 |
| YÖKDİL | 441 | 35 |

Toplam **3.960 kelime/kalıp kaydı ve 325 soru** vardır. Setler arasında ortak kelimeler bulunabilir. Soruların 245'i üretilmiş alıştırma, 80'i projeye sağlanan 2026 Nisan YDS PDF'indendir.

Kaynak sınavı çözmek için **YDS → Çalışılacak içerik → PDF’deki YDS soruları (80) → Test / Deneme** yolunu kullan. Sorular ve gerekli okuma parçaları kaynak görselleriyle gösterilir. Kaynak soru seçiminde deneme süresi 180 dakika, diğer seçimlerde 30 dakikadır.

## Gizlilik

- Setlerin varsayılan olarak **özeldir**. Yalnızca herkese açık yaptığın setler başkalarına görünür.
- Hesabıyla giriş yaptıysan adın, profil fotoğrafın, kapak görselin, şehrin, XP'n ve seviyen diğer üyelere görünür. E-posta adresin hiçbir zaman gösterilmez.
- Misafir olarak kullandığında verilerin yalnızca kendi tarayıcında kalır; sıralamada ve profillerde yer almazsın.

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

- Çevrimiçi PvP henüz yoktur; Amiral Battı botla oynanır.
- XP ve seviye rozetleri çalışma göstergesidir; resmî bir dil yeterlilik sonucu değildir.
- Misafir verileri aynı tarayıcıda saklanır; hesaba otomatik taşınmaz.

## Kaynaklar

- A1–B2 listeleri projeye sağlanan Ozan Dur hazırlamalı kelime PDF'lerinden; akademik ek kelimeler Ahmet Akın / Akın Dil YDS & YÖKDİL listesinden aktarılmıştır. Kaynaklar içeriklerde belirtilir.
- C1 seçkisi ve ek alıştırmalar proje için hazırlanmıştır; düzeyler yaklaşık çalışma etiketidir.
- Kaynak YDS soruları sağlanan PDF'nin görsellerini ve cevap anahtarını kullanır. PDF'nin resmî özgünlüğü bağımsız olarak doğrulanmamıştır. Üretilen sorular kaynak sınav sorularından ayrı işaretlenir.
