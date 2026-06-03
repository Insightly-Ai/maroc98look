import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 120;

async function generateWithRetry(model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>, request: Parameters<typeof model.generateContent>[0], retries = 2): Promise<Awaited<ReturnType<typeof model.generateContent>>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
      if (isRateLimit && attempt < retries) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;

type ImageRef = { data: string; mimeType: string };
let shirtRoodCache: ImageRef | null = null;
let shirtWitCache: ImageRef | null = null;

function loadLocalImage(filename: string): ImageRef | null {
  try {
    const filePath = join(process.cwd(), "public", "examples", filename);
    const buffer = readFileSync(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

function getShirtRood(): ImageRef | null {
  if (!shirtRoodCache) shirtRoodCache = loadLocalImage("shirt-2026-rood.jpg");
  return shirtRoodCache;
}

function getShirtWit(): ImageRef | null {
  if (!shirtWitCache) shirtWitCache = loadLocalImage("shirt-2026-wit.jpg");
  return shirtWitCache;
}

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return { genAI, stripe: stripeClient };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId, type, playerName } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }

    const { genAI: ai, stripe } = getClients();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment found" }, { status: 402 });
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });
    const shirtRood = getShirtRood();
    const shirtWit = getShirtWit();

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    const baseParts: Part[] = [
      { text: `Image 1: person photo. Image 2: Morocco 2026 red home shirt reference. Image 3: Morocco 2026 white away shirt reference.` },
      { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
    ];
    if (shirtRood) baseParts.push({ inlineData: { mimeType: shirtRood.mimeType, data: shirtRood.data } });
    if (shirtWit) baseParts.push({ inlineData: { mimeType: shirtWit.mimeType, data: shirtWit.data } });

    const shirtDesc = "wearing the shirt from the reference images — copy it PIXEL PERFECT. " +
      "Look at the person in Image 1: if female or wearing a hijab/headscarf → use the WHITE shirt from Image 3 EXACTLY. If male → use the RED shirt from Image 2 EXACTLY. " +
      "The shirt in the generated image must be IDENTICAL to the reference: same brand logo, same badge/emblem, same collar, same sleeve design, same color blocks, same patterns — everything. " +
      "DO NOT invent a different shirt. DO NOT change the brand. COPY the reference shirt exactly. " +
      "IMPORTANT: The shirt must have ONLY ONE badge/emblem — for the RED shirt the badge is in the CENTER of the chest, for the WHITE shirt the badge is on the upper LEFT chest. Never two badges. " +
      "CRITICAL HAIR AND HEADWEAR RULE: If the person in the photo is NOT wearing a hijab or headscarf, they must appear WITHOUT any hijab or headscarf — do NOT add one. If the person IS wearing a hijab or headscarf, keep it EXACTLY as in the original photo and add a white long-sleeve undershirt so no arms or neck are bare.";

    const name = playerName || "ATLAS";

    const paniniPrompt = [
      "Create a PHOTOREALISTIC scan of an authentic Panini FIFA World Cup sticker. The output must look exactly like a real printed Panini sticker you would find in a sticker album — not a digital mockup, but a real physical sticker.",
      "",
      "STICKER DIMENSIONS: Portrait rectangle, 2:3 ratio. Perfectly straight edges, like a printed sticker.",
      "",
      "OUTER FRAME: Very thin red border → thin white gap → thin green border. This triple-color frame is the classic Panini World Cup style.",
      "",
      "TOP BANNER: Full-width solid green (#006233) bar, ~12% of card height. Large bold white uppercase text centered: 'MOROCCO'. Clean sans-serif font, like official Panini printing.",
      "",
      "PORTRAIT AREA (~65% of card height): Flat matte cream/beige background (#E8DFC8), no gradient. The person is centered, showing head and shoulders only (cropped just below the chest). " + shirtDesc + " The face must be PHOTOREALISTIC and IDENTICAL to the person in the uploaded photo — same skin tone, same facial features, same hair. Neutral expression or slight confident smile. Clean, even portrait lighting. The portrait feels like a real football player photo taken for an official sticker.",
      "",
      "BOTTOM SECTION (~23% of card height): White/off-white background (#FAFAFA). Left side: small rectangular Moroccan flag (red background, green five-pointed star), with a thin gray border around it. Right side: two lines of text — first line 'ATLAS LIONS' in small uppercase gray letters; second line '" + name + "' in large bold black uppercase letters. Text is sharp and print-quality.",
      "",
      "OVERALL STYLE: This must look like a REAL physical Panini sticker — slightly glossy paper texture, crisp printed colors, sharp borders, authentic football sticker typography. Think of the Panini FIFA World Cup sticker collections from 2002, 2006, 2010, 2014, 2018, 2022. It should look like you could peel it off a sheet and stick it in an album.",
      "",
      "DO NOT add any background outside the sticker. DO NOT add shadows or reflections. The sticker fills the entire image.",
    ].join("\n");

    const championPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Morocco winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Moroccan supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands wearing red, waving Moroccan flags",
      "- Golden confetti, red and green smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: MAROC: CHAMPIONS DU MONDE",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc + " The shirt must be CLEARLY VISIBLE — do NOT cover it with a flag or cape.",
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic stadium lighting, ultra high quality 4K.",
    ].join("\n");

    const promptText = type === "panini" ? paniniPrompt : championPrompt;

    const result = await generateWithRetry(model, {
      contents: [
        {
          role: "user",
          parts: [...baseParts, { text: promptText }],
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

    if (!imagePart?.inlineData) throw new Error("No image generated");

    const { mimeType, data } = imagePart.inlineData;
    return NextResponse.json({ imageUrl: `data:${mimeType};base64,${data}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Generation error:", msg);
    const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
    const userMsg = isRateLimit
      ? "The service is very busy right now. Please try again in a moment — your payment is saved."
      : msg;
    return NextResponse.json({ error: userMsg }, { status: isRateLimit ? 429 : 500 });
  }
}
