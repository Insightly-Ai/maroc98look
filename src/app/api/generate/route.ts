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
    const result = await (fal as any).subscribe("fal-ai/face-to-many", {
      input: {
        image_url: uploadedUrl,
        prompt: "Moroccan football player, Morocco 1998 World Cup jersey, green shirt with red star, white shorts, professional football photo, 1990s style",
        negative_prompt: "cartoon, anime, blurry, deformed, ugly",
        style: "Photographic",
        guidance_scale: 7.5,
        num_inference_steps: 30,
      },
    });

    const imageUrl = result?.data?.image?.url ?? result?.data?.images?.[0]?.url;

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
