import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anivertis V51',
  description: 'Inteligência de Mercado para Reciclagem Animal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">{children}</body>
    </html>
  );
}
