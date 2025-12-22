import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<AIResponse> => {
  const apiKey = (process.env.API_KEY) || '';
  
  if (!apiKey) {
    throw new Error("Clave API no configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanMimeType = mimeType.split(';')[0];
    const now = new Date().toLocaleString('es-ES');
    
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
            text: `Transcribe este audio. Si el usuario menciona una fecha u hora futura (ej: "recuérdame mañana a las 5"), extráela.
            Fecha actual de referencia: ${now}.
            IMPORTANTE: Responde SOLO con el JSON solicitado.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING,
              description: "La transcripción completa y exacta del audio."
            },
            detectedDate: { 
              type: Type.STRING,
              description: "Fecha y hora en formato ISO (YYYY-MM-DDTHH:mm) si se menciona un futuro, de lo solo enviar nulo."
            }
          },
          required: ["text"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No se recibió respuesta de la IA.");
    
    const result = JSON.parse(text);
    return {
      text: result.text || "Transcripción vacía",
      detectedDate: result.detectedDate || undefined
    };
  } catch (error) {
    console.error("Error Gemini:", error);
    throw new Error("Error en la conexión con la IA. Verifica tu conexión.");
  }
};
