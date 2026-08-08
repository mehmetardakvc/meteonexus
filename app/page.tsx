"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Cloud, CloudRain, Calendar, Search, Loader2, Navigation, Clock, Activity, ShieldAlert, Droplets, Gauge, Zap, Radio, TrendingUp, Sparkles, X, MapPin, ShieldCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import dynamicImport from "next/dynamic";
import LoginButton from "@/components/LoginButton";

const DroneMap = dynamicImport(() => import("../components/DroneMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-3xl bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      <span className="font-medium text-sm">Uçuş haritası hazırlanıyor...</span>
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
    if (code === 0) return <Sun className={`${size} text-amber-400 drop-shadow-sm`} />;
    if (code >= 1 && code <= 3) return <Cloud className={`${size} text-sky-300 drop-shadow-sm`} />;
    return <CloudRain className={`${size} text-blue-400 drop-shadow-sm`} />;
  };

  const getCityBackgroundImage = (cityName: string) => {
    const nameLower = cityName.toLowerCase().trim();
    if (nameLower.includes("adana")) return "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("ankara")) return "https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=1000&q=80";
    if (nameLower.includes("istanbul")) return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1000&q=80";
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
    if (!weather) return "Hava durumu verileriniz yorumlanıyor...";
    
    const tempC = weather.current_weather.temperature;
    const code = weather.current_weather.weathercode;
    const wind = weather.current_weather.windspeed;

    let advice: string[] = [];

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      advice.push("Bugün hava yağışlı görünüyor. Dışarı çıkarken şemsiyenizi almayı unutmayın.");
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
      advice.push("Kar yağışı var. Kendinize dikkat edin ve sıkı giyinmeyi ihmal etmeyin.");
    } else if ([95, 96, 99].includes(code)) {
      advice.push("Gök gürültülü fırtına bekleniyor. Mümkün olduğunca kapalı ve güvenli alanlarda kalmaya özen gösterin.");
    } else if ([45, 48].includes(code)) {
      advice.push("Hava biraz sisli. Eğer yola çıkacaksanız görüş mesafesine dikkat edin.");
    }

    if (tempC >= 35) {
      advice.push("Bugün hava oldukça sıcak. Güneşin en yoğun olduğu saatlerde dışarı çıkmamaya ve bol su içmeye özen gösterin.");
    } else if (tempC >= 28 && currentHumidity >= 65) {
      advice.push(`Yüksek nem (%${currentHumidity}) havayı olduğundan daha sıcak hissettirebilir. Serin yerlerde kalmaya çalışın.`);
    } else if (tempC <= 5 && wind >= 20) {
      advice.push(`Rüzgarla birlikte hava oldukça soğuk hissediliyor. Sıkı giyinmeden dışarı çıkmayın.`);
    } else if (tempC <= 5) {
      advice.push("Bugün hava epey soğuk. Kalın giyinmeyi unutmayın.");
    }

    if (currentUV >= 7 && tempC > 15) {
      advice.push(`Güneş ışınları (UV) şu an oldukça yüksek. Çıkmadan önce güneş kreminizi sürmek iyi bir fikir olabilir.`);
    }
    
    if (wind >= 40) {
      advice.push(`Dışarıda sert bir rüzgar var. Drone veya açık hava uçuş planlarınız varsa ertelemeniz daha güvenli olabilir.`);
    }

    if (advice.length === 0 && code <= 3 && tempC >= 18 && tempC <= 26 && currentHumidity < 60 && wind < 20) {
       return "Hava harika görünüyor! Dışarıda vakit geçirmek veya günlük planlarınızı yapmak için çok güzel bir gün.";
    }

    if (advice.length === 0) {
       return "Hava koşulları gayet sakin görünüyor. Günlük işlerinize rahatça devam edebilirsiniz.";
    }

    return advice.join(" ");
  };

  const bgImage = getCityBackgroundImage(selectedCity.name);
  const isTurkey = selectedCity.country.toLowerCase().includes("türkiye") || selectedCity.country.toLowerCase().includes("turkey");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 p-3 rounded-2xl shadow-lg flex items-center gap-3 z-50">
          {data.code !== undefined && <div>{getWeatherIcon(data.code, "w-6 h-6")}</div>}
          <div>
            <p className="text-xs text-slate-400">{label}</p>
            {data.temp !== undefined ? (
              <p className="text-sm font-semibold text-slate-100">{data.temp}°{unit}</p>
            ) : (
              <p className="text-sm font-semibold text-amber-400">UV İndeksi: {data.uv}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans selection:bg-sky-500/30 selection:text-sky-100 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 w-full mb-10">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 relative border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-2xl shadow-sm text-sky-400">
              <Sun className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                <span className="text-xs font-medium text-slate-400">Canlı Veri Yayını</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Meteo<span className="text-sky-400">Nexus</span>
              </h1>
              <div className="text-xs text-slate-500 mt-0.5">
                Hava Durumu & Uçuş Rehberi
              </div>
            </div>
          </div>

          <div className="flex w-full lg:w-auto items-center gap-3 flex-wrap lg:flex-nowrap justify-end">
            <Link 
              href="/stocks" 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Borsa & BİST</span>
            </Link>

            <Link 
              href="/news" 
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
            >
              <Radio className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Haberler</span>
            </Link>

            <LoginButton />

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex items-center gap-1">
              <button onClick={() => setUnit("C")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${unit === "C" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>°C</button>
              <button onClick={() => setUnit("F")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${unit === "F" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>°F</button>
            </div>

            <button onClick={handleGetLocation} disabled={locationLoading} className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 font-medium whitespace-nowrap shadow-sm">
              {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span className="hidden sm:inline">Konumumu Bul</span>
            </button>

            <div className="relative w-full lg:w-64 mt-2 lg:mt-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Farklı bir şehir ara..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-8 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" />
              {searchLoading && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 animate-spin z-10" />}

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-50 divide-y divide-slate-700/50">
                  {searchResults.map((r) => (
                    <button key={r.id} onClick={() => handleSelectCity({ name: r.name, country: r.country || "", lat: r.latitude, lon: r.longitude })} className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors flex items-center justify-between text-sm">
                      <span className="text-slate-200 font-medium">{r.name}{r.admin1 ? `, ${r.admin1}` : ""}</span>
                      <span className="text-slate-500 text-xs">{r.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {POPULAR_CITIES.map((city) => (
            <button key={city.name} onClick={() => handleSelectCity(city)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap border ${selectedCity.name === city.name ? "bg-sky-500/10 border-sky-500/50 text-sky-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"}`}>
              <MapPin className={`w-4 h-4 ${selectedCity.name === city.name ? "text-sky-400" : "text-slate-500"}`} />
              {city.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4 bg-slate-800/20 rounded-3xl border border-slate-800">
            <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
            <span className="font-medium text-sm">Hava durumu verileri alınıyor...</span>
          </div>
        ) : weather ? (
          <div className="space-y-6 md:space-y-8">
            
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 md:p-5 flex items-start sm:items-center gap-4 md:gap-5 shadow-sm">
              <div className="p-3 bg-sky-500/10 rounded-xl shrink-0">
                <Sparkles className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
                  Günün Özeti
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {getAiAdvice()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div 
                className="lg:col-span-1 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden bg-cover bg-center min-h-[440px] group"
                style={{ backgroundImage: `url(${bgImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20 z-0"></div>

                <div className="relative z-10 space-y-1.5">
                  <span className="text-xs font-semibold px-3 py-1 bg-white/10 backdrop-blur-md text-white rounded-lg inline-block">
                    {selectedCity.country}
                  </span>
                  <h2 className="text-3xl font-bold text-white drop-shadow-md">{selectedCity.name}</h2>
                </div>

                <div className="relative z-10 my-4 flex items-center justify-between">
                  <div>
                    <div className="text-6xl font-bold text-white drop-shadow-lg tracking-tight">
                      {selectedDayIndex === 0 ? `${convertTemp(weather.current_weather.temperature)}°${unit}` : `${convertTemp(weather.daily.temperature_2m_max[selectedDayIndex])}°${unit}`}
                    </div>
                    <p className="text-sm text-sky-200 mt-2 flex items-center gap-1.5 font-medium">
                      <Zap className="w-4 h-4 text-sky-300" /> Rüzgar: {weather.current_weather.windspeed} km/s
                    </p>
                  </div>
                  <div>{getWeatherIcon(weather.daily.weathercode[selectedDayIndex], "w-16 h-16")}</div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-sm flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Nem</div>
                      <div className="text-sm font-bold text-white">%{currentHumidity}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-sm flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Basınç</div>
                      <div className="text-sm font-bold text-white">{currentPressure} hPa</div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setIsUvModalOpen(true)}
                    className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-sm flex items-center gap-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
                  >
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">UV İndeksi</div>
                      <div className="text-sm font-bold text-amber-400">{currentUV.toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-sm flex items-center gap-3">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Kalite</div>
                      <div className="text-sm font-bold text-emerald-400">{airQuality ? `AQI ${currentAQI}` : "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-200">
                    <Calendar className="w-4 h-4 text-sky-400" /> 7 Günlük Tahmin
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Detay için güne tıklayın</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {weather.daily.time.map((date, index) => {
                    const isSelected = selectedDayIndex === index;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDayIndex(index)}
                        className={`w-full text-left flex items-center justify-between rounded-xl p-3.5 transition-colors ${
                          isSelected
                            ? "bg-sky-500/10 border border-sky-500/30 text-sky-100"
                            : "bg-slate-800/30 hover:bg-slate-700/50 text-slate-300 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-medium ${isSelected ? "text-sky-400" : "text-slate-300"}`}>
                            {new Date(date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                            {index === 0 && <span className="ml-2 text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">BUGÜN</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-5">
                          {getWeatherIcon(weather.daily.weathercode[index], "w-6 h-6")}
                          <div className="text-sm font-bold w-20 text-right">
                            <span className="text-slate-100">{convertTemp(weather.daily.temperature_2m_max[index])}°</span>
                            <span className="text-slate-500 ml-2 font-medium">{convertTemp(weather.daily.temperature_2m_min[index])}°</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-200">
                  <Clock className="w-4 h-4 text-sky-400" /> Saatlik Tahmin
                </h3>
                <span className="text-xs font-medium px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg">
                  {selectedCity.name}
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto py-3 px-1 scrollbar-thin">
                {hourlyChartData.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[50px] space-y-2">
                    <span className="text-xs text-slate-400 font-medium">{item.time}</span>
                    <div>{getWeatherIcon(item.code, "w-6 h-6")}</div>
                    <span className="text-sm font-bold text-slate-200">{item.temp}°</span>
                  </div>
                ))}
              </div>

              <div className="h-56 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData}>
                    <defs>
                      <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} unit={`°`} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="temp" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#skyGradient)" />
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
                <div className="text-right text-xs text-slate-500 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                  <span className="font-medium">Not:</span> Haritadaki uçuş bölgeleri referans amaçlıdır. Uçuş öncesi güncel kurallar için <a href="https://iha.shgm.gov.tr/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">SHGM resmi sitesini</a> kontrol etmeyi unutmayın.
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-rose-400 gap-4 bg-slate-800/20 border border-rose-500/20 rounded-3xl">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <span className="font-bold text-sm text-slate-200">Verilere Ulaşılamadı</span>
            <p className="text-sm text-slate-400 max-w-md text-center leading-relaxed">
              Hava durumu sunucularına bağlanamıyoruz. Eğer aktif bir reklam engelleyici veya VPN kullanıyorsanız, kapatıp sayfayı yenilemeyi deneyebilirsiniz.
            </p>
          </div>
        )}

      </div>

      {isUvModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col">
            <button 
              onClick={() => setIsUvModalOpen(false)} 
              className="absolute top-5 right-5 p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-5">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <Sun className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Günlük UV İndeksi
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedCity.name} — {new Date(weather?.daily?.time[selectedDayIndex] || "").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={uvChartData}>
                  <defs>
                    <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-800 border border-slate-600 p-3 rounded-2xl shadow-lg z-50">
                            <p className="text-xs text-slate-400 mb-1">{label}</p>
                            <p className="text-sm font-bold text-amber-400">UV İndeksi: {payload[0].value}</p>
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

      {/* FOOTER - KVKK & GİZLİLİK NOTU EKLENDİ */}
      <footer className="w-full max-w-6xl mx-auto border-t border-slate-800 pt-6 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MeteoNexus. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">
              Gizlilik Politikası: <span className="font-normal text-slate-400">Platforma kayıt olan kullanıcıların e-posta ve IP adresleri, yalnızca hesap güvenliği, kullanıcı doğrulama ve hizmet kalitesini artırma amacıyla KVKK standartlarına uygun olarak saklanmakta olup, üçüncü şahıslarla kesinlikle paylaşılmaz.</span>
            </span>
          </div>
        </div>
      </footer>

    </main>
  );
}