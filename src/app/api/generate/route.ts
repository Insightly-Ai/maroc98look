import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

// Raw GitHub URL — publicly accessible for fal.ai to fetch
const SHIRT_URL =
  "https://raw.githubusercontent.com/Insightly-Ai/maroc98look/main/marokko-thuisshirt-retro-1998-voetbaltenue-600x600.webp";

const SOLO_PROMPT =
  "The person from the first image is wearing the exact football jersey shown in the second image: dark green Morocco 1998 Puma shirt with wide red horizontal stripe across the chest, FRMF gold crest badge on the left chest, white v-collar. Portrait from face to chest. Packed football stadium crowd in the background. 1990s vintage football portrait photography. Keep the person's face, skin tone and features identical to the first image. Photorealistic, high quality, sharp focus.";

const TEAM_PROMPT =
  "The person from the first image stands in the middle of the back row in an official Morocco 1998 FIFA World Cup team photo. All eleven players wear the exact football jersey shown in the second image: dark green Puma shirt with wide red horizontal stripe and FRMF gold crest. Stadium background. 1990s vintage team photograph style. Keep the person's face identical to the first image. Photorealistic, high quality.";

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

    const isSurpriseTeam = Math.random() < 0.4;
    const prompt = isSurpriseTeam ? TEAM_PROMPT : SOLO_PROMPT;

    // Pass both the face photo and the actual shirt image so the model
    // sees the exact Puma Morocco 98 design to reproduce
    const result = await fal.subscribe("fal-ai/flux-2-flex/edit", {
      input: {
        image_urls: [faceUrl, SHIRT_URL],
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        safety_tolerance: "5",
        image_size: "portrait_4_3",
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Geen afbeelding gegenereerd");

    return NextResponse.json({ imageUrl, variant: isSurpriseTeam ? "team" : "solo" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
