import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY; // .env.local -> COINGECKO_API_KEY=xxxx
const CACHE_TTL_MS = 45_000; // Demo planın aylık 10.000 çağrı limitini erken tüketmemek için basit önbellek

let cache: { data: any[]; timestamp: number } | null = null;

async function fetchTop500FromCoinGecko() {
  const headers: Record<string, string> = { accept: "application/json" };
  if (COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;

  // CoinGecko per_page max 250 -> top 500 için 2 sayfa gerekiyor
  const urls = [1, 2].map(
    (page) =>
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=24h`
  );

  const responses = await Promise.all(urls.map((url) => fetch(url, { headers, cache: "no-store" })));

  for (const res of responses) {
    if (!res.ok) throw new Error(`CoinGecko hata: ${res.status}`);
  }

  const pages = await Promise.all(responses.map((res) => res.json()));
  const merged = pages.flat();

  // Aynı sembolde birden fazla kayıt gelirse (nadir ama olur) ilkini (market cap'e göre en yükseği) tut
  const seen = new Set<string>();
  return merged
    .filter((coin: any) => {
      const symbol = (coin.symbol || "").toUpperCase();
      if (!symbol || seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .map((coin: any) => ({
      symbol: (coin.symbol || "").toUpperCase(),
      pair: `${(coin.symbol || "").toUpperCase()}USDT`,
      price: coin.current_price ?? 0,
      change: coin.price_change_percentage_24h ?? 0,
      high24h: coin.high_24h ?? 0,
      low24h: coin.low_24h ?? 0,
      volume: coin.total_volume ?? 0,
    }));
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ crypto: cache.data });
    }

    const top500Cryptos = await fetchTop500FromCoinGecko();
    cache = { data: top500Cryptos, timestamp: now };

    return NextResponse.json({ crypto: top500Cryptos });
  } catch (error) {
    console.error("Kripto Top 500 API Hatası (CoinGecko):", error);

    if (cache) return NextResponse.json({ crypto: cache.data });

    return NextResponse.json(
      {
        error: "Kripto verileri alınamadı",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}