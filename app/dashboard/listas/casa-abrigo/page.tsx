"use client";

import { useEffect, useState, useMemo } from "react";
import { PlusCircle, Edit, Search, Loader2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MonthlyRecord = {
  data_referencia: string; // Formato: YYYY-MM-DD
  mulheres_entrada: number;
  mulheres_saida: number;
  dependentes_entrada: number;
  dependentes_saida: number;
};

// Nomes dos meses em português
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Helper para formatar a data de referência em "Mês / Ano" (ex: "Junho / 2026")
const formatMonthYear = (dateStr: string) => {
  if (!dateStr) return "-";
  const dateOnly = dateStr.split("T")[0];
  const [year, month] = dateOnly.split("-");
  const monthIdx = Number(month) - 1;
  return `${MESES[monthIdx] || month} / ${year}`;
};

export default function CasaAbrigoList() {
  const router = useRouter();
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/movimentacoes");
      if (res.ok) {
        const data = await res.json();
        setRecords(data || []);
      } else {
        console.error("Erro ao carregar histórico da Casa Abrigo");
      }
    } catch (err) {
      console.error("Erro na requisição do histórico:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filtra os registros pelo termo de pesquisa (filtrando pelo nome do mês ou ano)
  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      const formattedLabel = formatMonthYear(item.data_referencia).toLowerCase();
      return formattedLabel.includes(searchTerm.toLowerCase());
    });
  }, [records, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Histórico da Casa Abrigo</h1>
          <p className="text-sm text-gray-500">Acompanhamento mensal de fluxos de acolhidos.</p>
        </div>
        
        <Link href="/dashboard/formularios/casa-abrigo">
          <div className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all text-sm cursor-pointer">
            <PlusCircle size={18} />
            <span>Nova Planilha</span>
          </div>
        </Link>
      </div>

      {/* Barra de Filtro de Busca */}
      <div className="flex justify-end">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por mês ou ano..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary transition-all text-sm shadow-sm bg-white" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Tabela de Planilhas Mensais */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-purple-50/40 border-b border-purple-100">
              <tr>
                <th className="px-6 py-4 border-r border-purple-100/30" rowSpan={2}>Mês de Referência</th>
                <th className="px-6 py-2 text-center border-r border-purple-100/30" colSpan={2}>Mulheres</th>
                <th className="px-6 py-2 text-center border-r border-purple-100/30" colSpan={2}>Dependentes</th>
                <th className="px-6 py-4 text-center border-r border-purple-100/30" rowSpan={2}>Saldo do Mês</th>
                <th className="px-6 py-4 text-right" rowSpan={2}>Ações</th>
              </tr>
              <tr className="bg-purple-50/20 border-b border-purple-100 text-[10px]">
                <th className="px-4 py-2 text-center border-r border-purple-100/10">Entrada (E)</th>
                <th className="px-4 py-2 text-center border-r border-purple-100/30">Saída (S)</th>
                <th className="px-4 py-2 text-center border-r border-purple-100/10">Entrada (E)</th>
                <th className="px-4 py-2 text-center border-r border-purple-100/30">Saída (S)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="animate-spin text-primary" size={20} />
                      <span className="text-gray-500 font-medium">Carregando histórico...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 font-medium">
                    Nenhuma planilha mensal encontrada.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const totalEntrada = (item.mulheres_entrada || 0) + (item.dependentes_entrada || 0);
                  const totalSaida = (item.mulheres_saida || 0) + (item.dependentes_saida || 0);
                  const saldo = totalEntrada - totalSaida;
                  return (
                    <tr key={item.data_referencia} className="border-b border-purple-50/50 hover:bg-purple-50/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-2 border-r border-purple-50/30">
                        <Calendar size={16} className="text-primary" />
                        {formatMonthYear(item.data_referencia)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600 border-r border-purple-50/10">
                        {item.mulheres_entrada || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 border-r border-purple-50/30">
                        {item.mulheres_saida || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600 border-r border-purple-50/10">
                        {item.dependentes_entrada || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 border-r border-purple-50/30">
                        {item.dependentes_saida || 0}
                      </td>
                      <td className={`px-6 py-4 text-center font-mono font-bold border-r border-purple-50/30 ${saldo < 0 ? 'text-rose-500 font-extrabold' : saldo > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {saldo > 0 ? `+${saldo}` : saldo}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => router.push(`/dashboard/formularios/casa-abrigo?date=${item.data_referencia.split('T')[0]}`)} 
                          className="text-primary hover:bg-primary/10 p-2.5 rounded-lg active:scale-95 transition-all inline-flex items-center gap-1 text-xs font-bold"
                          title="Editar Planilha do Mês"
                        >
                          <Edit size={16} />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
