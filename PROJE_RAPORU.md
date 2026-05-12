# Web Programlama Dersi Dönem Projesi — Proje Raporu

---

## 1. Proje Konusu ve Amacı

Bu proje, işletmelerin (restoran, kafe, kuaför, mağaza vb.) ürün ve hizmet kataloglarını dijital ortama taşımasını sağlayan bir **QR Menü Oluşturma** web uygulamasıdır.

Geleneksel kâğıt menülerin yenilenmesi maliyetlidir ve anlık güncelleme imkânı sunmaz. Bu uygulama ile işletme sahipleri dakikalar içinde dijital katalog oluşturabilir, içerikleri istedikleri zaman güncelleyebilir ve ürettikleri QR kodu müşterileriyle paylaşabilir. Müşteri QR'ı okuttuğunda katalog doğrudan açılır; herhangi bir uygulama indirmesine gerek yoktur.

---

## 2. Hedef Kullanıcı

- **İşletme sahipleri:** Kafe, restoran, kuaför, mağaza gibi hizmet sektöründe faaliyet gösteren işletme sahipleri. Kayıt olarak kendi kataloglarını oluşturur ve yönetirler.
- **Müşteriler:** QR kodu okutan son kullanıcılar. Uygulama üzerinde hesap açmalarına gerek yoktur; QR kodunu okutarak kataloga erişirler.
- **Admin:** Platformu yöneten kişi. Tüm kayıtlı işletmeleri görebilir, içerik denetimi yapabilir ve gerektiğinde menü silebilir.

---

## 3. Temel Özellikler

| Özellik | Açıklama |
|---|---|
| Kayıt / Giriş | Firebase Authentication ile e-posta ve şifre tabanlı kimlik doğrulama |
| Katalog Oluşturma | Kategori ve ürün ekleme; her ürüne ad, fiyat ve görsel eklenebilir |
| Görsel Önizleme | Dosya seçildiği anda thumbnail olarak önizleme gösterilir |
| QR Kod Üretme | Kullanıcıya özgü bağlantı URL'si ile QR kod otomatik oluşturulur |
| Bulut Kayıt | Katalog verisi Firebase Firestore'a kaydedilir; farklı cihazlardan erişilebilir |
| Müşteri Görünümü | QR okutulunca katalog arama ve kategori filtreleme ile birlikte açılır |
| Admin Paneli | Tüm işletme menüleri listelenir; isim veya e-posta ile arama yapılabilir; silme işlemi gerçekleştirilebilir |
| Responsive Tasarım | Mobil, tablet ve masaüstü ekranlarında uyumlu görüntüleme |

---

## 4. Kullanılan Teknolojiler

| Katman | Teknoloji |
|---|---|
| Arayüz | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Kimlik Doğrulama | Firebase Authentication (Email/Password) |
| Veritabanı | Firebase Firestore (NoSQL) |
| QR Kod Üretimi | goQR.me REST API (`api.qrserver.com`) |
| İkonlar | Font Awesome 6 |
| Fontlar | Google Fonts — Plus Jakarta Sans |

Projenin tüm arayüzü tek bir HTML dosyasından oluşmaktadır. Herhangi bir ön derleme adımı (webpack, bundler) ya da backend sunucu gerektirmez; Firebase servisleri doğrudan tarayıcı üzerinden kullanılmaktadır.

---

## 5. Veritabanı Yapısı

Firebase Firestore'da iki koleksiyon kullanılmaktadır.

### `users` Koleksiyonu

Her kayıtlı kullanıcı için bir belge oluşturulur. Belge kimliği Firebase Authentication UID'sidir.

```
users/
  {uid}/
    email        : string   — kullanıcı e-postası
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
        i      : string   — görsel (base64 JPEG, maks. 400px)
```

**QR kod bağlantısı:** `<site-url>?menu={uid}` — müşteri bu URL'yi açtığında `menus/{uid}` belgesi Firestore'dan çekilir ve katalog render edilir.

---

## 6. Özgün Özellikler

### 6.1 Kullanıcıya Özgü QR Kod Bağlantısı
Her işletme sahibinin QR kodu kendi UID'sine bağlı benzersiz bir URL içerir. QR okutulduğunda ilgili katalog doğrudan Firestore'dan yüklenir; başka bir kullanıcının verisi ile karışmaz.

### 6.2 Anlık Arama ve Kategori Filtreleme (Müşteri Görünümü)
Müşteri katalogu açıldığında sayfanın üstünde ürün arama kutusu ve kategori filtreleme butonları sunulur. Arama ve kategori filtresi aynı anda çalışır; herhangi bir sayfa yenilemesi gerektirmez.

### 6.3 Admin Yönetim Paneli
`role: "admin"` olarak tanımlanmış kullanıcılar, giriş yaptıklarında navbarda Admin Paneli butonu görür. Bu panel üzerinden tüm kayıtlı işletmeler listelenebilir, isim veya e-posta ile arama yapılabilir, menüler görüntülenebilir ve silinebilir.

---

## 7. Yapay Zeka Kullanım Açıklaması

Bu projede yapay zeka (Claude — Anthropic) aşağıdaki alanlarda kullanılmıştır:

**Doğrudan kullanılan çıktılar:**
- Firebase Authentication, Firestore ve Storage entegrasyon kodu
- Admin paneli bileşeni (kart tasarımı, arama filtresi, silme işlemi)
- Müşteri görünümündeki arama ve kategori filtreleme mantığı
- CSS bileşenleri (filtre butonları, görsel önizleme, QR placeholder)

**Grup tarafından geliştirilen / yönlendirilen kısımlar:**
- Projenin genel fikri ve kapsamı
- Kullanıcı rolleri (owner / admin) mimarisi kararı
- Firebase servis seçimleri (Storage yerine Firestore'da base64 saklama kararı)
- Hata ayıklama ve test sürecinin yönetimi
- Arayüz düzenine ilişkin tasarım kararları

Yapay zeka çıktıları doğrudan kopyalanmamış; her bölüm proje gereksinimlerine göre yönlendirilerek ve sonuçlar kontrol edilerek kullanılmıştır.

---

## 8. Grup Üyelerinin Katkıları

| Üye | Katkı |
|---|---|
| [İsim 1] | |
| [İsim 2] | |
| [İsim 3] | |

---

*Teslim Tarihi: 18.05.2026*
