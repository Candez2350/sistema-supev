# Arquitetura do Sistema SUPEV

Este documento descreve a arquitetura técnica e as decisões de design do projeto **sistema-supev**.

## 1. Visão Geral

O **sistema-supev** é uma aplicação web desenvolvida para gestão e monitoramento de atividades, atendimentos e materiais da SUPEV. O sistema oferece um painel administrativo (Dashboard) com controle de acesso baseado em perfis, visualização de dados através de gráficos e formulários para entrada de dados.

## 2. Stack Tecnológico

### Frontend
*   **Framework:** [Next.js](https://nextjs.org/) (versão com App Router)
*   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
*   **Biblioteca UI:** [React](https://react.dev/)
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
*   **Ícones:** [Lucide React](https://lucide.dev/)
*   **Gráficos:** [Chart.js](https://www.chartjs.org/) com [react-chartjs-2](https://react-chartjs-2.js.org/)

### Backend & Infraestrutura (BaaS)
*   **Plataforma:** [Supabase](https://supabase.com/)
*   **Banco de Dados:** PostgreSQL (gerenciado pelo Supabase)
*   **Autenticação:** Supabase Auth
*   **API:** Supabase Client (RESTful via PostgREST)

## 3. Estrutura do Projeto

A estrutura de pastas segue o padrão do **App Router** do Next.js:

```
/app
  /dashboard           # Área protegida do sistema
    layout.tsx         # Layout principal (Sidebar, Verificação de Auth)
    page.tsx           # Visão Geral (KPIs, Gráficos)
    /formularios       # Páginas de formulários (Criação/Edição)
      /atendimento     # Formulário de Atendimentos (Regional/Unidade)
      /materiais       # Formulário de Entrega de Materiais
      /mobilizacao     # Formulário de Mobilização
    /listas            # Páginas de listagem de dados
      /atendimento     # Lista de Atendimentos
      /materiais       # Lista de Materiais Entregues
      /mobilizacao     # Lista de Mobilizações
    /perfil            # Gerenciamento de perfil do usuário
    /admin             # Área administrativa (Gestão de Usuários)
/lib
  supabase.ts          # Configuração e inicialização do cliente Supabase
```

## 4. Modelo de Dados (Inferido)

O sistema interage com as seguintes tabelas no banco de dados PostgreSQL:

*   **`profiles`**: Perfis de usuários estendidos.
    *   `id`: UUID (FK para `auth.users`)
    *   `role`: Texto ('admin', 'user', etc.)
    *   `coordination_id`: Inteiro (FK para `coordinations`)
*   **`coordinations`**: Unidades de coordenação.
    *   `id`: Inteiro
    *   `name`: Texto
*   **`materials_delivered`**: Registro de entrega de materiais.
    *   `id`: Inteiro
    *   `date_delivery`: Data
    *   `material_type`: Texto
    *   `quantity`: Inteiro
    *   `recipient`: Texto
    *   `municipality`: Texto
    *   `coordination_id`: Inteiro (FK)
*   **`services_regional`**: Atendimentos do Ônibus Lilás.
    *   `id`: Inteiro
    *   `date_service`: Data
    *   `municipality`: Texto
    *   `origin`: Texto
    *   `internal_count`: Inteiro
    *   `partner_count`: Inteiro
    *   `coordination_id`: Inteiro (FK)
*   **`services_units`**: Atendimentos dos Centros (Unidades fixas).
    *   `id`: Inteiro
    *   `date_reference`: Data
    *   `unit_name`: Texto
    *   `monthly_count`: Inteiro
    *   `coordination_id`: Inteiro (FK)
*   **`mobilizations`**: Registros de mobilização.
    *   `id`: Inteiro
    *   `date_event`: Data
    *   `mobilization_type`: Texto
    *   `participants_count`: Inteiro
    *   `municipalities`: Texto
    *   `coordination_id`: Inteiro (FK)

## 5. Autenticação e Autorização

*   **Autenticação:** Gerenciada pelo Supabase Auth. O layout do dashboard (`app/dashboard/layout.tsx`) verifica a sessão do usuário e redireciona para o login se não estiver autenticado.
*   **Controle de Acesso (RBAC):**
    *   O sistema verifica o campo `role` na tabela `profiles`.
    *   **Admin:** Tem acesso total a todas as coordenações e funcionalidades administrativas.
    *   **Coordenação:** Usuários comuns veem apenas dados relacionados à sua `coordination_id`.
    *   **Coordenação de Fortalecimento:** Possui acesso específico aos formulários de atendimento.

## 6. Padrões de Código

*   **Client Components:** Uso extensivo de `"use client"` para interatividade (hooks, eventos).
*   **Hooks:** `useState` para estado local, `useEffect` para data fetching.
*   **Ícones:** Uso da biblioteca `lucide-react` para consistência visual.
*   **Feedback:** Uso de `alert()` e `confirm()` nativos para interações simples, e estados de carregamento (`loading`) com spinners (`Loader2`).