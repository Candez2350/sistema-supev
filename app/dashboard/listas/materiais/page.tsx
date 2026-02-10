"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Trash2, Edit, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MaterialsList() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, coordination_id")
        .eq("id", user.id)
        .single();
    
    if (!profile) {
        setLoading(false);
        return;
    }

    const admin = profile.role === 'admin';
    setIsAdmin(admin);

    let query = supabase
        .from("materials_delivered")
        .select("*, coordinations(name)")
        .order('date_delivery', { ascending: false });

    if (!admin && profile.coordination_id) {
        query = query.eq('coordination_id', profile.coordination_id);
    }
    
    const { data: result, error } = await query;
    if (!error) setData(result || []);
    setLoading(false);
  }

  const handleDelete = async (id: number) => {
      if(!confirm("Deseja excluir este registro de entrega?")) return;
      const { error } = await supabase.from("materials_delivered").delete().eq("id", id);
      if (!error) setData(prev => prev.filter(item => item.id !== id));
      else alert("Erro ao excluir: " + error.message);
  };

  const filteredData = data.filter(item => 
      item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.municipality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-primary-dark">Materiais Entregues</h1>
            <p className="text-sm text-gray-500">Controle de saídas de estoque.</p>
        </div>
        <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar material, destino..." className="w-full md:w-80 pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/50">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Material</th>
                        <th className="px-6 py-4">Qtd</th>
                        <th className="px-6 py-4">Destinatário</th>
                        <th className="px-6 py-4">Município</th>
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
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                    {/* CORREÇÃO AQUI: Adicionado { timeZone: 'UTC' } */}
                                    {new Date(item.date_delivery).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </td>
                                <td className="px-6 py-4 font-bold text-primary">{item.material_type}</td>
                                <td className="px-6 py-4 font-mono">{item.quantity}</td>
                                <td className="px-6 py-4">{item.recipient}</td>
                                <td className="px-6 py-4">{item.municipality}</td>
                                {isAdmin && <td className="px-6 py-4 text-xs text-gray-500">{item.coordinations?.name || '-'}</td>}
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => router.push(`/dashboard/formularios/materiais?id=${item.id}`)}
                                        className="text-blue-500 hover:bg-blue-50 p-2 rounded"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16} /></button>
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
