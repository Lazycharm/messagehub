import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import '../src/MessageHub/globals.css';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
