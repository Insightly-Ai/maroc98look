import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1, // €0.01 for testing
    currency: "eur",
    automatic_payment_methods: { enabled: true },
  });
  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
