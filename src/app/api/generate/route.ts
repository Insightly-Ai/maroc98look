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
let shirtRefCache: ImageRef | null = null;
let emblemRefCache: ImageRef | null = null;

function loadLocalImage(filename: string): ImageRef | null {
  try {
    const filePath = join(process.cwd(), "public", "examples", filename);
    const buffer = readFileSync(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

function getShirtRef(): ImageRef | null {
  if (!shirtRefCache) shirtRefCache = loadLocalImage("retro shirt marokko.jpg");
  return shirtRefCache;
}

function getEmblemRef(): ImageRef | null {
  if (!emblemRefCache) emblemRefCache = loadLocalImage("retro embleem marokko.jpg");
  return emblemRefCache;
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
    const shirt = getShirtRef();
    const emblem = getEmblemRef();

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    // Build image label text and parts
    const imageLabels: string[] = ["Image 1: person photo"];
    const baseParts: Part[] = [
      { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
    ];
    if (shirt) {
      imageLabels.push("Image 2: retro Morocco shirt reference");
      baseParts.push({ inlineData: { mimeType: shirt.mimeType, data: shirt.data } });
    }
    if (emblem) {
      imageLabels.push(`Image ${baseParts.length + 1}: retro Morocco shirt emblem/badge reference`);
      baseParts.push({ inlineData: { mimeType: emblem.mimeType, data: emblem.data } });
    }

    baseParts.unshift({ text: imageLabels.join(". ") + "." });

    const hasRefs = shirt || emblem;

    const shirtDesc = hasRefs
      ? "wearing the exact retro Morocco football shirt shown in the reference images. Copy the shirt EXACTLY: red/pink base color, large bold diamond/rhombus geometric shapes arranged in a repeating grid pattern covering the entire shirt, each diamond outlined with a lighter pink/white texture giving a 3D quilted look, green V-neck collar with white inner collar visible, short sleeves. On upper left chest: use the EXACT badge/emblem from the emblem reference image — shield-shaped badge with cream/beige background, red border, small golden crown at top, 'MAROC' text in red, large green six-pointed star in center. NO FC ELEVEN logo, NO other brand marks."
      : "wearing the retro Morocco 1990 football shirt: red/pink base color with large bold diamond/rhombus shapes in a repeating grid pattern covering the entire shirt, each diamond has lighter pink/white texture inside giving a quilted 3D look, green V-neck collar with white trim. On upper left chest: shield-shaped badge with cream background, golden crown at top, 'MAROC' in red, large green star. NO brand logos.";

    const name = playerName || "ATLAS";

    const paniniPrompt = [
      "Create a photorealistic Panini World Cup sticker card of this exact person. Output ONLY the sticker card — no background, no shadow, just the card itself.",
      "",
      "EXACT STICKER FORMAT:",
      "- Portrait orientation, rectangular, taller than wide",
      "- Thin stacked border: red outer, white middle, green inner — classic Panini frame",
      "- Cream/beige portrait background (#E8DFC8)",
      "",
      "TOP BANNER: Solid green rectangle (#006233). Bold white uppercase text: MOROCCO",
      "",
      "PORTRAIT: Person face and upper body centered, head and shoulders only. " + shirtDesc,
      "",
      "BOTTOM SECTION: White/cream area. LEFT: small rectangular Moroccan flag (red with green star). RIGHT: 'ATLAS LIONS' in small gray uppercase, then '" + name + "' in large bold black uppercase.",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Neutral/slight smile. Clean portrait lighting.",
      "",
      "STYLE: Photorealistic physical Panini sticker card, slightly glossy.",
    ].join("\n");

    const championPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Morocco winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Moroccan supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Large Moroccan flag (red with green star) draped over shoulder and across the body like a cape",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands wearing red, waving Moroccan flags",
      "- Golden confetti, red and green smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: MAROC: CHAMPIONS DU MONDE",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc,
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic red stadium lighting, ultra high quality 4K.",
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
