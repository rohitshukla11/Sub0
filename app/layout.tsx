import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { MemoryProvider } from '@/components/providers/MemoryProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Amigo.ai - Your AI Friend',
  description: 'Your friendly AI companion that helps you manage your schedule, stay productive, and make life easier every day.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <MemoryProvider>
            <div className="min-h-screen bg-white">
              {children}
            </div>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '8px 8px 16px rgba(59, 130, 246, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.9), 0 0 20px rgba(16, 185, 129, 0.15)',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '12px 18px',
                },
              }}
            />
          </MemoryProvider>
        </WalletProvider>
      </body>
    </html>
  )
}



