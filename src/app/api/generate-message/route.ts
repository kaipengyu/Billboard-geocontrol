import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;


// talking points based on weather
const weatherTalkingPointsMapping: Record<string, string[]> = {
  "hot": [
    "Heat wave coming? Get going with a free Quick Home Energy Checkup.",
    "Increased temps? Decrease your expenses with a home energy audit.",
    "Don't mind the heat. An average of $3,000 in home energy rebates is pretty chill.",
    "Don't sweat it, your new AC could help pay for itself.",
    "Upgrade your AC with up to $1,600 in hot rebates.",
    "Sunny with a chance of saving thousands on efficient HVAC.",
    "Summer tips: Wear sunscreen. Hydrate. And get that free HVAC check we offer.",
    "Tune-up your HVAC now for free. Cool down later.",
    "How's your home handling this heat? An energy audit can lead to up to $15,000 in rebates.",
    "When the grid groans, so does your wallet.  Smart thermostats save everyone.",
    "Earn. Don't burn. Get your credits with Energy Savings Day alerts.",
    "Heat wave coming? Track your energy usage before it gets here.",
  ],
  "rain": [ 
    "Storms ahead? Stay ready and energy-smart all season.",
    "Rain got you down? Chase the clouds away with a free Smart Thermostat.",
    "Stay dry and save energy with our HVAC tune-up program.",
    "With the results of you home energy audit, todays the weather just got a whole lot better.",
    "This message reacts to the weather. Does your thermostat? ",
    "Rain, rain go away let people earn peak awards today.",
    "It's raining. It's pouring. The old man is… smart and checking his MyAccount."
  ],
  "normal": [
    "When the forecast calls for savings. Will you be ready?",
    "Clear skies today: A great reminder to clear out and recycle those old appliances.",
    "It looks like a great day to ditch that old fridge and pick up $50.",
    "It's a great day for cargo shorts and HVAC rebates.",
    "Were you prepared for this weather? You ENERGY STAR® built house was.",
    "If you build an ENERGY STAR® house, your building your nest and your nest egg.",
  ]
};


// Determine weather category based on conditions and temperature
function getWeatherCategory({ weather, temp }: { weather: string, temp: number }): 'hot' | 'rain' | 'normal' {
  const weatherLower = weather.toLowerCase();
  
  if (weatherLower.includes('rain') || weatherLower.includes('drizzle') || weatherLower.includes('shower')) {
    return 'rain';
  }
  
  if (weatherLower.includes('hot') || temp > 80) {
    return 'hot';
  }
  
  return 'normal';
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

    // Get weather category and corresponding talking points
    const weatherCategory = getWeatherCategory({ weather, temp });
    const weatherTalkingPoints = weatherTalkingPointsMapping[weatherCategory] || [];
    let selectedTalkingPoint = '';
    if (weatherTalkingPoints.length > 0) {
      selectedTalkingPoint = weatherTalkingPoints[Math.floor(Math.random() * weatherTalkingPoints.length)];
    }

    // Generate message using OpenAI
    const prompt = `You are a smart billboard. Create a warm, friendly greeting or observation (less than 8 words) for people passing by, using this info: location: ${location}, ${neighborhoodInfo}. Do not mention BGE or any program. Do not use phrases like 'Welcome to' or anything that implies the audience is a visitor. Avoid slogans, taglines, or advertisements. Make it sound like a genuine, casual greeting or observation for anyone in the area.`;

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
    // Append the weather-based talking point as a new sentence
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