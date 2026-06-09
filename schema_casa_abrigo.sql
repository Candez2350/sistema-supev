-- ==========================================
-- ESTRUTURA DO BANCO DE DADOS (DDL)
-- ==========================================

-- Tabela que registra as movimentações de entrada (E) e saída (S) da Casa Abrigo de forma normalizada.
CREATE TABLE movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_referencia DATE NOT NULL,
    categoria VARCHAR(100) NOT NULL CHECK (categoria IN ('Mulheres', 'Crianças de 03 a 17 anos', 'Bebês de 0 até 02 a. e 11 m.')),
    tipo_fluxo CHAR(1) NOT NULL CHECK (tipo_fluxo IN ('E', 'S')), -- 'E' para Entrada, 'S' para Saída
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    user_id UUID, -- Vinculação opcional com o usuário que registrou a ação
    
    -- Restrição exclusiva para evitar duplicidade de categoria e fluxo no mesmo mês/data de referência
    CONSTRAINT unique_movimentacao_categoria_fluxo UNIQUE (data_referencia, categoria, tipo_fluxo)
);

-- Índices para otimização de consultas por data e filtro de categorias
CREATE INDEX idx_movimentacoes_data_referencia ON movimentacoes(data_referencia);

-- Comentários das tabelas e colunas
COMMENT ON TABLE movimentacoes IS 'Tabela que armazena os fluxos de entrada e saída por categoria da Casa Abrigo.';
COMMENT ON COLUMN movimentacoes.data_referencia IS 'Data de referência correspondente ao primeiro dia do mês de movimentação.';
COMMENT ON COLUMN movimentacoes.tipo_fluxo IS 'Tipo do fluxo de movimentação: E (Entrada) ou S (Saída).';


-- ==========================================
-- FUNÇÃO RPC PARA OPERAÇÃO TRANSACIONAL
-- ==========================================

-- Função que executa a deleção prévia dos registros existentes do mês e a inserção dos novos de forma atômica (Transaction).
-- O PostgreSQL executa funções PL/pgSQL dentro de uma transação automática, fornecendo Rollback em caso de erros de integridade.
CREATE OR REPLACE FUNCTION salvar_movimentacoes_abrigo(
    p_data_ref DATE,
    p_movimentacoes JSONB
) RETURNS VOID AS $$
BEGIN
    -- 1. Deleta registros existentes para evitar duplicidade de dados no reenvio/edição
    DELETE FROM movimentacoes 
    WHERE data_referencia = p_data_ref;

    -- 2. Insere os novos dados deserializando a lista JSONB vinda do Front-end
    INSERT INTO movimentacoes (data_referencia, categoria, tipo_fluxo, quantidade)
    SELECT 
        p_data_ref,
        (item->>'categoria')::VARCHAR,
        (item->>'tipo_fluxo')::CHAR(1),
        (item->>'quantidade')::INTEGER
    FROM jsonb_array_elements(p_movimentacoes) AS item;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VIEW PARA AGREGAR E PIVOTAR A LISTAGEM MENSAL
-- ==========================================

-- Esta view agrupa as movimentações de entrada e saída por mês (data_referencia),
-- dividindo entre Mulheres e Dependentes (crianças + bebês).
CREATE OR REPLACE VIEW view_movimentacoes_mensais AS
SELECT 
    data_referencia,
    -- Mulheres
    SUM(CASE WHEN categoria = 'Mulheres' AND tipo_fluxo = 'E' THEN quantidade ELSE 0 END) AS mulheres_entrada,
    SUM(CASE WHEN categoria = 'Mulheres' AND tipo_fluxo = 'S' THEN quantidade ELSE 0 END) AS mulheres_saida,
    -- Dependentes (Crianças + Bebês)
    SUM(CASE WHEN categoria IN ('Crianças de 03 a 17 anos', 'Bebês de 0 até 02 a. e 11 m.') AND tipo_fluxo = 'E' THEN quantidade ELSE 0 END) AS dependentes_entrada,
    SUM(CASE WHEN categoria IN ('Crianças de 03 a 17 anos', 'Bebês de 0 até 02 a. e 11 m.') AND tipo_fluxo = 'S' THEN quantidade ELSE 0 END) AS dependentes_saida
FROM movimentacoes
GROUP BY data_referencia;


