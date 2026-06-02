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
const FLAG_COLORS = { green: "#006233", red: "#C1272D", gold: "#B8860B" };

function MoroccanStar({ size = 80, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * 60 - 90) * (Math.PI / 180);
        const x = 50 + 40 * Math.cos(a);
        const y = 50 + 40 * Math.sin(a);
        return (
          <polygon key={i}
            points={`${x},${y} ${50 + 15 * Math.cos(a + 0.5)},${50 + 15 * Math.sin(a + 0.5)} ${50 + 15 * Math.cos(a - 0.5)},${50 + 15 * Math.sin(a - 0.5)}`}
            fill={FLAG_COLORS.gold} opacity="0.9"
          />
        );
      })}
    </svg>
  );
}

const SIDE_CARDS = [
  { icon: "🏆", label: "Kampioenschapsfoto", bg: "linear-gradient(160deg, #3d0010 0%, #1a0005 60%, #002a10 100%)" },
  { icon: "⚽", label: "Panini Sticker", bg: "linear-gradient(160deg, #1a0005 0%, #3d0010 60%, #001a0a 100%)" },
  { icon: "🇲🇦", label: "Kampioenschapsfoto", bg: "linear-gradient(160deg, #2a0008 0%, #006233 120%)" },
  { icon: "🏆", label: "Panini Sticker", bg: "linear-gradient(160deg, #3d0010 0%, #2a1400 60%, #006233 140%)" },
];

function SideCard({ icon, label, bg }: { icon: string; label: string; bg: string }) {
  return (
    <div style={{
      height: "180px",
      background: bg,
      border: `1px solid rgba(184,134,11,0.35)`,
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      padding: "12px",
      flexShrink: 0,
    }}>
      <div style={{ fontSize: "36px", lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: "10px",
        fontWeight: 700,
        color: "rgba(184,134,11,0.8)",
        textTransform: "uppercase" as const,
        letterSpacing: "1px",
        textAlign: "center" as const,
        lineHeight: 1.3,
      }}>{label}</div>
      <div style={{
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
        border: "1px dashed rgba(184,134,11,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <svg viewBox="0 0 40 40" width="28" height="28">
          <circle cx="20" cy="14" r="7" fill="rgba(255,255,255,0.2)" />
          <path d="M6 36 Q6 26 20 26 Q34 26 34 36" fill="rgba(255,255,255,0.2)" />
        </svg>
      </div>
      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
        Jouw foto hier
      </div>
    </div>
  );
}

function CheckoutForm({
  imageBase64,
  imageMime,
  productType,
  playerName,
  clientSecret,
  onSuccess,
  onCancel,
}: {
  imageBase64: string;
  imageMime: string;
  productType: "winner" | "panini";
  playerName: string;
  clientSecret: string;
  onSuccess: (url: string) => void;
  onCancel: () => void;
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
    if (submitError) { setError(submitError.message ?? "Fout"); setPaying(false); return; }

    // Save photo to sessionStorage before potential iDEAL redirect
    sessionStorage.setItem("pendingImageBase64", imageBase64);
    sessionStorage.setItem("pendingImageMime", imageMime);
    sessionStorage.setItem("pendingProductType", productType);
    sessionStorage.setItem("pendingPlayerName", playerName);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) { setError(confirmError.message ?? "Betaling mislukt"); setPaying(false); return; }

    if (!paymentIntent?.id) {
      setError("Betaling geslaagd maar ID ontbreekt. Ververs de pagina.");
      setPaying(false);
      return;
    }

    // Payment succeeded — generate image
    const genRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, imageMime, paymentIntentId: paymentIntent.id, type: productType, playerName }),
    });
    const data = await genRes.json();
    if (!genRes.ok) {
      console.error("Generate fout:", data);
      setError(data.error ?? "Generatie mislukt — probeer opnieuw");
      setPaying(false);
      return;
    }

    onSuccess(data.imageUrl);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a0005, #3d0010)",
        border: `1px solid ${FLAG_COLORS.gold}`,
        borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <MoroccanStar size={36} style={{ display: "inline-block" }} />
          <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700, marginTop: "8px" }}>
            {productType === "panini" ? "Jouw Panini Sticker" : "Jouw Kampioenschapsfoto"}
          </div>
          <div style={{ color: FLAG_COLORS.gold, fontSize: "14px", marginTop: "4px" }}>
            Eenmalig €1,49 — direct downloaden
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <PaymentElement options={{ layout: "accordion" }} />

          {error && (
            <div style={{ color: "#ff8a8a", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={paying || !stripe} style={{
            width: "100%", marginTop: "20px", padding: "16px",
            background: paying ? "rgba(193,39,45,0.4)" : `linear-gradient(135deg, ${FLAG_COLORS.red}, #e63946)`,
            border: "none", borderRadius: "10px", color: "#fff",
            fontSize: "16px", fontWeight: 700, cursor: paying ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          }}>
            {paying ? (
              <>
                <span style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Betalen & genereren...
              </>
            ) : "🏆 Betaal €1,49 & genereer"}
          </button>

          <button type="button" onClick={onCancel} style={{
            width: "100%", marginTop: "10px", padding: "10px",
            background: "transparent", border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "13px", cursor: "pointer",
          }}>
            Annuleren
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Marokko98Look() {
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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setResultUrl(null);
    setError(null);
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64((e.target?.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // On page load: check if Stripe redirected back after iDEAL payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");

    if (paymentIntentId && redirectStatus === "succeeded") {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);

      const savedBase64 = sessionStorage.getItem("pendingImageBase64");
      const savedMime = sessionStorage.getItem("pendingImageMime");
      const savedType = sessionStorage.getItem("pendingProductType") as "winner" | "panini" | null;
      const savedName = sessionStorage.getItem("pendingPlayerName") || "";
      sessionStorage.removeItem("pendingImageBase64");
      sessionStorage.removeItem("pendingImageMime");
      sessionStorage.removeItem("pendingProductType");
      sessionStorage.removeItem("pendingPlayerName");

      if (savedBase64) {
        setImageBase64(savedBase64);
        setImageMime(savedMime || "image/jpeg");
        setImage("data:" + (savedMime || "image/jpeg") + ";base64," + savedBase64);
        if (savedType) setProductType(savedType);
        if (savedName) setPlayerName(savedName);
        setGenerating(true);

        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: savedBase64, imageMime: savedMime || "image/jpeg", paymentIntentId, type: savedType || "winner", playerName: savedName }),
        })
          .then((r) => r.json())
          .then((data) => { setResultUrl(data.imageUrl); setGenerating(false); })
          .catch(() => { setError("Generatie mislukt, probeer opnieuw."); setGenerating(false); });
      }
    }
  }, []);

  const handleGenerateClick = async () => {
    if (!imageBase64) return;
    setError(null);
    const res = await fetch("/api/payment", { method: "POST" });
    const { clientSecret: cs } = await res.json();
    setClientSecret(cs);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (url: string) => {
    setShowPayment(false);
    setResultUrl(url);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #1a0005 0%, #3d0010 50%, #1a0005 100%)",
      fontFamily: "'Arial Black', Arial, sans-serif",
      color: "#f0e0e0",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-gold { 0%,100% { box-shadow: 0 0 0 0 rgba(184,134,11,0.4); } 50% { box-shadow: 0 0 30px 8px rgba(184,134,11,0.2); } }
        .upload-zone:hover { border-color: ${FLAG_COLORS.gold} !important; background: rgba(193,39,45,0.2) !important; }
        .btn-main:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 40px rgba(193,39,45,0.6) !important; }
        .result-card { animation: fadeInUp 0.6s ease forwards; }
        .side-panel { display: flex; }
        @media (max-width: 900px) { .side-panel { display: none !important; } }
      `}</style>

      {/* Top green bar */}
      <div style={{ height: "5px", background: `linear-gradient(90deg, ${FLAG_COLORS.green}, #00a040, ${FLAG_COLORS.green})` }} />

      {/* Main layout: left | center | right */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100vh - 10px)", padding: "0 16px" }}>

        {/* Left side panel */}
        <div className="side-panel" style={{
          width: "180px",
          flexShrink: 0,
          flexDirection: "column",
          gap: "12px",
          paddingTop: "120px",
          paddingRight: "16px",
        }}>
          {SIDE_CARDS.map((card, i) => (
            <SideCard key={i} {...card} />
          ))}
        </div>

        {/* Center content */}
        <div style={{ flex: 1, maxWidth: "680px", minWidth: 0, padding: "40px 12px 60px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
              <MoroccanStar size={40} />
              <div style={{
                fontSize: "clamp(28px, 6vw, 52px)", fontWeight: 900,
                background: `linear-gradient(135deg, #fff 0%, ${FLAG_COLORS.gold} 50%, #fff 100%)`,
                backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", animation: "shimmer 4s linear infinite",
                letterSpacing: "2px", textTransform: "uppercase" as const,
              }}>MAROC 2026</div>
              <MoroccanStar size={40} />
            </div>

            {/* Tagline */}
            <div style={{
              fontSize: "clamp(20px, 4.5vw, 34px)",
              fontWeight: 900,
              color: FLAG_COLORS.gold,
              textTransform: "uppercase" as const,
              letterSpacing: "2px",
              marginBottom: "12px",
              textShadow: "0 2px 16px rgba(184,134,11,0.4)",
            }}>
              HOE STAAT KAMPIOEN JOU?
            </div>

            {/* Subline */}
            <p style={{
              fontSize: "clamp(13px, 2vw, 15px)",
              color: "rgba(240,224,224,0.8)",
              maxWidth: "480px",
              margin: "0 auto 20px",
              lineHeight: 1.6,
              fontWeight: 400,
              fontFamily: "Georgia, serif",
            }}>
              Steun Marokko. Schrijf geschiedenis. Genereer jouw kampioenschapsfoto.
            </p>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(0,98,51,0.3)", border: `1px solid rgba(0,98,51,0.5)`, borderRadius: "20px", padding: "6px 16px", fontSize: "13px", color: FLAG_COLORS.gold, fontWeight: 700 }}>
                🏆 WK-finale foto
              </div>
              <div style={{ background: "rgba(193,39,45,0.2)", border: `1px solid rgba(193,39,45,0.4)`, borderRadius: "20px", padding: "6px 16px", fontSize: "13px", color: "#ff8a8a", fontWeight: 700 }}>
                Slechts €1,49
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div className="upload-zone" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? FLAG_COLORS.gold : "rgba(193,39,45,0.5)"}`,
              borderRadius: "16px", padding: image ? "20px" : "56px 20px",
              textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(193,39,45,0.2)" : "rgba(60,0,15,0.5)",
              backdropFilter: "blur(10px)", transition: "all 0.3s ease", marginBottom: "20px",
            }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
            {image ? (
              <div>
                <img src={image} alt="Geüpload" style={{ maxHeight: "260px", maxWidth: "100%", borderRadius: "10px", border: `2px solid ${FLAG_COLORS.red}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "block", margin: "0 auto 10px" }} />
                <p style={{ color: FLAG_COLORS.gold, fontSize: "13px", margin: 0 }}>Klik om een andere foto te kiezen</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "48px", marginBottom: "14px" }}>🤳</div>
                <p style={{ fontSize: "17px", color: "#f0d0d0", marginBottom: "6px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px" }}>Sleep je selfie hierheen</p>
                <p style={{ fontSize: "13px", color: "rgba(240,224,224,0.5)", margin: 0 }}>of klik om te uploaden • JPG, PNG, WEBP</p>
              </>
            )}
          </div>

          {/* Tip */}
          {!image && (
            <div style={{ background: "rgba(184,134,11,0.1)", border: `1px solid rgba(184,134,11,0.3)`, borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "rgba(240,224,224,0.7)", textAlign: "center" }}>
              💡 Beste resultaat: een duidelijke foto van je gezicht, goed verlicht, rechtop
            </div>
          )}

          {/* Product type selector — shown after image upload */}
          {image && !resultUrl && (
            <div style={{ display: "flex", gap: "14px", marginBottom: "16px" }}>
              {/* Card 1: Kampioenschapsfoto */}
              <div onClick={() => setProductType("winner")} style={{
                flex: 1, padding: "20px 16px", borderRadius: "14px", cursor: "pointer",
                border: `2px solid ${productType === "winner" ? FLAG_COLORS.gold : "rgba(193,39,45,0.35)"}`,
                background: productType === "winner" ? "rgba(184,134,11,0.12)" : "rgba(60,0,15,0.4)",
                transition: "all 0.2s ease", textAlign: "center",
              }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏆</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: productType === "winner" ? FLAG_COLORS.gold : "#f0d0d0", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Kampioenschapsfoto</div>
                <div style={{ fontSize: "12px", color: "rgba(240,224,224,0.6)", marginBottom: "10px" }}>Jij in het stadion met de WK-beker</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: FLAG_COLORS.gold }}>€1,49</div>
              </div>

              {/* Card 2: Panini Sticker */}
              <div onClick={() => setProductType("panini")} style={{
                flex: 1, padding: "20px 16px", borderRadius: "14px", cursor: "pointer",
                border: `2px solid ${productType === "panini" ? FLAG_COLORS.gold : "rgba(193,39,45,0.35)"}`,
                background: productType === "panini" ? "rgba(184,134,11,0.12)" : "rgba(60,0,15,0.4)",
                transition: "all 0.2s ease", textAlign: "center",
              }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>⚽</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: productType === "panini" ? FLAG_COLORS.gold : "#f0d0d0", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Panini Sticker</div>
                <div style={{ fontSize: "12px", color: "rgba(240,224,224,0.6)", marginBottom: "10px" }}>Jouw eigen WK-voetbalplaatje</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: FLAG_COLORS.gold }}>€1,49</div>
              </div>
            </div>
          )}

          {/* Name input — only for Panini sticker */}
          {image && !resultUrl && productType === "panini" && (
            <div style={{ marginBottom: "16px" }}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Jouw naam op de sticker (bijv. Karim)"
                maxLength={20}
                style={{
                  width: "100%", padding: "14px 16px", boxSizing: "border-box",
                  background: "rgba(60,0,15,0.5)", border: `1px solid ${playerName ? FLAG_COLORS.gold : "rgba(193,39,45,0.4)"}`,
                  borderRadius: "10px", color: "#fff", fontSize: "15px",
                  outline: "none", fontFamily: "Georgia, serif",
                  transition: "border-color 0.2s ease",
                }}
              />
            </div>
          )}

          {/* Generate button */}
          {image && !resultUrl && (
            <button className="btn-main" onClick={handleGenerateClick} disabled={generating} style={{
              width: "100%", padding: "20px",
              background: generating ? "rgba(193,39,45,0.3)" : `linear-gradient(135deg, ${FLAG_COLORS.red} 0%, #e63946 50%, ${FLAG_COLORS.red} 100%)`,
              border: `1px solid ${FLAG_COLORS.red}`, borderRadius: "12px", color: "#fff",
              fontSize: "18px", fontWeight: 900, cursor: generating ? "not-allowed" : "pointer",
              transition: "all 0.3s ease", letterSpacing: "1px", textTransform: "uppercase" as const,
              animation: generating ? "none" : "pulse-gold 3s ease-in-out infinite",
              marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            }}>
              {generating
                ? <><span style={{ width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Foto wordt gegenereerd...</>
                : productType === "panini"
                  ? "⚽ Genereer Panini sticker — €1,49"
                  : "🏆 Genereer kampioenschapsfoto — €1,49"}
            </button>
          )}

          {error && (
            <div style={{ background: "rgba(193,39,45,0.15)", border: "1px solid rgba(193,39,45,0.4)", borderRadius: "12px", padding: "14px 18px", color: "#ff8a8a", fontSize: "14px", marginBottom: "20px", textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div className="result-card" style={{
              background: "linear-gradient(135deg, rgba(60,0,15,0.8), rgba(26,0,5,0.9))",
              border: `1px solid ${FLAG_COLORS.gold}`, borderRadius: "16px", padding: "24px",
              backdropFilter: "blur(20px)", boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
              position: "relative",
            }}>
              <MoroccanStar size={28} style={{ position: "absolute" as const, top: 12, left: 12, opacity: 0.4 }} />
              <div style={{ textAlign: "center", fontSize: "12px", color: FLAG_COLORS.gold, letterSpacing: "4px", textTransform: "uppercase" as const, marginBottom: "16px" }}>
                🏆 Jij bent wereldkampioen! 🏆
              </div>
              <img src={resultUrl} alt="Jouw kampioenschapsfoto" style={{ width: "100%", borderRadius: "12px", border: `2px solid ${FLAG_COLORS.green}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "block" }} />
              <div style={{ marginTop: "16px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href={resultUrl} download="maroc2026-kampioen.jpg" style={{
                  background: FLAG_COLORS.red, border: "none", borderRadius: "8px",
                  color: "#fff", padding: "12px 28px", fontSize: "14px", cursor: "pointer",
                  letterSpacing: "1px", textDecoration: "none", display: "inline-block", fontWeight: 700, textTransform: "uppercase" as const,
                }}>
                  ⬇ Download & deel
                </a>
                <button onClick={() => { setImage(null); setImageBase64(null); setResultUrl(null); }} style={{
                  background: "transparent", border: `1px solid rgba(184,134,11,0.4)`,
                  borderRadius: "8px", color: FLAG_COLORS.gold, padding: "12px 24px", fontSize: "13px", cursor: "pointer",
                }}>
                  Nieuwe foto
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "48px", color: "rgba(240,224,224,0.2)", fontSize: "11px", letterSpacing: "2px" }}>
            <MoroccanStar size={14} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 6px", opacity: 0.4 }} />
            MAROC 2026 · FIFA WORLD CUP · LES LIONS DE L&apos;ATLAS
            <MoroccanStar size={14} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 6px", opacity: 0.4 }} />
          </div>
        </div>

        {/* Right side panel */}
        <div className="side-panel" style={{
          width: "180px",
          flexShrink: 0,
          flexDirection: "column",
          gap: "12px",
          paddingTop: "120px",
          paddingLeft: "16px",
        }}>
          {[...SIDE_CARDS].reverse().map((card, i) => (
            <SideCard key={i} {...card} />
          ))}
        </div>
      </div>

      {/* Stripe payment modal */}
      {showPayment && clientSecret && imageBase64 && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: FLAG_COLORS.red } } }}>
          <CheckoutForm
            imageBase64={imageBase64}
            imageMime={imageMime}
            productType={productType}
            playerName={playerName}
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        </Elements>
      )}

      {/* Bottom red bar */}
      <div style={{ height: "5px", background: `linear-gradient(90deg, ${FLAG_COLORS.red}, #e63946, ${FLAG_COLORS.red})`, position: "fixed" as const, bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}
