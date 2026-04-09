'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,       // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' }
        }}
      />
    </QueryClientProvider>
  )
}
