import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // JSON dosyasını yerel klasörden oku
    const filePath = path.join(process.cwd(), "tefas_data.json");
    
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      const jsonData = JSON.parse(fileData);
      return NextResponse.json(jsonData);
    } else {
      return NextResponse.json({ funds: [], error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ funds: [], error: "Internal Server Error" }, { status: 500 });
  }
}