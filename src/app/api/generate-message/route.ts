import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;


// Baltimore zip code mapping: each zip code maps to 3 programs (hot, cold, normal)
const zipProgramMapping: Record<string, { hot: string, cold: string, normal: string }> = {
  "21201": { hot: "Appliance Rebates", cold: "Home Performance", normal: "Peak Rewards" },
  "21202": { hot: "Appliance Recycling", cold: "Home Performance", normal: "Peak Rewards" },
  "21205": { hot: "HVAC Tune-up", cold: "Home Performance", normal: "Peak Rewards" },
  "21206": { hot: "Peak Rewards", cold: "Home Performance", normal: "Smart Energy Rewards" },
  "21209": { hot: "Smart Energy Rewards", cold: "Home Performance", normal: "Appliance Rebates" },
  "21210": { hot: "Appliance Rebates", cold: "Home Performance", normal: "Peak Rewards" },
  "21211": { hot: "Appliance Recycling", cold: "Home Performance", normal: "Peak Rewards" },
  "21212": { hot: "HVAC Tune-up", cold: "Home Performance", normal: "Peak Rewards" },
  "21213": { hot: "Peak Rewards", cold: "Home Performance", normal: "Smart Energy Rewards" },
  "21214": { hot: "Smart Energy Rewards", cold: "Home Performance", normal: "Appliance Rebates" },
  "21215": { hot: "Appliance Rebates", cold: "Home Performance", normal: "Peak Rewards" },
  "21216": { hot: "Appliance Recycling", cold: "Home Performance", normal: "Peak Rewards" },
  "21217": { hot: "HVAC Tune-up", cold: "Home Performance", normal: "Peak Rewards" },
  "21218": { hot: "Peak Rewards", cold: "Home Performance", normal: "Smart Energy Rewards" },
  "21223": { hot: "Smart Energy Rewards", cold: "Home Performance", normal: "Appliance Rebates" },
  "21224": { hot: "Appliance Rebates", cold: "Home Performance", normal: "Peak Rewards" },
  "21225": { hot: "Appliance Recycling", cold: "Home Performance", normal: "Peak Rewards" },
  "21226": { hot: "HVAC Tune-up", cold: "Home Performance", normal: "Peak Rewards" },
  "21229": { hot: "Peak Rewards", cold: "Home Performance", normal: "Smart Energy Rewards" },
  "21230": { hot: "Smart Energy Rewards", cold: "Home Performance", normal: "Appliance Rebates" },
  "21231": { hot: "Appliance Rebates", cold: "Home Performance", normal: "Peak Rewards" },
  "21239": { hot: "Appliance Recycling", cold: "Home Performance", normal: "Peak Rewards" },
  "21251": { hot: "HVAC Tune-up", cold: "Home Performance", normal: "Peak Rewards" },
  "21287": { hot: "Peak Rewards", cold: "Home Performance", normal: "Smart Energy Rewards" }
};

// Key talking points for each program
const talkingPointsMapping: Record<string, string[]> = {
  "Quick Home Energy Checkup": [
    "No additional cost check-up",
    "Installation of free energy-saving products",
    "Installation of free Smart Thermostat",
    "Installation of free LEDs",
    "Learn ways to save with personalized recommendations",
    "Personalized energy-saving report"
  ],
  "Home Performance": [
    "Whole-home energy audit",
    "Audit will show you ways to save that work for you",
    "Average of $3000 in rebates for home improvement work",
    "Cut home energy",
    "Increase comfort",
    "Follow-up support post audit",
    "Up to $10,000 in rebates",
    "$15,000 in rebates with electrification"
  ],
  "Appliance Rebates": [
    "Rebates up to $1,600 for energy-efficient appliances",
    "Covers heat pump water heaters ($1,600)",
    "Covers smart thermostats (up to $100)",
    "Covers dehumidifiers ($50)",
    "Up to $2,000 for Heat pump water heaters",
    "75% of the cost up to $3,000 to prepare home for electrification"
  ],
  "Appliance Recycling": [
    "$50 reward for old, working fridge or freezer",
    "$25 more when recycling mini fridge at the same time",
    "$25 more when recycling dehumidifier at the same time",
    "$25 more when recycling room a/c at the same time",
    "No additional cost pickup",
    "Hassle-free pickup",
    "Indoor and outdoor pickup",
  ],
  "HVAC Tune-up": [
    "Savings on energy-efficient systems",
    "Additional incentives for electrification",
    "75% of cost up to $3,000 to prepare home for installation",
    "Test system to ensure it's running at peak performance",
    "Increases efficiency",
    "Increases system lifespan",
    "No additional cost",
    "Includes smart thermostat, if eligible"
  ],
  "Peak Rewards": [
    "Bill credits for AC cycling during peak events",
    "Supports grid reliability",
    "Smart thermostat integration"
  ],
  "Smart Energy Rewards": [
    "Earn bill credits on Energy Savings Days",
    "Notifications sent in advance",
    "Easy participation via BGE account"
  ]
};

// Recommendation algorithm: 70/30 split between weather/normal programs and Quick Home Energy Checkup/Home Performance
function recommendBGEProduct({ zipCode, weather, temp }: { zipCode: string, weather: string, temp: number }) {
  const programs = zipProgramMapping[zipCode] || {
    hot: "Appliance Rebates",
    cold: "Home Performance",
    normal: "Peak Rewards"
  };
  const weatherLower = weather.toLowerCase();
  const rand = Math.random();
  const quickOrHome = Math.random() < 0.5 ? "Quick Home Energy Checkup" : "Home Performance";

  if (weatherLower.includes("hot") || temp > 80) {
    // 70% hot program, 30% Quick Home Energy Checkup/Home Performance
    return rand < 0.7 ? programs.hot : quickOrHome;
  }
  if (weatherLower.includes("cold") || temp < 50) {
    // 70% cold program, 30% Quick Home Energy Checkup/Home Performance
    return rand < 0.7 ? programs.cold : quickOrHome;
  }
  // Otherwise: 70% Quick Home Energy Checkup/Home Performance, 30% normal program
  return rand < 0.7 ? quickOrHome : programs.normal;
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

  {
    "zip_code": "21201",
    "neighborhood": ["Downtown", "Mount Vernon", "Seton Hill"],
    "highlight": ["historic", "cultural landmarks", "arts", "education", "diverse community"]
  },
  {
    "zip_code": "21202",
    "neighborhood": ["Inner Harbor", "Little Italy", "Jonestown"],
    "highlight": ["waterfront", "tourism", "dining", "nightlife", "Italian-American community"]
  },
  {
    "zip_code": "21205",
    "neighborhood": ["Middle East", "Milton-Montford", "Madison-Eastend"],
    "highlight": ["Johns Hopkins", "medical", "revitalization", "development", "African-American community"]
  },
  {
    "zip_code": "21206",
    "neighborhood": ["Frankford", "Waltherson", "Cedonia"],
    "highlight": ["residential", "parks", "community", "diverse housing", "African-American community"]
  },
  {
    "zip_code": "21209",
    "neighborhood": ["Mount Washington", "Cheswolde", "Cross Keys"],
    "highlight": ["suburban", "shopping", "recreation", "Jones Falls Trail", "Jewish community"]
  },
  {
    "zip_code": "21210",
    "neighborhood": ["Roland Park", "Wyndhurst", "Tuscany-Canterbury"],
    "highlight": ["historic homes", "tree-lined", "Johns Hopkins", "university proximity", "affluent community"]
  },
  {
    "zip_code": "21211",
    "neighborhood": ["Hampden", "Medfield", "Remington"],
    "highlight": ["arts", "shops", "festivals", "HonFest", "creative community"]
  },
  {
    "zip_code": "21212",
    "neighborhood": ["Homeland", "Govans", "Mid-Govans"],
    "highlight": ["historic homes", "education", "shopping", "residential mix", "diverse community"]
  },
  {
    "zip_code": "21213",
    "neighborhood": ["Belair-Edison", "Clifton Park", "Broadway East"],
    "highlight": ["parks", "residential", "African-American community", "revitalization"]
  },
  {
    "zip_code": "21214",
    "neighborhood": ["Hamilton", "Lauraville"],
    "highlight": ["arts", "residential", "gardening", "family-friendly", "diverse community"]
  },
  {
    "zip_code": "21215",
    "neighborhood": ["Park Heights", "Pimlico", "Arlington"],
    "highlight": ["Pimlico Race Course", "African-American community", "revitalization", "residential"]
  },
  {
    "zip_code": "21216",
    "neighborhood": ["Walbrook", "Forest Park", "Hanlon-Longwood"],
    "highlight": ["historic", "residential", "African-American community", "parks"]
  },
  {
    "zip_code": "21217",
    "neighborhood": ["Druid Hill Park", "Reservoir Hill", "Bolton Hill"],
    "highlight": ["parks", "historic homes", "arts", "diverse community"]
  },
  {
    "zip_code": "21218",
    "neighborhood": ["Waverly", "Charles Village", "Barclay"],
    "highlight": ["Johns Hopkins University", "education", "arts", "diverse community"]
  },
  {
    "zip_code": "21223",
    "neighborhood": ["Poppleton", "Union Square", "Hollins Market"],
    "highlight": ["historic", "African-American community", "revitalization", "residential"]
  },
  {
    "zip_code": "21224",
    "neighborhood": ["Highlandtown", "Canton", "Brewers Hill"],
    "highlight": ["arts", "dining", "Polish-American community", "revitalization"]
  },
  {
    "zip_code": "21225",
    "neighborhood": ["Brooklyn", "Cherry Hill", "Curtis Bay"],
    "highlight": ["industrial", "African-American community", "residential", "revitalization"]
  },
  {
    "zip_code": "21226",
    "neighborhood": ["Curtis Bay", "Hawkins Point"],
    "highlight": ["industrial", "port", "residential", "revitalization"]
  },
  {
    "zip_code": "21229",
    "neighborhood": ["Irvington", "Beechfield", "Saint Josephs"],
    "highlight": ["residential", "parks", "diverse community", "revitalization"]
  },
  {
    "zip_code": "21230",
    "neighborhood": ["Federal Hill", "Locust Point", "Riverside"],
    "highlight": ["waterfront", "historic", "young professionals", "dining", "Irish-American community"]
  },
  {
    "zip_code": "21231",
    "neighborhood": ["Fells Point", "Upper Fells Point", "Butchers Hill"],
    "highlight": ["historic", "waterfront", "dining", "arts", "diverse community"]
  },
  {
    "zip_code": "21239",
    "neighborhood": ["Loch Raven", "Northwood", "Perring Loch"],
    "highlight": ["residential", "education", "parks", "African-American community"]
  },
   {
        "zip_code": "21251",
        "neighborhood": ["Morgan State University"],
        "highlight": ["education", "African-American community", "university"]
      },
      {
        "zip_code": "21287",
        "neighborhood": ["Johns Hopkins Hospital"],
        "highlight": ["medical", "education", "research", "diverse community"]
      }


    ];
    let neighborhoodInfo = '';
    let match;
    if (zipCode) {
      match = zipMapping.find(z => z.zip_code === zipCode);
      if (match) {
        const neighborhoods = match.neighborhood;
        const randomNeighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
        neighborhoodInfo = `Neighborhood: ${randomNeighborhood}. Highlights: ${match.highlight.join(", ")}.`;
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
      zipCode: zipCode || '',
      weather,
      temp
    });

    // Get talking points for the recommended product
    const talkingPoints = talkingPointsMapping[recommendedProduct] || [];
    let selectedTalkingPoint = '';
    if (talkingPoints.length > 0) {
      selectedTalkingPoint = talkingPoints[Math.floor(Math.random() * talkingPoints.length)];
    }

    // Generate message using OpenAI
    const prompt = `You are a smart billboard. Create a catchy, friendly sentence less than 10 words for people passing by, using this info: location: ${location}, weather: ${weather}, ${neighborhoodInfo}. Do not mention BGE or any program. Only generate a general greeting or observation.`;

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

    const messageRaw = aiData.choices?.[0]?.message?.content?.trim() || 'Welcome!';
    // Remove leading/trailing quotes (single or double)
    let message = messageRaw.replace(/^['"]+|['"]+$/g, '');
    // Replace all straight single quotes with curly right single quote
    message = message.replace(/'/g, '’');
    // Append the strict talking point as a new sentence
    if (selectedTalkingPoint) {
      message = message.trim();
      if (!/[.!?]$/.test(message)) message += '.';
      message += ' ' + selectedTalkingPoint;
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 