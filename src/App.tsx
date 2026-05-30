/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { 
  Calculator as CalculatorIcon, 
  TrendingUp, 
  Scale, 
  BookOpen, 
  Undo,
  Trash2,
  Copy,
  Check,
  Type,
  HelpCircle,
  Moon,
  Sun,
  Layers,
  ArrowRightLeft,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseAndEvaluate } from './utils/mathParser';
import { SCIENTIFIC_CONSTANTS } from './constantsData';
import { UNIT_CATEGORIES, convertUnits } from './unitsData';
import { HistoryItem } from './types';

// Localization maps for fully bilingual support
const LOCALIZATION = {
  ar: {
    title: 'الآلة الحاسبة العلمية الذكية',
    subtitle: 'منصة حسابية وهندسية متكاملة للعمليات المعقدة، التمثيل البياني، وتحويل القياسات',
    tabCalculator: 'الحاسبة العلمية',
    tabGraph: 'الرسام الهندسي f(x)',
    tabConverter: 'محول محترف للوحدات',
    tabConstants: 'قائمة الثوابت الفيزيائية',
    historyTitle: 'سجل العمليات الحسابية',
    historyEmpty: 'السجل فارغ تماماً. قم بإجراء حسابات لتبدأ!',
    clearHistory: 'إفراغ السجل',
    inputPlaceholder: 'اكتب التعبير أو استخدم لوحة الأزرار الحسابية...',
    liveResult: 'الجواب التلقائي المباشر',
    angleMode: 'نظام قياس الزوايا',
    degree: 'الدرجات (DEG)',
    radian: 'الراديان (RAD)',
    memoryActive: 'الذاكرة نشطة (M)',
    memoryValue: 'قيمة الذاكرة الحالية',
    insertConstant: 'إدراج في شاشة الحاسبة',
    inserted: 'تم النقل!',
    categoryPhysics: 'الفيزياء والكونيات',
    categoryChemistry: 'الكيمياء والمواد',
    categoryMath: 'الرياضيات والهندسة',
    searchPlaceholder: 'ابحث عن الثوابت (مثال: Planck, Speed)...',
    unitCategory: 'اختر فئة القياس الفيزيائي',
    unitValue: 'المقدار المدخل',
    unitResult: 'المقدار المحول المرادف',
    graphFunction: 'المعادلة المستهدفة f(x)',
    graphPlaceholder: 'اكتب الدالة الرياضية هنا، مثل: x^2 - 4 أو sin(x)',
    graphZoomIn: 'تقريب للمركز (+)',
    graphZoomOut: 'تبعيد للمنظور (-)',
    graphReset: 'إعادة ضبط المحاور',
    errorInvalid: 'تعبير رياضي غير منطقي أو غير مكتمل الدلالة',
    btnEvaluate: 'حساب (=)',
    btnClear: 'تصفير (AC)',
    btnDelete: 'مسح خلفي (DEL)',
    insertedLabel: 'تم نسخ القيمة أو إدراجها بنجاح!',
    infoBtn: 'دليل استخدام صياغة المعادلات الحسابية المكتوبة',
    guideTitle: 'كيفية كتابة المعادلات والعمليات العلمية',
    guideClose: 'إغلاق الدليل',
    guideMathNote: 'يمكنك كتابة المعادلات بحرية تامة باستخدام لوحة مفاتيح حاسوبك وبصورة طبيعية:',
    backspace: 'مسح',
    angle: 'زاوية',
    physics: 'فيزياء',
    chemistry: 'كيمياء',
    math: 'رياضيات',
    search: 'بحث',
    copy: 'نسخ النتيجة',
    copiedStatus: 'تم النسخ!',
    graphSettings: 'إعدادات نطاق الرسام',
    xRange: 'نطاق محور السينات (X)',
    yRange: 'نطاق محور الصادات (Y)',
    from: 'من',
    to: 'إلى',
    apply: 'تطبيق التعديلات',
    unsupportedGraph: 'حدث خطأ في تقييم المنحنى البياني للدالة المكتوبة f(x). يرجى التحقق من الصيغة.'
  },
  en: {
    title: 'Smart Scientific Calculator',
    subtitle: 'Integrated physical engine for scientific calculations, interactive graphing, and conversions.',
    tabCalculator: 'Scientific Pad',
    tabGraph: 'Interactive Plotter',
    tabConverter: 'Unit Converter',
    tabConstants: 'Scientific Constants',
    historyTitle: 'Calculation History',
    historyEmpty: 'History is empty. Solve expressions to start!',
    clearHistory: 'Clear History',
    inputPlaceholder: 'Enter mathematical expression, e.g. 2 * sin(pi / 6)...',
    liveResult: 'Live Evaluator',
    angleMode: 'Angle Reference Unit',
    degree: 'Degrees (DEG)',
    radian: 'Radians (RAD)',
    memoryActive: 'Memory Active (M)',
    memoryValue: 'Stored Value',
    insertConstant: 'Insert into activepad',
    inserted: 'Inserted!',
    categoryPhysics: 'Physics & Cosmos',
    categoryChemistry: 'Chemistry & Materials',
    categoryMath: 'Math & Geometry',
    searchPlaceholder: 'Search constants (e.g. Planck, Euler)...',
    unitCategory: 'Measurement Category',
    unitValue: 'Source magnitude',
    unitResult: 'Converted magnitude value',
    graphFunction: 'Plotted Equation f(x)',
    graphPlaceholder: 'Type coordinate function, e.g. x^2 - 4 or sin(x)',
    graphZoomIn: 'Zoom In (+)',
    graphZoomOut: 'Zoom Out (-)',
    graphReset: 'Reset Axes',
    errorInvalid: 'Syntax Error or incomplete expression',
    btnEvaluate: 'Evaluate (=)',
    btnClear: 'Clear All (AC)',
    btnDelete: 'Backspace (DEL)',
    insertedLabel: 'Successfully copied or inserted value!',
    infoBtn: 'Expression Writing Guide',
    guideTitle: 'How to write scientific expressions',
    guideClose: 'Close Guide',
    guideMathNote: 'You can write mathematical formulations freely using your standard physical keyboard:',
    backspace: 'DEL',
    angle: 'Angle',
    physics: 'Physics',
    chemistry: 'Chemistry',
    math: 'Math',
    search: 'Search',
    copy: 'Copy Result',
    copiedStatus: 'Copied!',
    graphSettings: 'Graph Bounds Configuration',
    xRange: 'X-Axis Range limits',
    yRange: 'Y-Axis Range limits',
    from: 'From',
    to: 'To',
    apply: 'Apply Bounds',
    unsupportedGraph: 'The graphing engine encountered an evaluation error. Check function syntax.'
  }
};

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = LOCALIZATION[lang];
  const isRTL = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'calculator' | 'graph' | 'converter' | 'constants'>('calculator');
  const [isRadian, setIsRadian] = useState<boolean>(true);
  const [expression, setExpression] = useState<string>('');
  const [liveValue, setLiveValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_studio_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guide Dialog State
  const [showGuide, setShowGuide] = useState(false);

  // Clipboard Copied Dialog State
  const [showCopiedBadge, setShowCopiedBadge] = useState<string | null>(null);

  // Clipboard copies
  const triggerCopyStatus = (id: string) => {
    setShowCopiedBadge(id);
    setTimeout(() => {
      setShowCopiedBadge(null);
    }, 2000);
  };

  // Memory Cell State
  const [memoryValue, setMemoryValue] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('ai_studio_calc_memory');
      return saved ? parseFloat(saved) : null;
    } catch {
      return null;
    }
  });

  // Scientific Constants Tab State
  const [searchConstant, setSearchConstant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'physics' | 'chemistry' | 'math'>('all');

  // Unit Converter State
  const [unitCategory, setUnitCategory] = useState<string>('length');
  const [unitFrom, setUnitFrom] = useState<string>('m');
  const [unitTo, setUnitTo] = useState<string>('km');
  const [unitValueFrom, setUnitValueFrom] = useState<string>('1000');
  const [unitValueTo, setUnitValueTo] = useState<string>('1');

  // Graph state
  const [graphEquation, setGraphEquation] = useState<string>('x^2 - 4');
  const [xMin, setXMin] = useState<number>(-10);
  const [xMax, setXMax] = useState<number>(10);
  const [yMin, setYMin] = useState<number>(-10);
  const [yMax, setYMax] = useState<number>(10);
  const [graphPointTrace, setGraphPointTrace] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [graphError, setGraphError] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync unit values
  useEffect(() => {
    const category = UNIT_CATEGORIES.find(c => c.id === unitCategory);
    if (category && category.units.length >= 2) {
      setUnitFrom(category.units[0].id);
      setUnitTo(category.units[1].id);
    }
  }, [unitCategory]);

  useEffect(() => {
    const val = parseFloat(unitValueFrom);
    if (!isNaN(val)) {
      const result = convertUnits(val, unitFrom, unitTo, unitCategory);
      if (!isNaN(result)) {
        // Round to reasonable accuracy limits to look clean
        setUnitValueTo(parseFloat(result.toFixed(8)).toString());
      } else {
        setUnitValueTo('');
      }
    } else {
      setUnitValueTo('');
    }
  }, [unitValueFrom, unitFrom, unitTo, unitCategory]);

  // Handle calculator evaluation in real-time "live mode"
  useEffect(() => {
    if (!expression || expression.trim() === '') {
      setLiveValue('');
      setErrorMessage('');
      return;
    }
    try {
      const result = parseAndEvaluate(expression, isRadian);
      if (isNaN(result)) {
        setLiveValue('');
      } else {
        setLiveValue(parseFloat(result.toFixed(10)).toString());
        setErrorMessage('');
      }
    } catch {
      setLiveValue('');
    }
  }, [expression, isRadian]);

  // Synchronize history in localStorage
  useEffect(() => {
    localStorage.setItem('ai_studio_calc_history', JSON.stringify(history));
  }, [history]);

  // Synchronize memory in localStorage
  useEffect(() => {
    if (memoryValue !== null) {
      localStorage.setItem('ai_studio_calc_memory', memoryValue.toString());
    } else {
      localStorage.removeItem('ai_studio_calc_memory');
    }
  }, [memoryValue]);

  // Drawing the custom coordinates system graph
  useEffect(() => {
    if (activeTab !== 'graph' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Fit to container width and height nicely
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear backplane to cozy slate details
    ctx.fillStyle = '#0f172a'; // slate-900 background
    ctx.fillRect(0, 0, width, height);
    
    // Render secondary grid indicators
    ctx.strokeStyle = '#334155'; // slate-700 grid lines
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#94a3b8'; // slate-400 ticks Text
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate grid intervals
    const xInterval = (xMax - xMin) / 10;
    const yInterval = (yMax - yMin) / 10;
    
    // Convert mathematical coordinates to canvas pixel space
    const toPx = (xVal: number) => ((xVal - xMin) / (xMax - xMin)) * width;
    const toPy = (yVal: number) => height - ((yVal - yMin) / (yMax - yMin)) * height;
    
    // Convert canvas pixels back to coordinates
    const toCoordX = (pxVal: number) => xMin + (pxVal / width) * (xMax - xMin);
    
    // 1. Draw helper grid coordinate grids
    // Vertical dashed grids
    for (let i = 0; i <= 10; i++) {
      const currentX = xMin + i * xInterval;
      const px = toPx(currentX);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      
      // Horizontal coordinate value labels
      if (Math.abs(currentX) > 1e-10) {
        ctx.fillText(parseFloat(currentX.toFixed(2)).toString(), px, height - 12);
      }
    }
    
    // Horizontal grids
    for (let j = 0; j <= 10; j++) {
      const currentY = yMin + j * yInterval;
      const py = toPy(currentY);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
      
      // Vertical labels
      if (Math.abs(currentY) > 1e-10) {
        ctx.fillText(parseFloat(currentY.toFixed(2)).toString(), 15, py);
      }
    }
    
    // 2. Draw prominent Origin Axes
    ctx.strokeStyle = '#f1f5f9'; // slate-100 thick axes
    ctx.lineWidth = 1.5;
    
    // Y-Axis where X = 0
    const zeroX = toPx(0);
    if (zeroX >= 0 && zeroX <= width) {
      ctx.beginPath();
      ctx.moveTo(zeroX, 0);
      ctx.lineTo(zeroX, height);
      ctx.stroke();
    }
    
    // X-Axis where Y = 0
    const zeroY = toPy(0);
    if (zeroY >= 0 && zeroY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }
    
    // Draw origin text label
    ctx.fillText('0', zeroX + 8, zeroY + 8);
    
    // 3. Render Equation Polynomial/Trigonometric Curve
    ctx.strokeStyle = '#38bdf8'; // sky-400 beautiful glowing blue line
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#0284c7';
    ctx.beginPath();
    
    let pathStarted = false;
    let hasEvaluationError = false;
    
    // Plot column by column (pixel granularity) for perfect accuracy
    for (let px = 0; px < width; px++) {
      const xVal = toCoordX(px);
      try {
        const yVal = parseAndEvaluate(graphEquation, isRadian, xVal);
        if (isNaN(yVal) || !isFinite(yVal)) {
          pathStarted = false;
          continue;
        }
        
        const py = toPy(yVal);
        
        // Ensure standard range safety to avoid canvas drawing overflow artifacts
        if (py >= -200 && py <= height + 200) {
          if (!pathStarted) {
            ctx.moveTo(px, py);
            pathStarted = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          pathStarted = false;
        }
      } catch {
        hasEvaluationError = true;
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset active shadow
    
    setGraphError(hasEvaluationError && graphEquation.length > 0);
    
    // 4. Draw tracer dot and coordinates overlays if mouse is hovering
    if (graphPointTrace) {
      ctx.strokeStyle = '#fb923c'; // orange-400 vertical tracker line
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(graphPointTrace.px, 0);
      ctx.lineTo(graphPointTrace.px, height);
      ctx.stroke();
      
      // Horizontal coordinate tracker guideline
      ctx.beginPath();
      ctx.moveTo(0, graphPointTrace.py);
      ctx.lineTo(width, graphPointTrace.py);
      ctx.stroke();
      
      ctx.setLineDash([]); // clear dash state
      
      // Glowing focal tracer dot
      ctx.fillStyle = '#fb923c';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ea580c';
      ctx.beginPath();
      ctx.arc(graphPointTrace.px, graphPointTrace.py, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [activeTab, graphEquation, xMin, xMax, yMin, yMax, graphPointTrace, isRadian]);

  // Key pressed handler to support physical keyboard calculations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting keystrokes if typing inside text fields (like unit from values or search boxes)
      const isFocusedOnTextField = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') && 
        document.activeElement.id !== 'calc-expression-input';
        
      if (isFocusedOnTextField) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteChar();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearAll();
      } else if ('0123456789.+-*/^%()'.includes(e.key)) {
        e.preventDefault();
        handleInsertText(e.key);
      } else if (e.key === '!') {
        e.preventDefault();
        handleInsertText('!');
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleInsertText('x');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleInsertText('π');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expression, isRadian]);

  // Function to insert text directly where cursor is focused
  const handleInsertText = (text: string) => {
    setExpression(prev => prev + text);
    setErrorMessage('');
    // Focus back on active display field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleDeleteChar = () => {
    setExpression(prev => {
      if (prev.length === 0) return '';
      // Support backspace deleting nested function tokens completely
      const functionsList = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'log(', 'ln(', 'sqrt(', 'cbrt(', 'abs(', 'exp('];
      for (const f of functionsList) {
        if (prev.endsWith(f)) {
          return prev.slice(0, -f.length);
        }
      }
      return prev.slice(0, -1);
    });
    setErrorMessage('');
  };

  const handleClearAll = () => {
    setExpression('');
    setLiveValue('');
    setErrorMessage('');
  };

  // Perform calculations and append log to local storage history
  const handleEvaluate = () => {
    if (!expression || expression.trim() === '') return;
    try {
      const result = parseAndEvaluate(expression, isRadian);
      if (isNaN(result)) {
        setErrorMessage(t.errorInvalid);
      } else {
        const formattedResult = parseFloat(result.toFixed(12)).toString();
        
        // Append to calculations history stack
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          expression: expression,
          result: formattedResult,
          timestamp: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          }),
          isRadian: isRadian,
          isError: false
        };
        
        setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // limit to 50 logs max
        setExpression(formattedResult);
        setLiveValue('');
        setErrorMessage('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.errorInvalid);
    }
  };

  // Memory functions cell implementation
  const handleMemoryStore = () => {
    try {
      const result = parseAndEvaluate(expression || '0', isRadian);
      if (!isNaN(result)) {
        setMemoryValue(result);
        triggerCopyStatus('memory-stored');
      } else {
        setErrorMessage(t.errorInvalid);
      }
    } catch {
      setErrorMessage(t.errorInvalid);
    }
  };

  const handleMemoryRecall = () => {
    if (memoryValue !== null) {
      setExpression(prev => prev + memoryValue.toString());
    }
  };

  const handleMemoryClear = () => {
    setMemoryValue(null);
  };

  const handleMemoryAdd = () => {
    try {
      const current = parseAndEvaluate(expression || '0', isRadian);
      if (!isNaN(current)) {
        setMemoryValue(prev => (prev || 0) + current);
        triggerCopyStatus('memory-added');
      }
    } catch {
      setErrorMessage(t.errorInvalid);
    }
  };

  const handleMemorySubtract = () => {
    try {
      const current = parseAndEvaluate(expression || '0', isRadian);
      if (!isNaN(current)) {
        setMemoryValue(prev => (prev || 0) - current);
        triggerCopyStatus('memory-subbed');
      }
    } catch {
      setErrorMessage(t.errorInvalid);
    }
  };

  // Render canvas interactive mouse trackers
  const handleCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Convert back from pixel width to coordinates
    const toCoordX = (pxVal: number) => xMin + (pxVal / rect.width) * (xMax - xMin);
    const toPy = (yVal: number) => rect.height - ((yVal - yMin) / (yMax - yMin)) * rect.height;
    
    const xCoordVal = toCoordX(mouseX);
    try {
      const yCoordVal = parseAndEvaluate(graphEquation, isRadian, xCoordVal);
      if (!isNaN(yCoordVal) && isFinite(yCoordVal)) {
        const py = toPy(yCoordVal);
        setGraphPointTrace({
          x: xCoordVal,
          y: yCoordVal,
          px: mouseX,
          py: py
        });
      } else {
        setGraphPointTrace(null);
      }
    } catch {
      setGraphPointTrace(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setGraphPointTrace(null);
  };

  // Zoom utility triggers
  const handleZoom = (factor: number) => {
    const dx = (xMax - xMin) * factor;
    const dy = (yMax - yMin) * factor;
    
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    
    setXMin(xCenter - dx / 2);
    setXMax(xCenter + dx / 2);
    setYMin(yCenter - dy / 2);
    setYMax(yCenter + dy / 2);
    setGraphPointTrace(null);
  };

  const handleResetProjection = () => {
    setXMin(-10);
    setXMax(10);
    setYMin(-10);
    setYMax(10);
    setGraphPointTrace(null);
  };

  // Const search filter
  const filteredConstants = SCIENTIFIC_CONSTANTS.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchConstant.toLowerCase();
    const matchesSearch = item.nameAr.toLowerCase().includes(query) || 
                          item.nameEn.toLowerCase().includes(query) || 
                          item.symbol.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-sky-500 selection:text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* Top Header Section */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600/35 p-2 rounded-lg border border-sky-500/50">
              <CalculatorIcon className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-300">
                {t.title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Guide Info Dialog Trigger */}
            <button 
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-700/80 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 text-sky-400" />
              <span>{t.infoBtn}</span>
            </button>

            {/* Language Selection Switcher */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 text-xs font-bold leading-none select-none bg-slate-800 hover:bg-sky-950 border border-slate-700 rounded-lg text-sky-400 hover:text-sky-300 transition-all cursor-pointer focus:outline-none"
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Navigation Tab Menu */}
        <div className="flex overflow-x-auto justify-start border-b border-slate-800 mb-6 pb-px gap-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 cursor-pointer focus:outline-none ${
              activeTab === 'calculator' 
                ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <CalculatorIcon className="h-4 w-4" />
            <span>{t.tabCalculator}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 cursor-pointer focus:outline-none ${
              activeTab === 'graph' 
                ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t.tabGraph}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 cursor-pointer focus:outline-none ${
              activeTab === 'converter' 
                ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>{t.tabConverter}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('constants')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 cursor-pointer focus:outline-none ${
              activeTab === 'constants' 
                ? 'border-sky-500 text-sky-400 bg-sky-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t.tabConstants}</span>
          </button>
        </div>

        {/* Tab Contents Frame */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* TAB 1: SCIENTIFIC CALCULATOR & HISTORY SPLIT SCREEN */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Pad Frame */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* Visual Math Screens */}
                <div className="bg-slate-950 p-6 border-b border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded ${isRadian ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400'}`}>
                        RAD
                      </span>
                      <span className={`px-2 py-0.5 rounded ${!isRadian ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400'}`}>
                        DEG
                      </span>
                    </div>
                    {memoryValue !== null && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded animate-pulse">
                        {t.memoryActive}: {parseFloat(memoryValue.toFixed(4))}
                      </span>
                    )}
                  </div>
                  
                  {/* Native active writing output field */}
                  <div className="relative">
                    <input
                      id="calc-expression-input"
                      ref={inputRef}
                      type="text"
                      className="w-full bg-transparent text-right text-2xl md:text-3xl font-mono text-slate-100 placeholder-slate-700 border-none outline-none focus:ring-0 focus:outline-none p-0 ltr"
                      placeholder={t.inputPlaceholder}
                      value={expression}
                      onChange={(e) => {
                        setExpression(e.target.value);
                        setErrorMessage('');
                      }}
                      dir="ltr"
                    />
                  </div>

                  {/* Real-time calculated live result indicator */}
                  <div className="h-8 mt-2 flex items-center justify-end font-mono text-slate-400 text-lg md:text-xl ltr truncate">
                    {liveValue && (
                      <span className="text-emerald-400 before:content-['≈_']">
                        {liveValue}
                      </span>
                    )}
                  </div>

                  {/* Incomplete / Error indicator banner nested beautifully */}
                  <div className="h-6 mt-1 flex items-center justify-end text-right">
                    <AnimatePresence>
                      {errorMessage && (
                        <motion.span 
                          initial={{ opacity: 0, y: -2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-xs text-rose-400 font-medium bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20"
                        >
                          {errorMessage}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Pad Control buttons panel */}
                <div className="p-4 md:p-6 bg-slate-900/60">
                  <div className="grid grid-cols-1 gap-4">
                    
                    {/* Angle reference unit configurations & Quick Memory functions row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setIsRadian(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none transition-all cursor-pointer ${
                            isRadian 
                              ? 'bg-sky-600/30 text-sky-400 border border-sky-500/50' 
                              : 'bg-slate-800 text-slate-400 hover:text-slate-300 border border-transparent'
                          }`}
                        >
                          {t.radian}
                        </button>
                        <button
                          onClick={() => setIsRadian(false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none transition-all cursor-pointer ${
                            !isRadian 
                              ? 'bg-sky-600/30 text-sky-400 border border-sky-500/50' 
                              : 'bg-slate-800 text-slate-400 hover:text-slate-300 border border-transparent'
                          }`}
                        >
                          {t.degree}
                        </button>
                      </div>

                      <div className="flex gap-1">
                        <button 
                          onClick={handleMemoryClear}
                          title="Memory Clear (MC)"
                          className="w-9 h-8 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 text-slate-400 transition"
                        >
                          MC
                        </button>
                        <button 
                          onClick={handleMemoryRecall}
                          title="Memory Recall (MR)"
                          className="w-9 h-8 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 text-slate-400 transition"
                        >
                          MR
                        </button>
                        <button 
                          onClick={handleMemoryAdd}
                          title="Add to Memory (M+)"
                          className="w-9 h-8 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-emerald-950 hover:text-emerald-400 border border-slate-700 text-slate-400 transition"
                        >
                          M+
                        </button>
                        <button 
                          onClick={handleMemorySubtract}
                          title="Subtract from Memory (M-)"
                          className="w-9 h-8 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-amber-950 hover:text-amber-400 border border-slate-700 text-slate-400 transition"
                        >
                          M-
                        </button>
                        <button 
                          onClick={handleMemoryStore}
                          title="Store inside Memory (MS)"
                          className="w-9 h-8 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-sky-950 hover:text-sky-400 border border-slate-700 text-slate-400 transition"
                        >
                          MS
                        </button>
                      </div>
                    </div>

                    {/* Standard & Scientific Combined Dynamic Keypad Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      
                      {/* SCIENTIFIC MATH FUNCTIONS BUTTONS */}
                      <button
                        onClick={() => handleInsertText('sin(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition-all active:scale-95 cursor-pointer"
                      >
                        sin
                      </button>
                      <button
                        onClick={() => handleInsertText('cos(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition-all active:scale-95 cursor-pointer"
                      >
                        cos
                      </button>
                      <button
                        onClick={() => handleInsertText('tan(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition-all active:scale-95 cursor-pointer"
                      >
                        tan
                      </button>
                      <button
                        onClick={() => handleInsertText('sqrt(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition-all active:scale-95 cursor-pointer text-xs"
                      >
                        √ (sqrt)
                      </button>

                      {/* Power / brackets buttons */}
                      <button
                        onClick={() => handleInsertText('^')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-900/60 hover:bg-indigo-900/60 transition-all active:scale-95 cursor-pointer"
                      >
                        x^y
                      </button>
                      <button
                        onClick={() => handleInsertText('(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-800 transition active:scale-95 cursor-pointer"
                      >
                        (
                      </button>
                      <button
                        onClick={() => handleInsertText(')')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-800 transition active:scale-95 cursor-pointer"
                      >
                        )
                      </button>
                      <button
                        onClick={() => handleInsertText('!')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        x!
                      </button>

                      <button
                        onClick={() => handleInsertText('asin(')}
                        type="button"
                        className="h-12 rounded-xl text-xs font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-400 transition-all active:scale-95 cursor-pointer"
                      >
                        asin
                      </button>
                      <button
                        onClick={() => handleInsertText('acos(')}
                        type="button"
                        className="h-12 rounded-xl text-xs font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-400 transition-all active:scale-95 cursor-pointer"
                      >
                        acos
                      </button>
                      <button
                        onClick={() => handleInsertText('atan(')}
                        type="button"
                        className="h-12 rounded-xl text-xs font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-400 transition-all active:scale-95 cursor-pointer"
                      >
                        atan
                      </button>
                      <button
                        onClick={() => handleInsertText('cbrt(')}
                        type="button"
                        className="h-12 rounded-xl text-xs font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-400 transition active:scale-95 cursor-pointer"
                      >
                        ³√ (cbrt)
                      </button>

                      {/* Logarithms and Exp */}
                      <button
                        onClick={() => handleInsertText('log(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        log₁₀
                      </button>
                      <button
                        onClick={() => handleInsertText('ln(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        ln
                      </button>
                      <button
                        onClick={() => handleInsertText('exp(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        e^x
                      </button>
                      <button
                        onClick={() => handleInsertText('abs(')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        |x|
                      </button>

                      {/* SCIENTIFIC CONSTANTS & VARIABLES IN CALCULATOR */}
                      <button
                        onClick={() => handleInsertText('π')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-teal-950/30 text-teal-400 border border-teal-900/50 hover:bg-teal-900/40 transition active:scale-95 cursor-pointer"
                      >
                        π (Pi)
                      </button>
                      <button
                        onClick={() => handleInsertText('e')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-teal-950/30 text-teal-400 border border-teal-900/50 hover:bg-teal-900/40 transition active:scale-95 cursor-pointer"
                      >
                        e
                      </button>
                      <button
                        onClick={() => handleInsertText('x')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-bold bg-amber-950/30 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40 transition active:scale-95 cursor-pointer"
                        title="Variable x for functions"
                      >
                        X
                      </button>
                      <button
                        onClick={() => handleInsertText('%')}
                        type="button"
                        className="h-12 rounded-xl text-sm font-mono font-semibold bg-slate-800/60 hover:bg-sky-950/80 hover:text-sky-400 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer"
                      >
                        mod
                      </button>

                      {/* SYSTEM RECOVERY BUTTONS ROW */}
                      <button
                        onClick={handleClearAll}
                        type="button"
                        className="h-12 rounded-xl text-xs md:text-sm font-bold bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-950 transition active:scale-95 cursor-pointer sm:col-span-2"
                      >
                        {t.btnClear}
                      </button>
                      
                      <button
                        onClick={handleDeleteChar}
                        type="button"
                        className="h-12 rounded-xl text-xs md:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-amber-950 border border-amber-700 transition active:scale-95 flex items-center justify-center gap-1 cursor-pointer sm:col-span-2"
                      >
                        <Undo className="h-4 w-4" />
                        <span>{t.btnDelete}</span>
                      </button>

                      {/* NUMERIC BUTTONS INTEGRATION & CORE OPERATORS */}
                      <button
                        onClick={() => handleInsertText('7')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        7
                      </button>
                      <button
                        onClick={() => handleInsertText('8')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        8
                      </button>
                      <button
                        onClick={() => handleInsertText('9')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        9
                      </button>
                      <button
                        onClick={() => handleInsertText('/')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-semibold bg-indigo-950/50 text-indigo-300 border border-indigo-900/40 hover:bg-indigo-900/40 transition active:scale-95 cursor-pointer"
                      >
                        ÷
                      </button>

                      <button
                        onClick={() => handleInsertText('4')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer col-start-1 sm:col-start-5"
                      >
                        4
                      </button>
                      <button
                        onClick={() => handleInsertText('5')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        5
                      </button>
                      <button
                        onClick={() => handleInsertText('6')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        6
                      </button>
                      <button
                        onClick={() => handleInsertText('*')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-semibold bg-indigo-950/50 text-indigo-300 border border-indigo-900/40 hover:bg-indigo-900/40 transition active:scale-95 cursor-pointer"
                      >
                        ×
                      </button>

                      <button
                        onClick={() => handleInsertText('1')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer col-start-1 sm:col-start-5"
                      >
                        1
                      </button>
                      <button
                        onClick={() => handleInsertText('2')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        2
                      </button>
                      <button
                        onClick={() => handleInsertText('3')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        3
                      </button>
                      <button
                        onClick={() => handleInsertText('-')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-semibold bg-indigo-950/50 text-indigo-300 border border-indigo-900/40 hover:bg-indigo-900/40 transition active:scale-95 cursor-pointer"
                      >
                        −
                      </button>

                      <button
                        onClick={() => handleInsertText('0')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer col-start-1 sm:col-start-5"
                      >
                        0
                      </button>
                      <button
                        onClick={() => handleInsertText('.')}
                        type="button"
                        className="h-12 rounded-xl text-lg font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition active:scale-95 cursor-pointer"
                      >
                        .
                      </button>

                      {/* EQUATE SUBMIT TRIGGER KEY */}
                      <button
                        onClick={handleEvaluate}
                        type="button"
                        className="h-12 rounded-xl text-lg font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-600 shadow-md shadow-sky-500/10 transition active:scale-95 col-span-2 cursor-pointer"
                      >
                        {t.btnEvaluate}
                      </button>

                    </div>
                  </div>
                </div>

              </div>

              {/* TAB 1 SIDEBAR SIDE: HISTORIC CALCULATIONS */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[525px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Undo className="h-4 w-4 text-sky-400 rotate-180" />
                    <h2 className="text-md font-bold text-slate-200">{t.historyTitle}</h2>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={() => setHistory([])}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t.clearHistory}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <AnimatePresence initial={false}>
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 p-4">
                        <CalculatorIcon className="h-10 w-10 mb-2 opacity-25" />
                        <p className="text-sm font-medium">{t.historyEmpty}</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 p-3 rounded-xl relative group transition"
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mb-1">
                            <span>{item.timestamp}</span>
                            <span>{item.isRadian ? 'RAD' : 'DEG'}</span>
                          </div>
                          
                          {/* Expression click-to-load feature */}
                          <button
                            onClick={() => {
                              setExpression(item.expression);
                              setErrorMessage('');
                              if (inputRef.current) inputRef.current.focus();
                            }}
                            className="block w-full text-left ltr font-mono text-sm text-slate-300 hover:text-sky-400 font-medium break-all text-ellipsis overflow-hidden mt-1 text-left cursor-pointer"
                            title="Click to load into editor"
                          >
                            {item.expression}
                          </button>
                          
                          <div className="flex items-center justify-between mt-2 border-t border-slate-800/80 pt-1.5 gap-2">
                            <span className="text-sm font-mono text-emerald-400 overflow-hidden text-ellipsis break-all ltr">
                              = {item.result}
                            </span>
                            
                            <div className="flex gap-1">
                              {/* Copy response */}
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(item.result);
                                    triggerCopyStatus(item.id);
                                  } catch {}
                                }}
                                className="opacity-70 group-hover:opacity-100 hover:text-emerald-400 p-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded transition cursor-pointer"
                                title={t.copy}
                              >
                                {showCopiedBadge === item.id ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INTERACTIVE COORDINATES PLOTTER */}
          {activeTab === 'graph' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Configuration Panel side */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t.graphFunction}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-sm font-mono text-slate-500 select-none">
                      y = f(x) =
                    </span>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl py-2.5 pl-20 pr-3 font-mono text-sm text-slate-100 outline-none transition ltr"
                      placeholder={t.graphPlaceholder}
                      value={graphEquation}
                      onChange={(e) => {
                        setGraphEquation(e.target.value);
                        setGraphPointTrace(null);
                      }}
                    />
                  </div>
                </div>

                {/* Predefined interesting functions to quickly test */}
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-xs text-slate-500 block mb-2 font-semibold">أمثلة سريعة للدوال الرياضية الرسم:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { l: 'x^2 - 3', e: 'x^2 - 3' },
                      { l: 'sin(x)', e: 'sin(x)' },
                      { l: 'cos(x) * 2', e: 'cos(x) * 2' },
                      { l: 'abs(x) - 4', e: 'abs(x) - 4' },
                      { l: 'sqrt(abs(x)) * 3', e: 'sqrt(abs(x)) * 3' },
                      { l: 'x^3 - 3x', e: 'x^3 - 3*x' },
                      { l: 'exp(-x^2)', e: 'exp(-x^2)' }
                    ].map((btn, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setGraphEquation(btn.e);
                          setGraphPointTrace(null);
                        }}
                        className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 hover:text-sky-400 border border-slate-700/80 rounded-lg text-slate-300 transition cursor-pointer"
                      >
                        {btn.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bounds configuration section */}
                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {t.graphSettings}
                  </span>
                  
                  {/* Min Max Ranges inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono block">{t.xRange} ({t.from} &rarr; {t.to})</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="1"
                          className="w-1/2 bg-slate-950 border border-slate-800 text-xs font-mono text-center rounded p-1"
                          value={xMin}
                          onChange={(e) => setXMin(parseFloat(e.target.value) || -10)}
                        />
                        <input
                          type="number"
                          step="1"
                          className="w-1/2 bg-slate-950 border border-slate-800 text-xs font-mono text-center rounded p-1"
                          value={xMax}
                          onChange={(e) => setXMax(parseFloat(e.target.value) || 10)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono block">{t.yRange} ({t.from} &rarr; {t.to})</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="1"
                          className="w-1/2 bg-slate-950 border border-slate-800 text-xs font-mono text-center rounded p-1"
                          value={yMin}
                          onChange={(e) => setYMin(parseFloat(e.target.value) || -10)}
                        />
                        <input
                          type="number"
                          step="1"
                          className="w-1/2 bg-slate-950 border border-slate-800 text-xs font-mono text-center rounded p-1"
                          value={yMax}
                          onChange={(e) => setYMax(parseFloat(e.target.value) || 10)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graph Zoom Controls */}
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleZoom(0.5)}
                      className="px-2 py-2 text-xs font-bold leading-none bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-center transition cursor-pointer border border-slate-700/85"
                    >
                      {t.graphZoomIn}
                    </button>
                    <button
                      onClick={() => handleZoom(1.8)}
                      className="px-2 py-2 text-xs font-bold leading-none bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-center transition cursor-pointer border border-slate-700/85"
                    >
                      {t.graphZoomOut}
                    </button>
                    <button
                      onClick={handleResetProjection}
                      className="px-2 py-2 text-xs font-bold leading-none bg-sky-950/40 hover:bg-sky-900/30 text-sky-400 rounded-lg text-center transition cursor-pointer border border-sky-800/40"
                    >
                      {t.graphReset}
                    </button>
                  </div>
                </div>

                {/* Graph Alert Messages */}
                {graphError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
                    <div className="bg-rose-500 text-slate-950 rounded-full p-0.5 mt-0.5 shrink-0 flex items-center justify-center font-bold font-mono text-[9px] w-4 h-4">!</div>
                    <span className="leading-relaxed">{t.unsupportedGraph}</span>
                  </div>
                )}
              </div>

              {/* Graphical Board Plotting Screen (HTML5 Canvas) */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                
                {/* Board element with responsive cursor interactions */}
                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-[4/3] md:aspect-[16/10] border border-slate-800">
                  <canvas
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={handleCanvasMouseLeave}
                    className="absolute inset-0 w-full h-full cursor-crosshair block"
                  />
                  
                  {/* Floating trace point tooltip readout overlay */}
                  {graphPointTrace && (
                    <div 
                      className="absolute bg-slate-900/95 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 pointer-events-none shadow-xl flex flex-col gap-0.5 leading-none backdrop-blur-sm"
                      style={{
                        left: `${Math.min(graphPointTrace.px + 15, canvasRef.current ? canvasRef.current.clientWidth - 130 : 0)}px`,
                        top: `${Math.min(graphPointTrace.py + 15, canvasRef.current ? canvasRef.current.clientHeight - 60 : 0)}px`
                      }}
                    >
                      <span className="text-[10px] text-sky-400 font-bold border-b border-slate-800 pb-0.5 mb-0.5">Trace Data Point</span>
                      <span dir="ltr">X: {graphPointTrace.x.toFixed(4)}</span>
                      <span dir="ltr">Y: {graphPointTrace.y.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Canvas usage indicator note */}
                <div className="bg-slate-900 text-[11px] text-slate-400/85 text-center leading-normal">
                  💡 {lang === 'ar' ? 'حرك مؤشر الماوس فوق مساحة الرسم البياني لتكتشف تتبع الإحداثيات الحية للنقاط المعينة على المنحنى.' : 'Move mouse cursor over the canvas mesh to discover tracer coordinate values along the curve.'}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: PHYSICAL UNIT CONVERTER */}
          {activeTab === 'converter' && (
            <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Category select block */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  {t.unitCategory}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {UNIT_CATEGORIES.map(category => {
                    const isSelected = unitCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setUnitCategory(category.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/60 shadow-lg shadow-sky-500/5'
                            : 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Layers className={`h-5 w-5 mb-1 opacity-90 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold leading-none mt-1">
                          {lang === 'ar' ? category.nameAr : category.nameEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversion calculation block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950/50 p-5 rounded-xl border border-slate-800/40">
                
                {/* SOURCE VALUE COLUMN */}
                <div className="md:col-span-5 space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold">{t.unitValue}</span>
                  <div className="flex bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden focus-within:border-sky-500 transition leading-none">
                    <input
                      type="number"
                      className="w-2/3 bg-transparent px-3 py-2.5 font-mono text-sm inline-block outline-none text-slate-100"
                      value={unitValueFrom}
                      onChange={(e) => setUnitValueFrom(e.target.value)}
                    />
                    <select
                      className="w-1/3 bg-slate-950/80 px-2 font-mono text-xs border-r border-slate-800 hover:text-sky-400 transition cursor-pointer text-slate-300 focus:outline-none"
                      value={unitFrom}
                      onChange={(e) => setUnitFrom(e.target.value)}
                    >
                      {UNIT_CATEGORIES.find(c => c.id === unitCategory)?.units.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.symbol} ({lang === 'ar' ? u.nameAr : u.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TRANSFER GLYPH COMPONENT */}
                <div className="md:col-span-2 flex justify-center py-2 md:py-0">
                  <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-full text-sky-400">
                    <ArrowRightLeft className="h-5 w-5 rotate-90 md:rotate-0" />
                  </div>
                </div>

                {/* TARGET VALUE COLUMN */}
                <div className="md:col-span-5 space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold">{t.unitResult}</span>
                  <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden leading-none opacity-90">
                    <input
                      type="text"
                      className="w-2/3 bg-slate-950/50 px-3 py-2.5 font-mono text-sm inline-block outline-none text-emerald-400 font-bold select-all"
                      value={unitValueTo}
                      readOnly
                    />
                    <select
                      className="w-1/3 bg-slate-950/80 px-2 font-mono text-xs border-r border-slate-800 hover:text-sky-400 transition cursor-pointer text-slate-300 focus:outline-none"
                      value={unitTo}
                      onChange={(e) => setUnitTo(e.target.value)}
                    >
                      {UNIT_CATEGORIES.find(c => c.id === unitCategory)?.units.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.symbol} ({lang === 'ar' ? u.nameAr : u.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* TAB 4: SCIENTIFIC CONSTANTS REFERENCE WORKSHEET */}
          {activeTab === 'constants' && (
            <div className="max-w-5xl mx-auto space-y-5">
              
              {/* Reference Search & Filter strip */}
              <div className="flex flex-col md:flex-row items-center gap-3 justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                
                {/* Live Search bar */}
                <div className="w-full md:w-1/2 relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden leading-none">
                  <input
                    type="text"
                    className="w-full bg-transparent px-4 py-2.5 text-sm outline-none text-slate-100"
                    placeholder={t.searchPlaceholder}
                    value={searchConstant}
                    onChange={(e) => setSearchConstant(e.target.value)}
                  />
                </div>

                {/* Categories toggle row */}
                <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                  {[
                    { id: 'all', lAr: 'جميع المجالات', lEn: 'All Fields' },
                    { id: 'physics', lAr: 'الفيزياء', lEn: 'Physics' },
                    { id: 'chemistry', lAr: 'الكيمياء', lEn: 'Chemistry' },
                    { id: 'math', lAr: 'الرياضيات', lEn: 'Math' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedCategory(tab.id as any)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition border cursor-pointer shrink-0 ${
                        selectedCategory === tab.id
                          ? 'bg-sky-500/10 text-sky-400 border-sky-505/40 font-bold'
                          : 'bg-slate-850/30 text-slate-400 border-transparent hover:text-slate-300'
                      }`}
                    >
                      {lang === 'ar' ? tab.lAr : tab.lEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Constants Mesh Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConstants.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-900 border border-slate-850 hover:border-slate-800 p-4 rounded-xl shadow-lg relative group transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Name & Badge category */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wider leading-none select-none ${
                          item.category === 'physics' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : item.category === 'chemistry' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        }`}>
                          {item.category === 'physics' ? t.categoryPhysics : item.category === 'chemistry' ? t.categoryChemistry : t.categoryMath}
                        </span>
                        
                        <span className="text-xl font-extrabold font-mono text-sky-400 px-1">
                          {item.symbol}
                        </span>
                      </div>

                      {/* Descriptive Titles */}
                      <h3 className="text-sm font-bold text-slate-200">{lang === 'ar' ? item.nameAr : item.nameEn}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono text-slate-500 shrink-0">{lang === 'en' ? item.nameAr : item.nameEn}</p>
                    </div>

                    {/* Numeric readout & insert triggers container */}
                    <div className="border-t border-slate-800/80 mt-4 pt-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between font-mono gap-1.5">
                        <span className="text-slate-400 text-xs truncate" dir="ltr" title={item.value}>
                          {item.displayValue}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">{item.unit !== '-' ? item.unit : ''}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-slate-850/40">
                        {/* Insert into active display */}
                        <button
                          onClick={() => {
                            // Insert physical constant value into active math evaluator pad
                            handleInsertText(item.value);
                            setActiveTab('calculator');
                            triggerCopyStatus(`insert-${index}`);
                          }}
                          className="px-2 py-1.5 text-[10px] font-semibold bg-sky-950/20 hover:bg-sky-900/30 text-sky-400 border border-sky-900/40 rounded-lg transition active:scale-95 text-center flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{t.insertConstant}</span>
                        </button>

                        {/* Copy raw button */}
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(item.value);
                              triggerCopyStatus(`copy-${index}`);
                            } catch {}
                          }}
                          className="px-2 py-1.5 text-[10px] font-semibold bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition active:scale-95 text-center flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {showCopiedBadge === `copy-${index}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                          <span>{showCopiedBadge === `copy-${index}` ? t.copiedStatus : t.copy}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </main>

      {/* FOOTER COZY BRAND DESIGN */}
      <footer className="border-t border-slate-800/40 bg-slate-900/10 px-4 py-8 mt-12 text-center text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto space-y-2">
          <div>الآلة الحاسبة العلمية الذكية © 2026 - جميع الحقوق محفوظة</div>
          <div className="text-[11px] text-slate-600/80">
            تم التنفيذ بأرقى معايير واجهات المستخدم الرياضية والهندسية لتوفير حوسبة متكاملة.
          </div>
        </div>
      </footer>

      {/* EXPRESSIONS WRITING GUIDE DIALOG MODAL (PORTABLE INTERATIVE MODAL) */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop cover blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuide(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Content card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl relative overflow-hidden z-10"
            >
              {/* Guide Header */}
              <div className="border-b border-slate-800 p-5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-sky-400" />
                  <h3 className="text-md font-bold text-slate-100">{t.guideTitle}</h3>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 bg-slate-800 border border-slate-700/80 rounded transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Guide Content body scroll */}
              <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs leading-relaxed text-slate-300">
                <p className="font-semibold text-slate-400">
                  {t.guideMathNote}
                </p>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  {[
                    { c: '+, -, *, /', dAr: 'الجمع، الطرح، الضرب، والقسمة العادية.', dEn: 'Basic Arithmetic operators' },
                    { c: '^', dAr: 'معامل الأسس (مثال: x^2 تعني سين تربيع أو 2^3 تعني 2 أس 3).', dEn: 'Power exponent operator' },
                    { c: 'sin(x), cos(x), tan(x)', dAr: 'الدوال المثلثية التقليدية للجيب وجيب التمام والظل (تستجيب لنظام RAD/DEG المختار).', dEn: 'Trigonometric functions (respects RAD/DEG toggle)' },
                    { c: 'asin(x), acos(x), atan(x)', dAr: 'الدوال المثلثية العكسية للجيب وجيب التمام وظل الزاوية.', dEn: 'Inverse Trigonometric functions' },
                    { c: 'log(x), ln(x)', dAr: 'اللوغاريتم العشري (أساس 10) واللوغاريتم الطبيعي (أساس e).', dEn: 'Decimal (Base-10) and Natural (Base-e) logarithms' },
                    { c: 'sqrt(x), cbrt(x)', dAr: 'الجذر التربيعي والجذر التكعيبي للمعاملات الرياضية.', dEn: 'Square root and cube root functions' },
                    { c: 'abs(x), exp(x)', dAr: 'القيمة المطلقة للدالة، والدالة الأسية للعدد الطبيعي e^x.', dEn: 'Absolute value and Euler natural exponential power' },
                    { c: 'x!', dAr: 'مضروب الأعداد الصحيحة (مثال: 5! تعني 120).', dEn: 'Factorial of positive integer numbers' },
                    { c: 'π, e', dAr: 'الثوابت الرياضية الافتراضية الجاهزة.', dEn: 'Standard physical mathematical constants Pi & Euler' },
                  ].map((row, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-slate-950/40 p-2.5 rounded border border-slate-850">
                      <code className="text-sky-400 font-mono font-bold text-[13px]">{row.c}</code>
                      <div className="text-slate-300 font-semibold">{row.dAr}</div>
                      <div className="text-slate-500 font-mono text-[10px]">{row.dEn}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close button panel */}
              <div className="border-t border-slate-800 p-4 bg-slate-950/20 text-right">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-5 py-2 text-xs font-bold leading-none bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-600 rounded-lg cursor-pointer"
                >
                  {t.guideClose}
                </button>
              </div>
            </motion.div>
            
          </div>
        )}
      </AnimatePresence>

      {/* GLOBALLY FLOATING COPY/INSERT INDICATOR NOTIFICATION BADGE */}
      <AnimatePresence>
        {showCopiedBadge && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-905 border border-emerald-500/35 text-emerald-400 font-bold text-xs md:text-sm shadow-xl shadow-slate-950/50 px-5 py-3 rounded-full flex items-center gap-2"
          >
            <Check className="h-4 w-4 bg-emerald-500/10 text-emerald-400 p-0.5 rounded-full border border-emerald-500/25" />
            <span>{t.insertedLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
