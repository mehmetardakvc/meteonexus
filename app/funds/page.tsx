"use client";

import Link from "next/link";
import { ArrowLeft, Settings, AlertTriangle } from "lucide-react";

export default function FundsPage() {
  return (
    <main className="min-h-screen bg-[#03050a] text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Arka Plan Parlamaları */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/3 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg p-8 md:p-12 bg-zinc-950/80 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
        
        <div className="relative mb-6">
          {/* Dönen Çark İkonu */}
          <Settings className="w-20 h-20 text-purple-500/80 animate-[spin_4s_linear_infinite]" />
          <AlertTriangle className="w-8 h-8 text-amber-500 absolute -bottom-1 -right-1 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
        </div>

        <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-500 mb-4">
          SİSTEM BAKIMDA
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 font-mono">
          TEFAS veri sağlayıcılarındaki altyapı güncellemeleri ve bağlantı optimizasyonları nedeniyle <strong>NEXUS FON TERMİNALİ</strong> geçici olarak servis dışıdır. Anlayışınız için teşekkür ederiz.
        </p>

        <Link 
          href="/stocks" 
          className="px-6 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-black rounded-2xl font-bold font-mono tracking-wide transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        >
          <ArrowLeft className="w-5 h-5" />
          ANA TERMİNALE DÖN
        </Link>
        
      </div>
    </main>
  );
}