import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

interface ExportDropdownProps {
  onExportCsv: () => void;
  onExportPdf: () => void;
  loading: boolean;
}

export default function ExportDropdown({ onExportCsv, onExportPdf, loading }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={loading}
          className="bg-audit-blue hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Exporting..." : "Export Results"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onExportCsv} disabled={loading}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPdf} disabled={loading}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}