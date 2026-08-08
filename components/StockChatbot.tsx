"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2, User as UserIcon } from "lucide-react";

interface MarketData {
  code: string;
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

interface Message {
  sender: "ai" | "user";
  text: string;
  time: string;
}

// YENİ: userName prop'u eklendi
export default function StockChatbot({ stocks, indices, userName }: { stocks: MarketData[], indices: MarketData[], userName?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // YENİ: İsim varsa ismiyle, yoksa standart selamla başla
  const getGreeting = (name?: string | null) => {
    const firstName = name ? name.split(" ")[0] : "";
    return firstName 
      ? `Selam ${firstName}! Ben NEXUS AI. Piyasada anlık ne var ne yok her şeye hakimim. 'SASA hacmi nedir?', 'En çok yükselenler hangileri?' veya 'THYAO fiyatı kaç?' gibi sorular sorabilirsin! 🚀`
      : `Selam! Ben NEXUS AI. Piyasada anlık ne var ne yok her şeye hakimim. 'SASA hacmi nedir?', 'En çok yükselenler hangileri?' veya 'THYAO fiyatı kaç?' gibi sorular sorabilirsin! 🚀`;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: getGreeting(userName),
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Giriş yapıldığında ilk mesajı anında güncelle
  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === "ai") {
      setMessages([{ sender: "ai", text: getGreeting(userName), time: messages[0].time }]);
    }
  }, [userName]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { sender: "user", text: query, time: now };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const allMarketData = [...indices, ...stocks];
      
      const res = await fetch("/api/stocks/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, marketData: allMarketData }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          sender: "ai",
          text: data.reply,
          time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: "ai", text: "Bağlantı hatası oluştu.", time: now }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "SASA hacmi nedir?",
    "En çok yükselenler",
    "BİST 100 anlık durum",
    "THYAO detaylı analiz"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-zinc-950 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 px-5 py-3.5 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transition-all duration-300 backdrop-blur-xl"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
          </div>
          <span className="font-mono text-xs font-bold tracking-wider text-white">NEXUS AI BOT</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-[#03050a] border border-emerald-500/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col overflow-hidden backdrop-blur-2xl animate-fade-in">
          
          <div className="p-4 bg-zinc-950/90 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                  NEXUS AI <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </h3>
                <span className="text-[10px] font-mono text-emerald-400/80">Veri Odaklı Borsa Asistanı</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-400 text-zinc-400 hover:text-white rounded-full transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed font-sans ${
                  msg.sender === "user"
                    ? "bg-emerald-500 text-black font-semibold rounded-br-none shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none whitespace-pre-line"
                }`}>
                  <p>{msg.text}</p>
                  <span className={`text-[9px] font-mono block mt-1.5 text-right ${msg.sender === "user" ? "text-black/60" : "text-zinc-500"}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" /> Veriler Analiz Ediliyor...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-2 bg-zinc-950/60 border-t border-zinc-900 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((prompt, i) => (
              <button key={i} onClick={() => handleSend(prompt)} disabled={loading} className="text-[10px] font-mono whitespace-nowrap bg-zinc-900/90 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg transition">
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-zinc-950 border-t border-emerald-500/20 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="SASA hacmi nedir? vs..." className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono transition" />
            <button type="submit" disabled={loading || !input.trim()} className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black px-4 rounded-xl transition flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}