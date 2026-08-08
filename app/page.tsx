"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Cloud, CloudRain, Calendar, Search, Loader2, Navigation, Clock, Activity, ShieldAlert, Droplets, Gauge, Cpu, Zap, Radio, TrendingUp, Bot, Sparkles, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import dynamicImport from "next/dynamic";
import LoginButton from "@/components/LoginButton";

const DroneMap = dynamicImport(() => import("../components/DroneMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-3xl bg-zinc-950 border border-cyan-500/20 flex flex-col items-center justify-center text-cyan-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      <span className="font-mono text-xs tracking-widest uppercase">Initializing Neural Drone Map...</span>
    </div>
  ),
});

const POPULAR_CITIES = [
  { name: "Ankara", country: "Türkiye", lat: 39.9334, lon: 32.8597 },
  { name: "İstanbul", country: "Türkiye", lat: 41.0082, lon: 28.9784 },
  { name: "Tokyo", country: "Japonya", lat: 35.6762, lon: 139.6503 },
  { name: "New York", country: "ABD", lat: 40.7128, lon: -74.0060 },
];

interface WeatherData {
  current_weather: { temperature: number; windspeed: number; weathercode: number; };
  hourly: { time: string[]; temperature_2m: number[]; weathercode: number[]; relative_humidity_2m: number[]; surface_pressure: number[]; uv_index: number[]; };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weathercode: number[]; uv_index_max: number[]; };
}

interface AirQualityData { current: { european_aqi: number; }; }
interface SearchResult { id: number; name: string; country: string; admin1?: string; latitude: number; longitude: number; }

export default function Home() {
  const [selectedCity, setSelectedCity] = useState(POPULAR_CITIES[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [isUvModalOpen, setIsUvModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const convertTemp = (tempC: number) => unit === "F" ? Math.round((tempC * 9) / 5 + 32) : Math.round(tempC);

  const fetchWeatherAndAirQuality = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,relative_humidity_2m,surface_pressure,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
      
      if (weatherRes.ok) {
        setWeather(await weatherRes.json());
      } else {
        setWeather(null);
      }

      try {
        const airRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`);
        if (airRes.ok) setAirQuality(await airRes.json());
        else setAirQuality(null);
      } catch { setAirQuality(null); }

      setSelectedDayIndex(0);
    } catch (error) { 
      console.log("Hava durumu API erişim hatası:", error); 
      setWeather(null);
    } 
    finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=tr&format=json`);
        if (res.ok) setSearchResults((await res.json()).results || []);
      } catch { setSearchResults([]); } 
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { fetchWeatherAndAirQuality(selectedCity.lat, selectedCity.lon); }, [selectedCity]);

  const handleSelectCity = (city: { name: string; country: string; lat: number; lon: number }) => {
    setSelectedCity(city);
    setSearchQuery("");
    searchResults.length > 0 && setSearchResults([]);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedCity({ name: "Mevcut Konum", country: "Türkiye", lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false)
    );
  };

  const getWeatherIcon = (code: number, size = "w-7 h-7") => {
    if (code === 0) return <Sun className={`${size} text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]`} />;
    if (code >= 1 && code <= 3) return <Cloud className={`${size} text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]`} />;
    return <CloudRain className={`${size} text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]`} />;
  };

  const getCityBackgroundImage = (cityName: string) => {
    const nameLower = cityName.toLowerCase().trim();
    if (nameLower.includes("adana")) return "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("alanya")) return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("ankara")) return "https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("istanbul")) return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("mersin")) return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("tokyo")) return "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("new york")) return "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1000&q=80";
    return "https://images.unsplash.com/photo-1477959858617-67f30ac4ce78?auto=format&fit=crop&w=1000&q=80";
  };

  const startHourIndex = selectedDayIndex * 24;
  const endHourIndex = startHourIndex + 24;

  const hourlyChartData = weather?.hourly?.temperature_2m
    ? weather.hourly.time.slice(startHourIndex, endHourIndex).map((timeStr, index) => {
        const globalIndex = startHourIndex + index;
        return {
          time: new Date(timeStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          temp: convertTemp(weather.hourly.temperature_2m[globalIndex]),
          code: weather.hourly?.weathercode?.[globalIndex] ?? 0,
        };
      })
    : [];

  const uvChartData = weather?.hourly?.uv_index
    ? weather.hourly.time.slice(startHourIndex, endHourIndex).map((timeStr, index) => {
        const globalIndex = startHourIndex + index;
        return {
          time: new Date(timeStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          uv: Number((weather.hourly.uv_index[globalIndex] ?? 0).toFixed(1)),
        };
      })
    : [];

  const nowHour = new Date().getHours();
  const displayHourIndex = selectedDayIndex === 0 ? nowHour : startHourIndex + 12;

  const currentUV = weather?.hourly?.uv_index?.[displayHourIndex] ?? 0;
  
  const currentAQI = airQuality?.current?.european_aqi ?? 0;
  const currentHumidity = weather?.hourly?.relative_humidity_2m?.[displayHourIndex] ?? 0;
  const currentPressure = weather?.hourly?.surface_pressure?.[displayHourIndex] ? Math.round(weather.hourly.surface_pressure[displayHourIndex]) : 0;

  const getAiAdvice = () => {
    if (!weather) return "Sistem verileri analiz ediliyor...";
    
    const tempC = weather.current_weather.temperature;
    const code = weather.current_weather.weathercode;
    const wind = weather.current_weather.windspeed;

    let advice: string[] = [];

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      advice.push("Yağışlı bir hava hakim. Yanınıza mutlaka şemsiye alın ve su birikintilerine karşı yağmurluğunuzu giyin.");
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
      advice.push("Kar yağışı gözlemleniyor. Sıkı giyinin ve ulaşımda yaşanabilecek buzlanma/aksamalara karşı dikkatli olun.");
    } else if ([95, 96, 99].includes(code)) {
      advice.push("Gök gürültülü fırtına uyarısı mevcut. Mümkünse kapalı alanlarda kalın ve elektronik cihazlarınızı ani akımlara karşı koruyun.");
    } else if ([45, 48].includes(code)) {
      advice.push("Sisli bir hava var. Özellikle trafikte seyrediyorsanız görüş mesafesine dikkat edin ve takip mesafenizi artırın.");
    }

    if (tempC >= 35) {
      advice.push("Aşırı sıcaklar devrede. Güneşin dik açıyla geldiği 11:00-16:00 saatleri arasında dışarı çıkmaktan kaçının ve bol sıvı tüketin.");
    } else if (tempC >= 28 && currentHumidity >= 65) {
      advice.push(`Yüksek nem (%${currentHumidity}), havayı termometredekinden çok daha sıcak ve bunaltıcı hissettiriyor. Klimalı ve serin yerlerde kalmaya çalışın.`);
    } else if (tempC <= 5 && wind >= 20) {
      advice.push(`Düşük sıcaklık ve rüzgar (${wind} km/s) birleştiğinde sert bir 'Rüzgar Soğuğu' (Wind Chill) etkisi yaratıyor. Atkı ve eldivensiz dışarı çıkmayın.`);
    } else if (tempC <= 5) {
      advice.push("Hava oldukça soğuk. Vücut ısınızı koruyacak şekilde kat kat giyinmeyi ihmal etmeyin.");
    }

    if (currentUV >= 7 && tempC > 15) {
      advice.push(`Şu anki UV İndeksi (${currentUV.toFixed(1)}) tehlikeli seviyede. Dışarı çıkarken mutlaka 50+ SPF güneş kremi sürün ve şapka/gözlük kullanın.`);
    }
    
    if (wind >= 40) {
      advice.push(`Kuvvetli rüzgar uyarısı (${wind} km/s). Çatı uçması, nesne düşmesi risklerine ve UAV (Drone) uçuşlarına karşı temkinli olun.`);
    }

    if (advice.length === 0 && code <= 3 && tempC >= 18 && tempC <= 26 && currentHumidity < 60 && wind < 20) {
       return "Hava koşulları meteorolojik olarak ideal seviyede. Dışarıda vakit geçirmek veya günlük planlarınızı gerçekleştirmek için uygun bir gün.";
    }

    if (advice.length === 0) {
       return "Mevcut hava koşulları olağan seyrediyor. Kritik bir meteorolojik tehdit bulunmuyor, günlük operasyonlarınıza devam edebilirsiniz.";
    }

    return advice.join(" ");
  };

  const bgImage = getCityBackgroundImage(selectedCity.name);
  const isTurkey = selectedCity.country.toLowerCase().includes("türkiye") || selectedCity.country.toLowerCase().includes("turkey");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-cyan-500/40 p-3 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-3 backdrop-blur-xl z-50">
          {data.code !== undefined && <div>{getWeatherIcon(data.code, "w-6 h-6")}</div>}
          <div className="font-mono">
            <p className="text-[10px] text-zinc-400">{label}</p>
            {data.temp !== undefined ? (
              <p className="text-sm font-bold text-cyan-300">{data.temp}°{unit}</p>
            ) : (
              <p className="text-sm font-bold text-amber-400">UV: {data.uv}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-[#05070f] text-zinc-100 p-4 md:p-10 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-cyan-500/20 pb-6 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Live Weather & UAV Radar</span>
              </div>
              <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-500">
                METEO<span className="text-cyan-400">NEXUS</span>
              </h1>
              <div className="text-[8px] md:text-[9px] font-mono tracking-[0.4em] text-cyan-500/70 mt-1 uppercase font-semibold drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
                ALL YOUR NEEDS IN ONE PLACE
              </div>
            </div>
          </div>

          <div className="flex w-full lg:w-auto items-center gap-3 flex-wrap lg:flex-nowrap justify-end">
            <Link 
              href="/stocks" 
              className="bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono px-3.5 py-2.5 rounded-2xl transition flex items-center gap-2 font-semibold whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">BORSA & BİST</span>
            </Link>

            <Link 
              href="/news" 
              className="bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono px-3.5 py-2.5 rounded-2xl transition flex items-center gap-2 font-semibold whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">CANLI HABERLER</span>
            </Link>

            <LoginButton />

            <div className="bg-zinc-950/80 border border-cyan-500/30 rounded-2xl p-1 flex items-center gap-1 backdrop-blur-md">
              <button onClick={() => setUnit("C")} className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition ${unit === "C" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]" : "text-zinc-400 hover:text-white"}`}>°C</button>
              <button onClick={() => setUnit("F")} className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition ${unit === "F" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]" : "text-zinc-400 hover:text-white"}`}>°F</button>
            </div>

            <button onClick={handleGetLocation} disabled={locationLoading} className="bg-zinc-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono px-3 py-2.5 rounded-2xl transition flex items-center gap-2 font-semibold whitespace-nowrap backdrop-blur-md shadow-lg">
              {locationLoading ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Navigation className="w-4 h-4 text-cyan-400" />}
              <span className="hidden sm:inline">GPS SYNC</span>
            </button>

            <div className="relative w-full lg:w-56 mt-2 lg:mt-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 z-10" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Şehir ara..." className="w-full bg-zinc-950/90 border border-cyan-500/30 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition" />
              {searchLoading && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin z-10" />}

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-zinc-800 backdrop-blur-2xl">
                  {searchResults.map((r) => (
                    <button key={r.id} onClick={() => handleSelectCity({ name: r.name, country: r.country || "", lat: r.latitude, lon: r.longitude })} className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 transition flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-medium">{r.name}{r.admin1 ? `, ${r.admin1}` : ""}</span>
                      <span className="text-zinc-500">{r.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {POPULAR_CITIES.map((city) => (
            <button key={city.name} onClick={() => handleSelectCity(city)} className={`px-4 py-2 rounded-2xl text-xs font-mono transition flex items-center gap-2 whitespace-nowrap border ${selectedCity.name === city.name ? "bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]" : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"}`}>
              <Radio className={`w-3.5 h-3.5 ${selectedCity.name === city.name ? "text-cyan-400 animate-pulse" : "text-zinc-600"}`} />
              <span>{city.name}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-cyan-400 gap-4 bg-zinc-950/40 border border-cyan-500/20 rounded-3xl">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <span className="font-mono text-xs tracking-widest uppercase">Connecting Neural Satellite Data...</span>
          </div>
        ) : weather ? (
          <div className="space-y-6 md:space-y-8">
            
            <div className="bg-gradient-to-r from-cyan-950/40 via-cyan-900/10 to-zinc-950/80 border border-cyan-500/30 rounded-3xl p-4 md:p-5 flex items-center gap-4 md:gap-5 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 shrink-0">
                <Bot className="w-6 h-6 md:w-8 md:h-8 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-[10px] md:text-[11px] font-mono tracking-widest text-cyan-400 font-bold flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3" /> NEXUS AI ASİSTAN TAVSİYESİ
                </h3>
                <p className="text-xs md:text-sm font-medium text-zinc-200 leading-relaxed">
                  {getAiAdvice()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div 
                className="lg:col-span-1 border border-cyan-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden bg-cover bg-center min-h-[440px] transition-all duration-700 group"
                style={{ backgroundImage: `url(${bgImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/80 to-transparent z-0"></div>

                <div className="relative z-10 space-y-2">
                  <span className="text-[10px] font-mono tracking-widest font-bold px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-full backdrop-blur-md inline-block">
                    {selectedCity.country.toUpperCase()} // REGION
                  </span>
                  <h2 className="text-4xl font-black tracking-tight drop-shadow-lg text-white">{selectedCity.name}</h2>
                </div>

                <div className="relative z-10 my-4 flex items-center justify-between">
                  <div>
                    <div className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-300 drop-shadow-2xl">
                      {selectedDayIndex === 0 ? `${convertTemp(weather.current_weather.temperature)}°${unit}` : `${convertTemp(weather.daily.temperature_2m_max[selectedDayIndex])}°${unit}`}
                    </div>
                    <p className="text-xs font-mono text-cyan-300/80 mt-2 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400" /> WIND SPEED: {weather.current_weather.windspeed} KM/H
                    </p>
                  </div>
                  <div>{getWeatherIcon(weather.daily.weathercode[selectedDayIndex], "w-16 h-16")}</div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-2 pt-4 border-t border-cyan-500/20 backdrop-blur-sm">
                  <div className="p-2.5 rounded-2xl border border-cyan-500/20 bg-zinc-950/80 flex items-center gap-2.5">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-[9px] font-mono text-zinc-400">HUMIDITY</div>
                      <div className="text-xs font-bold font-mono text-white">%{currentHumidity}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl border border-purple-500/20 bg-zinc-950/80 flex items-center gap-2.5">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-[9px] font-mono text-zinc-400">PRESSURE</div>
                      <div className="text-xs font-bold font-mono text-white">{currentPressure} hPa</div>
                    </div>
                  </div>

                  {/* TIKLANABİLİR ANLIK UV İNDEKSi KARTI */}
                  <div 
                    onClick={() => setIsUvModalOpen(true)}
                    className="p-2.5 rounded-2xl border border-amber-500/20 bg-zinc-950/80 flex items-center gap-2.5 cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/50 transition-all group"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="text-[9px] font-mono text-zinc-400 group-hover:text-amber-200/70 transition-colors">UV INDEX</div>
                      <div className="text-xs font-bold font-mono text-amber-400">{currentUV.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl border border-emerald-500/20 bg-zinc-950/80 flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[9px] font-mono text-zinc-400">AIR QUALITY</div>
                      <div className="text-xs font-bold font-mono text-emerald-400">{airQuality ? `AQI ${currentAQI}` : "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-2xl backdrop-blur-xl">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-sm font-mono flex items-center gap-2 text-cyan-400">
                    <Calendar className="w-4 h-4" /> 7-DAY FORECAST MATRIX
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">SELECT DAY TO INSPECT HOURLY</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {weather.daily.time.map((date, index) => {
                    const isSelected = selectedDayIndex === index;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDayIndex(index)}
                        className={`w-full text-left flex items-center justify-between rounded-2xl p-3.5 transition border ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            : "bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" : "bg-zinc-700"}`}></span>
                          <span className={`text-xs font-mono ${isSelected ? "text-cyan-300 font-bold" : "text-zinc-300"}`}>
                            {new Date(date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" })}
                            {index === 0 && <span className="ml-2 text-[10px] text-cyan-400 font-normal">(TODAY)</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-5">
                          {getWeatherIcon(weather.daily.weathercode[index], "w-5 h-5")}
                          <div className="text-xs font-mono font-bold w-24 text-right">
                            <span className="text-white">{convertTemp(weather.daily.temperature_2m_max[index])}°{unit}</span>
                            <span className="text-zinc-600 ml-2">{convertTemp(weather.daily.temperature_2m_min[index])}°{unit}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-bold text-sm font-mono flex items-center gap-2 text-cyan-400">
                  <Clock className="w-4 h-4" /> 24-HOUR HOURLY TEMPERATURE DYNAMICS
                </h3>
                <span className="text-[10px] font-mono font-semibold px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full">
                  {selectedCity.name.toUpperCase()} // 24H SPECTRUM
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto py-3 px-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl scrollbar-thin">
                {hourlyChartData.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[48px] space-y-1 font-mono">
                    <span className="text-[10px] text-zinc-500">{item.time}</span>
                    <div>{getWeatherIcon(item.code, "w-5 h-5")}</div>
                    <span className="text-xs font-bold text-cyan-300">{item.temp}°{unit}</span>
                  </div>
                ))}
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData}>
                    <defs>
                      <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} fontFamily="monospace" />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} unit={`°${unit}`} fontFamily="monospace" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#cyberGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {isTurkey && (
              <div className="space-y-2">
                <DroneMap
                  lat={selectedCity.lat}
                  lon={selectedCity.lon}
                  cityName={selectedCity.name}
                  windSpeed={weather.current_weather.windspeed}
                />
                <div className="text-right text-[10px] font-mono text-zinc-500 bg-zinc-950/50 p-2 rounded-xl border border-zinc-900">
                  * Haritadaki drone uçuş bölgeleri referans amaçlıdır. Veriler yanlış olabilir, kesin doğruluk için <a href="https://iha.shgm.gov.tr/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-all">SHGM resmi sitesine</a> bakmanızı öneririz.
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-red-400 gap-4 bg-zinc-950/40 border border-red-500/20 rounded-3xl backdrop-blur-md">
            <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
            <span className="font-mono text-sm tracking-widest uppercase font-bold text-white">BAĞLANTI ENGELLENDİ</span>
            <p className="text-xs font-mono text-zinc-400 max-w-md text-center leading-relaxed">
              Hava durumu uydu verilerine ulaşılamadı. Tarayıcınızdaki <strong className="text-red-400">Reklam Engelleyiciyi (AdBlocker)</strong> veya VPN bağlantısını kapatıp sayfayı yenilemeyi deneyin.
            </p>
          </div>
        )}

      </div>

      {/* TIKLANDIĞINDA AÇILAN 24 SAATLİK UV GRAFİK MODALI */}
      {isUvModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl bg-[#05070f] border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col">
            <button 
              onClick={() => setIsUvModalOpen(false)} 
              className="absolute top-5 right-5 p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-amber-400 rounded-full transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6 border-b border-amber-500/20 pb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase font-sans tracking-wide">
                  24 SAATLİK UV İNDEKS GRAFİĞİ
                </h2>
                <p className="text-xs font-mono text-amber-400/80">
                  {selectedCity.name} - {new Date(weather?.daily?.time[selectedDayIndex] || "").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uvChartData}>
                  <defs>
                    <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-950 border border-amber-500/40 p-3 rounded-2xl shadow-xl backdrop-blur-xl z-50">
                            <p className="text-[10px] text-zinc-400 font-mono mb-1">{label}</p>
                            <p className="text-sm font-bold text-amber-400 font-mono">UV İndeksi: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Area type="monotone" dataKey="uv" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#uvGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}