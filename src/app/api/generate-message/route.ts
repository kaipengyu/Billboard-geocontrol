import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// BGE residential products
const BGE_PRODUCTS = [
  "connected rewards",
  "quick home energy check-up",
  "solar incentives",
  "EVsmart",
  "home performance with Energy Star",
  "heat pump water heater",
  "smart thermostat",
  "dehumidifier",
  "community solar",
  "rooftop solar",
  "appliance recycling"
];

// Recommendation algorithm
function recommendBGEProduct({ weather, temp, neighborhoodHighlights = [] }: { weather: string, temp: number, neighborhoodHighlights?: string[] }) {
  const weatherLower = weather.toLowerCase();
  // Initialize scores
  const scores: Record<string, number> = Object.fromEntries(BGE_PRODUCTS.map(p => [p, 0]));

  // Weather and temp logic
  if (weatherLower.includes("hot") || temp > 80) {
    scores["smart thermostat"] += 3;
    scores["connected rewards"] += 2;
    scores["dehumidifier"] += 1;
  }
  if (weatherLower.includes("cold") || temp < 50) {
    scores["heat pump water heater"] += 3;
    scores["home performance with Energy Star"] += 2;
    scores["smart thermostat"] += 1;
  }
  if (weatherLower.includes("rain") || weatherLower.includes("humid") || weatherLower.includes("storm")) {
    scores["dehumidifier"] += 3;
    scores["quick home energy check-up"] += 1;
  }
  if (weatherLower.includes("clear") || weatherLower.includes("sun")) {
    scores["solar incentives"] += 3;
    scores["community solar"] += 2;
    scores["rooftop solar"] += 2;
  }
  if (weatherLower.includes("wind")) {
    scores["appliance recycling"] += 1;
  }

  // Neighborhood-based weighting (less weight)
  const highlightMap: Record<string, string[]> = {
    "arts": ["community solar"],
    "education": ["home performance with Energy Star"],
    "historic": ["appliance recycling"],
    "young professionals": ["EVsmart", "smart thermostat"],
    "parks": ["quick home energy check-up"],
    "revitalization": ["appliance recycling", "quick home energy check-up"],
    "university": ["home performance with Energy Star"],
    "dining": ["connected rewards"],
    "industrial": ["appliance recycling"],
    "residential": ["quick home energy check-up"],
    "diverse community": ["community solar"]
  };

  // Flatten highlights and update scores in a single pass
  neighborhoodHighlights.forEach(h => {
    const hLower = h.toLowerCase();
    Object.entries(highlightMap).forEach(([key, products]) => {
      if (hLower.includes(key)) {
        products.forEach(p => { scores[p] += 1; });
      }
    });
  });

  // Find the product with the highest score
  return Object.entries(scores).reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Missing latitude or longitude' }, { status: 400 });
    }

    // Reverse geocode to get zip code using Nominatim
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
      headers: { 'User-Agent': 'smart-billboard-v2/1.0' }
    });
    const geoData = await geoRes.json();
    const zipCode = geoData.address?.postcode;

    // Baltimore zip code mapping
    const zipMapping = [
      { zip_code: "21201", neighborhood: ["Downtown", "Mount Vernon", "Seton Hill"], highlight: ["historic", "cultural landmarks", "arts", "education", "diverse community"] },
      { zip_code: "21202", neighborhood: ["Inner Harbor", "Little Italy", "Jonestown"], highlight: ["waterfront", "tourism", "dining", "nightlife", "Italian-American community"] },
      { zip_code: "21205", neighborhood: ["Middle East", "Milton-Montford", "Madison-Eastend"], highlight: ["Johns Hopkins", "medical", "revitalization", "development", "African-American community"] },
      { zip_code: "21206", neighborhood: ["Frankford", "Waltherson", "Cedonia"], highlight: ["residential", "parks", "community", "diverse housing", "African-American community"] },
      { zip_code: "21209", neighborhood: ["Mount Washington", "Cheswolde", "Cross Keys"], highlight: ["suburban", "shopping", "recreation", "Jones Falls Trail", "Jewish community"] },
      { zip_code: "21210", neighborhood: ["Roland Park", "Wyndhurst", "Tuscany-Canterbury"], highlight: ["historic homes", "tree-lined", "Johns Hopkins", "university proximity", "affluent community"] },
      { zip_code: "21211", neighborhood: ["Hampden", "Medfield", "Remington"], highlight: ["arts", "shops", "festivals", "HonFest", "creative community"] },
      { zip_code: "21212", neighborhood: ["Homeland", "Govans", "Mid-Govans"], highlight: ["historic homes", "education", "shopping", "residential mix", "diverse community"] },
      { zip_code: "21213", neighborhood: ["Belair-Edison", "Clifton Park", "Broadway East"], highlight: ["parks", "residential", "African-American community", "revitalization"] },
      { zip_code: "21214", neighborhood: ["Hamilton", "Lauraville"], highlight: ["arts", "residential", "gardening", "family-friendly", "diverse community"] },
      { zip_code: "21215", neighborhood: ["Park Heights", "Pimlico", "Arlington"], highlight: ["Pimlico Race Course", "African-American community", "revitalization", "residential"] },
      { zip_code: "21216", neighborhood: ["Walbrook", "Forest Park", "Hanlon-Longwood"], highlight: ["historic", "residential", "African-American community", "parks"] },
      { zip_code: "21217", neighborhood: ["Druid Hill Park", "Reservoir Hill", "Bolton Hill"], highlight: ["parks", "historic homes", "arts", "diverse community"] },
      { zip_code: "21218", neighborhood: ["Waverly", "Charles Village", "Barclay"], highlight: ["Johns Hopkins University", "education", "arts", "diverse community"] },
      { zip_code: "21223", neighborhood: ["Poppleton", "Union Square", "Hollins Market"], highlight: ["historic", "African-American community", "revitalization", "residential"] },
      { zip_code: "21224", neighborhood: ["Highlandtown", "Canton", "Brewers Hill"], highlight: ["arts", "dining", "Polish-American community", "revitalization"] },
      { zip_code: "21225", neighborhood: ["Brooklyn", "Cherry Hill", "Curtis Bay"], highlight: ["industrial", "African-American community", "residential", "revitalization"] },
      { zip_code: "21226", neighborhood: ["Curtis Bay", "Hawkins Point"], highlight: ["industrial", "port", "residential", "revitalization"] },
      { zip_code: "21229", neighborhood: ["Irvington", "Beechfield", "Saint Josephs"], highlight: ["residential", "parks", "diverse community", "revitalization"] },
      { zip_code: "21230", neighborhood: ["Federal Hill", "Locust Point", "Riverside"], highlight: ["waterfront", "historic", "young professionals", "dining", "Irish-American community"] },
      { zip_code: "21231", neighborhood: ["Fells Point", "Upper Fells Point", "Butchers Hill"], highlight: ["historic", "waterfront", "dining", "arts", "diverse community"] },
      { zip_code: "21239", neighborhood: ["Loch Raven", "Northwood", "Perring Loch"], highlight: ["residential", "education", "parks", "African-American community"] },
      { zip_code: "21251", neighborhood: ["Morgan State University"], highlight: ["education", "African-American community", "university"] },
      { zip_code: "21287", neighborhood: ["Johns Hopkins Hospital"], highlight: ["medical", "education", "research", "diverse community"] }
    ];
    let neighborhoodInfo = '';
    let match;
    if (zipCode) {
      match = zipMapping.find(z => z.zip_code === zipCode);
      if (match) {
        neighborhoodInfo = `Neighborhoods: ${match.neighborhood.join(", ")}. Highlights: ${match.highlight.join(", ")}.`;
      }
    }

    // Fetch weather data
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=imperial`
    );
    const weatherData = await weatherRes.json();
    if (!weatherRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
    }

    const location = weatherData.name;
    const weather = weatherData.weather?.[0]?.description || 'unknown weather';
    const temp = Math.round(weatherData.main?.temp);

    // Determine recommended BGE product
    const recommendedProduct = recommendBGEProduct({
      weather,
      temp,
      neighborhoodHighlights: match?.highlight || []
    });

    // Generate message using OpenAI
    const prompt = `You are a smart billboard. Create a catchy, friendly sentence less than 20 words for people passing by, using this info: location: ${location}, weather: ${weather}, ${neighborhoodInfo} Recommend the BGE program: ${recommendedProduct}. `;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
      }),
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
    }

    const message = aiData.choices?.[0]?.message?.content?.trim() || 'Welcome!';
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 