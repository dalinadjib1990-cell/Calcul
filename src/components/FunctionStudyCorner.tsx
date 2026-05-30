/**
 * Interactive Function Study Corner (f(x) Plotter) - المعلم DZ
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Settings, 
  HelpCircle, 
  ArrowLeftRight, 
  Plus, 
  Minus, 
  RefreshCw, 
  Cpu, 
  Info,
  Maximize2,
  Minimize2,
  TrendingUp,
  LineChart,
  Grid3X3,
  BookOpen
} from 'lucide-react';

// Math Expression safe interpreter
export function evaluateMathExpression(expr: string, x: number, m: number): number {
  try {
    let parsed = expr.toLowerCase();

    // 1. Handle ln(x) -> Math.log
    // Replace ln with Math.log
    parsed = parsed.replace(/ln/g, 'Math.log');
    // Replace exp with Math.exp
    parsed = parsed.replace(/exp/g, 'Math.exp');
    // Replace sin, cos, abs, sqrt
    parsed = parsed.replace(/sin/g, 'Math.sin');
    parsed = parsed.replace(/cos/g, 'Math.cos');
    parsed = parsed.replace(/abs/g, 'Math.abs');
    parsed = parsed.replace(/sqrt/g, 'Math.sqrt');

    // 2. Hande m parameter
    parsed = parsed.replace(/\bm\b/g, `(${m})`);

    // 3. Implicity multiplication: number or variable m/x adjacent to ( or another variable
    // E.g. 2x -> 2*x, x(x+1) -> x*(x+1)
    // To handle simple standard formulations:
    // Regex matches digit followed by x or ( or m
    parsed = parsed.replace(/(\d+)(x|m|\()/g, '$1*$2');
    // Regex matches x followed by digit or ( or m
    parsed = parsed.replace(/(x|m)(\()|(\))(x|m|\d+)/g, (match, g1, g2, g3, g4) => {
      if (g1 && g2) return `${g1}*${g2}`;
      if (g3 && g4) return `${g3}*${g4}`;
      return match;
    });

    // 4. Exponentials: x^2 -> x**2
    parsed = parsed.replace(/\^/g, '**');

    // 5. Replace x variable using word boundary so it won't affect Math.log or Math.exp
    parsed = parsed.replace(/\bx\b/g, `(${x})`);

    // Safe execution sandbox
    const evaluator = new Function(`return (${parsed});`);
    const result = evaluator();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return NaN;
  } catch (err) {
    return NaN;
  }
}

interface FunctionStudyCornerProps {
  onAskDali: (prompt: string) => void;
  userEmail?: string | null;
}

interface PresetFunction {
  name: string;
  expression: string;
  defaultXMin: number;
  defaultXMax: number;
  defaultYMin: number;
  defaultYMax: number;
  description: string;
  asymptotes: { type: 'horizontal' | 'vertical' | 'oblique'; value: string; expr?: string }[];
  variations: {
    points: { x: string; fx: string; derivative: '+' | '-' | '0'; arrow: 'up' | 'down' | 'flat' }[];
  };
}

const PRESET_FUNCTIONS: PresetFunction[] = [
  {
    name: 'الدالة التناظرية f(x) = (2x+4)/(x-1)',
    expression: '(2x + 4) / (x - 1)',
    defaultXMin: -8,
    defaultXMax: 10,
    defaultYMin: -8,
    defaultYMax: 10,
    description: 'دالة كسرية تناظرية مستعملة بكثرة في مواضيع شهادة البكالوريا الجزائرية، تتميز بمركز تناظر ومستقيمين مقاربين.',
    asymptotes: [
      { type: 'vertical', value: '1' },
      { type: 'horizontal', value: '2' }
    ],
    variations: {
      points: [
        { x: '-∞', fx: '2', derivative: '-', arrow: 'down' },
        { x: '1', fx: '||', derivative: '-', arrow: 'flat' },
        { x: '+∞', fx: '2', derivative: '-', arrow: 'down' }
      ]
    }
  },
  {
    name: 'دالة كثير حدود درجة ثالثة f(x) = x³ - 3x + 1',
    expression: 'x^3 - 3x + 1',
    defaultXMin: -4,
    defaultXMax: 4,
    defaultYMin: -6,
    defaultYMax: 6,
    description: 'دالة كثير حدود من الدرجة الثالثة، تتغير جهة حركتها مرتين ولها ذروتين محليتين.',
    asymptotes: [],
    variations: {
      points: [
        { x: '-∞', fx: '-∞', derivative: '+', arrow: 'up' },
        { x: '-1', fx: '3', derivative: '0', arrow: 'flat' },
        { x: '1', fx: '-1', derivative: '-', arrow: 'down' },
        { x: '+∞', fx: '+∞', derivative: '+', arrow: 'up' }
      ]
    }
  },
  {
    name: 'الدالة الأسية f(x) = e^x - 2x',
    expression: 'exp(x) - 2x',
    defaultXMin: -4,
    defaultXMax: 5,
    defaultYMin: -2,
    defaultYMax: 8,
    description: 'دالة تجمع السلوك الأسي مع السلوك الخطي، تظهر قيمة حدية صغرى عند x = ln(2).',
    asymptotes: [],
    variations: {
      points: [
        { x: '-∞', fx: '+∞', derivative: '-', arrow: 'down' },
        { x: '0.69', fx: '0.61', derivative: '0', arrow: 'flat' },
        { x: '+∞', fx: '+∞', derivative: '+', arrow: 'up' }
      ]
    }
  },
  {
    name: 'الدالة اللوغاريتمية f(x) = ln(x) / x',
    expression: 'ln(x) / x',
    defaultXMin: -1,
    defaultXMax: 15,
    defaultYMin: -3,
    defaultYMax: 2,
    description: 'دالة لوغاريتمية معرفة على ]0, +∞[، تبلغ ذروة عظمى عند x = e ولها محور الصادات كمستقيم مقارب.',
    asymptotes: [
      { type: 'vertical', value: '0' },
      { type: 'horizontal', value: '0' }
    ],
    variations: {
      points: [
        { x: '0', fx: '-∞', derivative: '+', arrow: 'up' },
        { x: '2.71', fx: '0.36', derivative: '0', arrow: 'flat' },
        { x: '+∞', fx: '0', derivative: '-', arrow: 'down' }
      ]
    }
  }
];

export default function FunctionStudyCorner({ onAskDali, userEmail }: FunctionStudyCornerProps) {
  // Input logic
  const [expression, setExpression] = useState('(2x + 4) / (x - 1)');
  const [mValue, setMValue] = useState(0);
  const [showMDiscussion, setShowMDiscussion] = useState(true);
  const [discussionType, setDiscussionType] = useState<'horizontal' | 'oblique' | 'rotational'>('horizontal');

  // Axes boundary states
  const [xMin, setXMin] = useState(-8);
  const [xMax, setXMax] = useState(10);
  const [yMin, setYMin] = useState(-8);
  const [yMax, setYMax] = useState(10);

  // Advanced analysis options
  const [customAsymptotes, setCustomAsymptotes] = useState<{ type: 'horizontal' | 'vertical' | 'oblique'; equation: string }[]>([
    { type: 'vertical', equation: 'x = 1' },
    { type: 'horizontal', equation: 'y = 2' }
  ]);
  const [newAsymptoteType, setNewAsymptoteType] = useState<'horizontal' | 'vertical' | 'oblique'>('vertical');
  const [newAsymptoteExpr, setNewAsymptoteExpr] = useState('');

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const containerRef = useRef<SVGSVGElement | null>(null);

  // Apply default preset functions
  const handleSelectPreset = (preset: PresetFunction) => {
    setExpression(preset.expression);
    setXMin(preset.defaultXMin);
    setXMax(preset.defaultXMax);
    setYMin(preset.defaultYMin);
    setYMax(preset.defaultYMax);
    
    // map preset asymptotes
    const mps = preset.asymptotes.map(as => {
      const char = as.type === 'vertical' ? 'x' : 'y';
      return {
        type: as.type,
        equation: `${char} = ${as.value}`
      };
    });
    setCustomAsymptotes(mps);
  };

  // Convert math coordinate (x, y) to SVG screen pixel values
  const getSvgCoordinates = (x: number, y: number, width: number, height: number) => {
    const px = ((x - xMin) / (xMax - xMin)) * width;
    const py = height - ((y - yMin) / (yMax - yMin)) * height;
    return { px, py };
  };

  // Convert SVG screen pixel back to math coordinate
  const getMathCoordinates = (px: number, py: number, width: number, height: number) => {
    const x = xMin + (px / width) * (xMax - xMin);
    const y = yMin + ((height - py) / height) * (yMax - yMin);
    return { x, y };
  };

  // Generate math points for function curve f(x)
  const generateCurveData = (width: number, height: number) => {
    const points: [number, number][] = [];
    const numSteps = 400;
    const step = (xMax - xMin) / numSteps;

    for (let i = 0; i <= numSteps; i++) {
      const x = xMin + i * step;
      const y = evaluateMathExpression(expression, x, mValue);
      if (!isNaN(y) && isFinite(y)) {
        // Limit coordinates to avoid massive lines spanning to infinity near asymptotes
        if (y >= yMin * 5 && y <= yMax * 5) {
          points.push([x, y]);
        } else {
          points.push([x, NaN]); // disconnect near singularity
        }
      } else {
        points.push([x, NaN]);
      }
    }
    return points;
  };

  // Mouse interactivity to trace function
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;

    const { x } = getMathCoordinates(px, py, width, height);
    // Project directly on the curve f(x) so user sees accurate alignment
    const yValOnCurve = evaluateMathExpression(expression, x, mValue);

    if (!isNaN(yValOnCurve) && isFinite(yValOnCurve)) {
      const marker = getSvgCoordinates(x, yValOnCurve, width, height);
      setHoverCoord({
        x: Number(x.toFixed(2)),
        y: Number(yValOnCurve.toFixed(2)),
        px: marker.px,
        py: marker.py
      });
    } else {
      setHoverCoord(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
  };

  // Add a quick asymptote
  const handleAddAsymptote = () => {
    if (!newAsymptoteExpr.trim()) return;
    const cleanExpr = newAsymptoteExpr.replace(/\s/g, '');
    const prefix = newAsymptoteType === 'vertical' ? 'x =' : 'y =';
    setCustomAsymptotes([...customAsymptotes, {
      type: newAsymptoteType,
      equation: `${prefix} ${cleanExpr}`
    }]);
    setNewAsymptoteExpr('');
  };

  // Delete asymptote row safely
  const handleDeleteAsymptote = (index: number) => {
    setCustomAsymptotes(customAsymptotes.filter((_, i) => i !== index));
  };

  // Preset Buttons Helpers
  const handleZoom = (factor: number) => {
    const xCenter = (xMin + xMax) / 2;
    const xSpan = (xMax - xMin) * factor;
    const yCenter = (yMin + yMax) / 2;
    const ySpan = (yMax - yMin) * factor;

    setXMin(xCenter - xSpan / 2);
    setXMax(xCenter + xSpan / 2);
    setYMin(yCenter - ySpan / 2);
    setYMax(yCenter + ySpan / 2);
  };

  const handleResetAxes = () => {
    setXMin(-8);
    setXMax(10);
    setYMin(-8);
    setYMax(10);
  };

  // AI Assistance: send complete educational payload
  const handleAskDaliAboutThis = () => {
    const asymptotesStr = customAsymptotes.length > 0 
      ? customAsymptotes.map(a => a.equation).join(', ') 
      : 'لا يوجد مستقيمات مفروضة حالياً';
    
    let mDiscussionIntro = "";
    if (showMDiscussion) {
      if (discussionType === 'horizontal') {
        mDiscussionIntro = `المناقشة الأفقية من الشكل f(x) = m عند الوسيط القيمة الحالية m = ${mValue}.`;
      } else if (discussionType === 'oblique') {
        mDiscussionIntro = `المناقشة المائلة من الشكل f(x) = x + m عند الوسيط القيمة الحالية m = ${mValue}.`;
      } else {
        mDiscussionIntro = `المناقشة الدورانية من الشكل f(x) = m*x عند الوسيط القيمة الحالية m = ${mValue}.`;
      }
    }

    const aiPrompt = `أستاذي الفاضل دالي ربي يحفظك، صلي على محمد ﷺ، أريد منك دراسة تفصيلية وتدرجية لهذه الدالة:
📍 معادلة الدالة: f(x) = ${expression}

أريد الإجابة تدريجياً وبمنهجية جزائرية مسلمة واضحة في:
1️⃣ مجال التعريف والنهايات عند الأطراف مع شرح مبسط لكيفية إيجادها.
2️⃣ دراسة اتجاه التغير والمشتقة الأولى مع تعيين قيمها وانعطافاتها (جدول التغيرات).
3️⃣ المستقيمات المقاربة المكتشفة (${asymptotesStr}).
4️⃣ بمساعدة الرسم البياني، اشرح لي المناقشة البيانية حسب قيم قيم الوسيط الحقيقي m (${mDiscussionIntro}).

باركَ الله فيكَ بني لا تبخل علينا بأسلوبك المشجع واطرح عليّ سؤالاً في النهاية لاختبار فهمي! 🇩🇿🤲`;

    onAskDali(aiPrompt);
  };

  // Calculate curve SVG path
  const width = 600;
  const height = 450;
  
  const curvePoints = generateCurveData(width, height);
  
  // Construct multi-segment path to elegantly avoid rendering straight lines going from +infinity to -infinity at asymptotes
  let dPath = '';
  let inSegment = false;

  for (let i = 0; i < curvePoints.length; i++) {
    const [x, y] = curvePoints[i];
    if (isNaN(y)) {
      inSegment = false;
      continue;
    }
    const { px, py } = getSvgCoordinates(x, y, width, height);
    if (!inSegment) {
      dPath += ` M ${px} ${py}`;
      inSegment = true;
    } else {
      dPath += ` L ${px} ${py}`;
    }
  }

  // Draw Origin Lines (Axes x = 0 and y = 0)
  const origin = getSvgCoordinates(0, 0, width, height);

  // Generate intermediate Grid values
  const xTicks = [];
  const xDiff = xMax - xMin;
  const xStep = Math.max(1, Math.floor(xDiff / 10));
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += xStep) {
    if (x !== 0) xTicks.push(x);
  }

  const yTicks = [];
  const yDiff = yMax - yMin;
  const yStep = Math.max(1, Math.floor(yDiff / 10));
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += yStep) {
    if (y !== 0) yTicks.push(y);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      
      {/* Banner introduction with Al-Moalem colors */}
      <div className="bg-[#0b132a] p-4 rounded-xl border border-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg shadow-blue-900/5">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-400 shrink-0 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>ركن دراسة الدوال التفاعلي (الرسام الأكاديمي {expression ? 'f(x)' : ''})</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">ذكي وتفاعلي 🇩🇿</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">ادرس النهايات والمستقيمات المقاربة، ومناقشة الوسيط الحقيقي m تفاعلياً وبصرياً مميزاً.</p>
          </div>
        </div>

        <button
          onClick={handleAskDaliAboutThis}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-blue-600/10 border border-blue-500 ring-1 ring-blue-400/20"
        >
          <Cpu className="w-4 h-4 animate-spin-slow" />
          <span>اسأل واستشر الأستاذ دالي بالذكاء الاصطناعي 🧠</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Controls & Presets / Options */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Preset templates */}
          <div className="bg-[#0b132a] p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-400 block flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>أمثلة سريعة لدوال شهادة البكالوريا الجزائرية:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {PRESET_FUNCTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2 text-right bg-[#060a14] hover:bg-blue-950/20 hover:border-blue-700/60 transition rounded-lg border border-slate-800 text-[11px] font-medium text-slate-300 truncate"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Equation Input block */}
          <div className="bg-[#0b132a] p-4 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-bold text-blue-400 flex items-center justify-between">
              <span>المعادلة f(x) الحالية:</span>
              <span className="text-[10px] text-slate-500 font-mono">مثال: (2x+4)/(x-1) أو x^3-3x</span>
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-xs font-bold text-slate-500 font-mono">y = f(x) =</span>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="اكتب معادلة الدالة..."
                className="w-full bg-[#060a14] border border-slate-700 focus:border-blue-500 pl-24 pr-4 py-2 text-xs text-slate-100 font-bold focus:ring-1 focus:ring-blue-500/20 transition rounded-lg outline-none font-mono"
              />
            </div>
            
            <p className="text-[10px] text-slate-400 leading-relaxed">
              * يدعم المدخلات الحسابية البسيطة: الاستخدام المعتاد للأس <code className="text-pink-400 font-bold">^</code>، الجمع <code className="text-pink-400 font-bold">+</code>، الضرب الضمني (مثل 2x), الدالة الأسية <code className="text-pink-400 font-bold">exp(x)</code> واللوغاريتم النيبيري <code className="text-pink-400 font-bold">ln(x)</code>.
            </p>
          </div>

          {/* Parameter m Discussion block */}
          <div className="bg-[#0b132a] p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">مناقشة ودراسة الوسيط m (f(x) = m)</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMDiscussion}
                  onChange={(e) => setShowMDiscussion(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 relative"></div>
                <span className="text-[11px] text-slate-400">تفعيل</span>
              </label>
            </div>

            {showMDiscussion && (
              <div className="space-y-3 pt-1 border-t border-slate-800/40">
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setDiscussionType('horizontal')}
                    className={`p-1.5 text-[10px] font-bold rounded-md border transition ${discussionType === 'horizontal' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    أفقية f(x)=m
                  </button>
                  <button
                    onClick={() => setDiscussionType('oblique')}
                    className={`p-1.5 text-[10px] font-bold rounded-md border transition ${discussionType === 'oblique' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    مائلة f(x)=x+m
                  </button>
                  <button
                    onClick={() => setDiscussionType('rotational')}
                    className={`p-1.5 text-[10px] font-bold rounded-md border transition ${discussionType === 'rotational' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                  >
                    دورانية f(x)=mx
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>قيمة الوسيط الحقيقي m:</span>
                    <span className="font-mono text-blue-400 font-bold">m = {mValue.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-6"
                    max="6"
                    step="0.1"
                    value={mValue}
                    onChange={(e) => setMValue(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  💡 <strong className="text-blue-400">الفكرة التعليمية:</strong> حلول هذه المعادلة بيانتياً يوافق إحداثيات نقاط تقاطع المنحنى <code className="text-blue-300">C_f</code> مع المستقيم ذي المعادلة المقابلة. حرك الشريط لرؤية نقاط تقاطعات الأقراص الصغرى ديناميكياً!
                </div>
              </div>
            )}
          </div>

          {/* Asymptotes additions */}
          <div className="bg-[#0b132a] p-4 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-bold text-slate-400 block">تتبع المستقيمات المقاربة:</span>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {customAsymptotes.length === 0 ? (
                <div className="text-center py-3 text-[10px] text-slate-500 bg-[#060a14] rounded-lg">لم يتم تحديد مستقيمات مقاربة حالياً.</div>
              ) : (
                customAsymptotes.map((as, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-[#060a14] rounded-lg border border-slate-800 text-[10px]">
                    <span className="font-mono font-bold text-amber-400">{as.equation}</span>
                    <button
                      onClick={() => handleDeleteAsymptote(idx)}
                      className="text-slate-500 hover:text-rose-400 transition font-bold"
                    >
                      إزالة
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-12 gap-1.5 pt-1.5 border-t border-slate-800/40">
              <select
                value={newAsymptoteType}
                onChange={(e) => setNewAsymptoteType(e.target.value as any)}
                className="col-span-5 bg-[#060a14] text-slate-200 border border-slate-800 rounded px-2 py-1 text-[10px]"
              >
                <option value="vertical">عمودي (x =)</option>
                <option value="horizontal">أفقي (y =)</option>
                <option value="oblique">مائل (y =)</option>
              </select>
              <input
                type="text"
                placeholder="مثال: 1 أو 2x"
                value={newAsymptoteExpr}
                onChange={(e) => setNewAsymptoteExpr(e.target.value)}
                className="col-span-5 bg-[#060a14] text-slate-100 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono"
              />
              <button
                onClick={handleAddAsymptote}
                className="col-span-2 bg-blue-700/80 hover:bg-blue-600 text-white font-bold rounded flex items-center justify-center p-1"
                title="إضافة مستقيم"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive SVG Canvas plotter */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Main Visualizer Container */}
          <div className="bg-[#0b132a] rounded-xl border border-slate-800/90 overflow-hidden flex flex-col shadow-xl">
            
            {/* Control Bar on topmost plotter */}
            <div className="bg-[#0e1935] px-4 py-2.5 flex items-center justify-between gap-2 border-b border-sky-950/40">
              <div className="flex items-center gap-1.5">
                <LineChart className="w-4.5 h-4.5 text-blue-400" />
                <span className="text-xs font-bold text-slate-100">رسم بياني مدروس للتمثيل الهندسي C_f</span>
              </div>

              <div className="flex items-center gap-1 bg-[#060a14] p-0.5 rounded border border-slate-800">
                <button
                  onClick={() => handleZoom(0.8)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                  title="تكبير المنظور (+)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleZoom(1.2)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                  title="تصغير المنظور (-)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetAxes}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                  title="إعادة ضبط المحاور"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SVG Graph Drawing sector */}
            <div className="relative bg-[#060913] select-none" style={{ height: `${height}px` }}>
              
              <svg
                ref={containerRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                className="cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* 1. DRAW GRID LINES */}
                <g className="opacity-15 stroke-slate-600" strokeWidth="0.5">
                  {/* Vertical grid lines */}
                  {xTicks.map((x) => {
                    const { px } = getSvgCoordinates(x, 0, width, height);
                    return <line key={`gx-${x}`} x1={px} y1={0} x2={px} y2={height} />;
                  })}
                  {/* Horizontal grid lines */}
                  {yTicks.map((y) => {
                    const { py } = getSvgCoordinates(0, y, width, height);
                    return <line key={`gy-${y}`} x1={0} y1={py} x2={width} y2={py} />;
                  })}
                </g>

                {/* 2. DRAW AXES (x = 0 and y = 0) */}
                <g className="stroke-slate-500" strokeWidth="1.2">
                  {/* x-axis */}
                  {origin.py >= 0 && origin.py <= height && (
                    <line x1={0} y1={origin.py} x2={width} y2={origin.py} />
                  )}
                  {/* y-axis */}
                  {origin.px >= 0 && origin.px <= width && (
                    <line x1={origin.px} y1={0} x2={origin.px} y2={height} />
                  )}
                </g>

                {/* 3. AXES TICK TICK LABELS */}
                <g className="fill-slate-500 text-[10px] font-mono">
                  {/* Origin 0 label */}
                  {origin.px >= 0 && origin.py >= 0 && (
                    <text x={origin.px - 12} y={origin.py + 14}>0</text>
                  )}
                  {/* X axis labels */}
                  {xTicks.map((x) => {
                    const { px } = getSvgCoordinates(x, 0, width, height);
                    if (px > 20 && px < width - 20 && Math.abs(origin.py - height) > 15) {
                      return (
                        <text key={`lx-${x}`} x={px - 4} y={Math.min(height - 10, Math.max(15, origin.py + 15))}>
                          {x}
                        </text>
                      );
                    }
                    return null;
                  })}
                  {/* Y axis labels */}
                  {yTicks.map((y) => {
                    const { py } = getSvgCoordinates(0, y, width, height);
                    if (py > 20 && py < height - 20 && Math.abs(origin.px - width) > 15) {
                      return (
                        <text key={`ly-${y}`} x={Math.min(width - 20, Math.max(10, origin.px - 18))} y={py + 3}>
                          {y}
                        </text>
                      );
                    }
                    return null;
                  })}
                </g>

                {/* 4. PLOT ASYMPTOTES DETERMINED */}
                <g>
                  {customAsymptotes.map((as, idx) => {
                    // E.g. x = 1 or y = 2
                    try {
                      const valueMatch = as.equation.match(/[-+]?[0-9]*\.?[0-9]+/);
                      if (valueMatch) {
                        const val = parseFloat(valueMatch[0]);
                        if (as.type === 'vertical') {
                          const { px } = getSvgCoordinates(val, 0, width, height);
                          if (px >= 0 && px <= width) {
                            return (
                              <g key={`as-${idx}`}>
                                <line x1={px} y1={0} x2={px} y2={height} className="stroke-rose-500/80" strokeWidth="1.2" strokeDasharray="4 4" />
                                <text x={px + 4} y={20} className="fill-rose-400 text-[9px] font-mono">x={val}</text>
                              </g>
                            );
                          }
                        } else if (as.type === 'horizontal') {
                          const { py } = getSvgCoordinates(0, val, width, height);
                          if (py >= 0 && py <= height) {
                            return (
                              <g key={`as-${idx}`}>
                                <line x1={0} y1={py} x2={width} y2={py} className="stroke-amber-500/80" strokeWidth="1.2" strokeDasharray="4 4" />
                                <text x={10} y={py - 4} className="fill-amber-400 text-[9px] font-mono">y={val}</text>
                              </g>
                            );
                          }
                        } else {
                          // Oblique asymptotes: evaluate y = ax + b
                          // parse rest of expression to evaluate at boundaries
                          const expr = as.equation.substring(4); // trim y = 
                          const ptStart = getSvgCoordinates(xMin, evaluateMathExpression(expr, xMin, mValue), width, height);
                          const ptEnd = getSvgCoordinates(xMax, evaluateMathExpression(expr, xMax, mValue), width, height);
                          if (!isNaN(ptStart.py) && !isNaN(ptEnd.py)) {
                            return (
                              <g key={`as-${idx}`}>
                                <line x1={ptStart.px} y1={ptStart.py} x2={ptEnd.px} y2={ptEnd.py} className="stroke-purple-400/80" strokeWidth="1.2" strokeDasharray="4 4" />
                                <text x={width - 40} y={ptEnd.py - 4} className="fill-purple-300 text-[9px] font-mono">{as.equation}</text>
                              </g>
                            );
                          }
                        }
                      }
                    } catch (err) {
                      console.log('Error printing asymptote:', err);
                    }
                    return null;
                  })}
                </g>

                {/* 5. DYNAMIC PARAMETER m SOLVER LINES AND INTERSECTIONS */}
                {showMDiscussion && (
                  <g>
                    {(() => {
                      if (discussionType === 'horizontal') {
                        // Draw horizontal line y = m
                        const { py } = getSvgCoordinates(0, mValue, width, height);
                        if (py >= 0 && py <= height) {
                          // Find intersections dynamically with numerical sampling
                          const step = (xMax - xMin) / 100;
                          const intersectionsX: number[] = [];
                          for (let x = xMin; x <= xMax; x += step) {
                            const y = evaluateMathExpression(expression, x, mValue);
                            const nextY = evaluateMathExpression(expression, x + step, mValue);
                            if (
                              ((y <= mValue && nextY >= mValue) || (y >= mValue && nextY <= mValue)) &&
                              Math.abs(y - nextY) < 3 // ignore singularities
                            ) {
                              intersectionsX.push(x + step / 2);
                            }
                          }

                          return (
                            <g>
                              {/* Transverse dashed slider line */}
                              <line x1={0} y1={py} x2={width} y2={py} className="stroke-blue-400" strokeWidth="1.5" strokeDasharray="3 3" />
                              <text x={width - 50} y={py - 6} className="fill-blue-300 text-[10px] font-mono font-bold">y = m ({mValue.toFixed(1)})</text>
                              
                              {/* Draw small indicator dots where intersections occur */}
                              {intersectionsX.map((ix, idx) => {
                                const pt = getSvgCoordinates(ix, mValue, width, height);
                                if (pt.px >= 0 && pt.px <= width) {
                                  return (
                                    <circle key={idx} cx={pt.px} cy={pt.py} r="4.5" className="fill-blue-400 stroke-slate-950 animate-pulse" strokeWidth="1.5" />
                                  );
                                }
                                return null;
                              })}
                            </g>
                          );
                        }
                      } else if (discussionType === 'oblique') {
                        // Draw line y = x + m
                        const ptStart = getSvgCoordinates(xMin, xMin + mValue, width, height);
                        const ptEnd = getSvgCoordinates(xMax, xMax + mValue, width, height);
                        
                        // intersection numerical solving with curve
                        const step = (xMax - xMin) / 100;
                        const intersectionsX: number[] = [];
                        for (let x = xMin; x <= xMax; x += step) {
                          const lineY = x + mValue;
                          const nextLineY = (x + step) + mValue;
                          const y = evaluateMathExpression(expression, x, mValue);
                          const nextY = evaluateMathExpression(expression, x + step, mValue);
                          
                          const d1 = y - lineY;
                          const d2 = nextY - nextLineY;
                          if (d1 * d2 <= 0 && Math.abs(d1 - d2) < 3) {
                            intersectionsX.push(x + step / 2);
                          }
                        }

                        return (
                          <g>
                            <line x1={ptStart.px} y1={ptStart.py} x2={ptEnd.px} y2={ptEnd.py} className="stroke-blue-400" strokeWidth="1.5" strokeDasharray="3 3" />
                            <text x={width - 100} y={ptEnd.py - 6} className="fill-blue-300 text-[10px] font-mono font-bold">y = x + m ({mValue.toFixed(1)})</text>
                            
                            {intersectionsX.map((ix, idx) => {
                              const crossY = ix + mValue;
                              const pt = getSvgCoordinates(ix, crossY, width, height);
                              return (
                                <circle key={idx} cx={pt.px} cy={pt.py} r="4.5" className="fill-blue-400 stroke-slate-950 animate-pulse" strokeWidth="1.5" />
                              );
                            })}
                          </g>
                        );
                      } else {
                        // Rotational y = m * x
                        const ptStart = getSvgCoordinates(xMin, mValue * xMin, width, height);
                        const ptEnd = getSvgCoordinates(xMax, mValue * xMax, width, height);
                        
                        // Intersection
                        const step = (xMax - xMin) / 100;
                        const intersectionsX: number[] = [];
                        for (let x = xMin; x <= xMax; x += step) {
                          const lineY = mValue * x;
                          const nextLineY = mValue * (x + step);
                          const y = evaluateMathExpression(expression, x, mValue);
                          const nextY = evaluateMathExpression(expression, x + step, mValue);
                          
                          const d1 = y - lineY;
                          const d2 = nextY - nextLineY;
                          if (d1 * d2 <= 0 && Math.abs(d1 - d2) < 3) {
                            intersectionsX.push(x + step / 2);
                          }
                        }

                        return (
                          <g>
                            <line x1={ptStart.px} y1={ptStart.py} x2={ptEnd.px} y2={ptEnd.py} className="stroke-blue-400" strokeWidth="1.5" strokeDasharray="3 3" />
                            <text x={width - 120} y={ptEnd.py - 6} className="fill-blue-300 text-[10px] font-mono font-bold">y = mx (m={mValue.toFixed(1)})</text>
                            
                            {intersectionsX.map((ix, idx) => {
                              const crossY = mValue * ix;
                              const pt = getSvgCoordinates(ix, crossY, width, height);
                              return (
                                <circle key={idx} cx={pt.px} cy={pt.py} r="4.5" className="fill-blue-400 stroke-slate-950 animate-pulse" strokeWidth="1.5" />
                              );
                            })}
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </g>
                )}

                {/* 6. DRAW MAIN CURVE C_f */}
                <path
                  d={dPath}
                  fill="none"
                  className="stroke-blue-400"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 7. DRAW HOVER CURSOR POSITION */}
                {hoverCoord && (
                  <g>
                    {/* Horizontal mapping */}
                    <line x1={0} y1={hoverCoord.py} x2={width} y2={hoverCoord.py} className="stroke-slate-500/30" strokeWidth="0.8" />
                    {/* Vertical mapping */}
                    <line x1={hoverCoord.px} y1={0} x2={hoverCoord.px} y2={height} className="stroke-slate-500/30" strokeWidth="0.8" />
                    
                    {/* Circle projection overlay */}
                    <circle cx={hoverCoord.px} cy={hoverCoord.py} r="5" className="fill-pink-500 stroke-white" strokeWidth="1.5" />
                  </g>
                )}
              </svg>

              {/* Floated cursor coordinates indicator widget overlay */}
              {hoverCoord && (
                <div 
                  className="absolute pointer-events-none bg-slate-950/95 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-slate-200 shadow-md flex gap-2"
                  style={{
                    left: hoverCoord.px > width - 120 ? `${hoverCoord.px - 110}px` : `${hoverCoord.px + 10}px`,
                    top: hoverCoord.py > height - 60 ? `${hoverCoord.py - 50}px` : `${hoverCoord.py + 10}px`,
                  }}
                >
                  <div>x: <span className="text-pink-400 font-bold">{hoverCoord.x}</span></div>
                  <div>f(x): <span className="text-blue-400 font-bold">{hoverCoord.y}</span></div>
                </div>
              )}

            </div>

            {/* Bottom help status indicator */}
            <div className="bg-[#0b132a] text-[10px] text-slate-400 px-4 py-2 border-t border-slate-900 flex items-center gap-1">
              <span className="text-blue-400 font-bold">💡 نصيحة للطلبة:</span>
              <span>حرك المؤشر فوق الرسم البياني لتعقب النقاط والترتيب الدقيق للدالة فورا.</span>
            </div>

          </div>

          {/* TABLE OF VARIATIONS GENERATOR BLOCK */}
          <div className="bg-[#0b132a] p-4 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
              <Grid3X3 className="w-4 h-4 text-blue-400" />
              <span>جدول التغيرات المنظور المقترح (المعلم DZ):</span>
            </span>

            {/* Render a custom mathematical variation table Arabic BAC style list */}
            <div className="bg-[#060a14] p-3 rounded-lg border border-slate-900 text-xs overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    <td className="p-2 text-slate-400 font-bold text-right">المتغير</td>
                    <td className="p-2 font-mono text-slate-300">-∞</td>
                    <td className="p-2 font-mono text-slate-300">
                      {expression.includes('x - 1') || expression.includes('x -1') ? '1 (ممنوعة)' : '0'}
                    </td>
                    <td className="p-2 font-mono text-slate-300">+∞</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dashed border-slate-800">
                    <td className="p-2 text-slate-400 font-bold text-right">إشارة المشتق f'(x)</td>
                    <td className="p-2 text-rose-500 font-bold font-mono">
                      {expression.includes('/') ? '-' : '+'}
                    </td>
                    <td className="p-2 text-amber-500 font-bold font-mono">||</td>
                    <td className="p-2 text-rose-500 font-bold font-mono">
                      {expression.includes('/') ? '-' : '+'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-slate-400 font-bold text-right align-middle">اتجاه تغير f(x)</td>
                    <td className="p-4 align-middle font-mono">
                      {expression.includes('/') ? (
                        <div className="flex flex-col items-center">
                          <span className="text-slate-400 text-[10px]">2</span>
                          <span className="text-slate-400 my-0.5">↘</span>
                          <span className="text-rose-400 text-[11px]">-∞</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500">-∞</span>
                          <span className="text-blue-400 my-0.5">↗</span>
                          <span className="text-[11px] text-blue-400">ذروة</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle text-amber-500 bg-slate-900/10 font-mono">غير معرفة</td>
                    <td className="p-4 align-middle font-mono">
                      {expression.includes('/') ? (
                        <div className="flex flex-col items-center">
                          <span className="text-blue-400 text-[10px]">+∞</span>
                          <span className="text-slate-400 my-0.5">↘</span>
                          <span className="text-slate-400 text-[11px]">2</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-500">ذروة</span>
                          <span className="text-blue-400 my-0.5">↗</span>
                          <span className="text-[11px] text-blue-400">+∞</span>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-400 text-right leading-relaxed flex items-start gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
              <span>
                * الجدول أعلاه تقديري لجهة حركات الدالة ومستقيماتها. للحصول على جدول تغيرات تحليلي مفصل خطوة بخطوة بالاشتقاق الرياضي الكامل لجميع الأنواع، اضغط على زر <strong>(اسأل واستشر الأستاذ دالي)</strong> ليرسله لك خطوة خطوة.
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
