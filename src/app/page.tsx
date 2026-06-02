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
const C = { green: "#006233", red: "#C1272D", gold: "#A8862C", goldLight: "#D4A843", cream: "#F5F0E8", dark: "#1A1A1A" };

function MoroccanStar({ size = 80, color = C.gold, style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * 60 - 90) * (Math.PI / 180);
        const x = 50 + 40 * Math.cos(a);
        const y = 50 + 40 * Math.sin(a);
        return (
          <polygon key={i}
            points={`${x},${y} ${50 + 15 * Math.cos(a + 0.5)},${50 + 15 * Math.sin(a + 0.5)} ${50 + 15 * Math.cos(a - 0.5)},${50 + 15 * Math.sin(a - 0.5)}`}
            fill={color}
          />
        );
      })}
    </svg>
  );
}

function MoroccanFlag({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{ animation: `flagWave 1.6s ease-in-out ${delay}s infinite`, transformOrigin: "left center", display: "inline-block" }}>
      <svg width="38" height="26" viewBox="0 0 38 26" style={{ display: "block", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}>
        {/* Flag pole */}
        <rect x="0" y="0" width="2" height="26" fill="#888" rx="1" />
        {/* Red background */}
        <rect x="2" y="2" width="34" height="22" fill={C.red} rx="1" />
        {/* Green pentagram star centered */}
        <g transform="translate(19, 13)">
          {[0,1,2,3,4].map((i) => {
            const angle = (i * 72 - 90) * Math.PI / 180;
            const outerR = 6, innerR = 2.5;
            const x1 = outerR * Math.cos(angle), y1 = outerR * Math.sin(angle);
            const a2 = angle + 36 * Math.PI / 180;
            const x2 = innerR * Math.cos(a2), y2 = innerR * Math.sin(a2);
            return <line key={i} x1={0} y1={0} x2={x1} y2={y1} stroke={C.green} strokeWidth="1.5" />;
          })}
          <polygon
            points={[0,1,2,3,4].map((i) => {
              const a = (i * 72 - 90) * Math.PI / 180;
              const ai = a + 36 * Math.PI / 180;
              return `${6 * Math.cos(a)},${6 * Math.sin(a)} ${2.5 * Math.cos(ai)},${2.5 * Math.sin(ai)}`;
            }).join(" ")}
            fill="none" stroke={C.green} strokeWidth="1.4" strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}

// If real example images exist in public/examples/, they are used automatically.
// Otherwise falls back to CSS mockup.
function PaniniCard({ name, rotate = 0, imgSrc }: { name: string; rotate?: number; imgSrc?: string }) {
  if (imgSrc) {
    return (
      <div style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.3s ease" }}>
        <img src={imgSrc} alt={name} style={{ width: "130px", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.3s ease", cursor: "default" }}>
      <div style={{
        width: "130px", background: "#E8DFC8",
        border: "3px solid #C1272D", borderRadius: "4px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        overflow: "hidden", fontFamily: "Arial, sans-serif",
      }}>
        {/* Green header */}
        <div style={{ background: "#006233", padding: "5px 0", textAlign: "center" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: "13px", letterSpacing: "2px" }}>MOROCCO</span>
        </div>
        {/* Inner border */}
        <div style={{ border: "2px solid #006233", margin: "2px" }}>
          {/* Portrait area */}
          <div style={{ height: "110px", background: "linear-gradient(180deg, #D4C9B0 0%, #C8BC9E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 60 80" width="52" height="68">
              <ellipse cx="30" cy="22" rx="14" ry="16" fill="rgba(0,0,0,0.15)" />
              <path d="M8 78 Q8 52 30 52 Q52 52 52 78" fill="rgba(0,0,0,0.15)" />
              {/* Shirt pattern */}
              <rect x="8" y="52" width="44" height="26" rx="3" fill="#C1272D" />
              <path d="M16 52 L30 60 L44 52" fill="none" stroke="#006233" strokeWidth="3" />
              {[0,1,2,3].map(i => [0,1,2,3].map(j => (
                <rect key={`${i}-${j}`} x={10+i*11} y={56+j*6} width="6" height="4" rx="1" fill="rgba(255,255,255,0.25)" transform={`rotate(45,${13+i*11},${58+j*6})`} />
              )))}
            </svg>
          </div>
          {/* Bottom: flag + name */}
          <div style={{ background: "#fff", padding: "4px 6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "22px", height: "15px", background: "#C1272D", borderRadius: "1px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.1)" }}>
              <span style={{ fontSize: "9px" }}>★</span>
            </div>
            <div>
              <div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>ATLAS LIONS</div>
              <div style={{ fontSize: "11px", fontWeight: 900, color: "#111", letterSpacing: "0.5px" }}>{name}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChampionCard({ rotate = 0, imgSrc }: { rotate?: number; imgSrc?: string }) {
  if (imgSrc) {
    return (
      <div style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.3s ease" }}>
        <img src={imgSrc} alt="Kampioenschapsfoto" style={{ width: "130px", borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.3s ease" }}>
      <div style={{
        width: "130px", height: "160px", borderRadius: "6px", overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)", position: "relative",
        background: "linear-gradient(160deg, #8B0000 0%, #C1272D 30%, #1a0005 70%, #2d0808 100%)",
      }}>
        {/* Stadium crowd */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 50% 80%, rgba(255,100,50,0.3) 0%, transparent 70%)" }} />
        {/* Flags in background */}
        {[20,50,80,35,65].map((x, i) => (
          <div key={i} style={{ position: "absolute", top: `${30+i*8}%`, left: `${x}%`, width: "12px", height: "8px", background: "#C1272D", opacity: 0.6, transform: `rotate(${-10+i*5}deg)` }}>
            <div style={{ width: "4px", height: "4px", background: "#006233", borderRadius: "50%", margin: "2px auto" }} />
          </div>
        ))}
        {/* Person silhouette */}
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" }}>
          <svg viewBox="0 0 60 90" width="80" height="100">
            <ellipse cx="30" cy="18" rx="13" ry="14" fill="rgba(255,220,180,0.9)" />
            <rect x="12" y="32" width="36" height="42" rx="4" fill="#C1272D" />
            {[0,1,2,3].map(i => [0,1,2].map(j => (
              <rect key={`${i}-${j}`} x={14+i*9} y={34+j*8} width="5" height="4" rx="1" fill="rgba(255,255,255,0.3)" transform={`rotate(45,${16+i*9},${36+j*8})`} />
            )))}
            {/* Trophy */}
            <path d="M38 8 L42 0 L46 2 L44 8" fill="#D4A843" />
            <ellipse cx="42" cy="8" rx="5" ry="6" fill="#D4A843" />
          </svg>
        </div>
        {/* Flag drape */}
        <div style={{ position: "absolute", bottom: "10px", right: "4px", width: "28px", height: "36px", background: "#C1272D", opacity: 0.85, borderRadius: "2px", transform: "rotate(-15deg)" }}>
          <div style={{ width: "10px", height: "10px", background: "#006233", borderRadius: "50%", margin: "12px auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "6px", color: "#D4A843" }}>★</span>
          </div>
        </div>
        {/* Text overlay */}
        <div style={{ position: "absolute", top: "8px", left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontSize: "7px", fontWeight: 900, color: "#fff", letterSpacing: "1px", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>MAROC: CHAMPIONS</div>
          <div style={{ fontSize: "6px", color: "#D4A843", letterSpacing: "0.5px" }}>DU MONDE</div>
        </div>
      </div>
    </div>
  );
}

function CheckoutForm({
  imageBase64, imageMime, productType, playerName, clientSecret, onSuccess, onCancel,
}: {
  imageBase64: string; imageMime: string; productType: "winner" | "panini";
  playerName: string; clientSecret: string;
  onSuccess: (url: string) => void; onCancel: () => void;
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

    sessionStorage.setItem("pendingImageBase64", imageBase64);
    sessionStorage.setItem("pendingImageMime", imageMime);
    sessionStorage.setItem("pendingProductType", productType);
    sessionStorage.setItem("pendingPlayerName", playerName);

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
      body: JSON.stringify({ imageBase64, imageMime, paymentIntentId: paymentIntent.id, type: productType, playerName }),
    });
    const data = await genRes.json();
    if (!genRes.ok) {
      console.error("Generate error:", data);
      setError(data.error ?? "Generation failed — try again");
      setPaying(false);
      return;
    }
    if (data.error) {
      console.error("Generate error:", data.error);
      setError(data.error);
      setPaying(false);
      return;
    }
    onSuccess(data.imageUrl);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", border: `1px solid rgba(168,134,44,0.2)` }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "32px", height: "3px", background: C.red }} />
            <MoroccanStar size={28} color={C.gold} />
            <div style={{ width: "32px", height: "3px", background: C.green }} />
          </div>
          <div style={{ color: C.dark, fontSize: "20px", fontWeight: 800, letterSpacing: "1px" }}>
            {productType === "panini" ? "Your Panini Card" : "Your Champion Photo"}
          </div>
          <div style={{ color: C.gold, fontSize: "14px", marginTop: "4px", fontWeight: 600 }}>
            Only €1.49 — instant download
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <PaymentElement options={{ layout: "accordion" }} />
          {error && <div style={{ color: C.red, fontSize: "13px", marginTop: "12px", textAlign: "center" }}>{error}</div>}
          <button type="submit" disabled={paying || !stripe} style={{
            width: "100%", marginTop: "20px", padding: "16px",
            background: paying ? "rgba(193,39,45,0.5)" : C.red,
            border: "none", borderRadius: "10px", color: "#fff",
            fontSize: "16px", fontWeight: 700, cursor: paying ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            letterSpacing: "0.5px",
          }}>
            {paying ? (<><span style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Paying & generating...</>) : "🏆 Pay €1.49 & Generate"}
          </button>
          <button type="button" onClick={onCancel} style={{ width: "100%", marginTop: "10px", padding: "10px", background: "transparent", border: `1px solid rgba(0,0,0,0.12)`, borderRadius: "8px", color: "rgba(0,0,0,0.4)", fontSize: "13px", cursor: "pointer" }}>
            Cancel
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
    setResultUrl(null); setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width, height = img.height;
        // Scale down if too large (max 1200px width)
        if (width > 1200) {
          height = (height * 1200) / width;
          width = 1200;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL(file.type || "image/jpeg", 0.85);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    console.log("Payment redirect check:", { paymentIntentId, redirectStatus });

    if (paymentIntentId && redirectStatus === "succeeded") {
      window.history.replaceState({}, "", window.location.pathname);
      const savedBase64 = sessionStorage.getItem("pendingImageBase64");
      const savedMime = sessionStorage.getItem("pendingImageMime");
      const savedType = sessionStorage.getItem("pendingProductType") as "winner" | "panini" | null;
      const savedName = sessionStorage.getItem("pendingPlayerName") || "";

      console.log("Payment succeeded, generating image:", { hasSavedBase64: !!savedBase64, savedType, savedName });

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
        setError(null);

        setTimeout(() => {
          fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: savedBase64,
              imageMime: savedMime || "image/jpeg",
              paymentIntentId,
              type: savedType || "winner",
              playerName: savedName
            })
          })
            .then((r) => {
              console.log("Generation response status:", r.status);
              return r.json();
            })
            .then((data) => {
              console.log("Generation data:", { hasError: !!data.error, hasImageUrl: !!data.imageUrl });
              if (data.error) {
                setError(data.error);
                setGenerating(false);
              } else if (data.imageUrl) {
                setResultUrl(data.imageUrl);
                setGenerating(false);
              } else {
                setError("No image returned");
                setGenerating(false);
              }
            })
            .catch((err) => {
              console.error("Generation error:", err);
              setError("Generation failed — try again: " + err.message);
              setGenerating(false);
            });
        }, 500);
      } else {
        setError("Payment succeeded but image data not found. Please try again.");
      }
    }
  }, []);

  const handleGenerateClick = async () => {
    if (!imageBase64) return;
    setError(null);
    const res = await fetch("/api/payment", { method: "POST" });
    const { clientSecret: cs } = await res.json();
    setClientSecret(cs); setShowPayment(true);
  };

  return (
    <div className="zellige-bg" style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: C.dark, position: "relative" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        @keyframes flagWave { 0%, 100% { transform: skewX(0deg) scaleY(1); } 25% { transform: skewX(-6deg) scaleY(0.97); } 50% { transform: skewX(6deg) scaleY(1.03); } 75% { transform: skewX(-4deg) scaleY(0.98); } }
        .btn-generate:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 32px rgba(193,39,45,0.35) !important; }
        .btn-upload:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; }
        .product-card:hover { border-color: ${C.gold} !important; transform: translateY(-2px); }
        .result-card { animation: fadeInUp 0.5s ease forwards; }
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
        /* Zellige background pattern */
        .zellige-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          opacity: 0.04;
          pointer-events: none;
          z-index: 0;
          background-image:
            repeating-linear-gradient(45deg, ${C.red} 0, ${C.red} 1px, transparent 0, transparent 50%),
            repeating-linear-gradient(-45deg, ${C.gold} 0, ${C.gold} 1px, transparent 0, transparent 50%);
          background-size: 28px 28px;
        }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `3px solid ${C.red}`, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        {/* Top strip: Moroccan flag colors */}
        <div style={{ height: "4px", background: `linear-gradient(90deg, ${C.red} 0%, ${C.red} 50%, ${C.green} 50%, ${C.green} 100%)` }} />
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(8px, 2vw, 12px) clamp(12px, 4vw, 24px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "clamp(8px, 2vw, 16px)" }}>
          {/* Left flag */}
          <div style={{ display: "flex", alignItems: "center", width: "clamp(30px, 8vw, 48px)", minWidth: 0 }}>
            <MoroccanFlag delay={0} />
          </div>

          {/* Center title */}
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 14px)", flex: 1, justifyContent: "center", minWidth: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(14px, 5vw, 24px)", fontWeight: 900, color: C.dark, letterSpacing: "clamp(1px, 1vw, 3px)", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                MOROCCO <span style={{ color: C.red }}>2026</span>
              </div>
              <div style={{ fontSize: "clamp(7px, 1.5vw, 9px)", color: C.gold, letterSpacing: "clamp(1px, 0.5vw, 2px)", textTransform: "uppercase" as const, fontWeight: 700, whiteSpace: "nowrap" }}>
                FIFA WORLD CUP
              </div>
            </div>
          </div>

          {/* Right flag */}
          <div style={{ display: "flex", alignItems: "center", width: "clamp(30px, 8vw, 48px)", justifyContent: "flex-end", minWidth: 0 }}>
            <MoroccanFlag delay={0.2} />
          </div>
        </div>
      </header>

      {/* Main content: left sidebar | center | right sidebar */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "flex-start", gap: "clamp(12px, 3vw, 24px)", padding: "clamp(20px, 5vw, 32px) clamp(12px, 4vw, 24px) clamp(40px, 10vw, 80px)" }}>

        {/* Left side panel */}
        <div className="side-panel" style={{ width: "clamp(100px, 12vw, 160px)", flexShrink: 0, flexDirection: "column", alignItems: "center", gap: "clamp(12px, 2vw, 20px)", paddingTop: "16px" }}>
          <PaniniCard name="HASSNA" rotate={-4} imgSrc="/examples/panini-hassna.png" />
          <ChampionCard rotate={3} imgSrc="/examples/champion-1.png" />
          <PaniniCard name="YOUNES" rotate={-2} imgSrc="/examples/panini-younes.png" />
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: "640px", margin: "0 auto" }}>

          {/* Hero Banner - Creative Commercial Section */}
          <div style={{ background: `linear-gradient(135deg, ${C.red} 0%, #A82D32 50%, ${C.gold} 100%)`, borderRadius: "clamp(12px, 3vw, 16px)", padding: "clamp(20px, 5vw, 36px) clamp(16px, 4vw, 28px)", marginBottom: "clamp(16px, 4vw, 28px)", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(193,39,45,0.2)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.1) 0%, transparent 50%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "clamp(24px, 5vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: "2px", marginBottom: "12px" }}>
                BE A LEGEND
              </div>
              <div style={{ fontSize: "clamp(13px, 2.5vw, 16px)", color: "rgba(255,255,255,0.9)", marginBottom: "20px", fontWeight: 500 }}>
                Celebrate Morocco's World Cup glory. Create your moment.
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: "12px", padding: "12px 20px", fontSize: "14px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" } as React.CSSProperties}>
                  🏆 <span>Champion Photo</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: "12px", padding: "12px 20px", fontSize: "14px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" } as React.CSSProperties}>
                  ⚽ <span>Panini Card</span>
                </div>
              </div>
              <div style={{ fontSize: "clamp(32px, 8vw, 56px)", fontWeight: 900, color: "#fff", textShadow: "0 4px 12px rgba(0,0,0,0.2)", marginBottom: "4px" }}>
                €1.49
              </div>
              <div style={{ fontSize: "clamp(11px, 2vw, 13px)", color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: "12px", letterSpacing: "0.5px" }}>
                per photo
              </div>
              <div style={{ fontSize: "clamp(12px, 2vw, 13px)", color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "1px" }}>
                Limited Time • Instant Download • Share Your Glory
              </div>
            </div>
          </div>

          {/* Upload sectie */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: "12px" }}>
              ⚡ Step 1 — Choose Your Photo
            </div>

            {/* Hidden file inputs */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
            <input id="cameraInput" type="file" accept="image/*" capture="user" style={{ display: "none" }}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])} />

            {image ? (
              /* Uploaded image preview */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ background: dragOver ? C.cream : "#FAFAF8", border: `2px dashed ${dragOver ? C.gold : "rgba(168,134,44,0.3)"}`, borderRadius: "12px", padding: "20px", textAlign: "center", transition: "all 0.25s ease" }}>
                <img src={image} alt="Uploaded" style={{ maxHeight: "240px", maxWidth: "100%", borderRadius: "8px", border: `2px solid ${C.green}`, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", display: "block", margin: "0 auto 12px" }} />
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button onClick={() => fileRef.current?.click()} className="btn-upload" style={{ padding: "8px 18px", background: C.gold, border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}>
                    📤 Different Photo
                  </button>
                </div>
              </div>
            ) : (
              /* Two-button upload */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ background: dragOver ? C.cream : `linear-gradient(135deg, ${C.dark} 0%, #2a0808 60%, #0a1a0a 100%)`, borderRadius: "14px", padding: "24px 20px", transition: "all 0.25s ease" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "2px", textTransform: "uppercase" as const, textAlign: "center", marginBottom: "16px" }}>
                  ⚡ STEP 1: CHOOSE YOUR PHOTO
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={() => fileRef.current?.click()} className="btn-upload" style={{
                    flex: 1, padding: "16px", background: C.red, border: "none", borderRadius: "12px",
                    color: "#fff", fontSize: "16px", fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    letterSpacing: "1px", textTransform: "uppercase" as const, transition: "all 0.2s ease",
                    boxShadow: "0 4px 16px rgba(193,39,45,0.4)",
                  }}>
                    ↑ CHOOSE PHOTO
                  </button>
                  <button onClick={() => document.getElementById("cameraInput")?.click()} className="btn-upload" style={{
                    flex: 1, padding: "16px", background: C.red, border: "none", borderRadius: "12px",
                    color: "#fff", fontSize: "16px", fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    letterSpacing: "1px", textTransform: "uppercase" as const, transition: "all 0.2s ease",
                    boxShadow: "0 4px 16px rgba(193,39,45,0.4)",
                  }}>
                    📷 TAKE PHOTO
                  </button>
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", textAlign: "center", margin: "12px 0 0", letterSpacing: "0.5px" }}>
                  💡 Best result: clear face, good lighting, facing forward
                </p>
              </div>
            )}
          </div>

          {/* Mobile examples — 2 cards horizontal, only on small screens */}
          {!image && (
            <div className="mobile-examples" style={{ gap: "12px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
              <PaniniCard name="HASSNA" rotate={-2} imgSrc="/examples/panini-hassna.png" />
              <ChampionCard rotate={2} imgSrc="/examples/champion-1.png" />
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div style={{ background: `linear-gradient(135deg, ${C.red} 0%, ${C.gold} 100%)`, borderRadius: "12px", padding: "32px 24px", textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>✨ Creating Your Image</div>
              <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "12px" }} />
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)" }}>This usually takes 10-30 seconds...</div>
            </div>
          )}

          {/* Product selector */}
          {image && !resultUrl && !generating && (
            <>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: "10px", marginTop: "8px" }}>
                Step 2 — Choose Your Product
              </div>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                {([
                  { type: "winner" as const, icon: "🏆", title: "Champion Photo", desc: "You in the stadium with the World Cup" },
                  { type: "panini" as const, icon: "⚽", title: "Panini Card", desc: "Your own World Cup card" },
                ]).map(({ type, icon, title, desc }) => (
                  <div key={type} className="product-card" onClick={() => setProductType(type)} style={{
                    flex: 1, padding: "18px 14px", borderRadius: "12px", cursor: "pointer",
                    border: `2px solid ${productType === type ? C.gold : "rgba(0,0,0,0.1)"}`,
                    background: productType === type ? C.cream : "#fff",
                    boxShadow: productType === type ? `0 4px 20px rgba(168,134,44,0.15)` : "0 1px 6px rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease", textAlign: "center",
                    position: "relative" as const, overflow: "hidden",
                  }}>
                    {productType === type && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: C.gold }} />}
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>{icon}</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: productType === type ? C.dark : "#555", marginBottom: "4px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(0,0,0,0.45)", marginBottom: "10px" }}>{desc}</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: C.gold }}>€1,49</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Name input for Panini */}
          {image && !resultUrl && productType === "panini" && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.gold, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: "8px" }}>
                Step 3 — Your Name on the Card
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="E.g. KARIM or YOUNES"
                maxLength={20}
                style={{
                  width: "100%", padding: "13px 16px", boxSizing: "border-box",
                  background: "#fff", border: `2px solid ${playerName ? C.gold : "rgba(0,0,0,0.12)"}`,
                  borderRadius: "8px", color: C.dark, fontSize: "15px", fontWeight: 600,
                  outline: "none", transition: "border-color 0.2s ease", letterSpacing: "1px",
                }}
              />
            </div>
          )}

          {/* Generate button */}
          {image && !resultUrl && !generating && (
            <button className="btn-generate" onClick={handleGenerateClick} disabled={generating} style={{
              width: "100%", padding: "18px",
              background: generating ? "rgba(193,39,45,0.5)" : C.red,
              border: "none", borderRadius: "10px", color: "#fff",
              fontSize: "17px", fontWeight: 800, cursor: generating ? "not-allowed" : "pointer",
              transition: "all 0.25s ease", letterSpacing: "1px", textTransform: "uppercase" as const,
              marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              boxShadow: generating ? "none" : "0 4px 20px rgba(193,39,45,0.25)",
            }}>
              {generating
                ? <><span style={{ width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Generating...</>
                : productType === "panini" ? "⚽ Generate Panini Card — €1.49" : "🏆 Generate Champion Photo — €1.49"}
            </button>
          )}

          {error && (
            <div style={{ background: "#FFF0F0", border: `1px solid rgba(193,39,45,0.3)`, borderRadius: "8px", padding: "12px 16px", color: C.red, fontSize: "14px", marginBottom: "20px", textAlign: "center", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div className="result-card" style={{ background: "#fff", border: `2px solid ${C.gold}`, borderRadius: "16px", padding: "24px", boxShadow: "0 8px 40px rgba(168,134,44,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "40px", height: "2px", background: C.red }} />
                <div style={{ fontSize: "13px", fontWeight: 800, color: C.gold, letterSpacing: "3px", textTransform: "uppercase" as const }}>YOU ARE A WORLD CHAMPION</div>
                <div style={{ width: "40px", height: "2px", background: C.green }} />
              </div>
              <img src={resultUrl} alt="Your Champion Photo" style={{ width: "100%", borderRadius: "10px", border: `1px solid rgba(0,0,0,0.08)`, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", display: "block" }} />
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href={resultUrl} download="morocco-2026-champion.jpg" style={{
                  background: C.red, borderRadius: "8px", color: "#fff",
                  padding: "12px 28px", fontSize: "14px", fontWeight: 700,
                  letterSpacing: "1px", textDecoration: "none", display: "inline-block", textTransform: "uppercase" as const,
                }}>⬇ Download & Share</a>
                <button onClick={() => { setImage(null); setImageBase64(null); setResultUrl(null); }} style={{
                  background: "#fff", border: `2px solid ${C.gold}`, borderRadius: "8px",
                  color: C.gold, padding: "12px 24px", fontSize: "13px", cursor: "pointer", fontWeight: 700,
                }}>New Photo</button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(168,134,44,0.2)" }} />
            <MoroccanStar size={16} color={C.gold} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.25)", letterSpacing: "2px", textTransform: "uppercase" as const }}>MOROCCO 2026 · FIFA WORLD CUP</span>
            <MoroccanStar size={16} color={C.gold} style={{ opacity: 0.5 }} />
            <div style={{ flex: 1, height: "1px", background: "rgba(168,134,44,0.2)" }} />
          </div>
        </div>

        {/* Right side panel */}
        <div className="side-panel" style={{ width: "clamp(100px, 12vw, 160px)", flexShrink: 0, flexDirection: "column", alignItems: "center", gap: "clamp(12px, 2vw, 20px)", paddingTop: "16px" }}>
          <ChampionCard rotate={-3} imgSrc="/examples/champion-2.png" />
          <PaniniCard name="HICHAM" rotate={4} imgSrc="/examples/panini-hicham.png" />
          <ChampionCard rotate={-2} imgSrc="/examples/champion-3.png" />
        </div>
      </div>

      {/* Stripe modal */}
      {showPayment && clientSecret && imageBase64 && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: C.red, colorBackground: "#ffffff", borderRadius: "8px" } } }}>
          <CheckoutForm
            imageBase64={imageBase64} imageMime={imageMime}
            productType={productType} playerName={playerName}
            clientSecret={clientSecret}
            onSuccess={(url) => { setShowPayment(false); setResultUrl(url); }}
            onCancel={() => setShowPayment(false)}
          />
        </Elements>
      )}
    </div>
  );
}
