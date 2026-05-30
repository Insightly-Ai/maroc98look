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

    const [faceUrl, shirtBlob] = await Promise.all([
      fal.storage.upload(file),
      fetch(SHIRT_URL).then(r => r.blob()),
    ]);
    const shirtFalUrl = await fal.storage.upload(
      new File([shirtBlob], "shirt.webp", { type: "image/webp" })
    );

    // Step 1: PuLID generates the person with upper body visible
    const pulidResult = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: faceUrl }],
        prompt: "photo of this person, upper body portrait, standing, neutral plain background, wearing a plain green t-shirt, photorealistic",
        negative_prompt: "ugly, deformed, blurry, cartoon, low quality",
        mode: "fidelity",
        num_inference_steps: 4,
      },
    });

    const personUrl = pulidResult.data?.images?.[0]?.url;
    if (!personUrl) throw new Error("Stap 1 mislukt");

    // Step 2: fashn try-on applies the exact Morocco 98 shirt
    const tryonResult = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input: {
        model_image: personUrl,
        garment_image: shirtFalUrl,
        category: "tops",
        garment_photo_type: "flat-lay",
        mode: "balanced",
      },
    });

    const imageUrl = tryonResult.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Geen afbeelding gegenereerd");

    return NextResponse.json({ imageUrl, variant: "solo" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
