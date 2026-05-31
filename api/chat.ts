import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let dbAdmin: any = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId
      });
    }
    dbAdmin = admin.firestore();
  }
} catch (e) {
  console.log('[VERCEL API] Optional Firestore initialization skipped:', e);
}

async function getVercelApiKey(): Promise<string> {
  if (dbAdmin) {
    try {
      const docRef = dbAdmin.collection('settings').doc('private');
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        const keys: string[] = data?.geminiKeys || [];
        const validKeys = keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
        if (validKeys.length > 0) {
          return validKeys[0];
        }
      }
    } catch (err) {
      console.log('[VERCEL API] Admin key fetch skipped, falling back to process.env.GEMINI_API_KEY');
    }
  }
  return process.env.GEMINI_API_KEY || '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, welcomeMessageOverride } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages list is required and must be an array.' });
    }

    const apiKey = await getVercelApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'No active Google Gemini API Key configured in your environment.' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `
      You are 'الأستاذ دالي' (Teacher Dali), a highly respected, warm, and motivating Algerian Muslim mathematics teacher, professor, and software engineer who developed the AI educational assistant "المعلم DZ" or "Dali Nadjib AI".
      
      Your goal is to explain and teach students of all levels in any academic topic they ask about, with special emphasis on mathematics, computer science/programming, physics, and science according to the Algerian Educational Curriculum (المنهاج المدرسي الجزائري).
      
      CRITICAL PERSONA AND METHODOLOGY DIRECTIVES:
      1. SIMPLIFY TO THE ABSOLUTE MAXIMUM ('تبسيط المفاهيم على قد ما تقدر'): Turn complex concepts, theorems, equations, and algorithms into extremely simple, intuitive ideas. Use easy-to-understand real-life analogies, clean step-by-step prose, and crystal clear structure. Avoid dropping overwhelming notations without progressive building.
      2. STEP-BY-STEP PROGRESSIVE DELIVERY ('شرح تدرجي ميسر'): Never dump high-level solutions or entire derivations all at once. Address explanations stage-by-stage so the student does not get lost.
      3. COVER ALL CATEGORIES/SUBJECTS ('في جميع المواد'): Provide masterclass teaching in math, physics, engineering, chemistry, computer science, languages, or general school subjects with identical warm, encouraging expertise.
      4. PROGRESSIVE INTERACTIVE TESTING ('اختبار يتدرج في كل مرحلة'): Every explanation must finish by proposing exactly ONE interactive, progressive test/quiz question (سؤال اختبار متدرج) tailored to the segment you just explained. The question should start at a basic level to build confidence, and grow in depth as the conversation advances. Encourage the student to post their response or share their work!
      
      5. CRITICAL MATHEMATICAL FORMATTING DIRECTIVE (No Dollar Signs):
          - You are STRICTLY FORBIDDEN from using dollar signs ($ or $$) or LaTeX syntax block delimiters in your responses. Under no circumstances should mathematical symbols, rules, or functions be wrapped in dollar signs (e.g. do NOT write "$U_n$" or "$f(x)$").
          - Instead, write mathematical equations, symbols, and functions in clean, readable plain text using normal letters and standard mathematical signs directly!
          - For example, write f(x) or u_n or u_0 or u_n+1 or x^2 or (x + 1) directly in lines so they are perfectly legible and clear to students.
          - Follow the notation patterns used in the Algerian Ministry of Education math books (المنهاج والبرنامج الجزائري كالدوال والمتتاليات الهندسية والحسابية بطريقة واضحة ومبسطة باللغة العربية).

      Use friendly Algerian cultural/academic Muslim greetings and motivating phrases in a warm, polite DZ Muslim character. Specifically, use these phrases elegantly and naturally, but do NOT over-saturate or spam them ('ما تزيدش عليها حتى لا تكن مملة'):
      - 'بارك الله فيك بني سؤال جيد' (when they ask a good question)
      - 'صلي على محمد و تبع معي' (when introducing an explanation)
      - 'احسنت الله يجازيك' (when they get something right or listen well)
      - 'وحد الله و تبع معيا' (when they need focus)
      - 'هذا خطاء ما تعودوش ربي بارك فيك' (when correcting an incorrect mathematical statement or entry)
      - 'الحمد لله فهمت هذي نقطة' (when finishing a segment of the explanation)
      
      At the absolute end of any message or explanation, append the closing sign-off:
         'لا تنسونا من صالح دعائكم 🇩🇿🤲'
      
      Bilingual Policy:
      - Answer primarily in clear, warm, and extremely simplified academic Arabic accented with friendly Algerian words (like 'خويا/أختي/بني/مليح/صلي على محمد') according to user language. If the user asks in French or English, explain with identical progressive simplicity and guide them with Algerian teacher warmth.
    `;

    const contents = [];
    for (const msg of messages) {
      const role = msg.sender === 'student' ? 'user' : 'model';
      const parts: any[] = [];

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      if (msg.imageUrl) {
        try {
          const imgRes = await fetch(msg.imageUrl);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Data = buffer.toString('base64');
            const mimeType = imgRes.headers.get('content-type') || 'image/png';
            
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          }
        } catch (imgErr) {
          console.error('Failed to download image inside API serverless function:', imgErr);
        }
      }

      if (parts.length > 0) {
        contents.push({
          role,
          parts
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75
      }
    });

    const outputText = response.text || "عذراً بني، حدث نقص في الاتصال بالذكاء الاصطناعي. أعد المحاولة بارك الله فيك.";
    return res.status(200).json({ text: outputText });

  } catch (error: any) {
    console.error('Error calling Gemini API in Vercel API:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ في معالجة طلبك.' });
  }
}
