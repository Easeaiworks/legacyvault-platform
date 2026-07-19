import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { DemoBanner } from '@/components/demo-banner';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LegacyVault — Plan your estate with confidence',
  description:
    'Estate planning that meets you where you live — Canada and the United States. Wills, powers of attorney, beneficiary audits, and everything your family will need to find.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans bg-paper text-ink-900">
        <DemoBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
