"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShieldCheck, TrendingUp, TrendingDown, RefreshCw, BarChart2, X, Activity, Loader2, Bell, Star, Trash2, CheckCircle2, Clock, Bot, Sparkles, Lock, LineChart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, CartesianGrid, ComposedChart } from "recharts";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import StockChatbot from "@/components/StockChatbot";

interface MarketData {
  code: string;
  rawCode: string;
  price: number;
  change: number;
  volume: number;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number;
  high52: number;
  low52: number;
}

export default function StocksPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  
  const [indices, setIndices] = useState<MarketData[]>([]);
  const [stocks, setStocks] = useState<MarketData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("--:--");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedStock, setSelectedStock] = useState<MarketData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRange, setChartRange] = useState("1d");
  const [activeIndicator, setActiveIndicator] = useState<"none" | "rsi" | "bb">("none");

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "watchlist" | "alerts">("all");

  const [alertPrice, setAlertPrice] = useState<number | "">("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{type: "success" | "error" | null, text: string}>({type: null, text: ""});
  
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]); 
  const [allAlerts, setAllAlerts] = useState<any[]>([]); 

  useEffect(() => {
    async function checkUserAndData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: alertData } = await supabase.from("stock_alerts").select("*").eq("user_id", user.id).order('created_at', { ascending: false });
        if (alertData) {
          setAllAlerts(alertData);
          setActiveAlerts(alertData.filter(a => a.is_active));
        }

        const { data: watchData } = await supabase.from("stock_watchlist").select("symbol").eq("user_id", user.id);
        if (watchData) setWatchlist(watchData.map(d => d.symbol));
      }
    }
    checkUserAndData();
  }, [supabase]);

  const toggleWatchlist = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (!user) {
      alert("Hisseleri takip listesine eklemek için giriş yapmalısın!");
      return;
    }

    if (watchlist.includes(symbol)) {
      setWatchlist(prev => prev.filter(s => s !== symbol));
      await supabase.from("stock_watchlist").delete().match({ user_id: user.id, symbol });
    } else {
      setWatchlist(prev => [...prev, symbol]);
      await supabase.from("stock_watchlist").insert({ user_id: user.id, symbol });
    }
  };

  const handleDeleteAlert = async (id: number) => {
    await supabase.from("stock_alerts").delete().eq("id", id);
    setAllAlerts(prev => prev.filter(a => a.id !== id));
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    if (activeAlerts.length === 0 || (stocks.length === 0 && indices.length === 0)) return;

    const allAssets = [...stocks, ...indices];

    activeAlerts.forEach(async (alert) => {
      const asset = allAssets.find(a => a.code === alert.symbol);
      if (!asset) return;

      let isTriggered = false;
      if (alert.condition === "above" && asset.price >= alert.target_price) isTriggered = true;
      if (alert.condition === "below" && asset.price <= alert.target_price) isTriggered = true;

      if (isTriggered) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`🚨 NEXUS ALARM: ${alert.symbol}`, {
            body: `${alert.symbol} belirlediğin hedef fiyata ulaştı! Güncel Fiyat: ${asset.price} ₺`,
            icon: "/favicon.ico"
          });
        }
        
        await supabase.from("stock_alerts").update({ is_active: false }).eq("id", alert.id);
        setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
        setAllAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: false } : a));
      }
    });
  }, [stocks, indices, activeAlerts, supabase]);

  useEffect(() => {
    setAlertPrice("");
    setAlertMessage({type: null, text: ""});
  }, [selectedStock?.code]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAlertMessage({ type: "error", text: "Alarm kurmak için giriş yapmalısın!" });
      return;
    }
    if (!alertPrice || alertPrice <= 0 || !selectedStock) {
      setAlertMessage({ type: "error", text: "Geçerli bir hedef fiyat girin." });
      return;
    }

    if ("Notification" in window && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setAlertMessage({ type: "error", text: "Masaüstü bildirimlerine izin vermelisin!" });
        return;
      }
    }

    setAlertLoading(true);
    setAlertMessage({ type: null, text: "" });

    const newAlert = { user_id: user.id, symbol: selectedStock.code, target_price: Number(alertPrice), condition: alertCondition, is_active: true };
    const { data, error } = await supabase.from("stock_alerts").insert(newAlert).select().single();

    setAlertLoading(false);

    if (error) {
      setAlertMessage({ type: "error", text: "Alarm kaydedilemedi. Hata oluştu." });
    } else {
      setAlertMessage({ type: "success", text: `${selectedStock.code} alarmı kuruldu! Bildirim alacaksın.` });
      setAlertPrice(""); 
      if (data) {
        setActiveAlerts(prev => [...prev, data]);
        setAllAlerts(prev => [data, ...prev]);
      }
    }
  };

  const fetchMarketData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/stocks", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIndices(data.indices || []);
        setStocks(data.stocks || []);
        
        setSelectedStock(prev => {
          if (!prev) return null;
          const updated = [...(data.indices || []), ...(data.stocks || [])].find(s => s.code === prev.code);
          return updated && updated.price !== prev.price ? updated : prev;
        });
        
        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLastUpdated(timeString);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedStock) return;
    let isMounted = true;

    const fetchChartData = async () => {
      if (chartData.length === 0) setChartLoading(true); 
      
      try {
        const res = await fetch(`/api/stocks/history?code=${selectedStock.code}&range=${chartRange}&t=${Date.now()}`);
        if (res.ok) {
          const rawData = await res.json();
          
          if (chartRange === "1d" && rawData.length > 0) {
            const now = new Date();
            const currentTimeStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            
            if (rawData[rawData.length - 1].time !== currentTimeStr) {
              rawData.push({ 
                ...rawData[rawData.length - 1], 
                time: currentTimeStr, 
                price: selectedStock.price 
              });
            }
          }

          if (isMounted) setChartData(rawData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    };
    
    fetchChartData();
    return () => { isMounted = false; };
  }, [selectedStock?.code, chartRange, selectedStock?.price]); 

  let displayChange = selectedStock?.change || 0;
  let displayRangeText = "Günlük";

  if (selectedStock) {
    if (chartRange === "1w") displayRangeText = "7G";
    if (chartRange === "1m") displayRangeText = "1A";
    if (chartRange === "3m") displayRangeText = "3A";
    if (chartRange === "1y") displayRangeText = "1Y";
    if (chartRange === "5y") displayRangeText = "5Y";

    if (chartRange !== "1d" && chartData.length > 0) {
      const oldestPrice = chartData[0].price;
      const currentPrice = selectedStock.price;
      displayChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;
    }
  }

  const isChartPositive = displayChange >= 0;
  const chartColor = isChartPositive ? "#10b981" : "#ef4444";
  const gradientId = isChartPositive ? "colorStockGreen" : "colorStockRed";

  const getMarketAnalysis = () => {
    if (!user) return "NEXUS AI piyasa asistanını kullanmak ve gerçek zamanlı borsa özeti almak için sisteme giriş yapmalısınız.";
    if (indices.length === 0 || stocks.length === 0) return "Sistem piyasa verilerini analiz ediyor...";

    const bist100 = indices.find(i => i.code === "XU100");
    const usdtry = indices.find(i => i.code === "USDTRY");

    let analysis = "";

    if (bist100) {
      if (bist100.change >= 1.5) analysis += `BİST 100 endeksi %${bist100.change.toFixed(2)}'lik güçlü bir yükselişle alıcılı bir seyir izliyor. Piyasada belirgin bir iyimserlik ve risk iştahı mevcut. `;
      else if (bist100.change > 0 && bist100.change < 1.5) analysis += `BİST 100 endeksinde %${bist100.change.toFixed(2)}'lik ılımlı bir pozitif hava var. Beklentiler korunuyor. `;
      else if (bist100.change <= -1.5) analysis += `BİST 100 endeksi %${bist100.change.toFixed(2)} düşüşle satıcılı bir tablo çiziyor. Kar satışlarına karşı kritik destek seviyeleri yakından izlenmeli. `;
      else analysis += `BİST 100 endeksinde yatay ve sıkışık bir seyir hakim. Endeks bazından çok, hisse bazlı teknik hareketlerin ön planda olduğu bir gün. `;
    }

    const upStocks = stocks.filter(s => s.change > 0).length;
    const downStocks = stocks.filter(s => s.change < 0).length;
    const totalStocks = stocks.length;

    if (totalStocks > 0) {
       if (upStocks > downStocks * 2) analysis += "Alımlar sadece ana tahtalarla sınırlı kalmayıp genele yayılmış durumda. ";
       else if (downStocks > upStocks * 2) analysis += "Satış baskısı piyasanın geneline yayılmış görünüyor, yatırımcılar defansif pozisyona geçiyor. ";
       else analysis += "Piyasa geneline bakıldığında alıcılar ve satıcılar arasında dengeli, kararsız bir mücadele var. ";
    }

    if (usdtry) {
      if (usdtry.change > 0.5) analysis += `Döviz kurundaki (USD/TRY) yukarı yönlü hareketlilik piyasa üzerinde dolaylı bir stres yaratıyor olabilir. `;
      else if (usdtry.change < -0.5) analysis += `Döviz kurundaki gevşeme Borsa İstanbul'u nispeten rahatlatan unsurlar arasında. `;
    }

    return analysis || "Piyasa koşulları şu an nötr ve durağan bir bantta ilerliyor.";
  };

  const safeSearchQuery = searchQuery.toLocaleLowerCase("tr-TR").trim();
  
  const baseStocks = activeTab === "watchlist" 
    ? stocks.filter(s => watchlist.includes(s.code)) 
    : stocks;

  const finalFilteredStocks = safeSearchQuery 
    ? baseStocks.filter((stock) => 
        stock.code.toLocaleLowerCase("tr-TR").includes(safeSearchQuery) ||
        stock.name.toLocaleLowerCase("tr-TR").includes(safeSearchQuery)
      )
    : baseStocks; 

  const formatPrice = (code: string, price: number) => {
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTopCardPrice = (code: string, price: number) => {
    if (code === "USDTRY" || code === "EURTRY") {
      return price.toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: number) => {
    if (!vol || vol === 0) return "-";
    if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + " Mr";
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + " Mn";
    if (vol >= 1_000) return (vol / 1_000).toFixed(2) + " Bin";
    return vol.toLocaleString("tr-TR");
  };

  const formatMarketCap = (cap: number) => {
    if (!cap || cap === 0) return "-";
    if (cap >= 1_000_000_000) return (cap / 1_000_000_000).toFixed(2) + " Mr ₺";
    if (cap >= 1_000_000) return (cap / 1_000_000).toFixed(2) + " Mn ₺";
    return cap.toLocaleString("tr-TR") + " ₺";
  };

  const getIndexName = (code: string) => {
    const map: Record<string, string> = { 
      "XU100": "BİST 100", 
      "XU030": "BİST 30", 
      "USDTRY": "USD / TRY", 
      "EURTRY": "EUR / TRY", 
      "XAUTRYG": "GRAM ALTIN" 
    };
    return map[code] || code;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-emerald-500/40 p-3 rounded-xl shadow-2xl backdrop-blur-xl z-50 min-w-[140px]">
          <p className="text-[10px] text-zinc-400 font-mono mb-2 border-b border-zinc-800 pb-1">{label}</p>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-bold text-white font-mono">Fiyat:</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{data.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₺</span>
          </div>
          
          {activeIndicator === "rsi" && data.rsi && (
            <div className="flex justify-between items-center gap-4 mt-1">
              <span className="text-xs font-bold text-white font-mono">RSI:</span>
              <span className={`text-xs font-bold font-mono ${data.rsi > 70 ? 'text-red-400' : data.rsi < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data.rsi.toFixed(2)}
              </span>
            </div>
          )}

          {activeIndicator === "bb" && data.bbUpper && (
            <div className="mt-1 pt-1 border-t border-zinc-800 space-y-1">
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-zinc-400 font-mono">Üst Bant:</span>
                <span className="text-[10px] text-blue-400 font-mono">{data.bbUpper.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-zinc-400 font-mono">Alt Bant:</span>
                <span className="text-[10px] text-blue-400 font-mono">{data.bbLower.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const topCardCodes = ["XU100", "XU030", "USDTRY", "EURTRY", "XAUTRYG"];
  const displayTopCards = topCardCodes.map(code => {
    const found = indices.find(i => i.code === code);
    if (found) return found;
    
    return {
      code: code,
      rawCode: code,
      price: 0,
      change: 0,
      name: getIndexName(code),
      sector: "API BEKLENİYOR",
      volume: 0,
      marketCap: 0,
      peRatio: 0,
      high52: 0,
      low52: 0,
    } as MarketData;
  });

  return (
    <main className="min-h-screen bg-[#03050a] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-zinc-900/80 border border-emerald-500/30 rounded-2xl hover:border-emerald-400 text-emerald-400 transition flex items-center justify-center backdrop-blur-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 
                  KULLANICI DOSTU BAĞIMSIZ TERMİNAL
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-500">
                NEXUS<span className="text-emerald-400"> MARKETS</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link href="/portfolio" className="px-6 py-2.5 bg-zinc-900/80 border border-blue-500/30 text-blue-400 rounded-full text-sm font-bold tracking-wide hover:bg-blue-500/10 hover:border-blue-400 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              PORTFÖY
            </Link>
            
            <Link href="/crypto" className="px-6 py-2.5 bg-zinc-900/80 border border-amber-500/30 text-amber-400 rounded-full text-sm font-bold tracking-wide hover:bg-amber-500/10 hover:border-amber-400 transition-all">
              KRİPTO AĞI
            </Link>
            <Link href="/funds" className="px-6 py-2.5 bg-zinc-900/80 border border-purple-500/30 text-purple-400 rounded-full text-sm font-bold tracking-wide hover:bg-purple-500/10 hover:border-purple-400 transition-all">
              YATIRIM FONLARI
            </Link>
            <button 
              onClick={fetchMarketData}
              disabled={isRefreshing}
              className="px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold tracking-wide hover:bg-emerald-500/20 hover:border-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              GÜNCEL ({lastUpdated})
            </button>
          </div>
        </header>

        <div className={`border rounded-3xl p-4 md:p-5 flex items-center gap-4 md:gap-5 backdrop-blur-md transition-all ${
          user 
            ? "bg-gradient-to-r from-emerald-950/40 via-emerald-900/10 to-zinc-950/80 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
            : "bg-zinc-950/80 border-zinc-800 shadow-lg opacity-80"
        }`}>
          <div className={`p-3 rounded-2xl border shrink-0 ${user ? "bg-emerald-500/10 border-emerald-500/30" : "bg-zinc-900 border-zinc-700"}`}>
            {user ? <Bot className="w-6 h-6 md:w-8 md:h-8 text-emerald-400 animate-pulse" /> : <Lock className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" />}
          </div>
          <div>
            <h3 className={`text-[10px] md:text-[11px] font-mono tracking-widest font-bold flex items-center gap-1.5 mb-1.5 ${user ? "text-emerald-400" : "text-zinc-500"}`}>
              {user ? <Sparkles className="w-3 h-3" /> : null} NEXUS AI PİYASA ANALİZİ
            </h3>
            <p className={`text-xs md:text-sm font-medium leading-relaxed ${user ? "text-zinc-200" : "text-zinc-400"}`}>
              {getMarketAnalysis()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {loading && displayTopCards.length === 0 ? (
            Array(5).fill(0).map((_, i) => (
               <div key={i} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 h-[130px] animate-pulse"></div>
            ))
          ) : (
            displayTopCards.map((idx) => {
              const isPos = idx.change >= 0;
              return (
                <div key={idx.code} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition shadow-lg flex flex-col justify-between group h-full">
                  <div>
                    <div className="text-[11px] text-zinc-500 font-bold mb-1 tracking-wider uppercase">{getIndexName(idx.code)}</div>
                    <div className="text-2xl font-black text-white font-mono">{formatTopCardPrice(idx.code, idx.price)}</div>
                    <div className={`text-sm font-bold flex items-center gap-1 mt-1 font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isPos ? "+" : ""}{idx.change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedStock(idx)}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold font-mono tracking-wide flex items-center gap-1.5 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-3 h-3" /> Grafik
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 pt-4">
          <div className="flex bg-zinc-950/80 p-1.5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md w-full md:w-auto overflow-x-auto scrollbar-none">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${activeTab === "all" ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "text-zinc-400 hover:text-white"}`}
            >
              TÜM HİSSELER
            </button>
            <button 
              onClick={() => setActiveTab("watchlist")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "watchlist" ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]" : "text-zinc-400 hover:text-white"}`}
            >
              <Star className={`w-4 h-4 ${activeTab === "watchlist" ? "fill-black" : ""}`} /> TAKİP LİSTEM
            </button>
            <button 
              onClick={() => setActiveTab("alerts")}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "alerts" ? "bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.4)]" : "text-zinc-400 hover:text-white"}`}
            >
              <Bell className={`w-4 h-4 ${activeTab === "alerts" ? "text-black fill-black" : ""}`} /> ALARMLARIM
            </button>
          </div>

          {activeTab !== "alerts" && (
            <div className="relative w-full md:w-1/3">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="BİST hisse senedi ara (Örn: SASA)..."
                className="w-full bg-zinc-950/80 border border-emerald-500/20 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all shadow-lg"
              />
            </div>
          )}
        </div>

        {activeTab === "alerts" ? (
          <div className="bg-zinc-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl min-h-[400px]">
            {!user ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-mono text-sm">
                <ShieldCheck className="w-12 h-12 text-zinc-700 mb-4" />
                <span>Alarmlarınızı görmek ve yönetmek için giriş yapmalısınız.</span>
              </div>
            ) : allAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-mono text-sm">
                <Bell className="w-10 h-10 text-zinc-700 mb-4 opacity-50" />
                <span>Henüz hiçbir hisse için alarm kurmadınız.</span>
                <span className="text-xs mt-2">Hisse detay panelinden yeni alarm oluşturabilirsiniz.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-zinc-900/50 border-b border-white/10 text-zinc-400 text-xs uppercase font-mono tracking-wider">
                    <tr>
                      <th className="px-6 py-5 font-bold">Sembol</th>
                      <th className="px-6 py-5 font-bold">Hedef Fiyat</th>
                      <th className="px-6 py-5 font-bold">Koşul</th>
                      <th className="px-6 py-5 font-bold">Durum</th>
                      <th className="px-6 py-5 font-bold">Tarih</th>
                      <th className="px-6 py-5 font-bold text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allAlerts.map(alert => {
                      const isActive = alert.is_active;
                      const dateStr = new Date(alert.created_at).toLocaleDateString("tr-TR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <tr key={alert.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-bold font-mono px-3 py-1.5 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                              {alert.symbol}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                            {alert.target_price.toLocaleString("tr-TR")} ₺
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                            {alert.condition === "above" ? "Üstüne Çıkarsa ↗" : "Altına Düşerse ↘"}
                          </td>
                          <td className="px-6 py-4">
                            {isActive ? (
                              <span className="flex items-center gap-1.5 text-blue-400 font-mono text-xs font-bold bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 w-max">
                                <Clock className="w-3.5 h-3.5" /> Aktif Bekleniyor
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-zinc-500 font-mono text-xs font-bold bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 w-max">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Tetiklendi
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                            {dateStr}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                              title="Alarmı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          loading && stocks.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-emerald-500/50 font-mono text-sm animate-pulse">BİST Verileri Çekiliyor...</div>
          ) : finalFilteredStocks.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-zinc-500 font-mono text-sm bg-zinc-950/50 border border-zinc-800/50 rounded-3xl mt-4">
               {activeTab === "watchlist" && watchlist.length === 0 ? (
                 <>
                   <Star className="w-8 h-8 text-zinc-700 mb-3" />
                   <span>Takip listeniz henüz boş. Hisselerin yanındaki yıldızlara tıklayarak ekleyin.</span>
                 </>
               ) : (
                 "Arama kriterinize uygun hisse bulunamadı."
               )}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {finalFilteredStocks.map((stock) => {
                const isPos = stock.change >= 0;
                const isWatched = watchlist.includes(stock.code);

                return (
                  <div key={stock.code} className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 hover:border-emerald-500/40 hover:bg-zinc-900/50 transition-all duration-300 shadow-xl group">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-[10px] font-mono tracking-widest uppercase">
                          {stock.sector}
                        </span>
                        <button 
                          onClick={(e) => toggleWatchlist(e, stock.code)}
                          className="p-1.5 rounded-full hover:bg-zinc-800/80 transition"
                        >
                          <Star className={`w-4 h-4 ${isWatched ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-zinc-600 hover:text-zinc-400"}`} />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white font-mono">{formatPrice(stock.code, stock.price)} ₺</div>
                        <div className={`text-sm font-bold flex items-center justify-end gap-1 font-mono ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {isPos ? "+" : ""}{stock.change.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="text-xl font-black text-white tracking-wide group-hover:text-emerald-400 transition-colors">{stock.code}</h2>
                      <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">{stock.name}</p>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                      <div className="text-xs text-zinc-500 font-mono font-medium">
                        Hacim: <span className="text-zinc-300">{formatVolume(stock.volume)}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedStock(stock)}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-2 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors cursor-pointer"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> Analiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {selectedStock && (
        <div 
          onClick={() => { setSelectedStock(null); setChartRange("1d"); setActiveIndicator("none"); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-[#05070f] border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col max-h-[90vh] overflow-y-auto scrollbar-none cursor-default"
          >
            
            <button onClick={() => {setSelectedStock(null); setChartRange("1d"); setActiveIndicator("none");}} className="absolute top-5 right-5 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-400 rounded-full transition z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold">
                    {selectedStock.sector.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-zinc-500 flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Canlı Grafik</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black text-white">{getIndexName(selectedStock.code)} {selectedStock.name !== selectedStock.code && selectedStock.name !== "Borsa" ? `- ${selectedStock.name}` : ""}</h2>
                  <button 
                    onClick={(e) => toggleWatchlist(e, selectedStock.code)} 
                    className="p-2 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition mt-1"
                  >
                     <Star className={`w-6 h-6 ${watchlist.includes(selectedStock.code) ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "text-zinc-600 hover:text-zinc-400"}`} />
                  </button>
                </div>
              </div>
              
              <div className="text-left md:text-right">
                <div className="text-2xl md:text-3xl font-black text-white font-mono">{formatPrice(selectedStock.code, selectedStock.price)} ₺</div>
                
                <div className={`text-sm font-mono font-bold flex items-center md:justify-end gap-1 mt-1 ${displayChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {displayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}% ({displayRangeText})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6 p-4 bg-zinc-950/60 border border-emerald-500/20 rounded-2xl">
              <div>
                <div className="text-[9px] text-zinc-500 font-mono mb-1 tracking-wider uppercase">Piyasa Değeri</div>
                <div className="text-sm font-bold text-white font-mono">{formatMarketCap(selectedStock.marketCap)}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-mono mb-1 tracking-wider uppercase">Günlük Hacim</div>
                <div className="text-sm font-bold text-white font-mono">{formatVolume(selectedStock.volume)}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-mono mb-1 tracking-wider uppercase">F/K Oranı</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{selectedStock.peRatio ? selectedStock.peRatio.toFixed(2) : "-"}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-mono mb-1 tracking-wider uppercase">52 Hafta Zirve</div>
                <div className="text-sm font-bold text-zinc-300 font-mono">{selectedStock.high52 ? `${formatPrice(selectedStock.code, selectedStock.high52)}` : "-"}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-mono mb-1 tracking-wider uppercase">52 Hafta Dip</div>
                <div className="text-sm font-bold text-zinc-300 font-mono">{selectedStock.low52 ? `${formatPrice(selectedStock.code, selectedStock.low52)}` : "-"}</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 overflow-x-auto py-3 px-2 -mx-2 md:mx-0 md:px-0 scrollbar-none">
                {[
                  { label: "1 Gün", value: "1d" }, 
                  { label: "1 Hafta", value: "1w" }, 
                  { label: "1 Ay", value: "1m" }, 
                  { label: "3 Ay", value: "3m" }, 
                  { label: "6 Ay", value: "6m" },
                  { label: "1 Yıl", value: "1y" }, 
                  { label: "5 Yıl", value: "5y" }
                ].map((range) => (
                  <button key={range.value} onClick={() => setChartRange(range.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border whitespace-nowrap ${
                      chartRange === range.value ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
                <LineChart className="w-4 h-4 text-emerald-500 ml-2" />
                <span className="text-xs font-mono font-bold text-zinc-400">İndikatör:</span>
                <select 
                  value={activeIndicator}
                  onChange={(e) => setActiveIndicator(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="none">Sadece Fiyat</option>
                  <option value="rsi">RSI (14)</option>
                  <option value="bb">Bollinger Bantları</option>
                </select>
              </div>
            </div>

            <div className="w-full mt-2 bg-zinc-950/50 rounded-2xl border border-zinc-900 p-3">
              {chartLoading || chartData.length === 0 ? (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-emerald-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">Grafik Çiziliyor...</span>
                </div>
              ) : (
                <div className="h-[300px] w-full flex flex-col gap-2">
                  
                  {activeIndicator === "rsi" ? (
                    <>
                      {/* ÜST GRAFİK: FİYAT (%70) */}
                      <div className="h-[70%] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.5} />
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={9} tickLine={false} tickFormatter={(val) => `${val}`} fontFamily="monospace" width={45} />
                            <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      {/* ALT GRAFİK: RSI (%30) */}
                      <div className="h-[30%] w-full relative">
                        <div className="absolute top-1 left-1 text-[9px] font-mono text-zinc-500 z-10">RSI(14)</div>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} fontFamily="monospace" minTickGap={30} />
                            <YAxis domain={[0, 100]} ticks={[30, 70]} stroke="#52525b" fontSize={9} tickLine={false} fontFamily="monospace" width={45} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            
                            <Line type="step" dataKey={() => 70} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                            <Line type="step" dataKey={() => 30} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="rsi" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    // TAM BOY GRAFİK (FİYAT VEYA BOLLINGER)
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColor} stopOpacity={0.5} />
                              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} fontFamily="monospace" minTickGap={30} />
                          <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={9} tickLine={false} tickFormatter={(val) => `${val}`} fontFamily="monospace" width={45} />
                          <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
                          
                          {/* BOLLINGER BULUTU (Şeffaf Mavi Arka Plan) */}
                          {activeIndicator === "bb" && (
                            <Area type="monotone" dataKey="bbBand" fill="#3b82f6" fillOpacity={0.1} stroke="none" isAnimationActive={false} />
                          )}

                          {/* ANA FİYAT */}
                          <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={false} />
                          
                          {/* BOLLINGER ÇİZGİLERİ */}
                          {activeIndicator === "bb" && (
                            <>
                              <Line type="monotone" dataKey="bbUpper" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="bbMiddle" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="bbLower" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                            </>
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-zinc-950/80 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Bell className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">Fiyat Alarmı Kur</h3>
                  <p className="text-xs text-zinc-500 font-mono">Hedef fiyat gerçekleştiğinde masaüstü bildirimi al.</p>
                </div>
              </div>

              <form onSubmit={handleCreateAlert} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select 
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value as "above" | "below")}
                  disabled={!user}
                  className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-xl px-3 py-2 font-mono outline-none focus:border-emerald-500"
                >
                  <option value="above">Üstüne Çıkarsa</option>
                  <option value="below">Altına Düşerse</option>
                </select>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">₺</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value ? Number(e.target.value) : "")}
                    disabled={!user}
                    placeholder="Fiyat"
                    className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-xl pl-7 pr-3 py-2 font-mono w-24 outline-none focus:border-emerald-500"
                  />
                </div>

                <button type="submit" disabled={!user || alertLoading} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-bold font-mono rounded-xl transition flex items-center justify-center gap-2">
                  {alertLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kur"}
                </button>
              </form>
            </div>
            
            {alertMessage.text && (
              <div className={`mt-2 text-xs font-mono px-4 py-2 rounded-xl ${alertMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {alertMessage.text}
              </div>
            )}
            
            {!user && (
              <div className="mt-2 text-[10px] text-amber-400/80 font-mono text-right w-full">
                * Sistemde masaüstü alarmı kurabilmek için giriş yapmalısınız.
              </div>
            )}

          </div>
        </div>
      )}

      <StockChatbot stocks={stocks} indices={indices} userName={user?.user_metadata?.full_name || null} />
    </main>
  );
}