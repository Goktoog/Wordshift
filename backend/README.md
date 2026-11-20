# Backend

Şu an sadece `dev-server.js` vardır. Statik frontend sunar ve geliştirme kolaylığı sağlar; üretim kimlik doğrulaması veya veritabanı işlemi yapmaz.

Gerçek sunucu kurulurken bu klasöre API uygulaması (`src/routes`, `src/services`, `src/middleware`, `src/repositories`, `src/realtime`) ve bağımsız `package.json` eklenebilir. Önce Supabase Auth ve Postgres bağlantısı, sonra profil/yükleme, sonuç doğrulama ve PvP geliştirilmelidir. Sunucu sırları sadece sunucudaki ortam değişkenlerinde tutulur. Frontend dağıtımına backend veya .env dosyaları dahil edilmez.
