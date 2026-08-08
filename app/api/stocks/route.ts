import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; 
export const revalidate = 0;

export async function GET() {
  try {
    const columns = [
      "name", "close", "change", "Value.Traded", "description", "sector", 
      "market_cap_basic", "price_earnings_ttm", "price_52_week_high", "price_52_week_low"
    ];

    // Endeksler: BİST 100 ve BİST 30
    const indicesPayload = {
      symbols: { tickers: ["BIST:XU100", "BIST:XU030"] },
      columns: columns
    };

    // Döviz ve Altın: USD/TRY, EUR/TRY ve Gram Altın (XAUTRYG)
    const forexPayload = {
      symbols: { tickers: ["FX_IDC:USDTRY", "FX_IDC:EURTRY", "FX_IDC:XAUTRYG"] },
      columns: columns
    };

    // Bütün BİST Hisseleri (İlk 500 veya 618 hepsi)
    const stocksPayload = {
      filter: [{"left": "type", "operation": "equal", "right": "stock"}],
      markets: ["turkey"],
      symbols: {"query": {"types": ["stock"]}, "tickers": []},
      columns: columns,
      sort: {"sortBy": "Value.Traded", "sortOrder": "desc"},
      range: [0, 650] // Bütün hisseleri çekmesi için limiti 650'ye yükselttim
    };

    const [indicesRes, forexRes, stocksRes] = await Promise.all([
      fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(indicesPayload), cache: "no-store"
      }),
      fetch("https://scanner.tradingview.com/forex/scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forexPayload), cache: "no-store"
      }),
      fetch("https://scanner.tradingview.com/turkey/scan", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stocksPayload), cache: "no-store"
      })
    ]);

    const indicesData = await indicesRes.json();
    const forexData = await forexRes.json();
    const stocksData = await stocksRes.json();

    const formatData = (item: any) => {
      if (!item || !item.d) return null;
      const rawCode = item.d[0];
      const cleanCode = rawCode.includes(":") ? rawCode.split(":")[1] : rawCode;

      return {
        code: cleanCode,
        rawCode: rawCode, 
        price: item.d[1] || 0,
        change: item.d[2] || 0,
        volume: item.d[3] || 0,
        name: item.d[4] || cleanCode,
        sector: item.d[5] || "Borsa",
        marketCap: item.d[6] || 0,
        peRatio: item.d[7] || 0,
        high52: item.d[8] || 0,
        low52: item.d[9] || 0
      };
    };

    const indices = [
      ...indicesData.data.map(formatData).filter(Boolean),
      ...forexData.data.map(formatData).filter(Boolean)
    ];
    
    const stocks = stocksData.data
      .map(formatData)
      .filter((s: any) => s !== null && !s.code.includes("XU"));

    return NextResponse.json({ indices, stocks });
    
  } catch (error) {
    console.error("Borsa API Hatası:", error);
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 500 });
  }
}