import qrcode
import os
from fastapi import FastAPI, HTTPException # HTTPException: Hata fırlatmak için
from fastapi.responses import FileResponse

app = FastAPI()

# 1. MUTFAK (Verilerimiz)
fake_db = {
    "menu_items": [
        {"id": 1, "name": "Mercimek Çorbası", "price": 80},
        {"id": 2, "name": "Adana Dürüm", "price": 220}
    ],
    # Kullanıcılarımızı ve yetkilerini burada tutuyoruz
    "users": {
        "ahmet": {"is_premium": False},  # Başlangıçta herkes ücretsiz
        "mehmet": {"is_premium": True}   # Mehmet parayı vermiş, yetkili
    }
}

@app.get("/")
def home():
    return {"msg": "ProQR Pay Sistemi Aktif!"}

@app.get("/api/menu")
def get_menu():
    return fake_db["menu_items"]

# 2. QR OLUŞTURMA (YETKİ KONTROLLÜ)
@app.get("/api/generate_qr")
def generate_qr(slug: str, username: str):
    # Önce kullanıcıyı kontrol et (Yetki Sistemi)
    user = fake_db["users"].get(username)
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı knka!")

    # SENİN İSTEDİĞİN MANTIK: Eğer kullanıcı premium değilse kısıtla
    # Şimdilik sadece premium olanlar QR oluşturabilsin (Örnek olarak)
    if not user["is_premium"]:
        return {
            "hata": "Üzgünüm knka!",
            "mesaj": "Şu an ücretsiz sürümdesin. QR oluşturmak için Premium yetkisi lazım.",
            "aksiyon": "Yetki almak için adminle iletişime geç."
        }

    # Eğer buraya kadar geldiyse kullanıcı Premium'dur
    link = f"https://proqrpay.com/menu/{slug}"
    img = qrcode.make(link)
    file_path = f"{slug}_qr.png"
    img.save(file_path)
    
    return FileResponse(file_path)

# 3. YETKİ VERME (ADMIN PANELİ GİBİ DÜŞÜN)
@app.post("/api/admin/upgrade")
def upgrade_user(username: str):
    if username in fake_db["users"]:
        fake_db["users"][username]["is_premium"] = True
        return {"msg": f"{username} artık Premium! Her şeyi yapabilir."}
    return {"hata": "Kullanıcı yok."}