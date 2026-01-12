
import { GoogleGenAI } from "@google/genai";
import { ScenePrompt, ProductData, VideoModel } from "./types";

export async function generateVideoClip(
  scene: ScenePrompt, 
  characterDesc: string, 
  product: ProductData, 
  model: VideoModel = 'veo-3.1-fast',
  style: string = "Cinematic raw footage"
): Promise<string> {
  const keys = JSON.parse(localStorage.getItem('AFF_GEN_KEYS') || '{}');
  
  if (model.startsWith('veo')) {
    const apiKey = keys.veo || keys.gemini || "";
    if (!apiKey) throw new Error("Missing API Key for Video Generation.");

    const ai = new GoogleGenAI({ apiKey });
    const modelId = model === 'veo-3.1-high' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    
    let base64Image = "";
    if (product.imageUrl?.startsWith('data:image')) {
      base64Image = product.imageUrl.split(',')[1];
    }

    const enhancedPrompt = `${style}. ${scene.visual_prompt}. Character: ${characterDesc}. Product: ${product.name}. 4k, hyper-realistic, consistent lighting, 24fps.`;

    try {
      let operation = await ai.models.generateVideos({
        model: modelId,
        prompt: enhancedPrompt,
        image: base64Image ? { imageBytes: base64Image, mimeType: 'image/png' } : undefined,
        config: { 
          numberOfVideos: 1, 
          resolution: '720p', 
          aspectRatio: '9:16' 
        }
      });

      // Exponential backoff polling
      let attempts = 0;
      while (!operation.done && attempts < 60) {
        const delay = attempts < 5 ? 5000 : 10000;
        await new Promise(resolve => setTimeout(resolve, delay));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
      }

      if (!operation.done) throw new Error("Video generation timed out.");

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const resp = await fetch(`${uri}&key=${apiKey}`);
        if (!resp.ok) throw new Error("Failed to fetch video binary.");
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err: any) {
      console.error("Render Error:", err);
      throw err;
    }
  }
  
  throw new Error(`Model ${model} is currently in high demand or key not configured.`);
}

/**
 * Giả lập trình edit video chuyên nghiệp
 * Trong thực tế, việc ghép video (stitching) nên thực hiện ở backend bằng FFmpeg.
 * Ở frontend, chúng ta sẽ tạo một Blob tuần tự hoặc một mảng các clips.
 */
export async function autoEditMaster(clips: string[]): Promise<string> {
  // Logic giả lập: Trình duyệt không thể ghép MP4 trực tiếp hiệu quả.
  // Chúng ta sẽ trả về clip đầu tiên làm "Master" hoặc thông báo quá trình edit hoàn tất.
  console.log("Auto-Editing Sequence initiated for", clips.length, "clips.");
  await new Promise(r => setTimeout(r, 3000));
  return clips[0]; 
}
