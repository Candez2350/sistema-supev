"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "../../../../lib/supabase"; 
import { Save, Loader2, CheckCircle, FileText, AlertTriangle, Calendar, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const CATEGORIAS_FIXAS = [
  "Mulheres",
  "Crianças de 03 a 17 anos",
  "Bebês de 0 até 02 a. e 11 m."
];

function CasaAbrigoFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date'); // Formato: YYYY-MM-DD

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Define o mês de referência. Ex: "2026-06"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (dateParam) {
      return dateParam.substring(0, 7);
    }
    // Padrão: Mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Estado das movimentações (valores numéricos como strings para facilitar digitação)
  const [rows, setRows] = useState<Record<string, { entrada: string; saida: string }>>({
    "Mulheres": { entrada: "0", saida: "0" },
    "Crianças de 03 a 17 anos": { entrada: "0", saida: "0" },
    "Bebês de 0 até 02 a. e 11 m.": { entrada: "0", saida: "0" }
  });

  // Saldo anterior acumulado vindo do banco de dados para cada categoria
  const [saldoAnterior, setSaldoAnterior] = useState<Record<string, number>>({
    "Mulheres": 0,
    "Crianças de 03 a 17 anos": 0,
    "Bebês de 0 até 02 a. e 11 m.": 0
  });

  // 1. Verificação de Acesso
  useEffect(() => {
    async function checkPermission() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    }
    checkPermission();
  }, [router]);

  // 2. Carrega as movimentações quando o mês selecionado muda
  useEffect(() => {
    async function fetchMovements() {
      if (!selectedMonth) return;
      setFetching(true);
      const dataReferencia = `${selectedMonth}-01`;

      try {
        const res = await fetch(`/api/movimentacoes?data_referencia=${dataReferencia}`);
        if (res.ok) {
          const body = await res.json();
          const data = body.movimentacoes;
          const prevSaldos = body.saldo_anterior;
          
          // Reinicializa com 0
          const initialRows: Record<string, { entrada: string; saida: string }> = {};
          CATEGORIAS_FIXAS.forEach(cat => {
            initialRows[cat] = { entrada: "0", saida: "0" };
          });

          // Preenche com os dados do banco se houver
          if (Array.isArray(data) && data.length > 0) {
            data.forEach((item: any) => {
              if (initialRows[item.categoria] !== undefined) {
                initialRows[item.categoria] = {
                  entrada: String(item.entrada ?? 0),
                  saida: String(item.saida ?? 0)
                };
              }
            });
          }
          setRows(initialRows);

          // Atualiza saldo anterior acumulado
          const parsedSaldos: Record<string, number> = {};
          CATEGORIAS_FIXAS.forEach(cat => {
            parsedSaldos[cat] = Number(prevSaldos?.[cat] ?? 0);
          });
          setSaldoAnterior(parsedSaldos);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da Casa Abrigo:", err);
      } finally {
        setFetching(false);
      }
    }

    fetchMovements();
  }, [selectedMonth]);

  // 3. Funções para atualizar os valores de entrada e saída na planilha
  const handleInputChange = (categoria: string, campo: 'entrada' | 'saida', valor: string) => {
    // Permite vazio ou apenas números
    if (valor !== "" && !/^\d+$/.test(valor)) return;
    setRows(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: valor
      }
    }));
  };

  // 4. Cálculos em Tela (Dinâmicos e não persistidos)
  const totals = useMemo(() => {
    let sumSaldoAnterior = 0;
    let sumEntradas = 0;
    let sumSaidas = 0;
    let sumSaldoAtual = 0;

    const calculatedRows = CATEGORIAS_FIXAS.map(cat => {
      const salPrev = Number(saldoAnterior[cat] ?? 0);
      const entrada = Number(rows[cat]?.entrada || 0);
      const saida = Number(rows[cat]?.saida || 0);
      const saldoAtual = salPrev + entrada - saida;

      sumSaldoAnterior += salPrev;
      sumEntradas += entrada;
      sumSaidas += saida;
      sumSaldoAtual += saldoAtual;

      return {
        categoria: cat,
        saldoAnterior: salPrev,
        entrada,
        saida,
        saldoAtual
      };
    });

    return {
      rows: calculatedRows,
      sumSaldoAnterior,
      sumEntradas,
      sumSaidas,
      sumSaldoAtual
    };
  }, [rows, saldoAnterior]);

  // Validação em tempo real: se alguma saída exceder (Saldo Anterior + Entrada)
  const hasErrors = useMemo(() => {
    return CATEGORIAS_FIXAS.some(cat => {
      const salPrev = Number(saldoAnterior[cat] ?? 0);
      const entrada = Number(rows[cat]?.entrada || 0);
      const saida = Number(rows[cat]?.saida || 0);
      return saida > salPrev + entrada;
    });
  }, [rows, saldoAnterior]);

  // 5. Salvar Dados
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação/Trava de segurança: Saída <= Saldo Anterior + Entrada
    for (const cat of CATEGORIAS_FIXAS) {
      const salPrev = Number(saldoAnterior[cat] ?? 0);
      const entrada = Number(rows[cat]?.entrada || 0);
      const saida = Number(rows[cat]?.saida || 0);

      if (saida > salPrev + entrada) {
        alert(`Erro de Validação: Para a categoria "${cat}", a Saída (${saida}) não pode ser maior do que o Saldo Anterior (${salPrev}) + Entrada (${entrada}) = ${salPrev + entrada}.`);
        return;
      }
    }

    setLoading(true);
    const dataReferencia = `${selectedMonth}-01`;

    // Converte o objeto de linhas no formato JSON que o backend espera
    const payloadMovimentacoes: any[] = [];
    CATEGORIAS_FIXAS.forEach(cat => {
      payloadMovimentacoes.push({
        categoria: cat,
        tipo_fluxo: 'E',
        quantidade: Number(rows[cat].entrada || 0)
      });
      payloadMovimentacoes.push({
        categoria: cat,
        tipo_fluxo: 'S',
        quantidade: Number(rows[cat].saida || 0)
      });
    });

    const payload = {
      data_referencia: dataReferencia,
      movimentacoes: payloadMovimentacoes
    };

    try {
      const res = await fetch('/api/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          router.push("/dashboard/listas/casa-abrigo");
        }, 1500);
      } else {
        const errData = await res.json();
        alert("Erro ao salvar: " + (errData.error || "Ocorreu um erro no servidor."));
      }
    } catch (err: any) {
      alert("Erro de conexão: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (hasAccess === null) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative">
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
        <p className="text-gray-600 mt-2 text-sm">Usuário não autenticado ou sem permissões válidas.</p>
        <button onClick={() => router.push("/dashboard")} className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/30">Voltar ao Painel</button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl bg-white/70 backdrop-blur-md border border-white/60 shadow-2xl rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Cabeçalho com link de retorno */}
      <div className="mb-8 border-b border-primary/10 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/listas/casa-abrigo" className="text-primary hover:text-primary-dark transition-colors flex items-center gap-1 text-sm font-semibold">
              <ArrowLeft size={16} /> Voltar para a Lista
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-primary-dark">Movimentações - Casa Abrigo</h1>
          <p className="text-gray-600 text-sm">Registre as entradas e saídas de acolhidos no mês correspondente.</p>
        </div>
        <div className="h-12 w-12 bg-purple-100 rounded-2xl flex items-center justify-center text-primary shadow-sm">
          <FileText size={24} />
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-12 text-green-600 animate-pulse bg-green-50/50 rounded-2xl border border-green-100">
          <CheckCircle size={64} className="mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold">Planilha Salva com Sucesso!</h2>
          <p className="text-sm text-green-700 mt-2">Redirecionando para o histórico...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Seletor de Mês */}
          <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={22} className="text-primary" />
              <div>
                <label className="text-sm font-bold text-gray-700">Mês de Referência</label>
                <p className="text-xs text-gray-500">Selecione o mês da planilha</p>
              </div>
            </div>
            <input 
              type="month" 
              required
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="p-3 rounded-xl bg-white border border-purple-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-semibold text-gray-700"
            />
          </div>

          {/* Planilha Interativa */}
          <div className="bg-white/80 rounded-2xl border border-purple-100 shadow-sm overflow-hidden relative">
            
            {fetching && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center gap-2">
                <Loader2 className="animate-spin text-primary" size={24} />
                <span className="text-primary font-bold text-sm">Carregando dados do mês...</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 border-collapse">
                <thead className="text-xs text-gray-700 uppercase bg-purple-50/60 border-b border-purple-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Categoria Acolhidos</th>
                    <th className="px-6 py-4 text-center font-bold w-36">Saldo Anterior</th>
                    <th className="px-6 py-4 text-center font-bold w-36">Entrada (E)</th>
                    <th className="px-6 py-4 text-center font-bold w-36">Saída (S)</th>
                    <th className="px-6 py-4 text-center font-bold bg-purple-50/30 w-36">Saldo Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {totals.rows.map((row) => {
                    const hasLimitError = row.saida > (row.saldoAnterior + row.entrada);
                    return (
                      <tr key={row.categoria} className={`hover:bg-purple-50/20 transition-colors ${hasLimitError ? 'bg-red-50/10' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-gray-800">{row.categoria}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-600 bg-gray-50/30">
                          {row.saldoAnterior}
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            min="0"
                            required
                            value={rows[row.categoria]?.entrada || ""}
                            onChange={e => handleInputChange(row.categoria, 'entrada', e.target.value)}
                            className="w-full text-center p-2 rounded-lg bg-white border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono font-semibold"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            min="0"
                            required
                            value={rows[row.categoria]?.saida || ""}
                            onChange={e => handleInputChange(row.categoria, 'saida', e.target.value)}
                            className={`w-full text-center p-2 rounded-lg bg-white border outline-none focus:ring-2 transition-all font-mono font-semibold ${hasLimitError ? 'border-red-500 focus:border-red-500 focus:ring-red-100 bg-red-50/30 text-red-700' : 'border-gray-200 focus:border-primary focus:ring-primary/10'}`}
                          />
                          {hasLimitError && (
                            <span className="text-[10px] text-red-500 font-bold block text-center mt-1">
                              Máx. permitido: {row.saldoAnterior + row.entrada}
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-center font-mono font-bold ${row.saldoAtual < 0 ? 'text-red-500' : 'text-gray-700'} bg-purple-50/10`}>
                          {row.saldoAtual}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Rodapé com Totais Gerais (Dinâmicos) */}
                <tfoot className="bg-purple-50/40 border-t-2 border-purple-100 font-bold text-gray-800">
                  <tr>
                    <td className="px-6 py-4 uppercase text-xs tracking-wider">Total Geral da Planilha</td>
                    <td className="px-6 py-4 text-center font-mono text-gray-600 text-sm bg-gray-50/30">{totals.sumSaldoAnterior}</td>
                    <td className="px-6 py-4 text-center font-mono text-primary text-base">{totals.sumEntradas}</td>
                    <td className="px-6 py-4 text-center font-mono text-primary text-base">{totals.sumSaidas}</td>
                    <td className="px-6 py-4 text-center font-mono text-white bg-primary text-base rounded-br-2xl">{totals.sumSaldoAtual}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || fetching || hasErrors}
            className={`w-full py-4 font-bold rounded-xl shadow-lg active:scale-[0.99] transition-all flex justify-center items-center gap-2 ${hasErrors ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-primary-dark text-white hover:shadow-primary/20'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Planilha do Mês</>}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CasaAbrigoForm() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-main-gradient p-4 relative">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
          <p className="text-white font-bold animate-pulse text-sm drop-shadow-md">Carregando...</p>
        </div>
      }>
        <CasaAbrigoFormContent />
      </Suspense>
    </div>
  );
}
