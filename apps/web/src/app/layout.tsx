import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { DemoBanner } from '@/components/demo-banner';

export const metadata: Metadata = {
  title: 'LegacyVault — Plan your estate with confidence',
  description:
    'Securely document your assets, beneficiaries, and wishes. Give the people you love clarity when they need it most.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <DemoBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
