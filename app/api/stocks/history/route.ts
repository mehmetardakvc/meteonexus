import { NextResponse } from "next/server";
import { calculateRSI, calculateBollingerBands } from "@/utils/indicators";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code"); 
  const range = searchParams.get("range") || "1y";

  if (!code) return NextResponse.json({ error: "Kod gerekli" }, { status: 400 });

  let interval = "1d";
  let yfRange = "1y";
  let cutoffDays = 365;
  
  // 1. GİZLİ PADDING (Fazladan Veri Çekme)
  if (range === "1d") { yfRange = "5d"; interval = "5m"; cutoffDays = 1; } 
  else if (range === "1w") { yfRange = "1mo"; interval = "1h"; cutoffDays = 7; } 
  else if (range === "1m") { yfRange = "3mo"; interval = "1d"; cutoffDays = 30; }
  else if (range === "3m") { yfRange = "6mo"; interval = "1d"; cutoffDays = 90; }
  else if (range === "6m") { yfRange = "1y"; interval = "1d"; cutoffDays = 180; }
  else if (range === "1y") { yfRange = "2y"; interval = "1d"; cutoffDays = 365; }
  else if (range === "5y") { yfRange = "10y"; interval = "1wk"; cutoffDays = 1825; }

  try {
    let yfSymbol = `${code}.IS`;
    if (code === "XU100") yfSymbol = "XU100.IS";
    else if (code === "XU500") yfSymbol = "XU500.IS"; 
    else if (code === "XU030") yfSymbol = "XU030.IS";
    else if (code === "USDTRY") yfSymbol = "TRY=X";

    const timestamp = Date.now();
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfSymbol}?range=${yfRange}&interval=${interval}&_nocache=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    const data = await res.json();
    if (!data.chart || !data.chart.result) return NextResponse.json([]);

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    let lastValidPrice = closes.find((p: any) => p !== null && p !== undefined) || 0;

    // 2. Ham Veriyi Oluştur
    const rawData = timestamps.map((time: number, index: number) => {
      let price = closes[index];
      if (price === null || price === undefined) {
          price = lastValidPrice; 
      } else {
          lastValidPrice = price; 
      }
      return { rawTimestamp: time, price: Number(price.toFixed(4)) };
    });

    // 3. İndikatörleri Geniş Veri Setinde (Padded) Hesapla (TİP HATASI DÜZELTİLDİ)
    const pricesOnly = rawData.map((d: any) => d.price);
    const rsiValues = calculateRSI(pricesOnly, 14);
    const bbValues = calculateBollingerBands(pricesOnly, 20);

    // 4. Veriyi Etiketlerle Birleştir (TİP HATASI DÜZELTİLDİ)
    const fullData = rawData.map((d: any, index: number) => {
      const date = new Date(d.rawTimestamp * 1000);
      let timeLabel = "";
      
      if (range === "1d") {
        timeLabel = date.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
      } else if (range === "1w") {
        timeLabel = date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "short" }) + " " + date.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
      } else {
        timeLabel = date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "short", year: "2-digit" });
      }

      return {
        time: timeLabel,
        rawTimestamp: d.rawTimestamp,
        price: d.price,
        rsi: rsiValues[index],
        bbUpper: bbValues[index]?.upper,
        bbMiddle: bbValues[index]?.middle,
        bbLower: bbValues[index]?.lower,
        bbBand: bbValues[index]?.upper && bbValues[index]?.lower ? [bbValues[index]?.lower, bbValues[index]?.upper] : null
      };
    });

    // 5. Kesme İşlemi (Slicing) (TİP HATALARI DÜZELTİLDİ)
    const lastDataTimestamp = fullData[fullData.length - 1].rawTimestamp;
    let finalData = [];

    if (range === "1d") {
      const lastDateString = new Date(lastDataTimestamp * 1000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
      finalData = fullData.filter((d: any) => new Date(d.rawTimestamp * 1000).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) === lastDateString);
    } else {
      const cutoffTimestamp = lastDataTimestamp - (cutoffDays * 24 * 60 * 60);
      finalData = fullData.filter((d: any) => d.rawTimestamp >= cutoffTimestamp);
    }

    return NextResponse.json(finalData);
  } catch (error) {
    console.error("Geçmiş veri API hatası:", error);
    return NextResponse.json([]);
  }
}