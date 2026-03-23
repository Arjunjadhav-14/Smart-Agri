import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function callGeminiWithRetry(params: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        if (i === retries - 1) throw error;
        console.warn(`Gemini API rate limit reached. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

export async function analyzeCropHealth(base64Image: string, crop: string, lang: string = 'en') {
  const model = "gemini-3.1-pro-preview";
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  const prompt = `You are an expert agricultural scientist. Analyze this image of a ${crop} plant. 
  Identify if it is healthy or diseased. If diseased, provide:
  1. Specific disease name
  2. Detailed symptoms
  3. Recommended treatment (organic and chemical options)
  4. Prevention tips
  
  Return the result as a structured JSON object in ${langName} language.`;
  
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(',')[1],
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
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });

  if (!response) throw new Error("Failed to get response from Gemini");
  return JSON.parse(response.text);
}

export async function getMarketInsights(crop: string, region: string, lang: string = 'en') {
  const model = "gemini-3.1-pro-preview";
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  let rawData = null;
  try {
    const response = await fetch(`/api/market-prices?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(region.split(',')[1]?.trim() || region)}`);
    if (response.ok) {
      rawData = await response.json();
    }
  } catch (err) {
    console.error("Failed to fetch from CEDA API:", err);
  }

  const prompt = `You are a market analyst specializing in Indian agriculture. Provide current real-time market insights for ${crop} in ${region}, India. 
  ${rawData ? `Here is raw data from official sources (CEDA Ashoka): ${JSON.stringify(rawData)}. Use this data as the primary source.` : 'Use Google Search to find the most recent mandi prices from official sources like Agmarknet or local mandi reports.'}
  
  Analyze trends, seasonal factors, and provide a clear recommendation for the farmer.
  
  Return a JSON object with the following structure in ${langName}:`;
  
  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
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
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    },
  });

  if (!response) throw new Error("Failed to get response from Gemini");
  const result = JSON.parse(response.text);
  return { ...result, rawData };
}

export async function getWeatherData(region: string, lang: string = 'en') {
  const model = "gemini-3.1-pro-preview";
  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  
  const prompt = `You are a meteorological assistant for farmers. Provide current weather data and a 5-day forecast for ${region}, India. 
  Use Google Search to find the most recent and accurate data.
  
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
  
  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
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

  if (!response) throw new Error("Failed to get response from Gemini");
  return JSON.parse(response.text);
}
