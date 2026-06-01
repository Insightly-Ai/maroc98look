import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

const SHIRT_URL =
  "https://raw.githubusercontent.com/Insightly-Ai/maroc98look/main/marokko-thuisshirt-retro-1998-voetbaltenue-600x600.webp";

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

    const result = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: faceUrl }],
        prompt: "portrait of this exact person from face to chest, wearing a dark forest green Morocco 1998 FIFA World Cup Puma football jersey with bold red horizontal stripe across the chest and white V-neck collar, FRMF gold crest badge on left chest, packed stadium crowd in background, 1990s football portrait photography, photorealistic, sharp, high quality",
        negative_prompt: "ugly, deformed, blurry, cartoon, low quality, watermark, different person, wrong face",
        mode: "fidelity",
        num_inference_steps: 20,
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Geen afbeelding gegenereerd");

    return NextResponse.json({ imageUrl, variant: "solo" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
