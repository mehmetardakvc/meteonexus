"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import Link from "next/link"; // Next.js link bileşenini ekledik

export default function LoginButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center gap-1 bg-zinc-950/80 border border-cyan-500/30 pl-1.5 pr-1.5 py-1.5 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all hover:border-cyan-400">
        {/* İsme tıklayınca /account'a giden Link alanı */}
        <Link 
          href="/account" 
          className="flex items-center gap-2 px-2 py-1 hover:bg-cyan-500/10 rounded-xl transition-colors cursor-pointer"
          title="Hesabıma Git"
        >
          <img 
            src={user.user_metadata.avatar_url || "https://www.gravatar.com/avatar?d=mp"} 
            alt="Avatar" 
            className="w-6 h-6 rounded-full border border-cyan-500/50" 
          />
          <span className="text-xs font-mono text-cyan-100 font-bold truncate max-w-[90px]">
            {user.user_metadata.full_name?.split(" ")[0]}
          </span>
        </Link>
        
        {/* Ayrı bir Çıkış yapma butonu */}
        <button 
          onClick={handleLogout} 
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Çıkış Yap"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin} 
      className="group flex items-center gap-2.5 bg-zinc-950/80 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 px-4 py-2 rounded-2xl transition-all duration-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
    >
      <svg className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#06b6d4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#22d3ee" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#67e8f9" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#06b6d4" />
      </svg>
      <span className="text-xs font-mono font-bold text-cyan-300 group-hover:text-white tracking-wide transition-colors">
        SİSTEME GİRİŞ YAP
      </span>
    </button>
  );
}