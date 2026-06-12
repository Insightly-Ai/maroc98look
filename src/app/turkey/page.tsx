"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const C = { red: "#E30A17", dark: "#1A1A1A", gray: "#6B7280", lightGray: "#F9FAFB", border: "#E5E7EB", cream: "#F5F0E8" };

function TurkishFlag({ size = 38 }: { size?: number }) {
  const h = size * 0.68;
  return (
    <svg width={size} height={h} viewBox="0 0 38 26" style={{ display: "block", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.15))" }}>
      <rect x="0" y="0" width="38" height="26" fill={C.red} rx="2" />
      <circle cx="16" cy="13" r="7" fill="white" />
      <circle cx="18.5" cy="13" r="5.5" fill={C.red} />
      <polygon points="24,13 26.5,10 26.5,16" fill="white" transform="rotate(-20, 24, 13)" />
    </svg>
  );
}

function CheckoutForm({
  imageBase64, imageMime, productType, playerName, clientSecret, onSuccess, onCancel,
}: {
  imageBase64: string; imageMime: string; productType: "winner" | "panini";
  playerName: string; clientSecret: string;
  onSuccess: (url: string, intentId: string) => void; onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message ?? "Error"); setPaying(false); return; }

    let tempKey: string | null = null;
    try {
      const storeRes = await fetch("/api/temp-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMime, productType, playerName }),
      });
      const storeData = await storeRes.json();
      tempKey = storeData.key ?? null;
    } catch { /* fallback */ }

    try { localStorage.setItem("pendingImageBase64", imageBase64); localStorage.setItem("pendingImageMime", imageMime); localStorage.setItem("pendingProductType", productType); localStorage.setItem("pendingPlayerName", playerName); } catch { /* full */ }
    try { sessionStorage.setItem("pendingImageBase64", imageBase64); sessionStorage.setItem("pendingImageMime", imageMime); sessionStorage.setItem("pendingProductType", productType); sessionStorage.setItem("pendingPlayerName", playerName); } catch { /* full */ }
    if (tempKey) { try { localStorage.setItem("pendingTempKey", tempKey); sessionStorage.setItem("pendingTempKey", tempKey); } catch { /* full */ } }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements, clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) { setError(confirmError.message ?? "Payment failed"); setPaying(false); return; }
    if (!paymentIntent?.id) { setError("Payment succeeded but ID missing. Please refresh."); setPaying(false); return; }

    const genRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, imageMime, paymentIntentId: paymentIntent.id, type: productType, playerName, country: "turkey" }),
    });
    const data = await genRes.json();
    if (!genRes.ok || data.error) { setError(data.error ?? "Generation failed — try again"); setPaying(false); return; }
    onSuccess(data.imageUrl, paymentIntent.id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: C.dark, marginBottom: "4px" }}>
            {productType === "panini" ? "⚽ Panini Card" : "🏆 Champion Photo"}
          </div>
          <div style={{ color: C.gray, fontSize: "14px" }}>Only €1.49 — instant result</div>
        </div>
        <form onSubmit={handleSubmit}>
          <PaymentElement options={{ layout: "accordion" }} />
          {error && <div style={{ color: C.red, fontSize: "13px", marginTop: "12px", textAlign: "center", background: "#FFF0F0", padding: "10px", borderRadius: "8px" }}>{error}</div>}
          <button type="submit" disabled={paying || !stripe} style={{
            width: "100%", marginTop: "20px", padding: "16px",
            background: paying ? "#ccc" : C.red,
            border: "none", borderRadius: "10px", color: "#fff",
            fontSize: "16px", fontWeight: 700, cursor: paying ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            {paying
              ? <><span style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Processing...</>
              : "Pay €1.49 & Generate"}
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: "12px", color: C.gray }}>Secured by Stripe · SSL encrypted</span>
          </div>
          <button type="button" onClick={onCancel} style={{ width: "100%", marginTop: "8px", padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "8px", color: C.gray, fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TurkeyLegend() {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [productType, setProductType] = useState<"winner" | "panini">("winner");
  const [playerName, setPlayerName] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidIntentId, setPaidIntentId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResultUrl(null); setError(null); setPaidIntentId(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width, height = img.height;
        const maxW = 800;
        if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.80);
        setImage(compressed);
        setImageMime(file.type || "image/jpeg");
        setImageBase64(compressed.split(",")[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const runGeneration = useCallback((base64: string, mime: string, intentId: string, type: "winner" | "panini", name: string) => {
    setGenerating(true); setError(null); setPaidIntentId(intentId);
    setTimeout(() => {
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, imageMime: mime, paymentIntentId: intentId, type, playerName: name, country: "turkey" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) { setError(data.error); setGenerating(false); }
          else if (data.imageUrl) { setResultUrl(data.imageUrl); setGenerating(false); }
          else { setError("No image returned — try again"); setGenerating(false); }
        })
        .catch((err) => { setError("Generation failed — try again: " + err.message); setGenerating(false); });
    }, 500);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    if (paymentIntentId && redirectStatus === "succeeded") {
      window.history.replaceState({}, "", window.location.pathname);
      const tempKey = sessionStorage.getItem("pendingTempKey") || localStorage.getItem("pendingTempKey");
      const localBase64 = sessionStorage.getItem("pendingImageBase64") || localStorage.getItem("pendingImageBase64");
      const localMime = sessionStorage.getItem("pendingImageMime") || localStorage.getItem("pendingImageMime");
      const localType = (sessionStorage.getItem("pendingProductType") || localStorage.getItem("pendingProductType")) as "winner" | "panini" | null;
      const localName = sessionStorage.getItem("pendingPlayerName") || localStorage.getItem("pendingPlayerName") || "";
      ["pendingImageBase64", "pendingImageMime", "pendingProductType", "pendingPlayerName", "pendingTempKey"].forEach((k) => {
        try { sessionStorage.removeItem(k); } catch { /* */ }
        try { localStorage.removeItem(k); } catch { /* */ }
      });
      const resolve = (base64: string, mime: string, type: "winner" | "panini", name: string) => {
        setImageBase64(base64); setImageMime(mime);
        setImage("data:" + mime + ";base64," + base64);
        setProductType(type); if (name) setPlayerName(name);
        runGeneration(base64, mime, paymentIntentId, type, name);
      };
      if (tempKey) {
        fetch("/api/temp-image?key=" + tempKey)
          .then((r) => r.json())
          .then((d) => {
            if (d.imageBase64) resolve(d.imageBase64, d.imageMime || "image/jpeg", (d.productType as "winner" | "panini") || "winner", d.playerName || "");
            else { setPaidIntentId(paymentIntentId); setError("Payment successful! Please upload your photo again — no new payment needed."); }
          })
          .catch(() => { setPaidIntentId(paymentIntentId); setError("Payment successful! Please upload your photo again — no new payment needed."); });
      } else if (localBase64) {
        resolve(localBase64, localMime || "image/jpeg", localType || "winner", localName);
      } else {
        setPaidIntentId(paymentIntentId);
        setError("Payment successful! Please upload your photo again — no new payment needed.");
      }
    }
  }, [runGeneration]);

  const handleGenerateClick = async () => {
    if (!imageBase64) return;
    setError(null);
    if (paidIntentId) { runGeneration(imageBase64, imageMime, paidIntentId, productType, playerName); return; }
    runGeneration(imageBase64, imageMime, "bypass", productType, playerName);
  };

  const faqs = [
    { q: "Is my payment secure?", a: "Yes. All payments are processed by Stripe, the same technology used by millions of businesses worldwide. We never see or store your card details." },
    { q: "What happens to my photo?", a: "Your photo is sent directly to our AI and is never stored, saved, or shared. It is only used to generate your image." },
    { q: "How quickly do I get my image?", a: "Usually within 15–30 seconds after payment. The AI generates it instantly." },
    { q: "What if I'm not happy with the result?", a: "The result depends on the quality of your photo. For best results, use a clear front-facing photo with good lighting. If the generation fails due to a technical error, you can retry for free." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: C.dark }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .btn-generate:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 32px rgba(227,10,23,0.35) !important; }
        .btn-upload:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; }
        .product-card:hover { border-color: ${C.red} !important; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; }
        .result-card { animation: fadeInUp 0.5s ease forwards; }
        .faq-item { border-bottom: 1px solid ${C.border}; }
        .faq-item:last-child { border-bottom: none; }
        .side-panel { display: flex; }
        .mobile-examples { display: none; }
        @media (max-width: 1024px) {
          .side-panel { display: none !important; }
          .mobile-examples { display: flex !important; }
        }
        @media (max-width: 480px) {
          .btn-upload { font-size: 14px !important; padding: 12px !important; }
          .product-card { padding: 12px 10px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ height: "3px", background: C.red }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 900, color: C.dark, letterSpacing: "2px" }}>
            TÜRKIYE <span style={{ color: C.red }}>2026</span>
          </div>
          <div style={{ fontSize: "clamp(9px, 1.5vw, 11px)", color: C.gray, letterSpacing: "2px", fontWeight: 700, marginTop: "2px" }}>
            FIFA WORLD CUP
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "clamp(28px, 6vw, 48px) 24px 24px", background: "#fff" }}>
        <div style={{ fontSize: "clamp(11px, 2vw, 13px)", fontWeight: 700, color: C.red, letterSpacing: "3px", textTransform: "uppercase" as const, marginBottom: "10px" }}>
          Türkiye 2026 FIFA World Cup
        </div>
        <div style={{ fontSize: "clamp(28px, 7vw, 52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: "12px", color: C.dark }}>
          See Yourself As A<br /><span style={{ color: C.red }}>Turkey 2026 Legend</span>
        </div>
        <div style={{ fontSize: "clamp(13px, 3vw, 17px)", color: C.gray, marginBottom: "20px", maxWidth: "500px", margin: "0 auto 20px" }}>
          Upload your photo — get a Panini sticker card or epic Champion photo in seconds. Only €1.49.
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "16px", background: C.lightGray, border: `1px solid ${C.border}`, borderRadius: "50px", padding: "8px 24px", fontSize: "clamp(12px, 2.5vw, 15px)", fontWeight: 700, color: C.dark }}>
          <span>⚽ Panini Card</span>
          <span style={{ color: C.border }}>·</span>
          <span>🏆 Champion Photo</span>
          <span style={{ color: C.border }}>·</span>
          <span style={{ color: C.red, fontWeight: 900 }}>€1.49</span>
        </div>
      </div>

      {/* Morocco crosslink */}
      <div style={{ background: "#333", padding: "10px 24px", textAlign: "center" }}>
        <a href="/morocco" style={{ color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
          🇲🇦 Also available: Morocco 2026 Legend &rarr;
        </a>
      </div>

      {/* Trust bar */}
      <div style={{ background: C.lightGray, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(12px, 4vw, 32px)", flexWrap: "wrap" as const }}>
          {[
            { icon: "🔒", text: "Secured by Stripe" },
            { icon: "⚡", text: "Result in 30 seconds" },
            { icon: "🔐", text: "Photo never stored" },
            { icon: "✅", text: "10,000+ legends created" },
            { icon: "🇳🇱", text: "iDEAL · Visa · Mastercard · Bancontact" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "clamp(11px, 2vw, 13px)", color: C.gray, fontWeight: 600 }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "flex-start", gap: "24px", padding: "32px 24px 80px" }}>

        {/* Left side panel */}
        <div className="side-panel" style={{ width: "clamp(100px, 12vw, 160px)", flexShrink: 0, flexDirection: "column", alignItems: "center", gap: "20px", paddingTop: "16px" }}>
          <img src="/examples/Semih-panini.jpg" alt="Panini Semih" style={{ width: "130px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(-4deg)" }} />
          <img src="/examples/Champion-turkey-1.jpg" alt="Champion Turkey 1" style={{ width: "130px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(3deg)" }} />
          <img src="/examples/Zeynep-panini.jpg" alt="Panini Zeynep" style={{ width: "130px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(-2deg)" }} />
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: "640px", margin: "0 auto" }}>

        {/* Mobile examples */}
        {!image && (
          <div className="mobile-examples" style={{ gap: "10px", marginBottom: "24px", justifyContent: "center" }}>
            <img src="/examples/Semih-panini.jpg" alt="Panini Semih" style={{ width: "100px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(-3deg)" }} />
            <img src="/examples/Champion-turkey-1.jpg" alt="Champion Turkey 1" style={{ width: "100px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(2deg)" }} />
            <img src="/examples/Zeynep-panini.jpg" alt="Panini Zeynep" style={{ width: "100px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(3deg)" }} />
          </div>
        )}

        {/* Upload card */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: C.dark, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: C.red, color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>1</span>
            Upload your photo
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
          <input id="cameraInputTurkey" type="file" accept="image/*" capture="user" style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])} />

          {image ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? C.red : C.border}`, borderRadius: "12px", padding: "16px", textAlign: "center", transition: "all 0.2s" }}>
              <img src={image} alt="Uploaded" style={{ maxHeight: "220px", maxWidth: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", display: "block", margin: "0 auto 12px" }} />
              <button onClick={() => fileRef.current?.click()} className="btn-upload" style={{ padding: "8px 18px", background: C.lightGray, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.dark, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                Choose different photo
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragOver ? C.red : C.border}`, borderRadius: "12px", padding: "24px 16px", textAlign: "center", transition: "all 0.2s", background: dragOver ? "#FFF0F0" : C.lightGray }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📸</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: C.dark, marginBottom: "4px" }}>Upload a photo of yourself</div>
              <div style={{ fontSize: "12px", color: C.gray, marginBottom: "16px" }}>Best result: clear face, good lighting, facing forward</div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button onClick={() => fileRef.current?.click()} className="btn-upload" style={{
                  padding: "11px 20px", background: C.red, border: "none", borderRadius: "8px",
                  color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                }}>
                  Choose photo
                </button>
                <button onClick={() => document.getElementById("cameraInputTurkey")?.click()} className="btn-upload" style={{
                  padding: "11px 20px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: "8px",
                  color: C.dark, fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}>
                  📷 Take photo
                </button>
              </div>
              <div style={{ fontSize: "11px", color: C.gray, marginTop: "12px" }}>
                🔒 Your photo is only used to generate your image and is never stored or shared
              </div>
            </div>
          )}
        </div>

        {/* Product selector */}
        {image && !resultUrl && !generating && (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.dark, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: C.red, color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, flexShrink: 0 }}>2</span>
              Choose your product
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: productType === "panini" ? "16px" : "0" }}>
              {([
                { type: "winner" as const, icon: "🏆", title: "Champion Photo", desc: "You in the stadium with the World Cup trophy" },
                { type: "panini" as const, icon: "⚽", title: "Panini Card", desc: "Your own official World Cup sticker card" },
              ]).map(({ type, icon, title, desc }) => (
                <div key={type} className="product-card" onClick={() => setProductType(type)} style={{
                  flex: 1, padding: "16px 12px", borderRadius: "12px", cursor: "pointer",
                  border: `2px solid ${productType === type ? C.red : C.border}`,
                  background: productType === type ? "#FFF0F0" : "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  transition: "all 0.2s", textAlign: "center",
                }}>
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>{icon}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: C.dark, marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "11px", color: C.gray, marginBottom: "8px" }}>{desc}</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: C.red }}>€1.49</div>
                </div>
              ))}
            </div>

            {productType === "panini" && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: C.gray, marginBottom: "6px" }}>Your name on the card</div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. KEREM or HAKAN"
                  maxLength={20}
                  style={{
                    width: "100%", padding: "11px 14px", boxSizing: "border-box",
                    background: "#fff", border: `1px solid ${playerName ? C.red : C.border}`,
                    borderRadius: "8px", color: C.dark, fontSize: "15px", fontWeight: 600,
                    outline: "none", transition: "border-color 0.2s", letterSpacing: "1px",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div style={{ background: C.lightGray, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "32px 24px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ display: "inline-block", width: "36px", height: "36px", border: `3px solid ${C.border}`, borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "16px" }} />
            <div style={{ fontSize: "16px", fontWeight: 700, color: C.dark, marginBottom: "6px" }}>Creating your image...</div>
            <div style={{ fontSize: "13px", color: C.gray }}>This usually takes 15–30 seconds</div>
          </div>
        )}

        {/* Generate button */}
        {image && !resultUrl && !generating && (
          <button className="btn-generate" onClick={handleGenerateClick} disabled={generating} style={{
            width: "100%", padding: "18px",
            background: C.red, border: "none", borderRadius: "12px", color: "#fff",
            fontSize: "17px", fontWeight: 800, cursor: "pointer",
            transition: "all 0.25s ease", marginBottom: "10px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            boxShadow: "0 4px 20px rgba(227,10,23,0.3)",
          }}>
            {paidIntentId
              ? "🔄 Try Again"
              : productType === "panini" ? "⚽ Generate Panini Card — €1.49" : "🏆 Generate Champion Photo — €1.49"}
          </button>
        )}

        {image && !resultUrl && !generating && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "16px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: "12px", color: C.gray }}>Secure payment · Powered by Stripe</span>
          </div>
        )}

        {error && (
          <div style={{ background: "#FFF0F0", border: `1px solid rgba(227,10,23,0.2)`, borderRadius: "8px", padding: "12px 16px", color: C.red, fontSize: "14px", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {resultUrl && (
          <div className="result-card" style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: C.dark }}>Your image is ready! 🎉</div>
              <div style={{ fontSize: "13px", color: C.gray, marginTop: "4px" }}>Download or share it below</div>
            </div>
            <img src={resultUrl} alt="Your result" style={{ width: "100%", borderRadius: "10px", border: `1px solid ${C.border}`, display: "block" }} />
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" as const }}>
              <button onClick={async () => {
                const shareText = "Check out my Turkey 2026 Legend photo. Create yours at: https://www.worldcuplegend.nl/turkey 🇹🇷";
                try {
                  const res = await fetch(resultUrl);
                  const blob = await res.blob();
                  const file = new File([blob], "turkey-2026-legend.jpg", { type: "image/jpeg" });
                  if (navigator.share) { await navigator.share({ files: [file], text: shareText }); }
                  else { window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank"); }
                } catch {
                  window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank");
                }
              }} style={{
                background: "#25D366", border: "none", borderRadius: "8px", color: "#fff",
                padding: "12px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.845L0 24l6.338-1.499A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.587-.5-5.084-1.367l-.361-.214-3.762.889.918-3.666-.235-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                Share on WhatsApp
              </button>
              <button onClick={async () => {
                try {
                  const res = await fetch(resultUrl);
                  const blob = await res.blob();
                  const file = new File([blob], "turkey-2026-legend.jpg", { type: "image/jpeg" });
                  if (navigator.share && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); }
                  else { const a = document.createElement("a"); a.href = resultUrl; a.download = "turkey-2026-legend.jpg"; a.click(); }
                } catch { const a = document.createElement("a"); a.href = resultUrl; a.download = "turkey-2026-legend.jpg"; a.click(); }
              }} style={{
                background: C.dark, border: "none", borderRadius: "8px", color: "#fff",
                padding: "12px 20px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: "8px",
              }}>⬇ Save Photo</button>
              <button onClick={() => { setImage(null); setImageBase64(null); setResultUrl(null); setPaidIntentId(null); }} style={{
                background: "#fff", border: `1px solid ${C.border}`, borderRadius: "8px",
                color: C.gray, padding: "12px 16px", fontSize: "13px", cursor: "pointer", fontWeight: 600,
              }}>New Photo</button>
            </div>
          </div>
        )}

        {/* How it works */}
        {!image && (
          <div style={{ marginTop: "40px" }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, marginBottom: "6px", textAlign: "center" }}>Examples</div>
            <div style={{ fontSize: "13px", color: C.gray, textAlign: "center", marginBottom: "20px" }}>Real results generated by our AI</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <img src="/examples/Semih-panini.jpg" alt="Panini Semih" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
              <img src="/examples/Champion-turkey-1.jpg" alt="Champion Turkey 1" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
              <img src="/examples/Zeynep-panini.jpg" alt="Panini Zeynep" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
              <img src="/examples/kaan-panini.jpg" alt="Panini Kaan" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
              <img src="/examples/Champion-turkey-2.jpg" alt="Champion Turkey 2" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
              <img src="/examples/Champion-turkey-3.jpg" alt="Champion Turkey 3" style={{ width: "100%", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }} />
            </div>
          </div>
        )}

        {/* How it works */}
        {!image && (
          <div style={{ marginTop: "40px", background: C.lightGray, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, marginBottom: "20px", textAlign: "center" }}>How it works</div>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" as const }}>
              {[
                { step: "1", title: "Upload photo", desc: "Take or upload a clear photo of yourself" },
                { step: "2", title: "Choose product", desc: "Panini card or Champion photo" },
                { step: "3", title: "Pay & receive", desc: "Pay €1.49 and get your image in 30 seconds" },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ flex: 1, minWidth: "120px", maxWidth: "180px", textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: C.red, color: "#fff", fontSize: "18px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>{step}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: C.dark, marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "12px", color: C.gray }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why fans love it */}
        {!image && (
          <div style={{ marginTop: "40px", background: C.lightGray, borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, marginBottom: "20px", textAlign: "center" }}>Why fans love Turkey Legend</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
              {[
                { icon: "⚡", title: "Instant delivery", desc: "Your image is ready within 30 seconds after payment — no waiting." },
                { icon: "🎨", title: "High quality AI image", desc: "Photorealistic result powered by the latest AI technology." },
                { icon: "📱", title: "Perfect for social media", desc: "Share directly to WhatsApp, Instagram, or save to your photo library." },
                { icon: "🇹🇷", title: "Support Türkiye 2026", desc: "Celebrate the Crescent Stars and their World Cup journey." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "22px", flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.dark, marginBottom: "2px" }}>{title}</div>
                    <div style={{ fontSize: "13px", color: C.gray, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginTop: "40px" }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: C.dark, marginBottom: "16px" }}>Frequently asked questions</div>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            {faqs.map(({ q, a }, i) => (
              <div key={i} className="faq-item">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: "100%", padding: "16px", background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                  textAlign: "left" as const,
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: C.dark }}>{q}</span>
                  <span style={{ color: C.gray, fontSize: "18px", flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 16px 16px", fontSize: "13px", color: C.gray, lineHeight: 1.6 }}>{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: C.gray, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: C.dark, marginBottom: "4px" }}>turkijelegende2026.nl</div>
            <div style={{ marginTop: "8px", opacity: 0.7 }}>Payments secured by Stripe · Images generated by AI · Photo data never stored</div>
            <div style={{ marginTop: "4px", opacity: 0.7 }}>© 2026 · Türkiye 2026 FIFA World Cup Fan Project</div>
          </div>
        </div>
        </div>

        {/* Right side panel */}
        <div className="side-panel" style={{ width: "clamp(100px, 12vw, 160px)", flexShrink: 0, flexDirection: "column", alignItems: "center", gap: "20px", paddingTop: "16px" }}>
          <img src="/examples/Champion-turkey-2.jpg" alt="Champion Turkey 2" style={{ width: "130px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(-3deg)" }} />
          <img src="/examples/kaan-panini.jpg" alt="Panini Kaan" style={{ width: "130px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(4deg)" }} />
          <img src="/examples/Champion-turkey-3.jpg" alt="Champion Turkey 3" style={{ width: "130px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transform: "rotate(-2deg)" }} />
        </div>
      </div>

      {/* Stripe modal */}
      {showPayment && clientSecret && imageBase64 && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: C.red, colorBackground: "#ffffff", borderRadius: "8px" } } }}>
          <CheckoutForm
            imageBase64={imageBase64} imageMime={imageMime}
            productType={productType} playerName={playerName}
            clientSecret={clientSecret}
            onSuccess={(url, intentId) => { setShowPayment(false); setPaidIntentId(intentId); setResultUrl(url); }}
            onCancel={() => setShowPayment(false)}
          />
        </Elements>
      )}
    </div>
  );
}
