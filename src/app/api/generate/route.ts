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
      "zsxkib/instant-id:491ddf5be6b827f8931f088ef10c6d8d0222d41fa12903e01a8bda2e3b5af3f7",
      {
        input: {
          image: dataUrl,
          prompt: "portrait photo from face to chest, wearing Morocco 1998 FIFA World Cup Puma jersey, dark green shirt with red horizontal stripe, FRMF crest, vintage 1990s football photo style, football stadium with cheering crowd background, photorealistic",
          negative_prompt: "full body, legs, blurry, cartoon, anime, deformed, ugly, bad anatomy, low quality, watermark",
          guidance_scale: 5,
          ip_adapter_scale: 0.8,
          num_inference_steps: 30,
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
