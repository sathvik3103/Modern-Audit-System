import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Sparkles } from "lucide-react";
import { FlaggedCompany, CompanyExplanation } from "@/types/audit";
import { Skeleton } from "@/components/ui/skeleton";

interface ExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: FlaggedCompany | null;
  explanation: CompanyExplanation | undefined;
  loading: boolean;
}

export default function ExplanationModal({ open, onOpenChange, company, explanation, loading }: ExplanationModalProps) {
  if (!company) return null;

  const handleScheduleAudit = () => {
    alert(`Audit scheduled for ${company.company.corpName}. This would integrate with your audit management system.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-audit-blue" />
            Why was <span className="text-audit-blue font-semibold">{company.company.corpName}</span> flagged?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : explanation ? (
            <>
              {/* AI-Generated Insights */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-blue-800">AI Analysis & Insights</h4>
                </div>
                <div className="prose prose-sm prose-blue max-w-none">
                  <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                    {explanation.aiInsights}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-800 mb-3">Quick Reference</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Corp ID:</span>
                    <span className="ml-2 font-medium">{explanation.company.corpId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Flags:</span>
                    <span className="ml-2 font-medium">{explanation.flags.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Risk Score:</span>
                    <span className="ml-2 font-medium">
                      {explanation.flags.reduce((sum, flag) => sum + flag.riskScore, 0)} pts
                    </span>
                  </div>
                  {explanation.company.bubblegumTax && (
                    <div>
                      <span className="text-gray-600">Bubblegum Tax:</span>
                      <span className="ml-2 font-medium">
                        ${parseFloat(explanation.company.bubblegumTax).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {explanation.company.confectionarySalesTaxPercent && (
                    <div>
                      <span className="text-gray-600">Sales Tax %:</span>
                      <span className="ml-2 font-medium">
                        {explanation.company.confectionarySalesTaxPercent}%
                      </span>
                    </div>
                  )}
                  {explanation.audit && (
                    <div>
                      <span className="text-gray-600">Last Audit:</span>
                      <span className="ml-2 font-medium">
                        {explanation.audit.yearsAgo} years ago
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Unable to load explanation details</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleScheduleAudit}
            className="bg-audit-blue hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Audit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}