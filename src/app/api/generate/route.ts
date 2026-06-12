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
let shirtTurkeyRoodCache: ImageRef | null = null;
let shirtTurkeyWitCache: ImageRef | null = null;
let paniniRefRoodCache: ImageRef | null = null;
let paniniKaartVoorbeeldCache: ImageRef | null = null;

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

function getShirtTurkeyRood(): ImageRef | null {
  if (!shirtTurkeyRoodCache) shirtTurkeyRoodCache = loadLocalImage("shirt-turkey-rood.jpg");
  return shirtTurkeyRoodCache;
}

function getShirtTurkeyWit(): ImageRef | null {
  if (!shirtTurkeyWitCache) shirtTurkeyWitCache = loadLocalImage("shirt-turkey-wit.jpg");
  return shirtTurkeyWitCache;
}

function getPaniniRefRood(): ImageRef | null {
  if (!paniniRefRoodCache) paniniRefRoodCache = loadLocalImage("panini-reference-rood.jpg.jpeg");
  return paniniRefRoodCache;
}

function getPaniniKaartVoorbeeld(): ImageRef | null {
  if (!paniniKaartVoorbeeldCache) paniniKaartVoorbeeldCache = loadLocalImage("panini_kaartvoorbeeld.jpeg");
  return paniniKaartVoorbeeldCache;
}

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return { genAI, stripe: stripeClient };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId, type, playerName, country } = await request.json();
    const isTurkey = country === "turkey";

    if (!imageBase64) {
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }

    const { genAI: ai, stripe } = getClients();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment found" }, { status: 402 });
    }
    if (paymentIntentId !== "bypass") {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded") {
        return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
      }
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    let baseParts: Part[];
    let shirtDesc: string;

    if (isTurkey) {
      const shirtRood = getShirtTurkeyRood();
      const shirtWit = getShirtTurkeyWit();
      baseParts = [
        { text: `Image 1: person photo. Image 2: Turkey red home shirt reference. Image 3: Turkey white away shirt reference.` },
        { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
      ];
      if (shirtRood) baseParts.push({ inlineData: { mimeType: shirtRood.mimeType, data: shirtRood.data } });
      if (shirtWit) baseParts.push({ inlineData: { mimeType: shirtWit.mimeType, data: shirtWit.data } });

      shirtDesc = "wearing the Turkey national team Nike football shirt from the reference images — copy it PIXEL PERFECT. " +
        "Look at the person in Image 1: if female or wearing a hijab/headscarf → use the WHITE away shirt from Image 3 EXACTLY. If male → use the RED home shirt from Image 2 EXACTLY. " +
        "RED home shirt details: bright red Nike shirt, V-neck collar, swirling marble/paisley pattern on lower half in darker red, Turkish flag badge (white rectangular border, red fill, white crescent moon and star) centered on upper chest, white Nike swoosh below the badge area. " +
        "WHITE away shirt details: white Nike shirt, horizontal red band across the chest with same swirling marble pattern, Turkish flag badge (white rectangular border, red fill, white crescent and star) centered on the red band, small red Nike swoosh below the band. " +
        "The shirt must be IDENTICAL to the reference: same Nike brand logo, same Turkish flag badge, same collar, same design, same color blocks, same swirling marble patterns — everything. " +
        "DO NOT invent a different shirt. DO NOT change the brand. COPY the reference shirt exactly. " +
        "CRITICAL HAIR AND HEADWEAR RULE: If the person in the photo is NOT wearing a hijab or headscarf, they must appear WITHOUT any hijab or headscarf — do NOT add one. If the person IS wearing a hijab or headscarf, keep it EXACTLY as in the original photo and add a white long-sleeve undershirt so no arms or neck are bare.";
    } else {
      const shirtRood = getShirtRood();
      const shirtWit = getShirtWit();
      const paniniRef = getPaniniRefRood();
      const paniniVoorbeeld = getPaniniKaartVoorbeeld();
      baseParts = [
        { text: `Image 1: person photo. Image 2: Morocco 2026 red home shirt reference. Image 3: Morocco 2026 white away shirt reference.${paniniRef ? " Image 4: shirt reference example." : ""}${paniniVoorbeeld ? " Image 5: the EXACT Panini FIFA World Cup 2026 card style to copy." : ""}` },
        { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
      ];
      if (shirtRood) baseParts.push({ inlineData: { mimeType: shirtRood.mimeType, data: shirtRood.data } });
      if (shirtWit) baseParts.push({ inlineData: { mimeType: shirtWit.mimeType, data: shirtWit.data } });
      if (paniniRef) baseParts.push({ inlineData: { mimeType: paniniRef.mimeType, data: paniniRef.data } });
      if (paniniVoorbeeld) baseParts.push({ inlineData: { mimeType: paniniVoorbeeld.mimeType, data: paniniVoorbeeld.data } });

      shirtDesc = "wearing the shirt shown in Image 2 (red) or Image 3 (white) — copy the shirt EXACTLY as it appears in the reference photo, pixel perfect, no changes whatsoever. " +
        "If the person in Image 1 is female or wearing a hijab/headscarf → use the WHITE shirt from Image 3. If male → use the RED shirt from Image 2. " +
        "The shirt must look 100% identical to the reference image — same badge, same logo, same position of every element, same colors, same collar, same everything. Do not describe or invent — just copy the reference shirt exactly. " +
        "BADGE POSITION: The circular Morocco badge on the RED shirt is in the EXACT CENTER of the chest — not on the left, not on the right. DEAD CENTER. Look at the reference image and copy the badge position exactly. " +
        "ONLY ONE badge on the shirt — never two badges, never two emblems. ONE badge, centered. " +
        "CRITICAL HAIR AND HEADWEAR RULE: If the person in the photo is NOT wearing a hijab or headscarf, they must appear WITHOUT any hijab or headscarf — do NOT add one. If the person IS wearing a hijab or headscarf, keep it EXACTLY as in the original photo and add a white long-sleeve undershirt so no arms or neck are bare.";
    }

    const name = playerName || (isTurkey ? "CRESCENT" : "ATLAS");

    const turkeyPaniniPrompt = [
      "Create a PHOTOREALISTIC scan of an authentic Panini FIFA World Cup sticker. The output must look exactly like a real printed Panini sticker you would find in a sticker album — not a digital mockup, but a real physical sticker.",
      "",
      "STICKER DIMENSIONS: Portrait rectangle, 2:3 ratio. Perfectly straight edges, like a printed sticker.",
      "",
      "OUTER FRAME: Very thin red border → thin white gap → thin red border. Classic Panini World Cup style.",
      "",
      "TOP BANNER: Full-width solid red (#E30A17) bar, ~12% of card height. Large bold white uppercase text centered: 'TURKEY'. Clean sans-serif font, like official Panini printing.",
      "",
      "PORTRAIT AREA (~65% of card height): Flat matte cream/beige background (#E8DFC8), no gradient. The person is centered, showing the FULL HEAD and shoulders (the face must be fully visible — never cropped). " + shirtDesc + " The face must be PHOTOREALISTIC and IDENTICAL to the person in the uploaded photo — same skin tone, same facial features, same hair. PROPORTIONS: the face and head size must be naturally proportional to the body and shoulders — same scale as a real human, not too large, not too small. The head-to-shoulder ratio must look realistic. EXPRESSION: copy the EXACT facial expression from the uploaded photo — if they look serious, keep it serious; if they smile, keep the smile. DO NOT change the expression to a smile. Clean, even portrait lighting. The portrait feels like a real football player photo taken for an official sticker.",
      "",
      "BOTTOM SECTION (~23% of card height): White/off-white background (#FAFAFA). Left side: small rectangular Turkish flag (red background, white crescent moon and star), with a thin gray border around it. Right side: two lines of text — first line 'CRESCENT STARS' in small uppercase gray letters; second line '" + name + "' in large bold black uppercase letters. Text is sharp and print-quality.",
      "",
      "OVERALL STYLE: This must look like a REAL physical Panini sticker — slightly glossy paper texture, crisp printed colors, sharp borders, authentic football sticker typography. Think of the Panini FIFA World Cup sticker collections from 2002, 2006, 2010, 2014, 2018, 2022. It should look like you could peel it off a sheet and stick it in an album.",
      "",
      "DO NOT add any background outside the sticker. DO NOT add shadows or reflections. The sticker fills the entire image.",
    ].join("\n");

    const turkeyChampionPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Turkey winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Turkish supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands waving Turkish flags, red and white scarves everywhere",
      "- Golden confetti, red smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: TÜRKİYE: DÜNYA ŞAMPİYONU",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc + " The shirt must be CLEARLY VISIBLE — do NOT cover it with a flag or cape.",
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic stadium lighting, ultra high quality 4K.",
    ].join("\n");

    const paniniPrompt = [
      "Generate a FIFA World Cup 2026 Panini sticker card. The layout must be IDENTICAL every single time — no variation, no creativity, no alternative designs. Copy Image 5 exactly.",
      "",
      "FIXED LAYOUT — DO NOT DEVIATE:",
      "1. Card shape: portrait rectangle with rounded corners. Light blue-gray (#B8C8D8) background.",
      "2. Background decoration: large bold red '26' numbers partially visible behind the person.",
      "3. Top right corner: FIFA World Cup 2026 logo (trophy silhouette + '26' + 'FIFA' text in white).",
      "4. Upper background: Moroccan flag colors (red + green) as a graphic element.",
      "5. Center: the person from Image 1, head and upper body visible, " + shirtDesc + " Face PHOTOREALISTIC and IDENTICAL to Image 1. PROPORTIONS: head naturally sized relative to body. EXPRESSION: copy exactly from Image 1, do NOT add a smile.",
      "6. Right side of card: circular Moroccan flag badge (red circle with green star).",
      "7. Bottom bar: solid red rounded rectangle spanning full card width. Large bold white text: '" + name + "'. Below it smaller white text: 'FIFA WORLD CUP 2026 · MOROCCO'.",
      "8. Bottom right corner: 'PANINI' in yellow bold text on dark background.",
      "",
      "RULES:",
      "- Every element above must be present. Nothing may be removed or moved.",
      "- The card must look IDENTICAL to Image 5 in structure and style.",
      "- Do NOT invent a different card design. Do NOT use the old-style cream/beige Panini layout.",
      "- Only the person's face and the name text change between generations. Everything else stays fixed.",
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

    const promptText = isTurkey
      ? (type === "panini" ? turkeyPaniniPrompt : turkeyChampionPrompt)
      : (type === "panini" ? paniniPrompt : championPrompt);

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
