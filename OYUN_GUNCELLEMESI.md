# Wordshift 0.4.1 — Oyun güncellemesi

## Amiral Battı
Her geminin yanında ayrı Döndür düğmesi bulunur. Gemiyi yerleştirdikten sonra da bu düğme çalışır. Dönüş başlangıç hücresi etrafındadır; sınır/çakışma varsa yerleşim korunur ve açıklama gösterilir. Tek hücrelik geminin yönü değişmez. Gemiyi düğmesinden veya tahtadan seçip boş bir hücreye tıklayarak taşıyabilirsin. Üç gemi yerleşmeden savaş başlamaz. Rakip gemileri gizlidir.

## Word Runner
Engel sağdan yaklaşır. Karakterin önüne geldiğinde dünya durur, karakter yerinde koşar ve soru açılır. Bu anda 10 saniye başlar. Doğru cevap zıplama/eğilme ve tik; yanlış cevap/süre dolması çarpışma, can kaybı ve yanıp sönen yeniden doğuş oluşturur. Mevcut doğru/yanlış sesleri kullanılır. Engeller sırayla zıplama ve eğilme ister.

## Nasıl kullanılır?
Bu ZIP tam projedir. Bilgisayarındaki güncel proje klasörüne içindekileri kopyalayıp aynı isimli dosyaları değiştir. Varsa .git klasörünü koru. Başka bir klasörün içine fazladan proje klasörü ekleme.
Yerelde Node.js kuruluysa proje klasöründeki terminalde `npm start` çalıştır; tarayıcıdan http://localhost:3000 aç ve Misafir olarak dene seç.
GitHub'a henüz gönderilmedi. Canlı siteye yansıtmak için mevcut repoya commit/push gerekir. Supabase SQL'ini tekrar çalıştırman gerekmez.

## Kontrol
`npm run check` sözdizimini, `npm run test:games` gemi geometrisi ve koşu oyunu aşamalarını denetler. Bu ortam tarayıcı çalıştırmayı engellediğinden görsel tarayıcı testi yapılamadı. Bulut giriş ve kayıt sistemi bu güncellemenin test kapsamı dışında.
