import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;


// Baltimore zip code mapping: each zip code maps to 3 products
const zipProductMapping: Record<string, [string, string, string]> = {
  "21201": ["smart thermostat", "appliance recycling", "community solar"],
  "21202": ["connected rewards", "solar incentives", "quick home energy check-up"],
  "21205": ["home performance with Energy Star", "heat pump water heater", "appliance recycling"],
  "21206": ["quick home energy check-up", "dehumidifier", "community solar"],
  "21209": ["solar incentives", "smart thermostat", "EVsmart"],
  "21210": ["community solar", "appliance recycling", "solar incentives"],
  "21211": ["community solar", "quick home energy check-up", "appliance recycling"],
  "21212": ["home performance with Energy Star", "smart thermostat", "community solar"],
  "21213": ["quick home energy check-up", "appliance recycling", "dehumidifier"],
  "21214": ["community solar", "quick home energy check-up", "appliance recycling"],
  "21215": ["appliance recycling", "quick home energy check-up", "smart thermostat"],
  "21216": ["appliance recycling", "dehumidifier", "community solar"],
  "21217": ["community solar", "appliance recycling", "solar incentives"],
  "21218": ["home performance with Energy Star", "community solar", "smart thermostat"],
  "21223": ["appliance recycling", "quick home energy check-up", "dehumidifier"],
  "21224": ["solar incentives", "connected rewards", "community solar"],
  "21225": ["appliance recycling", "quick home energy check-up", "community solar"],
  "21226": ["appliance recycling", "community solar", "quick home energy check-up"],
  "21229": ["quick home energy check-up", "community solar", "appliance recycling"],
  "21230": ["smart thermostat", "connected rewards", "solar incentives"],
  "21231": ["community solar", "solar incentives", "appliance recycling"],
  "21239": ["quick home energy check-up", "home performance with Energy Star", "community solar"],
  "21251": ["home performance with Energy Star", "community solar", "appliance recycling"],
  "21287": ["home performance with Energy Star", "appliance recycling", "community solar"]
};

// Recommendation algorithm: pick product based on weather
function recommendBGEProduct({ zipCode, weather, temp }: { zipCode: string, weather: string, temp: number }) {
  const products = zipProductMapping[zipCode] || [
    "quick home energy check-up",
    "smart thermostat",
    "community solar"
  ];
  const weatherLower = weather.toLowerCase();

  if ((weatherLower.includes("sun") || weatherLower.includes("clear")) && products.some(p => p.includes("solar"))) {
    return products.find(p => p.includes("solar"))!;
  } else if ((weatherLower.includes("rain") || weatherLower.includes("humid") || weatherLower.includes("storm")) && products.some(p => p.includes("dehumidifier"))) {
    return products.find(p => p.includes("dehumidifier"))!;
  } else if (weatherLower.includes("hot") || temp > 80) {
    return products[0];
  } else if (weatherLower.includes("cold") || temp < 50) {
    return products[1];
  } else {
    return products[2];
  }
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
      zipCode: zipCode || '',
      weather,
      temp
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