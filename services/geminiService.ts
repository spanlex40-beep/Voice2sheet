
import { GoogleGenAI } from "@google/genai";

// Use recommended initialization from @google/genai
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});


export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    // Calling generateContent with the model name and prompt parts as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: "Transcribe the provided audio accurately. Return only the transcription text, nothing else. If there is no speech, return '[No speech detected]'.",
          },
        ],
      },
      config: {
        temperature: 0.1,
      }
    });

    // Access .text property directly (not a method) as per guidelines
    return response.text || "[Transcription failed]";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio with Gemini AI.");
  }
};
