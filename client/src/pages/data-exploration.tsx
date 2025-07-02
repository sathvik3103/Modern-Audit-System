import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Database, Eye, Users, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyData {
  id: number;
  corpName: string;
  corpId: number;
  periodStartDate: string;
  periodEndDate: string;
  taxableIncome: string | null;
  salary: string | null;
  revenue: string | null;
  amountTaxable: string | null;
  bubblegumTax: string | null;
  confectionarySalesTaxPercent: string | null;
}

interface AuditData {
  id: number;
  corpId: number;
  corpName: string;
  auditDate: string;
}

interface JoinedData extends CompanyData {
  auditDate: string | null;
}

export default function DataExplorationPage() {
  const [, setLocation] = useLocation();

  // Fetch companies data
  const { data: companies = [], isLoading: companiesLoading } = useQuery<CompanyData[]>({
    queryKey: ['/api/companies-raw'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies-raw');
      return response.json();
    },
  });

  // Fetch audits data
  const { data: audits = [], isLoading: auditsLoading } = useQuery<AuditData[]>({
    queryKey: ['/api/audits-raw'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/audits-raw');
      return response.json();
    },
  });

  // Create joined data
  const joinedData: JoinedData[] = companies.map(company => {
    const audit = audits.find(a => a.corpId === company.corpId);
    return {
      ...company,
      auditDate: audit ? audit.auditDate : null
    };
  });

  const handleProceedToAudit = () => {
    setLocation("/audit");
  };

  // Redirect to upload if no data
  useEffect(() => {
    if (!companiesLoading && companies.length === 0) {
      setLocation("/");
    }
  }, [companies, companiesLoading, setLocation]);

  const formatCurrency = (value: string | null) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (value: string | null) => {
    if (!value) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  if (companiesLoading || auditsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-16">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-audit-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div className="ml-4">
                  <h1 className="text-xl font-semibold text-gray-900">ABCD Auditing</h1>
                  <p className="text-sm text-gray-500">Data Exploration</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto py-8 px-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-audit-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">ABCD Auditing</h1>
                <p className="text-sm text-gray-500">Data Exploration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Step 2 of 3
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Summary Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <Eye className="w-12 h-12 text-audit-blue mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore Your Data</h2>
            <p className="text-gray-600">
              Review your uploaded data before proceeding to audit analysis. 
              The joined table shows how your returns and audit data will be combined for analysis.
            </p>
          </div>

          {/* Data Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Returns Records</p>
                    <p className="text-2xl font-semibold text-gray-900">{companies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Audit Records</p>
                    <p className="text-2xl font-semibold text-gray-900">{audits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Companies with Audits</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {joinedData.filter(item => item.auditDate).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="joined" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="joined">Joined Data (Analysis Ready)</TabsTrigger>
            <TabsTrigger value="returns">Returns Table</TabsTrigger>
            <TabsTrigger value="audits">Audit Table</TabsTrigger>
          </TabsList>

          {/* Joined Data Tab */}
          <TabsContent value="joined">
            <Card>
              <CardHeader>
                <CardTitle>Joined Data - Ready for Analysis</CardTitle>
                <p className="text-sm text-gray-600">
                  This table combines Returns data with Audit dates and will be used for all audit analysis.
                  Showing top 10 records.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Corp ID</TableHead>
                        <TableHead>Period Start</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead>Taxable Income</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Amount Taxable</TableHead>
                        <TableHead>Bubblegum Tax</TableHead>
                        <TableHead>Sales Tax %</TableHead>
                        <TableHead>Last Audit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {joinedData.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.corpName}</TableCell>
                          <TableCell>{item.corpId}</TableCell>
                          <TableCell>{formatDate(item.periodStartDate)}</TableCell>
                          <TableCell>{formatDate(item.periodEndDate)}</TableCell>
                          <TableCell>{formatCurrency(item.taxableIncome)}</TableCell>
                          <TableCell>{formatCurrency(item.salary)}</TableCell>
                          <TableCell>{formatCurrency(item.revenue)}</TableCell>
                          <TableCell>{formatCurrency(item.amountTaxable)}</TableCell>
                          <TableCell>{formatCurrency(item.bubblegumTax)}</TableCell>
                          <TableCell>{formatPercentage(item.confectionarySalesTaxPercent)}</TableCell>
                          <TableCell>{formatDate(item.auditDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {joinedData.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Showing 10 of {joinedData.length} total records
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Returns Data Tab */}
          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle>Returns Table</CardTitle>
                <p className="text-sm text-gray-600">
                  Corporate returns data from your uploaded file. Showing top 10 records.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Corp ID</TableHead>
                        <TableHead>Period Start</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead>Taxable Income</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Amount Taxable</TableHead>
                        <TableHead>Bubblegum Tax</TableHead>
                        <TableHead>Sales Tax %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.slice(0, 10).map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.corpName}</TableCell>
                          <TableCell>{company.corpId}</TableCell>
                          <TableCell>{formatDate(company.periodStartDate)}</TableCell>
                          <TableCell>{formatDate(company.periodEndDate)}</TableCell>
                          <TableCell>{formatCurrency(company.taxableIncome)}</TableCell>
                          <TableCell>{formatCurrency(company.salary)}</TableCell>
                          <TableCell>{formatCurrency(company.revenue)}</TableCell>
                          <TableCell>{formatCurrency(company.amountTaxable)}</TableCell>
                          <TableCell>{formatCurrency(company.bubblegumTax)}</TableCell>
                          <TableCell>{formatPercentage(company.confectionarySalesTaxPercent)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {companies.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Showing 10 of {companies.length} total records
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audits Data Tab */}
          <TabsContent value="audits">
            <Card>
              <CardHeader>
                <CardTitle>Audit Table</CardTitle>
                <p className="text-sm text-gray-600">
                  Audit history data from your uploaded file. Showing top 10 records.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Corp ID</TableHead>
                        <TableHead>Audit Date</TableHead>
                        <TableHead>Years Ago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audits.slice(0, 10).map((audit) => {
                        const yearsAgo = Math.floor((new Date().getTime() - new Date(audit.auditDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                        return (
                          <TableRow key={audit.id}>
                            <TableCell className="font-medium">{audit.corpName}</TableCell>
                            <TableCell>{audit.corpId}</TableCell>
                            <TableCell>{formatDate(audit.auditDate)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={yearsAgo > 3 ? "destructive" : yearsAgo > 1 ? "secondary" : "default"}
                              >
                                {yearsAgo} years
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {audits.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Showing 10 of {audits.length} total records
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Proceed Button */}
        <div className="flex justify-center mt-12">
          <Button 
            onClick={handleProceedToAudit}
            className="bg-audit-blue hover:bg-blue-700 flex items-center gap-2 px-8 py-3 text-lg"
          >
            Proceed to Audit Analysis
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}