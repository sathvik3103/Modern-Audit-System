import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { AuditRules } from "@/types/audit";

interface AuditSidebarProps {
  rules: AuditRules;
  onRulesChange: (rules: AuditRules) => void;
  onApplyRules: () => void;
}

export default function AuditSidebar({ rules, onRulesChange, onApplyRules }: AuditSidebarProps) {
  const [aiQuestion, setAiQuestion] = useState("");

  const updateRule = <K extends keyof AuditRules>(key: K, value: AuditRules[K]) => {
    onRulesChange({ ...rules, [key]: value });
  };

  const handleSalesTaxChange = (value: number[]) => {
    updateRule('salesTaxThreshold', value[0]);
  };

  const handleAskAI = () => {
    if (aiQuestion.trim()) {
      // Simulate AI response
      alert(`AI Assistant: Based on the current audit rules and flagged companies, here's my analysis: ${aiQuestion} - This would typically involve reviewing the specific business rules that triggered the flag and examining the company's historical compliance patterns.`);
      setAiQuestion("");
    }
  };

  return (
    <aside className="w-80 bg-white shadow-sm border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Rules Configuration</h2>
        
        {/* Rule 1: Bubblegum Tax */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={rules.bubblegumEnabled}
                onCheckedChange={(checked) => updateRule('bubblegumEnabled', !!checked)}
              />
              <Label className="text-sm font-medium text-gray-700">Bubblegum Tax Threshold</Label>
            </div>
            <Badge variant="secondary" className={rules.bubblegumEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {rules.bubblegumEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{'>'}</span>
              <Input
                type="number"
                value={rules.bubblegumThreshold}
                onChange={(e) => updateRule('bubblegumThreshold', parseInt(e.target.value) || 0)}
                className="flex-1"
                disabled={!rules.bubblegumEnabled}
              />
              <span className="text-sm text-gray-500">USD</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
              <Input
                type="number"
                value={rules.bubblegumRiskScore}
                onChange={(e) => updateRule('bubblegumRiskScore', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="100"
                disabled={!rules.bubblegumEnabled}
              />
              <span className="text-xs text-gray-500">points</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Companies with Bubblegum Tax above this amount will be flagged</p>
        </div>

        {/* Rule 2: Audit Recency */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={rules.auditRecencyEnabled}
                onCheckedChange={(checked) => updateRule('auditRecencyEnabled', !!checked)}
              />
              <Label className="text-sm font-medium text-gray-700">Audit Recency</Label>
            </div>
            <Badge variant="secondary" className={rules.auditRecencyEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {rules.auditRecencyEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Last audited {`>`}</span>
              <Input
                type="number"
                value={rules.auditYearsThreshold}
                onChange={(e) => updateRule('auditYearsThreshold', parseInt(e.target.value) || 1)}
                className="w-16"
                disabled={!rules.auditRecencyEnabled}
              />
              <span className="text-sm text-gray-500">years ago</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
              <Input
                type="number"
                value={rules.auditRecencyRiskScore}
                onChange={(e) => updateRule('auditRecencyRiskScore', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="100"
                disabled={!rules.auditRecencyEnabled}
              />
              <span className="text-xs text-gray-500">points</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Companies not audited within this timeframe will be flagged</p>
        </div>

        {/* Rule 3: Confectionary Sales Tax % */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={rules.salesTaxEnabled}
                onCheckedChange={(checked) => updateRule('salesTaxEnabled', !!checked)}
              />
              <Label className="text-sm font-medium text-gray-700">Confectionary Sales Tax %</Label>
            </div>
            <Badge variant="secondary" className={rules.salesTaxEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {rules.salesTaxEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Slider
                value={[rules.salesTaxThreshold]}
                onValueChange={handleSalesTaxChange}
                max={20}
                min={0}
                step={0.5}
                className="flex-1"
                disabled={!rules.salesTaxEnabled}
              />
              <span className="text-sm font-medium text-gray-700 w-12">{rules.salesTaxThreshold}%</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>20%</span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
              <Input
                type="number"
                value={rules.salesTaxRiskScore}
                onChange={(e) => updateRule('salesTaxRiskScore', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="100"
                disabled={!rules.salesTaxEnabled}
              />
              <span className="text-xs text-gray-500">points</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Companies above this sales tax percentage will be flagged</p>
        </div>

        {/* Rule 4: Data Consistency */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={rules.dataConsistencyEnabled}
                onCheckedChange={(checked) => updateRule('dataConsistencyEnabled', !!checked)}
              />
              <Label className="text-sm font-medium text-gray-700">Data Consistency Check</Label>
            </div>
            <Badge variant="secondary" className={rules.dataConsistencyEnabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {rules.dataConsistencyEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={rules.checkMissingSalary}
                    onCheckedChange={(checked) => updateRule('checkMissingSalary', !!checked)}
                  />
                  <Label className="text-sm text-gray-700">Missing Salary Data</Label>
                </div>
                <Badge variant="secondary" className={rules.checkMissingSalary ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {rules.checkMissingSalary ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
                <Input
                  type="number"
                  value={rules.missingSalaryRiskScore}
                  onChange={(e) => updateRule('missingSalaryRiskScore', parseInt(e.target.value) || 0)}
                  className="flex-1"
                  min="0"
                  max="100"
                  disabled={!rules.checkMissingSalary}
                />
                <span className="text-xs text-gray-500">points</span>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={rules.checkMissingRevenue}
                    onCheckedChange={(checked) => updateRule('checkMissingRevenue', !!checked)}
                  />
                  <Label className="text-sm text-gray-700">Missing Revenue Data</Label>
                </div>
                <Badge variant="secondary" className={rules.checkMissingRevenue ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {rules.checkMissingRevenue ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
                <Input
                  type="number"
                  value={rules.missingRevenueRiskScore}
                  onChange={(e) => updateRule('missingRevenueRiskScore', parseInt(e.target.value) || 0)}
                  className="flex-1"
                  min="0"
                  max="100"
                  disabled={!rules.checkMissingRevenue}
                />
                <span className="text-xs text-gray-500">points</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Label className="text-xs text-gray-500 w-16">Risk Score:</Label>
              <Input
                type="number"
                value={rules.dataConsistencyRiskScore}
                onChange={(e) => updateRule('dataConsistencyRiskScore', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="100"
                disabled={!rules.dataConsistencyEnabled}
              />
              <span className="text-xs text-gray-500">points</span>
            </div>
          </div>
        </div>

        {/* Risk Level Thresholds */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Risk Level Thresholds</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label className="text-xs text-gray-600 w-20">High Risk:</Label>
              <Input
                type="number"
                value={rules.highRiskThreshold}
                onChange={(e) => updateRule('highRiskThreshold', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="200"
              />
              <span className="text-xs text-gray-500">points & above</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-xs text-gray-600 w-20">Medium Risk:</Label>
              <Input
                type="number"
                value={rules.mediumRiskThreshold}
                onChange={(e) => updateRule('mediumRiskThreshold', parseInt(e.target.value) || 0)}
                className="flex-1"
                min="0"
                max="200"
              />
              <span className="text-xs text-gray-500">points & above</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Low Risk: Below {rules.mediumRiskThreshold} points
            </p>
          </div>
        </div>

        <Button 
          onClick={onApplyRules}
          className="w-full bg-audit-blue hover:bg-blue-700"
        >
          Apply Rules & Refresh
        </Button>

        {/* AI Assistant Panel */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-blue-700">
              <Lightbulb className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">AI Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-600 mb-3">Ask questions about audit decisions or request explanations</p>
            <Textarea
              placeholder="Why was Toffee Co flagged?"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="text-xs"
              rows={2}
            />
            <Button 
              onClick={handleAskAI}
              className="mt-2 w-full bg-audit-blue hover:bg-blue-700 text-xs"
              size="sm"
            >
              Ask AI
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
