"use client";

import { useState } from "react";
// Correção do import usando caminho relativo
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Credenciais inválidas. Tente novamente.");
      setLoading(false);
    } else {
      router.push("/dashboard"); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-main-gradient relative">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[20%] right-[10%] w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[20%] left-[10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white/60 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-white/50 z-10 mx-4 animate-in slide-in-from-bottom-5 duration-500">
        
        <div className="flex justify-start mb-6">
            <Link href="/" className="text-sm text-gray-500 hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft size={16} /> Voltar
            </Link>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-primary-dark">Bem-vindo de volta</h2>
          <p className="text-gray-500 text-sm">Insira suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400"
              placeholder="seu.email@rj.gov.br"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100/50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <span>Entrar</span>}
          </button>
        </form>
      </div>
    </div>
  );
}