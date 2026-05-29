import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Je bent een creatieve AI die mensen omschrijft alsof ze een iconische Marokkaanse voetballer zijn uit het WK 1998 tijdperk.
Geef een leuke, enthousiaste beschrijving in het Nederlands.
Beschrijf:
1. Welke Marokkaanse speler ze het meest lijken (bv. Mustapha Hadji, Rachid Rokbi, Noureddine Naybet, Abdeljalil Hadda, etc.)
2. Hun positie op het veld
3. Hun speelstijl op basis van hun uiterlijk
4. Een grappige bijnaam die past bij de WK 1998 Marokko sfeer
5. Een motiverende kreet in het Arabisch/Berbers/Frans die past bij Marokko 1998

Houd het kort, energiek en feestelijk. Max 150 woorden. Gebruik emoji's 🟢⭐🦁🇲🇦`;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMime || "image/jpeg", data: imageBase64 } },
          { type: "text", text: "Transformeer deze persoon naar een Marokkaanse voetballer van WK 1998 stijl! Beschrijf wie ze zijn in het Marokko elftal." },
        ],
      }],
    });

    const text = message.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("\n");
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Fout:", error);
    return NextResponse.json({ error: "Generatie mislukt. Probeer opnieuw." }, { status: 500 });
  }
}
