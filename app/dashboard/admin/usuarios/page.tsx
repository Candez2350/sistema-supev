"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase"; // Caminho relativo
import { 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  Mail,
  Lock,
  User,
  Building
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [coordinations, setCoordinations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    coordination_id: "",
    role: "user" // 'user' ou 'admin'
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== 'admin') {
        alert("Acesso negado.");
        router.push("/dashboard");
        return;
    }

    // Buscar Usuários (Profiles + Nome da Coordenação)
    fetchUsers();
    
    // Buscar Lista de Coordenações para o Select
    const { data: coords } = await supabase.from("coordinations").select("*");
    if (coords) setCoordinations(coords);
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, coordinations(name)")
      .order("created_at", { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("ATENÇÃO: Isso excluirá o acesso deste usuário. Confirmar?")) return;

    // Nota: Deletar usuário do Supabase Auth pelo Client-side não é permitido por segurança.
    // Aqui deletamos o perfil. O Auth user ficaria "ativo" mas sem perfil.
    // O correto seria ter uma API route para deletar do Auth também.
    // Para simplificar, vamos deletar o perfil, o que já bloqueia o acesso ao sistema (pois verificamos profile).
    
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
        alert("Erro ao excluir perfil: " + error.message);
    } else {
        setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      alert("Usuário criado com sucesso!");
      setShowModal(false);
      setFormData({ full_name: "", email: "", password: "", coordination_id: "", role: "user" });
      fetchUsers(); // Recarrega a lista

    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando painel administrativo...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/70 backdrop-blur-xl border border-white/50 p-6 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                <ShieldAlert size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
                <p className="text-sm text-gray-500">Crie logins e atribua coordenações.</p>
            </div>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
        >
            <UserPlus size={20} />
            Novo Usuário
        </button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/50">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Coordenação</th>
                        <th className="px-6 py-4">Função</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {user.full_name?.substring(0,2).toUpperCase()}
                                </div>
                                {user.full_name}
                            </td>
                            <td className="px-6 py-4">{user.email || "Sem email registrado"}</td>
                            <td className="px-6 py-4">
                                {user.coordinations?.name ? (
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 text-xs font-bold">
                                        {user.coordinations.name}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 italic">Não vinculado</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {user.role === 'admin' ? (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded border border-yellow-200 text-xs font-bold flex items-center w-fit gap-1">
                                        <ShieldAlert size={12}/> ADMIN
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">Usuário</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Revogar Acesso"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal de Criação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-10 p-8 animate-in zoom-in duration-300">
                
                <h2 className="text-2xl font-bold text-primary-dark mb-6">Cadastrar Novo Usuário</h2>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                required
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none"
                                placeholder="João da Silva"
                                value={formData.full_name}
                                onChange={e => setFormData({...formData, full_name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full pl-10 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none"
                                    placeholder="email@rj.gov.br"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1">Senha Provisória</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    className="w-full pl-10 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none"
                                    placeholder="123456"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">Coordenação</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select 
                                required
                                className="w-full pl-10 p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary outline-none appearance-none"
                                value={formData.coordination_id}
                                onChange={e => setFormData({...formData, coordination_id: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {coordinations.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1">Nível de Acesso</label>
                        <div className="flex gap-4 mt-2">
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer text-center font-bold text-sm transition-all ${formData.role === 'user' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
                                <input type="radio" name="role" value="user" checked={formData.role === 'user'} onChange={() => setFormData({...formData, role: 'user'})} className="hidden" />
                                Usuário Comum
                            </label>
                            <label className={`flex-1 p-3 rounded-xl border cursor-pointer text-center font-bold text-sm transition-all ${formData.role === 'admin' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-500 border-gray-200'}`}>
                                <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={() => setFormData({...formData, role: 'admin'})} className="hidden" />
                                Administrador
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-primary-dark transition-all flex justify-center items-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : "Criar Usuário"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
      )}

    </div>
  );
}