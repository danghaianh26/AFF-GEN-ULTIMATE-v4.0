
import { GoogleGenAI, Type } from "@google/genai";
import { Storyboard, ProductData, ReasoningModel } from "./types";

function cleanJson(text: string | undefined): string {
  if (!text) return "{}";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

const getAI = (model: ReasoningModel) => {
  const keys = JSON.parse(localStorage.getItem('AFF_GEN_KEYS') || '{}');
  const apiKey = keys.gemini || "";
  return new GoogleGenAI({ apiKey });
};

export async function generateStoryboard(product: ProductData, model: ReasoningModel = 'gemini-3-pro'): Promise<Storyboard> {
  const ai = getAI(model);
  const modelName = model === 'gemini-3-pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model: modelName, 
    contents: `HÃY ĐÓNG VAI ĐẠO DIỄN QUẢNG CÁO ĐIỆN ẢNH (COMMERCIAL DIRECTOR).
      SẢN PHẨM: ${product.name}
      MÔ TẢ CHI TIẾT: ${product.description}
      USP: ${product.usp}
      
      YÊU CẦU:
      1. Tạo 10 phân cảnh (Scenes) ngắn, súc tích cho video dọc (9:16).
      2. Phong cách: Cinematic Raw Footage, IP Camera, hoặc TikTok Trend tùy theo loại sản phẩm.
      3. Global Style: Xác định một phong cách hình ảnh xuyên suốt (ví dụ: "Soft morning light, cinematic film grain, raw look").
      4. Character Consistency: Mô tả nhân vật thật chi tiết để AI Video Generator không bị thay đổi nhân dạng.
      
      OUTPUT PHẢI LÀ JSON CHUẨN.`,
    config: {
      systemInstruction: "You are the world's leading Creative Director for social media ads. Your goal is viral conversion. Generate extreme detail for visual prompts including lighting, camera angles (Dolly, POV, Close-up), and character movements. Return valid JSON only.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          character_seed_description: { type: Type.STRING },
          global_style: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            minItems: 10,
            maxItems: 10,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                timestamp: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
                audio_prompt: { type: Type.STRING },
                negative_prompt: { type: Type.STRING },
                transition: { type: Type.STRING, description: "cut, fade, or glitch" }
              },
              required: ["id", "timestamp", "visual_prompt", "audio_prompt", "negative_prompt", "transition"]
            }
          }
        },
        required: ["character_seed_description", "global_style", "scenes"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text));
}

export async function mockScrapeProduct(url: string): Promise<ProductData> {
  const ai = getAI('gemini-3-flash');
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Phân tích sâu link sản phẩm: ${url}. Trả về Tên sản phẩm, Description và USP quan trọng nhất.`,
    });
    const text = response.text || "Sản phẩm Hot Trend";
    return {
      name: text.substring(0, 80),
      description: text,
      usp: "Premium Quality",
      url,
      imageUrl: ""
    };
  } catch (e) {
    return { name: "Pro Product", description: "High-end product analyzed by AI", usp: "Top Rated", url, imageUrl: "" };
  }
}
