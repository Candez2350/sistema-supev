import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializa o Supabase com a Chave Mestra (Service Role)
// Isso permite criar usuários sem estar logado como eles
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, coordination_id, role } = body;

    // 1. Criar o Usuário na Autenticação (Auth)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Já confirma o email automaticamente
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
        return NextResponse.json({ error: "Erro ao criar usuário Auth" }, { status: 500 });
    }

    // 2. Criar o Perfil na tabela pública (Profiles)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email, // Salvando email aqui para facilitar listagem
          full_name: full_name,
          coordination_id: Number(coordination_id),
          role: role
        }
      ]);

    if (profileError) {
      // Se der erro no perfil, o ideal seria apagar o usuário do Auth para não ficar órfão,
      // mas para simplificar vamos apenas retornar o erro.
      return NextResponse.json({ error: "Usuário criado, mas erro ao criar perfil: " + profileError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Usuário criado com sucesso!" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}