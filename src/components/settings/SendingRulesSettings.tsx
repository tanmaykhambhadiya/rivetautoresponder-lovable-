import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Settings, Bell, UserCheck, Mail } from 'lucide-react';

export function SendingRulesSettings() {
  const { getSetting, updateSetting, isLoading } = useSystemSettings();

  const sendOnNoMatch = getSetting('send_on_no_match') === true || getSetting('send_on_no_match') === 'true';
  const includeShiftTable = getSetting('include_shift_table') === true || getSetting('include_shift_table') === 'true';
  const includeNurseContact = getSetting('include_nurse_contact') === true || getSetting('include_nurse_contact') === 'true';
  const notifyAdminOnFailure = getSetting('notify_admin_on_failure') === true || getSetting('notify_admin_on_failure') === 'true';
  const adminEmail = String(getSetting('admin_notification_email') || '').replace(/"/g, '');

  const handleToggle = (key: string, checked: boolean) => {
    updateSetting.mutate({ key, value: checked });
  };

  const handleEmailChange = (email: string) => {
    updateSetting.mutate({ key: 'admin_notification_email', value: `"${email}"` });
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-500" />
            Match Behavior
          </CardTitle>
          <CardDescription>
            Configure when to send automated responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="send-on-no-match">Send response when no match found</Label>
              <p className="text-sm text-muted-foreground">
                Send a notification email even when no nurse is available
              </p>
            </div>
            <Switch
              id="send-on-no-match"
              checked={sendOnNoMatch}
              onCheckedChange={(checked) => handleToggle('send_on_no_match', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Email Content
          </CardTitle>
          <CardDescription>
            Configure what to include in response emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="include-shift-table">Include shift details table</Label>
              <p className="text-sm text-muted-foreground">
                Add a formatted table with all shift assignments
              </p>
            </div>
            <Switch
              id="include-shift-table"
              checked={includeShiftTable}
              onCheckedChange={(checked) => handleToggle('include_shift_table', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="include-nurse-contact">Include nurse contact info</Label>
              <p className="text-sm text-muted-foreground">
                Include phone/email for matched nurses (if available)
              </p>
            </div>
            <Switch
              id="include-nurse-contact"
              checked={includeNurseContact}
              onCheckedChange={(checked) => handleToggle('include_nurse_contact', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Admin Notifications
          </CardTitle>
          <CardDescription>
            Get notified when things go wrong
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notify-admin">Notify admin on failure</Label>
              <p className="text-sm text-muted-foreground">
                Send an email to admin when processing fails
              </p>
            </div>
            <Switch
              id="notify-admin"
              checked={notifyAdminOnFailure}
              onCheckedChange={(checked) => handleToggle('notify_admin_on_failure', checked)}
            />
          </div>

          {notifyAdminOnFailure && (
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin email address</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
