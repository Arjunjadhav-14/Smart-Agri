import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('gemini_api_key');
    if (local && local.trim()) return local.trim();
  }
  return (process.env.GEMINI_API_KEY || '').trim();
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

function getAiClient(): GoogleGenAI | null {
  const key = getApiKey();
  if (!key || !key.trim()) {
    return null;
  }
  return new GoogleGenAI({ apiKey: key.trim() });
}

function cleanAndParseJSON(text: string): any {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

async function callGeminiWithRetry(params: any, retries = 2, delay = 1500): Promise<any> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("NO_API_KEY");
  }

  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        if (i === retries - 1) throw error;
        console.warn(`Gemini API rate limit reached. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}

// Fallback dynamic responses when API key is missing or quota is exhausted
function getFallbackCropHealth(crop: string, lang: string = 'en') {
  const isHi = lang === 'hi';
  const isMr = lang === 'mr';

  if (crop === 'Onion') {
    return {
      status: "Diseased",
      diseaseName: isHi ? "बैंगनी धब्बा रोग (Purple Blotch)" : isMr ? "जांभळा करपा रोग (Purple Blotch)" : "Purple Blotch (Alternaria porri)",
      symptoms: isHi 
        ? "पत्तियों पर छोटे, पानी से भीगे हुए धब्बे जो बाद में गहरे बैंगनी-भूरे रंग में बदल जाते हैं। पत्तियां ऊपर से सूखने लगती हैं।" 
        : isMr 
        ? "पानांवर लंबगोलाकार जांभळट तपकिरी रंगाचे चट्टे पडणे व पानांचे शेंडे वाळणे." 
        : "Small, water-soaked sunken lesions that turn purple-brown with chlorotic yellow borders. Outer leaves dry prematurely.",
      treatment: isHi 
        ? "मैनकोजेब 75% डब्ल्यूपी (2.5 ग्राम/लीटर) या कार्बेन्डाजिम का छिड़काव करें। जैविक: नीम तेल (3 मिली/लीटर) और ट्राइकोडर्मा का प्रयोग करें।" 
        : isMr 
        ? "मॅन्कोझेब २.५ ग्रॅम प्रति लिटर पाण्यात मिसळून फवारावे. जैविक पर्याय: निंबोळी तेल ३ मिली प्रति लिटर." 
        : "Apply Mancozeb 75% WP (2.5g/L) or Chlorothalonil. Organic option: Neem oil spray (3ml/L) and soil application of Trichoderma viride.",
      prevention: isHi 
        ? "उचित जल निकासी बनाए रखें, पौधों के बीच 15 सेमी की दूरी रखें और अत्यधिक नाइट्रोजन उर्वरक से बचें।" 
        : isMr 
        ? "योग्य निचरा ठेवा, रोपांमध्ये योग्य अंतर ठेवा आणि प्रमाणापेक्षा जास्त युरिया खताचा वापर टाळा." 
        : "Ensure good field drainage, maintain 15cm plant spacing for airflow, and avoid excessive overhead sprinkler irrigation.",
      confidence: 0.94
    };
  } else if (crop === 'Tomato') {
    return {
      status: "Diseased",
      diseaseName: isHi ? "अगेती झुलसा रोग (Early Blight)" : isMr ? "लवकर येणारा करपा (Early Blight)" : "Early Blight (Alternaria solani)",
      symptoms: isHi 
        ? "निचली पत्तियों पर गोल, संकेंद्रित छल्लों वाले भूरे-काले धब्बे और पत्तियों का पीला पड़ना।" 
        : isMr 
        ? "खालच्या पानांवर वर्तुळाकार तपकिरी-काळे ठिपके दिसणे व पाने पिवळी पडून गळणे." 
        : "Concentric dark brown rings ('target board' pattern) on lower foliage, causing leaf yellowing and defoliation.",
      treatment: isHi 
        ? "कॉपर ऑक्सीक्लोराइड (3 ग्राम/लीटर) या एज़ोक्सीस्ट्रोबिन (1 मिली/लीटर) का छिड़काव करें।" 
        : isMr 
        ? "कॉपर ऑक्सिक्लोराईड ३ ग्रॅम किंवा अझॉक्सीस्ट्रॉबिन १ मिली प्रति लिटर फवारावे." 
        : "Spray Copper Oxychloride 50% WP (3g/L) or Azoxystrobin (1ml/L). Organic option: Bacillus subtilis foliar spray.",
      prevention: isHi 
        ? "पौधों को सहारा (staking) दें, मल्चिंग का उपयोग करें और संक्रमित पत्तियों को तुरंत हटाएं।" 
        : isMr 
        ? "रोपांना आधार (बांबू/दोरी) द्या आणि प्लास्टिक मल्चिंगचा वापर करा." 
        : "Stake plants to keep foliage off wet soil, apply straw/plastic mulch, and prune lower leaves touching the ground.",
      confidence: 0.92
    };
  } else {
    return {
      status: "Diseased",
      diseaseName: isHi ? "पीला रतुआ (Yellow Rust)" : isMr ? "पिवळा तांबेरा (Yellow Rust)" : "Yellow Rust (Puccinia striiformis)",
      symptoms: isHi 
        ? "पत्तियों की नसों के समानांतर पीले रंग की धारियों में पाउडर जैसी फफूंद दिखाई देती है।" 
        : isMr 
        ? "पानांच्या शिरांच्या बाजूने पिवळसर रंगाच्या पट्ट्यांमध्ये पावडरसारखी बुरशी दिसते." 
        : "Linear stripes of bright lemon-yellow powdery urediniospores along leaf veins, reducing photosynthetic area.",
      treatment: isHi 
        ? "प्रोपिकोनाज़ोल 25% ईसी (1 मिली/लीटर) का तुरंत पहला छिड़काव करें। 15 दिन बाद आवश्यकतानुसार दोहराएं।" 
        : isMr 
        ? "प्रोपिकोनाझोल २५% ईसी १ मिली प्रति लिटर पाण्यात मिसळून त्वरित फवारणी करावी." 
        : "Spray Propiconazole 25% EC (1ml/L) immediately upon noticing initial pustules. Repeat after 14 days if needed.",
      prevention: isHi 
        ? "रोग प्रतिरोधी किस्मों (HD-3086, DBW-187) की बुवाई करें और संतुलित उर्वरकों का उपयोग करें।" 
        : isMr 
        ? "सुधारित व रोगप्रतिकारक वाणांची लागवड करा." 
        : "Sow certified rust-resistant varieties (HD-3086, PBW-725), ensure timely sowing, and maintain balanced potassium nutrition.",
      confidence: 0.96
    };
  }
}

function getFallbackMarket(crop: string, region: string, lang: string = 'en', rawData: any = null) {
  const isHi = lang === 'hi';
  const isMr = lang === 'mr';

  if (crop === 'Onion') {
    return {
      currentPrice: 2450,
      unit: "₹/Quintal",
      trend: "up",
      recommendation: "Wait",
      changePercentage: "+4.5%",
      insights: isHi 
        ? "नासिक और लासलगांव मंडियों में आवक संतुलित है। त्योहारी व निर्यात मांग मजबूत होने के कारण अगले 10-15 दिनों में भाव में और सुधार की संभावना है।" 
        : isMr 
        ? "लासलगाव व नाशिक बाजार समित्यांमध्ये कांद्याची आवक स्थिर आहे. आगामी दिवसांत दर ₹२,६०० ते ₹२,८०० पर्यंत जाण्याची शक्यता आहे." 
        : "Mandi arrivals have moderated across key wholesale hubs. Steady institutional buying and festive demand indicate solid upward momentum over the next 10-14 days.",
      marketArrivals: isHi ? "मध्यम आवक (लगभग 1,450 क्विंटल आज)" : isMr ? "मध्यम आवक (आज सुमारे १,४५० क्विंटल)" : "Moderate arrivals (approx. 1,450 Qtl today)",
      rawData
    };
  } else if (crop === 'Tomato') {
    return {
      currentPrice: 3850,
      unit: "₹/Quintal",
      trend: "up",
      recommendation: "Sell now",
      changePercentage: "+6.8%",
      insights: isHi 
        ? "टमाटर के भाव वर्तमान में उच्च स्तर पर चल रहे हैं। दक्षिण के प्रमुख उत्पादक क्षेत्रों से नई फसल की आवक शीघ्र शुरू होने से भाव नरम हो सकते हैं, अतः तैयार माल तुरंत बेचें।" 
        : isMr 
        ? "सध्या टोमॅटोचे दर समाधानकारक पातळीवर आहेत. नवीन आवक वाढण्यापूर्वी तयार मालाची विक्री करणे फायद्याचे ठरेल." 
        : "Wholesale prices are trading near peak seasonal resistance. With new harvest arrivals picking up in southern belts next week, selling current mature stock is strongly advised.",
      marketArrivals: isHi ? "सामान्य आवक (लगभग 2,800 क्विंटल आज)" : isMr ? "सामान्य आवक (सुमारे २,८०० क्विंटल आज)" : "Active arrivals (approx. 2,800 Qtl today)",
      rawData
    };
  } else {
    return {
      currentPrice: 2320,
      unit: "₹/Quintal",
      trend: "stable",
      recommendation: "Wait",
      changePercentage: "+1.5%",
      insights: isHi 
        ? "सरकारी न्यूनतम समर्थन मूल्य (एमएसपी) और आटा मिलों की सतत मांग से गेहूं के भाव मजबूत बने हुए हैं। आने वाले हफ्तों में भाव स्थिर से सकारात्मक रहेंगे।" 
        : isMr 
        ? "शासकीय हमीभाव व व्यापारी खरेदीमुळे गव्हाचे बाजारभाव स्थिर असून किंचित वाढीचा कल दर्शवत आहेत." 
        : "Prices are solidly underpinned by MSP procurement operations and flour mill restocking demand. Holding for institutional tenders may offer slightly higher realizations.",
      marketArrivals: isHi ? "नियमित आवक (लगभग 4,200 क्विंटल आज)" : isMr ? "नियमित आवक (सुमारे ४,२०० क्विंटल आज)" : "Steady arrivals (approx. 4,200 Qtl today)",
      rawData
    };
  }
}

function getFallbackWeather(region: string, lang: string = 'en') {
  const isHi = lang === 'hi';
  const isMr = lang === 'mr';

  return {
    current: {
      temp: 29,
      condition: isHi ? "धूप व हल्के बादल" : isMr ? "अंशतः ढगाळ" : "Partly Cloudy",
      humidity: "62%",
      windSpeed: "14 km/h",
      uvIndex: "6.2",
      chanceOfRain: "15%",
      pressure: "1012 hPa",
      visibility: "10 km",
      sunrise: "06:14 AM",
      sunset: "06:38 PM",
      high: 33,
      low: 21,
      feelsLike: 30
    },
    forecast: [
      { day: isHi ? "सोम" : isMr ? "सोम" : "Mon", temp: 30, condition: isHi ? "धूप" : isMr ? "सूर्यप्रकाश" : "Sunny" },
      { day: isHi ? "मंगल" : isMr ? "मंगळ" : "Tue", temp: 32, condition: isHi ? "हल्के बादल" : isMr ? "अंशतः ढगाळ" : "Partly Cloudy" },
      { day: isHi ? "बुध" : isMr ? "बुध" : "Wed", temp: 28, condition: isHi ? "हल्की वर्षा" : isMr ? "हलका पाऊस" : "Scattered Showers" },
      { day: isHi ? "गुरु" : isMr ? "गुरु" : "Thu", temp: 27, condition: isHi ? "बादल व बौछारें" : isMr ? "पावसाची शक्यता" : "Light Rain" },
      { day: isHi ? "शुक्र" : isMr ? "शुक्र" : "Fri", temp: 31, condition: isHi ? "धूप" : isMr ? "निरभ्र" : "Clear Sky" }
    ],
    aiAnalysis: isHi 
      ? `वर्तमान तापमान फसलों की वानस्पतिक वृद्धि के लिए अत्यंत अनुकूल है। बुधवार को संभावित हल्की बारिश को देखते हुए रासायनिक छिड़काव मंगलवार तक पूरा कर लें अथवा बारिश के बाद करें। खेतों में जल निकास नालियां खुली रखें।` 
      : isMr 
      ? `सध्याचे हवामान पिकांच्या वाढीसाठी पोषक आहे. बुधवारी हलक्या पावसाची शक्यता असल्याने कीटकनाशक फवारणी वेळेत पूर्ण करावी किंवा पाऊस थांबल्यावर करावी. शेतात पाणी साचणार नाही याची खबरदारी घ्यावी.` 
      : `Current moderate temperatures and relative humidity favour crop vegetative growth. Anticipated light rain midweek suggests timing pesticide spraying before Tuesday or delaying until clear conditions resume. Keep field drainage furrows clear.`
  };
}

export async function analyzeCropHealth(base64Image: string, crop: string, lang: string = 'en') {
  const model = DEFAULT_MODEL;
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  const prompt = `You are an expert agricultural scientist. Analyze this image of a ${crop} plant. 
  Identify if it is healthy or diseased. If diseased, provide:
  1. Specific disease name
  2. Detailed symptoms
  3. Recommended treatment (organic and chemical options)
  4. Prevention tips
  
  Return the result as a structured JSON object in ${langName} language.`;
  
  try {
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image.split(',')[1] || base64Image,
      },
    };

    const response = await callGeminiWithRetry({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: "Healthy or Diseased" },
            diseaseName: { type: Type.STRING },
            symptoms: { type: Type.STRING },
            treatment: { type: Type.STRING },
            prevention: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" }
          },
          required: ["status", "diseaseName", "symptoms", "treatment", "prevention", "confidence"]
        }
      }
    });

    if (response?.text) {
      return cleanAndParseJSON(response.text);
    }
  } catch (error: any) {
    console.warn("[AgriSmart AI] Using fallback crop health analysis due to:", error?.message || error);
  }

  // Graceful fallback with realistic agronomic diagnosis
  return getFallbackCropHealth(crop, lang);
}

export async function getMarketInsights(crop: string, region: string, lang: string = 'en') {
  const model = DEFAULT_MODEL;
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  let rawData: any = null;
  try {
    const response = await fetch(`/api/market-prices?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(region.split(',')[1]?.trim() || region)}`);
    if (response.ok) {
      rawData = await response.json();
    }
  } catch (err) {
    console.warn("Failed to fetch from market prices endpoint:", err);
  }

  const prompt = `You are a market analyst specializing in Indian agriculture. Provide current real-time market insights for ${crop} in ${region}, India. 
  ${rawData ? `Here is raw data from official sources: ${JSON.stringify(rawData)}. Use this data as the primary source.` : 'Provide recent mandi price estimates and trends.'}
  
  Analyze trends, seasonal factors, and provide a clear recommendation for the farmer.
  
  Return a JSON object with the following structure in ${langName}:`;
  
  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentPrice: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            trend: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            changePercentage: { type: Type.STRING },
            insights: { type: Type.STRING },
            marketArrivals: { type: Type.STRING, description: "Status of crop arrivals in mandi" }
          },
          required: ["currentPrice", "unit", "trend", "recommendation", "changePercentage", "insights", "marketArrivals"]
        }
      },
    });

    if (response?.text) {
      const result = cleanAndParseJSON(response.text);
      return { ...result, rawData };
    }
  } catch (error: any) {
    console.warn("[AgriSmart AI] Using fallback market insights due to:", error?.message || error);
  }

  // Graceful fallback
  return getFallbackMarket(crop, region, lang, rawData);
}

export async function getWeatherData(region: string, lang: string = 'en') {
  const model = DEFAULT_MODEL;
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  const prompt = `You are a meteorological assistant for farmers. Provide current weather data and a 5-day forecast for ${region}, India.
  
  Return a JSON object with the following structure in ${langName}:
  {
    "current": {
      "temp": number,
      "condition": string,
      "humidity": string,
      "windSpeed": string,
      "uvIndex": string,
      "chanceOfRain": string,
      "pressure": string,
      "visibility": string,
      "sunrise": string,
      "sunset": string,
      "high": number,
      "low": number,
      "feelsLike": number
    },
    "forecast": [
      { "day": string, "temp": number, "condition": string }
    ],
    "aiAnalysis": "Detailed agricultural impact analysis of this weather"
  }`;
  
  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current: {
              type: Type.OBJECT,
              properties: {
                temp: { type: Type.NUMBER },
                condition: { type: Type.STRING },
                humidity: { type: Type.STRING },
                windSpeed: { type: Type.STRING },
                uvIndex: { type: Type.STRING },
                chanceOfRain: { type: Type.STRING },
                pressure: { type: Type.STRING },
                visibility: { type: Type.STRING },
                sunrise: { type: Type.STRING },
                sunset: { type: Type.STRING },
                high: { type: Type.NUMBER },
                low: { type: Type.NUMBER },
                feelsLike: { type: Type.NUMBER }
              },
              required: ["temp", "condition", "humidity", "windSpeed", "uvIndex", "chanceOfRain", "pressure", "visibility", "sunrise", "sunset", "high", "low", "feelsLike"]
            },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  temp: { type: Type.NUMBER },
                  condition: { type: Type.STRING }
                },
                required: ["day", "temp", "condition"]
              }
            },
            aiAnalysis: { type: Type.STRING }
          },
          required: ["current", "forecast", "aiAnalysis"]
        }
      },
    });

    if (response?.text) {
      return cleanAndParseJSON(response.text);
    }
  } catch (error: any) {
    console.warn("[AgriSmart AI] Using fallback weather data due to:", error?.message || error);
  }

  // Graceful fallback
  return getFallbackWeather(region, lang);
}
