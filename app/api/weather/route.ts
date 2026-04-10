import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://wttr.in/Pune?format=j1", {
      signal: controller.signal,
      headers: { "User-Agent": "InvictusMC/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    const current = data.current_condition?.[0] || {};
    return NextResponse.json({
      temp_C: current.temp_C || "?",
      weatherDesc: current.weatherDesc?.[0]?.value || "Unknown",
      humidity: current.humidity || "?",
      feelsLike: current.FeelsLikeC || current.temp_C || "?",
      windSpeed: current.windspeedKmph || "?",
    });
  } catch {
    return NextResponse.json({ temp_C: "?", weatherDesc: "Unavailable", humidity: "?", feelsLike: "?", windSpeed: "?" });
  }
}
