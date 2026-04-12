import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<any> {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const city = searchParams.get("city");

    // Build location query: prefer lat/lon, fallback to city, default Pune
    let location = "Pune";
    if (lat && lon) {
      location = `${lat},${lon}`;
    } else if (city) {
      location = city;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
      signal: controller.signal,
      headers: { "User-Agent": "InvictusMC/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    const current = data.current_condition?.[0] || {};
    const area = data.nearest_area?.[0];
    const cityName = area?.areaName?.[0]?.value || city || "Unknown";
    return NextResponse.json({
      temp_C: current.temp_C || "?",
      weatherDesc: current.weatherDesc?.[0]?.value || "Unknown",
      humidity: current.humidity || "?",
      feelsLike: current.FeelsLikeC || current.temp_C || "?",
      windSpeed: current.windspeedKmph || "?",
      city: cityName,
    });
  } catch {
    return NextResponse.json({ temp_C: "?", weatherDesc: "Unavailable", humidity: "?", feelsLike: "?", windSpeed: "?", city: "Unknown" });
  }
}
