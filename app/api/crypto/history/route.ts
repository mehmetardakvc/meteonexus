import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1d";

  if (!symbol) return NextResponse.json({ error: "Sembol gerekli" }, { status: 400 });

  let interval = "1h";
  let limit = 100;

  switch (range) {
    case "1d": interval = "15m"; limit = 96; break;
    case "1w": interval = "2h"; limit = 84; break;
    case "1m": interval = "12h"; limit = 60; break;
    case "3m": interval = "1d"; limit = 90; break;
    case "1y": interval = "1d"; limit = 365; break;
    case "5y": interval = "1w"; limit = 260; break;
    default: interval = "1d"; limit = 100;
  }

  const bases = [
    "https://data-api.binance.vision",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api.binance.com"
  ];

  let data = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`, { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!data) return NextResponse.json({ error: "Veri alınamadı" }, { status: 500 });

  const formattedData = data.map((kline: any) => {
    const date = new Date(kline[0]);
    let timeLabel = "";
    
    if (range === "1d") {
      timeLabel = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } else if (range === "1w") {
      timeLabel = date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } else if (range === "1m" || range === "3m") {
      timeLabel = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    } else if (range === "1y") {
      timeLabel = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    } else {
      timeLabel = date.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
    }

    return {
      time: timeLabel,
      price: parseFloat(kline[4])
    };
  });

  return NextResponse.json(formattedData);
}