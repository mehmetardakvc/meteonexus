import urllib.request
import urllib.parse
import json
import os
from datetime import datetime, timedelta

def run_bot():
    print("🚀 PİP İNDİRME YOK! %100 SAF PYTHON BOTU DEVREDE (Sıfır Kurulum)")
    
    url = "https://www.tefas.gov.tr/api/DB/BindComparisonFundReturns"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
    }

    today = datetime.now()
    funds = []

    print("📥 TEFAS sunucularına doğrudan (kütüphanesiz) bağlanılıyor...")
    
    # Hafta sonu boş dönme ihtimaline karşı son 5 günü tarar
    for i in range(5):
        target_date = today - timedelta(days=i)
        date_str = target_date.strftime("%d.%m.%Y")
        
        payload = urllib.parse.urlencode({
            "calismaTipi": "2", "fontip": "YAT", "sfontip": "", 
            "fongrup": "", "sfonkod": "", "fongun": "", "fontarih": date_str
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=payload, headers=headers)
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                raw_funds = data.get("data", [])
                
                if raw_funds:
                    print(f"✅ {date_str} tarihli BÜTÜN CANLI FONLAR saniyesinde çekildi!")
                    
                    for item in raw_funds:
                        code = str(item.get('FONKODU', '')).strip().upper()
                        if len(code) != 3: continue
                        
                        name = str(item.get('FONUNVAN', f"{code} YATIRIM FONU")).strip()
                        
                        try: price = float(str(item.get('FIYAT', 0)).replace(',', '.'))
                        except: price = 0.0
                        if price <= 0: continue
                        
                        inv = int(item.get('YATIRIMCISAYISI', 0)) if item.get('YATIRIMCISAYISI') else 0
                        cap = float(str(item.get('PORTFOYBUYUKLUK', 0)).replace(',', '.')) if item.get('PORTFOYBUYUKLUK') else 0.0
                        
                        if cap >= 1_000_000_000: size_str = f"{cap/1_000_000_000:.2f} Mr ₺"
                        elif cap >= 1_000_000: size_str = f"{cap/1_000_000:.2f} Mn ₺"
                        else: size_str = f"{cap:,.0f} ₺"

                        cat = str(item.get('FONTURACIKLAMA', '')).strip()
                        ftype = cat if cat else "Yatırım Fonu"
                        
                        risk = 4
                        n_u = name.upper()
                        if "SERBEST" in n_u: risk = 7
                        elif "HİSSE" in n_u: risk = 7
                        elif "YABANCI" in n_u: risk = 6
                        elif "DEĞİŞKEN" in n_u or "KATILIM" in n_u: risk = 5
                        elif "BORÇLANMA" in n_u: risk = 2
                        elif "PARA PİYASASI" in n_u: risk = 1

                        funds.append({
                            "code": code, "name": name, "type": ftype, "price": price,
                            "daily": 0.0, "monthly": 0.0, "yearly": 0.0,
                            "investors": inv, "size": size_str, "risk": risk
                        })
                    break # Veri bulununca döngüden çık
        except Exception as e:
            pass # Hata verirse bir önceki güne geçer

    if not funds:
        print("❌ HATA: TEFAS'tan veri alınamadı. İnternet bağlantınızı kontrol edin.")
        return

    # Kopyaları temizle ve TMV fonunu başa sabitle
    unique_funds = list({f["code"]: f for f in funds}.values())
    tmv_fund = next((f for f in unique_funds if f["code"] == "TMV"), None)
    other_funds = [f for f in unique_funds if f["code"] != "TMV"]
    final_funds = [tmv_fund] + other_funds if tmv_fund else other_funds

    payload_out = {
        "funds": final_funds[:1500],
        "isLive": True,
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    
    # Dosyaları yerlerine kaydet
    root_path = os.path.join(os.getcwd(), 'tefas_data.json')
    with open(root_path, 'w', encoding='utf-8') as f:
        json.dump(payload_out, f, ensure_ascii=False, indent=2)

    public_dir = os.path.join(os.getcwd(), 'public')
    if os.path.exists(public_dir):
        public_path = os.path.join(public_dir, 'tefas_data.json')
        with open(public_path, 'w', encoding='utf-8') as f:
            json.dump(payload_out, f, ensure_ascii=False, indent=2)
            
    print(f"🎉 İŞLEM KESİN OLARAK TAMAM! {len(final_funds[:1500])} adet GERÇEK fon dosyaya yazıldı.")

if __name__ == '__main__':
    run_bot()