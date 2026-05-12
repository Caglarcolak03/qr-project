// ─────────────────────────────────────────────────────────────────────────────
// QR Menü Pro — Uygulama Mantığı
//
// Mimari not: Bu, derleme adımı gerektirmeyen tek sayfalı bir uygulamadır.
// Firebase SDK'ları, Google CDN'den ES modülü olarak yüklenir; bundler gerekmez.
// HTML onclick öznitelikleri modül kapsamına erişemediğinden, dışarıdan
// çağrılması gereken tüm fonksiyonlar açıkça `window.*` üzerine atanmıştır.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ── Firebase Başlatma ─────────────────────────────────────────────────────────
const firebaseYapılandırma = {
    apiKey: "AIzaSyBWOftjFRHdeSKvTNs9PdSqe2qx3OaAE0w",
    authDomain: "qr-project-be489.firebaseapp.com",
    projectId: "qr-project-be489",
    storageBucket: "qr-project-be489.firebasestorage.app",
    messagingSenderId: "610728679687",
    appId: "1:610728679687:web:7a735b5918a5c0cfa98da2",
    measurementId: "G-QRGKK87EET"
};

const uygulama  = initializeApp(firebaseYapılandırma);
const analitik  = getAnalytics(uygulama);
const kimlikDoğr = getAuth(uygulama);
const veritabanı = getFirestore(uygulama);

// ── Modül Düzeyi Durum ────────────────────────────────────────────────────────

// Açık formun giriş mi yoksa kayıt formu mu olduğunu tutar.
let formModu = 'kayit';

// Oturum içinde kategori DOM elemanlarını benzersiz tutmak için artan sayaç.
let kategoriSayac = 0;

// Müşteri görünümünde gösterilen Firestore menü belgesini tutar.
let musteriMenuVerisi = null;

// applyMenuFilters'ın modül sınırı ötesinde okuyabilmesi için window'a atandı.
window.secilenKategori = 'Tümü';

// ── Kimlik Durumu Gözlemcisi ──────────────────────────────────────────────────
// Her sayfa yüklenişinde ve giriş/çıkış sonrasında tetiklenir.
// Kullanıcının Firestore'daki rolüne göre navbar'ı yeniden oluşturur.
onAuthStateChanged(kimlikDoğr, async (kullanici) => {
    if (kullanici) {
        let rol = 'owner';
        let gorunenIsim = kullanici.email;
        try {
            const kullaniciDoc = await getDoc(doc(veritabanı, "users", kullanici.uid));
            if (kullaniciDoc.exists()) {
                rol        = kullaniciDoc.data().role || 'owner';
                gorunenIsim = kullaniciDoc.data().isim || kullanici.email;
            }
        } catch (e) { /* kritik değil; varsayılanlara geri dön */ }

        // Admin butonu yalnızca Firestore'da role === "admin" olan kullanıcılara gösterilir.
        // Rol ataması Firebase Console üzerinden manuel yapılır; UI'dan değiştirilemez.
        const adminButonu = rol === 'admin'
            ? `<button class="buttonÖz" onclick="window.adminPaneliniAc()" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 12px rgba(245,158,11,0.3);padding:8px 16px;font-size:13px;">
                   <i class="fa-solid fa-shield-halved"></i> Admin Paneli
               </button>`
            : '';

        const menuButonu = rol === 'owner'
            ? `<button class="buttonÖz" onclick="window.menuyuDuzenlemeYukle()" style="padding:8px 16px;font-size:13px;">
                   <i class="fa-solid fa-list"></i> Menüm
               </button>`
            : '';

        document.getElementById("authButtons").innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                ${adminButonu}${menuButonu}
                <span style="font-weight:700; color:var(--primary); background: rgba(79,70,229,0.1); padding: 8px 16px; border-radius: 12px; font-size:14px;">
                    <i class="fa-solid fa-circle-user"></i> ${gorunenIsim}
                </span>
                <button class="buttonÖz" onclick="window.cikisYap()" style="background:#fee2e2; color:var(--danger); border:none; padding:8px 15px; box-shadow:none; font-size:13px;">Çıkış</button>
            </div>`;

        document.getElementById("mainQrBtn").style.backgroundColor = "var(--primary)";
        document.getElementById("mainQrBtn").style.color = "white";
    } else {
        document.getElementById("authButtons").innerHTML = `
            <button class="buttonÖz" id="navLoginBtn"    onclick="window.kimlikFormunuAc('giris')" style="background: transparent; color: var(--primary); border: 2px solid var(--primary); box-shadow: none;"> Giriş Yap </button>
            <button class="buttonÖz" id="navRegisterBtn" onclick="window.kimlikFormunuAc('kayit')"> Ücretsiz Kayıt Ol </button>`;

        document.getElementById("mainQrBtn").style.backgroundColor = "white";
        document.getElementById("mainQrBtn").style.color = "var(--primary)";
    }
});

// ── Tarayıcı Geçmişi (SPA geri tuşu desteği) ─────────────────────────────────
window.onpopstate = function (olay) {
    tumPanelleriGizle();
    if (olay.state && olay.state.panel === 'form') {
        window.kimlikFormunuAc(olay.state.mod, true);
    } else if (olay.state && olay.state.panel === 'menu') {
        window.menuDuzenleyiciAc(true);
    } else {
        window.anasayfayaDon(true);
    }
};

// ── URL Tabanlı Menü Yükleme ──────────────────────────────────────────────────
// QR kodu okunduğunda URL ?menu={sahibUID} içerir. Ana sayfa atlanarak
// sahibin Firestore belgesi doğrudan çekilir ve müşteri görünümü açılır.
window.addEventListener('load', async () => {
    const menuId = new URLSearchParams(window.location.search).get('menu');
    if (menuId) {
        try {
            const belge = await getDoc(doc(veritabanı, "menus", menuId));
            if (belge.exists()) {
                musteriMenusunuGoster(belge.data());
            } else {
                alert("Menü bulunamadı.");
                window.anasayfayaDon(true);
            }
        } catch (e) {
            console.error("Menü yüklenemedi:", e);
            window.anasayfayaDon(true);
        }
    } else {
        window.anasayfayaDon(true);
    }
});

// ── Panel Geçişleri ───────────────────────────────────────────────────────────

// Her view panelini gizler ve navbar'ı geri getirir.
// Yeni bir panel göstermeden önce çağrılması gerekir; üst üste binmeyi önler.
function tumPanelleriGizle() {
    document.body.classList.remove("sade-arka-plan");
    document.getElementById("anaIcerik").style.display     = "none";
    document.getElementById("formKutusu").style.display    = "none";
    document.getElementById("menuPaneli").style.display    = "none";
    document.getElementById("musteriMenusu").style.display = "none";
    document.getElementById("adminPaneli").style.display   = "none";
    document.getElementById("navbar").style.display        = "flex";
}

window.kimlikFormunuAc = function (mod, gecmisMi = false) {
    formModu = mod;
    tumPanelleriGizle();
    document.body.classList.add("sade-arka-plan");
    document.getElementById("formKutusu").style.display = "flex";

    const kayitMi = mod === 'kayit';
    document.getElementById("formBaslik").innerText      = kayitMi ? "Kayıt Ol"  : "Giriş Yap";
    document.getElementById("formSubmitBtn").innerText   = kayitMi ? "Kayıt Ol"  : "Giriş Yap";
    document.getElementById("userName").style.display    = kayitMi ? "block"     : "none";

    if (!gecmisMi) history.pushState({ panel: 'form', mod }, "");
};

window.kimlikFormunuKapat = function () { history.back(); };

window.anasayfayaDon = function (gecmisMi = false) {
    tumPanelleriGizle();
    document.getElementById("anaIcerik").style.display = "block";
    if (!gecmisMi) history.pushState({ panel: 'home' }, "");
};

// ── Kimlik Doğrulama ──────────────────────────────────────────────────────────

window.kimlikDogrula = async function () {
    const eposta  = document.getElementById("userEmail").value.trim();
    const sifre   = document.getElementById("userPassword").value;
    const buton   = document.getElementById("formSubmitBtn");

    if (!eposta || !sifre) { alert("E-posta ve şifre giriniz."); return; }

    buton.disabled  = true;
    buton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lütfen bekleyin...';

    try {
        if (formModu === 'kayit') {
            const kimlik = await createUserWithEmailAndPassword(kimlikDoğr, eposta, sifre);
            const isim   = document.getElementById("userName").value.trim();
            // Kullanıcı profili Firebase Auth'un yanı sıra Firestore'a da kaydedilir.
            // Varsayılan rol "owner"dır; "admin" yalnızca Console'dan atanabilir.
            await setDoc(doc(veritabanı, "users", kimlik.user.uid), {
                email: eposta,
                isim,
                role: 'owner',
                kayitTarihi: new Date().toISOString()
            });
        } else {
            await signInWithEmailAndPassword(kimlikDoğr, eposta, sifre);
        }
        window.anasayfayaDon();
    } catch (hata) {
        const hataMesajlari = {
            'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
            'auth/invalid-email':        'Geçersiz e-posta adresi.',
            'auth/weak-password':        'Şifre en az 6 karakter olmalı.',
            'auth/user-not-found':       'E-posta veya şifre hatalı.',
            'auth/wrong-password':       'E-posta veya şifre hatalı.',
            'auth/invalid-credential':   'E-posta veya şifre hatalı.',
        };
        alert(hataMesajlari[hata.code] || 'Bir hata oluştu: ' + hata.message);
    } finally {
        buton.disabled  = false;
        buton.innerText = formModu === 'kayit' ? "Kayıt Ol" : "Giriş Yap";
    }
};

window.cikisYap = async function () {
    if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
        await signOut(kimlikDoğr);
        window.anasayfayaDon();
    }
};

// ── Menü Düzenleyici ──────────────────────────────────────────────────────────

window.menuDuzenleyiciAc = function (gecmisMi = false) {
    if (!kimlikDoğr.currentUser) {
        alert("Lütfen önce giriş yapın!");
        window.kimlikFormunuAc('giris');
        return;
    }
    tumPanelleriGizle();
    document.body.classList.add("sade-arka-plan");
    document.getElementById("menuPaneli").style.display = "block";
    // İlk açılışta editörün en az bir kategori satırı içermesi sağlanır.
    if (document.getElementById("kategoriListesi").children.length === 0) {
        window.kategoriEkle();
    }
    if (!gecmisMi) history.pushState({ panel: 'menu' }, "");
};

// Tek bir ürün satırının iç HTML'ini döndürür.
// `urun` verildiğinde alanlar önceden doldurulur (düzenleme modu).
// Mevcut base64 görsel, data-existing içinde saklanarak kayıt sırasında korunur.
function urunSatiriOlustur(urun = null) {
    const ad    = urun ? (urun.a || '') : '';
    const fiyat = urun ? (urun.f || '') : '';
    const gorsel = urun && urun.i ? urun.i : '';
    return `
        <input type="text"  placeholder="Ürün Adı" class="inputStil urun-ad"    style="width:40%;" value="${ad}">
        <input type="text"  placeholder="Fiyat"    class="inputStil urun-fiyat" style="width:18%;" value="${fiyat}">
        <div class="dosya-alan">
            <input type="file" class="dosya-sec urun-img" accept="image/*" data-existing="${gorsel}">
            <img class="urun-onizleme ${gorsel ? 'goster' : ''}" src="${gorsel}" alt="önizleme">
        </div>
        <button type="button" onclick="this.closest('.urun-satiri').remove()" title="Ürünü kaldır"
            style="background:#fee2e2;color:var(--danger);border:none;padding:6px 8px;border-radius:8px;cursor:pointer;flex-shrink:0;font-size:11px;">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
}

// Satırdaki dosya inputuna FileReader tabanlı önizleme dinleyicisi bağlar.
// Her urunSatiriOlustur() çağrısından hemen sonra çağrılmalıdır.
function gorselOnizlemeBagla(satirElemani) {
    const dosyaInput = satirElemani.querySelector(".urun-img");
    const onizleme   = satirElemani.querySelector(".urun-onizleme");
    dosyaInput.addEventListener("change", function () {
        if (this.files && this.files[0]) {
            const okuyucu = new FileReader();
            okuyucu.onload = (e) => {
                onizleme.src = e.target.result;
                onizleme.classList.add("goster");
            };
            okuyucu.readAsDataURL(this.files[0]);
        }
    });
}

window.kategoriEkle = function () {
    kategoriSayac++;
    const liste   = document.getElementById("kategoriListesi");
    const katDiv  = document.createElement("div");
    katDiv.className = "kategori-kutu";
    katDiv.id        = "kat-container-" + kategoriSayac;
    katDiv.innerHTML = `
        <button class="kat-sil-btn" onclick="window.kategoriKaldir(${kategoriSayac})"><i class="fa-solid fa-trash"></i></button>
        <input type="text" class="kategori-baslik-input kat-baslik" placeholder="Kategori Adı (Örn: Pideler)">
        <div id="liste-urunler-${kategoriSayac}">
            <div class="urun-satiri">${urunSatiriOlustur()}</div>
        </div>
        <button class="buttonÖz" style="background-color:#ffffff;color:var(--primary);padding:10px 18px;font-size:13px;box-shadow:var(--shadow-sm);margin-top:10px;border:1px solid #e2e8f0;"
            onclick="window.urunSatiriEkle(${kategoriSayac})">
            <i class="fa-solid fa-plus"></i> Yeni Ürün
        </button>
    `;
    liste.appendChild(katDiv);
    gorselOnizlemeBagla(katDiv.querySelector(".urun-satiri"));
};

window.kategoriKaldir = function (id) {
    if (confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
        document.getElementById("kat-container-" + id).remove();
    }
};

window.urunSatiriEkle = function (kategoriId) {
    const liste = document.getElementById("liste-urunler-" + kategoriId);
    const satir = document.createElement("div");
    satir.className = "urun-satiri";
    satir.innerHTML = urunSatiriOlustur();
    liste.appendChild(satir);
    gorselOnizlemeBagla(satir);
};

// Görseli en uzun kenarı en fazla 400 piksel olacak şekilde yeniden boyutlandırır
// ve JPEG base64 döndürür. Görseller, geliştirme ortamında localhost kaynaklı
// Firebase Storage CORS sorununu aşmak için Firestore belgesine gömülür.
function gorseli64eSikistir(dosya) {
    return new Promise((coz) => {
        if (!dosya) { coz(null); return; }
        const okuyucu = new FileReader();
        okuyucu.onload = (e) => {
            const gorsel = new Image();
            gorsel.onload = () => {
                const MAKS = 400;
                let g = gorsel.width, y = gorsel.height;
                if (g > y) { if (g > MAKS) { y *= MAKS / g; g = MAKS; } }
                else        { if (y > MAKS) { g *= MAKS / y; y = MAKS; } }
                const tuval = document.createElement('canvas');
                tuval.width  = g;
                tuval.height = y;
                tuval.getContext('2d').drawImage(gorsel, 0, 0, g, y);
                coz(tuval.toDataURL('image/jpeg', 0.85));
            };
            gorsel.src = e.target.result;
        };
        okuyucu.readAsDataURL(dosya);
    });
}

// ── Menü Kaydet ve QR Oluştur ─────────────────────────────────────────────────
window.menuKaydetVeQrOlustur = async function () {
    const kullanici = kimlikDoğr.currentUser;
    if (!kullanici) return;

    const buton = document.getElementById("qrOlusturBtn");
    buton.disabled  = true;
    buton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Firebase\'e kaydediliyor...';

    try {
        const isletmeAdi = document.getElementById("cafeAdi").value || "İşletme Kataloğu";
        const urunler    = [];

        for (const katKutu of document.getElementsByClassName("kategori-kutu")) {
            const kategoriAdi = katKutu.querySelector(".kat-baslik").value || "Genel";
            for (const satir of katKutu.querySelectorAll(".urun-satiri")) {
                const ad          = satir.querySelector(".urun-ad").value.trim();
                const fiyat       = satir.querySelector(".urun-fiyat").value.trim();
                const gorselInput = satir.querySelector(".urun-img");
                const yeniDosya   = gorselInput.files[0];
                // Kullanıcı yalnızca metin alanlarını düzenlediğinde mevcut base64 korunur.
                const mevcutGorsel = gorselInput.dataset.existing || null;
                if (ad) {
                    const base64 = yeniDosya ? await gorseli64eSikistir(yeniDosya) : mevcutGorsel;
                    urunler.push({ k: kategoriAdi, a: ad, f: fiyat, i: base64 });
                }
            }
        }

        // Her sahibin tek belgesi vardır (belge kimliği = UID); her kayıtta üzerine yazılır.
        await setDoc(doc(veritabanı, "menus", kullanici.uid), {
            c:           isletmeAdi,
            items:       urunler,
            guncellendi: new Date().toISOString()
        });

        // QR kodu ?menu={uid} URL'sini kodlar; okutulunca aynı sayfa müşteri görünümüyle açılır.
        const menuLinki = window.location.origin + window.location.pathname + "?menu=" + kullanici.uid;
        const qrGorsel  = document.getElementById("qrResim");
        qrGorsel.src    = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(menuLinki);
        qrGorsel.style.display = "block";
        document.getElementById("qrPlaceholder").style.display = "none";
        document.getElementById("qrCiktisi").style.display     = "block";
        document.getElementById("previewBtn").onclick = () => window.open(menuLinki, '_blank');
        document.getElementById("qrCiktisi").scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error(e);
        alert("Hata: " + e.message);
    } finally {
        buton.disabled  = false;
        buton.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> KATALOĞU VE QR KODU OLUŞTUR';
    }
};

// ── Admin Paneli ──────────────────────────────────────────────────────────────
window.adminPaneliniAc = async function () {
    tumPanelleriGizle();
    document.body.classList.add("sade-arka-plan");
    const panel = document.getElementById("adminPaneli");
    panel.style.display = "block";
    panel.innerHTML = `<div style="text-align:center;padding:60px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:36px;color:var(--primary);"></i></div>`;

    try {
        // Paralel çekme, Firestore round-trip sayısını en aza indirir.
        const [menuSonucu, kullaniciSonucu] = await Promise.all([
            getDocs(collection(veritabanı, "menus")),
            getDocs(collection(veritabanı, "users"))
        ]);

        const kullanicilar = {};
        kullaniciSonucu.forEach(b => { kullanicilar[b.id] = b.data(); });

        let html = `
            <h2 style="text-align:center;font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:8px;">
                <i class="fa-solid fa-shield-halved" style="color:#f59e0b;"></i> Admin Paneli
            </h2>
            <p style="text-align:center;color:var(--text-gray);margin-bottom:24px;">${menuSonucu.size} işletme kayıtlı</p>
            <input type="text" id="adminArama" placeholder="🔍  İşletme adı veya e-posta ara..." class="inputStil" oninput="window.adminFiltrele()" style="margin-bottom:24px;">
            <div id="adminKartlar" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px;">
        `;

        if (menuSonucu.empty) {
            html += `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-gray);font-size:16px;font-weight:600;">Henüz kayıtlı menü yok.</div>`;
        } else {
            menuSonucu.forEach(b => {
                const menu      = b.data();
                const sahip     = kullanicilar[b.id] || {};
                const menuLinki = window.location.origin + window.location.pathname + "?menu=" + b.id;
                const tarih     = menu.guncellendi ? new Date(menu.guncellendi).toLocaleDateString('tr-TR') : '-';

                const urunlerHTML = (menu.items || []).map((urun, idx) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;gap:8px;">
                        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                            ${urun.i
                                ? `<img src="${urun.i}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
                                : '<div style="width:36px;height:36px;background:#f1f5f9;border-radius:8px;flex-shrink:0;"></div>'}
                            <span style="font-size:13px;font-weight:600;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${urun.a}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                            <span style="font-size:13px;font-weight:700;color:var(--primary);">${urun.f}</span>
                            <button onclick="window.adminUrunuSil('${b.id}',${idx})"
                                style="background:#fee2e2;color:var(--danger);border:none;padding:5px 8px;border-radius:7px;cursor:pointer;font-size:11px;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');

                html += `
                    <div data-isletme="${menu.c.toLowerCase()}" data-email="${(sahip.email || '').toLowerCase()}"
                        style="background:white;border-radius:20px;padding:24px;border:2px solid #f1f5f9;box-shadow:var(--shadow-sm);transition:0.3s;"
                        onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='#f1f5f9'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                            <h3 style="margin:0;font-size:17px;font-weight:800;color:var(--text-dark);">${menu.c}</h3>
                            <button onclick="window.adminMenuuSil('${b.id}')"
                                style="background:#fee2e2;color:var(--danger);border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <p style="margin:0 0 5px;font-size:13px;color:var(--text-gray);"><i class="fa-solid fa-envelope" style="width:16px;"></i> ${sahip.email || 'Bilinmiyor'}</p>
                        <p style="margin:0 0 5px;font-size:13px;color:var(--text-gray);"><i class="fa-solid fa-box"      style="width:16px;"></i> ${menu.items ? menu.items.length : 0} ürün</p>
                        <p style="margin:0 0 14px;font-size:13px;color:var(--text-gray);"><i class="fa-solid fa-calendar" style="width:16px;"></i> ${tarih}</p>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                            <a href="${menuLinki}" target="_blank"
                                style="display:inline-flex;align-items:center;gap:6px;background:var(--primary);color:white;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
                                <i class="fa-solid fa-eye"></i> Görüntüle
                            </a>
                            <button onclick="window.urunListesiToggle('${b.id}',this)"
                                style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;color:var(--text-dark);border:none;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
                                <i class="fa-solid fa-box"></i> Ürünleri Gör
                            </button>
                        </div>
                        <div id="urunler-${b.id}" style="display:none;margin-top:8px;">
                            ${urunlerHTML || '<p style="color:var(--text-gray);font-size:13px;">Ürün yok.</p>'}
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        panel.innerHTML = html;
    } catch (e) {
        panel.innerHTML = `<p style="color:var(--danger);text-align:center;font-size:16px;">Hata: ${e.message}</p>`;
    }
};

window.adminUrunuSil = async function (menuId, idx) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
        const belge = await getDoc(doc(veritabanı, "menus", menuId));
        if (!belge.exists()) return;
        const veri = belge.data();
        veri.items.splice(idx, 1);
        await setDoc(doc(veritabanı, "menus", menuId), veri);
        window.adminPaneliniAc();
    } catch (e) { alert("Silinemedi: " + e.message); }
};

window.urunListesiToggle = function (menuId, buton) {
    const kutu   = document.getElementById("urunler-" + menuId);
    const gizlimi = kutu.style.display === 'none';
    kutu.style.display = gizlimi ? 'block' : 'none';
    buton.innerHTML    = gizlimi
        ? '<i class="fa-solid fa-chevron-up"></i> Gizle'
        : '<i class="fa-solid fa-box"></i> Ürünleri Gör';
};

window.adminFiltrele = function () {
    const aramaMetni = (document.getElementById("adminArama")?.value || '').toLowerCase().trim();
    let gorunen = 0;

    document.querySelectorAll('#adminKartlar [data-isletme]').forEach(kart => {
        const eslesme = kart.dataset.isletme.includes(aramaMetni) || kart.dataset.email.includes(aramaMetni);
        kart.style.display = eslesme ? '' : 'none';
        if (eslesme) gorunen++;
    });

    const mevcutUyari = document.getElementById("adminBosUyari");
    if (mevcutUyari) mevcutUyari.remove();

    if (gorunen === 0 && aramaMetni) {
        const uyari = document.createElement('div');
        uyari.id = 'adminBosUyari';
        uyari.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px;color:var(--text-gray);font-weight:600;';
        uyari.innerHTML = '<i class="fa-solid fa-magnifying-glass" style="display:block;font-size:28px;margin-bottom:10px;"></i> Eşleşen işletme bulunamadı.';
        document.getElementById("adminKartlar").appendChild(uyari);
    }
};

window.adminMenuuSil = async function (uid) {
    if (!confirm("Bu menüyü kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(veritabanı, "menus", uid));
        window.adminPaneliniAc();
    } catch (e) {
        alert("Silinemedi: " + e.message);
    }
};

// ── Kullanıcı Menü Düzenleyici — Mevcut Menüyü Yükle ─────────────────────────
window.menuyuDuzenlemeYukle = async function () {
    const kullanici = kimlikDoğr.currentUser;
    if (!kullanici) return;

    tumPanelleriGizle();
    document.body.classList.add("sade-arka-plan");
    document.getElementById("menuPaneli").style.display    = "block";
    document.getElementById("qrCiktisi").style.display     = "none";
    document.getElementById("qrPlaceholder").style.display = "flex";
    document.getElementById("qrResim").style.display       = "none";
    document.getElementById("kategoriListesi").innerHTML   = '';
    kategoriSayac = 0;

    const belge = await getDoc(doc(veritabanı, "menus", kullanici.uid));
    if (!belge.exists()) {
        document.getElementById("cafeAdi").value = '';
        window.kategoriEkle();
        return;
    }

    const veri = belge.data();
    document.getElementById("cafeAdi").value = veri.c || '';

    // Firestore belgesi ürünleri düz dizi olarak saklar; kategori adına göre
    // gruplandırarak iç içe kategori UI'sı yeniden inşa edilir.
    const gruplar = {};
    (veri.items || []).forEach(urun => {
        if (!gruplar[urun.k]) gruplar[urun.k] = [];
        gruplar[urun.k].push(urun);
    });

    for (const katAdi in gruplar) {
        kategoriSayac++;
        const katDiv = document.createElement("div");
        katDiv.className = "kategori-kutu";
        katDiv.id        = "kat-container-" + kategoriSayac;
        katDiv.innerHTML = `
            <button class="kat-sil-btn" onclick="window.kategoriKaldir(${kategoriSayac})"><i class="fa-solid fa-trash"></i></button>
            <input type="text" class="kategori-baslik-input kat-baslik" placeholder="Kategori Adı" value="${katAdi}">
            <div id="liste-urunler-${kategoriSayac}"></div>
            <button class="buttonÖz" style="background-color:#fff;color:var(--primary);padding:10px 18px;font-size:13px;box-shadow:var(--shadow-sm);margin-top:10px;border:1px solid #e2e8f0;"
                onclick="window.urunSatiriEkle(${kategoriSayac})">
                <i class="fa-solid fa-plus"></i> Yeni Ürün
            </button>
        `;
        document.getElementById("kategoriListesi").appendChild(katDiv);

        const urunListesi = document.getElementById("liste-urunler-" + kategoriSayac);
        gruplar[katAdi].forEach(urun => {
            const satir = document.createElement("div");
            satir.className = "urun-satiri";
            satir.innerHTML = urunSatiriOlustur(urun);
            urunListesi.appendChild(satir);
            gorselOnizlemeBagla(satir);
        });
    }
};

// ── Müşteri Menüsü Görünümü ───────────────────────────────────────────────────

function musteriMenusunuGoster(veri) {
    musteriMenuVerisi      = veri;
    window.secilenKategori = 'Tümü';

    tumPanelleriGizle();
    // Müşteri görünümünde navbar gizlenir; son kullanıcılar yönetim alanını görmemeli.
    document.getElementById("navbar").style.display       = "none";
    document.getElementById("musteriMenusu").style.display = "block";
    document.body.classList.add("sade-arka-plan");
    document.getElementById("m-isletmeAdi").innerText = veri.c;

    const kategoriler = [...new Set(veri.items.map(u => u.k))];
    const filtreButonlari = kategoriler
        .map(k => `<button class="kat-filtre-btn" onclick="window.kategoriyeGoreFiltrele('${k}',this)">${k}</button>`)
        .join('');

    document.getElementById("m-filtre-alan").innerHTML = `
        <div style="margin-bottom:20px;">
            <input type="text" id="aramaInput" placeholder="🔍  Ürün ara..." class="inputStil"
                oninput="window.menuFiltreUygula()" style="margin-bottom:12px;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <button class="kat-filtre-btn aktif" onclick="window.kategoriyeGoreFiltrele('Tümü',this)">Tümü</button>
                ${filtreButonlari}
            </div>
        </div>
    `;

    window.menuFiltreUygula();
}

window.kategoriyeGoreFiltrele = function (kategori, buton) {
    window.secilenKategori = kategori;
    document.querySelectorAll('.kat-filtre-btn').forEach(b => b.classList.remove('aktif'));
    buton.classList.add('aktif');
    window.menuFiltreUygula();
};

window.menuFiltreUygula = function () {
    if (!musteriMenuVerisi) return;
    const aramaMetni    = (document.getElementById("aramaInput")?.value || '').toLowerCase().trim();
    const aktifKategori = window.secilenKategori;

    const gruplar = {};
    musteriMenuVerisi.items.forEach(urun => {
        if (aktifKategori !== 'Tümü' && urun.k !== aktifKategori) return;
        if (aramaMetni && !urun.a.toLowerCase().includes(aramaMetni)) return;
        if (!gruplar[urun.k]) gruplar[urun.k] = [];
        gruplar[urun.k].push(urun);
    });

    let html = "";
    for (const kat in gruplar) {
        html += `
            <div style="margin-bottom:40px;">
                <h4 style="color:var(--text-dark);border-bottom:2px solid #f1f5f9;padding-bottom:12px;margin-bottom:20px;font-weight:800;font-size:20px;">${kat}</h4>
        `;
        gruplar[kat].forEach(urun => {
            const gorselEl = urun.i
                ? `<img src="${urun.i}" class="m-urun-img">`
                : '<div style="width:75px;height:75px;background:#f8fafc;border-radius:18px;margin-right:18px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;"><i class="fa-solid fa-image"></i></div>';
            html += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid #f8fafc;">
                    <div style="display:flex;align-items:center;">
                        ${gorselEl}
                        <span style="font-weight:600;font-size:16px;color:var(--text-dark);">${urun.a}</span>
                    </div>
                    <span style="font-weight:800;color:var(--primary);font-size:16px;">${urun.f}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (!html) {
        html = `
            <div style="text-align:center;padding:60px;color:var(--text-gray);">
                <i class="fa-solid fa-magnifying-glass" style="font-size:32px;margin-bottom:12px;display:block;"></i>
                Ürün bulunamadı.
            </div>
        `;
    }

    document.getElementById("m-liste").innerHTML = html;
};
