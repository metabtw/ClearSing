import React, { useState, useRef } from "react";
import { analyzeContract, ContractAnalysis, chatWithContract, compareContracts, ComparisonAnalysis } from "./services/geminiService";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Switch } from "./components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Input } from "./components/ui/input";
import { AlertTriangle, CheckCircle2, FileText, Info, Printer, Scale, ShieldAlert, ShieldCheck, ShieldQuestion, UploadCloud, X, Calendar as CalendarIcon, MessageSquare, ArrowRightLeft, Lock, Globe, Copy, Send } from "lucide-react";

export default function App() {
  // Main State
  const [appMode, setAppMode] = useState<"analyze" | "compare">("analyze");
  
  // Analyze Mode State
  const [contractText, setContractText] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  
  // Compare Mode State
  const [oldContractText, setOldContractText] = useState("");
  const [newContractText, setNewContractText] = useState("");
  const [comparison, setComparison] = useState<ComparisonAnalysis | null>(null);

  // Shared State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [privacyMode, setPrivacyMode] = useState(false);
  const [language, setLanguage] = useState("Türkçe");

  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: "user" | "model", text: string}[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const anonymizeText = (text: string) => {
    if (!privacyMode) return text;
    let masked = text;
    // TC Kimlik (11 digits)
    masked = masked.replace(/\b[1-9][0-9]{10}\b/g, "[GİZLENMİŞ_TC_NO]");
    // Emails
    masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[GİZLENMİŞ_EPOSTA]");
    // Phone numbers (Turkish formats)
    masked = masked.replace(/(?:\+90|0)?\s*[5]\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g, "[GİZLENMİŞ_TELEFON]");
    // IBAN
    masked = masked.replace(/TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/g, "[GİZLENMİŞ_IBAN]");
    return masked;
  };

  const handleAnalyze = async () => {
    if (inputMode === "text" && !contractText.trim()) return;
    if (inputMode === "file" && !contractFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setChatHistory([]);
    try {
      let input: string | File;
      if (inputMode === "text") {
        input = anonymizeText(contractText);
      } else {
        // For files, we can't easily anonymize on frontend without OCR first. 
        // We will pass the file directly, but warn the user if privacy mode is on.
        if (privacyMode) {
          console.warn("Privacy mode is on, but file anonymization is not supported on frontend. Sending file as is.");
        }
        input = contractFile!;
      }
      
      const result = await analyzeContract(input, language);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("An error occurred while analyzing the contract. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = async () => {
    if (!oldContractText.trim() || !newContractText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const oldText = anonymizeText(oldContractText);
      const newText = anonymizeText(newContractText);
      const result = await compareContracts(oldText, newText, language);
      setComparison(result);
    } catch (err) {
      console.error(err);
      setError("An error occurred while comparing the contracts. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !analysis) return;

    const userMsg = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setIsChatting(true);

    try {
      const contractContent = inputMode === "text" ? contractText : "Dosya içeriği analiz edildi."; // Simplified for file
      const response = await chatWithContract(contractContent, chatHistory, userMsg, language);
      setChatHistory(prev => [...prev, { role: "model", text: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: "model", text: "Özür dilerim, bir hata oluştu." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setContractFile(file);
      } else {
        setError("Lütfen sadece PDF veya resim (JPG, PNG) dosyası yükleyin.");
      }
    }
  };

  const clearFile = () => {
    setContractFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const createCalendarLink = (eventName: string, description: string) => {
    const text = encodeURIComponent(eventName);
    const details = encodeURIComponent(description);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}`;
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "sign": return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case "negotiate": return <ShieldQuestion className="w-8 h-8 text-orange-500" />;
      case "dont_sign": return <ShieldAlert className="w-8 h-8 text-red-500" />;
      default: return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case "sign": return language === "Türkçe" ? "İmzala" : "Sign";
      case "negotiate": return language === "Türkçe" ? "Müzakere Et" : "Negotiate";
      case "dont_sign": return language === "Türkçe" ? "İmzalama" : "Don't Sign";
      default: return rec;
    }
  };

  // Helper to render text with tooltips for complex terms
  const renderTextWithTooltips = (text: string, terms: {term: string, explanation: string}[]) => {
    if (!terms || terms.length === 0) return text;
    
    // This is a simplified approach. In a real app, we'd use a more robust parser.
    let parts = [{ text, isTerm: false, explanation: "" }];
    
    terms.forEach(({ term, explanation }) => {
      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.isTerm) {
          newParts.push(part);
          return;
        }
        
        // Case insensitive split
        const regex = new RegExp(`(${term})`, 'gi');
        const splitText = part.text.split(regex);
        
        splitText.forEach(segment => {
          if (segment.toLowerCase() === term.toLowerCase()) {
            newParts.push({ text: segment, isTerm: true, explanation });
          } else if (segment) {
            newParts.push({ text: segment, isTerm: false, explanation: "" });
          }
        });
      });
      parts = newParts;
    });

    return (
      <TooltipProvider>
        {parts.map((part, i) => 
          part.isTerm ? (
            <Tooltip key={i}>
              <TooltipTrigger className="underline decoration-dashed decoration-blue-400 underline-offset-4 cursor-help text-blue-800 font-medium">
                {part.text}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <p className="text-sm font-semibold mb-1">{part.text}</p>
                <p className="text-xs text-neutral-200">{part.explanation}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </TooltipProvider>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 no-print">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold tracking-tight">ClearSign AI</h1>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Tabs value={appMode} onValueChange={(v) => setAppMode(v as "analyze" | "compare")} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analyze">Analiz</TabsTrigger>
              <TabsTrigger value="compare">Karşılaştır</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 print-container">
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center gap-6 mb-6 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm no-print">
          <div className="flex items-center gap-2">
            <Switch id="privacy-mode" checked={privacyMode} onCheckedChange={setPrivacyMode} />
            <label htmlFor="privacy-mode" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
              <Lock className="w-4 h-4 text-neutral-500" />
              Gizlilik Modu <span className="text-neutral-400 text-xs hidden sm:inline">(TC, E-posta, Telefon gizle)</span>
            </label>
          </div>
          
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium">Çıktı Dili:</span>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Dil Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Türkçe">Türkçe</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Deutsch">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start print:block">
          
          {/* Left Column: Input Area */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 no-print">
            
            {appMode === "analyze" ? (
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight mb-1">Sözleşme Analizi</h2>
                  <p className="text-neutral-500 text-sm">
                    Sözleşme metnini yapıştırın veya dosya olarak yükleyin. Yapay zeka sizin için riskleri özetleyecektir.
                  </p>
                </div>
                
                <div className="flex flex-col relative">
                  <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "file")} className="flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="text" className="text-xs sm:text-sm">Metin Yapıştır</TabsTrigger>
                      <TabsTrigger value="file" className="text-xs sm:text-sm">
                        <span className="sm:hidden">Dosya Yükle</span>
                        <span className="hidden sm:inline">Dosya Yükle (PDF/Resim)</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="text" className="mt-0">
                      <Textarea 
                        placeholder="Sözleşme metnini buraya yapıştırın..." 
                        className="w-full min-h-[300px] lg:min-h-[450px] resize-y p-4 text-base font-mono bg-white border-neutral-200 focus-visible:ring-blue-500 shadow-sm"
                        value={contractText}
                        onChange={(e) => setContractText(e.target.value)}
                        disabled={isAnalyzing}
                      />
                    </TabsContent>
                    
                    <TabsContent value="file" className="mt-0">
                      <div className={`w-full min-h-[300px] lg:min-h-[450px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 bg-white transition-colors ${contractFile ? 'border-blue-400 bg-blue-50/50' : 'border-neutral-200 hover:border-blue-300'}`}>
                        {contractFile ? (
                          <div className="flex flex-col items-center text-center">
                            <FileText className="w-12 h-12 text-blue-500 mb-3" />
                            <p className="font-medium text-neutral-900 mb-1">{contractFile.name}</p>
                            <p className="text-sm text-neutral-500 mb-4">{(contractFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            <Button variant="outline" size="sm" onClick={clearFile} disabled={isAnalyzing}>
                              <X className="w-4 h-4 mr-2" />
                              Dosyayı Kaldır
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <UploadCloud className="w-12 h-12 text-neutral-400 mb-3" />
                            <p className="font-medium text-neutral-900 mb-1">Dosya Yüklemek İçin Tıklayın</p>
                            <p className="text-sm text-neutral-500 mb-4">PDF, JPG veya PNG (Maks. 10MB)</p>
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
                              Dosya Seç
                            </Button>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".pdf,image/jpeg,image/png" 
                          onChange={handleFileChange}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Button 
                  size="lg" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (inputMode === "text" ? !contractText.trim() : !contractFile)}
                >
                  {isAnalyzing ? "Analiz Ediliyor..." : "Sözleşmeyi Analiz Et"}
                </Button>
              </>
            ) : (
              // Compare Mode Input
              <>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight mb-1">Sözleşme Karşılaştırma</h2>
                  <p className="text-neutral-500 text-sm">
                    Eski ve yeni sözleşme metinlerini yapıştırın. Nelerin değiştiğini görelim.
                  </p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Eski Versiyon</label>
                    <Textarea 
                      placeholder="Eski sözleşme metnini buraya yapıştırın..." 
                      className="w-full min-h-[150px] lg:min-h-[200px] resize-y p-4 text-sm font-mono bg-white border-neutral-200 focus-visible:ring-blue-500 shadow-sm"
                      value={oldContractText}
                      onChange={(e) => setOldContractText(e.target.value)}
                      disabled={isAnalyzing}
                    />
                  </div>
                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-white border border-neutral-200 rounded-full p-2 shadow-sm">
                      <ArrowRightLeft className="w-4 h-4 text-neutral-400 rotate-90" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Yeni Versiyon</label>
                    <Textarea 
                      placeholder="Yeni sözleşme metnini buraya yapıştırın..." 
                      className="w-full min-h-[150px] lg:min-h-[200px] resize-y p-4 text-sm font-mono bg-white border-neutral-200 focus-visible:ring-blue-500 shadow-sm"
                      value={newContractText}
                      onChange={(e) => setNewContractText(e.target.value)}
                      disabled={isAnalyzing}
                    />
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  onClick={handleCompare}
                  disabled={isAnalyzing || !oldContractText.trim() || !newContractText.trim()}
                >
                  {isAnalyzing ? "Karşılaştırılıyor..." : "Değişiklikleri Bul"}
                </Button>
              </>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm flex items-start gap-2 border border-red-100">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col print-container print:border-none print:shadow-none">
            
            {/* Empty State */}
            {!analysis && !comparison && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center text-neutral-400 p-8 text-center no-print min-h-[400px]">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-neutral-600 mb-2">Sonuçlar Burada Görünecek</p>
                <p className="text-sm max-w-sm">
                  İşlemi başlattığınızda, yapay zeka analizleri bu alanda gösterilecektir.
                </p>
              </div>
            )}

            {/* Loading State */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center p-8 text-center no-print min-h-[400px]">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-medium mb-2">İnceleniyor...</h3>
                <p className="text-neutral-500 text-sm max-w-sm">
                  Yapay zeka avukatınız metinleri okuyor, riskleri değerlendiriyor...
                </p>
              </div>
            )}

            {/* Analysis Results */}
            {appMode === "analyze" && analysis && !isAnalyzing && (
              <div className="flex-1 print:overflow-visible">
                <div className="p-6 md:p-8 flex flex-col gap-8">
                  
                  {/* Header & Recommendation */}
                  <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 uppercase tracking-wider text-xs font-semibold text-blue-600 border-blue-200 bg-blue-50">
                        {analysis.document_type}
                      </Badge>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analiz Raporu</h2>
                    </div>
                    
                    <div className="flex items-stretch gap-3 w-full xl:w-auto">
                      <div className="flex-1 flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                        <div className="shrink-0">{getRecommendationIcon(analysis.recommendation)}</div>
                        <div>
                          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Tavsiye</p>
                          <p className="text-sm sm:text-base font-bold leading-tight">{getRecommendationText(analysis.recommendation)}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={handlePrint} className="no-print shrink-0 h-auto px-4">
                        <Printer className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Yazdır / PDF</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-neutral-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100/50 print-break-inside-avoid">
                    {analysis.recommendation_reason}
                  </p>

                  <Separator />

                  {/* Worry Score & Benchmark */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          Avukat Endişe Skoru
                        </h3>
                        <span className="text-2xl font-bold">{analysis.lawyer_worry_score}/10</span>
                      </div>
                      <Progress 
                        value={analysis.lawyer_worry_score * 10} 
                        className="h-3"
                        indicatorClassName={
                          analysis.lawyer_worry_score > 7 ? "bg-red-500" : 
                          analysis.lawyer_worry_score > 4 ? "bg-orange-500" : "bg-green-500"
                        }
                      />
                      <p className="text-sm text-neutral-500 mt-2">
                        10 en riskli durumu ifade eder.
                      </p>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                      <h3 className="text-sm font-semibold mb-1 text-neutral-700">Piyasa Standartları (Benchmark)</h3>
                      <p className="text-sm text-neutral-600 leading-relaxed">
                        {analysis.market_standard_analysis}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="print-break-inside-avoid">
                    <h3 className="text-lg font-semibold mb-4">Özet (Sizin İçin Ne Anlama Geliyor?)</h3>
                    <ul className="space-y-3">
                      {analysis.summary_bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-neutral-700 leading-relaxed">
                            {renderTextWithTooltips(bullet, analysis.complex_terms)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Dates */}
                  {analysis.key_dates && analysis.key_dates.length > 0 && (
                    <>
                      <Separator />
                      <div className="print-break-inside-avoid">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5 text-blue-500" />
                          Önemli Tarihler ve Süreler
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {analysis.key_dates.map((date, idx) => (
                            <div key={idx} className="border border-neutral-200 p-4 rounded-lg bg-white shadow-sm flex flex-col justify-between">
                              <div>
                                <h4 className="font-semibold text-neutral-900">{date.event_name}</h4>
                                <p className="text-blue-600 font-medium text-sm mb-2">{date.date_or_timeframe}</p>
                                <p className="text-sm text-neutral-600 mb-4">{date.description}</p>
                              </div>
                              <Button variant="secondary" size="sm" className="w-full no-print" asChild>
                                <a href={createCalendarLink(date.event_name, date.description)} target="_blank" rel="noreferrer">
                                  Takvime Ekle
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Risk Flags */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Riskli Maddeler ({analysis.risk_flags.length})
                    </h3>
                    
                    {analysis.risk_flags.length === 0 ? (
                      <p className="text-neutral-500 italic">Önemli bir risk tespit edilmedi.</p>
                    ) : (
                      <div className="w-full space-y-4">
                        {analysis.risk_flags.map((flag, idx) => (
                          <div key={idx} className="border border-neutral-200 rounded-lg overflow-hidden print-break-inside-avoid">
                            <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center gap-3">
                              <Badge 
                                variant={getRiskBadgeVariant(flag.risk_level)}
                                className={flag.risk_level === "medium" ? "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200" : ""}
                              >
                                {flag.risk_level.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{flag.clause_type.replace("_", " ").toUpperCase()}</span>
                            </div>
                            <div className="p-4 space-y-4">
                              <div className="bg-neutral-50 p-4 rounded-md border border-neutral-100 font-mono text-sm text-neutral-600">
                                "{flag.clause_text}"
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-neutral-900 mb-1">Ne Anlama Geliyor?</h4>
                                <p className="leading-relaxed text-neutral-700">
                                  {renderTextWithTooltips(flag.plain_explanation, analysis.complex_terms)}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                  <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2 text-sm">
                                    <ShieldQuestion className="w-4 h-4" />
                                    Karşı Tarafa Sorun:
                                  </h4>
                                  <p className="text-blue-800 italic text-sm">"{flag.suggested_question}"</p>
                                </div>

                                {flag.negotiation_draft && (
                                  <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 relative group">
                                    <h4 className="font-semibold text-indigo-900 mb-1 flex items-center gap-2 text-sm">
                                      <MessageSquare className="w-4 h-4" />
                                      Müzakere Taslağı:
                                    </h4>
                                    <p className="text-indigo-800 text-sm">"{flag.negotiation_draft}"</p>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                      onClick={() => copyToClipboard(flag.negotiation_draft)}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chat Section */}
                  <div className="mt-8 border border-neutral-200 rounded-xl overflow-hidden no-print">
                    <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold">Sözleşme ile Sohbet Et</h3>
                    </div>
                    <div className="p-4 bg-white h-[300px] overflow-y-auto flex flex-col gap-4">
                      {chatHistory.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm text-center">
                          Sözleşme hakkında aklınıza takılan spesifik bir soru var mı? <br/> Örn: "Depozitomu hangi durumlarda kesebilir?"
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-neutral-100 text-neutral-800 rounded-bl-none"}`}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                      {isChatting && (
                        <div className="flex justify-start">
                          <div className="bg-neutral-100 p-3 rounded-lg rounded-bl-none flex gap-1">
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleChat} className="p-3 bg-neutral-50 border-t border-neutral-200 flex gap-2">
                      <Input 
                        placeholder="Sözleşmeye soru sorun..." 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        disabled={isChatting}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isChatting || !chatMessage.trim()} size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>

                </div>
              </div>
            )}

            {/* Comparison Results */}
            {appMode === "compare" && comparison && !isAnalyzing && (
              <div className="flex-1 print:overflow-visible">
                <div className="p-6 md:p-8 flex flex-col gap-8">
                  
                  <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 uppercase tracking-wider text-xs font-semibold text-indigo-600 border-indigo-200 bg-indigo-50">
                        Versiyon Karşılaştırması
                      </Badge>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Değişiklik Raporu</h2>
                    </div>
                    <Button variant="outline" onClick={handlePrint} className="no-print shrink-0 h-auto px-4">
                      <Printer className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Yazdır / PDF</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50">
                      <h3 className="text-sm font-semibold mb-2 text-indigo-900">Genel Özet</h3>
                      <p className="text-sm text-indigo-800 leading-relaxed">{comparison.summary}</p>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 flex flex-col justify-center">
                      <h3 className="text-sm font-semibold mb-2 text-neutral-700">Risk Yönü</h3>
                      <div className="flex items-center gap-3">
                        {comparison.overall_risk_shift === "worse" && <ShieldAlert className="w-8 h-8 text-red-500" />}
                        {comparison.overall_risk_shift === "better" && <ShieldCheck className="w-8 h-8 text-green-500" />}
                        {comparison.overall_risk_shift === "neutral" && <Info className="w-8 h-8 text-blue-500" />}
                        <span className="font-medium text-lg">
                          {comparison.overall_risk_shift === "worse" ? "Sizin Aleyhinize" : 
                           comparison.overall_risk_shift === "better" ? "Sizin Lehinize" : "Değişiklik Yok / Nötr"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tespit Edilen Değişiklikler ({comparison.changes.length})</h3>
                    <div className="space-y-4">
                      {comparison.changes.map((change, idx) => (
                        <div key={idx} className="border border-neutral-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant={
                              change.type === "added" ? "default" : 
                              change.type === "removed" ? "destructive" : "secondary"
                            } className={change.type === "added" ? "bg-green-500 hover:bg-green-600" : ""}>
                              {change.type === "added" ? "EKLENDİ" : 
                               change.type === "removed" ? "ÇIKARILDI" : "DEĞİŞTİRİLDİ"}
                            </Badge>
                            <Badge variant="outline" className={
                              change.risk_level === "high" ? "border-red-200 text-red-700 bg-red-50" :
                              change.risk_level === "medium" ? "border-orange-200 text-orange-700 bg-orange-50" :
                              "border-green-200 text-green-700 bg-green-50"
                            }>
                              Risk: {change.risk_level.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="font-medium text-neutral-900 mb-2">{change.description}</p>
                          <div className="bg-neutral-50 p-3 rounded text-sm text-neutral-700 border border-neutral-100">
                            <strong>Etkisi:</strong> {change.implication}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-sm font-semibold mb-1 text-blue-900">Sonuç Tavsiyesi</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">{comparison.recommendation}</p>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
