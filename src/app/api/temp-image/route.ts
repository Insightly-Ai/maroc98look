import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// In-memory store — survives for the duration of the payment flow (minutes)
const store = new Map<string, { imageBase64: string; imageMime: string; productType: string; playerName: string; expiresAt: number }>();

// Clean up entries older than 30 minutes
function cleanup() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.expiresAt < now) store.delete(key);
  }
}

export async function POST(request: NextRequest) {
  cleanup();
  const { imageBase64, imageMime, productType, playerName } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: "No image" }, { status: 400 });
  const key = randomUUID();
  store.set(key, { imageBase64, imageMime, productType, playerName, expiresAt: Date.now() + 30 * 60 * 1000 });
  return NextResponse.json({ key });
}

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "No key" }, { status: 400 });
  const entry = store.get(key);
  if (!entry) return NextResponse.json({ error: "Not found or expired" }, { status: 404 });
  store.delete(key); // one-time use
  return NextResponse.json(entry);
}
