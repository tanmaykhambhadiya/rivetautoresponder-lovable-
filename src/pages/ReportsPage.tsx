import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReports } from '@/hooks/useReports';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart3, Download, FileText, TrendingUp, Users, Mail, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function ReportsPage() {
  const { reports, weeklyReports, monthlyReports, generateReport, isLoading } = useReports();
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  const handleGenerateWeeklyReport = async () => {
    const now = new Date();
    const start = format(startOfWeek(now), 'yyyy-MM-dd');
    const end = format(endOfWeek(now), 'yyyy-MM-dd');
    await generateReport.mutateAsync({ reportType: 'weekly', periodStart: start, periodEnd: end });
  };

  const handleGenerateMonthlyReport = async () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    await generateReport.mutateAsync({ reportType: 'monthly', periodStart: start, periodEnd: end });
  };

  const latestReport = reports[0];
  const reportData = latestReport?.data as any;

  const shiftsByUnitData = reportData?.shiftsByUnit 
    ? Object.entries(reportData.shiftsByUnit).map(([unit, count]) => ({ unit, count }))
    : [];

  const emailStatsData = reportData?.emailStats
    ? [
        { name: 'Sent', value: reportData.emailStats.sent },
        { name: 'Failed', value: reportData.emailStats.failed },
        { name: 'Blocked', value: reportData.emailStats.blocked },
        { name: 'Pending', value: reportData.emailStats.pending }
      ].filter(d => d.value > 0)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Generate and view shift fill rates and nurse utilization reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGenerateWeeklyReport}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Weekly
            </Button>
            <Button 
              onClick={handleGenerateMonthlyReport}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Monthly
            </Button>
          </div>
        </div>

        {/* Quick Stats from Latest Report */}
        {latestReport && reportData && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shifts Requested</p>
                      <p className="text-2xl font-bold">{reportData.totalShiftsRequested}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fill Rate</p>
                      <p className="text-2xl font-bold">{reportData.fillRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent/10">
                      <Users className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shifts Filled</p>
                      <p className="text-2xl font-bold">{reportData.shiftsFilled}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-info/10">
                      <Mail className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emails Sent</p>
                      <p className="text-2xl font-bold">{reportData.emailStats?.sent || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Shifts by Unit */}
              <Card>
                <CardHeader>
                  <CardTitle>Shifts by Unit</CardTitle>
                  <CardDescription>Distribution of filled shifts across units</CardDescription>
                </CardHeader>
                <CardContent>
                  {shiftsByUnitData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={shiftsByUnitData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="unit" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Email Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Status</CardTitle>
                  <CardDescription>Distribution of email processing outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  {emailStatsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={emailStatsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {emailStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Nurses */}
            {reportData.nurseUtilization && reportData.nurseUtilization.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Nurses</CardTitle>
                  <CardDescription>Nurses with the most shifts filled this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.nurseUtilization.slice(0, 10).map((nurse: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{nurse.name}</span>
                        </div>
                        <Badge variant="secondary">{nurse.count} shifts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports generated yet</p>
                <p className="text-sm mt-2">Generate your first report using the buttons above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 10).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{report.report_type} Report</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(report.period_start), 'MMM d')} - {format(new Date(report.period_end), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {format(new Date(report.generated_at), 'MMM d, yyyy')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}