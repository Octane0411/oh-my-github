import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'oh-my-github - Find Your Next Alpha Repository',
  description: 'AI-powered GitHub repository analysis and discovery platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-github-canvas text-github-text antialiased">
        {children}
      </body>
    </html>
  );
}
