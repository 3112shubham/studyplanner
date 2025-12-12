import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';
import { PlanProvider } from '@/lib/context/PlanContext';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Common/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'GATE CS Study Planner',
  description: 'Personalized 35-day GATE CS study plan with progress tracking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PlanProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#fff',
                  color: '#000',
                },
              }}
            />
            <div className="bg-white">
              <Navbar />
              <main className="pt-16">
                {children}
              </main>
            </div>
          </PlanProvider>
        </AuthProvider>
      </body>
    </html>
  );
}