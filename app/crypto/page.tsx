"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck, TrendingUp, TrendingDown, RefreshCw, BarChart2, X, Activity, Loader2, Bitcoin, Sparkles, Cpu } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface CryptoData {
  symbol: string;
  pair: string;
  price: number;
  change: number;
  high24h: number;
  low24h: number;
  volume: number;
}

export default function CryptoPage() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("--:--");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRange, setChartRange] = useState("1d");

  const [cryptoDetails, setCryptoDetails] = useState({ high52: 0, low52: 0, marketCap: 0, rank: 0 });

  const fetchCryptoData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/crypto", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCryptos(data.crypto || []);
        
        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastUpdated(timeString);

        setSelectedCrypto(prev => {
          if (!prev) return null;
          const updated = data.crypto.find((c: CryptoData) => c.symbol === prev.symbol);
          return updated && updated.price !== prev.price ? updated : prev;
        });
      }
    } catch (err) {
      console.error("Kripto API Hatası:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- BURASI GÜNCELLENDİ (ENGEL AŞICI DÖNGÜ EKLENDİ) ---
  useEffect(() => {
    if (!selectedCrypto) return;
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const bases = [
          "https://data-api.binance.vision",
          "https://api1.binance.com",
          "https://api2.binance.com",
          "https://api3.binance.com",
          "https://api.binance.com"
        ];
        
        let klines = null;
        for (const base of bases) {
          try {
            const klineRes = await fetch(`${base}/api/v3/klines?symbol=${selectedCrypto.symbol}USDT&interval=1w&limit=52`);
            if (klineRes.ok) {
              klines = await klineRes.json();
              break;
            }
          } catch (e) {
            continue;
          }
        }

        let h52 = 0, l52 = Infinity;
        if (klines) {
          klines.forEach((k: any) => {
            const h = parseFloat(k[2]);
            const l = parseFloat(k[3]);
            if (h > h52) h52 = h;
            if (l < l52) l52 = l;
          });
        }

        let mCap = 0;
        let rank = cryptos.findIndex(c => c.symbol === selectedCrypto.symbol) + 1; 

        try {
          const coinCapRes = await fetch(`https://api.coincap.io/v2/assets?search=${selectedCrypto.symbol}&limit=5`);
          if (coinCapRes.ok) {
            const coinCapData = await coinCapRes.json();
            const exactMatch = coinCapData.data.find((c: any) => c.symbol === selectedCrypto.symbol);
            if (exactMatch) {
              mCap = parseFloat(exactMatch.marketCapUsd);
              if (exactMatch.rank) rank = parseInt(exactMatch.rank);
            }
          }
        } catch(e) { console.log("CoinCap bypass edildi."); }

        if (isMounted) {
          setCryptoDetails({ high52: h52, low52: l52 === Infinity ? 0 : l52, marketCap: mCap, rank });
        }
      } catch(e) {
        console.error(e);
      }
    };

    setCryptoDetails({ high52: 0, low52: 0, marketCap: 0, rank: 0 });
    fetchDetails();
    
    return () => { isMounted = false; };
  }, [selectedCrypto?.symbol, cryptos]); 


  useEffect(() => {
    if (!selectedCrypto) return;
    let isMounted = true;

    const fetchChartData = async () => {
      if (chartData.length === 0) setChartLoading(true); 
      
      try {
        const res = await fetch(`/api/crypto/history?symbol=${selectedCrypto.symbol}&range=${chartRange}&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setChartData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    };
    
    fetchChartData();
    return () => { isMounted = false; };
  }, [selectedCrypto?.symbol, chartRange]); 

  let displayChange = selectedCrypto?.change || 0;
  let displayRangeText = "24s";

  if (selectedCrypto) {
    if (chartRange === "1w") displayRangeText = "7G";
    if (chartRange === "1m") displayRangeText = "1A";
    if (chartRange === "3m") displayRangeText = "3A";
    if (chartRange === "1y") displayRangeText = "1Y";
    if (chartRange === "5y") displayRangeText = "5Y";

    if (chartRange !== "1d" && chartData.length > 0) {
      const oldestPrice = chartData[0].price;
      const currentPrice = selectedCrypto.price;
      displayChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;
    }
  }

  const isCryptoPositive = displayChange >= 0;
  const cryptoColor = isCryptoPositive ? "#10b981" : "#ef4444";
  const cryptoGradientId = isCryptoPositive ? "colorCryptoGreen" : "colorCryptoRed";

  const getCryptoAnalysis = () => {
    if (cryptos.length === 0) return "Blockchain ağındaki anlık veriler senkronize ediliyor...";
    const btc = cryptos.find(c => c.symbol === "BTC");
    const eth = cryptos.find(c => c.symbol === "ETH");
    let analysis = "";

    if (btc) {
      if (btc.change > 2) analysis += `Bitcoin (BTC) %${btc.change.toFixed(2)}'lik güçlü yükselişle piyasaya liderlik ediyor ve altcoinlere can suyu oluyor. `;
      else if (btc.change < -2) analysis += `Bitcoin'deki %${btc.change.toFixed(2)}'lik geri çekilme, genel kripto ekosisteminde likidasyonlara ve baskıya yol açıyor. `;
      else analysis += `Bitcoin dar bir bantta akümüle oluyor, piyasa yön belirlemek için yeni likidite bekliyor. `;
    }
    if (eth && eth.change > (btc?.change || 0)) analysis += `Ethereum (ETH) an itibarıyla Bitcoin'den pozitif ayrışarak güçlü duruş sergiliyor. `;

    return analysis || "Kripto piyasasında anlık sert bir volatilitesi bulunmuyor.";
  };

  const safeSearchQuery = searchQuery.toLocaleLowerCase("en-US").trim();
  const filteredCryptos = safeSearchQuery 
    ? cryptos.filter((coin) => coin.symbol.toLocaleLowerCase("en-US").includes(safeSearchQuery))
    : cryptos;

  const formatPrice = (price: number) => {
    const decimals = price < 1 ? (price < 0.001 ? 6 : 4) : 2;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(price);
  };

  const formatVolume = (vol: number) => {
    if (!vol || vol === 0) return "-";
    if (vol >= 1_000_000_000) return "$" + (vol / 1_000_000_000).toFixed(2) + " B";
    if (vol >= 1_000_000) return "$" + (vol / 1_000_000).toFixed(2) + " M";
    return "$" + vol.toLocaleString("en-US");
  };

  const topCoins = ["BTC", "ETH", "SOL", "BNB"];
  const topDisplayCryptos = topCoins.map(symbol => cryptos.find(c => c.symbol === symbol)).filter(Boolean) as CryptoData[];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const decimals = val < 1 ? (val < 0.001 ? 6 : 4) : 2;
      return (
        <div className="bg-zinc-950 border border-amber-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-xl z-50">
          <p className="text-[10px] text-zinc-400 font-mono mb-1">{label}</p>
          <p className="text-sm font-bold text-amber-400 font-mono">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-[#05030a] text-zinc-100 p-4 md:p-10 font-sans selection:bg-amber-500 selection:text-black relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-zinc-900/80 border border-amber-500/30 rounded-2xl hover:border-amber-400 text-amber-400 transition flex items-center justify-center backdrop-blur-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> 
                  DECENTRALIZE FİNANS AĞI
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-500">
                NEXUS<span className="text-amber-400"> CRYPTO</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/portfolio" className="px-6 py-2.5 bg-zinc-900/80 border border-blue-500/30 text-blue-400 rounded-full text-sm font-bold tracking-wide hover:bg-blue-500/10 hover:border-blue-400 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              PORTFÖY
            </Link>
            
            <Link href="/stocks" className="px-6 py-2.5 bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold tracking-wide hover:bg-emerald-500/10 hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              BİST & HİSSELER
            </Link>
            <Link href="/funds" className="px-6 py-2.5 bg-zinc-900/80 border border-purple-500/30 text-purple-400 rounded-full text-sm font-bold tracking-wide hover:bg-purple-500/10 hover:border-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              YATIRIM FONLARI
            </Link>
            <button 
              onClick={fetchCryptoData}
              disabled={isRefreshing}
              className="px-6 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-sm font-bold tracking-wide hover:bg-amber-500/20 hover:border-amber-400 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              GÜNCEL ({lastUpdated})
            </button>
          </div>
        </header>

        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-zinc-950/80 border border-amber-500/30 rounded-3xl p-4 md:p-5 flex items-center gap-4 md:gap-5 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.1)]">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl shrink-0">
            <Cpu className="w-6 h-6 md:w-8 md:h-8 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-[10px] md:text-[11px] font-mono tracking-widest font-bold flex items-center gap-1.5 mb-1.5 text-amber-400">
              <Sparkles className="w-3 h-3" /> NEXUS AI BLOCKCHAIN ANALİZİ
            </h3>
            <p className="text-xs md:text-sm font-medium text-zinc-200 leading-relaxed">
              {getCryptoAnalysis()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && topDisplayCryptos.length === 0 ? (
            Array(4).fill(0).map((_, i) => (
               <div key={i} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 h-[130px] animate-pulse"></div>
            ))
          ) : (
            topDisplayCryptos.map((coin) => {
              const isPos = coin.change >= 0;
              return (
                <div key={coin.symbol} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition shadow-lg flex flex-col justify-between group h-full">
                  <div>
                    <div className="text-[11px] text-zinc-500 font-bold mb-1 tracking-wider flex items-center gap-1.5">
                      <Bitcoin className="w-3.5 h-3.5 text-amber-500" /> {coin.symbol} / USDT
                    </div>
                    <div className="text-2xl font-black text-white font-mono">{formatPrice(coin.price)}</div>
                    <div className={`text-sm font-bold flex items-center gap-1 mt-1 font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isPos ? "+" : ""}{coin.change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedCrypto(coin)}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold font-mono tracking-wide flex items-center gap-1.5 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-3 h-3" /> Analiz
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-4">
          <div className="flex bg-zinc-950/80 p-1.5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md w-full md:w-auto">
            <button className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              TÜM PİYASA (USDT)
            </button>
          </div>

          <div className="relative w-full md:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Coin ara (Örn: DOGE, XRP)..."
              className="w-full bg-zinc-950/80 border border-amber-500/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-all shadow-lg font-mono uppercase"
            />
          </div>
        </div>

        {loading && cryptos.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-amber-500/50 font-mono text-sm animate-pulse">Binance Ağına Bağlanılıyor...</div>
        ) : filteredCryptos.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono text-sm bg-zinc-950/50 border border-zinc-800/50 rounded-3xl mt-4">
             Arama kriterinize uygun coin bulunamadı.
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCryptos.map((coin) => {
              const isPos = coin.change >= 0;

              return (
                <div key={coin.symbol} className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 hover:border-amber-500/40 hover:bg-zinc-900/50 transition-all duration-300 shadow-xl group">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-[10px] font-mono tracking-widest uppercase flex items-center gap-1">
                        <Activity className="w-3 h-3 text-amber-500" /> Kripto
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">{formatPrice(coin.price)}</div>
                      <div className={`text-sm font-bold flex items-center justify-end gap-1 font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {isPos ? "+" : ""}{coin.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-xl font-black text-white tracking-wide group-hover:text-amber-400 transition-colors flex items-center gap-2">
                         {coin.symbol} <span className="text-xs text-zinc-600 font-medium">/ USDT</span>
                    </h2>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                    <div className="text-xs text-zinc-500 font-mono font-medium">
                      24S Hacim: <span className="text-zinc-300">{formatVolume(coin.volume)}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedCrypto(coin)}
                      className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-2 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Analiz
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KRİPTO ANALİZ MODALI */}
      {selectedCrypto && (
        <div 
          onClick={() => { setSelectedCrypto(null); setChartRange("1d"); setChartData([]); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#05030a] border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col max-h-[90vh] overflow-y-auto scrollbar-none cursor-default"
          >
            
            <button onClick={() => {setSelectedCrypto(null); setChartRange("1d"); setChartData([]);}} className="absolute top-5 right-5 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-amber-400 rounded-full transition z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono font-bold">
                    KRİPTO
                  </span>
                  <span className="text-xs font-mono text-zinc-500 flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Canlı Binance Ağı</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                    <Bitcoin className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> {selectedCrypto.symbol} <span className="text-lg text-zinc-500 font-medium">/ USDT</span>
                  </h2>
                </div>
              </div>
              
              <div className="text-left md:text-right">
                <div className="text-2xl md:text-3xl font-black text-white font-mono">{formatPrice(selectedCrypto.price)}</div>
                
                {/* DİNAMİK YÜZDE GÖSTERİMİ */}
                <div className={`text-sm font-mono font-bold flex items-center md:justify-end gap-1 mt-1 ${displayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {displayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}% ({displayRangeText})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 mb-6 p-5 bg-zinc-950/60 border border-amber-500/20 rounded-2xl">
              
              <div className="text-left">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase">24 Saatlik Zirve</div>
                <div className="text-sm font-bold text-amber-400 font-mono">{formatPrice(selectedCrypto.high24h)}</div>
              </div>
              <div className="text-left md:text-center">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase">24 Saatlik Dip</div>
                <div className="text-sm font-bold text-red-400 font-mono">{formatPrice(selectedCrypto.low24h)}</div>
              </div>
              <div className="text-left md:text-right col-span-2 md:col-span-1 border-t border-zinc-800/50 md:border-none pt-3 md:pt-0">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase">24 Saatlik Hacim</div>
                <div className="text-sm font-bold text-white font-mono">{formatVolume(selectedCrypto.volume)}</div>
              </div>

              <div className="text-left border-t border-zinc-800/50 pt-3">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase">52 Hafta Zirve</div>
                <div className="text-sm font-bold text-amber-500/70 font-mono">
                  {cryptoDetails.high52 ? formatPrice(cryptoDetails.high52) : <Loader2 className="w-3 h-3 animate-spin text-amber-500/50"/>}
                </div>
              </div>
              <div className="text-left md:text-center border-t border-zinc-800/50 pt-3">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase">52 Hafta Dip</div>
                <div className="text-sm font-bold text-red-500/70 font-mono">
                  {cryptoDetails.low52 ? formatPrice(cryptoDetails.low52) : <Loader2 className="w-3 h-3 animate-spin text-red-500/50"/>}
                </div>
              </div>
              <div className="text-left md:text-right col-span-2 md:col-span-1 border-t border-zinc-800/50 pt-3">
                <div className="text-[9px] text-zinc-500 font-mono mb-1.5 tracking-wider uppercase flex items-center md:justify-end gap-1.5">
                  Piyasa Değeri 
                  {cryptoDetails.rank > 0 && <span className="bg-amber-500/20 text-amber-400 px-1.5 py-[1px] rounded-[4px] text-[8px] font-bold">#{cryptoDetails.rank}</span>}
                </div>
                <div className="text-sm font-bold text-white font-mono">
                  {cryptoDetails.marketCap ? formatVolume(cryptoDetails.marketCap) : <Loader2 className="w-3 h-3 animate-spin text-zinc-500 inline-block"/>}
                </div>
              </div>

            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-3 px-2 -mx-2 scrollbar-none mb-2">
              {[
                { label: "1 Gün", value: "1d" }, 
                { label: "1 Hafta", value: "1w" }, 
                { label: "1 Ay", value: "1m" }, 
                { label: "3 Ay", value: "3m" }, 
                { label: "1 Yıl", value: "1y" }, 
                { label: "5 Yıl", value: "5y" }
              ].map((range) => (
                <button key={range.value} onClick={() => setChartRange(range.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border whitespace-nowrap ${
                    chartRange === range.value ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-amber-500/40"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="w-full mt-2 bg-zinc-950/50 rounded-2xl border border-zinc-900 p-3">
              {chartLoading || chartData.length === 0 ? (
                <div className="w-full h-[230px] flex flex-col items-center justify-center text-amber-500 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-500/80">Grafik Çiziliyor...</span>
                </div>
              ) : (
                <div className="h-[230px] w-full relative">
                    <ResponsiveContainer width="99%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={cryptoGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={cryptoColor} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={cryptoColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} fontFamily="monospace" minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={9} tickLine={false} tickFormatter={(val: number) => `$${val}`} fontFamily="monospace" width={65} />
                        <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: cryptoColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="price" stroke={cryptoColor} strokeWidth={2} fillOpacity={1} fill={`url(#${cryptoGradientId})`} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

    </main>
  );
}