/**
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logoutUser, 
  OperationType, 
  handleFirestoreError 
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  Plus, 
  LogOut, 
  LogIn, 
  Download, 
  Settings, 
  Key, 
  BookOpen, 
  LayoutDashboard,
  ShieldAlert,
  HelpCircle,
  Menu,
  X,
  Upload,
  CheckCircle,
  Clock,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatSession, ChatMessage, GlobalSettings } from './types';
import FunctionStudyCorner from './components/FunctionStudyCorner';

// Default teacher profile avatar (Algerian colors / theme) if none is configured
const DEFAULT_AVATAR = "https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_placeholder.png";
const DEFAULT_WELCOME = "مرحبا انا الاستاذ دالي نجيب، ماذا تريد ان اشرح لك اليوم او كيف يمككني مساعدتك؟";

export default function App() {
  // Authentication & Users State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Layout UI navigation
  const [activeTab, setActiveTab] = useState<'chat' | 'functions' | 'admin'>('chat');
  const [adminSubTab, setAdminSubTab] = useState<'settings' | 'keys' | 'conversations'>('settings');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Global app settings (synced via Firestore settings/global)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    profileImageUrl: DEFAULT_AVATAR,
    welcomeMessage: DEFAULT_WELCOME,
    geminiKeys: []
  });

  // Student list (loaded for admins, to inspect student chat rooms)
  const [studentSessions, setStudentSessions] = useState<ChatSession[]>([]);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Chat/Session tracking for current student OR selected student under review
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // New prompt input states
  const [inputText, setInputText] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiResponding, setAiResponding] = useState(false);

  // Admin dynamic control parameters
  const [newKey, setNewKey] = useState('');
  const [editedWelcome, setEditedWelcome] = useState('');
  const [editedProfileImageUrl, setEditedProfileImageUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // PWA progressive installation trigger
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  // Auto scroll reference
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const isCreatingInitialRef = useRef(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        // Enforce the admin list check requested: Dalind1990@gmail.com or Dalinadjib169@gmail.com
        const email = firebaseUser.email || '';
        const hasAdminAccess = ['dalind1990@gmail.com', 'dalinadjib169@gmail.com', 'dalinadjib1990@gmail.com'].includes(email.toLowerCase());
        setIsAdmin(hasAdminAccess);
        if (hasAdminAccess) {
          setActiveTab('admin'); // auto-navigate to admin if they are the teacher
        } else {
          setActiveTab('chat');
        }
      } else {
        setIsAdmin(false);
        setActiveTab('chat');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync PWA setup events
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerPwaInstallation = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response:', outcome);
    setDeferredPrompt(null);
    setPwaInstallable(false);
  };

  // Sync Global Settings
  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        const currentMsg = data.welcomeMessage || '';
        
        // Auto-upgrade if database holds the old placeholder words
        if (currentMsg.includes('مرحبا بيك خويا') || currentMsg.includes('كيفاش نقدر نساعدك') || !currentMsg.trim()) {
          setDoc(docRef, {
            welcomeMessage: DEFAULT_WELCOME
          }, { merge: true }).catch(err => console.log('[MIGRATION] Firestore welcome message auto-upgrade skipped:', err));
        }

        setGlobalSettings({
          profileImageUrl: data.profileImageUrl || DEFAULT_AVATAR,
          welcomeMessage: data.welcomeMessage || DEFAULT_WELCOME,
          geminiKeys: data.geminiKeys || []
        });
        setEditedWelcome(data.welcomeMessage || DEFAULT_WELCOME);
        setEditedProfileImageUrl(data.profileImageUrl || DEFAULT_AVATAR);
      } else {
        // Bootstrap global placeholder settings
        setDoc(docRef, {
          profileImageUrl: DEFAULT_AVATAR,
          welcomeMessage: DEFAULT_WELCOME,
          geminiKeys: []
        }).catch(err => {
          console.error("Settings bootstrapping skipped due to privilege constraint. Using local placeholders.", err);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Logged-In Student Chats
  useEffect(() => {
    if (!user || isAdmin) return;

    const path = 'sessions';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
      });
      setSessions(list);
      
      // Auto-select latest active chat session if none selected
      if (list.length > 0) {
        if (!activeSessionId) {
          setActiveSessionId(list[0].id);
        }
      } else {
        // Automatically bootstrap the very first chat session with Professor Dali's welcome message
        if (!isCreatingInitialRef.current) {
          isCreatingInitialRef.current = true;
          try {
            const docRef = await addDoc(collection(db, 'sessions'), {
              userId: user.uid,
              userEmail: user.email,
              title: `المساعد التعليمي - المعلم DZ 💡`,
              createdAt: new Date().toISOString(),
              lastMessageAt: new Date().toISOString()
            });
            
            // Seed first message with Professor Dali's welcome message
            await addDoc(collection(db, `sessions/${docRef.id}/messages`), {
              sender: 'teacher',
              text: globalSettings.welcomeMessage || DEFAULT_WELCOME,
              createdAt: new Date().toISOString()
            });
            
            setActiveSessionId(docRef.id);
          } catch (e) {
            console.error("Error creating initial auto-session:", e);
          } finally {
            isCreatingInitialRef.current = false;
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Sync Admin Conversations (View conversations of ALL students)
  useEffect(() => {
    if (!user || !isAdmin) return;

    const path = 'sessions';
    const q = query(
      collection(db, path),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
      });
      setStudentSessions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Sync Chat Messages in the chosen active chat
  useEffect(() => {
    const currentSession = activeSessionId || viewingSessionId;
    if (!currentSession) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const path = `sessions/${currentSession}/messages`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      setMessages(list);
      setMessagesLoading(false);
      autoScrollToBottom();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [activeSessionId, viewingSessionId]);

  const autoScrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Create a brand new session/room
  const createNewChatRoom = async () => {
    if (!user) return;
    try {
      const path = 'sessions';
      const docRef = await addDoc(collection(db, path), {
        userId: user.uid,
        userEmail: user.email,
        title: `محادثة جديدة - ${new Date().toLocaleDateString('ar-DZ')}`,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      });
      
      // Seed first message with Al-Moalem's welcome message
      const msgPath = `sessions/${docRef.id}/messages`;
      await addDoc(collection(db, msgPath), {
        sender: 'teacher',
        text: globalSettings.welcomeMessage,
        createdAt: new Date().toISOString()
      });

      setActiveSessionId(docRef.id);
      setDrawerOpen(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  // Handle student uploading images to attach
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'nadjib dali'); // Using preset nadjib dali on cloud doaxziqm7 as specified

      const response = await fetch('https://api.cloudinary.com/v1_1/doaxziqm7/image/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAttachedImageUrl(data.secure_url);
      } else {
        alert('حدث خطأ في رفع الصورة إلى Cloudinary. تأكد من إعدادات الرفع.');
      }
    } catch (err) {
      console.error('Cloudinary Image upload error:', err);
      alert('فشل الاتصال بخادم الصور Cloudinary.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Send Student Message & Query standard server-side AI response
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImageUrl) || aiResponding) return;

    const textToSend = inputText;
    const imgToSend = attachedImageUrl;

    setInputText('');
    setAttachedImageUrl(null);
    setAiResponding(true);

    let sessionToUse = activeSessionId || viewingSessionId;

    try {
      if (!sessionToUse && user) {
        // Automatically bootstrap a brand new session/room
        const path = 'sessions';
        const docRef = await addDoc(collection(db, path), {
          userId: user.uid,
          userEmail: user.email,
          title: textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : ''),
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString()
        });
        
        // Seed first message with Al-Moalem's welcome message
        const msgPath = `sessions/${docRef.id}/messages`;
        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: globalSettings.welcomeMessage,
          createdAt: new Date().toISOString()
        });

        sessionToUse = docRef.id;
        setActiveSessionId(docRef.id);
      }

      if (!sessionToUse) {
        setAiResponding(false);
        return;
      }

      // 1. Add student message to Firestore
      const msgPath = `sessions/${sessionToUse}/messages`;
      await addDoc(collection(db, msgPath), {
        sender: 'student',
        text: textToSend,
        imageUrl: imgToSend || '',
        createdAt: new Date().toISOString()
      });

      // Update session lastMessageAt timestamp
      await setDoc(doc(db, 'sessions', sessionToUse), {
        lastMessageAt: new Date().toISOString(),
        ...(textToSend ? { title: textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : '') } : {})
      }, { merge: true });

      autoScrollToBottom();

      // 2. Load complete chat history for Gemini Proxy API
      const historySnapSnap = await getDoc(doc(db, 'sessions', sessionToUse));
      const messageToAI: any[] = [];
      
      // Let's reload messages manually or slice the local ones to provide context (limit to last 15 messages)
      const currentMessagesList = [...messages, { sender: 'student', text: textToSend, imageUrl: imgToSend || '' }];
      const recentHistory = currentMessagesList.slice(-12).map(m => ({
        sender: m.sender,
        text: m.text,
        imageUrl: m.imageUrl
      }));

      // 3. Request Gemini proxy on our backend server
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: recentHistory,
          welcomeMessageOverride: globalSettings.welcomeMessage
        })
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const teacherText = data.text;

        // 4. Save AI response to Firestore
        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: teacherText,
          createdAt: new Date().toISOString()
        });

        // Trigger session updated state again
        await setDoc(doc(db, 'sessions', sessionToUse), {
          lastMessageAt: new Date().toISOString()
        }, { merge: true });

      } else {
        const errData = await aiResponse.json();
        // Fallback error reply
        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: `بارك الله فيك بني، يبدو أن هناك مشكلة حالية مع مفاتيح البرمجة: ${errData.error || 'عطل تقني'}. صلي على محمد و عاونا بدعوة خير.`,
          createdAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setAiResponding(false);
      autoScrollToBottom();
    }
  };

  // Handle students submitting function inquiries from the "Function Study Corner"
  const handleAskDaliFromCorner = async (promptText: string) => {
    if (!user) {
      alert("الرجاء تسجيل الدخول أولاً لطرح أسئلة على الأستاذ دالي 🇩🇿");
      return;
    }

    // Direct students to the chat tab
    setActiveTab('chat');
    setAiResponding(true);

    try {
      let sessionToUse = activeSessionId || viewingSessionId;

      // 1. If no active session exists, bootstrap a brand new chat room first
      if (!sessionToUse) {
        const path = 'sessions';
        const docRef = await addDoc(collection(db, path), {
          userId: user.uid,
          userEmail: user.email,
          title: `دراسة دالة - ${new Date().toLocaleDateString('ar-DZ')}`,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString()
        });

        // Seed with Al-Moalem's welcome message
        const msgPath = `sessions/${docRef.id}/messages`;
        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: globalSettings.welcomeMessage,
          createdAt: new Date().toISOString()
        });

        sessionToUse = docRef.id;
        setActiveSessionId(docRef.id);
      }

      // 2. Add user question to Firestore
      const msgPath = `sessions/${sessionToUse}/messages`;
      await addDoc(collection(db, msgPath), {
        sender: 'student',
        text: promptText,
        imageUrl: '',
        createdAt: new Date().toISOString()
      });

      // Update session lastMessageAt timestamp and title to "دراسة دالة"
      await setDoc(doc(db, 'sessions', sessionToUse), {
        lastMessageAt: new Date().toISOString(),
        title: `دراسة دالة بالتفصيل 📈`
      }, { merge: true });

      autoScrollToBottom();

      // 3. Assemble history with the new prompt
      const recentHistory = [{
        sender: 'student',
        text: promptText,
        imageUrl: ''
      }];

      // 4. Send command directly to Gemini Proxy
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: recentHistory,
          welcomeMessageOverride: globalSettings.welcomeMessage
        })
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const teacherText = data.text;

        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: teacherText,
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, 'sessions', sessionToUse), {
          lastMessageAt: new Date().toISOString()
        }, { merge: true });
      } else {
        const errData = await aiResponse.json();
        await addDoc(collection(db, msgPath), {
          sender: 'teacher',
          text: `بارك الله فيك بني، يبدو أن هناك مشكلة حالية مع مفاتيح البرمجة: ${errData.error || 'عطل تقني'}. صلي على محمد و عاونا بدعوة خير.`,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error in AI function study corner query:', error);
    } finally {
      setAiResponding(false);
      autoScrollToBottom();
    }
  };

  // Delete chat row
  const handleDeleteSession = async (sid: string) => {
    if (!confirm('هل تريد فعلاً حذف هذه المحادثة بالكامل؟')) return;
    try {
      await deleteDoc(doc(db, 'sessions', sid));
      if (activeSessionId === sid) setActiveSessionId(null);
      if (viewingSessionId === sid) setViewingSessionId(null);
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Admin: Change Global Al-Moalem profile picture via Cloudinary
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'nadjib dali');

      const response = await fetch('https://api.cloudinary.com/v1_1/doaxziqm7/image/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state to preview
        setEditedProfileImageUrl(data.secure_url);
        alert('تم رفع الصورة الجديدة بنجاح! للإنهاء يرجى الضغط على زر "حفظ تعديلات صورة البروفيل" أدناه 💾.');
      } else {
        alert('فشل رفع صورة بروفيل الأستاذ دالي.');
      }
    } catch (err) {
      console.error(err);
      alert('عطل في الاتصال بخوادم Cloudinary.');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Admin: Explicitly save global profile picture URL to Firestore
  const handleSaveProfileImage = async () => {
    setSavingSettings(true);
    try {
      if (!editedProfileImageUrl.trim()) {
        alert('يرجى إدخال رابط صورة صحيح أولاً.');
        return;
      }
      await setDoc(doc(db, 'settings', 'global'), {
        profileImageUrl: editedProfileImageUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('تم حفظ واعتماد صورة بروفيل الأستاذ دالي بنجاح! 🇩🇿✨');
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ صورة بروفيل الأستاذ.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Admin: Update Global Welcome Message
  const handleSaveWelcomeMessage = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        welcomeMessage: editedWelcome,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('تم تحديث رسالة ترحيب المعلم دالي بنجاح!');
    } catch (err) {
      console.error(err);
      alert('فشل حفظ رسالة ترحيب المعلم دالي.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Admin: Add custom Gemini Key (saved securely to private settings)
  const handleAddGeminiKey = async () => {
    if (!newKey.trim()) return;
    
    try {
      const privateDocRef = doc(db, 'settings', 'private');
      const privateSnap = await getDoc(privateDocRef);
      
      let currentKeys: string[] = [];
      if (privateSnap.exists()) {
        currentKeys = privateSnap.data().geminiKeys || [];
      }
      
      const updatedKeys = [...currentKeys, newKey.trim()];
      
      await setDoc(privateDocRef, {
        geminiKeys: updatedKeys,
        updatedAt: new Date().toISOString()
      });

      // Update public stats representation (only counting keys without showing the actual key)
      await setDoc(doc(db, 'settings', 'global'), {
        geminiKeys: updatedKeys.map(() => 'CONFIGURED_KEY_MASKED'),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewKey('');
      alert('تمت إضافة مفتاح API جديد بنظام الدوران الدائري الآمن!');
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ مفتاح API الجديد.');
    }
  };

  // Admin: Clear and reset all custom API Gemini Keys
  const handleResetAllKeys = async () => {
    if (!confirm('هل تريد فعلاً إزالة كافة مفاتيح API المضافة والرجوع للافتراضي؟')) return;
    try {
      await setDoc(doc(db, 'settings', 'private'), {
        geminiKeys: [],
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'settings', 'global'), {
        geminiKeys: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('تم تصفير مفاتيح API المضافة بنجاح.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white" dir="rtl">
      
      {/* Top Banner containing Algerian teacher credentials and install indicators */}
      <header className="bg-[#0b132a]/95 border-b border-blue-500/20 p-3 md:p-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              {/* Algerian Flag beside Dali Teacher's Photo as explicitly requested: "علم جزائري بجانب صورتي 🇩🇿" */}
              <div className="relative shrink-0">
                <img 
                  src={globalSettings.profileImageUrl} 
                  alt="الأستاذ دالي" 
                  className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover shadow-lg shadow-blue-500/10"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                />
                <span className="absolute -bottom-1 -right-1 text-base bg-[#080d1a] px-0.5 py-0.2 rounded-md border border-slate-800 shadow shadow-slate-950">
                  🇩🇿
                </span>
              </div>
              
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base md:text-lg text-blue-400">المعلم DZ</span>
                  <span className="text-[10px] bg-blue-900/40 text-blue-300 font-medium px-2 py-0.5 rounded-full border border-blue-500/20">الأستاذ دالي</span>
                </div>
                <p className="text-xs text-slate-400 font-light mt-0.5">مساعد ذكاء اصطناعي تفاعلي مدروس لجميع الطلاب</p>
              </div>
            </div>

            {/* Mobile Actions: Install & Auth right next to logo to prevent wraps */}
            <div className="flex items-center gap-1.5 md:hidden shrink-0">
              <button
                onClick={triggerPwaInstallation}
                className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-950/40 rounded-lg border border-blue-900/30 transition shadow-inner shadow-blue-500/10"
                title="تثبيت تطبيق المعلم DZ الأستاذ دالي"
              >
                <Download className="h-4 w-4 animate-bounce" />
              </button>
              {user ? (
                <button
                  onClick={logoutUser}
                  title="تسجيل الخروج"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg border border-slate-800 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="px-2 py-1.5 text-[10px] font-bold bg-blue-600 text-white rounded-lg transition"
                >
                  دخول
                </button>
              )}
            </div>
          </div>

          {/* Navigation links & Actions layout */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {user && (
              <div className="flex items-center gap-1 bg-[#091124] p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto justify-center overflow-x-auto overflow-y-hidden scrollbar-none shrink-0">
                <button
                  onClick={() => setActiveTab('functions')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'functions' ? 'bg-blue-600 text-white shadow shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>دراسة الدوال 📈</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>المحادثات</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === 'admin' ? 'bg-blue-600 text-white shadow shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>لوحة التحكم 🛠️</span>
                  </button>
                )}
              </div>
            )}

            {/* Desktop only active actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={triggerPwaInstallation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-600/30 border border-blue-500 hover:scale-105"
                title="تثبيت التطبيق مباشرة"
              >
                <Download className="h-4 w-4 animate-bounce" />
                <span>تثبيت التطبيق 📱</span>
              </button>

              {user && (
                <button
                  onClick={logoutUser}
                  title="تسجيل الخروج"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg border border-slate-800 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main Container screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col min-h-0 lg:h-[calc(100vh-90px)] lg:max-h-[calc(100vh-90px)] overflow-hidden">
        
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-slate-400">جاري تحميل منصة الأستاذ دالي... صلي على محمد</p>
          </div>
        ) : !user ? (
          /* Student Landing Page with introduction */
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4 py-8">
            <span className="text-5xl mb-3">🇩🇿🤲</span>
            <img 
              src={globalSettings.profileImageUrl} 
              alt="المعلم دالي" 
              className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover mb-4 shadow-xl shadow-blue-500/20"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
            />
            
            <h2 className="text-2xl md:text-3xl font-extrabold text-blue-400 tracking-tight">مرحباً بكم في منصة "المعلم DZ"</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">بإشراف وبرمجة الأستاذ دالي نجيب لذكاء اصطناعي تفاعلي مدروس</p>
            
            <div className="mt-6 bg-[#0c152a] p-5 rounded-2xl border border-blue-950/50 text-right space-y-3">
              <span className="text-xs text-blue-400 font-bold block">🌟 ميزات تطبيق الأستاذ دالي:</span>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>إجابات أكاديمية دقيقة وتدريجية في كافة المجالات ومادة الرياضيات.</li>
                <li>أسلوب جزائري وطني أصيل يحمل في طياته الصلاة على محمد ﷺ.</li>
                <li><strong>نظام تفاعلي متقدم:</strong> يقوم الأستاذ بشرح مفهوم ثم يطرح عليك فوراً سؤال اختبار للتأكد من فهمك للSegmnet!</li>
                <li>إمكانية رفع ومشاركة الصور للذكاء الاصطناعي لتحليلها فوراً.</li>
                <li>لوحة تحكم آمنة وخاصة للأستاذ دالي لمتابعة أسئلة وملفات طلابه.</li>
              </ul>
            </div>

            <button
              onClick={signInWithGoogle}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/10 border border-blue-500"
            >
              <LogIn className="h-5 w-5" />
              <span>ابدأ الدراسة الآن (دخول بحساب جوجل)</span>
            </button>
            
            <span className="text-[10px] text-slate-500 mt-4 block">
              للولوج للوحة التحكم كأستاذ، يرجى تسجيل الدخول بأحد البريدين المعتمدين.
            </span>
          </div>
        ) : (
          /* Logged In Workspace */
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 bg-[#060a14] rounded-2xl p-2 md:p-4 border border-slate-900 overflow-hidden">
            
            {/* SIDEBAR FOR STUDENTS OR ADMIN CONVERSATIONS VIEWS */}
            {activeTab === 'chat' && (
              <aside className={`w-full lg:w-72 bg-[#0b132a]/90 rounded-xl p-3 flex flex-col border border-slate-800 ${drawerOpen ? 'block' : 'hidden lg:flex'}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-slate-400">محادثاتي الدراسية</span>
                  <button
                    onClick={createNewChatRoom}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-950 text-blue-400 hover:bg-blue-900 rounded-lg border border-blue-900 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>محادثة جديدة</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[300px] lg:max-h-none">
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">لا توجد محادثات نشطة حالياً.</div>
                  ) : (
                    sessions.map((sess) => (
                      <div 
                        key={sess.id}
                        onClick={() => {
                          setActiveSessionId(sess.id);
                          setViewingSessionId(null);
                        }}
                        className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                          activeSessionId === sess.id 
                            ? 'bg-blue-900/40 border border-blue-800/60 text-blue-300' 
                            : 'bg-[#060a14]/60 hover:bg-[#0c1328] border border-transparent text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate">{sess.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-center">
                  <p className="text-[11px] text-slate-400">لا تنسونا من صالح دعائكم 🇩🇿🤲</p>
                </div>
              </aside>
            )}

            {/* MAIN CORE BODY PANEL */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#070c1a] rounded-xl border border-slate-900 overflow-hidden">
              
              {/* CHAT TAB SECTOR */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0">
                  
                  {/* Active Chat Header */}
                  <div className="bg-[#0b132a] p-3 border-b border-blue-950/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200"
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <img 
                          src={globalSettings.profileImageUrl} 
                          alt="المعلم دالي" 
                          className="w-10 h-10 rounded-full border border-blue-500 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-100 block">الأستاذ دالي نجيب 🇩🇿</span>
                          <span className="text-[10px] text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            نشط بالذكاء الاصطناعي المتقدم
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono pl-2 border-l border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>أسلوب أكاديمي تدرجي مبرمج</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('functions')}
                        className="bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-800/80 hover:border-blue-500/60 flex items-center gap-1.5 shadow-md shadow-blue-950/50 transition-all active:scale-95 hover:text-white"
                        title="الانتقال إلى ركن دراسة الدوال التفاعلي"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        <span className="hidden sm:inline">ركن دراسة الدوال التفاعلي 📈</span>
                        <span className="sm:hidden">دراسة الدوال 📈</span>
                      </button>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                        <Sparkles className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                        <span className="text-sm font-bold">ابدأ محادثة دراسية مع الأستاذ دالي!</span>
                        <p className="text-xs max-w-sm mt-1">اضغط على زر (محادثة جديدة) في القائمة الجانبية أو ابدأ الكتابة فوراً.</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex gap-3 max-w-[85%] ${
                            msg.sender === 'student' ? 'mr-auto flex-row-reverse' : 'ml-auto'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="shrink-0">
                            {msg.sender === 'teacher' ? (
                              <img 
                                src={globalSettings.profileImageUrl} 
                                alt="المعلم دالي" 
                                className="w-8 h-8 rounded-full border border-blue-500 object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-300 border border-indigo-700">
                                {user?.displayName?.substring(0, 1) || 'ت'}
                              </div>
                            )}
                          </div>

                          {/* Message bubble */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-mono block">
                              {msg.sender === 'student' ? user?.displayName || 'تلميذ' : 'الأستاذ دالي'}
                            </span>
                            
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === 'student' 
                                ? 'bg-[#0f1d3a] text-slate-100 rounded-tr-none border border-slate-800' 
                                : 'bg-[#0b132a] text-blue-50 rounded-tl-none border border-slate-900/80 shadow'
                            }`}>
                              
                              {/* Display attached image parsed to Gemini */}
                              {msg.imageUrl && (
                                <div className="mb-2.5 max-w-xs rounded-lg overflow-hidden border border-slate-700">
                                  <img 
                                    src={msg.imageUrl} 
                                    alt="مرفق التلميذ" 
                                    className="w-full max-h-48 object-cover" 
                                  />
                                </div>
                              )}

                              <p className="whitespace-pre-line select-text">{msg.text}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {aiResponding && (
                      <div className="flex gap-3 max-w-[85%] ml-auto">
                        <div className="shrink-0">
                          <img 
                            src={globalSettings.profileImageUrl} 
                            alt="المعلم دالي" 
                            className="w-8 h-8 rounded-full border border-blue-500 object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 font-mono block">الأستاذ دالي يكتب...</span>
                          <div className="bg-[#0b132a]/80 p-3 rounded-2xl rounded-tl-none border border-blue-950/40 text-xs flex items-center gap-2 text-blue-400">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping delay-75"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping delay-150"></span>
                            </div>
                            <span>صلي على محمد و انتظرني دقيقة بني...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Attachment indicator bar */}
                  {attachedImageUrl && (
                    <div className="px-4 py-2 bg-[#0c152a] border-t border-blue-950/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img src={attachedImageUrl} alt="مرفق تحميل" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                        <span className="text-[10px] text-slate-400">صورة مرفقة جاهزة للإرسال والتحليل الذكي للأستاذ دالي 📸</span>
                      </div>
                      <button 
                        onClick={() => setAttachedImageUrl(null)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                      >
                        إلغاء المرفق
                      </button>
                    </div>
                  )}

                  {/* Input Box Form */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-[#0b132a]/60 border-t border-slate-900 flex items-center gap-2">
                    
                    {/* Cloudinary picture attachment exactly as specified: "ارسال صور ذكاء اصطناعي لتحايلها نستعمل doaxziqm7 nadjib dali" */}
                    <label className="shrink-0 p-2.5 text-slate-400 hover:text-blue-400 hover:bg-blue-950/20 rounded-xl border border-slate-800 transition cursor-pointer relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={uploadingImage || aiResponding}
                      />
                      <ImageIcon className="w-4.5 h-4.5" />
                      {uploadingImage && (
                        <span className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center">
                          <span className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        </span>
                      )}
                    </label>

                    <input
                      type="text"
                      placeholder={
                        aiResponding 
                          ? "الأستاذ دالي يراجع الإجابة الآن..." 
                          : "اكتب سؤالك العلمي، تمرينك الرياضي أو استفسارك هنا للأستاذ دالي..."
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={aiResponding}
                      className="flex-1 bg-[#060a14] border border-slate-800 focus:border-blue-700/80 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-700/30 transition text-slate-100 placeholder-slate-600"
                    />

                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !attachedImageUrl) || aiResponding}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>
              )}

              {/* FUNCTIONS STUDY CORNER GRAPHING PLOTTER & ANALYZER */}
              {activeTab === 'functions' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 md:p-5 bg-[#060a14]">
                  <FunctionStudyCorner 
                    userEmail={user?.email}
                    onAskDali={handleAskDaliFromCorner} 
                  />
                </div>
              )}

              {/* ADMIN CONTROL PANEL SECTOR (SECURED STRICTLY BY DIRECT RULE EMAIL CHECKS FOR TWO SPECIFIED USERS) */}
              {activeTab === 'admin' && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#070c1a]">
                  
                  {/* Dashboard header and tab options */}
                  <div className="bg-[#0b132a] p-4 border-b border-blue-950/50 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-blue-500 animate-pulse" />
                      <div>
                        <span className="text-sm font-bold text-slate-100">لوحة التحكم الآمنة - الأستاذ دالي نجيب</span>
                        <p className="text-[10px] text-slate-400">مرحباً بك أستاذنا الفاضل. تحكم ببروفايلك ومفاتيح API بموثوقية عالية.</p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setAdminSubTab('settings')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${adminSubTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>بروفيل الأستاذ</span>
                      </button>
                      <button
                        onClick={() => setAdminSubTab('keys')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${adminSubTab === 'keys' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>المفاتيح و Rotation 🔄</span>
                      </button>
                      <button
                        onClick={() => setAdminSubTab('conversations')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${adminSubTab === 'conversations' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>متابعة الطلبة ({studentSessions.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub Content sectors */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    
                    {/* Admin SUB TAB 1: Profile & Welcome Text modifications */}
                    {adminSubTab === 'settings' && (
                      <div className="max-w-2xl mx-auto space-y-5">
                        
                        {/* Profile Image Cloudinary file upload exactly as requested: "نبدل فطو بروفيل تاعي... nadjib dali doaxziqm7" */}
                        <div className="bg-[#0b132a] p-5 rounded-2xl border border-slate-800 space-y-4">
                          <h3 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" />
                            <span>تغيير صورة بروفيل الأستاذ دالي نجيب (تُحمل على Cloudinary)</span>
                          </h3>
                          <div className="flex flex-col md:flex-row items-center gap-5">
                            <div className="relative">
                              <img 
                                src={editedProfileImageUrl || globalSettings.profileImageUrl} 
                                alt="معاينة صورة الأستاذ" 
                                className="w-24 h-24 rounded-full border-2 border-blue-500 object-cover shadow-lg shadow-blue-500/10"
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                              />
                              <span className="absolute bottom-0 right-0 text-[9px] bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-slate-300">
                                {editedProfileImageUrl !== globalSettings.profileImageUrl ? 'معدلة' : 'الحالية'}
                              </span>
                            </div>
                            <div className="flex-1 space-y-3 w-full">
                              <div className="flex flex-col md:flex-row gap-2 w-full">
                                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-md cursor-pointer select-none">
                                  <Upload className="w-4 h-4" />
                                  <span>رفع صورة جديدة للأستاذ</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleProfileImageUpload}
                                    disabled={uploadingProfile}
                                  />
                                </label>
                                
                                <button
                                  onClick={handleSaveProfileImage}
                                  disabled={savingSettings || uploadingProfile}
                                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>حفظ واعتماد صورة البروفيل 💾</span>
                                </button>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-semibold">رابط صورة البروفيل المفتوحة (يمكنك تعديل الرابط أو الرفع):</span>
                                <input 
                                  type="text"
                                  value={editedProfileImageUrl}
                                  onChange={(e) => setEditedProfileImageUrl(e.target.value)}
                                  className="w-full bg-[#060a14] border border-slate-800 focus:border-blue-500 px-3 py-1.5 rounded text-xs select-all text-slate-300 font-mono outline-none"
                                  placeholder="رابط الصورة المرفوعة..."
                                />
                              </div>
                              <p className="text-[10px] text-slate-500">موصول بـ Cloudinary: doaxziqm7 والمجلد nadjib dali.</p>
                              {uploadingProfile && (
                                <span className="text-[11px] text-blue-400 block animate-pulse font-medium">جاري رفع وحفظ الصورة الجديدة... صلي على محمد</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Welcome Message Customizer */}
                        <div className="bg-[#0b132a] p-5 rounded-2xl border border-slate-800 space-y-3">
                          <h3 className="text-xs font-bold text-blue-400">تعديل رسالة الترحيب الأولى للطلبة</h3>
                          <textarea
                            value={editedWelcome}
                            onChange={(e) => setEditedWelcome(e.target.value)}
                            rows={3}
                            placeholder="اكتب رسالة الترحيب التي ينطق بها الأستاذ للطلبة..."
                            className="w-full bg-[#060a14] border border-slate-800 focus:border-blue-500 p-3 rounded-lg text-xs text-slate-200 outline-none transition"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={handleSaveWelcomeMessage}
                              disabled={savingSettings}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>تحديث وحفظ رسالة الترحيب</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Admin SUB TAB 2: Secure API key dynamic rotation manager */}
                    {adminSubTab === 'keys' && (
                      <div className="max-w-2xl mx-auto space-y-5">
                        <div className="bg-[#0b132a] p-5 rounded-2xl border border-slate-800 space-y-4">
                          <h3 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                            <Key className="w-4 h-4" />
                            <span>نظام دوران مفاتيح Google Gemini API الذكي (Rotations)</span>
                          </h3>
                          <p className="text-[11px] text-slate-300">
                            عند توفر مفاتيح متعددة، سيقوم المعلم DZ بالتنقل الآمن والدوراني بينهم في كل محادثة لضمان استقرار العمل وتجنب تجاوز الحصص المجانية.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <input
                              type="password"
                              placeholder="أدخل مفتاح Google Gemini API الجديد هنا..."
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              className="md:col-span-9 bg-[#060a14] border border-slate-800 focus:border-blue-500 px-3 py-2 rounded-lg text-xs text-slate-100 outline-none transition font-mono"
                            />
                            <button
                              onClick={handleAddGeminiKey}
                              className="md:col-span-3 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                            >
                              <Plus className="w-4 h-4" />
                              <span>إضافة المفتاح</span>
                            </button>
                          </div>

                          <div className="space-y-2 mt-4">
                            <span className="text-[10px] text-slate-400 block font-bold">المفاتيح المدورة النشطة حالياً:</span>
                            {globalSettings.geminiKeys.length === 0 ? (
                              <div className="text-center py-4 bg-[#060a14] p-3 rounded-lg text-slate-500 text-xs border border-dashed border-slate-800">
                                لا توجد مفاتيح مخصصة حتى الآن. جاري استخدام المفتاح المبرمج الافتراضي للجهاز.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {globalSettings.geminiKeys.map((k, index) => (
                                  <div key={index} className="flex items-center justify-between p-2.5 bg-[#060a14] rounded-lg border border-slate-800 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                      <span className="font-mono text-[10px] text-blue-400 font-bold">المفتاح #{index + 1} (مخفي ومحمي على السيرفر)</span>
                                    </div>
                                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded">نشط بالدوران</span>
                                  </div>
                                ))}
                                <div className="flex justify-end pt-2">
                                  <button
                                    onClick={handleResetAllKeys}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-950 text-rose-400 hover:bg-rose-900 rounded-lg text-xs font-semibold border border-rose-900 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>تصفير وإزالة كافة المفاتيح</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin SUB TAB 3: Student chats monitoring */}
                    {adminSubTab === 'conversations' && (
                      <div className="space-y-4">
                        <div className="bg-[#0b132a] p-4 rounded-xl border border-slate-800">
                          <span className="text-xs font-bold text-slate-400 block mb-2">استعراض غرف محادثات المتعلمين ومتابعتهم تدرجياً:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {studentSessions.length === 0 ? (
                              <div className="col-span-full text-center py-6 text-slate-500 text-xs">لا يوجد طلاب متصلين أو غرف دراسية بعد.</div>
                            ) : (
                              studentSessions.map((sess) => (
                                <div
                                  key={sess.id}
                                  onClick={() => {
                                    setViewingSessionId(sess.id);
                                    setActiveSessionId(null);
                                    setActiveTab('chat'); // go view details index
                                  }}
                                  className="p-3 bg-[#060a14] rounded-lg border border-slate-800 hover:border-blue-700/60 transition cursor-pointer text-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-blue-400 truncate">{sess.userEmail}</span>
                                    <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                                      {new Date(sess.lastMessageAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="text-slate-300 font-bold truncate">{sess.title}</div>
                                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                                    <span>محادثة: #{sess.id.substring(0, 6)}</span>
                                    <span className="text-blue-400 hover:underline flex items-center gap-0.5 font-bold">
                                      دخول للمتابعة
                                      <ExternalLink className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* Main Footer markup */}
      <footer className="bg-[#0b132a]/90 border-t border-blue-950/40 p-3 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span>المساعد التعليمي "المعلم DZ" - الأستاذ دالي نجيب 🇩🇿</span>
          <span className="font-mono text-[10px] text-blue-400 font-semibold flex items-center gap-1">
            <span>صلي على محمد ﷺ</span>
            <span>●</span>
            <span>لا تنسونا من صالح دعائكم 🤲</span>
          </span>
        </div>
      </footer>

      {/* PWA Direct Installation Guide Modal */}
      {showPwaGuide && (
        <div className="fixed inset-0 bg-[#040812]/85 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-[#0b132a] border border-blue-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button 
              onClick={() => setShowPwaGuide(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Logo */}
            <div className="text-center space-y-2 mt-2">
              <div className="relative inline-block">
                <img 
                  src="https://res.cloudinary.com/doaxziqm7/image/upload/v1716912345/almoalem_pwa_icon_512.png" 
                  alt="شعار المعلم DZ" 
                  className="w-16 h-16 mx-auto rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-500/20"
                />
                <span className="absolute -bottom-1 -right-1 text-xs bg-slate-900 border border-slate-800 px-1 py-0.2 rounded-md">🇩🇿</span>
              </div>
              <h3 className="text-lg font-bold text-blue-400">تثبيت تطبيق "المعلم DZ"</h3>
              <p className="text-[11px] text-slate-400">تابع دراستك التفاعلية كبرنامج مستقل وسريع على هاتفك أو حاسوبك دون شريط المتصفح!</p>
            </div>

            {/* Instruction blocks */}
            <div className="mt-5 space-y-3 text-xs">
              
              {/* Android & Chrome */}
              <div className="bg-[#070c1a] p-3 rounded-xl border border-slate-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <span className="text-base">🤖</span>
                  <span>هواتف أندرويد ومتصفح كـروم:</span>
                </div>
                <p className="text-slate-400 leading-relaxed pr-6">
                  إذا كان متصفحك يدعم التثبيت الفوري، فسيظهر لك نافذة منبثقة الآن. بخلاف ذلك، اضغط على زر خيارات المتصفح (المزيد) ثم اختر <strong className="text-slate-200">"تثبيت التطبيق"</strong> أو <strong className="text-slate-200">"إضافة للشاشة الرئيسية"</strong>.
                </p>
              </div>

              {/* iOS / Safari */}
              <div className="bg-[#070c1a] p-3 rounded-xl border border-slate-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <span className="text-base">🍎</span>
                  <span>هواتف آيـفـون وآيـبـادا (Safari):</span>
                </div>
                <p className="text-slate-400 leading-relaxed pr-6">
                  اضغط على زر المشاركة <strong className="text-blue-400">📤</strong> الموجود في شريط الأدوات بالأسفل، ثم مرر لأسفل واختر <strong className="text-slate-200">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong> ➕ لتثبيته فوراً.
                </p>
              </div>

              {/* Computers */}
              <div className="bg-[#070c1a] p-3 rounded-xl border border-slate-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <span className="text-base">💻</span>
                  <span>أجهزة الكمبيوتر والحاسوب:</span>
                </div>
                <p className="text-slate-400 leading-relaxed pr-6">
                  انقر على أيقونة التثبيت <strong className="text-blue-400">🖥️ (شاشة التنزيل)</strong> التي تجدها في الزاوية العلوية لشريط العنوان بالمتصفح بجوار الرابط.
                </p>
              </div>

            </div>

            {/* Close footer button */}
            <button
              onClick={() => setShowPwaGuide(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/10 border border-blue-500"
            >
              حسناً، فهمت الطريقة 💡
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
