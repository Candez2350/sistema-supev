"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { supabase } from "../../../../lib/supabase"; 
import { Save, Loader2, CheckCircle, X, ChevronDown, Search, Edit } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// --- COMPONENTE DO FORMULÁRIO ---
function MobilizationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coordinations, setCoordinations] = useState<any[]>([]);
  const [selectedCoordId, setSelectedCoordId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    date_event: "",
    mobilization_type: "",
    responsible: "",
    action_name: "",
    participants_count: "",
  });

  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
  const TIPOS_MOBILIZACAO = ["Ativação", "Campanha", "Capacitação/Formação", "Palestra"];

  // 1. Permissões e Usuário
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role, coordination_id").eq("id", user.id).single();

      if (profile) {
        if (profile.role === 'admin') {
            setIsAdmin(true);
            const { data: coords } = await supabase.from("coordinations").select("*");
            if (coords) setCoordinations(coords);
        } else {
            setSelectedCoordId(profile.coordination_id);
        }
      }
    }
    init();
  }, [router]);

  // 2. Carregar Dados na Edição
  useEffect(() => {
    async function loadDataForEdit() {
        if (!editId) return;
        setLoading(true);
        const { data } = await supabase.from("mobilizations").select("*").eq("id", editId).single();
        if (data) {
            // Corrige data para YYYY-MM-DD
            const formattedDate = data.date_event ? data.date_event.split('T')[0] : "";

            setFormData({
                date_event: formattedDate,
                mobilization_type: data.mobilization_type || "",
                responsible: data.responsible || "",
                action_name: data.action_name || "",
                participants_count: String(data.participants_count || ""),
            });
            if (data.municipalities) {
                setSelectedMunicipios(data.municipalities.split(",").map((m: string) => m.trim()));
            }
            setSelectedCoordId(data.coordination_id);
        }
        setLoading(false);
    }
    loadDataForEdit();
  }, [editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredMunicipios = useMemo(() => MUNICIPIOS_RJ.filter((m) => m.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm]);
  
  const toggleMunicipio = (municipio: string) => {
    if (selectedMunicipios.includes(municipio)) setSelectedMunicipios(prev => prev.filter(m => m !== municipio));
    else setSelectedMunicipios(prev => [...prev, municipio]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoordId) { alert("Coordenação obrigatória."); return; }
    if (selectedMunicipios.length === 0) { alert("Selecione um município."); return; }

    setLoading(true);
    const payload = {
        date_event: formData.date_event,
        mobilization_type: formData.mobilization_type,
        responsible: formData.responsible,
        action_name: formData.action_name,
        participants_count: Number(formData.participants_count),
        municipalities: selectedMunicipios.join(", "), 
        coordination_id: selectedCoordId,
        user_id: (await supabase.auth.getUser()).data.user?.id
    };

    let error;
    if (editId) {
        const { error: err } = await supabase.from("mobilizations").update(payload).eq("id", editId);
        error = err;
    } else {
        const { error: err } = await supabase.from("mobilizations").insert([payload]);
        error = err;
    }

    setLoading(false);
    if (error) { alert("Erro: " + error.message); } 
    else {
      setSuccess(true);
      setTimeout(() => {
          if (editId) router.push("/dashboard/listas/mobilizacao");
          else {
              setSuccess(false);
              setFormData({ date_event: "", mobilization_type: "", responsible: "", action_name: "", participants_count: "" });
              setSelectedMunicipios([]);
          }
      }, 1500);
    }
  };

  return (
    <div className="w-full max-w-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-2xl rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8 border-b border-primary/10 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">{editId ? "Editar Mobilização" : "Nova Mobilização"}</h1>
            <p className="text-gray-600 text-sm">{editId ? "Editando registro existente." : "Preencha os dados da ação."}</p>
          </div>
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            {editId ? <Edit size={20} /> : <Save size={20} />}
          </div>
        </div>

        {isAdmin && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <label className="block text-xs font-bold text-yellow-800 mb-2 uppercase">Modo Admin: Coordenação</label>
                <div className="relative">
                    <select 
                        value={selectedCoordId || ""}
                        onChange={(e) => setSelectedCoordId(Number(e.target.value))}
                        disabled={!!editId}
                        className="w-full p-2 pl-3 pr-10 rounded-lg border border-yellow-300 bg-white text-gray-700 font-medium outline-none appearance-none"
                    >
                        <option value="">Selecione...</option>
                        {coordinations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3 text-yellow-600 pointer-events-none" />
                </div>
            </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 text-green-600 animate-pulse bg-green-50/50 rounded-xl border border-green-100">
            <CheckCircle size={64} className="mb-4" />
            <h2 className="text-2xl font-bold">{editId ? "Atualizado!" : "Salvo!"}</h2>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Data do Evento</label>
                    <input 
                        type="date" 
                        name="date_event" 
                        required 
                        value={formData.date_event} 
                        onChange={handleChange} 
                        className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Responsável</label>
                    <input 
                        type="text" 
                        name="responsible" 
                        required 
                        value={formData.responsible} 
                        onChange={handleChange} 
                        className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
                    />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Nome da Mobilização/Ação</label>
                <input 
                    type="text" 
                    name="action_name" 
                    required 
                    value={formData.action_name} 
                    onChange={handleChange} 
                    className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 relative">
                    <label className="text-sm font-bold text-gray-700 ml-1">Tipo</label>
                    <div className="relative">
                        <select 
                            name="mobilization_type" 
                            required 
                            value={formData.mobilization_type} 
                            onChange={handleChange} 
                            className="w-full p-3 pr-10 rounded-xl bg-white/60 border border-purple-100 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none appearance-none text-gray-700 shadow-sm"
                        >
                            <option value="">Selecione...</option>
                            {TIPOS_MOBILIZACAO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Nº Participantes</label>
                    <input 
                        type="number" 
                        name="participants_count" 
                        required 
                        value={formData.participants_count} 
                        onChange={handleChange} 
                        className="w-full p-3 rounded-xl bg-white/60 border border-purple-100 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
                    />
                 </div>
             </div>

             {/* Multi Select Municípios */}
             <div className="space-y-2 relative">
              <label className="text-sm font-bold text-gray-700 ml-1">Municípios Participantes</label>
              <div 
                className={`w-full p-3 min-h-[50px] rounded-xl bg-white/60 border ${isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-purple-100'} cursor-pointer flex flex-wrap gap-2 transition-all shadow-sm`}
                onClick={() => setIsDropdownOpen(true)}
              >
                {selectedMunicipios.length === 0 && <span className="text-gray-400 mt-1 ml-1 select-none">Clique para selecionar...</span>}
                {selectedMunicipios.map((m) => (
                    <span key={m} className="bg-primary/10 text-primary-dark border border-primary/20 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 animate-in zoom-in">
                        {m} <button type="button" onClick={(e) => { e.stopPropagation(); toggleMunicipio(m); }} className="hover:text-accent"><X size={14} /></button>
                    </span>
                ))}
              </div>
              
              {isDropdownOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2">
                        <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                            <Search size={18} className="text-gray-400 ml-2" />
                            <input type="text" placeholder="Buscar..." className="w-full bg-transparent p-2 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredMunicipios.map((m) => (
                                <div key={m} onClick={() => toggleMunicipio(m)} className={`p-3 text-sm cursor-pointer flex justify-between transition-colors ${selectedMunicipios.includes(m) ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    {m} {selectedMunicipios.includes(m) && <CheckCircle size={16} />}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-6 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>{editId ? <Edit size={20} /> : <Save size={20} />} {editId ? "Atualizar Registro" : "Salvar Registro"}</>}
            </button>
          </form>
        )}
    </div>
  );
}

// --- WRAPPER PRINCIPAL ---
export default function MobilizationForm() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-main-gradient p-4 relative">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(225,190,231,0.4)_0%,transparent_40%)]"></div>
      <Suspense fallback={<div className="text-white font-bold flex gap-2"><Loader2 className="animate-spin"/> Carregando...</div>}>
        <MobilizationFormContent />
      </Suspense>
    </div>
  );
}