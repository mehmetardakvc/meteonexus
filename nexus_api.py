import urllib.request
import urllib.parse
import json
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Frontend'in bu API'ye rahatça bağlanabilmesi için CORS izni
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Grafik verilerini hızlandırmak için önbellek
cache = {}

@app.get("/api/funds/history")
def get_history(code: str, price: float = 0.0, range: str = "1y"):
    cache_key = f"{code}_{range}"
    if cache_key in cache:
        return cache[cache_key]

    # İstenen tarih aralığını hesapla
    today = datetime.now()
    if range == "1m": start_date = today - timedelta(days=30)
    elif range == "3m": start_date = today - timedelta(days=90)
    elif range == "6m": start_date = today - timedelta(days=180)
    elif range == "1y": start_date = today - timedelta(days=365)
    elif range == "3y": start_date = today - timedelta(days=365*3)
    elif range == "5y": start_date = today - timedelta(days=365*5)
    else: start_date = today - timedelta(days=365)

    # TEFAS'ın geçmiş veriler için kullandığı resmi adres
    url = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo"
    
    payload = urllib.parse.urlencode({
        "fonKod": code.upper(),
        "bastarih": start_date.strftime("%d.%m.%Y"),
        "bittarih": today.strftime("%d.%m.%Y"),
        "fontip": "YAT"
    }).encode('utf-8')

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
    }

    chart_data = []
    
    try:
        req = urllib.request.Request(url, data=payload, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            raw_history = data.get("data", [])
            
            # TEFAS veriyi sondan başa gönderir. Grafik soldan sağa aktığı için tersine çeviriyoruz.
            raw_history.reverse()
            
            for item in raw_history:
                try:
                    # TEFAS fiyatları virgüllü verir, Python'un anlayacağı noktaya çeviriyoruz
                    p = float(str(item.get('FIYAT', 0)).replace(',', '.'))
                    t_val = item.get('TARIH')
                    
                    # Tarih formatını çözümle (Milisaniye cinsinden UNIX timestamp)
                    if isinstance(t_val, (int, float)):
                        dt = datetime.fromtimestamp(t_val / 1000.0)
                    else:
                        dt = datetime.now()
                        
                    chart_data.append({
                        "time": dt.strftime("%d.%m.%y"),
                        "price": p
                    })
                except:
                    continue
                    
        # Çekilen veriyi hafızaya al ki bir daha tıklayınca anında açılsın
        cache[cache_key] = chart_data
        return chart_data

    except Exception as e:
        print(f"Hata! Grafik verisi çekilemedi: {e}")
        return []

if __name__ == '__main__':
    print("🚀 NEXUS BACKEND MOTORU CALISIYOR (Port 8000)")
    uvicorn.run(app, host="127.0.0.1", port=8000)