import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { forwardRef, useState } from "react";

type FieldErrorProps = {
  message?: string;
};

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

type GoogleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

/* ─── SVG Icon helpers ─────────────────────────────────────────── */
export function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-sky-400">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}
export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-sky-400">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-sky-400">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  );
}
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a18.2 18.2 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─── Floating animated particles ──────────────────────────────── */
function Particles() {
  const items = [
    { char: "日", x: "8%",  y: "18%", size: "text-3xl", delay: "0s",   dur: "8s" },
    { char: "本",  x: "48%", y: "12%", size: "text-2xl", delay: "1.5s", dur: "10s" },
    { char: "語",  x: "15%", y: "72%", size: "text-4xl", delay: "2.5s", dur: "9s"  },
    { char: "学",  x: "52%", y: "65%", size: "text-2xl", delay: "0.8s", dur: "11s" },
    { char: "習",  x: "30%", y: "8%",  size: "text-xl",  delay: "3.2s", dur: "7s"  },
    { char: "文",  x: "58%", y: "45%", size: "text-3xl", delay: "1.9s", dur: "12s" },
    { char: "字",  x: "3%",  y: "45%", size: "text-2xl", delay: "4s",   dur: "8.5s"},
    { char: "話",  x: "40%", y: "88%", size: "text-3xl", delay: "2s",   dur: "9.5s"},
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 2 }}>
      {items.map(({ char, x, y, size, delay, dur }, i) => (
        <span
          key={i}
          className={`absolute ${size} font-bold select-none`}
          style={{
            left: x, top: y,
            color: "rgba(255,255,255,0.22)",
            textShadow: "0 0 12px rgba(56,189,248,0.5)",
            animationName: "floatKanji",
            animationDuration: dur,
            animationDelay: delay,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: i % 2 === 0 ? "normal" : "reverse",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

/* ─── AuthShell ─────────────────────────────────────────────────── */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="auth-fullscreen-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .auth-fullscreen-root {
          font-family: 'Inter', sans-serif;
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #020d1a;
          display: flex;
          justify-content: flex-end;
        }

        /* Video background across the full page (left 2/3 focus) */
        .auth-bg-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        /* Subtle dark gradient overlay so left area is cinematic and text pop */
        .auth-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            rgba(2, 13, 26, 0.35) 0%,
            rgba(2, 13, 26, 0.15) 60%,
            rgba(2, 13, 26, 0.4) 100%
          );
          z-index: 1;
        }

        /* Left 2/3 Hero Section */
        .auth-hero-left {
          position: relative;
          z-index: 3;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem 4rem;
          pointer-events: none;
        }

        .auth-hero-header {
          pointer-events: auto;
        }

        .auth-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          border-radius: 999px;
          background: rgba(4, 22, 40, 0.65);
          border: 1px solid rgba(56, 189, 248, 0.35);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          margin-bottom: 1.25rem;
        }

        .auth-hero-title {
          font-size: 42px;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.8px;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
          line-height: 1.15;
        }

        .auth-icons-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 1rem;
        }

        .auth-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          display: grid;
          place-items: center;
          font-size: 20px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          transition: transform 0.2s;
        }
        .auth-icon-badge:hover {
          transform: translateY(-3px) scale(1.05);
        }

        .auth-hero-footer-tag {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          border-radius: 999px;
          background: rgba(4, 22, 40, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.3);
          backdrop-filter: blur(16px);
          color: #bae6fd;
          font-size: 13px;
          font-weight: 600;
          width: fit-content;
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        }

        /* Right 1/3 Sidebar Login Panel anchored to the far right with ultra-transparent glass & hover illumination */
        .auth-form-right {
          position: relative;
          z-index: 4;
          width: 460px;
          max-width: 90vw;
          height: 100vh;
          background: rgba(2, 8, 18, 0.10);
          backdrop-filter: blur(4px);
          border-left: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: -6px 0 24px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 1.5rem 2.25rem;
          overflow-y: auto;
          transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .auth-form-right:hover {
          background: rgba(2, 12, 28, 0.38);
          backdrop-filter: blur(12px);
          border-left-color: rgba(56, 189, 248, 0.35);
          box-shadow: -10px 0 40px rgba(14, 165, 233, 0.12);
        }


        @media (max-width: 900px) {
          .auth-fullscreen-root {
            flex-direction: column;
            overflow-y: auto;
          }
          .auth-hero-left {
            padding: 2rem 1.5rem;
            min-height: auto;
          }
          .auth-form-right {
            width: 100%;
            max-width: 100vw;
            height: auto;
            min-height: 100vh;
            border-left: none;
            border-top: 1px solid rgba(56, 189, 248, 0.25);
          }
        }

        /* Animations */
        @keyframes floatKanji {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          33%       { transform: translateY(-20px) rotate(3deg); opacity: 1; }
          66%       { transform: translateY(10px) rotate(-3deg); opacity: 0.7; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.3), 0 0 40px rgba(14,165,233,0.1); }
          50%       { box-shadow: 0 0 35px rgba(14,165,233,0.5), 0 0 70px rgba(14,165,233,0.2); }
        }

        /* Secure badge */
        .auth-secure-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 14px 5px 5px;
          border-radius: 999px;
          background: rgba(14,165,233,0.18);
          border: 1px solid rgba(56,189,248,0.35);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #7dd3fc;
          margin-bottom: 1rem;
          backdrop-filter: blur(8px);
          transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
        }
        .auth-secure-badge:hover {
          background: rgba(14,165,233,0.35);
          border-color: #38bdf8;
          box-shadow: 0 0 15px rgba(56,189,248,0.4);
        }
        .auth-secure-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 10px rgba(52,211,153,0.8);
          animation: glowPulse 2s ease-in-out infinite;
        }

        /* Form title */
        .auth-form-title {
          font-size: 28px;
          font-weight: 700;
          color: #f0f9ff;
          letter-spacing: -0.5px;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #ffffff 30%, #7dd3fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        /* Input field with high translucency & hover color pop */
        .auth-input-wrap {
          position: relative;
        }
        .auth-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .auth-input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px 13px 42px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.22);
          background: rgba(4, 22, 40, 0.25);
          color: #ffffff;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          backdrop-filter: blur(8px);
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .auth-input::placeholder { color: rgba(224,242,254,0.65); }
        .auth-input:hover {
          border-color: rgba(56,189,248,0.55);
          background: rgba(14,165,233,0.18);
          box-shadow: 0 0 16px rgba(14,165,233,0.25);
        }
        .auth-input:focus {
          border-color: #38bdf8;
          background: rgba(14,165,233,0.28);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.35), 0 0 24px rgba(14,165,233,0.4);
        }
        .auth-input.error {
          border-color: #f87171;
        }
        .auth-input.has-toggle { padding-right: 46px; }

        /* Eye toggle */
        .auth-eye-btn {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(224,242,254,0.75);
          padding: 2px;
          transition: color 0.2s;
        }
        .auth-eye-btn:hover { color: #38bdf8; }

        /* Field label */
        .auth-field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #e0f2fe;
          margin-bottom: 7px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        }

        /* Submit button */
        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.25);
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          letter-spacing: 0.02em;
          color: white;
          background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%);
          background-size: 200%;
          box-shadow: 0 8px 24px rgba(14,165,233,0.4), 0 2px 6px rgba(14,165,233,0.2);
          transition: transform 0.2s, box-shadow 0.25s, background-position 0.4s, border-color 0.25s;
          animation: glowPulse 3s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .auth-submit-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg);
          animation: shimmer 3s linear infinite 1s;
        }
        .auth-submit-btn:hover {
          transform: translateY(-2px);
          border-color: #7dd3fc;
          box-shadow: 0 0 30px rgba(14,165,233,0.6), 0 0 50px rgba(56,189,248,0.35);
          background-position: right;
        }
        .auth-submit-btn:active { transform: translateY(0); }
        .auth-submit-btn:disabled {
          cursor: not-allowed; opacity: 0.55;
          transform: none; animation: none;
        }

        /* Google button with hover highlight */
        .auth-google-btn {
          width: 100%;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.08);
          color: #f0f9ff;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          backdrop-filter: blur(8px);
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
          transition: border-color 0.25s, background 0.25s, transform 0.2s, box-shadow 0.25s;
        }
        .auth-google-btn:hover {
          border-color: #38bdf8;
          background: rgba(14,165,233,0.25);
          transform: translateY(-1px);
          box-shadow: 0 0 24px rgba(14,165,233,0.35);
        }
        .auth-google-btn:disabled { cursor: not-allowed; opacity: 0.55; }

        /* Divider */
        .auth-divider {
          display: flex; align-items: center; gap: 14px;
          margin: 1.5rem 0;
        }
        .auth-divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgba(56,189,248,0.3), transparent);
        }
        .auth-divider-text {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(148,163,184,0.7);
          padding: 4px 12px;
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 999px;
          background: rgba(255,255,255,0.03);
        }

        /* Link colors */
        .auth-link {
          color: #38bdf8;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .auth-link:hover { color: #7dd3fc; }
      `}</style>

      {/* Full-screen video background - 100% clean and unobstructed */}
      <video
        className="auth-bg-video"
        src="https://res.cloudinary.com/keticbsk/video/upload/v1785993263/M%C3%80N_H%C3%8CNH_CH%E1%BB%8CN_T%C6%AF%E1%BB%9ANG_-_%C4%90I%C3%8AU_THUY%E1%BB%80N_NH%E1%BA%ACT_NGUY%E1%BB%86T_TH%C3%81NH_LINH_-_Garena_Li%C3%AAn_Qu%C3%A2n_Mobile_1_ac7jpy.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="auth-bg-overlay" />
      <Particles />

      {/* 1/3 Right Sidebar Login Panel (Contains Title & Form) */}
      <div className="auth-form-right">
        <div style={{ width: "100%", maxWidth: 380, margin: "0 auto" }}>
          {/* Brand Header */}
          <div style={{ marginBottom: "0.85rem" }}>
            <div
              className="auth-brand-badge"
              style={{
                marginBottom: "0.5rem",
                background: "linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(56, 189, 248, 0.25) 100%)",
                border: "1px solid rgba(244, 114, 182, 0.45)",
                boxShadow: "0 4px 20px rgba(236, 72, 153, 0.25)",
              }}
            >
              <span style={{ fontSize: 16 }}>🌸</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #ffffff 0%, #f472b6 60%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                J-Tech • Japanese Learning
              </span>
            </div>

            <h1
              style={{
                fontSize: 27,
                fontWeight: 800,
                margin: "0 0 6px",
                letterSpacing: "-0.6px",
                lineHeight: 1.2,
                background: "linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 8px rgba(14, 165, 233, 0.3))",
              }}
            >
Xây dựng cộng đồng lịch sử Việt Nam
            </h1>

            {/* Quick feature micro-badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {[
                { label: "📰 Lịch sử Việt Nam", color: "#38bdf8", bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.3)" },
                { label: "👥 Cộng đồng", color: "#f472b6", bg: "rgba(244,114,182,0.15)", border: "rgba(244,114,182,0.3)" },
                { label: "🔒 Bảo mật JWT", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)" },
              ].map(({ label, color, bg, border }) => (
                <span
                  key={label}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 999,
                    padding: "2px 8px",
                    letterSpacing: "0.03em",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              height: 2,
              borderRadius: 2,
              background: "linear-gradient(90deg, #f472b6 0%, #38bdf8 50%, transparent 100%)",
              marginBottom: "0.75rem",
              boxShadow: "0 0 10px rgba(56, 189, 248, 0.5)",
            }}
          />

          {/* Secure badge */}
          <div
            className="auth-secure-badge"
            style={{
              marginBottom: "0.4rem",
              background: "linear-gradient(90deg, rgba(52, 211, 153, 0.15), rgba(56, 189, 248, 0.15))",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              color: "#6ee7b7",
            }}
          >
            <span className="auth-secure-dot" />
            Secure access
          </div>

          {/* Form Page Title (Sign in / Register) */}
          <h2
            className="auth-form-title"
            style={{
              fontSize: 23,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 30%, #7dd3fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: 12, color: "rgba(186, 230, 253, 0.85)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
            {description}
          </p>

          {children}

          {footer ? <div style={{ marginTop: "0.75rem" }}>{footer}</div> : null}

        </div>
      </div>
    </div>


  );
}

/* ─── TextField ─────────────────────────────────────────────────── */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, icon, className = "", type: typeProp, ...props }, ref) => {
    const [showPwd, setShowPwd] = useState(false);
    const isPassword = typeProp === "password";
    const resolvedType = isPassword ? (showPwd ? "text" : "password") : typeProp;

    return (
      <label className="block" style={{ marginBottom: 4 }}>
        <span className="auth-field-label">{label}</span>
        <div className="auth-input-wrap">
          {icon && <span className="auth-input-icon">{icon}</span>}
          <input
            {...props}
            ref={ref}
            type={resolvedType}
            className={`auth-input${error ? " error" : ""}${isPassword ? " has-toggle" : ""}${className}`}
            style={{ paddingLeft: icon ? 42 : 14 }}
          />
          {isPassword && (
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPwd} />
            </button>
          )}
        </div>
        {error ? <FieldError message={error} /> : null}
      </label>
    );
  }
);

TextField.displayName = "TextField";

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p style={{ marginTop: 6, fontSize: 12, color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 13, height: 13, flexShrink: 0 }}>
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

/* ─── AuthButton ────────────────────────────────────────────────── */
export function AuthButton({ children, isLoading, className = "", disabled, ...props }: ButtonProps) {
  return (
    <button {...props} disabled={disabled || isLoading} className={`auth-submit-btn ${className}`}>
      {isLoading ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
}

/* ─── GoogleButton ──────────────────────────────────────────────── */
export function GoogleButton({ children, isLoading, className = "", disabled, ...props }: GoogleButtonProps) {
  return (
    <button {...props} disabled={disabled || isLoading} className={`auth-google-btn ${className}`}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
        <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: 14, height: 14 }}>
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.659 29.325 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.967 3.038l5.657-5.657C34.956 6.053 29.715 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.652-.389-3.917z" />
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.967 3.038l5.657-5.657C34.956 6.053 29.715 4 24 4c-7.682 0-14.373 4.33-17.694 10.691z" />
          <path fill="#4CAF50" d="M24 44c5.623 0 10.72-2.154 14.606-5.657l-6.735-5.382C29.803 34.411 27.028 36 24 36c-5.304 0-9.625-3.319-11.288-7.946l-6.52 5.025C9.466 39.556 16.227 44 24 44z" />
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.432 5.961l.003-.002 6.735 5.382C37.129 36.989 40 31.058 40 24c0-1.341-.138-2.652-.389-3.917z" />
        </svg>
      </span>
      {isLoading ? "Loading..." : children}
    </button>
  );
}

/* ─── AuthDivider ───────────────────────────────────────────────── */
export function AuthDivider() {
  return (
    <div className="auth-divider">
      <span className="auth-divider-line" />
      <span className="auth-divider-text">or</span>
      <span className="auth-divider-line" />
    </div>
  );
}
