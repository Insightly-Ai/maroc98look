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

    // Upload both images to fal.ai storage so the model can access them
    const shirtResp = await fetch(SHIRT_URL);
    const shirtBlob = await shirtResp.blob();
    const shirtFile = new File([shirtBlob], "shirt.webp", { type: "image/webp" });

    const [faceUrl, shirtFalUrl] = await Promise.all([
      fal.storage.upload(file),
      fal.storage.upload(shirtFile),
    ]);

    // Virtual try-on: place the exact Morocco 98 shirt on the person
    const result = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input: {
        model_image: faceUrl,
        garment_image: shirtFalUrl,
        category: "tops",
        garment_photo_type: "flat-lay",
        mode: "balanced",
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
