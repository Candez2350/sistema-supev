"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  FileText, 
  Calendar, 
  Filter, 
  Download, 
  Loader2, 
  CheckSquare, 
  Square, 
  ChevronDown,
  RefreshCw,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- TYPES ---
type Coordination = { id: number; name: string };
type Mobilization = { 
  id: number; 
  date_event: string; 
  mobilization_type: string; 
  participants_count: number; 
  municipalities: string; 
  coordination_id: number; 
  responsible: string;
  coordinations?: { name: string } | null;
};
type Material = { 
  id: number; 
  date_delivery: string; 
  material_type: string; 
  quantity: number; 
  recipient: string; 
  municipality: string; 
  coordination_id: number;
  coordinations?: { name: string } | null;
};
type ServiceRegional = { 
  id: number; 
  date_service: string; 
  municipality: string; 
  origin: string; 
  internal_count: number; 
  partner_count: number; 
  coordination_id: number;
  coordinations?: { name: string } | null;
};
type ServiceUnit = { 
  id: number; 
  date_reference: string; 
  unit_name: string; 
  monthly_count: number; 
  coordination_id: number;
  coordinations?: { name: string } | null;
};

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ role: string; coordination_id: number | null } | null>(null);
  
  // Catalogs
  const [coordinations, setCoordinations] = useState<Coordination[]>([]);
  
  // Selected Filters
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [isCoordDropdownOpen, setIsCoordDropdownOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  
  // Data Sections to include
  const [includeMobs, setIncludeMobs] = useState(true);
  const [includeMats, setIncludeMats] = useState(true);
  const [includeServReg, setIncludeServReg] = useState(true);
  const [includeServUnit, setIncludeServUnit] = useState(true);

  // Fetched Filtered Data
  const [mobs, setMobs] = useState<Mobilization[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [servRegional, setServRegional] = useState<ServiceRegional[]>([]);
  const [servUnits, setServUnits] = useState<ServiceUnit[]>([]);
  
  // Tab para Pré-visualização dos Dados
  const [activePreviewTab, setActivePreviewTab] = useState<"mobs" | "materials" | "regional" | "units">("mobs");

  useEffect(() => {
    fetchInitialSetup();
  }, []);

  // Whenever filters change, fetch data (or we can trigger it with a "Filtrar" button for better UX)
  const handleFilter = async () => {
    setLoading(true);
    try {
      // Build queries based on selections
      let activeCoordIds = selectedCoords.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      // If user is restricted to a coordination, override selectedCoords
      if (userProfile && userProfile.role !== "admin" && userProfile.coordination_id) {
        activeCoordIds = [userProfile.coordination_id];
      }

      // Fetch Mobilizations
      let mobsQuery = supabase.from("mobilizations").select("*, coordinations(name)");
      if (activeCoordIds.length > 0) {
        mobsQuery = mobsQuery.in("coordination_id", activeCoordIds);
      }
      if (dateStart) {
        mobsQuery = mobsQuery.gte("date_event", dateStart);
      }
      if (dateEnd) {
        mobsQuery = mobsQuery.lte("date_event", dateEnd);
      }
      const mobsRes = await mobsQuery.order("date_event", { ascending: false });

      // Fetch Materials
      let matsQuery = supabase.from("materials_delivered").select("*, coordinations(name)");
      if (activeCoordIds.length > 0) {
        matsQuery = matsQuery.in("coordination_id", activeCoordIds);
      }
      if (dateStart) {
        matsQuery = matsQuery.gte("date_delivery", dateStart);
      }
      if (dateEnd) {
        matsQuery = matsQuery.lte("date_delivery", dateEnd);
      }
      const matsRes = await matsQuery.order("date_delivery", { ascending: false });

      // Fetch Regional Services
      let sRegQuery = supabase.from("services_regional").select("*, coordinations(name)");
      if (activeCoordIds.length > 0) {
        sRegQuery = sRegQuery.in("coordination_id", activeCoordIds);
      }
      if (dateStart) {
        sRegQuery = sRegQuery.gte("date_service", dateStart);
      }
      if (dateEnd) {
        sRegQuery = sRegQuery.lte("date_service", dateEnd);
      }
      const sRegRes = await sRegQuery.order("date_service", { ascending: false });

      // Fetch Unit Services
      let sUnitQuery = supabase.from("services_units").select("*, coordinations(name)");
      if (activeCoordIds.length > 0) {
        sUnitQuery = sUnitQuery.in("coordination_id", activeCoordIds);
      }
      if (dateStart) {
        sUnitQuery = sUnitQuery.gte("date_reference", dateStart);
      }
      if (dateEnd) {
        sUnitQuery = sUnitQuery.lte("date_reference", dateEnd);
      }
      const sUnitRes = await sUnitQuery.order("date_reference", { ascending: false });

      setMobs(mobsRes.data || []);
      setMaterials(matsRes.data || []);
      setServRegional(sRegRes.data || []);
      setServUnits(sUnitRes.data || []);

    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialSetup = async () => {
    try {
      // 1. Get user Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch User Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, coordination_id")
        .eq("id", user.id)
        .single();

      setUserProfile(profile);

      // 3. Fetch coordinations
      const { data: coords } = await supabase.from("coordinations").select("*").order("name");
      const validCoords = coords || [];
      setCoordinations(validCoords);

      // 4. Default coordination selection based on role
      if (profile && profile.role !== "admin" && profile.coordination_id) {
        setSelectedCoords([profile.coordination_id.toString()]);
      }

      // Initial query execution
      setLoading(true);
      // Wait for states to settle or build queries immediately
      let activeCoordIds: number[] = [];
      if (profile && profile.role !== "admin" && profile.coordination_id) {
        activeCoordIds = [profile.coordination_id];
      }

      const [mobsRes, matsRes, sRegRes, sUnitRes] = await Promise.all([
        supabase.from("mobilizations").select("*, coordinations(name)").in("coordination_id", activeCoordIds.length > 0 ? activeCoordIds : validCoords.map(c => c.id)).order("date_event", { ascending: false }),
        supabase.from("materials_delivered").select("*, coordinations(name)").in("coordination_id", activeCoordIds.length > 0 ? activeCoordIds : validCoords.map(c => c.id)).order("date_delivery", { ascending: false }),
        supabase.from("services_regional").select("*, coordinations(name)").in("coordination_id", activeCoordIds.length > 0 ? activeCoordIds : validCoords.map(c => c.id)).order("date_service", { ascending: false }),
        supabase.from("services_units").select("*, coordinations(name)").in("coordination_id", activeCoordIds.length > 0 ? activeCoordIds : validCoords.map(c => c.id)).order("date_reference", { ascending: false })
      ]);

      setMobs(mobsRes.data || []);
      setMaterials(matsRes.data || []);
      setServRegional(sRegRes.data || []);
      setServUnits(sUnitRes.data || []);

    } catch (err) {
      console.error("Erro na configuração inicial:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCoord = (id: string) => {
    if (userProfile && userProfile.role !== "admin") return; // Restricted
    if (selectedCoords.includes(id)) {
      setSelectedCoords(selectedCoords.filter(x => x !== id));
    } else {
      setSelectedCoords([...selectedCoords, id]);
    }
  };

  const getCoordName = (item: any) => {
    if (item.coordinations) {
      return Array.isArray(item.coordinations) ? item.coordinations[0]?.name : item.coordinations?.name;
    }
    return "-";
  };

  // Helper date formatter
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "-";
    const dateOnly = dateStr.split("T")[0];
    const [year, month, day] = dateOnly.split("-");
    return `${day}/${month}/${year}`;
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      if (includeMobs && mobs.length > 0) {
        const data = mobs.map(m => ({
          Data: formatDateBR(m.date_event),
          "Tipo de Mobilização": m.mobilization_type,
          Participantes: m.participants_count,
          Municípios: m.municipalities,
          Coordenação: getCoordName(m),
          Responsável: m.responsible || "-"
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Mobilizações");
      }

      if (includeMats && materials.length > 0) {
        const data = materials.map(m => ({
          Data: formatDateBR(m.date_delivery),
          "Tipo de Material": m.material_type,
          Quantidade: m.quantity,
          Destinatário: m.recipient,
          Município: m.municipality,
          Coordenação: getCoordName(m)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Materiais Entregues");
      }

      if (includeServReg && servRegional.length > 0) {
        const data = servRegional.map(s => ({
          Data: formatDateBR(s.date_service),
          Município: s.municipality,
          Origem: s.origin,
          "Qtd Interno": s.internal_count,
          "Qtd Parceiro": s.partner_count,
          Total: s.internal_count + s.partner_count,
          Coordenação: getCoordName(s)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Atend. Regionais");
      }

      if (includeServUnit && servUnits.length > 0) {
        const data = servUnits.map(s => ({
          "Mês Referência": formatDateBR(s.date_reference),
          "Nome da Unidade": s.unit_name,
          Atendimentos: s.monthly_count,
          Coordenação: getCoordName(s)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Atend. Unidades");
      }

      if (wb.SheetNames.length === 0) {
        alert("Nenhum dado selecionado ou disponível para exportar.");
        setExporting(false);
        return;
      }

      XLSX.writeFile(wb, `Relatorio_SUPEV_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar planilha.");
    } finally {
      setExporting(false);
    }
  };

  // --- EXPORT TO PDF ---
  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const titleFont = "helvetica";

      // Design/Styling Setup
      const headerTitle1 = "Secretaria de Estado da Mulher e de Políticas Inclusivas";
      const headerTitle2 = "Superintendência de Enfrentamento às Violências";
      const docTitle = "RELATÓRIO CONSOLIDADO DE ATIVIDADES";
      
      let pageNumber = 1;

      // Add common header to a page
      const addPageHeader = (pdfDoc: jsPDF) => {
        // Header Background
        pdfDoc.setFillColor(243, 244, 246);
        pdfDoc.rect(0, 0, 210, 32, "F");

        // Primary Accent Line
        pdfDoc.setFillColor(110, 68, 255); // Brand Purple
        pdfDoc.rect(0, 31, 210, 1, "F");

        pdfDoc.setTextColor(60, 60, 60);
        pdfDoc.setFont(titleFont, "bold");
        pdfDoc.setFontSize(10);
        pdfDoc.text(headerTitle1.toUpperCase(), 14, 13);
        
        pdfDoc.setTextColor(110, 68, 255);
        pdfDoc.setFontSize(9);
        pdfDoc.text(headerTitle2.toUpperCase(), 14, 18);

        pdfDoc.setTextColor(100, 100, 100);
        pdfDoc.setFont(titleFont, "normal");
        pdfDoc.setFontSize(8);
        const periodStr = (dateStart || dateEnd) 
          ? `Período: ${dateStart ? formatDateBR(dateStart) : "Início"} até ${dateEnd ? formatDateBR(dateEnd) : "Fim"}`
          : "Período: Completo";
        pdfDoc.text(periodStr, 14, 25);
        pdfDoc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 155, 25);
      };

      // Footer
      const addPageFooter = (pdfDoc: jsPDF) => {
        pdfDoc.setFillColor(110, 68, 255);
        pdfDoc.rect(14, 282, 182, 0.5, "F");

        pdfDoc.setFont(titleFont, "normal");
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(120, 120, 120);
        pdfDoc.text("Sistema SUPEV", 14, 287);
        pdfDoc.text(`Página ${pageNumber}`, 180, 287);
        pageNumber++;
      };

      // Create Cover / Intro Section
      addPageHeader(doc);
      doc.setFont(titleFont, "bold");
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(docTitle, 14, 48);

      let currentY = 56;

      // Table generation utility
      const generatePDFSection = (
        title: string, 
        headers: string[], 
        rows: any[][], 
        startY: number
      ) => {
        doc.setFont(titleFont, "bold");
        doc.setFontSize(11);
        doc.setTextColor(110, 68, 255);
        doc.text(title.toUpperCase(), 14, startY);

        autoTable(doc, {
          startY: startY + 3,
          head: [headers],
          body: rows,
          theme: "striped",
          headStyles: { 
            fillColor: [110, 68, 255], 
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold"
          },
          bodyStyles: { 
            fontSize: 7.5,
            textColor: [50, 50, 50] 
          },
          margin: { left: 14, right: 14 },
          didDrawPage: (data: any) => {
            // If the table spans multiple pages
            if (data.pageNumber > 1) {
              addPageHeader(doc);
              addPageFooter(doc);
            }
          }
        });

        return (doc as any).lastAutoTable.finalY + 12;
      };

      let sectionsAdded = 0;

      // Section: Mobilizações
      if (includeMobs && mobs.length > 0) {
        const rows = mobs.map(m => [
          formatDateBR(m.date_event),
          m.mobilization_type,
          m.participants_count,
          m.municipalities,
          getCoordName(m),
          m.responsible || "-"
        ]);
        const headers = ["Data", "Tipo de Mobilização", "Partic.", "Municípios", "Coordenação", "Responsável"];
        
        if (currentY > 230) {
          addPageFooter(doc);
          doc.addPage();
          addPageHeader(doc);
          currentY = 42;
        }
        currentY = generatePDFSection("Mobilizações", headers, rows, currentY);
        sectionsAdded++;
      }

      // Section: Materiais
      if (includeMats && materials.length > 0) {
        const rows = materials.map(m => [
          formatDateBR(m.date_delivery),
          m.material_type,
          m.quantity,
          m.recipient,
          m.municipality,
          getCoordName(m)
        ]);
        const headers = ["Data", "Tipo de Material", "Qtd", "Destinatário", "Município", "Coordenação"];
        
        if (currentY > 230) {
          addPageFooter(doc);
          doc.addPage();
          addPageHeader(doc);
          currentY = 42;
        }
        currentY = generatePDFSection("Materiais Entregues", headers, rows, currentY);
        sectionsAdded++;
      }

      // Section: Atendimentos Regionais
      if (includeServReg && servRegional.length > 0) {
        const rows = servRegional.map(s => [
          formatDateBR(s.date_service),
          s.municipality,
          s.origin,
          s.internal_count,
          s.partner_count,
          s.internal_count + s.partner_count,
          getCoordName(s)
        ]);
        const headers = ["Data", "Município", "Origem", "Qtd Int.", "Qtd Parc.", "Total", "Coordenação"];
        
        if (currentY > 230) {
          addPageFooter(doc);
          doc.addPage();
          addPageHeader(doc);
          currentY = 42;
        }
        currentY = generatePDFSection("Atendimentos Regionais (Ônibus Lilás)", headers, rows, currentY);
        sectionsAdded++;
      }

      // Section: Atendimentos Unidades
      if (includeServUnit && servUnits.length > 0) {
        const rows = servUnits.map(s => [
          formatDateBR(s.date_reference),
          s.unit_name,
          s.monthly_count,
          getCoordName(s)
        ]);
        const headers = ["Mês Ref.", "Unidade", "Mensal", "Coordenação"];
        
        if (currentY > 230) {
          addPageFooter(doc);
          doc.addPage();
          addPageHeader(doc);
          currentY = 42;
        }
        currentY = generatePDFSection("Atendimentos de Unidades Fixas", headers, rows, currentY);
        sectionsAdded++;
      }

      if (sectionsAdded === 0) {
        alert("Nenhum dado selecionado ou disponível para exportar.");
        setExporting(false);
        return;
      }

      addPageFooter(doc);
      doc.save(`Relatorio_SUPEV_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  };

  const isUserAdmin = userProfile?.role === "admin";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Relatórios Consolidados</h1>
          <p className="text-sm text-gray-500">Gere e exporte planilhas e relatórios formatados em PDF.</p>
        </div>
        
        <button 
          onClick={handleFilter}
          disabled={loading}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all text-sm cursor-pointer"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Box de Filtros */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-6 space-y-6">
        <div className="flex items-center gap-2 text-primary font-bold text-base border-b border-gray-100 pb-3">
          <Filter size={20} />
          <span>Configuração dos Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Período */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Período</label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="date" 
                  value={dateStart} 
                  onChange={e => setDateStart(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary transition-all text-xs" 
                />
              </div>
              <span className="text-gray-400 text-xs">até</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="date" 
                  value={dateEnd} 
                  onChange={e => setDateEnd(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary transition-all text-xs" 
                />
              </div>
            </div>
          </div>

          {/* Coordenações */}
          <div className="space-y-2 relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Coordenação {!isUserAdmin && <span className="text-gray-400 font-normal">(Restrito)</span>}
            </label>
            
            {isUserAdmin ? (
              <>
                <button 
                  onClick={() => setIsCoordDropdownOpen(!isCoordDropdownOpen)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex justify-between items-center text-xs text-gray-700 focus:border-primary transition-all"
                >
                  <span className="truncate">
                    {selectedCoords.length === 0 
                      ? "Todas as coordenações" 
                      : `${selectedCoords.length} selecionada(s)`}
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isCoordDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isCoordDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-30 max-h-56 overflow-y-auto p-2 space-y-1">
                    <button 
                      onClick={() => setSelectedCoords([])}
                      className="w-full text-left text-xs px-3 py-2 text-primary hover:bg-gray-50 rounded-lg font-semibold"
                    >
                      Limpar Seleção
                    </button>
                    {coordinations.map(c => {
                      const isSelected = selectedCoords.includes(c.id.toString());
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => toggleCoord(c.id.toString())}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-all text-xs text-gray-700"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-primary" />
                          ) : (
                            <Square size={16} className="text-gray-300" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-600 font-medium">
                {coordinations.find(c => c.id === userProfile?.coordination_id)?.name || "Carregando..."}
              </div>
            )}
          </div>

          {/* Módulos do Relatório */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulos para Incluir</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeMobs} 
                  onChange={e => setIncludeMobs(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Mobilizações</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeMats} 
                  onChange={e => setIncludeMats(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Materiais</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeServReg} 
                  onChange={e => setIncludeServReg(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Atend. Regionais</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeServUnit} 
                  onChange={e => setIncludeServUnit(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Atend. Unidades</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button 
            onClick={handleFilter}
            disabled={loading}
            className="bg-primary/10 hover:bg-primary/20 text-primary font-bold px-6 py-2.5 rounded-xl text-xs active:scale-95 transition-all"
          >
            Filtrar Dados
          </button>
        </div>
      </div>

      {/* Controles de Exportação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={exportToExcel}
          disabled={loading || exporting}
          className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
        >
          {exporting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Download size={20} />
          )}
          <span>Exportar Planilha Excel (.xlsx)</span>
        </button>

        <button 
          onClick={exportToPDF}
          disabled={loading || exporting}
          className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
        >
          {exporting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <FileText size={20} />
          )}
          <span>Exportar Relatório PDF (.pdf)</span>
        </button>
      </div>

      {/* Resumo/Pré-visualização */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 text-gray-700 font-bold text-base">
            <Info size={20} className="text-primary" />
            <span>Pré-visualização dos Dados</span>
          </div>
          <span className="text-xs text-gray-400">Clique nas abas abaixo para ver os registros correspondentes</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-xs">Carregando visualização...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Abas e Contadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setActivePreviewTab("mobs")}
                className={`p-4 rounded-xl border text-left transition-all space-y-1 ${activePreviewTab === "mobs" ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary" : "bg-white border-gray-100 hover:border-gray-200"}`}
              >
                <span className="block text-xs font-semibold text-gray-400 uppercase">Mobilizações</span>
                <span className="block text-2xl font-bold text-primary-dark">{mobs.length}</span>
              </button>

              <button 
                onClick={() => setActivePreviewTab("materials")}
                className={`p-4 rounded-xl border text-left transition-all space-y-1 ${activePreviewTab === "materials" ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary" : "bg-white border-gray-100 hover:border-gray-200"}`}
              >
                <span className="block text-xs font-semibold text-gray-400 uppercase">Materiais</span>
                <span className="block text-2xl font-bold text-primary-dark">{materials.length}</span>
              </button>

              <button 
                onClick={() => setActivePreviewTab("regional")}
                className={`p-4 rounded-xl border text-left transition-all space-y-1 ${activePreviewTab === "regional" ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary" : "bg-white border-gray-100 hover:border-gray-200"}`}
              >
                <span className="block text-xs font-semibold text-gray-400 uppercase">Atend. Regionais</span>
                <span className="block text-2xl font-bold text-primary-dark">{servRegional.length}</span>
              </button>

              <button 
                onClick={() => setActivePreviewTab("units")}
                className={`p-4 rounded-xl border text-left transition-all space-y-1 ${activePreviewTab === "units" ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary" : "bg-white border-gray-100 hover:border-gray-200"}`}
              >
                <span className="block text-xs font-semibold text-gray-400 uppercase">Atend. Unidades</span>
                <span className="block text-2xl font-bold text-primary-dark">{servUnits.length}</span>
              </button>
            </div>

            {/* Tabela de Pré-visualização com scroll horizontal */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                {activePreviewTab === "mobs" && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-3">Data</th>
                        <th className="p-3">Tipo de Mobilização</th>
                        <th className="p-3">Participantes</th>
                        <th className="p-3">Municípios</th>
                        <th className="p-3">Coordenação</th>
                        <th className="p-3">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {mobs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum registro de mobilização encontrado.</td>
                        </tr>
                      ) : (
                        mobs.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDateBR(m.date_event)}</td>
                            <td className="p-3 font-medium text-gray-700">{m.mobilization_type}</td>
                            <td className="p-3">{m.participants_count}</td>
                            <td className="p-3 max-w-[200px] truncate">{m.municipalities}</td>
                            <td className="p-3">{getCoordName(m)}</td>
                            <td className="p-3">{m.responsible || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === "materials" && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-3">Data</th>
                        <th className="p-3">Tipo de Material</th>
                        <th className="p-3">Quantidade</th>
                        <th className="p-3">Destinatário</th>
                        <th className="p-3">Município</th>
                        <th className="p-3">Coordenação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {materials.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum registro de entrega de materiais encontrado.</td>
                        </tr>
                      ) : (
                        materials.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDateBR(m.date_delivery)}</td>
                            <td className="p-3 font-medium text-gray-700">{m.material_type}</td>
                            <td className="p-3">{m.quantity}</td>
                            <td className="p-3">{m.recipient}</td>
                            <td className="p-3">{m.municipality}</td>
                            <td className="p-3">{getCoordName(m)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === "regional" && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-3">Data</th>
                        <th className="p-3">Município</th>
                        <th className="p-3">Origem</th>
                        <th className="p-3">Qtd Interno</th>
                        <th className="p-3">Qtd Parceiro</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Coordenação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {servRegional.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum registro de atendimento regional encontrado.</td>
                        </tr>
                      ) : (
                        servRegional.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDateBR(s.date_service)}</td>
                            <td className="p-3 font-medium text-gray-700">{s.municipality}</td>
                            <td className="p-3">{s.origin}</td>
                            <td className="p-3">{s.internal_count}</td>
                            <td className="p-3">{s.partner_count}</td>
                            <td className="p-3 font-semibold text-primary">{s.internal_count + s.partner_count}</td>
                            <td className="p-3">{getCoordName(s)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === "units" && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="p-3">Mês Referência</th>
                        <th className="p-3">Unidade</th>
                        <th className="p-3">Atendimentos</th>
                        <th className="p-3">Coordenação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {servUnits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-400">Nenhum registro de atendimento de unidades encontrado.</td>
                        </tr>
                      ) : (
                        servUnits.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="p-3 whitespace-nowrap">{formatDateBR(s.date_reference)}</td>
                            <td className="p-3 font-medium text-gray-700">{s.unit_name}</td>
                            <td className="p-3 font-semibold text-primary">{s.monthly_count}</td>
                            <td className="p-3">{getCoordName(s)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
