import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, FileText, ArrowLeft } from "lucide-react";
import AuditSidebar from "@/components/audit-sidebar";
import AuditTable from "@/components/audit-table";
import ExplanationModal from "@/components/explanation-modal";
import { AuditRules, FlaggedCompany, AuditSummary, CompanyExplanation } from "@/types/audit";
import { defaultRules, calculateAuditSummary } from "@/lib/audit-rules";
import { exportToCsv } from "@/lib/data-processor";
import { apiRequest } from "@/lib/queryClient";

export default function AuditDashboard() {
  const [rules, setRules] = useState<AuditRules>(defaultRules);
  const [selectedCompany, setSelectedCompany] = useState<FlaggedCompany | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Check if data exists, redirect if not
  const { data: companiesCheck = [], isLoading: checkLoading } = useQuery({
    queryKey: ['/api/companies-raw'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies-raw');
      return response.json();
    },
  });

  useEffect(() => {
    if (!checkLoading && companiesCheck.length === 0) {
      setLocation("/");
    }
  }, [companiesCheck, checkLoading, setLocation]);

  // Query flagged companies
  const { data: flaggedCompanies = [], isLoading: flaggedLoading } = useQuery<FlaggedCompany[]>({
    queryKey: ['/api/audit/flagged', rules],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/audit/flagged', rules);
      return response.json();
    },
  });

  // Query explanation for selected company
  const { data: explanation, isLoading: explanationLoading } = useQuery<CompanyExplanation>({
    queryKey: ['/api/audit/explanation', selectedCompany?.company.corpId, rules],
    queryFn: async () => {
      if (!selectedCompany) return null;
      const response = await apiRequest('POST', `/api/audit/explanation/${selectedCompany.company.corpId}`, rules);
      return response.json();
    },
    enabled: !!selectedCompany && explanationOpen,
  });



  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/audit/export');
      return response.json();
    },
    onSuccess: (data) => {
      exportToCsv(data, `flagged-companies-${new Date().toISOString().split('T')[0]}.csv`);
    },
  });

  const summary: AuditSummary = calculateAuditSummary(flaggedCompanies);

  const handleShowExplanation = (company: FlaggedCompany) => {
    setSelectedCompany(company);
    setExplanationOpen(true);
  };

  const handleApplyRules = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/audit/flagged'] });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-audit-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">ABCD Auditing</h1>
                <p className="text-sm text-gray-500">Intelligent Audit Prioritization System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Step 3 of 3
              </Badge>
              <Button 
                onClick={() => setLocation("/explore")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Data
              </Button>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <AuditSidebar 
          rules={rules} 
          onRulesChange={setRules}
          onApplyRules={handleApplyRules}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">High Risk</p>
                      <p className="text-2xl font-semibold text-gray-900">{summary.highRisk}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Medium Risk</p>
                      <p className="text-2xl font-semibold text-gray-900">{summary.mediumRisk}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Low Risk</p>
                      <p className="text-2xl font-semibold text-gray-900">{summary.lowRisk}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Files</p>
                      <p className="text-2xl font-semibold text-gray-900">{summary.totalFiles}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Data Table */}
            <AuditTable 
              companies={flaggedCompanies}
              loading={flaggedLoading}
              onShowExplanation={handleShowExplanation}
              onExport={() => exportMutation.mutate()}
              exportLoading={exportMutation.isPending}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      <ExplanationModal
        open={explanationOpen}
        onOpenChange={setExplanationOpen}
        company={selectedCompany}
        explanation={explanation}
        loading={explanationLoading}
        auditRules={rules}
      />
    </div>
  );
}
