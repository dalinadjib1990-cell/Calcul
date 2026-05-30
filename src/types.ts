/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  isRadian: boolean;
  isError: boolean;
}

export interface ScientificConstant {
  nameAr: string;
  nameEn: string;
  symbol: string;
  value: string;
  displayValue: string;
  unit: string;
  category: 'physics' | 'chemistry' | 'math';
}

export interface UnitCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  units: {
    id: string;
    symbol: string;
    nameAr: string;
    nameEn: string;
    ratio: number; // Ratio relative to base unit (or custom logic like temp)
  }[];
}
