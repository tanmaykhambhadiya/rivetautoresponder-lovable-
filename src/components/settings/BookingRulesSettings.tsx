import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBookingRules } from '@/hooks/useBookingRules';
import { Loader2, Shield, Clock, Layers } from 'lucide-react';

const RULE_ICONS: Record<string, typeof Shield> = {
  block_all_units: Shield,
  allow_non_overlapping: Clock,
};

export function BookingRulesSettings() {
  const { rules, isLoading, updateRule } = useBookingRules();

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    await updateRule.mutateAsync({ id: ruleId, is_active: isActive });
  };

  const handleUpdateConfig = async (ruleId: string, config: Record<string, any>) => {
    await updateRule.mutateAsync({ id: ruleId, config });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Cross-Unit Booking Rules
          </CardTitle>
          <CardDescription>
            Configure how bookings work when a nurse is available in multiple units
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No booking rules configured
            </p>
          ) : (
            rules.map((rule) => {
              const Icon = RULE_ICONS[rule.rule_type] || Shield;
              
              return (
                <div 
                  key={rule.id} 
                  className={`p-4 border rounded-lg space-y-4 transition-opacity ${
                    rule.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${rule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            Priority {rule.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                  </div>

                  {/* Rule-specific configuration */}
                  {rule.is_active && rule.rule_type === 'block_all_units' && (
                    <div className="pl-12 space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`${rule.id}-block-same-day`}
                          checked={rule.config.block_same_day ?? true}
                          onChange={(e) => handleUpdateConfig(rule.id, {
                            ...rule.config,
                            block_same_day: e.target.checked
                          })}
                          className="rounded border-input"
                        />
                        <Label htmlFor={`${rule.id}-block-same-day`} className="text-sm">
                          Block all units on the same day when nurse is booked
                        </Label>
                      </div>
                    </div>
                  )}

                  {rule.is_active && rule.rule_type === 'allow_non_overlapping' && (
                    <div className="pl-12 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Minimum Gap Between Shifts (minutes)</Label>
                          <Input
                            type="number"
                            value={rule.config.min_gap_minutes ?? 60}
                            onChange={(e) => handleUpdateConfig(rule.id, {
                              ...rule.config,
                              min_gap_minutes: parseInt(e.target.value) || 60
                            })}
                            min={0}
                            max={240}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Max Shifts Per Day</Label>
                          <Input
                            type="number"
                            value={rule.config.max_shifts_per_day ?? 2}
                            onChange={(e) => handleUpdateConfig(rule.id, {
                              ...rule.config,
                              max_shifts_per_day: parseInt(e.target.value) || 2
                            })}
                            min={1}
                            max={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rule Priority</CardTitle>
          <CardDescription>
            Rules are evaluated in priority order. Lower numbers = higher priority.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Block All Units</strong> - When active, if a nurse is booked for any shift on a date, they become unavailable for ALL units that day.</p>
            <p>• <strong>Allow Non-Overlapping</strong> - When active, allows multiple bookings if shifts don't overlap and the gap requirement is met.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
