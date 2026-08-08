import { NextResponse } from "next/server";

// 1. TÜRKÇE KARAKTER (HTML ENTITY) ÇÖZÜCÜ
function decodeHTMLEntities(text: string) {
  const entities: { [key: string]: string } = {
    '&#252;': 'ü', '&#220;': 'Ü',
    '&#231;': 'ç', '&#199;': 'Ç',
    '&#287;': 'ğ', '&#286;': 'Ğ',
    '&#305;': 'ı', '&#304;': 'İ',
    '&#246;': 'ö', '&#214;': 'Ö',
    '&#351;': 'ş', '&#350;': 'Ş',
    '&nbsp;': ' ', '&quot;': '"',
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&#39;': "'", '&rsquo;': "'"
  };
  // HTML kodlarını (Örn: &#252;) tespit edip gerçek harflerle değiştirir
  return text.replace(/&#\d+;|&[a-z]+;/gi, match => entities[match] || match);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleUrl = searchParams.get("url");

  if (!articleUrl) {
    return NextResponse.json({ content: "URL bulunamadı." });
  }

  try {
    const res = await fetch(articleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    let html = await res.text();

    // 2. GEREKSİZ HTML BLOKLARINI KÖKÜNDEN SİL (Reklam, Menü, Footer, Önerilen Haberler Listesi)
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
               .replace(/<style[\s\S]*?<\/style>/gi, "")
               .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
               .replace(/<nav[\s\S]*?<\/nav>/gi, "")
               .replace(/<header[\s\S]*?<\/header>/gi, "")
               .replace(/<footer[\s\S]*?<\/footer>/gi, "")
               .replace(/<aside[\s\S]*?<\/aside>/gi, "")
               .replace(/<ul[\s\S]*?<\/ul>/gi, "") // Listeleri sil (Genelde "Şu haber de ilginizi çekebilir" linkleridir)
               .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");

    // 3. PARAGRAFLARI YAKALA
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);

    if (!paragraphs) {
       return NextResponse.json({ content: "Bu haberin içeriği otomatik okumaya karşı korumalı. Lütfen orijinal kaynağa gidiniz." });
    }

    // 4. İÇERİĞİ TEMİZLE VE BOZUK HARFLERİ DÜZELT
    let cleanParagraphs = paragraphs.map(p => {
      let text = p.replace(/<[^>]+>/g, '').trim(); // Kalan HTML etiketlerini sil (Kalın, italik yazılar vb.)
      return decodeHTMLEntities(text); // d&#252;nya -> dünya dönüşümünü yap
    });

    // 5. SPAM, REKLAM VE JAVASCRIPT KODLARINI FİLTRELE
    const spamKeywords = [
      ".click(", "preventDefault", "Tam Boyutta Gör", "gün önce eklendi", 
      "amazon.com", "hepsiburada.com", "trendyol.com", "Satın Al", "Sponsorlu",
      "Yorum Yaz", "Paylaş", "Abone Ol", "bizi takip edin", "Tüm hakları saklıdır",
      "ilgili haber:", "okumaya devam et"
    ];

    let fullText = cleanParagraphs
      // 80 karakterden kısa satırları at ("3 gün önce eklendi" veya "Haberin devamı" gibi çöpleri eler)
      .filter(p => p.length > 80) 
      // İçinde Amazon linki, JS kodu veya reklam kelimesi geçen paragrafları imha et
      .filter(p => !spamKeywords.some(spam => p.toLowerCase().includes(spam.toLowerCase()))) 
      .join('\n\n'); // Kalan temiz paragrafların arasına çift boşluk koyarak birleştir

    if (!fullText || fullText.trim() === "") {
      fullText = "Haber metni reklam koruması veya uyumsuz sayfa yapısı nedeniyle çekilemedi. Orijinal kaynaktan okuyabilirsiniz.";
    }

    return NextResponse.json({ content: fullText });

  } catch (err) {
    console.error("Haber okuma hatası:", err);
    return NextResponse.json({ content: "Haber yüklenirken bağlantı hatası oluştu." });
  }
}