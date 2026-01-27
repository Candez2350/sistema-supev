"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Trash2, Edit, Search, Loader2, MapPin, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ServicesList() {
  const [activeTab, setActiveTab] = useState<'ônibus lilás' | 'unidade'>('ônibus lilás');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [activeTab]); // Recarrega quando muda a aba

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from("profiles").select("role, coordination_id").eq("id", user.id).single();
    
    if (!profile) {
        setLoading(false);
        return;
    }

    const admin = profile.role === 'admin';
    setIsAdmin(admin);

    // Seleciona a tabela baseada na aba
    const tableName = activeTab === 'ônibus lilás' ? 'services_regional' : 'services_units';
    const orderBy = activeTab === 'ônibus lilás' ? 'date_service' : 'date_reference';

    let query = supabase
        .from(tableName)
        .select("*, coordinations(name)")
        .order(orderBy, { ascending: false });

    if (!admin && profile.coordination_id) {
        query = query.eq('coordination_id', profile.coordination_id);
    }
    
    const { data: result, error } = await query;
    if (!error) setData(result || []);
    setLoading(false);
  }

  const handleDelete = async (id: number) => {
      if(!confirm("Deseja excluir este registro?")) return;
      const tableName = activeTab === 'ônibus lilás' ? 'services_regional' : 'services_units';
      
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (!error) setData(prev => prev.filter(item => item.id !== id));
      else alert("Erro ao excluir: " + error.message);
  };

  // Filtro genérico dependendo da aba
  const filteredData = data.filter(item => {
      const term = searchTerm.toLowerCase();
      if (activeTab === 'ônibus lilás') {
          return item.municipality?.toLowerCase().includes(term) || item.origin?.toLowerCase().includes(term);
      } else {
          return item.unit_name?.toLowerCase().includes(term);
      }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-primary-dark">Registros de Atendimento</h1>
            <p className="text-sm text-gray-500">Fortalecimento de Serviços.</p>
        </div>
        
        {/* Abas de Navegação */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('ônibus lilás')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ônibus lilás' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <MapPin size={16} /> Ônibus Lilás
            </button>
            <button 
                onClick={() => setActiveTab('unidade')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'unidade' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Building2 size={16} /> Unidade
            </button>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder={activeTab === 'ônibus lilás' ? "Buscar município, origem..." : "Buscar unidade..."}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-primary" 
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
                        {/* Cabeçalhos Dinâmicos */}
                        {activeTab === 'ônibus lilás' ? (
                            <>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Município</th>
                                <th className="px-6 py-4">Origem</th>
                                <th className="px-6 py-4 text-center">Internos</th>
                                <th className="px-6 py-4 text-center">Parceiros</th>
                            </>
                        ) : (
                            <>
                                <th className="px-6 py-4">Data Ref.</th>
                                <th className="px-6 py-4">Unidade</th>
                                <th className="px-6 py-4 text-center">Total Mensal</th>
                            </>
                        )}
                        {isAdmin && <th className="px-6 py-4">Coordenação</th>}
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-10"><div className="flex justify-center"><Loader2 className="animate-spin text-primary" /></div></td></tr>
                    ) : filteredData.length === 0 ? (
                        <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
                    ) : (
                        filteredData.map((item) => (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                {activeTab === 'ônibus lilás' ? (
                                    <>
                                        <td className="px-6 py-4">{new Date(item.date_service).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.municipality}</td>
                                        <td className="px-6 py-4">{item.origin}</td>
                                        <td className="px-6 py-4 text-center">{item.internal_count}</td>
                                        <td className="px-6 py-4 text-center">{item.partner_count}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4">{new Date(item.date_reference).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.unit_name}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-primary">{item.monthly_count}</td>
                                    </>
                                )}
                                
                                {isAdmin && <td className="px-6 py-4 text-xs text-gray-500">{item.coordinations?.name || '-'}</td>}
                                
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => router.push(`/dashboard/formularios/atendimento?id=${item.id}&type=${activeTab}`)} 
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