import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import AccountPage from './components/AccountPage';
import { useAuth } from './contexts/AuthContext';
import { Scale, User } from 'lucide-react';
import { Button } from './components/ui/button';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 no-print">
        <Link to="/" className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold tracking-tight">ClearSign AI</h1>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/account">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                Hesabım
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-2">
                Giriş Yap
              </Button>
            </Link>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
    </div>
  );
}
