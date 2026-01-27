"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  LogOut, 
  ShieldAlert,
  FileText,
  PlusCircle,
  List,
  Menu, 
  X,
  UserCog 
} from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Controle de Permissões
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFortalecimento, setIsFortalecimento] = useState(false);
  
  // Controle Menu Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Busca Perfil + Nome da Coordenação
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, coordinations(name)")
      .eq("id", user.id)
      .single();

    if (profile) {
      // 1. Verifica se é Admin
      if (profile.role === "admin") {
        setIsAdmin(true);
      }

      // 2. Verifica se é da Coordenação de Fortalecimento
      // CORREÇÃO DO ERRO DE TYPESCRIPT AQUI:
      // Forçamos o tipo 'any' para poder verificar se é Array ou Objeto sem o TS reclamar
      const coords: any = profile.coordinations;
      
      let coordName = "";
      
      if (coords) {
          if (Array.isArray(coords)) {
              // Se vier como lista (Array), pega o primeiro item
              coordName = coords[0]?.name || "";
          } else {
              // Se vier como objeto único
              coordName = coords.name || "";
          }
      }

      if (coordName.toLowerCase().includes("fortalecimento")) {
        setIsFortalecimento(true);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- DEFINIÇÃO DOS MENUS ---
  const menuGroups = [
    { 
      section: "Geral",
      visible: true, 
      items: [
        { name: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" }
      ]
    },
    { 
      section: "Mobilização",
      visible: true, 
      items: [
        { name: "Novo Registro", icon: PlusCircle, href: "/dashboard/formularios/mobilizacao" },
        { name: "Ver Lista", icon: List, href: "/dashboard/listas/mobilizacao" }
      ]
    },
    { 
      section: "Materiais",
      visible: true, 
      items: [
        { name: "Nova Entrega", icon: PlusCircle, href: "/dashboard/formularios/materiais" },
        { name: "Ver Materiais Entregues", icon: List, href: "/dashboard/listas/materiais" }
      ]
    },
    { 
      section: "Atendimentos",
      // Só aparece se for Admin OU Fortalecimento
      visible: isAdmin || isFortalecimento, 
      items: [
        { name: "Novo Registro", icon: FileText, href: "/dashboard/formularios/atendimento" },
        { name: "Ver Lista", icon: List, href: "/dashboard/listas/atendimento" }
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-white">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="h-8 w-8 bg-gradient-to-tr from-accent to-purple-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">S</div>
          <span className="text-xl font-bold tracking-wide">SUPEV</span>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group, idx) => (
            group.visible && (
              <div key={idx}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4">
                  {group.section}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm ${isActive ? "bg-accent text-white shadow-lg shadow-accent/30 font-semibold" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                          <item.icon size={18} />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )
          ))}

          {isAdmin && (
            <div>
              <div className="my-2 border-t border-white/10 mx-4"></div>
              <h3 className="text-xs font-bold text-yellow-500/80 uppercase tracking-wider mb-2 px-4 mt-4">
                Administração
              </h3>
              <Link href="/dashboard/admin/usuarios">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-yellow-300 hover:bg-white/10 transition-all cursor-pointer text-sm">
                  <ShieldAlert size={18} />
                  <span>Gestão Usuários</span>
                </div>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          <Link href="/dashboard/perfil">
             <div className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-all text-sm font-medium cursor-pointer">
                <UserCog size={18} />
                <span>Minha Conta</span>
             </div>
          </Link>

          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-xl transition-all text-sm font-medium">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <aside className="hidden md:flex flex-col w-64 bg-primary-dark shadow-2xl z-20">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out md:hidden`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className="relative w-72 h-full bg-primary-dark shadow-2xl border-r border-white/10">
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                <X size={24} />
            </button>
            <SidebarContent />
        </div>
      </div>

      <main className="flex-1 flex flex-col h-full relative bg-main-gradient overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 bg-primary-dark border-b border-white/10 text-white z-10 shadow-md">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-tr from-accent to-purple-500 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg">S</div>
                <span className="font-bold tracking-wide text-lg">SUPEV</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-lg active:scale-95 transition-all text-white">
                <Menu size={26} />
            </button>
        </div>

        <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-purple-400/20 rounded-full blur-[80px] md:blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-pink-400/20 rounded-full blur-[80px] md:blur-[100px]"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 scroll-smooth">
           {children}
        </div>
      </main>
    </div>
  );
}