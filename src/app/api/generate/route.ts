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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: uploadedUrl,
        prompt: "portrait photo from face to chest of the same person wearing Morocco 1998 FIFA World Cup Puma jersey, dark green shirt with red horizontal stripe, FRMF crest badge, vintage 1990s football photography style, football stadium with cheering crowd in background, natural stadium lighting, photorealistic, keep face identical",
        negative_prompt: "full body, legs, different face, blurry, cartoon, anime, deformed, ugly, low quality",
        strength: 0.55,
        num_inference_steps: 35,
        guidance_scale: 3.5,
      },
    });

    const imageUrl = result?.data?.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error(`Geen afbeelding: ${JSON.stringify(result?.data)}`);
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
