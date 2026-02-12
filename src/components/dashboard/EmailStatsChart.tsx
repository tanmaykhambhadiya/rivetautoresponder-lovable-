import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = {
  sent: 'hsl(var(--success))',
  failed: 'hsl(var(--destructive))',
  pending: 'hsl(var(--warning))',
  blocked: 'hsl(var(--muted))'
};

interface EmailStatsChartProps {
  className?: string;
}

export function EmailStatsChart({ className }: EmailStatsChartProps) {
  const { sentCount, failedCount, pendingCount, logs } = useEmailLogs();
  const blockedCount = logs.filter(l => l.status === 'blocked').length;

  const data = [
    { name: 'Sent', value: sentCount, color: COLORS.sent },
    { name: 'Failed', value: failedCount, color: COLORS.failed },
    { name: 'Pending', value: pendingCount, color: COLORS.pending },
    { name: 'Blocked', value: blockedCount, color: COLORS.blocked }
  ].filter(d => d.value > 0);

  const total = sentCount + failedCount + pendingCount + blockedCount;
  const successRate = total > 0 ? ((sentCount / total) * 100).toFixed(1) : '0';

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Email Status Distribution</span>
          <span className="text-sm font-normal text-muted-foreground">
            {successRate}% success rate
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No email data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}