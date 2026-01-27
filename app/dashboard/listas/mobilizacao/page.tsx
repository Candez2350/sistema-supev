"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Trash2, Edit, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobilizationList() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Verificar Perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, coordination_id")
      .eq("id", user.id)
      .single();

    // Verificação de segurança para o TypeScript
    if (!profile) {
        setLoading(false);
        return;
    }

    const admin = profile.role === 'admin';
    setIsAdmin(admin);

    // 2. Buscar Dados
    let query = supabase
      .from("mobilizations")
      .select("*, coordinations(name)")
      .order('date_event', { ascending: false });

    // Se não for admin, filtra pela coordenação do usuário
    if (!admin && profile.coordination_id) {
        query = query.eq('coordination_id', profile.coordination_id);
    }

    const { data: result, error } = await query;
    
    if (error) {
        console.error("Erro ao buscar dados:", error);
    } else {
        setData(result || []);
    }
    setLoading(false);
  }

  const handleDelete = async (id: number) => {
      if(!confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;
      
      const { error } = await supabase.from("mobilizations").delete().eq("id", id);
      
      if (error) {
          alert("Erro ao excluir: " + error.message);
      } else {
          // Remove da lista visualmente
          setData(prev => prev.filter(item => item.id !== id));
      }
  };

  // Filtro Local (Busca)
  const filteredData = data.filter(item => 
      item.action_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.municipalities?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-primary-dark">Registros de Mobilização</h1>
            <p className="text-sm text-gray-500">Histórico de ações realizadas.</p>
        </div>
        
        <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar ação ou município..." 
                className="w-full md:w-80 pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary outline-none transition-all focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/50">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Ação</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4 text-center">Pessoas</th>
                        <th className="px-6 py-4">Municípios</th>
                        {isAdmin && <th className="px-6 py-4">Coordenação</th>}
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="text-center py-10"><div className="flex justify-center"><Loader2 className="animate-spin text-primary" /></div></td></tr>
                    ) : filteredData.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
                    ) : (
                        filteredData.map((item) => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-primary/5 transition-colors">
                                <td className="px-6 py-4 font-medium whitespace-nowrap">{new Date(item.date_event).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 font-bold text-primary-dark">{item.action_name}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold whitespace-nowrap">{item.mobilization_type}</span>
                                </td>
                                <td className="px-6 py-4 text-center">{item.participants_count}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={item.municipalities}>{item.municipalities}</td>
                                {isAdmin && <td className="px-6 py-4 text-xs text-gray-500">{item.coordinations?.name || '-'}</td>}
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => router.push(`/dashboard/formularios/mobilizacao?id=${item.id}`)} // <--- LINK DE EDIÇÃO
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                        title="Editar"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}