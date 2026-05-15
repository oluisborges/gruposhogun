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
    <div className="min-h-screen flex items-center justify-center bg-[#0d1410]">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #244a32, #15301f)",
                border: "1px solid #284d36",
              }}
            >
              <span className="text-sm font-bold text-[#9be03a]" style={{ fontFamily: "var(--font-mono)" }}>S</span>
            </div>
            <span
              className="text-xl font-bold uppercase tracking-wide text-[#e6efe8]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Grupo Shogun
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#e6efe8]">Acessar plataforma</h1>
          <p className="text-[#6e7a70] text-sm">
            Entre com suas credenciais para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a8b3aa]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 bg-[#0f1813] border border-[#1f2a23] rounded-md text-[#e6efe8] placeholder:text-[#6e7a70] focus:outline-none focus:ring-2 focus:ring-[#7DC128] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a8b3aa]" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#0f1813] border border-[#1f2a23] rounded-md text-[#e6efe8] placeholder:text-[#6e7a70] focus:outline-none focus:ring-2 focus:ring-[#7DC128] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="text-[#d85a4a] text-sm bg-[rgba(216,90,74,0.12)] border border-[rgba(216,90,74,0.2)] rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7DC128] hover:bg-[#9be03a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0a1408] font-bold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
