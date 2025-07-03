import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import { FlaggedCompany } from "@/types/audit";

export interface TableFilters {
  riskLevels: string[];
  riskScoreRange: [number, number];
  flagTypes: string[];
  hasAudit: boolean | null; // null = all, true = has audit, false = no audit
}

interface AuditTableFiltersProps {
  companies: FlaggedCompany[];
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  onClearFilters: () => void;
}

export default function AuditTableFilters({ 
  companies, 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: AuditTableFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get unique flag types from all companies
  const allFlagTypes = Array.from(
    new Set(companies.flatMap(c => c.flags.map(f => f.flagType)))
  );

  // Get min/max risk scores
  const riskScores = companies.map(c => c.riskScore);
  const minRiskScore = Math.min(...riskScores, 0);
  const maxRiskScore = Math.max(...riskScores, 100);

  // Count active filters
  const activeFiltersCount = 
    (filters.riskLevels.length > 0 && filters.riskLevels.length < 3 ? 1 : 0) +
    (filters.riskScoreRange[0] > minRiskScore || filters.riskScoreRange[1] < maxRiskScore ? 1 : 0) +
    (filters.flagTypes.length > 0 && filters.flagTypes.length < allFlagTypes.length ? 1 : 0) +
    (filters.hasAudit !== null ? 1 : 0);

  const handleRiskLevelChange = (level: string, checked: boolean) => {
    const newLevels = checked 
      ? [...filters.riskLevels, level]
      : filters.riskLevels.filter(l => l !== level);
    
    onFiltersChange({ ...filters, riskLevels: newLevels });
  };

  const handleFlagTypeChange = (flagType: string, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.flagTypes, flagType]
      : filters.flagTypes.filter(t => t !== flagType);
    
    onFiltersChange({ ...filters, flagTypes: newTypes });
  };

  const handleRiskScoreChange = (value: number[]) => {
    onFiltersChange({ ...filters, riskScoreRange: [value[0], value[1]] });
  };

  const handleAuditStatusChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, hasAudit: value });
  };

  const getFlagDisplayName = (flagType: string) => {
    const flagNames: { [key: string]: string } = {
      'high_bubblegum_tax': 'High Bubblegum Tax',
      'old_audit': 'Old/Missing Audit',
      'high_sales_tax': 'High Sales Tax',
      'missing_salary': 'Missing Salary',
      'missing_revenue': 'Missing Revenue',
      'data_inconsistency': 'Data Inconsistency'
    };
    return flagNames[flagType] || flagType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Filter Results</CardTitle>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClearFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Risk Levels */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Risk Levels
                </Label>
                <div className="space-y-2">
                  {['high', 'medium', 'low'].map(level => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`risk-${level}`}
                        checked={filters.riskLevels.includes(level)}
                        onCheckedChange={(checked) => handleRiskLevelChange(level, checked as boolean)}
                      />
                      <Label 
                        htmlFor={`risk-${level}`} 
                        className="text-sm capitalize cursor-pointer flex items-center gap-1"
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          level === 'high' ? 'bg-red-500' : 
                          level === 'medium' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}></span>
                        {level} Risk
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Risk Score Range */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Risk Score Range: {filters.riskScoreRange[0]} - {filters.riskScoreRange[1]}
                </Label>
                <div className="px-2">
                  <Slider
                    value={filters.riskScoreRange}
                    onValueChange={handleRiskScoreChange}
                    min={minRiskScore}
                    max={maxRiskScore}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{minRiskScore}</span>
                    <span>{maxRiskScore}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Flag Types */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Flag Types
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {allFlagTypes.map(flagType => (
                    <div key={flagType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`flag-${flagType}`}
                        checked={filters.flagTypes.includes(flagType)}
                        onCheckedChange={(checked) => handleFlagTypeChange(flagType, checked as boolean)}
                      />
                      <Label 
                        htmlFor={`flag-${flagType}`} 
                        className="text-sm cursor-pointer"
                      >
                        {getFlagDisplayName(flagType)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Audit Status */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Audit Status
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="audit-all"
                      checked={filters.hasAudit === null}
                      onCheckedChange={(checked) => handleAuditStatusChange(checked ? null : true)}
                    />
                    <Label htmlFor="audit-all" className="text-sm cursor-pointer">
                      All Companies
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="audit-has"
                      checked={filters.hasAudit === true}
                      onCheckedChange={(checked) => handleAuditStatusChange(checked ? true : null)}
                    />
                    <Label htmlFor="audit-has" className="text-sm cursor-pointer">
                      Has Previous Audit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="audit-none"
                      checked={filters.hasAudit === false}
                      onCheckedChange={(checked) => handleAuditStatusChange(checked ? false : null)}
                    />
                    <Label htmlFor="audit-none" className="text-sm cursor-pointer">
                      Never Audited
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
      
      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>Filtered</span>
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount}
          </Badge>
        </div>
      )}
    </div>
  );
}