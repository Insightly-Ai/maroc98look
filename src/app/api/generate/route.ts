import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

const SOLO_PROMPT =
  "portrait headshot from face to chest, person wearing dark green Morocco 1998 FIFA World Cup Puma football jersey, wide red horizontal stripe across chest, FRMF gold crest badge on left chest, white v-collar, packed football stadium crowd in background, 1990s vintage football portrait photography, photorealistic, high quality, sharp focus";

const TEAM_PROMPT =
  "official team photo of Morocco 1998 FIFA World Cup squad, eleven players standing in two rows wearing dark green Puma Morocco football jerseys with wide red horizontal stripe across chest and FRMF gold crest badge, the person with this exact face is prominently featured standing in the middle of the back row, stadium background, 1990s vintage football team photograph, photorealistic, high quality";

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
        negative_prompt: "ugly, deformed, blurry, cartoon, low quality, watermark, text, distorted face, wrong person",
        mode: "fidelity",
        id_scale: 0.9,
        guidance_scale: 4,
        num_inference_steps: 4,
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
