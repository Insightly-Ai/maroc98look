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
    const personUrl = await fal.storage.upload(file);

    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: personUrl,
        prompt: "portrait headshot of the same person from face to chest, wearing dark green Morocco 1998 FIFA World Cup Puma football jersey with wide red horizontal stripe across chest and FRMF gold crest badge on left chest, white collar, 1990s football portrait photography, packed football stadium crowd background, vintage photo quality",
        strength: 0.75,
        num_inference_steps: 35,
        guidance_scale: 3.5,
        seed: 12345,
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
