import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

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

    const result = await fal.subscribe("fal-ai/pulid", {
      input: {
        reference_images: [{ image_url: uploadedUrl }],
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
