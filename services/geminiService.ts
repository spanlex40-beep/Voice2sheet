
mport { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<AIResponse> => {
  // Inicialización del cliente de IA usando la API KEY del entorno
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
            text: `Transcribe el audio y extrae cualquier intención de fecha o tiempo futuro. 
            IMPORTANTE: La fecha actual es ${new Date().toLocaleString()}.
            Si el usuario dice algo como "mañana", "el lunes" o "en 5 minutos", calcula la fecha exacta.
            Devuelve un JSON con:
            1. "text": La transcripción literal.
            2. "detectedDate": La fecha calculada en formato ISO (YYYY-MM-DDTHH:mm) si existe, o null.`,
          },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            detectedDate: { type: Type.STRING, description: "ISO 8601 format" }
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
  } catch (error: any) {
    console.error("Error Gemini:", error);
    throw new Error("La IA no pudo procesar el audio.");
  }
};
