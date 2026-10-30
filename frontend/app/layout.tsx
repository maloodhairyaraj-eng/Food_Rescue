import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';

// Load Design System Fonts
const bricolage = Bricolage_Grotesque({ 
  subsets: ['latin'], 
  variable: '--font-bricolage' 
});

const dmSans = DM_Sans({ 
  subsets: ['latin'], 
  variable: '--font-dm-sans' 
});

export const metadata: Metadata = {
  title: 'ZeroWaste | Food Rescue Platform',
  description: 'Connecting surplus food from donors directly to NGOs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${dmSans.variable} font-body bg-ivory text-charcoal`}>
        {children}
      </body>
    </html>
  );
}