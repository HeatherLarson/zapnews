import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoginArea } from '@/components/auth/LoginArea';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { RelayPicker } from '@/components/RelayPicker';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Zap,
  Search,
  Plus,
  Menu,
  Sun,
  Moon,
  TrendingUp,
  Clock,
  Settings,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-4xl mx-auto">
        <div className="flex h-14 items-center gap-4 px-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity shrink-0"
          >
            <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Zap News
            </span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50"
              />
            </div>
          </form>

          {/* Spacer */}
          <div className="flex-1 md:hidden" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/?sort=hot">
              <Button
                variant={location.search.includes('sort=hot') || (!location.search.includes('sort=') && location.pathname === '/') ? 'secondary' : 'ghost'}
                size="sm"
              >
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Hot
              </Button>
            </Link>
            <Link to="/?sort=recent">
              <Button
                variant={location.search.includes('sort=recent') ? 'secondary' : 'ghost'}
                size="sm"
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Recent
              </Button>
            </Link>
            <Link to="/?sort=top">
              <Button
                variant={location.search.includes('sort=top') ? 'secondary' : 'ghost'}
                size="sm"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                Top
              </Button>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Relay Picker */}
            <RelayPicker />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Create Post Button */}
            {user && (
              <CreatePostDialog>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Post</span>
                </Button>
              </CreatePostDialog>
            )}

            {/* Login Area */}
            <LoginArea className="max-w-40" />

            {/* Mobile Menu */}
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/?sort=hot" className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Hot
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/?sort=recent" className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/?sort=top" className="flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Top
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Wifi className="h-4 w-4 mr-2" />
                    Relays
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
