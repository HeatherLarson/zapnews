import { useSeoMeta } from '@unhead/react';
import { useParams, Link } from 'react-router-dom';
import { nip19, nip57 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '@/components/Header';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { useThread } from '@/hooks/useThreads';
import { useAuthor } from '@/hooks/useAuthor';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { useComments } from '@/hooks/useComments';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';
import { WalletModal } from '@/components/WalletModal';
import {
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Loader2,
  Wallet,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotFound from './NotFound';
import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';

const REPLY_COST_SATS = 10;

// Extract URL from content
function extractUrl(content: string): string | null {
  const urlRegex = /https?:\/\/[^\s]+/;
  const match = content.match(urlRegex);
  return match ? match[0] : null;
}

// Get content without URL (first line only)
function getContentWithoutUrl(content: string, url: string | null): string {
  if (!url) return content;
  return content.replace(url, '').trim();
}

export function ThreadPage() {
  const { nip19: nip19Id } = useParams<{ nip19: string }>();

  // Decode note ID to event ID
  let eventId: string | undefined;
  let noteId: string | undefined = nip19Id;
  try {
    if (nip19Id) {
      const decoded = nip19.decode(nip19Id);
      if (decoded.type === 'note') {
        eventId = decoded.data;
      } else if (decoded.type === 'nevent') {
        eventId = decoded.data.id;
      }
    }
  } catch {
    // Invalid NIP-19 identifier
  }

  const { data: thread, isLoading, error } = useThread(eventId);
  const author = useAuthor(thread?.pubkey);
  const { webln, activeNWC } = useWallet();
  const { totalSats, isLoading: zapsLoading } = useZaps(
    thread || [],
    webln,
    activeNWC
  );
  const { data: commentsData, isLoading: commentsLoading } = useComments(thread, 500);

  // Set meta tags
  const title = thread?.tags.find(([name]) => name === 'title')?.[1] || thread?.content.slice(0, 50) || 'Thread';
  useSeoMeta({
    title: `${title} | Zap News`,
    description: thread?.content.slice(0, 160) || 'View this thread on Zap News',
  });

  if (!eventId) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto py-4 px-4">
          <ThreadSkeleton />
        </main>
      </div>
    );
  }

  if (error || !thread) {
    return <NotFound />;
  }

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(thread.pubkey);
  const url = extractUrl(thread.content);
  const contentWithoutUrl = getContentWithoutUrl(thread.content, url);
  const timeAgo = formatDistanceToNow(new Date(thread.created_at * 1000), { addSuffix: false });
  const commentCount = commentsData?.topLevelComments.length || 0;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/${noteId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl mx-auto py-6 px-4">
        {/* Post Header - Stacker News Style */}
        <article className="mb-6">
          {/* Zap button and Title row */}
          <div className="flex gap-3">
            {/* Zap Column */}
            <div className="flex flex-col items-center pt-1">
              <ZapButton
                target={thread}
                className="text-muted-foreground hover:text-amber-500"
                showCount={false}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1 className="text-xl font-semibold leading-tight mb-1">
                {thread.tags.find(([name]) => name === 'title')?.[1] || title}
              </h1>

              {/* Meta line */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap mb-4">
                <span>{commentCount} comments</span>
                <span>\</span>
                <Link
                  to={`/${nip19.npubEncode(thread.pubkey)}`}
                  className="text-sky-600 hover:underline"
                >
                  @{displayName}
                </Link>
                <span>{timeAgo}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleShare}>
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`nostr:${noteId}`)}>
                      Copy Nostr URI
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Content */}
              {contentWithoutUrl && (
                <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                  <NoteContent event={{ ...thread, content: contentWithoutUrl }} />
                </div>
              )}

              {/* Comment Form - requires zap to post */}
              <div className="mb-8">
                <ZapReplyForm target={thread} />
              </div>

              {/* Total Sats */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <span className={`font-medium ${totalSats > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {zapsLoading ? '...' : `${totalSats.toLocaleString()} sats`}
                </span>
              </div>

              {/* Comments */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <CommentSkeleton key={i} />
                  ))}
                </div>
              ) : commentsData?.topLevelComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No replies yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {commentsData?.topLevelComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      root={thread}
                      getDirectReplies={commentsData.getDirectReplies}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

// Zap-to-Reply Form Component
function ZapReplyForm({ target, parent, onSuccess }: {
  target: NostrEvent;
  parent?: NostrEvent;
  onSuccess?: () => void;
}) {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { config } = useAppContext();
  const { webln, activeNWC } = useWallet();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  
  // Get the post author to zap them
  const postAuthor = useAuthor(target.pubkey);
  const hasWallet = !!(webln || activeNWC);
  const authorHasLightning = !!(postAuthor.data?.metadata?.lud16 || postAuthor.data?.metadata?.lud06);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || isProcessing) return;

    // Check if author can receive zaps
    if (!authorHasLightning) {
      toast({
        title: 'Cannot zap author',
        description: 'The post author does not have a Lightning address configured.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasWallet) {
      setWalletModalOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create the zap request and get invoice
      const zapEndpoint = await nip57.getZapEndpoint(postAuthor.data!.event!);
      if (!zapEndpoint) {
        throw new Error('Could not find zap endpoint for author');
      }

      const zapAmount = REPLY_COST_SATS * 1000; // Convert to millisats

      const zapRequest = nip57.makeZapRequest({
        profile: target.pubkey,
        event: target.id,
        amount: zapAmount,
        relays: config.relayMetadata.relays.map(r => r.url),
        comment: `Reply: ${content.trim().slice(0, 100)}...`
      });

      // Sign the zap request
      const signedZapRequest = await user.signer.signEvent(zapRequest);

      // Get invoice from LNURL endpoint
      const res = await fetch(`${zapEndpoint}?amount=${zapAmount}&nostr=${encodeURI(JSON.stringify(signedZapRequest))}`);
      const responseData = await res.json();

      if (!res.ok || !responseData.pr) {
        throw new Error(responseData.reason || 'Failed to get invoice');
      }

      const invoice = responseData.pr;

      // Step 2: Pay the invoice
      let paid = false;

      if (webln) {
        try {
          if (webln.enable) {
            await webln.enable();
          }
          await webln.sendPayment(invoice);
          paid = true;
        } catch (e) {
          console.log('WebLN payment failed:', e);
        }
      }

      if (!paid && activeNWC) {
        // TODO: Implement NWC payment
        // For now, show error
        throw new Error('Please connect a WebLN wallet to pay for replies');
      }

      if (!paid) {
        throw new Error('Payment failed. Please try again.');
      }

      // Step 3: Post the comment after successful payment
      const commentTags: string[][] = [];
      
      // Determine the root event
      const rootEvent = parent || target;
      
      if (target.kind === 11) {
        // NIP-22 style for kind 11 threads
        commentTags.push(['K', String(target.kind)]);
        commentTags.push(['E', target.id, '', target.pubkey]);
        if (parent) {
          commentTags.push(['e', parent.id, '', parent.pubkey]);
        }
      } else {
        // NIP-10 style for kind 1 notes
        commentTags.push(['e', target.id, '', 'root']);
        if (parent && parent.id !== target.id) {
          commentTags.push(['e', parent.id, '', 'reply']);
        }
        commentTags.push(['p', target.pubkey]);
        if (parent && parent.pubkey !== target.pubkey) {
          commentTags.push(['p', parent.pubkey]);
        }
      }

      const commentKind = target.kind === 11 ? 1111 : 1;

      await publishEvent({
        kind: commentKind,
        content: content.trim(),
        tags: commentTags,
      });

      toast({
        title: 'Reply posted! ⚡',
        description: `Zapped ${REPLY_COST_SATS} sats to post your reply`,
      });

      setContent('');
      
      // Invalidate comments query to refresh
      queryClient.invalidateQueries({ queryKey: ['nostr', 'comments'] });
      
      onSuccess?.();

    } catch (error) {
      console.error('Zap reply error:', error);
      toast({
        title: 'Failed to post reply',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to reply</p>
          <LoginArea />
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="fractions of a penny for your thoughts?"
          className="min-h-[100px] bg-muted/30 border-muted"
          disabled={isProcessing}
        />
        <div className="flex items-center justify-center gap-3">
          <Button
            type="submit"
            disabled={!content.trim() || isProcessing || !authorHasLightning}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                paying...
              </>
            ) : (
              <>
                reply
                <span className="ml-2 text-xs opacity-75 flex items-center">
                  <Zap className="h-3 w-3 mr-0.5" />
                  {REPLY_COST_SATS} sats
                </span>
              </>
            )}
          </Button>
          {!hasWallet && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWalletModalOpen(true)}
            >
              <Wallet className="h-4 w-4 mr-1" />
              Connect
            </Button>
          )}
        </div>
        {!authorHasLightning && (
          <p className="text-xs text-center text-muted-foreground">
            Replies disabled - author has no Lightning address
          </p>
        )}
      </form>
      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </>
  );
}

// Comment Item Component - Stacker News Style
function CommentItem({
  comment,
  root,
  getDirectReplies,
  depth = 0
}: {
  comment: NostrEvent;
  root: NostrEvent;
  getDirectReplies: (id: string) => NostrEvent[];
  depth?: number;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const author = useAuthor(comment.pubkey);
  const { webln, activeNWC } = useWallet();
  const { totalSats } = useZaps(comment, webln, activeNWC);

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(comment.pubkey);
  const timeAgo = formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: false });

  const replies = getDirectReplies(comment.id);
  const hasReplies = replies.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 sm:ml-6 pl-4 border-l border-border/50' : ''}`}>
      <div className="flex gap-2 py-3">
        {/* Zap button */}
        <div className="flex flex-col items-center pt-0.5 shrink-0">
          <ZapButton
            target={comment}
            className="text-muted-foreground hover:text-amber-500"
            showCount={false}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Meta line */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mb-1">
            <span className={totalSats > 0 ? 'text-amber-600 font-medium' : ''}>
              {totalSats > 0 ? `${totalSats} sats` : '0 sats'}
            </span>
            <span>\</span>
            <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            <span>\</span>
            <Link
              to={`/${nip19.npubEncode(comment.pubkey)}`}
              className="text-sky-600 hover:underline"
            >
              @{displayName}
            </Link>
            <span>{timeAgo}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover:text-foreground ml-1">
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`nostr:${nip19.noteEncode(comment.id)}`)}>
                  Copy Nostr URI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Collapse button */}
            {hasReplies && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="ml-auto hover:text-foreground"
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Comment content */}
          {!collapsed && (
            <>
              <div className="text-sm mb-2">
                <NoteContent event={comment} className="text-sm" />
              </div>

              {/* Reply button */}
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                reply
              </button>

              {/* Reply form */}
              {showReplyForm && (
                <div className="mt-3">
                  <ZapReplyForm
                    target={root}
                    parent={comment}
                    onSuccess={() => setShowReplyForm(false)}
                  />
                </div>
              )}

              {/* Nested replies */}
              {hasReplies && (
                <div className="mt-2">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      root={root}
                      getDirectReplies={getDirectReplies}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Skeleton className="h-6 w-6 shrink-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-2 py-3">
      <Skeleton className="h-5 w-5 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default ThreadPage;
