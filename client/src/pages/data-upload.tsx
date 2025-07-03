import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, ArrowRight, Database, X, AlertCircle } from "lucide-react";
import { parseExcelData, validateUploadData, type UploadData } from "@/lib/data-processor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/contexts/SessionContext";
import * as XLSX from 'xlsx';

export default function DataUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { session, updateUploadData, setCurrentStep, markStepCompleted } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update current step on mount
  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadData) => {
      const response = await apiRequest('POST', '/api/upload', data);
      return response.json();
    },
    onSuccess: (result, variables) => {
      // Save upload data to session context
      updateUploadData({
        companies: variables.companies,
        audits: variables.audits || [],
        uploadedAt: new Date().toISOString(),
        fileName: selectedFile?.name || 'uploaded_file'
      });
      
      // Mark step as completed
      markStepCompleted(1);
      
      toast({
        title: "Upload Successful",
        description: "Your Excel data has been processed. Proceeding to data exploration.",
      });
      setLocation("/explore");
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "There was an error processing your Excel file. Please check the format and try again.",
        variant: "destructive",
      });
    },
  });

  // Sample data mutation
  const sampleDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/load-sample');
      return response.json();
    },
    onSuccess: () => {
      // Save sample data info to session context
      updateUploadData({
        companies: [],
        audits: [],
        uploadedAt: new Date().toISOString(),
        fileName: 'sample_data'
      });
      
      // Mark step as completed
      markStepCompleted(1);
      
      toast({
        title: "Sample Data Loaded",
        description: "Sample confectionary audit data has been loaded. Proceeding to exploration.",
      });
      setLocation("/explore");
    },
    onError: (error) => {
      toast({
        title: "Failed to Load Sample Data",
        description: "There was an error loading the sample data.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      
      // Check if required sheets exist
      if (!workbook.SheetNames.includes('Returns') || !workbook.SheetNames.includes('Audit')) {
        toast({
          title: "Invalid Excel Structure",
          description: "Excel file must contain 'Returns' and 'Audit' sheets",
          variant: "destructive",
        });
        return;
      }

      // Parse the sheets
      const returnsSheet = workbook.Sheets['Returns'];
      const auditSheet = workbook.Sheets['Audit'];
      
      const returnsData = XLSX.utils.sheet_to_json(returnsSheet);
      const auditData = XLSX.utils.sheet_to_json(auditSheet);

      // Helper function to convert Excel dates
      const convertExcelDate = (value: any): string => {
        if (!value) return "";
        
        // If it's already a proper date string, return it
        if (typeof value === 'string' && value.includes('-')) {
          return value;
        }
        
        // If it's an Excel serial date (number), convert it
        if (typeof value === 'number') {
          // Excel serial date conversion
          // Excel starts counting from January 1, 1900 as day 1
          // Excel incorrectly treats 1900 as a leap year, so for dates after Feb 28, 1900
          // we need to subtract 2 days instead of 1
          const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
          const daysToAdd = value - 2; // Account for Excel's leap year bug
          
          // Create date in local timezone to avoid UTC conversion issues
          const jsDate = new Date(excelEpoch);
          jsDate.setDate(jsDate.getDate() + daysToAdd);
          
          // Format as YYYY-MM-DD
          const year = jsDate.getFullYear();
          const month = String(jsDate.getMonth() + 1).padStart(2, '0');
          const day = String(jsDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        
        // If it's a Date object, format it properly
        if (value instanceof Date) {
          const year = value.getFullYear();
          const month = String(value.getMonth() + 1).padStart(2, '0');
          const day = String(value.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        
        return String(value);
      };

      // Process Excel data directly with proper string conversion
      const companies = returnsData.map((row: any) => {
        const getValue = (key: string, altKey?: string) => {
          const value = row[key] || (altKey && row[altKey]) || "";
          return value === "" ? undefined : String(value);
        };
        
        const getNullableValue = (key: string, altKey?: string) => {
          const value = row[key] !== undefined ? row[key] : (altKey && row[altKey]);
          return value !== undefined && value !== null && value !== "" ? String(value) : null;
        };

        return {
          corpName: String(row["Corp Name"] || row.corpName || ""),
          corpId: parseInt(String(row.ID || row.corpId || "0")),
          periodStartDate: convertExcelDate(row["Period Start Date"] || row.periodStartDate),
          periodEndDate: convertExcelDate(row["Period End Date"] || row.periodEndDate),
          taxableIncome: getValue("Taxable Income", "taxableIncome"),
          salary: getNullableValue("Salary", "salary"),
          revenue: getNullableValue("Revenue", "revenue"),
          amountTaxable: getValue("Amount Taxable", "amountTaxable"),
          bubblegumTax: getValue("Bubblegum Tax", "bubblegumTax"),
          confectionarySalesTaxPercent: getValue("Confectionary Sales Tax %", "confectionarySalesTaxPercent"),
        };
      });

      // Fix audit mapping: ID = company name, Audit Name = corpId, Audit Date = audit date
      const audits = auditData.map((row: any) => ({
        corpId: parseInt(String(row["Audit Name"] || row.corpId || "0")),
        corpName: String(row.ID || row.corpName || ""),
        auditDate: convertExcelDate(row["Audit Date"] || row.auditDate),
      }));

      const data = { companies, audits };
      
      const validation = validateUploadData(data);
      
      if (!validation.valid) {
        toast({
          title: "Data Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      uploadMutation.mutate(data);
    } catch (error) {
      toast({
        title: "File Processing Error",
        description: "Failed to process the Excel file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-audit-blue rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ABCD Auditing</h1>
              <p className="text-sm text-gray-500">Intelligent Audit Prioritization System</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Step 1 of 4
          </Badge>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 bg-audit-blue text-white rounded-full flex items-center justify-center text-sm font-medium mb-2">
                1
              </div>
              <span className="text-sm font-medium text-audit-blue max-w-32">Upload your Excel file with Returns and Audit sheets</span>
            </div>
            
            <div className="flex-shrink-0 px-4">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium mb-2">
                2
              </div>
              <span className="text-sm text-gray-500 max-w-32">Review and verify your uploaded data</span>
            </div>
            
            <div className="flex-shrink-0 px-4">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium mb-2">
                3
              </div>
              <span className="text-sm text-gray-500 max-w-32">Configure rules and analyze audit priorities</span>
            </div>
            
            <div className="flex-shrink-0 px-4">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium mb-2">
                4
              </div>
              <span className="text-sm text-gray-500 max-w-32">Advanced ML-based anomaly detection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <Upload className="w-12 h-12 text-audit-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Upload Your Audit Data</h2>
          <p className="text-gray-600">Upload your Excel file containing Returns and Audit data to begin the analysis</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel Upload Card */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-audit-blue transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-audit-blue" />
                Upload Excel File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Click to select your Excel file</p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="text-audit-blue border-audit-blue hover:bg-audit-blue hover:text-white"
                      >
                        Choose Excel File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                      </div>
                      <Button
                        onClick={removeFile}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleFileUpload}
                      disabled={uploadMutation.isPending}
                      className="w-full bg-audit-blue hover:bg-blue-700"
                    >
                      {uploadMutation.isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Continue
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expected Excel Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Expected Excel Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <p className="text-gray-600">Your Excel file should have two sheets:</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Returns Sheet Columns:</h4>
                    <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                      <li>Corp Name</li>
                      <li>ID</li>
                      <li>Period Start Date</li>
                      <li>Period End Date</li>
                      <li>Taxable Income</li>
                      <li>Salary</li>
                      <li>Revenue</li>
                      <li>Amount Taxable</li>
                      <li>Bubblegum Tax</li>
                      <li>Confectionary Sales Tax %</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">Audit Sheet Columns:</h4>
                    <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                      <li>ID (Company Name)</li>
                      <li>Audit Name (Company ID)</li>
                      <li>Audit Date</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Load Sample Data */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-4">
            <div className="h-px bg-gray-300 flex-1"></div>
            <span className="text-sm">OR</span>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>
          <Button
            onClick={() => sampleDataMutation.mutate()}
            disabled={sampleDataMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {sampleDataMutation.isPending ? "Loading..." : "Load Sample Data"}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Try the system with pre-loaded confectionary company data
          </p>
        </div>
      </div>
    </div>
  );
}