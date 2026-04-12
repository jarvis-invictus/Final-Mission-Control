import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'GitHub | Invictus MC' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
