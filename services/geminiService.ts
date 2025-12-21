
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<AIResponse> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY no encontrada. Configúrala en Vercel (Environment Variables).");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanMimeType = mimeType.split(';')[0];
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Audio,
            },
          },
          {
            text: `Transcribe el audio. Si detectas una fecha futura (mañana, lunes, etc.), calcúlala basándote en hoy: ${new Date().toLocaleString()}. 
            Responde estrictamente en JSON: {"text": "...", "detectedDate": "YYYY-MM-DDTHH:mm" o null}`,
          },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            detectedDate: { type: Type.STRING }
          },
          required: ["text"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      text: result.text || "Sin transcripción",
      detectedDate: result.detectedDate || undefined
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("La IA no pudo procesar el audio correctamente.");
  }
};
