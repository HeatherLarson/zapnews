import { useState } from 'react';
import { Check, ChevronDown, Wifi, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

// Popular relay presets
const PRESET_RELAYS = [
  { url: 'wss://bevo.nostr1.com', name: 'Bevo', description: 'Default relay' },
  { url: 'wss://relay.damus.io', name: 'Damus', description: 'Popular general relay' },
  { url: 'wss://relay.primal.net', name: 'Primal', description: 'Fast & reliable' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.band', description: 'Search & discovery' },
  { url: 'wss://nos.lol', name: 'nos.lol', description: 'Community relay' },
  { url: 'wss://relay.snort.social', name: 'Snort', description: 'Social-focused relay' },
  { url: 'wss://relay.ditto.pub', name: 'Ditto', description: 'Soapbox relay' },
  { url: 'wss://purplepag.es', name: 'Purple Pages', description: 'Profile discovery' },
];

interface RelayPickerProps {
  className?: string;
}

export function RelayPicker({ className }: RelayPickerProps) {
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const currentRelays = config.relayMetadata.relays;
  const activeRelayUrls = new Set(currentRelays.map(r => r.url));

  // Get the primary (first) relay for display
  const primaryRelay = currentRelays[0];
  const primaryRelayName = PRESET_RELAYS.find(p => p.url === primaryRelay?.url)?.name
    || getDomainFromUrl(primaryRelay?.url || '');

  const toggleRelay = (url: string) => {
    let newRelays;

    if (activeRelayUrls.has(url)) {
      // Remove relay (but keep at least one)
      if (currentRelays.length <= 1) {
        toast({
          title: 'Cannot remove',
          description: 'You need at least one relay connected.',
          variant: 'destructive',
        });
        return;
      }
      newRelays = currentRelays.filter(r => r.url !== url);
    } else {
      // Add relay
      newRelays = [...currentRelays, { url, read: true, write: true }];
    }

    saveRelays(newRelays);
  };

  const addCustomRelay = () => {
    const normalized = normalizeRelayUrl(customUrl);

    if (!isValidRelayUrl(normalized)) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid WebSocket URL (wss://...)',
        variant: 'destructive',
      });
      return;
    }

    if (activeRelayUrls.has(normalized)) {
      toast({
        title: 'Already added',
        description: 'This relay is already in your list.',
      });
      return;
    }

    const newRelays = [...currentRelays, { url: normalized, read: true, write: true }];
    saveRelays(newRelays);
    setCustomUrl('');

    toast({
      title: 'Relay added',
      description: `Connected to ${getDomainFromUrl(normalized)}`,
    });
  };

  const saveRelays = (newRelays: typeof currentRelays) => {
    const now = Math.floor(Date.now() / 1000);

    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: newRelays,
        updatedAt: now,
      },
    }));

    // Publish NIP-65 if logged in
    if (user) {
      const tags = newRelays.map(relay => {
        if (relay.read && relay.write) {
          return ['r', relay.url];
        } else if (relay.read) {
          return ['r', relay.url, 'read'];
        } else if (relay.write) {
          return ['r', relay.url, 'write'];
        }
        return null;
      }).filter((tag): tag is string[] => tag !== null);

      publishEvent({
        kind: 10002,
        content: '',
        tags,
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 text-muted-foreground hover:text-foreground", className)}
        >
          <Wifi className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">{primaryRelayName}</span>
          <span className="sm:hidden text-xs">{currentRelays.length}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Relays</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentRelays.length} connected
          </p>
        </div>

        {/* Preset relays */}
        <div className="max-h-64 overflow-y-auto p-1">
          {PRESET_RELAYS.map((preset) => {
            const isActive = activeRelayUrls.has(preset.url);
            return (
              <button
                key={preset.url}
                onClick={() => toggleRelay(preset.url)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                  "hover:bg-muted/50",
                  isActive && "bg-muted/30"
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                  isActive ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}>
                  {isActive && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{preset.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom relay input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="wss://relay.example.com"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomRelay();
                }
              }}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 shrink-0"
              onClick={addCustomRelay}
              disabled={!customUrl.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper functions
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function normalizeRelayUrl(url: string): string {
  url = url.trim();
  if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
    url = `wss://${url}`;
  }
  try {
    const parsed = new URL(url);
    // Remove trailing slash
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return url;
  }
}

function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  } catch {
    return false;
  }
}
