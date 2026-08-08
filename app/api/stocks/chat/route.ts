import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message, marketData } = await request.json();
    
    const query = message.toLocaleLowerCase('tr-TR').trim();
    const rawQuery = message.toLowerCase(); 

    if (!marketData || !Array.isArray(marketData)) {
      return NextResponse.json({ reply: "Sistem verilerine şu an ulaşamıyorum. Birazdan tekrar dene." });
    }

    const formatVolume = (vol: number) => {
      if (!vol) return "-";
      if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + " Milyar ₺";
      if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + " Milyon ₺";
      return vol.toLocaleString("tr-TR") + " ₺";
    };

    let responseText = "";

    if (query === "merhaba" || query === "selam" || query === "naber") {
      return NextResponse.json({ reply: "Selam! Ben NEXUS AI. Terminaldeki tüm anlık verilere hakimim. Bana 'SASA hacmi ne kadar?', 'Gram altın kaç?' veya 'Dolar ne durumda?' gibi sorular sorabilirsin! 🚀" });
    }

    if (query.includes("bist") || query.includes("endeks") || query.includes("xu100") || rawQuery.includes("bist") || query.includes("borsa")) {
      const bist = marketData.find(s => s.code === "XU100");
      if (bist) {
        responseText = `📈 **BİST 100 Anlık Durum:**\nEndeks şu an **${bist.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** puan seviyesinde ve **%${bist.change.toFixed(2)}** değişim gösteriyor. ${bist.change >= 0 ? "Piyasada yeşil ve pozitif bir hava hakim." : "Endekste kırmızı tablo ve kar satışları gözlemleniyor."}`;
        return NextResponse.json({ reply: responseText });
      }
    }

    if (query.includes("dolar") || query.includes("usd") || query.includes("döviz") || query.includes("kur")) {
      const usd = marketData.find(s => s.code === "USDTRY");
      if (usd) {
        responseText = `💵 **Dolar/TL (USDTRY) Anlık Durum:**\nDolar şu an **${usd.price.toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ₺** seviyesinden işlem görüyor. Günlük değişim: **%${usd.change.toFixed(2)}**.`;
        return NextResponse.json({ reply: responseText });
      }
    }

    // YENİ: GRAM ALTIN KONTROLÜ
    if (query.includes("altın") || query.includes("gram") || query.includes("gldgr")) {
      const gold = marketData.find(s => s.code === "GLDGR");
      if (gold) {
        responseText = `🥇 **Gram Altın Anlık Durum:**\nGram altın şu an **${gold.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺** seviyesinden işlem görüyor. Günlük değişim: **%${gold.change.toFixed(2)}**.`;
        return NextResponse.json({ reply: responseText });
      }
    }

    if (query.includes("yükselen") || query.includes("artan") || query.includes("kazandıran")) {
      const top = [...marketData].filter(s => !["XU100", "XU500", "XU030", "USDTRY", "GLDGR"].includes(s.code)).sort((a, b) => b.change - a.change).slice(0, 3);
      responseText = `🚀 **Günün Yıldızları:** Şu an piyasada en çok kazandıran hisseler:\n\n1. **${top[0].code}**: %${top[0].change.toFixed(2)}\n2. **${top[1].code}**: %${top[1].change.toFixed(2)}\n3. **${top[2].code}**: %${top[2].change.toFixed(2)}`;
      return NextResponse.json({ reply: responseText });
    }

    if (query.includes("düşen") || query.includes("azalan") || query.includes("kaybettiren")) {
      const bottom = [...marketData].filter(s => !["XU100", "XU500", "XU030", "USDTRY", "GLDGR"].includes(s.code)).sort((a, b) => a.change - b.change).slice(0, 3);
      responseText = `🩸 **En Çok Düşenler:** Satış baskısının en yoğun olduğu hisseler:\n\n1. **${bottom[0].code}**: %${bottom[0].change.toFixed(2)}\n2. **${bottom[1].code}**: %${bottom[1].change.toFixed(2)}\n3. **${bottom[2].code}**: %${bottom[2].change.toFixed(2)}`;
      return NextResponse.json({ reply: responseText });
    }

    let foundStock = null;
    for (const stock of marketData) {
      if (["XU100", "XU500", "XU030", "USDTRY", "GLDGR"].includes(stock.code)) continue; 

      const codeLower = stock.code.toLocaleLowerCase('tr-TR');
      const nameLower = stock.name.toLocaleLowerCase('tr-TR');
      
      if (query.includes(codeLower) || rawQuery.includes(stock.code.toLowerCase()) || query.includes(nameLower)) {
        foundStock = stock;
        break;
      }
    }

    if (foundStock) {
      if (query.includes("hacim") || query.includes("hacmi")) {
        responseText = `📊 **${foundStock.code} Hacim Verisi:**\n${foundStock.code} hissesinin anlık günlük işlem hacmi **${formatVolume(foundStock.volume)}** seviyesindedir. Fiyatı ise şu an ${foundStock.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ (%${foundStock.change.toFixed(2)}).`;
      } else if (query.includes("fiyat") || query.includes("kaç") || query.includes("ne kadar")) {
        responseText = `💰 **${foundStock.code} Fiyat:**\n${foundStock.code} anlık olarak **${foundStock.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺** seviyesinden işlem görüyor. Günlük değişimi %${foundStock.change.toFixed(2)}.`;
      } else if (query.includes("f/k") || query.includes("fk") || query.includes("çarpan") || query.includes("oran")) {
        responseText = `⚖️ **${foundStock.code} F/K Oranı:**\n${foundStock.code} şirketinin güncel F/K oranı **${foundStock.peRatio ? foundStock.peRatio.toFixed(2) : "bilinmiyor"}**. ${foundStock.peRatio > 15 ? "Sektör ortalamalarına göre primli." : "Değerleme açısından makul bölgelerde."}`;
      } else {
        responseText = `🎯 **${foundStock.code} (${foundStock.name}) Özeti:**\n\n- Anlık Fiyat: **${foundStock.price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺**\n- Günlük Değişim: **%${foundStock.change.toFixed(2)}**\n- Toplam Hacim: **${formatVolume(foundStock.volume)}**\n- 52 Hafta Zirvesi: **${foundStock.high52.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺**\n\nHisse şu an ${foundStock.change >= 0 ? "pozitif alıcılı" : "satış baskısı altında"} bir seyir izliyor.`;
      }
      return NextResponse.json({ reply: responseText });
    }

    responseText = "🤖 Sorunuzdaki hisseyi veya terimi tam yakalayamadım. (Örn: 'SASA hacmi nedir?', 'BİST 100 durumu', 'Dolar kaç?', 'Altın ne durumda?' veya 'ASELS fiyatı' şeklinde sorabilirsiniz.)";
    return NextResponse.json({ reply: responseText });

  } catch (error) {
    console.error("Chatbot Hatası:", error);
    return NextResponse.json({ reply: "Sistem verilerini okurken bir hata oluştu." }, { status: 500 });
  }
}