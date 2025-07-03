import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Plus, Edit2, Trash2, Eye, Settings } from 'lucide-react';
import { CustomRuleType } from '@shared/schema';
import CustomRuleBuilder from './custom-rule-builder';
import { useSession } from '@/contexts/SessionContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CustomRulesPanelProps {
  onRulesChange?: () => void;
}

export default function CustomRulesPanel({ onRulesChange }: CustomRulesPanelProps) {
  const { session, addCustomRule, updateCustomRule, removeCustomRule, getSessionId } = useSession();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRuleType | null>(null);
  const queryClient = useQueryClient();

  const sessionId = getSessionId();

  // Fetch custom rules from server
  const { data: serverCustomRules = [], isLoading } = useQuery({
    queryKey: [`/api/custom-rules/session/${sessionId}`],
    enabled: !!sessionId,
  });

  // Create custom rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (rule: Omit<CustomRuleType, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/custom-rules', rule);
      return await response.json();
    },
    onSuccess: (newRule) => {
      addCustomRule(newRule);
      queryClient.invalidateQueries({ queryKey: [`/api/custom-rules/session/${sessionId}`] });
      setShowBuilder(false);
      onRulesChange?.();
    },
  });

  // Update custom rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CustomRuleType> }) => {
      const response = await apiRequest('PUT', `/api/custom-rules/${id}`, updates);
      return await response.json();
    },
    onSuccess: (updatedRule) => {
      updateCustomRule(updatedRule.id, updatedRule);
      queryClient.invalidateQueries({ queryKey: [`/api/custom-rules/session/${sessionId}`] });
      setEditingRule(null);
      onRulesChange?.();
    },
  });

  // Delete custom rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/custom-rules/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeCustomRule(id);
      queryClient.invalidateQueries({ queryKey: [`/api/custom-rules/session/${sessionId}`] });
      onRulesChange?.();
    },
  });

  const handleCreateRule = (rule: Omit<CustomRuleType, 'id' | 'createdAt' | 'updatedAt'>) => {
    createRuleMutation.mutate(rule);
  };

  const handleEditRule = (rule: CustomRuleType) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleUpdateRule = (updates: Omit<CustomRuleType, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      updateRuleMutation.mutate({
        id: editingRule.id!,
        updates,
      });
    }
  };

  const handleDeleteRule = (id: number) => {
    if (confirm('Are you sure you want to delete this custom rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleRule = (rule: CustomRuleType) => {
    updateRuleMutation.mutate({
      id: rule.id!,
      updates: { enabled: !rule.enabled },
    });
  };

  const customRules = session.auditRules.customRules || [];
  const enabledRulesCount = customRules.filter(rule => rule.enabled).length;

  if (showBuilder) {
    return (
      <CustomRuleBuilder
        sessionId={sessionId}
        initialRule={editingRule || undefined}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        onCancel={() => {
          setShowBuilder(false);
          setEditingRule(null);
        }}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Custom Rules</span>
            {customRules.length > 0 && (
              <Badge variant="secondary">
                {enabledRulesCount}/{customRules.length} active
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setShowBuilder(true)}
            disabled={createRuleMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading custom rules...</p>
          </div>
        ) : customRules.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Rules</h3>
            <p className="text-gray-500 mb-4">
              Create custom rules to identify specific patterns in your corporate data.
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {customRules.map((rule) => (
              <Card key={rule.id} className={`border ${rule.enabled ? 'border-green-200' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{rule.ruleName}</h4>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          Risk: {rule.riskScore}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                          {getFieldLabel(rule.fieldName)} {getOperatorLabel(rule.operator)}
                          {rule.value && ` "${rule.value}"`}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule)}
                        disabled={updateRuleMutation.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                        disabled={updateRuleMutation.isPending}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id!)}
                        disabled={deleteRuleMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {customRules.length > 0 && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>
              💡 Custom rules work alongside default audit rules to provide comprehensive company analysis.
              They will be applied when you click "Apply Rules" in the audit dashboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions for display
function getFieldLabel(fieldName: string): string {
  const fieldMap: Record<string, string> = {
    corpName: 'Company Name',
    taxableIncome: 'Taxable Income',
    salary: 'Salary',
    revenue: 'Revenue',
    amountTaxable: 'Amount Taxable',
    bubblegumTax: 'Bubblegum Tax',
    confectionarySalesTaxPercent: 'Sales Tax %',
  };
  return fieldMap[fieldName] || fieldName;
}

function getOperatorLabel(operator: string): string {
  const operatorMap: Record<string, string> = {
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    '==': '=',
    '!=': '≠',
    'contains': 'contains',
    'not_contains': 'does not contain',
    'empty': 'is empty',
    'not_empty': 'is not empty',
  };
  return operatorMap[operator] || operator;
}