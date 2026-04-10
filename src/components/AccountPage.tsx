import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { LogOut, FileText, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Analysis {
  id: string;
  title: string;
  summary: string;
  risks: string[];
  obligations: string[];
  keyDates: { date_or_timeframe: string; event_name: string; description: string }[];
  createdAt: string;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Analysis[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Analysis);
      });
      // Sort client-side since we don't have a composite index for userId + createdAt yet
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnalyses(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'analyses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Hesabım</h1>
              <p className="text-neutral-500 text-sm">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Geçmiş Analizlerim
          </h2>

          {loading ? (
            <div className="text-center py-8 text-neutral-500">Yükleniyor...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-600">Henüz kaydedilmiş bir analiziniz bulunmuyor.</p>
              <Button variant="link" onClick={() => navigate('/')} className="mt-2">
                Yeni bir sözleşme analiz et
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="border border-neutral-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-neutral-900">{analysis.title}</h3>
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md">
                      {new Date(analysis.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-sm mb-4 line-clamp-2">{analysis.summary}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {analysis.risks && analysis.risks.length > 0 && (
                      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                        {analysis.risks.length} Risk
                      </Badge>
                    )}
                    {analysis.obligations && analysis.obligations.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                        {analysis.obligations.length} Yükümlülük
                      </Badge>
                    )}
                    {analysis.keyDates && analysis.keyDates.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {analysis.keyDates.length} Tarih
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
