# Wordshift v0.4 kurulumu

1. Supabase projesinde SQL Editor → New query aç. `supabase/setup.sql` dosyasının TAMAMINI yapıştırıp Run'a bas. Başarılı tamamlanmadan yeni frontend'i yayınlama.
2. Authentication → URL Configuration ekranında Site URL ve Redirect URLs alanına `https://goktoog.github.io/Wordshift_v0.3/` ekle. Yerelde test için Redirect URLs listesine `http://localhost:3000/` da eklenebilir.
3. Authentication bölümünde Email sağlayıcısını ve e-posta doğrulamasını etkin tut.
4. Bu ZIP'in dosyalarını mevcut GitHub deposundakilerle güncelle. Repo adını değiştirme. Actions dağıtımı tamamlandıktan sonra siteyi yenile.
5. Yeni bir hesap oluştur, e-postandaki bağlantıyı aç ve giriş yap. Eski yerel demo hesabı Supabase hesabı değildir.
6. Bir set ve kart oluştur. Üstte “Buluta kaydedildi” görünmeli. Çıkış yapıp başka tarayıcıdan aynı hesapla gir; kartın geldiğini doğrula.
7. İkinci farklı hesap açıp ilk hesabın özel setlerinin görünmediğini kontrol et. Profil resmi ve kapak görselini yükleyip yeniden girişte korunmasını doğrula.

## Bu sürümün kapsamı

Gerçek Supabase Auth giriş/kayıt, e-posta doğrulaması ve oturum yenileme; kullanıcıya özel bulut çalışma alanı; Storage üzerinden profil/kapak yükleme. İlk geçişte mevcut arayüzü korumak için klasör, set, kart, profil ve kişisel ilerleme JSONB çalışma alanı kaydında tutulur. İlerleyen sürümde arama ve paylaşım için ayrı ilişkisel tablolara taşınabilir.

Online leaderboard, topluluk setleri, parola sıfırlama arayüzü ve PvP bu sürüme dahil değildir. XP ve seviye halen kişisel istemci istatistiğidir, rekabetçi skor değildir. Özel setler diğer kullanıcılara açılmaz. Görsel deposu public olduğu için yüklenen profil görselinin URL'sini bilen görüntüleyebilir. Eski görseller değiştirilince otomatik silinmez; kota yönetimi sonraki aşamada eklenmelidir.

Önceki demo verileri otomatik olarak gerçek hesaba aktarılmaz. Geçişten önce eski sürümden “Verileri indir” ile yedek al. Misafir verileri yerelde kalır. Kaydedilemedi uyarısında verileri indirerek yedekle; başka cihazda değişiklik yapıldıysa yedeği aldıktan sonra sayfayı yenile.

SQL ve kimlik doğrulama gerçek projede henüz çalıştırılmadı; canlı kayıt, oturum, erişim izolasyonu ve görsel yükleme yukarıdaki adımlarla doğrulanmalıdır. Kodun sözdizimi kontrol edildi. Önceki `scripts/smoke.mjs` yerel demo içindir; online sürüm için geçerli entegrasyon testi değildir.

Bağlantı için yalnız publishable key kullanılır. Gizli sunucu anahtarı hiçbir frontend dosyasına konulmaz.
