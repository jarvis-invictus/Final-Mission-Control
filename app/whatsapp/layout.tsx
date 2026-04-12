import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'WhatsApp | Invictus MC' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
