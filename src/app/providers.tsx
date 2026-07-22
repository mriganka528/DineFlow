'use client';

import { Toaster } from 'react-hot-toast';
import { SmoothScrollProvider } from '@/components/smooth-scroll-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      {children}
      <Toaster position="top-center" />
    </SmoothScrollProvider>
  );
}
