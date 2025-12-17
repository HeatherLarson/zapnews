import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import ThreadPage from "./pages/ThreadPage";
import ProfilePage from "./pages/ProfilePage";
import TagPage from "./pages/TagPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Router component to handle NIP-19 identifiers dynamically
function NIP19Router() {
  const { nip19 } = useParams<{ nip19: string }>();

  if (!nip19) return <NotFound />;

  // Route based on prefix
  if (nip19.startsWith('note1') || nip19.startsWith('nevent1')) {
    return <ThreadPage />;
  }
  if (nip19.startsWith('npub1') || nip19.startsWith('nprofile1')) {
    return <ProfilePage />;
  }

  return <NotFound />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/t/:tag" element={<TagPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Catch-all for NIP-19 identifiers */}
        <Route path="/:nip19" element={<NIP19Router />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
