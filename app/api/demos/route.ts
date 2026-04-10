import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const DEMO_BASE_URL = "https://demo.invictus-ai.in";

/* ================================================================ */
/*  NICHE CATEGORIES — curated grouping                               */
/* ================================================================ */

type Category = "Healthcare" | "Beauty & Wellness" | "Automotive" | "Education" | "Food & Hospitality" |
  "Professional Services" | "Home & Living" | "Events & Lifestyle" | "Technology" | "Other";

type QualityTier = "featured" | "ready" | "draft" | "archive";

interface NicheConfig {
  category: Category;
  emoji: string;
  displayName: string;
  tier: QualityTier;
  region?: string[];          // Where this niche works best
  seasonality?: string;       // "year-round" | "seasonal-summer" | etc.
}

// Master niche config — curated metadata for every niche
const NICHE_CONFIG: Record<string, NicheConfig> = {
  // 🏥 Healthcare
  dental:        { category: "Healthcare", emoji: "🦷", displayName: "Dental Clinic", tier: "featured", region: ["India", "Global"], seasonality: "year-round" },
  clinic:        { category: "Healthcare", emoji: "🏥", displayName: "Medical Clinic", tier: "featured", region: ["India", "Global"], seasonality: "year-round" },
  hospital:      { category: "Healthcare", emoji: "🏥", displayName: "Hospital", tier: "ready", region: ["India"], seasonality: "year-round" },
  derma:         { category: "Healthcare", emoji: "💊", displayName: "Dermatology", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  eye:           { category: "Healthcare", emoji: "👁️", displayName: "Eye Care", tier: "ready", region: ["India"], seasonality: "year-round" },
  physio:        { category: "Healthcare", emoji: "🏃", displayName: "Physiotherapy", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  optician:      { category: "Healthcare", emoji: "👓", displayName: "Optician", tier: "ready", region: ["India"], seasonality: "year-round" },
  pharmacy:      { category: "Healthcare", emoji: "💊", displayName: "Pharmacy", tier: "ready", region: ["India"], seasonality: "year-round" },
  lab:           { category: "Healthcare", emoji: "🔬", displayName: "Pathology Lab", tier: "ready", region: ["India"], seasonality: "year-round" },
  labs:          { category: "Healthcare", emoji: "🔬", displayName: "Diagnostic Lab", tier: "draft", region: ["India"], seasonality: "year-round" },
  radiology:     { category: "Healthcare", emoji: "📡", displayName: "Radiology Centre", tier: "draft", region: ["India"], seasonality: "year-round" },
  homeopathy:    { category: "Healthcare", emoji: "🌿", displayName: "Homeopathy", tier: "draft", region: ["India"], seasonality: "year-round" },
  ayurveda:      { category: "Healthcare", emoji: "🧘", displayName: "Ayurveda", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  veterinary:    { category: "Healthcare", emoji: "🐾", displayName: "Veterinary", tier: "ready", region: ["India"], seasonality: "year-round" },
  mentalhealth:  { category: "Healthcare", emoji: "🧠", displayName: "Mental Health", tier: "ready", region: ["India", "Global"], seasonality: "year-round" },
  speechtherapy: { category: "Healthcare", emoji: "🗣️", displayName: "Speech Therapy", tier: "draft", region: ["India"], seasonality: "year-round" },
  prenatal:      { category: "Healthcare", emoji: "🤰", displayName: "Prenatal Care", tier: "draft", region: ["India"], seasonality: "year-round" },
  dietitian:     { category: "Healthcare", emoji: "🥗", displayName: "Dietitian", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },

  // 💅 Beauty & Wellness
  salon:         { category: "Beauty & Wellness", emoji: "💇", displayName: "Salon", tier: "featured", region: ["India", "Pune", "Global"], seasonality: "year-round" },
  spa:           { category: "Beauty & Wellness", emoji: "🧖", displayName: "Spa", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  aesthetics:    { category: "Beauty & Wellness", emoji: "✨", displayName: "Aesthetics Clinic", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  beautyacademy: { category: "Beauty & Wellness", emoji: "💄", displayName: "Beauty Academy", tier: "draft", region: ["India"], seasonality: "year-round" },
  yoga:          { category: "Beauty & Wellness", emoji: "🧘", displayName: "Yoga Studio", tier: "ready", region: ["India", "Global"], seasonality: "year-round" },
  gym:           { category: "Beauty & Wellness", emoji: "💪", displayName: "Gym / Fitness", tier: "featured", region: ["India", "Pune", "Global"], seasonality: "jan-peak" },

  // 🚗 Automotive
  autoservice:   { category: "Automotive", emoji: "🔧", displayName: "Auto Service", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  autodealership:{ category: "Automotive", emoji: "🚗", displayName: "Auto Dealership", tier: "ready", region: ["India"], seasonality: "year-round" },
  carwash:       { category: "Automotive", emoji: "🚿", displayName: "Car Wash", tier: "draft", region: ["India"], seasonality: "summer" },
  evcharging:    { category: "Automotive", emoji: "⚡", displayName: "EV Charging", tier: "draft", region: ["India"], seasonality: "year-round" },
  evservicecenter:{ category: "Automotive", emoji: "🔋", displayName: "EV Service Centre", tier: "draft", region: ["India"], seasonality: "year-round" },

  // 📚 Education
  coaching:      { category: "Education", emoji: "📖", displayName: "Coaching Centre", tier: "featured", region: ["India", "Pune"], seasonality: "year-round" },
  tutor:         { category: "Education", emoji: "👨‍🏫", displayName: "Tutoring", tier: "ready", region: ["India"], seasonality: "year-round" },
  hometutor:     { category: "Education", emoji: "🏠", displayName: "Home Tutor", tier: "draft", region: ["India"], seasonality: "year-round" },
  preschool:     { category: "Education", emoji: "🎒", displayName: "Preschool", tier: "ready", region: ["India", "Pune"], seasonality: "admission-season" },
  school:        { category: "Education", emoji: "🏫", displayName: "School", tier: "draft", region: ["India"], seasonality: "admission-season" },
  driving:       { category: "Education", emoji: "🚗", displayName: "Driving School", tier: "draft", region: ["India"], seasonality: "year-round" },
  childcare:     { category: "Education", emoji: "👶", displayName: "Childcare", tier: "draft", region: ["India"], seasonality: "year-round" },

  // 🍽️ Food & Hospitality
  restaurant:    { category: "Food & Hospitality", emoji: "🍽️", displayName: "Restaurant", tier: "featured", region: ["India", "Pune", "Global"], seasonality: "year-round" },
  hotel:         { category: "Food & Hospitality", emoji: "🏨", displayName: "Hotel", tier: "ready", region: ["India", "Global"], seasonality: "travel-season" },
  bakery:        { category: "Food & Hospitality", emoji: "🧁", displayName: "Bakery", tier: "draft", region: ["India"], seasonality: "year-round" },
  catering:      { category: "Food & Hospitality", emoji: "🍛", displayName: "Catering", tier: "draft", region: ["India", "Pune"], seasonality: "wedding-season" },

  // 💼 Professional Services
  lawyer:        { category: "Professional Services", emoji: "⚖️", displayName: "Law Firm", tier: "featured", region: ["India", "Global"], seasonality: "year-round" },
  ca:            { category: "Professional Services", emoji: "📊", displayName: "Chartered Accountant", tier: "ready", region: ["India", "Pune"], seasonality: "tax-season" },
  finance:       { category: "Professional Services", emoji: "💰", displayName: "Financial Advisor", tier: "ready", region: ["India"], seasonality: "year-round" },
  insurance:     { category: "Professional Services", emoji: "🛡️", displayName: "Insurance", tier: "ready", region: ["India"], seasonality: "year-round" },
  immigration:   { category: "Professional Services", emoji: "✈️", displayName: "Immigration", tier: "draft", region: ["India"], seasonality: "year-round" },
  itservices:    { category: "Professional Services", emoji: "💻", displayName: "IT Services", tier: "draft", region: ["India", "Global"], seasonality: "year-round" },
  realestate:    { category: "Professional Services", emoji: "🏠", displayName: "Real Estate", tier: "featured", region: ["India", "Pune"], seasonality: "year-round" },

  // 🏠 Home & Living
  interior:      { category: "Home & Living", emoji: "🎨", displayName: "Interior Design", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  homeservices:  { category: "Home & Living", emoji: "🔨", displayName: "Home Services", tier: "draft", region: ["India"], seasonality: "year-round" },
  laundry:       { category: "Home & Living", emoji: "👔", displayName: "Laundry", tier: "draft", region: ["India"], seasonality: "year-round" },
  solar:         { category: "Home & Living", emoji: "☀️", displayName: "Solar Energy", tier: "draft", region: ["India"], seasonality: "summer" },
  printing:      { category: "Home & Living", emoji: "🖨️", displayName: "Printing", tier: "draft", region: ["India"], seasonality: "year-round" },
  mobilerepair:  { category: "Home & Living", emoji: "📱", displayName: "Mobile Repair", tier: "draft", region: ["India"], seasonality: "year-round" },

  // 🎉 Events & Lifestyle
  events:        { category: "Events & Lifestyle", emoji: "🎉", displayName: "Events", tier: "ready", region: ["India", "Pune"], seasonality: "wedding-season" },
  wedding:       { category: "Events & Lifestyle", emoji: "💒", displayName: "Wedding Planner", tier: "ready", region: ["India", "Pune"], seasonality: "wedding-season" },
  photography:   { category: "Events & Lifestyle", emoji: "📸", displayName: "Photography", tier: "ready", region: ["India", "Pune"], seasonality: "year-round" },
  jeweller:      { category: "Events & Lifestyle", emoji: "💎", displayName: "Jeweller", tier: "ready", region: ["India"], seasonality: "wedding-season" },
  travel:        { category: "Events & Lifestyle", emoji: "✈️", displayName: "Travel Agency", tier: "ready", region: ["India"], seasonality: "travel-season" },
  pet:           { category: "Events & Lifestyle", emoji: "🐕", displayName: "Pet Care", tier: "ready", region: ["India"], seasonality: "year-round" },
};

const CATEGORY_ORDER: Category[] = [
  "Healthcare", "Beauty & Wellness", "Food & Hospitality", "Professional Services",
  "Education", "Automotive", "Events & Lifestyle", "Home & Living", "Technology", "Other",
];

const CATEGORY_EMOJI: Record<Category, string> = {
  "Healthcare": "🏥", "Beauty & Wellness": "💅", "Automotive": "🚗", "Education": "📚",
  "Food & Hospitality": "🍽️", "Professional Services": "💼", "Home & Living": "🏠",
  "Events & Lifestyle": "🎉", "Technology": "💻", "Other": "📦",
};

/* ================================================================ */
/*  TYPES                                                             */
/* ================================================================ */

interface DemoVariant {
  filename: string;
  url: string;
  label: string;
}

interface DemoNiche {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  tier: QualityTier;
  region: string[];
  seasonality: string;
  variants: DemoVariant[];
  totalVariants: number;
}

/* ================================================================ */
/*  NICHE EXTRACTION                                                   */
/* ================================================================ */

/** Extract the root niche ID from a filename like dental-v3-showcase.html */
function extractNicheId(filename: string): string {
  let name = filename.replace(/\.html$/, "");

  // Skip non-niche files
  const SKIP = ["index", "demos", "seo-index", "mc", "ops-hub", "doc-viewer",
    "memory-viewer", "showcase-gallery", "demo-personalizer", "v3-blueprint",
    "mission-control"];
  if (SKIP.includes(name)) return "";

  // Strip version/variant suffixes to get root niche
  // e.g. "dental-v3-showcase" → "dental", "ca-v2-startup" → "ca", "autoservice-v1" → "autoservice"
  name = name
    .replace(/-showcase(-v\d+)?$/, "")
    .replace(/-v\d+(-[a-z]+)*$/, "")
    .replace(/-demo$/, "")
    .replace(/-multipage$/, "")
    .replace(/-website-.*$/, "");

  return name;
}

export async function GET() {
  try {
    const raw = execSync(
      "docker exec dental-demo-dental-demo-1 ls /usr/share/nginx/html/ 2>/dev/null",
      { timeout: 5000 }
    ).toString().trim();

    const allFiles = raw.split("\n").filter(f => f.endsWith(".html") && !f.startsWith("."));

    // Group files by niche
    const nicheMap: Record<string, DemoVariant[]> = {};

    for (const file of allFiles) {
      const nicheId = extractNicheId(file);
      if (!nicheId) continue;

      if (!nicheMap[nicheId]) nicheMap[nicheId] = [];

      // Create a human-readable label for this variant
      const label = file.replace(".html", "")
        .replace(new RegExp(`^${nicheId}-?`), "")
        .replace(/-/g, " ")
        .trim() || "Main";

      nicheMap[nicheId].push({
        filename: file,
        url: `${DEMO_BASE_URL}/${file}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }

    // Build niche objects with metadata
    const niches: DemoNiche[] = Object.entries(nicheMap).map(([id, variants]) => {
      const config = NICHE_CONFIG[id];
      return {
        id,
        name: config?.displayName || id.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim(),
        emoji: config?.emoji || "🌐",
        category: config?.category || "Other",
        tier: config?.tier || "archive",
        region: config?.region || [],
        seasonality: config?.seasonality || "unknown",
        variants: variants.sort((a, b) => a.filename.localeCompare(b.filename)),
        totalVariants: variants.length,
      };
    });

    // Sort: featured first, then by variant count, then alphabetically
    const tierOrder: Record<QualityTier, number> = { featured: 0, ready: 1, draft: 2, archive: 3 };
    niches.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || b.totalVariants - a.totalVariants || a.name.localeCompare(b.name));

    // Group by category
    const byCategory: Record<Category, DemoNiche[]> = {} as any;
    for (const cat of CATEGORY_ORDER) byCategory[cat] = [];
    for (const n of niches) {
      if (!byCategory[n.category]) byCategory[n.category] = [];
      byCategory[n.category].push(n);
    }

    // Stats
    const stats = {
      totalNiches: niches.length,
      totalVariants: niches.reduce((s, n) => s + n.totalVariants, 0),
      featured: niches.filter(n => n.tier === "featured").length,
      ready: niches.filter(n => n.tier === "ready").length,
      draft: niches.filter(n => n.tier === "draft").length,
      archive: niches.filter(n => n.tier === "archive").length,
      categories: Object.entries(byCategory).filter(([, v]) => v.length > 0).map(([cat, niches]) => ({
        name: cat,
        emoji: CATEGORY_EMOJI[cat as Category],
        count: niches.length,
      })),
    };

    return NextResponse.json({
      niches,
      byCategory,
      stats,
      baseUrl: DEMO_BASE_URL,
      timestamp: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("[demos API]", err);
    return NextResponse.json({ error: "Failed to scan demos", niches: [], stats: { totalNiches: 0 } }, { status: 500 });
  }
}
