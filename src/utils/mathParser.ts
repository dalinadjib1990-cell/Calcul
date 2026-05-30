/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type TokenType = 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'FUNCTION' | 'CONSTANT' | 'COMMA' | 'VARIABLE';

interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(str: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  // Normalize string
  let s = str
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-') // Unicode minus
    .replace(/π/g, 'pi');
    
  while (i < s.length) {
    const char = s[i];
    
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char });
      i++;
      continue;
    }
    if ('+-*/^!%'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }
    
    // Numeric tokens
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }
    
    // Alphabetical tokens: functions or constants
    if (/[a-zA-Z]/.test(char)) {
      let nameStr = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        nameStr += s[i];
        i++;
      }
      
      const lowerName = nameStr.toLowerCase();
      if (lowerName === 'x') {
        tokens.push({ type: 'VARIABLE', value: 'x' });
      } else if (lowerName === 'pi' || lowerName === 'e') {
        tokens.push({ type: 'CONSTANT', value: lowerName });
      } else if ([
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 
        'ln', 'log', 'sqrt', 'cbrt', 'abs', 'exp'
      ].includes(lowerName)) {
        tokens.push({ type: 'FUNCTION', value: lowerName });
      } else {
        throw new Error(`رمز غير معروف: ${nameStr}`);
      }
      continue;
    }
    
    throw new Error(`رمز غير صالح في التعبير: ${char}`);
  }
  
  return tokens;
}

interface OperatorDef {
  prec: number;
  assoc: 'L' | 'R';
}

const operators: { [key: string]: OperatorDef } = {
  '+': { prec: 1, assoc: 'L' },
  '-': { prec: 1, assoc: 'L' },
  '*': { prec: 2, assoc: 'L' },
  '/': { prec: 2, assoc: 'L' },
  '%': { prec: 2, assoc: 'L' },
  '^': { prec: 3, assoc: 'R' },
  'u-': { prec: 4, assoc: 'R' }, // unary minus
  'u+': { prec: 4, assoc: 'R' }, // unary plus
  '!': { prec: 5, assoc: 'L' }, // factorial (postfix)
};

export function evaluateTokens(tokens: Token[], isRadian: boolean = false, xValue: number = 0): number {
  const outputQueue: any[] = [];
  const operatorStack: any[] = [];
  
  // Detect unary operators and implicit multiplication
  const processedTokens: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;
    
    if (prev) {
      const isPrevNumeric = prev.type === 'NUMBER' || prev.type === 'CONSTANT' || prev.type === 'VARIABLE' || prev.type === 'RPAREN';
      const isCurrentNumeric = current.type === 'NUMBER' || current.type === 'CONSTANT' || current.type === 'VARIABLE' || current.type === 'LPAREN' || current.type === 'FUNCTION';
      
      if (
        (prev.type === 'RPAREN' && isCurrentNumeric) ||
        (prev.type === 'NUMBER' && (current.type === 'CONSTANT' || current.type === 'VARIABLE' || current.type === 'FUNCTION' || current.type === 'LPAREN')) ||
        (prev.type === 'CONSTANT' && (current.type === 'NUMBER' || current.type === 'CONSTANT' || current.type === 'VARIABLE' || current.type === 'FUNCTION' || current.type === 'LPAREN')) ||
        (prev.type === 'VARIABLE' && (current.type === 'NUMBER' || current.type === 'CONSTANT' || current.type === 'VARIABLE' || current.type === 'FUNCTION' || current.type === 'LPAREN'))
      ) {
        processedTokens.push({ type: 'OPERATOR', value: '*' });
      }
    }
    
    // Check for unary minus/plus
    if (current.type === 'OPERATOR' && (current.value === '-' || current.value === '+')) {
      const isUnary = !prev || prev.type === 'OPERATOR' || prev.type === 'LPAREN' || prev.type === 'COMMA';
      if (isUnary) {
        processedTokens.push({
          type: 'OPERATOR',
          value: current.value === '-' ? 'u-' : 'u+'
        });
        continue;
      }
    }
    
    processedTokens.push(current);
  }
  
  // Shunting-Yard conversion
  for (let i = 0; i < processedTokens.length; i++) {
    const token = processedTokens[i];
    
    if (token.type === 'NUMBER') {
      outputQueue.push({ type: 'NUMBER', value: parseFloat(token.value) });
    } else if (token.type === 'CONSTANT') {
      const val = token.value === 'pi' ? Math.PI : Math.E;
      outputQueue.push({ type: 'NUMBER', value: val });
    } else if (token.type === 'VARIABLE') {
      outputQueue.push({ type: 'NUMBER', value: xValue });
    } else if (token.type === 'FUNCTION') {
      operatorStack.push(token);
    } else if (token.type === 'COMMA') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== 'LPAREN') {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length === 0) {
        throw new Error('الفاصلة ليست في موضع مناسب');
      }
    } else if (token.type === 'OPERATOR') {
      const op1 = token.value;
      let topOp = operatorStack.length > 0 ? operatorStack[operatorStack.length - 1] : null;
      
      while (
        topOp && 
        (topOp.type === 'OPERATOR' || topOp.type === 'FUNCTION') &&
        (topOp.type === 'FUNCTION' || 
          (operators[topOp.value].prec > operators[op1].prec) ||
          (operators[topOp.value].prec === operators[op1].prec && operators[op1].assoc === 'L')
        )
      ) {
        outputQueue.push(operatorStack.pop());
        topOp = operatorStack.length > 0 ? operatorStack[operatorStack.length - 1] : null;
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== 'LPAREN') {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length === 0) {
        throw new Error('قوس غير متطابق: مفقود فتح القوس (');
      }
      operatorStack.pop(); // Pop LPAREN
      
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
        outputQueue.push(operatorStack.pop());
      }
    }
  }
  
  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op.type === 'LPAREN' || op.type === 'RPAREN') {
      throw new Error('قوس غير متطابق: مفقود إغلاق القوس )');
    }
    outputQueue.push(op);
  }
  
  // Evaluation of RPN
  const evalStack: number[] = [];
  
  function factorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity; // prevent overflow
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let f = 2; f <= n; f++) res *= f;
    return res;
  }
  
  for (let i = 0; i < outputQueue.length; i++) {
    const node = outputQueue[i];
    
    if (node.type === 'NUMBER') {
      evalStack.push(node.value);
    } else if (node.type === 'OPERATOR') {
      const op = node.value;
      if (op === 'u-') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('صيغة خاطئة للعملية سالب أحادي');
        evalStack.push(-val);
      } else if (op === 'u+') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('صيغة خاطئة للعملية موجب أحادي');
        evalStack.push(val);
      } else if (op === '!') {
        const val = evalStack.pop();
        if (val === undefined) throw new Error('صيغة خاطئة للمضروب');
        evalStack.push(factorial(val));
      } else {
        const num2 = evalStack.pop();
        const num1 = evalStack.pop();
        if (num1 === undefined || num2 === undefined) {
          throw new Error('تعبير ناقص أو خاطئ');
        }
        
        switch (op) {
          case '+': evalStack.push(num1 + num2); break;
          case '-': evalStack.push(num1 - num2); break;
          case '*': evalStack.push(num1 * num2); break;
          case '/': 
            if (num2 === 0) throw new Error('غير مسموح بالقسمة على الصفر');
            evalStack.push(num1 / num2); 
            break;
          case '%': evalStack.push(num1 % num2); break;
          case '^': evalStack.push(Math.pow(num1, num2)); break;
          default:
            throw new Error(`رمز مجهول: ${op}`);
        }
      }
    } else if (node.type === 'FUNCTION') {
      const func = node.value;
      let arg = evalStack.pop();
      if (arg === undefined) throw new Error(`معامل مفقود للدالة ${func}`);
      
      let res = 0;
      switch (func) {
        case 'sin':
          const sinAngle = isRadian ? arg : (arg * Math.PI) / 180;
          res = Math.sin(sinAngle);
          break;
        case 'cos':
          const cosAngle = isRadian ? arg : (arg * Math.PI) / 180;
          res = Math.cos(cosAngle);
          break;
        case 'tan':
          const tanAngle = isRadian ? arg : (arg * Math.PI) / 180;
          res = Math.tan(tanAngle);
          break;
        case 'asin':
          if (arg < -1 || arg > 1) throw new Error('نطاق غير صالح لدالة الجيب العكسية asin');
          const asinVal = Math.asin(arg);
          res = isRadian ? asinVal : (asinVal * 180) / Math.PI;
          break;
        case 'acos':
          if (arg < -1 || arg > 1) throw new Error('نطاق غير صالح لدالة جيب التمام العكسية acos');
          const acosVal = Math.acos(arg);
          res = isRadian ? acosVal : (acosVal * 180) / Math.PI;
          break;
        case 'atan':
          const atanVal = Math.atan(arg);
          res = isRadian ? atanVal : (atanVal * 180) / Math.PI;
          break;
        case 'ln':
          if (arg <= 0) throw new Error('يجب أن يكون معامل اللوغاريتم أكبر من صفر');
          res = Math.log(arg);
          break;
        case 'log':
          if (arg <= 0) throw new Error('يجب أن يكون معامل اللوغاريتم أكبر من صفر');
          res = Math.log10(arg);
          break;
        case 'sqrt':
          if (arg < 0) throw new Error('غير مسموح بالجذر التربيعي لعدد سالب');
          res = Math.sqrt(arg);
          break;
        case 'cbrt':
          res = Math.cbrt(arg);
          break;
        case 'abs':
          res = Math.abs(arg);
          break;
        case 'exp':
          res = Math.exp(arg);
          break;
        default:
          throw new Error(`دالة غير مجهولة: ${func}`);
      }
      evalStack.push(res);
    }
  }
  
  if (evalStack.length !== 1) {
    throw new Error('فشل تقييم التعبير بشكل صحيح');
  }
  
  // Format very small/imprecise JS float values (e.g., sin(pi) should be 0, not 1e-16)
  let result = evalStack[0];
  if (Math.abs(result) < 1e-14) {
    result = 0;
  }
  return result;
}

export function parseAndEvaluate(expr: string, isRadian: boolean = false, xValue: number = 0): number {
  if (!expr || expr.trim() === '') return 0;
  return parseAndEvaluateRaw(expr, isRadian, xValue);
}

function parseAndEvaluateRaw(expr: string, isRadian: boolean, xValue: number): number {
  // Replace functions to lowercase and match
  let cleaned = expr.trim();
  const tokens = tokenize(cleaned);
  return evaluateTokens(tokens, isRadian, xValue);
}
