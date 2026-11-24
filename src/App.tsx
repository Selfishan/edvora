import './App.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/study" element={<Index />} />
          <Route path="/pyqs" element={<Index />} />
          <Route path="/focus" element={<Index />} />
          <Route path="/revision" element={<Index />} />
          <Route path="/bookmarks" element={<Index />} />
          <Route path="/planner" element={<Index />} />
          <Route path="/notebook" element={<Index />} />
          <Route path="/search" element={<Index />} />
          <Route path="/profile" element={<Index />} />
          <Route path="/admin" element={<Index />} />
          <Route path="/auth/callback" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
