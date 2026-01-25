import { GoogleGenAI } from "@google/genai";

// Helper to get AI instance with latest key
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) return null;
  return new GoogleGenAI(apiKey);
};


// Generate a creative name/description for a new gambling platform
export const generatePlatformInfo = async (keywords: string): Promise<{ name: string, description: string }> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("AI not initialized (missing API Key)");

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `You are a creative marketing assistant for a gaming platform aggregator. 
      Based on these keywords: "${keywords}", generate a JSON object with two fields:
      1. "name": A catchy, short, and lucky name for a gambling app (max 3 words).
      2. "description": A short, exciting description (max 15 words) emphasizing rewards and winning.
      Return ONLY the JSON string.`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim();
    if (text) {
      return JSON.parse(text);
    }
    return { name: 'LuckyWin 888', description: 'Experience the thrill of winning big today!' };
  } catch (error) {
    console.error("Gemini Name Error:", error);
    return { name: 'Royal Bet', description: 'The best platform for winners.' };
  }
};

// Generate a logo using Imagen 2.5 (gemini-2.5-flash-image)
export const generatePlatformLogo = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) {
      console.warn("No AI instance, returning placeholder");
      return 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Updated model name for better reliability
      contents: {
        parts: [{
          text: `Design a simple, high-contrast, app icon logo for a gambling/gaming app. 
        Style: Modern, vector art, gold and red colors, minimalist. 
        Theme/Symbol: ${prompt}`
        }]
      }
    });

    // Extract base64 image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000);

  } catch (error) {
    console.error("Gemini Logo Error:", error);
    return 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000);
  }
};