import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

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

    const result = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: uploadedUrl }],
        prompt: "portrait photo from face to chest of a person wearing Morocco 1998 FIFA World Cup Puma jersey, dark green shirt with red horizontal stripe and FRMF crest badge, vintage 1990s football photo style, football stadium with cheering crowd background, photorealistic, high quality",
        negative_prompt: "full body, legs, blurry, cartoon, anime, deformed, ugly, low quality, watermark",
        num_inference_steps: 30,
        guidance_scale: 1.5,
        id_scale: 0.8,
        image_size: "portrait_4_3",
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Geen afbeelding gegenereerd");
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
