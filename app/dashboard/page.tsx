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
  Square
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // Dados Brutos
  const [allMobs, setAllMobs] = useState<any[]>([]);
  const [coordinations, setCoordinations] = useState<any[]>([]);

  // --- ESTADOS DE FILTRO ---
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [isCoordDropdownOpen, setIsCoordDropdownOpen] = useState(false);
  
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // Estado do Modal de Municípios
  const [showMuniModal, setShowMuniModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: mobs } = await supabase.from("mobilizations").select("*");
      const { data: coords } = await supabase.from("coordinations").select("*");

      if (mobs) setAllMobs(mobs);
      if (coords) setCoordinations(coords);
      
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
  const filteredData = useMemo(() => {
    return allMobs.filter(item => {
      // 1. Filtro de Coordenação
      const coordMatch = selectedCoords.length === 0 || selectedCoords.includes(String(item.coordination_id));
      
      // 2. Filtro de Data
      const itemDate = new Date(item.date_event);
      const startMatch = dateStart ? itemDate >= new Date(dateStart) : true;
      const endMatch = dateEnd ? itemDate <= new Date(dateEnd) : true;

      return coordMatch && startMatch && endMatch;
    });
  }, [allMobs, selectedCoords, dateStart, dateEnd]);

  // --- CÁLCULOS DOS KPIS ---
  const stats = useMemo(() => {
    const totalAcoes = filteredData.length;
    const totalPessoas = filteredData.reduce((acc, curr) => acc + (curr.participants_count || 0), 0);
    
    let muniList: string[] = [];
    filteredData.forEach(m => {
        if(m.municipalities) {
            const clean = m.municipalities.split(",").map((s: string) => s.trim());
            muniList = [...muniList, ...clean];
        }
    });
    const uniqueMunis = Array.from(new Set(muniList.filter(m => m !== ""))).sort();

    return { totalAcoes, totalPessoas, uniqueMunis };
  }, [filteredData]);

  // --- DADOS DO GRÁFICO DE PIZZA (TIPOS) ---
  const pieChartData = useMemo(() => {
    const tipoCount: Record<string, number> = {};
    filteredData.forEach(m => {
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
  }, [filteredData]);

  // --- DADOS DO GRÁFICO DE LINHA (EVOLUÇÃO TEMPORAL) ---
  const lineChartData = useMemo(() => {
    // 1. Agrupar por Mês/Ano (YYYY-MM) para ordenar corretamente
    const groups: Record<string, number> = {};
    
    filteredData.forEach(item => {
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
  }, [filteredData]);

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

      {/* --- CARDS DE KPI --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><TrendingUp size={24} /></div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Ações Realizadas</span>
          </div>
          <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : stats.totalAcoes}</h3>
          <p className="text-xs text-gray-400 mt-2">No filtro selecionado</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-accent/10 rounded-xl text-accent"><Users size={24} /></div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pessoas Alcançadas</span>
          </div>
          <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : stats.totalPessoas}</h3>
          <p className="text-xs text-gray-400 mt-2">Impacto direto</p>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:bg-white/80 transition-all">
          <div className="flex justify-between items-start">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><MapPin size={24} /></div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Municípios</span>
              </div>
              <button onClick={() => setShowMuniModal(true)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors">Ver Lista</button>
          </div>
          <h3 className="text-4xl font-extrabold text-gray-800">{loading ? "..." : stats.uniqueMunis.length}</h3>
          <p className="text-xs text-gray-400 mt-2">Cobertura geográfica</p>
        </div>
      </div>

      {/* --- GRÁFICOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico de Pizza (Tipos) */}
        <div className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                <div className="w-2 h-6 bg-accent rounded-full"></div>
                Tipos de Mobilização
            </h3>
            <div className="h-64 flex justify-center relative">
                {stats.totalAcoes > 0 ? (
                    <Doughnut 
                        data={pieChartData} 
                        options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'right' } }
                        }} 
                    />
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
                {stats.totalAcoes > 0 ? (
                    <Line 
                        data={lineChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                x: { grid: { display: false } }
                            }
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 h-full w-full">
                        <p>Nenhuma ação no período.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

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
                    {stats.uniqueMunis.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {stats.uniqueMunis.map(m => (
                                <span key={m} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg border border-blue-100">{m}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Nenhum município registrado.</p>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <span className="text-xs font-bold text-gray-400">Total: {stats.uniqueMunis.length} municípios</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}