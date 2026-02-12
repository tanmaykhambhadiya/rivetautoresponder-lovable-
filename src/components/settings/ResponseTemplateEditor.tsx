import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrompts } from '@/hooks/usePrompts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, RotateCcw, Save, Sparkles, CheckCircle, XCircle, Settings2, Play, Loader2, Eye } from 'lucide-react';

const SAMPLE_MATCHED_DATA = [
  { nurse: "Jane Smith (RGN Band 5)", date: "2025-01-15", start_time: "07:00", end_time: "19:00", unit: "Ward A", grade: "Band 5 RN" },
  { nurse: "John Doe (RMN Band 6)", date: "2025-01-15", start_time: "19:00", end_time: "07:30", unit: "Puffin Ward", grade: "Band 6 RMN" },
];

const SAMPLE_NO_MATCH_DATA = [
  { date: "2025-01-16", start_time: "21:00", end_time: "07:30", unit: "Ward 19 T&O QHB", grade: "RMN" },
];

const DEFAULT_MATCHED_PROMPT = `You are writing a professional NHS staffing email response. Generate a clear, professional HTML email body confirming the nurse assignment.

Context:
- This is a CONFIRMATION email - we HAVE matched nurses to the requested shifts
- Keep the tone professional but friendly
- Use proper HTML formatting: <h2>, <p>, <strong>, <ul>, <li> tags
- Include the [SHIFTS_TABLE] placeholder where the table should appear
- Sign off as the staffing team

The shift matches will be provided as JSON. Generate ONLY the HTML email body (no subject line, no <html> or <body> wrapper).

Example output format:
<h2>NHS Shift Assignment Confirmation</h2>
<p>Hello,</p>
<p>We are pleased to confirm we have matched the following nurse(s) for your requested shift(s):</p>

[SHIFTS_TABLE]

<p>Please confirm receipt of this assignment by replying to this email.</p>
<p>Best regards,<br><strong>NHS Staffing Team</strong></p>`;

const DEFAULT_NO_MATCH_PROMPT = `You are writing a professional NHS staffing email response. Generate a clear, professional HTML email body explaining that no nurses are currently available.

Context:
- This is a NO-MATCH email - we do NOT have any nurses available for the requested shifts
- Keep the tone professional but apologetic
- Use proper HTML formatting: <h2>, <p>, <strong>, <ul>, <li> tags
- Include the [SHIFTS_TABLE] placeholder where the table should appear
- Mention they can try again or contact for alternatives
- Sign off as the staffing team

The requested shifts will be provided as JSON. Generate ONLY the HTML email body (no subject line, no <html> or <body> wrapper).

Example output format:
<h2>NHS Shift Request Update</h2>
<p>Hello,</p>
<p>Unfortunately, we do not have any staff who match the exact shift details below:</p>

[SHIFTS_TABLE]

<p>If you can accept an alternative, please contact us and we will try to accommodate your needs.</p>
<p>We apologise for any inconvenience.</p>
<p>Best regards,<br><strong>NHS Staffing Team</strong></p>`;

const DEFAULT_STYLE_PROMPT = `Professional, concise, NHS-appropriate tone. Use British English spelling. Generate HTML formatted responses with proper tags. Keep responses under 200 words.`;

export function ResponseTemplateEditor() {
  const { prompts, updatePrompt, isLoading } = usePrompts();
  const [matchedPrompt, setMatchedPrompt] = useState('');
  const [noMatchPrompt, setNoMatchPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [testingMatched, setTestingMatched] = useState(false);
  const [testingNoMatch, setTestingNoMatch] = useState(false);
  const [matchedPreview, setMatchedPreview] = useState('');
  const [noMatchPreview, setNoMatchPreview] = useState('');

  const matchedPromptData = prompts.find(p => p.name === 'email_response_matched');
  const noMatchPromptData = prompts.find(p => p.name === 'email_response_no_match');
  const stylePromptData = prompts.find(p => p.name === 'email_response_style');

  useEffect(() => {
    if (matchedPromptData) setMatchedPrompt(matchedPromptData.content);
    if (noMatchPromptData) setNoMatchPrompt(noMatchPromptData.content);
    if (stylePromptData) setStylePrompt(stylePromptData.content);
  }, [matchedPromptData, noMatchPromptData, stylePromptData]);

  const handleSaveMatched = () => {
    if (matchedPromptData) {
      updatePrompt.mutate({ id: matchedPromptData.id, content: matchedPrompt });
    }
  };

  const handleSaveNoMatch = () => {
    if (noMatchPromptData) {
      updatePrompt.mutate({ id: noMatchPromptData.id, content: noMatchPrompt });
    }
  };

  const handleSaveStyle = () => {
    if (stylePromptData) {
      updatePrompt.mutate({ id: stylePromptData.id, content: stylePrompt });
    }
  };

  const handleResetMatched = () => {
    setMatchedPrompt(DEFAULT_MATCHED_PROMPT);
    setMatchedPreview('');
    toast.info('Prompt reset to default. Click Save to apply.');
  };

  const handleResetNoMatch = () => {
    setNoMatchPrompt(DEFAULT_NO_MATCH_PROMPT);
    setNoMatchPreview('');
    toast.info('Prompt reset to default. Click Save to apply.');
  };

  const handleResetStyle = () => {
    setStylePrompt(DEFAULT_STYLE_PROMPT);
    toast.info('Style reset to default. Click Save to apply.');
  };

  const testAIResponse = async (type: 'matched' | 'no-match') => {
    const prompt = type === 'matched' ? matchedPrompt : noMatchPrompt;
    const sampleData = type === 'matched' ? SAMPLE_MATCHED_DATA : SAMPLE_NO_MATCH_DATA;
    const setTesting = type === 'matched' ? setTestingMatched : setTestingNoMatch;
    const setPreview = type === 'matched' ? setMatchedPreview : setNoMatchPreview;

    setTesting(true);
    setPreview('');

    try {
      const { data, error } = await supabase.functions.invoke('test-ai-response', {
        body: {
          prompt,
          stylePrompt,
          shiftData: sampleData,
          isMatch: type === 'matched'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPreview(data.content || 'No content generated');
      toast.success('AI response generated!');
    } catch (err: any) {
      console.error('Test AI error:', err);
      toast.error('Failed to generate: ' + (err.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const generateShiftsTablePreview = (data: any[], includeNurse: boolean) => {
    const headers = includeNurse 
      ? ['Nurse', 'Date', 'Time', 'Unit', 'Grade']
      : ['Date', 'Time', 'Unit', 'Requested Grade'];
    
    return `
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            ${headers.map(h => `<th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(d => `
            <tr>
              ${includeNurse ? `<td style="border: 1px solid #d1d5db; padding: 8px;">${d.nurse}</td>` : ''}
              <td style="border: 1px solid #d1d5db; padding: 8px;">${d.date}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${d.start_time} - ${d.end_time}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${d.unit}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${d.grade}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const renderPreview = (content: string, type: 'matched' | 'no-match') => {
    if (!content) return null;
    
    const sampleData = type === 'matched' ? SAMPLE_MATCHED_DATA : SAMPLE_NO_MATCH_DATA;
    const table = generateShiftsTablePreview(sampleData, type === 'matched');
    const rendered = content.replace('[SHIFTS_TABLE]', table);
    
    return (
      <Card className="mt-4 border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
            <Eye className="h-4 w-4" />
            AI Generated Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="p-4 bg-white dark:bg-gray-900 border rounded-lg prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: rendered.replace(/\n/g, '<br>') }}
          />
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI-Generated Email Responses
          </CardTitle>
          <CardDescription>
            These prompts control how the AI generates email response content. Use the "Test AI Response" button
            to preview what the AI will generate before saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              ✓ Dynamic content based on shift data
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              ✓ Professional NHS-style formatting
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              ✓ Preview before saving
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="matched" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matched" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Nurse Matched
          </TabsTrigger>
          <TabsTrigger value="no-match" className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-orange-500" />
            No Match Found
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-500" />
            Response Style
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matched" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                When Nurse is Matched
              </CardTitle>
              <CardDescription>
                This prompt generates the confirmation email when nurses are successfully matched to shifts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matched-prompt">AI Prompt Instructions</Label>
                <Textarea
                  id="matched-prompt"
                  value={matchedPrompt}
                  onChange={(e) => setMatchedPrompt(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Enter the AI prompt for matched nurse responses..."
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                <p className="font-medium">📋 Sample Data for Testing:</p>
                <div className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(SAMPLE_MATCHED_DATA, null, 2)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => testAIResponse('matched')}
                  disabled={testingMatched}
                >
                  {testingMatched ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Test AI Response
                </Button>
                <Button onClick={handleSaveMatched} disabled={updatePrompt.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Prompt
                </Button>
                <Button variant="ghost" onClick={handleResetMatched}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {renderPreview(matchedPreview, 'matched')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="no-match" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <XCircle className="h-5 w-5" />
                When No Match Found
              </CardTitle>
              <CardDescription>
                This prompt generates the response email when no nurses are available for the requested shifts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="no-match-prompt">AI Prompt Instructions</Label>
                <Textarea
                  id="no-match-prompt"
                  value={noMatchPrompt}
                  onChange={(e) => setNoMatchPrompt(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Enter the AI prompt for no-match responses..."
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                <p className="font-medium">📋 Sample Data for Testing:</p>
                <div className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(SAMPLE_NO_MATCH_DATA, null, 2)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => testAIResponse('no-match')}
                  disabled={testingNoMatch}
                >
                  {testingNoMatch ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Test AI Response
                </Button>
                <Button onClick={handleSaveNoMatch} disabled={updatePrompt.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Prompt
                </Button>
                <Button variant="ghost" onClick={handleResetNoMatch}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {renderPreview(noMatchPreview, 'no-match')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="style" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Settings2 className="h-5 w-5" />
                Response Style Settings
              </CardTitle>
              <CardDescription>
                Configure the overall style and tone for all AI-generated email responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="style-prompt">Style Guidelines</Label>
                <Textarea
                  id="style-prompt"
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder="Enter style guidelines for AI responses..."
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="font-medium">💡 Style Examples:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>"Professional, concise, NHS-appropriate tone"</li>
                  <li>"Use British English spelling"</li>
                  <li>"Keep responses under 150 words"</li>
                  <li>"Always include greeting and sign-off"</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveStyle} disabled={updatePrompt.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Style
                </Button>
                <Button variant="ghost" onClick={handleResetStyle}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
