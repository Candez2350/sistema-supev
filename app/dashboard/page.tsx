"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase"; 
import { 
  Users, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  Filter,
  X,
  Search,
  ChevronDown,
  CheckSquare,
  Square,
  LayoutDashboard,
  Box,
  Activity
} from "lucide-react";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler
);

// --- INTERFACES TYPESCRIPT ---
type Coordination = { id: number; name: string };
type Mobilization = { id: number; date_event: string; mobilization_type: string; participants_count: number; municipalities: string; coordination_id: number };
type Material = { id: number; date_delivery: string; material_type: string; quantity: number; recipient: string; municipality: string; coordination_id: number };
type ServiceRegional = { id: number; date_service: string; municipality: string; origin: string; internal_count: number; partner_count: number; coordination_id: number };
type ServiceUnit = { id: number; date_reference: string; unit_name: string; monthly_count: number; coordination_id: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("geral");
  
  // Dados Brutos
  const [mobs, setMobs] = useState<Mobilization[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [servRegional, setServRegional] = useState<ServiceRegional[]>([]);
  const [servUnits, setServUnits] = useState<ServiceUnit[]>([]);
  const [coordinations, setCoordinations] = useState<Coordination[]>([]);

  // --- ESTADOS DE FILTRO ---
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [isCoordDropdownOpen, setIsCoordDropdownOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [showMuniModal, setShowMuniModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Busca todas as tabelas em paralelo para performance
      const [mobsRes, coordsRes, matsRes, sRegRes, sUnitRes] = await Promise.all([
        supabase.from("mobilizations").select("*"),
        supabase.from("coordinations").select("*"),
        supabase.from("materials_delivered").select("*"),
        supabase.from("services_regional").select("*"),
        supabase.from("services_units").select("*")
      ]);

      if (mobsRes.data) setMobs(mobsRes.data);
      if (coordsRes.data) setCoordinations(coordsRes.data);
      if (matsRes.data) setMaterials(matsRes.data);
      if (sRegRes.data) setServRegional(sRegRes.data);
      if (sUnitRes.data) setServUnits(sUnitRes.data);
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE MULTI-SELEÇÃO ---
  const toggleCoord = (id: string) => {
    if (selectedCoords.includes(id)) {
      setSelectedCoords(prev => prev.filter(item => item !== id));
    } else {
      setSelectedCoords(prev => [...prev, id]);
    }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filterItem = (item: any, dateField: string) => {
    const coordMatch = selectedCoords.length === 0 || selectedCoords.includes(String(item.coordination_id));
    
    let startMatch = true;
    let endMatch = true;
    if (item[dateField]) {
        const itemDate = new Date(item[dateField]);
        if (dateStart) startMatch = itemDate >= new Date(dateStart);
        if (dateEnd) endMatch = itemDate <= new Date(dateEnd);
    }
    return coordMatch && startMatch && endMatch;
  };

  const filteredMobs = useMemo(() => mobs.filter(m => filterItem(m, 'date_event')), [mobs, selectedCoords, dateStart, dateEnd]);
  const filteredMats = useMemo(() => materials.filter(m => filterItem(m, 'date_delivery')), [materials, selectedCoords, dateStart, dateEnd]);
  const filteredSReg = useMemo(() => servRegional.filter(m => filterItem(m, 'date_service')), [servRegional, selectedCoords, dateStart, dateEnd]);
  const filteredSUnit = useMemo(() => servUnits.filter(m => filterItem(m, 'date_reference')), [servUnits, selectedCoords, dateStart, dateEnd]);

  // --- CÁLCULOS DOS KPIS (VISÃO GERAL) ---
  const geralStats = useMemo(() => {
    const totalAcoes = filteredMobs.length + filteredMats.length + filteredSReg.length + filteredSUnit.length;
    
    // Pessoas = Mobilizações + Atendimentos
    const pessoasMobs = filteredMobs.reduce((acc, curr) => acc + (curr.participants_count || 0), 0);
    const pessoasSReg = filteredSReg.reduce((acc, curr) => acc + (curr.internal_count || 0) + (curr.partner_count || 0), 0);
    const pessoasSUnit = filteredSUnit.reduce((acc, curr) => acc + (curr.monthly_count || 0), 0);
    const totalPessoas = pessoasMobs + pessoasSReg + pessoasSUnit;
    
    // Agrupamento de Municípios (Nome -> Áreas e Coordenações)
    const muniMap: Record<string, { areas: Set<string>, coords: Set<string> }> = {};
    const getCoordName = (id: number) => coordinations.find(c => c.id === id)?.name || String(id);
    
    const addMuni = (muniString: string, area: string, coordId: number) => {
        if (!muniString) return;
        muniString.split(",").forEach(m => {
            const clean = m.trim();
            if (!clean) return;
            if (!muniMap[clean]) muniMap[clean] = { areas: new Set(), coords: new Set() };
            muniMap[clean].areas.add(area);
            muniMap[clean].coords.add(getCoordName(coordId));
        });
    };

    filteredMobs.forEach(m => addMuni(m.municipalities, 'Mobilizações', m.coordination_id));
    filteredMats.forEach(m => addMuni(m.municipality, 'Materiais', m.coordination_id));
    filteredSReg.forEach(m => addMuni(m.municipality, 'Ônibus Lilás', m.coordination_id));
    
    // Converte o Mapa em Array Ordenado para o Modal
    const uniqueMunis = Object.keys(muniMap).sort().map(name => ({
        name,
        areas: Array.from(muniMap[name].areas),
        coords: Array.from(muniMap[name].coords)
    }));

    return { totalAcoes, totalPessoas, uniqueMunis };
  }, [filteredMobs, filteredMats, filteredSReg, filteredSUnit, coordinations]);

  // --- DADOS DO GRÁFICO DE PIZZA (TIPOS) ---
  const pieChartData = useMemo(() => {
    const tipoCount: Record<string, number> = {};
    filteredMobs.forEach(m => {
        const tipo = m.mobilization_type || "Não Informado";
        tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });

    return {
        labels: Object.keys(tipoCount),
        datasets: [{
            data: Object.values(tipoCount),
            backgroundColor: ['#6A1B9A', '#AB47BC', '#FF4081', '#EC407A', '#8E24AA', '#BA68C8'],
            borderWidth: 0,
        }],
    };
  }, [filteredMobs]);

  // --- DADOS DO GRÁFICO DE LINHA (EVOLUÇÃO TEMPORAL) ---
  const lineChartData = useMemo(() => {
    // 1. Agrupar por Mês/Ano (YYYY-MM) para ordenar corretamente
    const groups: Record<string, number> = {};
    
    filteredMobs.forEach(item => {
        const date = new Date(item.date_event);
        // Cria chave ordenável: "2025-01", "2025-02"
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        groups[key] = (groups[key] || 0) + 1;
    });

    // 2. Ordenar as chaves cronologicamente
    const sortedKeys = Object.keys(groups).sort();

    // 3. Criar Labels formatados (jan/25) e Dados
    const labels = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
    });

    const dataValues = sortedKeys.map(key => groups[key]);

    return {
        labels,
        datasets: [{
            label: 'Ações Realizadas',
            data: dataValues,
            borderColor: '#FF4081', // Rosa Choque (Accent)
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(255, 64, 129, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 64, 129, 0.0)');
                return gradient;
            },
            fill: true,
            tension: 0.4, // Curva suave
            pointBackgroundColor: '#fff',
            pointBorderColor: '#FF4081',
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
  }, [filteredMobs]);

  const getFilterButtonText = () => {
    if (selectedCoords.length === 0) return "Todas as Coordenações";
    if (selectedCoords.length === 1) {
        const coord = coordinations.find(c => String(c.id) === selectedCoords[0]);
        return coord ? coord.name : "1 Selecionada";
    }
    return `${selectedCoords.length} Coordenações Selecionadas`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10 relative">
      
      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 z-30 relative">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Visão Geral</h1>
          <p className="text-xs text-gray-500">Monitore os indicadores em tempo real.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 px-2">
                <Filter size={16} className="text-primary" />
                <span className="text-sm font-bold text-gray-600">Filtrar:</span>
            </div>

            {/* Dropdown Coordenação */}
            <div className="relative">
                <button 
                    onClick={() => setIsCoordDropdownOpen(!isCoordDropdownOpen)}
                    className={`flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium transition-all ${isCoordDropdownOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-primary/50'}`}
                >
                    <span className="truncate max-w-[200px]">{getFilterButtonText()}</span>
                    <ChevronDown size={16} className={`transition-transform ${isCoordDropdownOpen ? 'rotate-180' : ''}`}/>
                </button>

                {isCoordDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsCoordDropdownOpen(false)}></div>
                        <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                                <span className="text-xs font-bold text-gray-500 px-2 uppercase">Selecione para comparar</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                {coordinations.map(c => {
                                    const isSelected = selectedCoords.includes(String(c.id));
                                    return (
                                        <div 
                                            key={c.id} 
                                            onClick={() => toggleCoord(String(c.id))}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors text-sm ${isSelected ? 'bg-primary/5 text-primary-dark font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-gray-300" />}
                                            {c.name}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-between">
                                <button onClick={() => setSelectedCoords([])} className="text-xs text-gray-500 hover:text-primary font-bold px-2 py-1">Limpar Seleção</button>
                                <button onClick={() => setIsCoordDropdownOpen(false)} className="text-xs bg-primary text-white px-3 py-1 rounded-md font-bold hover:bg-primary-dark">Aplicar</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Inputs de Data */}
            <div className="flex items-center gap-2">
                <input type="date" className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:border-primary transition-colors" value={dateStart} onChange={(e) => setDateStart(e.target.value)}/>
                <span className="text-gray-400 font-bold">-</span>
                <input type="date" className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:border-primary transition-colors" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}/>
            </div>
            
            {(dateStart || dateEnd || selectedCoords.length > 0) && (
                <button onClick={() => { setDateStart(""); setDateEnd(""); setSelectedCoords([]); }} className="ml-2 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Limpar todos os filtros">
                    <X size={16} />
                </button>
            )}
        </div>
      </div>

      {/* --- MENU DE ABAS --- */}
      <div className="flex gap-2 border-b border-white/50 mb-6 overflow-x-auto pb-1 mt-6">
          <button onClick={() => setActiveTab('geral')} className={`flex whitespace-nowrap items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-4 ${activeTab === 'geral' ? 'border-primary text-primary-dark bg-white/60 backdrop-blur-md' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/30'}`}><LayoutDashboard size={18}/> Visão Geral</button>
          <button onClick={() => setActiveTab('mobilizacao')} className={`flex whitespace-nowrap items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-4 ${activeTab === 'mobilizacao' ? 'border-primary text-primary-dark bg-white/60 backdrop-blur-md' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/30'}`}><Users size={18}/> Mobilizações</button>
          <button onClick={() => setActiveTab('materiais')} className={`flex whitespace-nowrap items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-4 ${activeTab === 'materiais' ? 'border-primary text-primary-dark bg-white/60 backdrop-blur-md' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/30'}`}><Box size={18}/> Materiais</button>
          <button onClick={() => setActiveTab('servicos')} className={`flex whitespace-nowrap items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-xl transition-all border-b-4 ${activeTab === 'servicos' ? 'border-primary text-primary-dark bg-white/60 backdrop-blur-md' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/30'}`}><Activity size={18}/> Serviços (Atendimentos)</button>
      </div>

      {/* --- CONTEÚDO DA ABA: VISÃO GERAL --- */}
      {activeTab === 'geral' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-primary/10 rounded-xl text-primary"><TrendingUp size={24} /></div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ações Totais</span>
              </div>
              <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : geralStats.totalAcoes}</h3>
              <p className="text-xs text-gray-400 mt-2">Soma de todas as áreas no filtro</p>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-accent/10 rounded-xl text-accent"><Users size={24} /></div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pessoas Alcançadas</span>
              </div>
              <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : geralStats.totalPessoas}</h3>
              <p className="text-xs text-gray-400 mt-2">Mobilizações + Atendimentos</p>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><MapPin size={24} /></div>
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Municípios</span>
                  </div>
                  <button onClick={() => setShowMuniModal(true)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors">Ver Lista</button>
              </div>
              <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : geralStats.uniqueMunis.length}</h3>
              <p className="text-xs text-gray-400 mt-2">Cobertura unificada (todas as áreas)</p>
            </div>
          </div>
      )}

      {/* --- CONTEÚDO DA ABA: MOBILIZAÇÕES --- */}
      {activeTab === 'mobilizacao' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-primary/10 rounded-xl text-primary"><TrendingUp size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ações de Mobilização</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredMobs.length}</h3>
             </div>
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-accent/10 rounded-xl text-accent"><Users size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Participantes</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredMobs.reduce((a,c) => a + (c.participants_count || 0), 0)}</h3>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Pizza (Tipos) */}
            <div className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-accent rounded-full"></div>
                    Tipos de Mobilização
                </h3>
                <div className="h-64 flex justify-center relative">
                    {filteredMobs.length > 0 ? (
                        <Doughnut data={pieChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full w-full">
                            <Search size={32} className="mb-2 opacity-50"/>
                            <p>Sem dados.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Gráfico de Linha (Evolução Temporal) */}
            <div className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <Calendar className="text-primary" size={20} />
                    Evolução das Ações
                </h3>
                <div className="h-64 flex justify-center relative w-full">
                    {filteredMobs.length > 0 ? (
                        <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full w-full"><p>Nenhuma ação no período.</p></div>
                    )}
                </div>
            </div>
          </div>
        </>
      )}

      {/* --- CONTEÚDO DA ABA: MATERIAIS --- */}
      {activeTab === 'materiais' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-primary/10 rounded-xl text-primary"><Box size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Entregas Realizadas</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredMats.length}</h3>
             </div>
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-accent/10 rounded-xl text-accent"><TrendingUp size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total de Itens Entregues</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredMats.reduce((a,c) => a + (c.quantity || 0), 0)}</h3>
             </div>
          </div>
      )}

      {/* --- CONTEÚDO DA ABA: SERVIÇOS --- */}
      {activeTab === 'servicos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-primary/10 rounded-xl text-primary"><Activity size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Atend. Ônibus Lilás</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredSReg.reduce((a,c) => a + (c.internal_count || 0) + (c.partner_count || 0), 0)}</h3>
             </div>
             <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg hover:bg-white/80 transition-all">
               <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-accent/10 rounded-xl text-accent"><LayoutDashboard size={24} /></div>
                 <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Atend. Unidades Fixas</span>
               </div>
               <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : filteredSUnit.reduce((a,c) => a + (c.monthly_count || 0), 0)}</h3>
             </div>
          </div>
      )}

      {/* --- MODAL DE LISTA DE MUNICÍPIOS --- */}
      {showMuniModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowMuniModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-10 overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-primary-dark flex items-center gap-2">
                        <MapPin size={20} /> Municípios Atingidos
                    </h3>
                    <button onClick={() => setShowMuniModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {geralStats.uniqueMunis.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {geralStats.uniqueMunis.map(m => (
                                <span 
                                    key={m.name} 
                                    title={`Áreas: ${m.areas.join(', ')}`}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-100 cursor-help"
                                >{m.name}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Nenhum município registrado.</p>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <span className="text-xs font-bold text-gray-400">Total: {geralStats.uniqueMunis.length} municípios</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}