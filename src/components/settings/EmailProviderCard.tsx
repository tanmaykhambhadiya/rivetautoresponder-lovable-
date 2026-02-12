import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Mail } from 'lucide-react';
import { OutlookConnectionCard } from './OutlookConnectionCard';
import { GmailConnectionCard } from './GmailConnectionCard';

export function EmailProviderCard() {
  const { getSetting } = useSystemSettings();
  const activeProvider = getSetting('email_provider') || 'none';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Integration
        </CardTitle>
        <CardDescription>
          Connect your email provider to receive and send emails automatically. Choose either Gmail or Outlook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeProvider === 'gmail' ? 'gmail' : 'outlook'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outlook" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H8.21q-.48 0-.8-.33-.33-.32-.33-.8V18H1.13q-.47 0-.8-.33Q0 17.34 0 16.86V7.13q0-.48.33-.8.32-.33.8-.33h6.93V2.63q0-.47.33-.8.32-.32.8-.32h15.68q.48 0 .8.33.33.32.33.8V12zm-6.19 0q0-.67-.21-1.24-.22-.58-.61-1.01-.4-.43-.95-.67-.56-.24-1.22-.24-.67 0-1.22.24-.55.24-.95.67-.4.43-.62 1.01-.22.57-.22 1.24t.22 1.25q.22.57.62 1.01.4.43.95.67.55.24 1.22.24.66 0 1.22-.24.55-.24.95-.67.4-.43.61-1.01.21-.58.21-1.25zm-1.12 8.19h5.12v-2.61h-5.12v2.61zm0-4.05h5.12v-2.61h-5.12v2.61zm0-4.05h5.12v-2.61h-5.12v2.61zM7.88 5.55v.29h6.93V5.55H7.88zm0 .85v.3h6.93v-.3H7.88zm0 .84v.3h6.93v-.3H7.88z"/>
              </svg>
              Outlook
            </TabsTrigger>
            <TabsTrigger value="gmail" className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Gmail
            </TabsTrigger>
          </TabsList>
          <TabsContent value="outlook" className="mt-4">
            <OutlookConnectionCard />
          </TabsContent>
          <TabsContent value="gmail" className="mt-4">
            <GmailConnectionCard />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
