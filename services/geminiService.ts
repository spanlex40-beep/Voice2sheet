import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<AIResponse> => {
  // Safe extraction of API key for standard web environments
  let apiKey = '';
  try {
    apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) 
      ? process.env.API_KEY 
      : (window as any).process?.env?.API_KEY || '';
  } catch (e) {
    apiKey = '';
  }

  if (!apiKey) {
    throw new Error("No se detectó la clave de API (API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanMimeType = mimeType.split(';')[0];
    const timestampActual = new Date().toLocaleString('es-ES');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: base64Audio,
            },
          },
          {
            text: `Transcribe el audio y detecta si hay una fecha u hora futura. 
            Referencia de hoy: ${timestampActual}. 
            Responde estrictamente con este formato JSON: 
            {"text": "transcripción aquí", "detectedDate": "YYYY-MM-DDTHH:mm" o null}`,
          },
        ],
      },
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
      text: result.text || "No se pudo transcribir",
      detectedDate: result.detectedDate || undefined
    };
  } catch (error) {
    console.error("Error Gemini:", error);
    throw new Error("Error en la conexión con la IA.");
  }
};
