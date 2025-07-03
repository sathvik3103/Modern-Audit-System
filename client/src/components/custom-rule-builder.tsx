import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, X } from 'lucide-react';
import { CustomRuleType } from '@shared/schema';

interface CustomRuleBuilderProps {
  onSave: (rule: Omit<CustomRuleType, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  sessionId: string;
  initialRule?: CustomRuleType;
}

// Available fields for custom rules
const COMPANY_FIELDS = [
  { value: 'corpName', label: 'Company Name', type: 'text' },
  { value: 'taxableIncome', label: 'Taxable Income', type: 'number' },
  { value: 'salary', label: 'Salary', type: 'number' },
  { value: 'revenue', label: 'Revenue', type: 'number' },
  { value: 'amountTaxable', label: 'Amount Taxable', type: 'number' },
  { value: 'bubblegumTax', label: 'Bubblegum Tax', type: 'number' },
  { value: 'confectionarySalesTaxPercent', label: 'Sales Tax %', type: 'number' },
];

// Available operators
const OPERATORS = [
  { value: '>', label: 'Greater than (>)', applies: ['number'] },
  { value: '<', label: 'Less than (<)', applies: ['number'] },
  { value: '>=', label: 'Greater or equal (>=)', applies: ['number'] },
  { value: '<=', label: 'Less or equal (<=)', applies: ['number'] },
  { value: '==', label: 'Equals (=)', applies: ['text', 'number'] },
  { value: '!=', label: 'Not equals (≠)', applies: ['text', 'number'] },
  { value: 'contains', label: 'Contains text', applies: ['text'] },
  { value: 'not_contains', label: 'Does not contain', applies: ['text'] },
  { value: 'empty', label: 'Is empty/missing', applies: ['text', 'number'] },
  { value: 'not_empty', label: 'Is not empty', applies: ['text', 'number'] },
];

export default function CustomRuleBuilder({ onSave, onCancel, sessionId, initialRule }: CustomRuleBuilderProps) {
  const [ruleName, setRuleName] = useState(initialRule?.ruleName || '');
  const [fieldName, setFieldName] = useState(initialRule?.fieldName || '');
  const [operator, setOperator] = useState<string>(initialRule?.operator || '');
  const [value, setValue] = useState(initialRule?.value || '');
  const [riskScore, setRiskScore] = useState(initialRule?.riskScore || 15);
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedField = COMPANY_FIELDS.find(f => f.value === fieldName);
  const availableOperators = OPERATORS.filter(op => 
    !selectedField || op.applies.includes(selectedField.type)
  );

  // Check if value is required for the selected operator
  const isValueRequired = !['empty', 'not_empty'].includes(operator);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!ruleName.trim()) {
      newErrors.ruleName = 'Rule name is required';
    }

    if (!fieldName) {
      newErrors.fieldName = 'Please select a field';
    }

    if (!operator) {
      newErrors.operator = 'Please select an operator';
    }

    if (isValueRequired && !value.trim()) {
      newErrors.value = 'Value is required for this operator';
    }

    if (selectedField?.type === 'number' && isValueRequired && value.trim()) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        newErrors.value = 'Please enter a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const rule: Omit<CustomRuleType, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionId,
      ruleName: ruleName.trim(),
      fieldName,
      operator: operator as any,
      value: isValueRequired ? value.trim() : undefined,
      riskScore,
      enabled,
    };

    onSave(rule);
  };

  const handleFieldChange = (newFieldName: string) => {
    setFieldName(newFieldName);
    // Reset operator and value when field changes
    setOperator('');
    setValue('');
    setErrors({});
  };

  const handleOperatorChange = (newOperator: string) => {
    setOperator(newOperator);
    // Reset value when operator changes to empty/not_empty
    if (['empty', 'not_empty'].includes(newOperator)) {
      setValue('');
    }
    setErrors({});
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>{initialRule ? 'Edit Custom Rule' : 'Create Custom Rule'}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rule Name */}
        <div>
          <Label htmlFor="ruleName" className="text-sm font-medium">
            Rule Name *
          </Label>
          <Input
            id="ruleName"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., High Revenue Companies"
            className={errors.ruleName ? 'border-red-500' : ''}
          />
          {errors.ruleName && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.ruleName}
            </p>
          )}
        </div>

        {/* Field Selection */}
        <div>
          <Label className="text-sm font-medium">
            Field to Evaluate *
          </Label>
          <Select value={fieldName} onValueChange={handleFieldChange}>
            <SelectTrigger className={errors.fieldName ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select a company field" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_FIELDS.map(field => (
                <SelectItem key={field.value} value={field.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{field.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {field.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fieldName && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.fieldName}
            </p>
          )}
        </div>

        {/* Operator Selection */}
        <div>
          <Label className="text-sm font-medium">
            Condition *
          </Label>
          <Select value={operator} onValueChange={handleOperatorChange} disabled={!fieldName}>
            <SelectTrigger className={errors.operator ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select a condition" />
            </SelectTrigger>
            <SelectContent>
              {availableOperators.map(op => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.operator && (
            <p className="text-sm text-red-600 mt-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.operator}
            </p>
          )}
        </div>

        {/* Value Input */}
        {isValueRequired && (
          <div>
            <Label htmlFor="value" className="text-sm font-medium">
              Value *
            </Label>
            <Input
              id="value"
              type={selectedField?.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedField?.type === 'number' ? 'e.g., 1000000' : 'e.g., Corp'}
              className={errors.value ? 'border-red-500' : ''}
              disabled={!operator || !isValueRequired}
            />
            {errors.value && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.value}
              </p>
            )}
          </div>
        )}

        {/* Risk Score */}
        <div>
          <Label className="text-sm font-medium">
            Risk Score: {riskScore}
          </Label>
          <div className="mt-2">
            <Slider
              value={[riskScore]}
              onValueChange={([newValue]) => setRiskScore(newValue)}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low Risk (1)</span>
              <span>High Risk (100)</span>
            </div>
          </div>
        </div>

        {/* Rule Preview */}
        {ruleName && fieldName && operator && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-sm font-medium text-gray-700">Preview</Label>
            <p className="text-sm mt-1">
              <strong>{ruleName}:</strong> Flag companies where{' '}
              <span className="font-mono bg-white px-2 py-1 rounded border">
                {selectedField?.label} {OPERATORS.find(op => op.value === operator)?.label.toLowerCase()} 
                {isValueRequired && value && ` "${value}"`}
              </span>
              {' '}with risk score of <strong>{riskScore}</strong>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!ruleName || !fieldName || !operator}>
            {initialRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}