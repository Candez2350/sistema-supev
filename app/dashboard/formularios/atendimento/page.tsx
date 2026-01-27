"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "../../../../lib/supabase"; 
import { Save, Loader2, CheckCircle, FileText, AlertTriangle, Building2, MapPin, Search, ChevronDown, Edit } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// --- CONSTANTES ---
const MUNICIPIOS_RJ = [
  "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo",
  "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana",
  "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo",
  "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian",
  "Conceição de Macabu", "Cordeiro", "Duque de Caxias", "Engenheiro Paulo de Frontin",
  "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna",
  "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba",
  "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis",
  "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty",
  "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real",
  "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio Claro", "Rio das Flores",
  "Rio das Ostras", "Rio de Janeiro", "Santa Maria Madalena", "Santo Antônio de Pádua",
  "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra",
  "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia",
  "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro",
  "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai",
  "Vassouras", "Volta Redonda"
];
const UNIDADES_DISPONIVEIS = [ "CIAM Márcia Lyra", "CEAM Baixada", "CEAM Queimados" ];

// --- CONTEÚDO DO FORMULÁRIO ---
function ServicesFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const typeParam = searchParams.get('type'); 

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'regional' | 'unidade'>('regional');
  const [targetCoordId, setTargetCoordId] = useState<number | null>(null);

  const [formRegional, setFormRegional] = useState({ date_service: "", origin: "", municipality: "", internal_count: "", partner_count: "" });
  const [formUnidade, setFormUnidade] = useState({ date_reference: "", unit_name: "", monthly_count: "" });
  
  const [isMuniDropdownOpen, setIsMuniDropdownOpen] = useState(false);
  const [muniSearchTerm, setMuniSearchTerm] = useState("");

  // 1. Configurar Aba
  useEffect(() => {
    if (editId && typeParam && (typeParam === 'regional' || typeParam === 'unidade')) {
        setActiveTab(typeParam);
    }
  }, [editId, typeParam]);

  // 2. Permissões
  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role, coordination_id").eq("id", user.id).single();
      const { data: targetCoord } = await supabase.from("coordinations").select("id").ilike("name", "%Fortalecimento%").single();

      if (profile) {
        if (profile.role === 'admin') { setIsAdmin(true); setHasAccess(true); if (targetCoord) setTargetCoordId(targetCoord.id); } 
        else if (targetCoord && profile.coordination_id === targetCoord.id) { setHasAccess(true); setTargetCoordId(targetCoord.id); } 
        else { setHasAccess(false); }
      } else { setHasAccess(false); }
    }
    checkPermission();
  }, [router]);

  // 3. Carregar Dados
  useEffect(() => {
    async function loadData() {
        if (!editId || !typeParam) return;
        setLoading(true);
        const tableName = typeParam === 'regional' ? 'services_regional' : 'services_units';
        const { data } = await supabase.from(tableName).select("*").eq("id", editId).single();

        if (data) {
            if (typeParam === 'regional') {
                setFormRegional({
                    date_service: data.date_service ? data.date_service.split('T')[0] : "", 
                    origin: data.origin || "",
                    municipality: data.municipality || "",
                    internal_count: String(data.internal_count || ""),
                    partner_count: String(data.partner_count || ""),
                });
            } else {
                setFormUnidade({
                    date_reference: data.date_reference ? data.date_reference.split('T')[0] : "", 
                    unit_name: data.unit_name || "",
                    monthly_count: String(data.monthly_count || ""),
                });
            }
        }
        setLoading(false);
    }
    loadData();
  }, [editId, typeParam]);

  const filteredMunicipios = useMemo(() => MUNICIPIOS_RJ.filter((m) => m.toLowerCase().includes(muniSearchTerm.toLowerCase())), [muniSearchTerm]);
  const handleSelectMunicipio = (municipio: string) => { setFormRegional({ ...formRegional, municipality: municipio }); setIsMuniDropdownOpen(false); setMuniSearchTerm(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCoordId) { alert("Erro de permissão."); return; }
    setLoading(true);
    
    const userId = (await supabase.auth.getUser()).data.user?.id;
    let error = null;

    if (activeTab === 'regional') {
        const payload = {
            date_service: formRegional.date_service,
            origin: formRegional.origin,
            municipality: formRegional.municipality,
            internal_count: Number(formRegional.internal_count),
            partner_count: Number(formRegional.partner_count),
            coordination_id: targetCoordId,
            user_id: userId
        };
        if (editId) {
             const { error: err } = await supabase.from("services_regional").update(payload).eq("id", editId);
             error = err;
        } else {
             const { error: err } = await supabase.from("services_regional").insert([payload]);
             error = err;
        }
    } else {
        const payload = {
            date_reference: formUnidade.date_reference,
            unit_name: formUnidade.unit_name,
            monthly_count: Number(formUnidade.monthly_count),
            coordination_id: targetCoordId,
            user_id: userId
        };
        if (editId) {
            const { error: err } = await supabase.from("services_units").update(payload).eq("id", editId);
            error = err;
        } else {
            const { error: err } = await supabase.from("services_units").insert([payload]);
            error = err;
        }
    }

    setLoading(false);
    if (error) { alert("Erro: " + error.message); } 
    else {
      setSuccess(true);
      if (!editId) {
          setTimeout(() => { setSuccess(false); setFormRegional({ date_service: "", origin: "", municipality: "", internal_count: "", partner_count: "" }); setFormUnidade({ date_reference: "", unit_name: "", monthly_count: "" }); }, 2000);
      } else {
          setTimeout(() => router.push("/dashboard/listas/atendimento"), 1500);
      }
    }
  };

  // --- LOADER E ERRO (AGORA COM FUNDO DE VIDRO) ---
  if (hasAccess === null) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
            {/* Círculo animado roxo */}
            <div className="h-16 w-16 rounded-full border-4 border-white/20"></div>
            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
        </div>
        <p className="text-white font-bold animate-pulse tracking-wide text-sm drop-shadow-md">Verificando permissões...</p>
    </div>
  );

  if (hasAccess === false) return (
    <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center max-w-md border border-white/50 animate-in zoom-in">
            <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-800">Acesso Restrito</h1>
            <p className="text-gray-600 mt-2 text-sm">Este formulário é exclusivo para a Coordenação de Fortalecimento de Serviços.</p>
            <button onClick={() => router.push("/dashboard")} className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/30">Voltar ao Painel</button>
        </div>
    </div>
  );

  // --- FORMULÁRIO PRINCIPAL ---
  return (
    <div className="w-full max-w-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-2xl rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="mb-8 border-b border-primary/10 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">{editId ? "Editar Atendimento" : "Dados de Atendimento"}</h1>
            <p className="text-gray-600 text-sm">{editId ? "Atualizando registro." : isAdmin ? "Modo Admin: Acesso Liberado" : "Coordenação de Fortalecimento"}</p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">{editId ? <Edit size={24} /> : <FileText size={24} />}</div>
        </div>

        {/* Abas */}
        <div className="flex p-1 bg-purple-50 rounded-xl mb-8 border border-purple-100">
            <button 
                onClick={() => !editId && setActiveTab('regional')} 
                disabled={!!editId} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'regional' ? 'bg-white shadow-md text-primary' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'} ${editId && activeTab !== 'regional' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <MapPin size={18} /> Regional
            </button>
            <button 
                onClick={() => !editId && setActiveTab('unidade')} 
                disabled={!!editId} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'unidade' ? 'bg-white shadow-md text-primary' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'} ${editId && activeTab !== 'unidade' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Building2 size={18} /> Unidade
            </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 text-green-600 animate-pulse bg-green-50/50 rounded-xl border border-green-100">
            <CheckCircle size={64} className="mb-4" />
            <h2 className="text-2xl font-bold">{editId ? "Atualizado!" : "Salvo!"}</h2>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- REGIONAL --- */}
            {activeTab === 'regional' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Data</label>
                            <input type="date" required value={formRegional.date_service} onChange={e => setFormRegional({...formRegional, date_service: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-gray-700 ml-1">Município</label>
                            <div onClick={() => setIsMuniDropdownOpen(!isMuniDropdownOpen)} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm cursor-pointer flex justify-between items-center">
                                <span className={formRegional.municipality ? "text-gray-800" : "text-gray-400"}>{formRegional.municipality || "Selecione..."}</span>
                                <ChevronDown size={18} className="text-gray-400" />
                            </div>
                            {isMuniDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2">
                                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                                        <Search size={18} className="text-gray-400 ml-2" />
                                        <input type="text" placeholder="Buscar..." className="w-full bg-transparent p-2 outline-none text-sm" value={muniSearchTerm} onChange={(e) => setMuniSearchTerm(e.target.value)} autoFocus />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                        {filteredMunicipios.map((m) => (
                                            <div key={m} onClick={() => handleSelectMunicipio(m)} className={`p-3 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors ${formRegional.municipality === m ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>
                                                {m}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Origem</label>
                        <input type="text" required value={formRegional.origin} onChange={e => setFormRegional({...formRegional, origin: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Atend. Internos</label>
                            <input type="number" required min="0" value={formRegional.internal_count} onChange={e => setFormRegional({...formRegional, internal_count: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Atend. Parceiros</label>
                            <input type="number" required min="0" value={formRegional.partner_count} onChange={e => setFormRegional({...formRegional, partner_count: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"/>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UNIDADE --- */}
            {activeTab === 'unidade' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Data Ref.</label>
                            <input type="date" required value={formUnidade.date_reference} onChange={e => setFormUnidade({...formUnidade, date_reference: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"/>
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-gray-700 ml-1">Unidade</label>
                            <div className="relative">
                                <select required value={formUnidade.unit_name} onChange={e => setFormUnidade({...formUnidade, unit_name: e.target.value})} className="w-full p-3 pr-10 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none text-gray-700 shadow-sm transition-all">
                                    <option value="">Selecione...</option>
                                    {UNIDADES_DISPONIVEIS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Total Mensal</label>
                        <input type="number" required min="0" value={formUnidade.monthly_count} onChange={e => setFormUnidade({...formUnidade, monthly_count: e.target.value})} className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"/>
                    </div>
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 mt-6 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>{editId ? <Edit size={20} /> : <Save size={20} />} {editId ? "Atualizar" : "Salvar"}</>}
            </button>
          </form>
        )}
    </div>
  );
}

// --- WRAPPER PRINCIPAL ---
export default function ServicesForm() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-main-gradient p-4 relative">
      
      {/* Background Decorativo e Fixo */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(106,27,154,0.1)_0%,transparent_50%)]"></div>
      
      {/* Suspense com o novo Loader Transparente */}
      <Suspense fallback={
         <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
             <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
             <p className="text-white font-bold animate-pulse text-sm drop-shadow-md">Carregando...</p>
         </div>
      }>
        <ServicesFormContent />
      </Suspense>
    </div>
  );
}