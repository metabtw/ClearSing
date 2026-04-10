import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { LogOut, FileText, Calendar, ArrowLeft, X, Eye } from 'lucide-react';
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
  fullResult?: any;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);

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
                <div key={analysis.id} className="border border-neutral-200 rounded-xl p-5 hover:border-blue-200 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-neutral-900">{analysis.title}</h3>
                      <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md sm:hidden">
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
                      {analysis.keyDates && analysis.keyDates.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="w-3 h-3" />
                          {analysis.keyDates.length} Tarih
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md hidden sm:block">
                      {new Date(analysis.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto gap-2" onClick={() => setSelectedAnalysis(analysis)}>
                      <Eye className="w-4 h-4" />
                      Görüntüle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Details Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900 truncate pr-4">{selectedAnalysis.title}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAnalysis(null)} className="shrink-0">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-2">Özet</h3>
                <p className="text-neutral-800 text-sm leading-relaxed">{selectedAnalysis.summary}</p>
              </div>

              {selectedAnalysis.fullResult?.risk_flags && selectedAnalysis.fullResult.risk_flags.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Riskler</h3>
                  <div className="space-y-3">
                    {selectedAnalysis.fullResult.risk_flags.map((risk: any, idx: number) => (
                      <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="font-medium text-red-900 text-sm mb-1">{risk.clause_text}</p>
                        <p className="text-red-700 text-sm">{risk.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedAnalysis.risks && selectedAnalysis.risks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Riskler</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedAnalysis.risks.map((risk, idx) => (
                      <li key={idx} className="text-red-700 text-sm">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.keyDates && selectedAnalysis.keyDates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Önemli Tarihler</h3>
                  <div className="space-y-2">
                    {selectedAnalysis.keyDates.map((date, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                        <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-neutral-900 text-sm">{date.event_name}</p>
                          <p className="text-xs text-neutral-500">{date.date_or_timeframe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <Button onClick={() => setSelectedAnalysis(null)}>Kapat</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
