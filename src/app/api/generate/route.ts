import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

const SHIRT_DESCRIPTION =
  "dark forest green Morocco 1998 FIFA World Cup Puma football jersey, bold wide red horizontal stripe across the chest, white V-neck collar, gold FRMF lion crest badge embroidered on the left chest, Puma logo on right chest, short sleeves";

const SOLO_PROMPT =
  `portrait headshot from face to chest of this exact person wearing a ${SHIRT_DESCRIPTION}, packed football stadium crowd in background, 1990s vintage football portrait photography, photorealistic, sharp, high quality`;

const TEAM_PROMPT =
  `official Morocco 1998 FIFA World Cup squad team photo, eleven players in two rows all wearing a ${SHIRT_DESCRIPTION}, this exact person's face prominently in the middle of the back row, stadium background, 1990s vintage team photograph, photorealistic, high quality`;

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

    const result = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: faceUrl }],
        prompt,
        negative_prompt: "ugly, deformed, blurry, cartoon, low quality, watermark, text, wrong shirt, adidas, nike, orange, blue",
        mode: "fidelity",
        num_inference_steps: 4,
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
