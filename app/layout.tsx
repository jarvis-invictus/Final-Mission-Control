import type { Metadata } from 'next';
import './globals.css';
import CommandSearchWrapper from '@/components/search/CommandSearchWrapper';

export const metadata: Metadata = {
  title: 'Invictus Mission Control',
  description: 'Unified command center for Invictus AI operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <CommandSearchWrapper />
      </body>
    </html>
  );
}
