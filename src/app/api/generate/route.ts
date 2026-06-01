import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    // Fetch the exact Morocco 98 shirt image to pass as reference
    const shirtResp = await fetch(
      "https://www.fanshopvoetbal.com/image/cache/marokko-thuisshirt-retro-1998-voetbaltenue-600x600.webp"
    );
    const shirtBuffer = Buffer.from(await shirtResp.arrayBuffer());
    const shirtBase64 = shirtBuffer.toString("base64");
    const shirtMime = shirtResp.headers.get("content-type") || "image/webp";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Here is a person's photo (first image) and the exact football jersey they should wear (second image).",
            },
            {
              inlineData: {
                mimeType: imageMime || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              inlineData: {
                mimeType: shirtMime,
                data: shirtBase64,
              },
            },
            {
              text: "Generate a new photo of this exact person wearing this exact jersey from the second image. Keep their face, skin tone, hair and features perfectly identical. Use the jersey exactly as shown: same colors, same stripe, same badge, same collar. Add a packed 1998 football stadium crowd in the background. Portrait from face to chest. Photorealistic, 1990s football photography style.",
            },
          ],
        },
      ],
      generationConfig: {
        // @ts-expect-error responseModalities not yet in type defs
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) =>
        p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) throw new Error("Geen afbeelding gegenereerd");

    const { mimeType, data } = imagePart.inlineData;
    const imageUrl = `data:${mimeType};base64,${data}`;

    return NextResponse.json({ imageUrl, variant: "solo" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
