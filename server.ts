import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';

dotenv.config();

// Initialize firebase admin using our configuration file
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
);
import { getFirestore } from 'firebase-admin/firestore';

let appInstance;
let dbAdmin: any = null;

if (!admin.apps.length) {
  try {
    appInstance = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
    console.log('Firebase Admin initialized for project:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('Firebase Admin init warning (this is normal when running outside of GCP e.g. on Vercel):', error);
  }
} else {
  appInstance = admin.apps[0];
}

// Use specified database ID from config to avoid the "5 NOT_FOUND: Database not found" error on custom databases
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
if (appInstance) {
  try {
    dbAdmin = getFirestore(appInstance, databaseId);
  } catch (error) {
    console.warn('Failed to initialize Firestore Admin instance safely:', error);
  }
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;
let rotationIndex = 0;

// Helper to load private keys and rotate
async function getRotatedApiKey(): Promise<string> {
  if (!dbAdmin) {
    console.log('[KEY ROTATION] Firestore Admin not initialized. Falling back immediately to environment GEMINI_API_KEY.');
    return process.env.GEMINI_API_KEY || '';
  }
  try {
    const docRef = dbAdmin.collection('settings').doc('private');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const keys: string[] = data?.geminiKeys || [];
      const validKeys = keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      
      if (validKeys.length > 0) {
        const selectedKey = validKeys[rotationIndex % validKeys.length];
        rotationIndex++;
        console.log(`[KEY ROTATION] Selected Key #${(rotationIndex - 1) % validKeys.length + 1} of ${validKeys.length}`);
        return selectedKey;
      }
    }
  } catch (error: any) {
    const errorStr = String(error);
    if (errorStr.includes('PERMISSION_DENIED') || error?.code === 7) {
      console.log('[KEY ROTATION] Administrative Firestore access is restricted in this environment; falling back safely to default key.');
    } else {
      console.error('Error in getRotatedApiKey fetching settings/private:', error);
    }
  }
  
  // Fallback to primary env key
  console.log('[KEY ROTATION] Falling back to default process.env.GEMINI_API_KEY');
  return process.env.GEMINI_API_KEY || '';
}

// 1. API Endpoint for AI Tutor Chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, welcomeMessageOverride } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages list is required and must be an array.' });
    }

    // Retrieve active rotated Gemini API key
    const apiKey = await getRotatedApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'No active Google Gemini API Key configured. Please verify in the Control Panel.' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // We build the custom System Instructions with an authentic Algerian Muslim academic flavor
    const welcomeText = welcomeMessageOverride || "مرحبا بيك خويا اختي انا الاستاذ دالي استاذ مادة رياضيات و مبرمج بذكاء اصطناعي كيفاش نقدر نساعدك";
    
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

    // Format chat history for Gemini API
    const contents = [];
    
    // Convert messages to Gemini's format
    for (const msg of messages) {
      const role = msg.sender === 'student' ? 'user' : 'model';
      const parts: any[] = [];

      // If text exists, add it
      if (msg.text) {
        parts.push({ text: msg.text });
      }

      // If there is an image URL (uploaded to Cloudinary), fetch it and send as inlineData
      if (msg.imageUrl) {
        try {
          console.log(`[GEMINI API] Downloading and encoding image for model: ${msg.imageUrl}`);
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
          console.error('Failed to download image from Cloudinary inside Express server proxy:', imgErr);
        }
      }

      if (parts.length > 0) {
        contents.push({
          role,
          parts
        });
      }
    }

    console.log(`[GEMINI API] Sending chat interaction request using model: gemini-3.5-flash`);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.75
      }
    });

    const outputText = response.text || "عذراً بني، حدث نقص في الاتصال بالذكاء الاصطناعي. أعد المحاولة بارك الله فيك.";
    
    return res.json({ text: outputText });

  } catch (error: any) {
    console.error('Error calling Gemini API in server:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ في معالجة طلبك.' });
  }
});

// Helper to download PWA icons on start to ensure they are hosted locally
async function verifyAndDownloadPwaIcons() {
  const publicDir = path.join(process.cwd(), 'public');
  const icon192Path = path.join(publicDir, 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icon-512.png');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const downloadFile = (url: string, dest: string) => {
    return new Promise<void>((resolve, reject) => {
      if (fs.existsSync(dest)) {
        console.log(`[PWA] Icon ${path.basename(dest)} already exists locally.`);
        return resolve();
      }
      console.log(`[PWA] Downloading icon ${path.basename(dest)} from Cloudinary...`);
      const file = fs.createWriteStream(dest);
      https.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          reject(new Error(`PWA download failed: status ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[PWA] Successfully downloaded ${path.basename(dest)}`);
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
  };

  try {
    const ICON_192 = 'https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_pwa_icon.png';
    const ICON_512 = 'https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_pwa_icon_512.png';
    
    await downloadFile(ICON_192, icon192Path);
    await downloadFile(ICON_512, icon512Path);
    console.log('[PWA] Local icons are fully synchronized!');
  } catch (err: any) {
    console.warn('[PWA] Icon download compilation/network warning:', err.message);
  }
}

// Vite Middleware & static file routing
async function startServer() {
  // Sync PWA icons locally first
  await verifyAndDownloadPwaIcons();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production assets server mounted targeting:', distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
