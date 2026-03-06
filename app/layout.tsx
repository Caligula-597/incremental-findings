import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Incremental Findings',
  description: 'Independent archive for incremental and overlooked research contributions.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
