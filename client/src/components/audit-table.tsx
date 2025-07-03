import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreVertical } from "lucide-react";
import { FlaggedCompany } from "@/types/audit";
import { getRiskLevelColor, getFlagDisplayInfo, formatCurrency, formatPercentage, formatDate, getCompanyInitials, getGradientColor } from "@/lib/audit-rules";
import { Skeleton } from "@/components/ui/skeleton";
import ExportDropdown from "./export-dropdown";
import AuditTableFilters, { TableFilters } from "./audit-table-filters";

interface AuditTableProps {
  companies: FlaggedCompany[];
  loading: boolean;
  onShowExplanation: (company: FlaggedCompany) => void;
  onExportCsv: (filteredCompanies?: FlaggedCompany[]) => void;
  onExportPdf: (filteredCompanies?: FlaggedCompany[]) => void;
  exportLoading: boolean;
}

export default function AuditTable({ companies, loading, onShowExplanation, onExportCsv, onExportPdf, exportLoading }: AuditTableProps) {
  const [filters, setFilters] = useState<TableFilters>({
    riskLevels: [],
    riskScoreRange: [0, 100],
    flagTypes: [],
    hasAudit: null
  });

  // Initialize risk score range based on actual data
  const initializeFilters = () => {
    if (companies.length > 0) {
      const riskScores = companies.map(c => c.riskScore);
      const minScore = Math.min(...riskScores);
      const maxScore = Math.max(...riskScores);
      
      setFilters(prev => ({
        ...prev,
        riskScoreRange: [minScore, maxScore]
      }));
    }
  };

  // Initialize filters when companies data changes
  useEffect(() => {
    initializeFilters();
  }, [companies]);

  // Filter companies based on current filters
  const filteredCompanies = companies.filter(company => {
    // Risk level filter
    if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(company.riskLevel)) {
      return false;
    }

    // Risk score range filter
    if (company.riskScore < filters.riskScoreRange[0] || company.riskScore > filters.riskScoreRange[1]) {
      return false;
    }

    // Flag type filter
    if (filters.flagTypes.length > 0) {
      const hasMatchingFlag = company.flags.some(flag => filters.flagTypes.includes(flag.flagType));
      if (!hasMatchingFlag) {
        return false;
      }
    }

    // Audit status filter
    if (filters.hasAudit !== null) {
      const hasAudit = company.audit?.auditDate != null;
      if (filters.hasAudit !== hasAudit) {
        return false;
      }
    }

    return true;
  });

  const handleClearFilters = () => {
    const riskScores = companies.map(c => c.riskScore);
    const minScore = companies.length > 0 ? Math.min(...riskScores) : 0;
    const maxScore = companies.length > 0 ? Math.max(...riskScores) : 100;
    
    setFilters({
      riskLevels: [],
      riskScoreRange: [minScore, maxScore],
      flagTypes: [],
      hasAudit: null
    });
  };
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
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Flagged Corporate Files</h2>
          </div>
          <div className="flex items-center space-x-3">
            <AuditTableFilters 
              companies={companies}
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
            />
            <ExportDropdown
              onExportCsv={() => onExportCsv(filteredCompanies)}
              onExportPdf={() => onExportPdf(filteredCompanies)}
              loading={exportLoading}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {companies.length === 0 
                ? "No companies flagged with current rules" 
                : "No companies match the current filters"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Company</TableHead>
                  <TableHead className="min-w-[100px]">Risk Level</TableHead>
                  <TableHead className="min-w-[100px]">Risk Score</TableHead>
                  <TableHead className="min-w-[180px]">Flags</TableHead>
                  <TableHead className="min-w-[100px]">Last Audit</TableHead>
                  <TableHead className="min-w-[120px]">Period</TableHead>
                  <TableHead className="min-w-[120px]">Taxable Income</TableHead>
                  <TableHead className="min-w-[100px]">Salary</TableHead>
                  <TableHead className="min-w-[100px]">Revenue</TableHead>
                  <TableHead className="min-w-[120px]">Amount Taxable</TableHead>
                  <TableHead className="min-w-[120px]">Bubblegum Tax</TableHead>
                  <TableHead className="min-w-[100px]">Sales Tax %</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company, index) => (
                  <TableRow key={company.company.corpId} className="hover:bg-gray-50">
                    <TableCell className="min-w-[200px]">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 bg-gradient-to-br ${getGradientColor(index)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-medium">
                            {getCompanyInitials(company.company.corpName)}
                          </span>
                        </div>
                        <div className="ml-4 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{company.company.corpName}</div>
                          <div className="text-sm text-gray-500">ID: {company.company.corpId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <Badge className={getRiskLevelColor(company.riskLevel)}>
                        {company.riskLevel} Risk
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <div className="text-sm font-medium text-gray-900 text-center">
                        {company.riskScore}
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        points
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {company.flags.map((flag, flagIndex) => {
                          const flagInfo = getFlagDisplayInfo(flag.flagType);
                          return (
                            <Badge 
                              key={flagIndex} 
                              variant="secondary" 
                              className={`text-xs ${flagInfo.color} whitespace-nowrap`}
                            >
                              {flagInfo.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[100px]">
                      {formatDate(company.audit?.auditDate ?? null)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[120px]">
                      <div className="text-xs text-gray-500">
                        {formatDate(company.company.periodStartDate)} - {formatDate(company.company.periodEndDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[120px] text-right">
                      {formatCurrency(company.company.taxableIncome)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[100px] text-right">
                      {formatCurrency(company.company.salary)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[100px] text-right">
                      {formatCurrency(company.company.revenue)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[120px] text-right">
                      {formatCurrency(company.company.amountTaxable)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[120px] text-right">
                      {formatCurrency(company.company.bubblegumTax)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 min-w-[100px] text-right">
                      {formatPercentage(company.company.confectionarySalesTaxPercent)}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="link"
                          className="text-audit-blue hover:text-blue-700 p-0 text-xs whitespace-nowrap"
                          onClick={() => onShowExplanation(company)}
                        >
                          Why flagged?
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
