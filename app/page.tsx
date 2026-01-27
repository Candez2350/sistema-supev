import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-main-gradient relative overflow-hidden">
      
      {/* Decoração de Fundo (Bolhas) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-300/30 rounded-full blur-[100px]" />

      {/* Cartão de Vidro Central */}
      <div className="z-10 w-full max-w-lg mx-4 bg-white/40 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-10 text-center animate-in fade-in zoom-in duration-700">
        
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
             <span className="text-3xl font-bold text-white">S</span>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-primary-dark mb-2 tracking-tight">
          SUPEV
        </h1>
        <p className="text-lg text-primary font-medium mb-8">
          Sistema Unificado de Coordenações
        </p>

        <div className="space-y-4">
          <Link href="/login" className="group block w-full">
            <button className="w-full py-4 bg-primary hover:bg-primary-dark text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
              Acessar Painel
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

          <p className="text-sm text-gray-500 mt-6">
            Acesso restrito a servidores autorizados.
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 text-xs text-gray-400 font-medium">
        Governo do Estado do Rio de Janeiro © 2026
      </div>
    </main>
  );
}