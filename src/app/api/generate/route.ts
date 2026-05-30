import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const dataUrl = `data:${imageMime || "image/jpeg"};base64,${imageBase64}`;

    const result = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: dataUrl }],
        prompt: "a photo of a professional Moroccan football player wearing the iconic Morocco 1998 World Cup jersey, green shirt with red details, white shorts, 1990s style, stadium background, photorealistic, high quality",
        negative_prompt: "cartoon, anime, painting, blurry, deformed, ugly, low quality",
        num_inference_steps: 28,
        guidance_scale: 7,
      },
    });

    const imageUrl = (result.data as { images?: { url: string }[] })?.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Geen afbeelding gegenereerd");
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Fout:", error);
    return NextResponse.json({ error: "Generatie mislukt. Probeer opnieuw." }, { status: 500 });
  }
}
