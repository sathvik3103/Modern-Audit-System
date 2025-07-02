import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, ArrowRight, Database } from "lucide-react";
import { parseExcelData, validateUploadData, type UploadData } from "@/lib/data-processor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DataUploadPage() {
  const [jsonData, setJsonData] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadData) => {
      const response = await apiRequest('POST', '/api/upload', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Your data has been uploaded. Proceeding to data exploration.",
      });
      setLocation("/explore");
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    try {
      const parsed = JSON.parse(jsonData);
      const data = parseExcelData(parsed);
      const validation = validateUploadData(data);
      
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
      
      uploadMutation.mutate(data);
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Invalid JSON format. Please check your data.",
        variant: "destructive",
      });
    }
  };

  const handleSampleData = () => {
    const sampleData = {
      "Returns": [
        {
          "Corp Name": "Candy Corp",
          "ID": 100000,
          "Period Start Date": "2020-01-01T00:00:00",
          "Period End Date": "2020-12-31T00:00:00",
          "Taxable Income": 413224,
          "Salary": null,
          "Revenue": 513224.0,
          "Amount Taxable": 78513,
          "Bubblegum Tax": 6281,
          "Confectionary Sales Tax %": 12.74
        },
        {
          "Corp Name": "Gum Co",
          "ID": 100001,
          "Period Start Date": "2022-01-01T00:00:00",
          "Period End Date": "2022-12-31T00:00:00",
          "Taxable Income": 1041579,
          "Salary": 445480.0,
          "Revenue": 2041579.0,
          "Amount Taxable": 120345,
          "Bubblegum Tax": 2548,
          "Confectionary Sales Tax %": 14.38
        },
        {
          "Corp Name": "Sweet Inc",
          "ID": 100002,
          "Period Start Date": "2021-01-01T00:00:00",
          "Period End Date": "2021-12-31T00:00:00",
          "Taxable Income": 1066955,
          "Salary": 492518.0,
          "Revenue": null,
          "Amount Taxable": 174598,
          "Bubblegum Tax": 14587,
          "Confectionary Sales Tax %": 9.46
        }
      ],
      "Audit": [
        {
          "ID": "Candy Corp",
          "Audit Name": 100000,
          "Audit Date": "2023-10-14T00:00:00"
        },
        {
          "ID": "Gum Co",
          "Audit Name": 100001,
          "Audit Date": "2024-09-30T00:00:00"
        },
        {
          "ID": "Sweet Inc",
          "Audit Name": 100002,
          "Audit Date": "2022-08-01T00:00:00"
        }
      ]
    };
    setJsonData(JSON.stringify(sampleData, null, 2));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-audit-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">ABCD Auditing</h1>
                <p className="text-sm text-gray-500">Intelligent Audit Prioritization System</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <Database className="w-16 h-16 text-audit-blue mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Intelligent Audit Prioritization</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your manual Excel-based audit process with AI-powered insights. 
            Upload your corporate returns and audit data to get started with intelligent risk assessment and transparent audit recommendations.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-audit-blue bg-blue-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-audit-blue text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Data</h3>
              <p className="text-sm text-gray-600">Upload your Excel file with Returns and Audit sheets</p>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">Explore Data</h3>
              <p className="text-sm text-gray-500">Review and verify your uploaded data</p>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">Audit Analysis</h3>
              <p className="text-sm text-gray-500">Configure rules and analyze audit priorities</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 1: Upload Your Audit Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="jsonData">Audit Data (JSON Format)</Label>
              <p className="text-xs text-gray-500 mb-2">
                Paste your audit data in JSON format. The data should contain "Returns" and "Audit" arrays with the structure shown below.
              </p>
              <Textarea
                id="jsonData"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                placeholder="Paste your JSON data here..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Expected Excel Structure</h4>
              <p className="text-xs text-blue-700 mb-2">
                Your Excel file should have two sheets:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Returns Sheet Columns:</strong>
                  <ul className="mt-1 space-y-1 text-blue-600">
                    <li>• Corp Name</li>
                    <li>• ID</li>
                    <li>• Period Start Date</li>
                    <li>• Period End Date</li>
                    <li>• Taxable Income</li>
                    <li>• Salary</li>
                    <li>• Revenue</li>
                    <li>• Amount Taxable</li>
                    <li>• Bubblegum Tax</li>
                    <li>• Confectionary Sales Tax %</li>
                  </ul>
                </div>
                <div>
                  <strong>Audit Sheet Columns:</strong>
                  <ul className="mt-1 space-y-1 text-blue-600">
                    <li>• ID (Company Name)</li>
                    <li>• Audit Name (Company ID)</li>
                    <li>• Audit Date</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleSampleData}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Load Sample Data
              </Button>
              
              <Button 
                onClick={handleUpload}
                disabled={!jsonData.trim() || uploadMutation.isPending}
                className="bg-audit-blue hover:bg-blue-700 flex items-center gap-2"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload & Continue"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}