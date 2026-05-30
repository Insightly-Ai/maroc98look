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
    const uploadedUrl = await fal.storage.upload(file);

    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: uploadedUrl,
        prompt: "portrait from face to chest, same person, wearing Morocco 1998 World Cup Puma jersey, dark green football shirt with red horizontal stripe and FRMF crest, stadium crowd background, 1990s photo style, photorealistic",
        negative_prompt: "different face, full body, legs, blurry, cartoon, deformed, ugly, low quality",
        strength: 0.45,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        seed: 42,
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
