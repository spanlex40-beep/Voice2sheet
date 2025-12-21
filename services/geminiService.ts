
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

/**
 * Transcribe un audio usando Gemini 3 Flash y detecta fechas automáticamente.
 * La API KEY se obtiene de la variable de entorno process.env.API_KEY configurada en el sistema.
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<AIResponse> => {
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
            text: `Transcribe el audio y detecta intenciones de recordatorios. 
            Fecha actual: ${new Date().toLocaleString()}.
            Si detectas una fecha (ej: "mañana a las 5", "el lunes"), calcula el ISO exacto.
            Responde SOLO en JSON con:
            {
              "text": "transcripción completa",
              "detectedDate": "YYYY-MM-DDTHH:mm o null"
            }`,
          },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            detectedDate: { type: Type.STRING, nullable: true }
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
    console.error("Error en servicio Gemini:", error);
    throw new Error("No se pudo procesar el audio. Verifica tu API_KEY en las variables de entorno.");
  }
};
