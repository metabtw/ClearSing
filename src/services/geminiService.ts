import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getSystemInstruction = (language: string) => `Sen, hukuki terimleri teknik olmayan kişilere (son kullanıcı) açıklama konusunda uzman, kıdemli bir avukatsın. Görevin, sana verilen sözleşmeyi analiz etmek ve kullanıcının anlayabileceği bir dilde raporlamaktır.
Tüm yanıtlarını ${language} dilinde vermelisin.

# ANALİZ KURALLARI
1. ÖNCE KONTROL ET: Verilen metin veya dosya içeriği gerçekten bir sözleşme, anlaşma, kullanım koşulu veya hukuki bir belge mi? Eğer rastgele kelimeler, şarkı sözleri, yemek tarifi, günlük konuşma veya alakasız bir metinse "is_valid_contract" değerini false yap ve "error_message" kısmına "Lütfen geçerli bir sözleşme veya hukuki metin giriniz." yaz. Diğer alanları boş bırakabilirsin.
2. ASLA sadece genel geçer cümleler kurma. Sözleşmedeki spesifik maddelere atıfta bulun.
3. "Lawyer Worry Score" belirlerken; belirsiz iade şartları, tek taraflı fesih hakları veya aşırı cezai şartlar varsa puanı yükselt (10 en riskli).
4. Hukuki jargon kullandığında, hemen parantez içinde veya açıklama kısmında tanımını yap.
5. JSON çıktısı dışında hiçbir açıklama metni ekleme.`;

export interface RiskFlag {
  clause_text: string;
  clause_type: "auto_renew" | "ip_assignment" | "non_compete" | "liability" | "penalty" | "amendment" | "other";
  plain_explanation: string;
  risk_level: "low" | "medium" | "high";
  suggested_question: string;
  negotiation_draft: string;
}

export interface KeyDate {
  event_name: string;
  date_or_timeframe: string;
  description: string;
}

export interface ComplexTerm {
  term: string;
  explanation: string;
}

export interface ContractAnalysis {
  is_valid_contract: boolean;
  error_message: string;
  document_type: string;
  summary_bullets: string[];
  lawyer_worry_score: number;
  recommendation: "sign" | "negotiate" | "dont_sign";
  recommendation_reason: string;
  market_standard_analysis: string;
  risk_flags: RiskFlag[];
  key_dates: KeyDate[];
  complex_terms: ComplexTerm[];
}

export interface ComparisonAnalysis {
  is_valid_contract: boolean;
  error_message: string;
  summary: string;
  changes: {
    type: "added" | "removed" | "modified";
    description: string;
    risk_level: "high" | "medium" | "low";
    implication: string;
  }[];
  overall_risk_shift: "worse" | "better" | "neutral";
  recommendation: string;
}

export async function analyzeContract(input: string | File, language: string = "Türkçe"): Promise<ContractAnalysis> {
  let contents: any;

  if (typeof input === "string") {
    contents = input;
  } else {
    // Convert File to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });

    contents = {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: input.type,
          },
        },
        {
          text: `Lütfen ekteki sözleşmeyi analiz et. Yanıt dili: ${language}`,
        }
      ],
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: contents,
    config: {
      systemInstruction: getSystemInstruction(language),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_valid_contract: {
            type: Type.BOOLEAN,
            description: "Verilen metin geçerli bir sözleşme veya hukuki belge mi?",
          },
          error_message: {
            type: Type.STRING,
            description: "Eğer is_valid_contract false ise gösterilecek hata mesajı.",
          },
          document_type: {
            type: Type.STRING,
            description: "Tespit edilen belge türü (örn: Kira Sözleşmesi, İş Sözleşmesi)",
          },
          summary_bullets: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
            description: "Maddeler 25 kelimeyi geçmemeli, anlaşılır olmalı",
          },
          lawyer_worry_score: {
            type: Type.INTEGER,
            description: "1-10 arası tam sayı",
          },
          recommendation: {
            type: Type.STRING,
            description: "sign | negotiate | dont_sign",
          },
          recommendation_reason: {
            type: Type.STRING,
            description: "Neden bu tavsiyeyi verdiğinin kısa özeti",
          },
          market_standard_analysis: {
            type: Type.STRING,
            description: "Bu sözleşmenin piyasa standartlarına uygun olup olmadığının analizi.",
          },
          risk_flags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clause_text: {
                  type: Type.STRING,
                  description: "Sözleşmedeki orijinal metin",
                },
                clause_type: {
                  type: Type.STRING,
                  description: "auto_renew | ip_assignment | non_compete | liability | penalty | amendment | other",
                },
                plain_explanation: {
                  type: Type.STRING,
                  description: "Bu madde kullanıcı için ne anlama geliyor?",
                },
                risk_level: {
                  type: Type.STRING,
                  description: "low | medium | high",
                },
                suggested_question: {
                  type: Type.STRING,
                  description: "Kullanıcının karşı tarafa sorması gereken soru",
                },
                negotiation_draft: {
                  type: Type.STRING,
                  description: "Kullanıcının karşı tarafa gönderebileceği, profesyonelce yazılmış itiraz veya revize mesajı taslağı",
                },
              },
              required: ["clause_text", "clause_type", "plain_explanation", "risk_level", "suggested_question", "negotiation_draft"],
            },
          },
          key_dates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                event_name: { type: Type.STRING },
                date_or_timeframe: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["event_name", "date_or_timeframe", "description"],
            },
            description: "Sözleşmedeki önemli tarihler veya süreler (fesih süresi, ödeme tarihi vb.)",
          },
          complex_terms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["term", "explanation"],
            },
            description: "Sözleşmede geçen karmaşık hukuki terimler ve basit açıklamaları",
          },
        },
        required: [
          "is_valid_contract",
          "error_message",
          "document_type",
          "summary_bullets",
          "lawyer_worry_score",
          "recommendation",
          "recommendation_reason",
          "market_standard_analysis",
          "risk_flags",
          "key_dates",
          "complex_terms"
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text returned from Gemini");
  }

  return JSON.parse(text) as ContractAnalysis;
}

export async function compareContracts(oldContract: string, newContract: string, language: string = "Türkçe"): Promise<ComparisonAnalysis> {
  const prompt = `
    Aşağıdaki iki sözleşme versiyonunu karşılaştır.
    ÖNCE KONTROL ET: Verilen metinler gerçekten sözleşme, anlaşma veya hukuki belge mi? Eğer alakasız metinlerse "is_valid_contract" değerini false yap ve "error_message" kısmına "Lütfen karşılaştırmak için geçerli sözleşme metinleri giriniz." yaz.
    YENİ versiyonda ESKİ versiyona göre nelerin eklendiğini, çıkarıldığını veya değiştirildiğini tespit et.
    Özellikle kullanıcı aleyhine olan değişikliklere (gizli maddeler, artan sorumluluklar, azalan haklar) dikkat et.
    Yanıtını ${language} dilinde ver.

    ESKİ SÖZLEŞME:
    ${oldContract}

    ---

    YENİ SÖZLEŞME:
    ${newContract}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction: "Sen uzman bir sözleşme avukatısın. İki sözleşmeyi karşılaştır ve JSON formatında analiz et.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_valid_contract: { type: Type.BOOLEAN },
          error_message: { type: Type.STRING },
          summary: { type: Type.STRING },
          changes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "added | removed | modified" },
                description: { type: Type.STRING },
                risk_level: { type: Type.STRING, description: "high | medium | low" },
                implication: { type: Type.STRING },
              },
              required: ["type", "description", "risk_level", "implication"],
            },
          },
          overall_risk_shift: { type: Type.STRING, description: "worse | better | neutral" },
          recommendation: { type: Type.STRING },
        },
        required: ["is_valid_contract", "error_message", "summary", "changes", "overall_risk_shift", "recommendation"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as ComparisonAnalysis;
}

export async function chatWithContract(contractText: string, chatHistory: {role: "user" | "model", text: string}[], message: string, language: string = "Türkçe"): Promise<string> {
  const conversationContext = chatHistory.map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.text}`).join('\n');
  
  const prompt = `
    SÖZLEŞME METNİ:
    ${contractText}

    SOHBET GEÇMİŞİ:
    ${conversationContext}

    KULLANICININ YENİ SORUSU:
    ${message}

    Kullanıcının sorusunu SADECE yukarıdaki sözleşme metnine dayanarak cevapla. Yanıt dili: ${language}.
    Eğer sözleşmede cevap yoksa, "Sözleşmede bu konuyla ilgili bir madde bulunmamaktadır." de.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "Sen sözleşmeler hakkında soruları yanıtlayan yardımcı bir hukuki asistansın.",
    }
  });

  return response.text || "Bir hata oluştu.";
}
