import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useApprovedSenders } from '@/hooks/useApprovedSenders';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Mail, Plus, Trash2, Power, Clock, Loader2 } from 'lucide-react';
import { EmailProviderCard } from '@/components/settings/EmailProviderCard';
import { OutlookAdminConfig } from '@/components/settings/OutlookAdminConfig';
import { GmailAdminConfig } from '@/components/settings/GmailAdminConfig';

export default function SettingsPage() {
  const { settings, updateSetting, isEmailProcessingEnabled, isAutoResponseEnabled, isLoading: settingsLoading } = useSystemSettings();
  const { senders, addSender, updateSender, deleteSender, isLoading: sendersLoading } = useApprovedSenders();
  const { isAdmin } = useAuth();

  const [isAddSenderOpen, setIsAddSenderOpen] = useState(false);
  const [newSender, setNewSender] = useState({ email: '', name: '' });

  const handleAddSender = async () => {
    if (!newSender.email) return;
    await addSender.mutateAsync({ 
      email: newSender.email, 
      name: newSender.name || null,
      is_active: true 
    });
    setNewSender({ email: '', name: '' });
    setIsAddSenderOpen(false);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground mt-2">
              Only administrators can access settings
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure system settings and approved email senders
          </p>
        </div>

        {/* OAuth Admin Configuration */}
        <div className="grid gap-6 lg:grid-cols-2">
          <OutlookAdminConfig />
          <GmailAdminConfig />
        </div>

        {/* Email Provider Integration */}
        <EmailProviderCard />

        {/* Email Processing Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Email Processing Control
            </CardTitle>
            <CardDescription>
              Control the automatic email processing and response system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Email Processing</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, incoming emails will be automatically processed
                </p>
              </div>
              <Switch
                checked={isEmailProcessingEnabled}
                onCheckedChange={(checked) => 
                  updateSetting.mutate({ key: 'email_processing_enabled', value: checked })
                }
                disabled={settingsLoading}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Auto Response</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, responses will be sent automatically to matched shifts
                </p>
              </div>
              <Switch
                checked={isAutoResponseEnabled}
                onCheckedChange={(checked) => 
                  updateSetting.mutate({ key: 'auto_response_enabled', value: checked })
                }
                disabled={settingsLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approved Senders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Approved Senders
              </CardTitle>
              <CardDescription>
                Only emails from these addresses will trigger auto-responses
              </CardDescription>
            </div>
            <Dialog open={isAddSenderOpen} onOpenChange={setIsAddSenderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sender
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Approved Sender</DialogTitle>
                  <DialogDescription>
                    Add an email address to the approved senders list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSender.email}
                      onChange={(e) => setNewSender({ ...newSender, email: e.target.value })}
                      placeholder="sender@nhs.net"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name (optional)</Label>
                    <Input
                      id="name"
                      value={newSender.name}
                      onChange={(e) => setNewSender({ ...newSender, name: e.target.value })}
                      placeholder="NHS Agency Supply"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddSenderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSender} disabled={addSender.isPending}>
                    {addSender.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Sender
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {sendersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : senders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved senders configured</p>
                <p className="text-sm mt-2">Add email addresses that can trigger auto-responses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {senders.map((sender) => (
                  <div
                    key={sender.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${sender.is_active ? 'bg-success/10' : 'bg-muted'}`}>
                        <Mail className={`h-4 w-4 ${sender.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{sender.email}</p>
                        {sender.name && (
                          <p className="text-sm text-muted-foreground">{sender.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={sender.is_active ? 'default' : 'secondary'}>
                        {sender.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={sender.is_active}
                        onCheckedChange={(checked) => 
                          updateSender.mutate({ id: sender.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSender.mutate(sender.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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