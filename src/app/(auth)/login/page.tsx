"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0d1410" }}
    >
      <div className="w-full flex flex-col items-center gap-8" style={{ maxWidth: 400, padding: "0 16px" }}>
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-[10px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #244a32, #15301f)",
              border: "1px solid #284d36",
            }}
          >
            <span
              className="text-lg font-bold"
              style={{ color: "#9be03a", fontFamily: "var(--font-mono)" }}
            >
              S
            </span>
          </div>
          <div className="text-center">
            <div
              className="uppercase font-bold tracking-widest"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                letterSpacing: "0.12em",
                color: "#e6efe8",
              }}
            >
              SHOGUN
            </div>
            <div style={{ fontSize: 12, color: "#6e7a70", marginTop: 2 }}>
              Central · v2
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full"
          style={{
            background: "#141f18",
            border: "1px solid #1f2a23",
            borderRadius: 10,
            padding: 32,
          }}
        >
          <div className="mb-6">
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e6efe8",
                marginBottom: 4,
              }}
            >
              Acessar plataforma
            </h1>
            <p style={{ fontSize: 13, color: "#6e7a70" }}>
              Entre com suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6e7a70",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{
                  width: "100%",
                  background: "#0f1813",
                  border: "1px solid #1f2a23",
                  borderRadius: 8,
                  color: "#e6efe8",
                  fontSize: 13,
                  padding: "9px 14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7DC128")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1f2a23")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6e7a70",
                  marginBottom: 6,
                }}
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  background: "#0f1813",
                  border: "1px solid #1f2a23",
                  borderRadius: 8,
                  color: "#e6efe8",
                  fontSize: 13,
                  padding: "9px 14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7DC128")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1f2a23")}
              />
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(216,90,74,0.12)",
                  border: "1px solid rgba(216,90,74,0.25)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  fontSize: 13,
                  color: "#d85a4a",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#4a5a30" : "#7DC128",
                color: "#0a1408",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
