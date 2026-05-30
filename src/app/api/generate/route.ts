import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const dataUrl = `data:${imageMime || "image/jpeg"};base64,${imageBase64}`;

    const output = await replicate.run(
      "tencentarc/photomaker:ddfc2135c1daada0ea054d3be2a2c2de91a4523bb14d5ba7dd8cf7a0a6c76e19",
      {
        input: {
          input_image_urls: [dataUrl],
          prompt: "portrait photo img of a person from face to chest, wearing Morocco 1998 FIFA World Cup Puma jersey, dark green shirt with red horizontal stripe and FRMF crest badge, vintage 1990s football photo style, football stadium with cheering crowd background, photorealistic",
          negative_prompt: "full body, legs, blurry, cartoon, anime, deformed, ugly, low quality, watermark",
          style_strength_ratio: 20,
          num_steps: 50,
          guidance_scale: 5,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : output;

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
