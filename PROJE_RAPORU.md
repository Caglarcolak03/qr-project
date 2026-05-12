# Web Programlama Dersi Dönem Projesi — Proje Raporu

---

## 1. Proje Konusu ve Amacı

Günümüzde pek çok küçük işletme hâlâ kâğıt menü ya da el ilanı kullanmaktadır. Bu yöntemin en büyük sorunu, fiyat değişikliği veya yeni ürün eklemesi gerektiğinde matbaa masrafı çıkması ve güncellemenin zaman almasıdır. Biz de bu problemi çözmek amacıyla **QR Menü Pro**'yu geliştirdik.

Uygulama sayesinde bir kafe, restoran, kuaför veya herhangi bir hizmet işletmesi; ürünlerini ve fiyatlarını birkaç dakika içinde dijital ortama taşıyabiliyor. İşletme sahibi sisteme girip bilgilerini güncelledikten sonra "Kaydet" tuşuna bastığında QR kodu anında hazır oluyor. Müşteri bu kodu telefonuyla okuttuğunda doğrudan menüye ulaşıyor; herhangi bir uygulama indirmesine gerek kalmıyor.

---

## 2. Hedef Kullanıcı

Uygulamada üç farklı kullanıcı tipi tanımladık:

- **İşletme Sahibi:** Sisteme kayıt olarak kendi menüsünü oluşturan ve yöneten kişi. Kategoriler ekleyebilir, ürün bilgilerini ve fiyatları dilediği zaman güncelleyebilir.
- **Müşteri:** QR kodu okutarak menüyü görüntüleyen son kullanıcı. Hesap açması ya da herhangi bir şey indirmesi gerekmez.
- **Admin:** Platformu denetleyen kişi. Tüm kayıtlı işletmeleri görebilir, arama yapabilir ve gerektiğinde menü silebilir.

---

## 3. Temel Özellikler

| Özellik | Açıklama |
|---|---|
| Kayıt / Giriş | Firebase Authentication ile e-posta ve şifre tabanlı kimlik doğrulama |
| Katalog Oluşturma | Kategori ve ürün ekleme; her ürüne ad, fiyat ve görsel eklenebilir |
| Görsel Önizleme | Dosya seçildiği anda küçük resim olarak anlık önizleme gösterilir |
| QR Kod Üretme | Kullanıcıya özgü bağlantı URL'si ile QR kod otomatik oluşturulur |
| Bulut Kayıt | Katalog verisi Firebase Firestore'a kaydedilir; farklı cihazlardan erişilebilir |
| Menü Düzenleme | Daha önce oluşturulmuş menü sonradan açılıp güncellenebilir |
| Müşteri Görünümü | QR okutulunca katalog, arama kutusu ve kategori filtreleriyle birlikte açılır |
| Admin Paneli | Tüm işletme menüleri listelenir; isim veya e-posta ile arama ve silme yapılabilir |
| Responsive Tasarım | Mobil, tablet ve masaüstü ekranlarında uyumlu görüntüleme |

---

## 4. Kullanılan Teknolojiler

| Katman | Teknoloji |
|---|---|
| Arayüz | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Kimlik Doğrulama | Firebase Authentication (E-posta / Şifre) |
| Veritabanı | Firebase Firestore (NoSQL) |
| QR Kod Üretimi | goQR.me REST API (`api.qrserver.com`) |
| İkonlar | Font Awesome 6 |
| Fontlar | Google Fonts — Plus Jakarta Sans |

Projeyi kasıtlı olarak sade tutmaya çalıştık. Webpack gibi bir derleme aracı ya da ayrı bir sunucu kurmak yerine, Firebase'in tarayıcı üzerinden doğrudan kullanılabilmesinden yararlandık. Bu sayede projeyi çalıştırmak için yalnızca bir HTTP sunucusu yeterli oluyor.

---

## 5. Veritabanı Yapısı

Firebase Firestore'da iki koleksiyon kullandık.

### `users` Koleksiyonu

Her kayıtlı kullanıcı için bir belge oluşturulur. Belge kimliği Firebase Authentication UID'sidir.

```
users/
  {uid}/
    email        : string   — kullanıcı e-postası
    isim         : string   — kayıt sırasında girilen ad soyad
    role         : string   — "owner" veya "admin"
    kayitTarihi  : string   — ISO 8601 tarih
```

### `menus` Koleksiyonu

Her işletme sahibine ait tek bir katalog belgesi bulunur. Belge kimliği kullanıcının UID'sidir.

```
menus/
  {uid}/
    c          : string   — işletme / katalog adı
    guncellendi: string   — son güncelleme tarihi (ISO 8601)
    items      : array
      []/
        k      : string   — kategori adı
        a      : string   — ürün adı
        f      : string   — fiyat
        i      : string   — görsel (base64 JPEG, maks. 400 px)
```

Görselleri neden Storage yerine Firestore'da sakladığımızı kısaca açıklamak gerekirse: Firebase Storage, geliştirme ortamında `localhost` kaynağından yapılan yüklemelere CORS hatası veriyor. Bunu aşmak için Canvas API ile görselleri 400 piksel sınırında JPEG formatına sıkıştırıp doğrudan belgeye gömdük.

**QR bağlantı formatı:** `<site-url>?menu={uid}` — müşteri bu URL'yi açtığında `menus/{uid}` belgesi Firestore'dan çekilir ve katalog ekrana yansıtılır.

---

## 6. Özgün Özellikler

### 6.1 Kullanıcıya Özgü QR Kod

Her işletme sahibinin QR kodu, kendi UID'sine bağlı benzersiz bir URL barındırır. Kod okutulduğunda yalnızca o kişiye ait menü yüklenir; başka hesapların verileriyle herhangi bir karışıklık olmaz.

### 6.2 Anlık Arama ve Kategori Filtreleme

Müşteri menüyü açtığında ekranın üstünde bir arama kutusu ve kategori butonları belirir. Hem arama hem de kategori filtresi eş zamanlı çalışır; kullanıcı yazarken sonuçlar anında güncellenir, sayfa yenilemesi gerekmez.

### 6.3 İki Kademeli Yönetim Paneli

Sisteme iki ayrı yönetim katmanı ekledik. İşletme sahipleri kendi menülerini "Menüm" ekranından istedikleri zaman düzenleyebilir. Admin rolüne sahip kullanıcılar ise ayrı bir panelden tüm kayıtlı menüleri görebilir, arama yapabilir ve uygunsuz içerikleri silebilir. Admin rolü, güvenlik gerekçesiyle yalnızca Firebase Console üzerinden atanabilmektedir.

---

## 7. Yapay Zeka Kullanım Açıklaması

Proje sürecinde zaman zaman yapay zeka araçlarından yararlandık. Özellikle Firebase entegrasyonu sırasında karşılaştığımız hata mesajlarını araştırmak, belirli kod bloklarının nasıl yazılacağını öğrenmek ve bazı CSS düzenlemelerini hızlandırmak için kullandık. Ancak üretilen her çıktıyı kendimiz inceledik, projeye uygun olmayan kısımları düzelttik ve gerektiğinde baştan yazdık.

Uygulamanın genel fikri, kullanıcı rolleri mimarisi, veri tabanı tasarımı ve hangi Firebase servislerinin kullanılacağına dair kararların tamamı grubumuz tarafından tartışılarak alındı. Yapay zeka bu süreçte bir kaynak gibi kullanıldı; projenin sahibi ve karar vereni olmadı.

---

## 8. Grup Üyelerinin Katkıları

| Üye | Katkı |
|---|---|
| Emre | Backend mimarisi, Firebase Authentication ve Firestore entegrasyonu, veri tabanı tasarımı |
| Ahmet Berat | Backend mantığı, kullanıcı rol sistemi, QR kod üretim akışı, veri tabanı yapılandırması |
| Yusuf | Arayüz tasarımı, HTML/CSS bileşenleri, responsive düzen, müşteri menüsü görünümü |
| Çağlar | Arayüz geliştirme, kategori ve ürün yönetim ekranları, admin paneli arayüzü |

---

*Teslim Tarihi: 18.05.2026*
