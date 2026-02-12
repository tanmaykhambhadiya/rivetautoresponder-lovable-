import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmailToggle } from '@/components/dashboard/EmailToggle';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { EmailStatsChart } from '@/components/dashboard/EmailStatsChart';
import { EmailHealthWidget } from '@/components/dashboard/EmailHealthWidget';
import { AutomationStatusCard } from '@/components/dashboard/AutomationStatusCard';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { useNurses } from '@/hooks/useNurses';
import { Mail, CheckCircle2, Clock, Users } from 'lucide-react';

export default function DashboardPage() {
  const { todayCount, sentCount, pendingCount, logs } = useEmailLogs();
  const { nurses } = useNurses();

  const successRate = logs.length > 0 
    ? ((sentCount / logs.length) * 100).toFixed(0) + '%'
    : '—';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage NHS shift email auto-responses
          </p>
        </div>

        {/* Global Email Toggle */}
        <EmailToggle />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Emails Today"
            value={todayCount}
            subtitle="Processed today"
            icon={Mail}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatCard
            title="Success Rate"
            value={successRate}
            subtitle="All time"
            icon={CheckCircle2}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Pending"
            value={pendingCount}
            subtitle="Awaiting processing"
            icon={Clock}
            iconClassName="bg-warning/10 text-warning"
          />
          <StatCard
            title="Active Nurses"
            value={nurses.length}
            subtitle="In the system"
            icon={Users}
            iconClassName="bg-accent/10 text-accent"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <EmailStatsChart className="lg:col-span-2" />
          <div className="space-y-6">
            <AutomationStatusCard />
            <EmailHealthWidget />
          </div>
        </div>
        
        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}