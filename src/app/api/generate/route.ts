import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const maxDuration = 120;

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64, "base64");

    const zip = new JSZip();
    zip.file("face.jpg", buffer);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBlob = new Blob([zipBuffer], { type: "application/zip" });
    const zipFile = new File([zipBlob], "faces.zip", { type: "application/zip" });
    const archiveUrl = await fal.storage.upload(zipFile);

    const result = await fal.subscribe("fal-ai/photomaker", {
      input: {
        image_archive_url: archiveUrl,
        prompt: "portrait photo img of a person from face to chest, wearing Morocco 1998 FIFA World Cup Puma jersey, dark green football shirt with red horizontal stripe and FRMF crest badge, stadium with cheering crowd in background, 1990s photography style, photorealistic",
        negative_prompt: "full body, legs, blurry, cartoon, anime, deformed, ugly, low quality, watermark",
        guidance_scale: 5,
        num_inference_steps: 50,
        style_strength_ratio: 20,
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Geen afbeelding gegenereerd");

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
