import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializa o cliente do Supabase com a Service Role Key para segurança e acesso de backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * handler POST: Recebe as movimentações de um determinado mês e realiza a atualização transacional.
 * Operação atômica (Transaction): deleta registros anteriores do mês e insere os novos em lote.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data_referencia, movimentacoes } = body;

    // 1. Validações básicas de payload
    if (!data_referencia || !Array.isArray(movimentacoes)) {
      return NextResponse.json(
        { error: "Dados inválidos. data_referencia e movimentacoes (array) são obrigatórios." },
        { status: 400 }
      );
    }

    // 2. Chama a RPC customizada no Supabase que gerencia a transação SQL de forma segura
    const { error } = await supabase.rpc('salvar_movimentacoes_abrigo', {
      p_data_ref: data_referencia,
      p_movimentacoes: movimentacoes
    });

    if (error) {
      console.error("Erro na transação salvar_movimentacoes_abrigo:", error.message);
      return NextResponse.json(
        { error: "Erro ao salvar movimentações no banco de dados: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Movimentações salvas com sucesso!" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Erro interno no POST de movimentações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

/**
 * handler GET: Retorna os dados agregados (pivotados) de um determinado mês.
 * Formato retornado: Array de objetos { categoria, entrada, saida } prontos para renderização em planilha.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dataRef = searchParams.get('data_referencia'); // Formato esperado: YYYY-MM-DD

    // Se não for fornecida a data_referencia, retorna o histórico agregado de todos os meses (Listagem)
    if (!dataRef) {
      const { data, error } = await supabase
        .from('view_movimentacoes_mensais')
        .select('*')
        .order('data_referencia', { ascending: false });

      if (error) {
        console.error("Erro ao carregar view_movimentacoes_mensais:", error.message);
        return NextResponse.json(
          { error: "Erro ao buscar listagem: " + error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || [], { status: 200 });
    }

    // 1. Busca os registros brutos do banco usando queries parametrizadas nativas (previne SQL Injection)
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('categoria, tipo_fluxo, quantidade')
      .eq('data_referencia', dataRef);

    if (error) {
      console.error("Erro ao buscar movimentações:", error.message);
      return NextResponse.json(
        { error: "Erro ao buscar movimentações: " + error.message },
        { status: 500 }
      );
    }

    // 1b. Busca todos os registros de meses anteriores para calcular o saldo acumulado (Saldo Anterior)
    const { data: prevData, error: prevError } = await supabase
      .from('movimentacoes')
      .select('categoria, tipo_fluxo, quantidade')
      .lt('data_referencia', dataRef);

    if (prevError) {
      console.error("Erro ao buscar saldos anteriores:", prevError.message);
      return NextResponse.json(
        { error: "Erro ao carregar histórico de saldos anteriores: " + prevError.message },
        { status: 500 }
      );
    }

    // Categorias fixas definidas nos requisitos
    const categoriasFixas = [
      'Mulheres',
      'Crianças de 03 a 17 anos',
      'Bebês de 0 até 02 a. e 11 m.'
    ];

    // Calcula os saldos anteriores acumulados (Entrada - Saída) por categoria
    const saldoAnterior: Record<string, number> = {};
    categoriasFixas.forEach(cat => {
      saldoAnterior[cat] = 0;
    });

    if (prevData) {
      prevData.forEach(row => {
        if (saldoAnterior[row.categoria] !== undefined) {
          if (row.tipo_fluxo === 'E') {
            saldoAnterior[row.categoria] += row.quantidade;
          } else if (row.tipo_fluxo === 'S') {
            saldoAnterior[row.categoria] -= row.quantidade;
          }
        }
      });
    }

    // 2. Inicializa a tabela pivotada vazia para garantir que todas as categorias apareçam mesmo sem dados
    const pivotTable: Record<string, { entrada: number; saida: number }> = {};
    categoriasFixas.forEach(cat => {
      pivotTable[cat] = { entrada: 0, saida: 0 };
    });

    // 3. Popula com os dados retornados do banco de dados
    if (data) {
      data.forEach(row => {
        if (pivotTable[row.categoria] !== undefined) {
          if (row.tipo_fluxo === 'E') {
            pivotTable[row.categoria].entrada = row.quantidade;
          } else if (row.tipo_fluxo === 'S') {
            pivotTable[row.categoria].saida = row.quantidade;
          }
        }
      });
    }

    // 4. Mapeia a estrutura de objeto em array amigável para o front-end
    const responseData = Object.entries(pivotTable).map(([categoria, fluxos]) => ({
      categoria,
      entrada: fluxos.entrada,
      saida: fluxos.saida
    }));

    // Retorna as movimentações do mês e os saldos anteriores para validação no front-end
    return NextResponse.json({
      movimentacoes: responseData,
      saldo_anterior: saldoAnterior
    }, { status: 200 });

  } catch (error: any) {
    console.error("Erro interno no GET de movimentações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
