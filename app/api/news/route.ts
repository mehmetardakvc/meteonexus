import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // KÜRESEL VE YEREL EN SAĞLAM HABER KAYNAKLARI
    const rssSources = [
      { url: "https://tr.investing.com/rss/news_25.rss", category: "Borsa & BİST", source: "Investing TR" },
      { url: "https://www.ntv.com.tr/gundem.rss", category: "Gündem", source: "NTV" },
      { url: "https://www.ntv.com.tr/teknoloji.rss", category: "Teknoloji", source: "NTV" },
      { url: "https://www.haberturk.com/rss/ekonomi.xml", category: "Ekonomi", source: "Habertürk" },
      { url: "https://www.donanimhaber.com/rss/tum/", category: "Teknoloji", source: "DonanımHaber" }
    ];

    let allArticles: any[] = [];
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 saat sınırı

    for (const feed of rssSources) {
      try {
        const res = await fetch(feed.url, { 
          cache: 'no-store', 
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          } 
        });
        
        if (res.ok) {
          const xmlText = await res.text();
          const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
          
          for (const item of itemMatches) {
            const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
            const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
            const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            
            let articleDate = now; // Eğer tarih okunamazsa, haberi silmemek için şu anki saati yedek olarak ata
            
            if (pubDateMatch) {
              // Bazı RSS'lerin sonundaki gereksiz boşlukları temizleyip tarihe çeviriyoruz
              const parsedDate = new Date(pubDateMatch[1].trim());
              if (!isNaN(parsedDate.getTime())) {
                articleDate = parsedDate;
              }
            }

            // ZAMAN FİLTRESİ
            const diffMs = now.getTime() - articleDate.getTime();
            
            // RSS'lerde saat dilimi (Timezone) farkı olabildiği için -3600000 (1 saat ileri) toleransı tanıdık
            if (diffMs >= -3600000 && diffMs <= oneDayMs) {
              const clean = (str: string) => str ? str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '').trim() : '';

              allArticles.push({
                id: `${feed.source}-${Math.random()}`,
                title: clean(titleMatch ? titleMatch[1] : 'Gündem Gelişmesi'),
                url: linkMatch ? linkMatch[1].trim() : '#',
                timestamp: articleDate.getTime(),
                time: articleDate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }),
                date: articleDate.toLocaleDateString("tr-TR", { day: '2-digit', month: '2-digit', year: 'numeric' }),
                category: feed.category,
                source: feed.source
              });
            }
          }
        }
      } catch (err) {
        console.error(`RSS çekme hatası (${feed.source}):`, err);
      }
    }

    // Haberleri en son dakikadan (en yeni) eskiye doğru sırala
    allArticles.sort((a, b) => b.timestamp - a.timestamp);
    
    // Ekranda kasmaması için en güncel 60 haberi al
    allArticles = allArticles.slice(0, 60);

    if (allArticles.length === 0) {
      allArticles = [
        { 
          id: '1', 
          title: 'Şu an sistemde aktif bir gelişme bulunmuyor veya haber kaynaklarına erişilemiyor.', 
          url: '#', 
          time: now.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }), 
          date: now.toLocaleDateString("tr-TR"),
          category: 'Sistem', 
          source: 'Nexus Terminal' 
        }
      ];
    }

    return NextResponse.json({ success: true, articles: allArticles });
  } catch (error) {
    console.error("Haber API Hatası:", error);
    return NextResponse.json({ success: false, articles: [] }, { status: 500 });
  }
}