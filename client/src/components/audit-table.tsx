import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, Download, MoreVertical } from "lucide-react";
import { FlaggedCompany } from "@/types/audit";
import { getRiskLevelColor, getFlagDisplayInfo, formatCurrency, formatPercentage, formatDate, getCompanyInitials, getGradientColor } from "@/lib/audit-rules";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditTableProps {
  companies: FlaggedCompany[];
  loading: boolean;
  onShowExplanation: (company: FlaggedCompany) => void;
  onExport: () => void;
  exportLoading: boolean;
}

export default function AuditTable({ companies, loading, onShowExplanation, onExport, exportLoading }: AuditTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Flagged Corporate Files</h2>
            <div className="flex items-center space-x-3">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-32 h-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Flagged Corporate Files</h2>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon">
              <Filter className="w-5 h-5" />
            </Button>
            <Button 
              onClick={onExport}
              disabled={exportLoading}
              className="bg-audit-blue hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? "Exporting..." : "Export Results"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {companies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No companies flagged with current rules</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Last Audit</TableHead>
                  <TableHead>Bubblegum Tax</TableHead>
                  <TableHead>Sales Tax %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company, index) => (
                  <TableRow key={company.company.corpId} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-8 h-8 bg-gradient-to-br ${getGradientColor(index)} rounded-full flex items-center justify-center`}>
                          <span className="text-white text-xs font-medium">
                            {getCompanyInitials(company.company.corpName)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{company.company.corpName}</div>
                          <div className="text-sm text-gray-500">ID: {company.company.corpId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelColor(company.riskLevel)}>
                        {company.riskLevel} Risk
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {company.flags.map((flag, flagIndex) => {
                          const flagInfo = getFlagDisplayInfo(flag.flagType);
                          return (
                            <Badge 
                              key={flagIndex} 
                              variant="secondary" 
                              className={`text-xs ${flagInfo.color}`}
                            >
                              {flagInfo.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {formatDate(company.audit?.auditDate)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {formatCurrency(company.company.bubblegumTax)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900">
                      {formatPercentage(company.company.confectionarySalesTaxPercent)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="link"
                          className="text-audit-blue hover:text-blue-700 p-0"
                          onClick={() => onShowExplanation(company)}
                        >
                          Why flagged?
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
