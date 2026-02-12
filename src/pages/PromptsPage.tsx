import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePrompts } from '@/hooks/usePrompts';
import { useMatchingRules } from '@/hooks/useMatchingRules';
import { useAuth } from '@/contexts/AuthContext';
import { Edit3, Save, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function PromptsPage() {
  const { prompts, updatePrompt, isLoading: promptsLoading } = usePrompts();
  const { rules, updateRule, isLoading: rulesLoading } = useMatchingRules();
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;

  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const startEditing = (promptId: string, content: string) => {
    setEditingPrompt(promptId);
    setEditContent(content);
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setEditContent('');
  };

  const savePrompt = async (promptId: string) => {
    await updatePrompt.mutateAsync({ id: promptId, content: editContent });
    cancelEditing();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts & Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure AI prompts for email classification and shift matching
          </p>
        </div>

        {/* AI Prompts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Prompts</h2>
          
          {promptsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">
                        {prompt.name.replace(/_/g, ' ')}
                      </CardTitle>
                      {prompt.description && (
                        <CardDescription>{prompt.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                      {prompt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingPrompt === prompt.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => savePrompt(prompt.id)}
                          disabled={updatePrompt.isPending}
                        >
                          {updatePrompt.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                        <Button variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <pre className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                        {prompt.content}
                      </pre>
                      {canEdit && (
                        <Button
                          variant="outline"
                          onClick={() => startEditing(prompt.id, prompt.content)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Prompt
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Matching Rules */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Matching Rules</h2>
          
          {rulesLoading ? (
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-success/10' : 'bg-muted'}`}>
                          {rule.is_active ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{rule.name.replace(/_/g, ' ')}</p>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                        {canEdit && (
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => 
                              updateRule.mutate({ id: rule.id, is_active: checked })
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}