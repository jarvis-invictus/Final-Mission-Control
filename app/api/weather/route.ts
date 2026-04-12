import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<any> {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city") || "Mamurdi,Pune";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://wttr.in/" + encodeURIComponent(city) + "?format=j1", {
      signal: controller.signal,
      headers: { "User-Agent": "InvictusMC/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    const current = data.current_condition?.[0] || {};
    const area = data.nearest_area?.[0];
    const cityName = area?.areaName?.[0]?.value || "Mamurdi";
    return NextResponse.json({
      temp_C: current.temp_C || "?",
      weatherDesc: current.weatherDesc?.[0]?.value || "Unknown",
      humidity: current.humidity || "?",
      feelsLike: current.FeelsLikeC || current.temp_C || "?",
      windSpeed: current.windspeedKmph || "?",
      city: cityName,
    });
  } catch {
    return NextResponse.json({ temp_C: "?", weatherDesc: "Unavailable", humidity: "?", feelsLike: "?", windSpeed: "?", city: "Mamurdi" });
  }
}
