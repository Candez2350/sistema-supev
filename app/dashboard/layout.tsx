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
  List
} from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      setIsAdmin(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Menu Atualizado com os novos caminhos
  const menuItems = [
    { 
      section: "Geral",
      items: [
        { name: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" }
      ]
    },
    { 
      section: "Mobilização",
      items: [
        { name: "Novo Registro", icon: PlusCircle, href: "/dashboard/formularios/mobilizacao" },
        { name: "Ver Lista", icon: List, href: "/dashboard/listas/mobilizacao" }
      ]
    },
    { 
      section: "Materiais",
      items: [
        { name: "Nova Entrega", icon: PlusCircle, href: "/dashboard/formularios/materiais" },
        { name: "Ver Materiais Entregues", icon: List, href: "/dashboard/listas/materiais" }
      ]
    },
    { 
      section: "Atendimentos",
      items: [
        { name: "Novo Registro", icon: FileText, href: "/dashboard/formularios/atendimento" },
        { name: "Ver Atendimentos", icon: List, href: "/dashboard/listas/atendimento" }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-primary-dark text-white shadow-2xl z-20 overflow-y-auto custom-scrollbar">
        <div className="p-6 flex items-center gap-3 border-b border-white/10 sticky top-0 bg-primary-dark z-10">
          <div className="h-8 w-8 bg-gradient-to-tr from-accent to-purple-500 rounded-lg flex items-center justify-center font-bold">S</div>
          <span className="text-xl font-bold tracking-wide">SUPEV</span>
        </div>

        <nav className="flex-1 p-4 space-y-6">
          {menuItems.map((group, idx) => (
            <div key={idx}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4">
                {group.section}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm ${isActive ? "bg-accent text-white shadow-lg shadow-accent/30 translate-x-1 font-semibold" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                        <item.icon size={18} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Área Admin */}
          {isAdmin && (
            <div>
              <div className="my-2 border-t border-white/10 mx-4"></div>
              <h3 className="text-xs font-bold text-yellow-500/80 uppercase tracking-wider mb-2 px-4 mt-4">
                Administração
              </h3>
              <Link href="/dashboard/admin/usuarios">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-yellow-300 hover:bg-white/10 transition-all cursor-pointer text-sm">
                  <ShieldAlert size={18} />
                  <span>Gestão Usuários</span>
                </div>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-xl transition-all text-sm">
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto relative bg-main-gradient">
         {/* Background Decorativo */}
        <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-400/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="p-8 pb-20">
           {children}
        </div>
      </main>
    </div>
  );
}