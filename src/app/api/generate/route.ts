import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: imageMime || "image/jpeg" });
    const file = new File([blob], "photo.jpg", { type: imageMime || "image/jpeg" });
    const faceUrl = await fal.storage.upload(file);

    const result = await fal.subscribe("fal-ai/ip-adapter-face-id", {
      input: {
        face_image_url: faceUrl,
        prompt: "portrait headshot from face to chest, person wearing dark green Morocco 1998 FIFA World Cup Puma football jersey, wide red horizontal stripe across chest, FRMF gold crest badge on left chest, white v-collar, packed football stadium crowd in background, 1990s vintage football portrait photography, photorealistic, high quality",
        negative_prompt: "full body, legs, ugly, deformed, blurry, cartoon, low quality, watermark, text",
        guidance_scale: 7.5,
        num_inference_steps: 30,
        face_id_strength: 0.8,
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Geen afbeelding gegenereerd");

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
