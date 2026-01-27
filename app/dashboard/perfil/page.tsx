"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Lock, Save, Loader2, CheckCircle, Shield } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwords.newPassword.length < 6) {
      setMessage({ type: 'error', text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: "As senhas não coincidem." });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwords.newPassword
    });

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: "Erro ao atualizar: " + error.message });
    } else {
      setMessage({ type: 'success', text: "Senha atualizada com sucesso!" });
      setPasswords({ newPassword: "", confirmPassword: "" });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white/70 backdrop-blur-md border border-white/60 shadow-2xl rounded-3xl p-8 animate-in fade-in zoom-in duration-500 mt-10">
        
        <div className="mb-8 border-b border-primary/10 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Meu Perfil</h1>
            <p className="text-gray-600 text-sm">Gerencie suas credenciais de acesso.</p>
          </div>
          <div className="h-12 w-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
            <Shield size={24} />
          </div>
        </div>

        {message && (
            <div className={`p-4 mb-6 rounded-xl flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {message.type === 'success' ? <CheckCircle size={18}/> : <Lock size={18}/>}
                {message.text}
            </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Nova Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        required
                        placeholder="••••••"
                        className="w-full pl-10 p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                        value={passwords.newPassword}
                        onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        required
                        placeholder="••••••"
                        className="w-full pl-10 p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                        value={passwords.confirmPassword}
                        onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                    />
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-6 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Atualizar Senha</>}
            </button>
        </form>
    </div>
  );
}