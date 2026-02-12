import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponseSpeedSettings } from '@/components/settings/ResponseSpeedSettings';
import { ResponseTemplateEditor } from '@/components/settings/ResponseTemplateEditor';
import { SendingRulesSettings } from '@/components/settings/SendingRulesSettings';
import { FailedEmailsManager } from '@/components/settings/FailedEmailsManager';
import { ResponseMonitoringCard } from '@/components/settings/ResponseMonitoringCard';
import { RetrySettings } from '@/components/settings/RetrySettings';
import { BookingRulesSettings } from '@/components/settings/BookingRulesSettings';
import { Settings, Zap, Mail, AlertTriangle, BarChart3, RotateCcw, Layers } from 'lucide-react';

export default function AutoResponseSettingsPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Access restricted to administrators.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Auto-Response Configuration
            </h1>
            <p className="text-muted-foreground mt-1">
              Control how and when automated emails are sent
            </p>
          </div>
          <ResponseMonitoringCard />
        </div>

        <Tabs defaultValue="speed" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="speed" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Speed
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="retry" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Retry
            </TabsTrigger>
            <TabsTrigger value="failed" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Failed
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="speed" className="mt-6">
            <ResponseSpeedSettings />
          </TabsContent>

          <TabsContent value="template" className="mt-6">
            <ResponseTemplateEditor />
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <SendingRulesSettings />
          </TabsContent>

          <TabsContent value="booking" className="mt-6">
            <BookingRulesSettings />
          </TabsContent>

          <TabsContent value="retry" className="mt-6">
            <RetrySettings />
          </TabsContent>

          <TabsContent value="failed" className="mt-6">
            <FailedEmailsManager />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-6">
            <ResponseMonitoringCard fullView />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
