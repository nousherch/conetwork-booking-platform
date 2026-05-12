import { AuthProvider } from '../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import '../styles/globals.css';
import { Analytics } from "@vercel/analytics/next";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#0f172a" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '13px',
            fontFamily: 'Mont, Montserrat, system-ui, sans-serif',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0f172a' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0f172a' },
          },
        }}
      />
    </AuthProvider>
  );
}