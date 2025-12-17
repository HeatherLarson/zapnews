import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { RelayListManager } from '@/components/RelayListManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wifi } from 'lucide-react';

export function SettingsPage() {
  useSeoMeta({
    title: 'Settings | Zap News',
    description: 'Manage your relay connections and preferences',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto py-4 px-4">
        {/* Back button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to feed
          </Button>
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* Relay Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Relay Connections
            </CardTitle>
            <CardDescription>
              Manage which Nostr relays you connect to. Your relay preferences are saved locally and synced to Nostr when logged in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RelayListManager />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default SettingsPage;
