# Üretim mimarisi (sonraki aşamalar)

## Öneri

GitHub repo kaynak kodu ve değişiklik geçmişini; GitHub Pages HTML/CSS/JS arayüzünü barındırır. Supabase Auth, PostgreSQL ve Storage gerçek hesapları, verileri ve profil görsellerini sağlar. PvP ve güvenilir skorlar için bağımsız Node.js + Socket.IO sunucusu (ör. Render) kullanılır. Bu servisler henüz kurulmuş veya bağlanmış değildir.

## Veri modeli

| Tablo | Temel alanlar |
|---|---|
| auth.users | kimlik sağlayıcısının kullanıcı ID'si ve doğrulama bilgisi |
| profiles | user_id, display_name, avatar_path, banner_path, city, privacy |
| folders | id, owner_id, title |
| study_sets | id, owner_id, folder_id, title, visibility |
| items | id, set_id, type, prompt, correct_answer, options, level, explanation |
| study_sessions | id, user_id, set_id, mode, started_at, ended_at |
| answers | id, session_id, item_id, correctness, answered_at |
| mastery | user_id, item_id, attempts, correct_count, next_review_at |
| ratings | user_id, estimated_cefr, ranked_rating, updated_at |
| matches | id, game_type, state, started_at, ended_at |
| match_players | match_id, user_id, result, rating_change |
| score_events | id, user_id, source_id, validated_xp, created_at |

## Veri güvenliği

Her kullanıcı sadece kendi özel çalışma setlerini değiştirebilir. RLS politikaları ve API oturum doğrulaması gerekir; public profile yalnızca görünmesine izin verilen alanları açar. Şifreler uygulama tablolarına yazılmaz; auth servisi yönetir. Liderlik ve seviye değişimleri istemcinin beyan ettiği puana göre değil doğrulanmış sunucu işlemlerine göre hesaplanır. Profil görselleri nesne deposunda saklanır; yükleme boyutu, MIME doğrulaması, görsel işleme, kullanıcı başına kota, raporlama/silme ve moderasyon gerekir. Arbitrary dosyaları ve çalıştırılabilir dosyaları kabul etme. Şehir bilgilendirmesi isteğe bağlıdır; konum izni ve yaklaşık şehir seçimi yeterli olabilir, kesin koordinat saklamak gerekmez.

## Geçiş sırası

1. Supabase projesi, Auth, e-posta doğrulama, PostgreSQL şeması, erişim politikaları.
2. Yerel veri katmanını gerçek API/SDK bağlantısı ile değiştir; mevcut demo verilerini kullanıcı onayıyla içe aktar.
3. Avatar ve kapak görsellerini Storage'a yükle; düzenleme ve silme.
4. Gerçek oturum/deneme kayıtları, tekrar zamanlaması, XP ve sıralamalar.
5. Node.js + Socket.IO ile yetkili maç sunucusu; kullanıcı seviyesi ve puanına göre eşleşme, sıra ve süre doğrulama, bağlantı kopması ve yeniden bağlanma.
6. Mobil/masaüstü işlev testleri, güvenlik testleri, oran sınırlama, yedekleme ve izleme.

GitHub Pages sunucu veya veritabanı değildir. Render ücretsiz servislerinde boşta uyuma ve geçici dosya sistemi olabilir; kalıcı kullanıcı verilerini oradaki yerel diske yazma. Supabase/Render plan limitlerini proje kullanımına göre gözden geçir.
