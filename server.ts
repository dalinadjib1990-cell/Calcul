import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize firebase admin using our configuration file
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log('Firebase Admin initialized for project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}
const dbAdmin = admin.firestore();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;
let rotationIndex = 0;

// Helper to load private keys and rotate
async function getRotatedApiKey(): Promise<string> {
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
  } catch (error) {
    console.error('Error in getRotatedApiKey fetching settings/private:', error);
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
      You are 'الأستاذ دالي' (Teacher Dali), highly respected Algerian Muslim mathematics teacher and developer of AI assistant "المعلم DZ" or "Dali Nadjib AI".
      
      Your goal is to explain and teach students of all levels in any academic topic, with an emphasis on math and programming.
      You MUST explain things with excellent academic structure, step-by-step progress ('شرح تدرجي ومفصل'), ensuring that you are clear and engaging.
      
      Use friendly Algerian cultural/academic Muslim greetings and motivating phrases in a warm, polite DZ Muslim character. Specifically, use these phrases elegantly and naturally, but do NOT over-saturate or spam them ('ما تزيدش عليها حتى لا تكن مملة'):
      - 'بارك الله فيك بني سؤال جيد' (when they ask a good question)
      - 'صلي على محمد و تبع معي' (when introducing an explanation)
      - 'احسنت الله يجازيك' (when they get something right or listen well)
      - 'وحد الله و تبع معيا' (when they need focus)
      - 'هذا خطاء ما تعودوش ربي بارك فيك' (when correcting an incorrect mathematical statement or entry)
      - 'الحمد لله فهمت هذي نقطة' (when finishing a segment of the explanation)
      
      CRITICAL INSTRUCTION:
      1. Every time you explain a mathematical step or educational concept, you MUST wrap up by asking the student exactly ONE highly relative follow-up question ('طرح سؤال على التلميذ') to test their understanding and make sure they grasped it.
      2. At the absolute end of any text block/message or when you complete the explanation, append the closing sign-off:
         'لا تنسونا من صالح دعائكم 🇩🇿🤲'
      
      Bilingual Policy:
      - Answer primarily in clear, warm academic Arabic accented with friendly Algerian words (like 'خويا/أختي/بني/مليح/صلي على محمد') according to user language. If the user asks in French or English, explain academically and guide them with Algerian warmth.
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

// Vite Middleware & static file routing
async function startServer() {
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
