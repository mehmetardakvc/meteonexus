"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart, Loader2, Search, Activity, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface PortfolioItem {
  id: number;
  symbol: string;
  asset_type: "stock" | "crypto";
  quantity: number;
  buy_price: number;
}

interface SearchableAsset {
  symbol: string;
  name: string;
  price: number;
}

export default function PortfolioPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fiyat ve Günlük % Değişim Verisi
  const [marketData, setMarketData] = useState<Record<string, { price: number; change: number }>>({});
  const [availableStocks, setAvailableStocks] = useState<SearchableAsset[]>([]);
  const [availableCryptos, setAvailableCryptos] = useState<SearchableAsset[]>([]);

  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState<"stock" | "crypto">("stock");
  const [quantity, setQuantity] = useState<number | "">("");
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase.from("user_portfolio").select("*").eq("user_id", user.id).order('created_at', { ascending: false });
        if (data) setPortfolio(data);
      }

      try {
        const [stocksRes, cryptoRes] = await Promise.all([
          fetch("/api/stocks", { cache: "no-store" }).catch(() => null),
          fetch("/api/crypto", { cache: "no-store" }).catch(() => null),
        ]);

        const mData: Record<string, { price: number; change: number }> = {};
        const sList: SearchableAsset[] = [];
        const cList: SearchableAsset[] = [];

        if (stocksRes && stocksRes.ok) {
          const sData = await stocksRes.json();
          [...(sData.indices || []), ...(sData.stocks || [])].forEach((s: any) => {
            mData[s.code.toUpperCase()] = { price: s.price, change: s.change };
            sList.push({ symbol: s.code.toUpperCase(), name: s.name, price: s.price });
          });
          setAvailableStocks(sList);
        }

        if (cryptoRes && cryptoRes.ok) {
          const cData = await cryptoRes.json();
          cData.crypto?.forEach((c: any) => {
            mData[c.symbol.toUpperCase()] = { price: c.price, change: c.change };
            cList.push({ symbol: c.symbol.toUpperCase(), name: c.pair || c.symbol, price: c.price });
          });
          setAvailableCryptos(cList);
        }

        setMarketData(mData);
      } catch (err) {
        console.error("Fiyat çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase]);

  useEffect(() => {
    setSearchTerm("");
    setSymbol("");
    setBuyPrice("");
  }, [assetType]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Portföy oluşturmak için giriş yapmalısın!");
      return;
    }
    if (!symbol || !quantity || !buyPrice) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    setSubmitting(true);
    const newItem = {
      user_id: user.id,
      symbol: symbol.toUpperCase().trim(),
      asset_type: assetType,
      quantity: Number(quantity),
      buy_price: Number(buyPrice)
    };

    const { data, error } = await supabase.from("user_portfolio").insert(newItem).select().single();
    setSubmitting(false);

    if (error) {
      console.error("SUPABASE HATASI:", error);
      alert(`Varlık eklenemedi! Sebep: ${error.message}`);
    } else if (data) {
      setPortfolio(prev => [data, ...prev]);
      setSymbol("");
      setSearchTerm("");
      setQuantity("");
      setBuyPrice("");
    }
  };

  const handleDelete = async (id: number) => {
    await supabase.from("user_portfolio").delete().eq("id", id);
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  const usdTryRate = marketData["USDTRY"]?.price || 34.0;

  let totalInvestedTL = 0;
  let totalCurrentValueTL = 0;
  let totalDailyPnLTL = 0; // Yeni: Toplam Günlük Kâr/Zarar
  let hasStocks = false;
  let hasCrypto = false;

  const calculatedItems = portfolio.map(item => {
    const isStock = item.asset_type === "stock";
    if (isStock) hasStocks = true;
    else hasCrypto = true;

    const mItem = marketData[item.symbol] || { price: item.buy_price, change: 0 };
    const currentPrice = mItem.price;
    const dailyChangePercent = mItem.change;

    const invested = item.quantity * item.buy_price;
    const currentValue = item.quantity * currentPrice;
    
    const pnl = currentValue - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    // GÜNLÜK PnL HESAPLAMASI
    // Matematik: Mevcut Fiyat = Dünkü Fiyat * (1 + %Değişim / 100)
    // Dünkü Fiyat = Mevcut Fiyat / (1 + %Değişim / 100)
    const prevPrice = currentPrice / (1 + dailyChangePercent / 100);
    const dailyPnL = (currentPrice - prevPrice) * item.quantity;

    if (isStock) {
      totalInvestedTL += invested;
      totalCurrentValueTL += currentValue;
      totalDailyPnLTL += dailyPnL;
    } else {
      totalInvestedTL += invested * usdTryRate;
      totalCurrentValueTL += currentValue * usdTryRate;
      totalDailyPnLTL += dailyPnL * usdTryRate;
    }

    return { ...item, currentPrice, currentValue, pnl, pnlPercent, dailyPnL, dailyChangePercent, isStock };
  });

  const totalPnLTL = totalCurrentValueTL - totalInvestedTL;
  const totalPnLPercent = totalInvestedTL > 0 ? (totalPnLTL / totalInvestedTL) * 100 : 0;

  // Günlük PnL Yüzdesi Hesaplama (Dünkü Toplam Değere Göre)
  const prevTotalValueTL = totalCurrentValueTL - totalDailyPnLTL;
  const totalDailyPnLPercent = prevTotalValueTL > 0 ? (totalDailyPnLTL / prevTotalValueTL) * 100 : 0;

  const showSummaryInUSD = hasCrypto && !hasStocks;
  const summarySymbol = showSummaryInUSD ? "$" : "₺";
  const summaryLocale = showSummaryInUSD ? "en-US" : "tr-TR";
  const summaryMultiplier = showSummaryInUSD ? (1 / usdTryRate) : 1;

  const displayTotalValue = totalCurrentValueTL * summaryMultiplier;
  const displayTotalInvested = totalInvestedTL * summaryMultiplier;
  const displayTotalPnL = totalPnLTL * summaryMultiplier;
  const displayTotalDailyPnL = totalDailyPnLTL * summaryMultiplier;

  const currentSearchList = assetType === "stock" ? availableStocks : availableCryptos;
  const filteredSearchList = searchTerm
    ? currentSearchList.filter(item => 
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 30)
    : [];

  return (
    <main className="min-h-screen bg-[#03050a] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-zinc-900/80 border border-emerald-500/30 rounded-2xl hover:border-emerald-400 text-emerald-400 transition flex items-center justify-center backdrop-blur-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Varlık & Sermaye Yönetimi
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-500">
                NEXUS<span className="text-emerald-400"> PORTFOLIO</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/stocks" className="px-6 py-2.5 bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold tracking-wide hover:bg-emerald-500/10 transition-all">
              BİST TERMİNALİ
            </Link>
            <Link href="/crypto" className="px-6 py-2.5 bg-zinc-900/80 border border-amber-500/30 text-amber-400 rounded-full text-sm font-bold tracking-wide hover:bg-amber-500/10 transition-all">
              KRİPTO AĞI
            </Link>
          </div>
        </header>

        {/* ÖZET KARTLARI (4'LÜ GRID) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <Wallet className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Toplam Portföy Değeri</div>
              <div className="text-xl md:text-2xl font-black text-white font-mono">
                {summarySymbol}{displayTotalValue.toLocaleString(summaryLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex items-center gap-4 hover:border-purple-500/30 transition-colors">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
              <PieChart className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Yatırılan Maliyet</div>
              <div className="text-xl md:text-2xl font-black text-white font-mono">
                {summarySymbol}{displayTotalInvested.toLocaleString(summaryLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${totalPnLTL >= 0 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
              {totalPnLTL >= 0 ? <Activity className="w-6 h-6 md:w-8 md:h-8" /> : <TrendingDown className="w-6 h-6 md:w-8 md:h-8" />}
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Toplam Kâr / Zarar</div>
              <div className={`text-lg md:text-xl font-black font-mono ${totalPnLTL >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {totalPnLTL >= 0 ? "+" : ""}{summarySymbol}{displayTotalPnL.toLocaleString(summaryLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                <span className="text-xs ml-1">({totalPnLPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 shadow-xl flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${totalDailyPnLTL >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
              {totalDailyPnLTL >= 0 ? <TrendingUp className="w-6 h-6 md:w-8 md:h-8" /> : <TrendingDown className="w-6 h-6 md:w-8 md:h-8" />}
            </div>
            <div>
              <div className="text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Günlük Değişim</div>
              <div className={`text-lg md:text-xl font-black font-mono ${totalDailyPnLTL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalDailyPnLTL >= 0 ? "+" : ""}{summarySymbol}{displayTotalDailyPnL.toLocaleString(summaryLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                <span className="text-xs ml-1">({totalDailyPnLPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* VARLIK EKLEME FORMU */}
        <div className="bg-zinc-950/90 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative z-20">
          <h2 className="text-lg font-bold font-mono text-emerald-400 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Portföye Yeni Varlık Ekle
          </h2>

          <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Varlık Tipi</label>
              <select 
                value={assetType} 
                onChange={(e) => setAssetType(e.target.value as "stock" | "crypto")}
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3.5 font-mono outline-none focus:border-emerald-500"
              >
                <option value="stock">BİST Hisse / Döviz</option>
                <option value="crypto">Kripto Para</option>
              </select>
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Sembol Ara</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSymbol(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={assetType === "stock" ? "Örn: THYAO" : "Örn: BTC"} 
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl pl-10 pr-4 py-3.5 font-mono outline-none focus:border-emerald-500 uppercase"
                  required
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              </div>
              
              {showDropdown && filteredSearchList.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-emerald-500/30 rounded-xl shadow-2xl max-h-60 overflow-y-auto scrollbar-none">
                  {filteredSearchList.map((item) => (
                    <div 
                      key={item.symbol}
                      className="px-4 py-3 hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition-colors border-b border-zinc-800/50 last:border-none group"
                      onClick={() => {
                        setSearchTerm(item.symbol);
                        setSymbol(item.symbol);
                        setBuyPrice(item.price);
                        setShowDropdown(false);
                      }}
                    >
                      <div>
                        <div className="font-bold text-emerald-400 font-mono text-sm group-hover:text-emerald-300">{item.symbol}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">{item.name}</div>
                      </div>
                      <div className="font-mono text-xs font-bold text-white bg-zinc-800/80 px-2 py-1 rounded-lg">
                        {assetType === "stock" ? "₺" : "$"}{item.price.toLocaleString(assetType === "stock" ? "tr-TR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Adet / Miktar</label>
              <input 
                type="number" 
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
                placeholder="Örn: 100" 
                className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3.5 font-mono outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Alış Maliyeti</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">{assetType === "stock" ? "₺" : "$"}</span>
                <input 
                  type="number" 
                  step="any"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value ? Number(e.target.value) : "")}
                  placeholder="310.50" 
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl pl-8 pr-4 py-3.5 font-mono outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-end">
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Portföye Ekle"}
              </button>
            </div>
          </form>
        </div>

        {/* VARLIKLAR TABLOSU */}
        <div className="bg-zinc-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl relative z-10">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white font-mono">Varlık Dağılımı & Canlı PnL</h2>
            <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5 bg-zinc-900 py-1.5 px-3 rounded-full border border-zinc-800">
               <Activity className="w-3.5 h-3.5 text-emerald-500" /> API Canlı Akış
            </div>
          </div>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-mono text-sm">
              <ShieldCheck className="w-12 h-12 text-zinc-700 mb-4" />
              <span>Portföyünüzü görmek için giriş yapmalısınız.</span>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-20 text-emerald-500 font-mono text-sm animate-pulse">Portföy Yükleniyor...</div>
          ) : calculatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-mono text-sm">
              <Wallet className="w-10 h-10 text-zinc-700 mb-4 opacity-50" />
              <span>Henüz portföyünüze varlık eklemediniz.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-900/50 border-b border-white/10 text-zinc-400 text-xs uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Varlık</th>
                    <th className="px-6 py-4 font-bold">Tür</th>
                    <th className="px-6 py-4 font-bold">Miktar</th>
                    <th className="px-6 py-4 font-bold">Alış Fiyatı</th>
                    <th className="px-6 py-4 font-bold">Güncel Fiyat</th>
                    <th className="px-6 py-4 font-bold">Toplam Değer</th>
                    <th className="px-6 py-4 font-bold">Günlük Kâr / Zarar</th>
                    <th className="px-6 py-4 font-bold">Toplam Kâr / Zarar</th>
                    <th className="px-6 py-4 font-bold text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculatedItems.map((item) => {
                    const isTotalPos = item.pnl >= 0;
                    const isDailyPos = item.dailyPnL >= 0;
                    const currSymbol = item.isStock ? "₺" : "$";
                    const currLocale = item.isStock ? "tr-TR" : "en-US";

                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-bold font-mono text-white text-base">
                          {item.symbol}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold flex items-center w-max gap-1 ${item.isStock ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {item.isStock ? 'Hisse/Endeks' : 'Kripto'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-300">{item.quantity.toLocaleString("tr-TR")}</td>
                        <td className="px-6 py-4 font-mono text-zinc-400">
                          {currSymbol}{item.buy_price.toLocaleString(currLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-mono text-white font-bold">
                          {currSymbol}{item.currentPrice.toLocaleString(currLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-mono text-white font-bold">
                          {currSymbol}{item.currentValue.toLocaleString(currLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        
                        {/* GÜNLÜK PNL SÜTUNU */}
                        <td className={`px-6 py-4 font-mono font-bold ${isDailyPos ? "text-emerald-400" : "text-red-400"}`}>
                          <div className="flex items-center gap-1.5">
                            {isDailyPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {isDailyPos ? "+" : ""}{currSymbol}{item.dailyPnL.toLocaleString(currLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isDailyPos ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                              {isDailyPos ? "+" : ""}{item.dailyChangePercent.toFixed(2)}%
                            </span>
                          </div>
                        </td>

                        {/* TOPLAM PNL SÜTUNU */}
                        <td className={`px-6 py-4 font-mono font-bold ${isTotalPos ? "text-blue-400" : "text-red-400"}`}>
                          <div className="flex items-center gap-1.5">
                            {isTotalPos ? "+" : ""}{currSymbol}{item.pnl.toLocaleString(currLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                            <span className="text-xs text-zinc-500 font-normal">
                              ({isTotalPos ? "+" : ""}{item.pnlPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30 opacity-0 group-hover:opacity-100"
                            title="Varlığı Sil"
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

      </div>
    </main>
  );
}