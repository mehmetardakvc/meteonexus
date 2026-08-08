"use client";

import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, ShieldCheck, Crosshair, Radar } from "lucide-react";

interface DroneMapProps {
  lat: number;
  lon: number;
  cityName: string;
  windSpeed: number;
}

const NO_FLY_ZONES: Record<string, { name: string; lat: number; lon: number; radius: number; reason: string }[]> = {
  adana: [
    { name: "Adana Şakirpaşa Havalimanı (CTR)", lat: 36.9822, lon: 35.2804, radius: 4500, reason: "Sivil Havalimanı Kontrol Bölgesi" },
    { name: "İncirlik Hava Üssü", lat: 37.0019, lon: 35.4258, radius: 5000, reason: "Askeri Hava Üssü & Askeri Yasak Bölge" },
    { name: "Adana Valiliği & Hükümet Konağı", lat: 36.9950, lon: 35.3250, radius: 1500, reason: "Stratejik Kamu Binası" },
  ],
  alanya: [
    { name: "Gazipaşa-Alanya Havalimanı (GZP)", lat: 36.2993, lon: 32.3014, radius: 4000, reason: "Uluslararası Havalimanı Uçuş Hattı" },
    { name: "Alanya Kalesi & Tarihi Sit Alanı", lat: 36.5337, lon: 31.9906, radius: 1200, reason: "Tarihi Sit / Askeri Tesis" },
  ],
  istanbul: [
    { name: "İstanbul Havalimanı (IST)", lat: 41.2753, lon: 28.7519, radius: 7000, reason: "Ana Havalimanı CTR Bölgesi" },
    { name: "Sabiha Gökçen Havalimanı (SAW)", lat: 40.8986, lon: 29.3092, radius: 6000, reason: "Uluslararası Havalimanı CTR" },
  ],
  ankara: [
    { name: "Esenboğa Havalimanı (ESB)", lat: 40.1281, lon: 32.9951, radius: 6000, reason: "Havalimanı Yasak Uçuş Sahası" },
    { name: "Anıtkabir & Cumhurbaşkanlığı Külliyesi", lat: 39.9250, lon: 32.8369, radius: 2500, reason: "Özel Güvenlikli Stratejik Bölge" },
  ],
};

export default function DroneMap({ lat, lon, cityName, windSpeed }: DroneMapProps) {
  const cityNameKey = cityName.toLowerCase().trim();
  const cityZones = NO_FLY_ZONES[cityNameKey] || [
    {
      name: `${cityName} Merkez Uçuşa Yasak Bölge`,
      lat: lat,
      lon: lon,
      radius: 3000,
      reason: "Hükümet Konağı / Emniyet Güvenlik Çemberi",
    },
  ];

  const isWindSafe = windSpeed < 20;

  return (
    <div className="relative bg-zinc-950/80 border border-cyan-500/30 backdrop-blur-xl rounded-3xl p-6 lg:p-8 space-y-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
      
      {/* HUD Radar Çizgileri & Işık Efekti */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">
            <Radar className="w-4 h-4 animate-spin text-cyan-400" /> SGHM RADAR SCANNER v2.4
          </div>
          <h3 className="text-xl font-black flex items-center gap-2 text-white tracking-wide">
            <Crosshair className="w-5 h-5 text-red-500" /> KISITLAMALI İHA SAHALARI
          </h3>
        </div>

        <div className={`px-4 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2.5 font-mono text-xs font-bold ${
          isWindSafe 
            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
            : "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        }`}>
          {isWindSafe ? (
            <>
              <ShieldCheck className="w-4 h-4" /> FLIGHT PERMITTED // WIND: {windSpeed} KM/H
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" /> HIGH WIND WARNING // {windSpeed} KM/H
            </>
          )}
        </div>
      </div>

      <div className="h-96 w-full rounded-2xl overflow-hidden border border-zinc-800 relative z-0 shadow-inner">
        <MapContainer
          key={`${lat}-${lon}`}
          center={[lat, lon]}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {cityZones.map((zone, idx) => (
            <Circle
              key={idx}
              center={[zone.lat, zone.lon]}
              radius={zone.radius}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.5, weight: 2 }}
            >
              <Popup>
                <div className="text-zinc-900 font-sans p-1">
                  <p className="font-bold text-red-600 flex items-center gap-1 text-sm">
                    <AlertTriangle className="w-4 h-4 inline" /> {zone.name}
                  </p>
                  <p className="text-xs mt-1 font-semibold text-zinc-700">Nedeni: {zone.reason}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">SGHM Mevzuatı: Uçuşa kesinlikle yasaktır.</p>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}