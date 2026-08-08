"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Radio, Globe, Clock, ExternalLink, Zap, Search, RefreshCw, Loader2, Building2, BookOpen, Cpu, TrendingUp, Newspaper, X, AlignLeft } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  time: string;
  date: string;
  category: string;
  source: string;
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("--:--");

  // MODAL VE HABER OKUMA STATELERİ
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);
  const [articleContent, setArticleContent] = useState<string>("");
  const [isArticleLoading, setIsArticleLoading] = useState(false);

  const categories = [
    { name: "Tümü", icon: <Newspaper className="w-3.5 h-3.5" /> },
    { name: "Gündem", icon: <Radio className="w-3.5 h-3.5" /> },
    { name: "Borsa & BİST", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { name: "Ekonomi", icon: <Globe className="w-3.5 h-3.5" /> },
    { name: "Teknoloji", icon: <Cpu className="w-3.5 h-3.5" /> }
  ];

  const fetchLiveNews = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          setNews(data.articles);
        } else if (Array.isArray(data)) {
          setNews(data);
        } else {
          setNews([]);
        }
        
        const now = new Date();
        setLastUpdated(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      }
    } catch (err) {
      console.error("Haberler çekilemedi:", err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNews(true);
    const interval = setInterval(() => {
      if (isAutoRefreshing) fetchLiveNews(false);
    }, 60000); 
    return () => clearInterval(interval);
  }, [isAutoRefreshing]);

  const openFullArticle = async (article: NewsItem) => {
    setActiveNews(article);
    setArticleContent("");
    setIsArticleLoading(true);

    try {
      const res = await fetch(`/api/news/read?url=${encodeURIComponent(article.url)}`);
      if (res.ok) {
        const data = await res.json();
        setArticleContent(data.content);
      } else {
        setArticleContent("İçerik çekilemedi.");
      }
    } catch (err) {
      setArticleContent("Bağlantı hatası oluştu.");
    } finally {
      setIsArticleLoading(false);
    }
  };

  // FÜTÜRİSTİK TEKNOLOJİ GÖRSELİ BURADA GÜNCELLENDİ
  const getFallbackImage = (category: string) => {
    if (category === "Borsa & BİST") return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80";
    if (category === "Ekonomi") return "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80";
    if (category === "Teknoloji") return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"; // YENİ: Makro devre kartı / Fütüristik donanım
    if (category === "Gündem") return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80"; 
    return "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80";
  };

  const safeNews = Array.isArray(news) ? news : [];
  const filteredNews = safeNews.filter((item) => {
    const matchesCategory = selectedCategory === "Tümü" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const breakingNews = safeNews.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#03050a] text-zinc-100 p-4 md:p-10 font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-cyan-500/20 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-zinc-900/80 border border-cyan-500/30 rounded-2xl hover:border-cyan-400 text-cyan-400 transition flex items-center justify-center backdrop-blur-xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> 
                  TÜRKİYE HABER AĞI (SON 24 SAAT)
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-500">
                NEXUS<span className="text-cyan-400"> NEWS</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
              className={`text-xs font-mono px-4 py-2.5 rounded-2xl transition flex items-center gap-2 border font-semibold backdrop-blur-xl ${
                isAutoRefreshing 
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}
            >
              <Radio className={`w-4 h-4 ${isAutoRefreshing ? "animate-pulse text-emerald-400" : "text-zinc-600"}`} />
              <span className="hidden sm:inline">{isAutoRefreshing ? "CANLI AKIŞ: AÇIK" : "CANLI AKIŞ: PAUSED"}</span>
            </button>

            <button 
              onClick={() => fetchLiveNews(true)}
              disabled={loading}
              className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl hover:bg-cyan-500/20 hover:border-cyan-400 transition-all flex items-center gap-2 font-semibold disabled:opacity-50 font-mono text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">YENİLE ({lastUpdated})</span>
            </button>
          </div>
        </header>

        {!loading && breakingNews.length > 0 && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <div className="bg-red-500 text-white font-black px-4 py-3 flex items-center gap-2 z-10 shadow-lg whitespace-nowrap">
              <Zap className="w-4 h-4 fill-white animate-pulse" /> SON HABERLER
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="whitespace-nowrap animate-[ticker_25s_linear_infinite] inline-block px-4 font-mono text-sm text-red-200">
                {breakingNews.map(n => (
                  <span key={n.id} className="mx-8">
                    • <span className="font-bold text-white">{n.source} ({n.time}):</span> {n.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all border whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === cat.name 
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Haber veya kaynak ara..."
              className="w-full bg-zinc-950/80 border border-cyan-500/30 rounded-2xl pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        {!loading && safeNews.length > 0 && (
           <div className="text-xs font-mono text-zinc-500 border-b border-zinc-900 pb-2">
             Son 24 saatte çekilen toplam <strong className="text-cyan-400">{filteredNews.length}</strong> Türkiye haberi listeleniyor.
           </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-28 text-cyan-500 gap-4 bg-zinc-950/40 border border-cyan-500/20 rounded-3xl backdrop-blur-xl">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="font-mono text-sm tracking-widest uppercase">Yerel Ajanslara Bağlanılıyor...</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-zinc-600 font-mono text-sm border border-zinc-800/50 rounded-3xl bg-zinc-950/50">
            Arama kriterinize uygun güncel haber bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {filteredNews.map((article, index) => {
              const isLead = index === 0 && selectedCategory === "Tümü" && !searchQuery;
              
              return (
                <article 
                  key={article.id} 
                  className={`group relative rounded-3xl overflow-hidden bg-zinc-950/80 border border-zinc-800/80 hover:border-cyan-500/50 transition-all duration-500 shadow-xl flex flex-col ${isLead ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <div className={`relative w-full ${isLead ? 'h-64' : 'h-48'} overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
                    <img 
                      src={getFallbackImage(article.category)} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70 group-hover:opacity-100"
                    />
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                      <span className="px-3 py-1 bg-cyan-500/90 text-black font-black font-mono text-[10px] uppercase rounded-full shadow-lg">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1 relative z-20 -mt-12">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-cyan-300">
                        <Globe className="w-3 h-3" /> {article.source}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {article.time} - {article.date}
                      </div>
                    </div>
                    
                    <h2 className={`font-black text-white group-hover:text-cyan-400 transition-colors ${isLead ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                      {article.title}
                    </h2>

                    <div className="mt-auto pt-5">
                      <button 
                        onClick={() => openFullArticle(article)}
                        className="inline-flex items-center gap-2 text-xs font-bold font-mono text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50"
                      >
                        <AlignLeft className="w-3.5 h-3.5" /> Haberi Terminalde Oku
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {activeNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl bg-[#03050a] border border-cyan-500/40 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col max-h-[90vh]">
            
            <button 
              onClick={() => setActiveNews(null)}
              className="absolute top-5 right-5 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-cyan-400 rounded-full transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-full">
                  {activeNews.category.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> {activeNews.time} | {activeNews.date}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                {activeNews.title}
              </h2>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pt-1 pb-4">
                <Building2 className="w-4 h-4 text-emerald-400" /> Kaynak: <span className="text-white font-semibold">{activeNews.source}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
              <div className="text-[15px] text-zinc-300 leading-relaxed font-normal whitespace-pre-line border-t border-zinc-800/80 pt-6 min-h-[200px]">
                {isArticleLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-cyan-500 h-full w-full">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-widest text-center px-4">
                      Yapay Zeka Haberi Kazıyor...<br/>(Reklamlar ve menüler temizleniyor)
                    </span>
                  </div>
                ) : (
                  articleContent
                )}
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-zinc-800/80 flex justify-between items-center text-xs font-mono shrink-0">
              <a 
                href={activeNews.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Orijinal Sitede Gör <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </main>
  );
}