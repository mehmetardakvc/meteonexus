"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Mail, Calendar, LogOut, ShieldCheck, Wallet, Bell, Star, PieChart as PieChartIcon, Activity, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface PortfolioItem {
  id: number;
  symbol: string;
  asset_type: "stock" | "crypto";
  quantity: number;
  buy_price: number;
}

export default function AccountPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // İstatistik State'leri
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  
  // Canlı Değerler ve Kâr/Zarar State'leri
  const [totalStockValueTL, setTotalStockValueTL] = useState(0);
  const [totalCryptoValueUSD, setTotalCryptoValueUSD] = useState(0);
  const [totalInvestedTL, setTotalInvestedTL] = useState(0);
  const [totalDailyPnLTL, setTotalDailyPnLTL] = useState(0);
  const [usdRate, setUsdRate] = useState(34.0);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Portföy, Alarm ve Takip Listesi verilerini paralel çek
        const [portRes, alertRes, watchRes] = await Promise.all([
          supabase.from("user_portfolio").select("*").eq("user_id", user.id),
          supabase.from("stock_alerts").select("id", { count: 'exact' }).eq("user_id", user.id),
          supabase.from("stock_watchlist").select("id", { count: 'exact' }).eq("user_id", user.id)
        ]);

        const userPortfolio = portRes.data || [];
        setPortfolio(userPortfolio);
        setAlertCount(alertRes.count || 0);
        setWatchlistCount(watchRes.count || 0);

        // Canlı Fiyatları ve % Değişimleri Çek
        try {
          const [stocksApi, cryptoApi] = await Promise.all([
            fetch("/api/stocks").catch(() => null),
            fetch("/api/crypto").catch(() => null)
          ]);

          const marketData: Record<string, { price: number; change: number }> = {};
          
          if (stocksApi && stocksApi.ok) {
            const sData = await stocksApi.json();
            [...(sData.indices || []), ...(sData.stocks || [])].forEach((s: any) => {
              marketData[s.code.toUpperCase()] = { price: s.price, change: s.change };
            });
          }

          if (cryptoApi && cryptoApi.ok) {
            const cData = await cryptoApi.json();
            cData.crypto?.forEach((c: any) => {
              marketData[c.symbol.toUpperCase()] = { price: c.price, change: c.change };
            });
          }

          const currentUsdRate = marketData["USDTRY"]?.price || 34.0;
          setUsdRate(currentUsdRate);

          let stockTL = 0;
          let cryptoUSD = 0;
          let investedTL = 0;
          let dailyPnLTL = 0;

          // Matematiksel Hesaplamalar
          userPortfolio.forEach(item => {
            const mItem = marketData[item.symbol] || { price: item.buy_price, change: 0 };
            const currentPrice = mItem.price;
            const changePct = mItem.change;

            const currentValue = item.quantity * currentPrice;
            const invested = item.quantity * item.buy_price;
            
            // Günlük PnL (Dünkü kapanış fiyatını bularak)
            const prevPrice = currentPrice / (1 + changePct / 100);
            const dailyPnL = (currentPrice - prevPrice) * item.quantity;

            if (item.asset_type === "stock") {
              stockTL += currentValue;
              investedTL += invested;
              dailyPnLTL += dailyPnL;
            } else {
              cryptoUSD += currentValue;
              investedTL += invested * currentUsdRate;
              dailyPnLTL += dailyPnL * currentUsdRate;
            }
          });

          setTotalStockValueTL(stockTL);
          setTotalCryptoValueUSD(cryptoUSD);
          setTotalInvestedTL(investedTL);
          setTotalDailyPnLTL(dailyPnLTL);

        } catch (err) {
          console.error("Fiyat çekme hatası:", err);
        }
      }
      setLoading(false);
    }

    fetchUserData();
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03050a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-blue-500">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span className="font-mono text-sm tracking-widest uppercase">Profil Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#03050a] flex items-center justify-center p-4">
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl backdrop-blur-xl">
          <ShieldCheck className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white mb-2">Erişim Reddedildi</h1>
          <p className="text-zinc-400 text-sm mb-8">Kullanıcı profili ve yatırım analizlerini görüntülemek için sisteme giriş yapmalısınız.</p>
          <Link href="/" className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-black font-bold font-mono rounded-xl transition w-full inline-block">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  // Genel Toplamlar ve Yüzdeler
  const totalValueInTL = totalStockValueTL + (totalCryptoValueUSD * usdRate);
  
  const totalPnLTL = totalValueInTL - totalInvestedTL;
  const totalPnLPercent = totalInvestedTL > 0 ? (totalPnLTL / totalInvestedTL) * 100 : 0;
  
  const prevTotalValueTL = totalValueInTL - totalDailyPnLTL;
  const dailyPnLPercent = prevTotalValueTL > 0 ? (totalDailyPnLTL / prevTotalValueTL) * 100 : 0;

  // Akıllı Yatırımcı Analizi ve Unvanı
  let investorTitle = "Çaylak Yatırımcı";
  let titleColor = "text-zinc-400";
  let titleBg = "bg-zinc-900";
  let titleBorder = "border-zinc-800";

  if (totalValueInTL > 0) {
    const cryptoRatio = (totalCryptoValueUSD * usdRate) / totalValueInTL;
    
    if (cryptoRatio > 0.7) {
      investorTitle = "Kripto Balinası";
      titleColor = "text-amber-400";
      titleBg = "bg-amber-500/10";
      titleBorder = "border-amber-500/30";
    } else if (cryptoRatio < 0.3) {
      investorTitle = "BİST Stratejisti";
      titleColor = "text-emerald-400";
      titleBg = "bg-emerald-500/10";
      titleBorder = "border-emerald-500/30";
    } else {
      investorTitle = "Dengeli Kurumsal";
      titleColor = "text-blue-400";
      titleBg = "bg-blue-500/10";
      titleBorder = "border-blue-500/30";
    }
  }

  const joinDate = new Date(user.created_at).toLocaleDateString("tr-TR", { year: 'numeric', month: 'long', day: 'numeric' });
  const emailName = user.email ? user.email.split('@')[0] : "Kullanıcı";
  const fullName = user.user_metadata?.full_name || emailName;

  // Pasta Grafik Verisi
  const pieData = [
    { name: 'BİST Hisseleri', value: totalStockValueTL, color: '#10b981' }, 
    { name: 'Kripto Varlıklar', value: totalCryptoValueUSD * usdRate, color: '#f59e0b' } 
  ].filter(d => d.value > 0);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl">
          <p className="text-[10px] text-zinc-400 font-mono mb-1 uppercase">{payload[0].name}</p>
          <p className="text-sm font-bold text-white font-mono">
            ₺{payload[0].value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-[#03050a] text-zinc-100 p-4 md:p-10 font-sans selection:bg-blue-500 selection:text-black relative overflow-hidden">
      
      {/* Arka Plan Parlaması */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-zinc-900/80 border border-blue-500/30 rounded-2xl hover:border-blue-400 text-blue-400 transition flex items-center justify-center backdrop-blur-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Hesap & Güvenlik Merkezi
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-500">
                NEXUS<span className="text-blue-400"> ID</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto scrollbar-none pb-2 md:pb-0">
            <Link href="/portfolio" className="px-5 py-2 bg-zinc-900/80 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold tracking-wide hover:bg-blue-500/10 transition-all flex items-center gap-1.5 whitespace-nowrap">
              <Wallet className="w-3.5 h-3.5" /> PORTFÖY
            </Link>
            <Link href="/stocks" className="px-5 py-2 bg-zinc-900/80 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold tracking-wide hover:bg-emerald-500/10 transition-all flex items-center gap-1.5 whitespace-nowrap">
               BİST
            </Link>
            <Link href="/crypto" className="px-5 py-2 bg-zinc-900/80 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold tracking-wide hover:bg-amber-500/10 transition-all flex items-center gap-1.5 whitespace-nowrap">
               KRİPTO
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* SOL SÜTUN: Profil Bilgileri */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profil Kartı */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -z-10 group-hover:bg-blue-500/20 transition-colors"></div>
              
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 p-0.5 flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-black text-blue-400 uppercase">{fullName.charAt(0)}</span>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h2 className="text-xl font-black text-white truncate" title={fullName}>{fullName}</h2>
                  <div className={`mt-1.5 inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold tracking-wider ${titleBg} ${titleColor} ${titleBorder}`}>
                    {investorTitle}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-zinc-400 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium">Katılım: {joinDate}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <button 
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold font-mono transition-colors flex items-center justify-center gap-2"
                >
                  {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {signingOut ? "Çıkış Yapılıyor..." : "Sistemden Çıkış Yap"}
                </button>
              </div>
            </div>

            {/* Hızlı İstatistikler */}
            <div className="bg-gradient-to-r from-blue-950/30 to-zinc-950/80 border border-blue-500/20 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Etkileşim Özeti
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Wallet className="w-4 h-4 text-blue-500" /> Varlık Sayısı
                  </div>
                  <span className="font-mono font-bold text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg">{portfolio.length}</span>
                </div>
                
                <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Bell className="w-4 h-4 text-emerald-500" /> Aktif Alarmlar
                  </div>
                  <span className="font-mono font-bold text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg">{alertCount}</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Star className="w-4 h-4 text-amber-500" /> Takip Listesi
                  </div>
                  <span className="font-mono font-bold text-white bg-zinc-800 px-2.5 py-0.5 rounded-lg">{watchlistCount}</span>
                </div>
              </div>
            </div>

          </div>

          {/* SAĞ SÜTUN: Değer Kartları ve Dağılım */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            
            {/* Değer Kartları (4'LÜ IZGARA) */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-3xl p-5 md:p-6 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors"></div>
                <div className="text-[9px] md:text-[10px] text-emerald-400 font-mono font-bold tracking-widest uppercase mb-1 md:mb-2">BİST Sermayesi</div>
                <div className="text-xl md:text-3xl font-black text-white font-mono">₺{totalStockValueTL.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              <div className="bg-zinc-950/80 border border-amber-500/20 rounded-3xl p-5 md:p-6 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors"></div>
                <div className="text-[9px] md:text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase mb-1 md:mb-2">Kripto Sermayesi</div>
                <div className="text-xl md:text-3xl font-black text-white font-mono">${totalCryptoValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[10px] md:text-xs font-mono text-zinc-500 mt-1">≈ ₺{(totalCryptoValueUSD * usdRate).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {/* Yeni: Toplam Kâr/Zarar */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 relative overflow-hidden group">
                <div className="text-[9px] md:text-[10px] text-zinc-400 font-mono font-bold tracking-widest uppercase mb-1 md:mb-2">Toplam Kâr / Zarar</div>
                <div className={`text-xl md:text-3xl font-black font-mono flex items-center gap-2 ${totalPnLTL >= 0 ? "text-blue-400" : "text-red-400"}`}>
                  {totalPnLTL >= 0 ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> : <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />}
                  {totalPnLTL >= 0 ? "+" : ""}₺{Math.abs(totalPnLTL).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] md:text-xs font-mono mt-1 ${totalPnLTL >= 0 ? "text-blue-500/70" : "text-red-500/70"}`}>
                  {totalPnLTL >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                </div>
              </div>

              {/* Yeni: Günlük Kâr/Zarar */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 md:p-6 relative overflow-hidden group">
                <div className="text-[9px] md:text-[10px] text-zinc-400 font-mono font-bold tracking-widest uppercase mb-1 md:mb-2">Günlük Değişim</div>
                <div className={`text-xl md:text-3xl font-black font-mono flex items-center gap-2 ${totalDailyPnLTL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalDailyPnLTL >= 0 ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> : <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />}
                  {totalDailyPnLTL >= 0 ? "+" : ""}₺{Math.abs(totalDailyPnLTL).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] md:text-xs font-mono mt-1 ${totalDailyPnLTL >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>
                  {totalDailyPnLTL >= 0 ? "+" : ""}{dailyPnLPercent.toFixed(2)}%
                </div>
              </div>

            </div>

            {/* Pasta Grafik: Varlık Dağılımı */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-blue-500" /> Varlık Dağılım Modeli (TL Bazlı)
                </h3>
                <Link href="/portfolio" className="text-xs font-mono text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors">
                  Detayları Gör
                </Link>
              </div>

              {totalValueInTL === 0 ? (
                <div className="h-[250px] flex flex-col justify-center items-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-2xl">
                  <PieChartIcon className="w-10 h-10 mb-3 opacity-20" />
                  <span>Sistemde analiz edilecek bir yatırım bulunamadı.</span>
                  <Link href="/portfolio" className="mt-3 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-colors">
                    Hemen Varlık Ekle
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Grafik */}
                  <div className="w-[250px] h-[250px] flex-shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          isAnimationActive={true}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} cursor={{fill: 'transparent'}} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Ortadaki Toplam Metni */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Toplam</span>
                      <span className="text-lg font-black text-white font-mono">₺{totalValueInTL >= 1_000_000 ? (totalValueInTL / 1_000_000).toFixed(2) + "M" : (totalValueInTL >= 1_000 ? (totalValueInTL / 1_000).toFixed(1) + "K" : totalValueInTL.toFixed(0))}</span>
                    </div>
                  </div>

                  {/* Lejant (Grafik Açıklamaları) */}
                  <div className="flex-1 w-full space-y-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}80` }}></div>
                          <span className="text-sm font-bold text-zinc-200">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-white">₺{item.value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          <div className="text-[10px] font-mono text-zinc-500">{((item.value / totalValueInTL) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
      </div>
    </main>
  );
}