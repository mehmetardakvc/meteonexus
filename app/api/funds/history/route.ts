import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const range = searchParams.get("range") || "1y";

  if (!code) return NextResponse.json({ error: "Kod gerekli" }, { status: 400 });

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/history/${code}?range=${range}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Geçmiş veri çekilemedi:", error);
    return NextResponse.json([]);
  }
}