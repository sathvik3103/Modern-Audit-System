import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar } from "lucide-react";
import { FlaggedCompany, CompanyExplanation } from "@/types/audit";
import { formatCurrency, formatPercentage } from "@/lib/audit-rules";
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
      <DialogContent className="sm:max-w-2xl">
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
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : explanation ? (
            <>
              {/* Critical Risk Factors */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Critical Risk Factors</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {explanation.flags.filter(f => f.severity === 'high').map((flag, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-4 h-4 mr-2 mt-0.5 text-red-500">•</span>
                      {flag.flagReason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Medium Risk Factors */}
              {explanation.flags.some(f => f.severity === 'medium') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Additional Observations</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {explanation.flags.filter(f => f.severity === 'medium').map((flag, index) => (
                      <li key={index}>• {flag.flagReason}</li>
                    ))}
                    <li>• Confectionary Sales Tax % of {formatPercentage(explanation.company.confectionarySalesTaxPercent)} is above average</li>
                    <li>• Revenue to tax ratio suggests potential compliance issues</li>
                  </ul>
                </div>
              )}

              {/* Company Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Company Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Bubblegum Tax:</span>
                    <span className="ml-2 font-medium">{formatCurrency(explanation.company.bubblegumTax)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Sales Tax %:</span>
                    <span className="ml-2 font-medium">{formatPercentage(explanation.company.confectionarySalesTaxPercent)}</span>
                  </div>
                  {explanation.audit && (
                    <>
                      <div>
                        <span className="text-gray-600">Last Audit:</span>
                        <span className="ml-2 font-medium">{new Date(explanation.audit.auditDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Years Ago:</span>
                        <span className="ml-2 font-medium">{explanation.audit.yearsAgo} years</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">AI Recommendation</h4>
                <p className="text-sm text-blue-700">
                  {explanation.recommendation}
                </p>
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
