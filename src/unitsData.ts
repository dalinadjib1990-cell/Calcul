/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UnitCategory } from './types';

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    nameAr: 'المسافة والطول',
    nameEn: 'Length & Distance',
    units: [
      { id: 'm', symbol: 'm', nameAr: 'متر', nameEn: 'Meter', ratio: 1 },
      { id: 'km', symbol: 'km', nameAr: 'كيلومتر', nameEn: 'Kilometer', ratio: 1000 },
      { id: 'cm', symbol: 'cm', nameAr: 'سنتيمتر', nameEn: 'Centimeter', ratio: 0.01 },
      { id: 'mm', symbol: 'mm', nameAr: 'مليمتر', nameEn: 'Millimeter', ratio: 0.001 },
      { id: 'mi', symbol: 'mi', nameAr: 'ميل', nameEn: 'Mile', ratio: 1609.344 },
      { id: 'yard', symbol: 'yd', nameAr: 'ياردة', nameEn: 'Yard', ratio: 0.9144 },
      { id: 'foot', symbol: 'ft', nameAr: 'قدم', nameEn: 'Foot', ratio: 0.3048 },
      { id: 'inch', symbol: 'in', nameAr: 'بوصة', nameEn: 'Inch', ratio: 0.0254 }
    ]
  },
  {
    id: 'weight',
    nameAr: 'الوزن والكتلة',
    nameEn: 'Weight & Mass',
    units: [
      { id: 'kg', symbol: 'kg', nameAr: 'كيلوغرام', nameEn: 'Kilogram', ratio: 1 },
      { id: 'g', symbol: 'g', nameAr: 'غرام', nameEn: 'Gram', ratio: 0.001 },
      { id: 'mg', symbol: 'mg', nameAr: 'مليغرام', nameEn: 'Milligram', ratio: 0.000001 },
      { id: 'lb', symbol: 'lb', nameAr: 'رطل (باوند)', nameEn: 'Pound', ratio: 0.45359237 },
      { id: 'oz', symbol: 'oz', nameAr: 'أونصة', nameEn: 'Ounce', ratio: 0.028349523 }
    ]
  },
  {
    id: 'area',
    nameAr: 'المساحة',
    nameEn: 'Area',
    units: [
      { id: 'm2', symbol: 'm²', nameAr: 'متر مربع', nameEn: 'Square Meter', ratio: 1 },
      { id: 'km2', symbol: 'km²', nameAr: 'كيلومتر مربع', nameEn: 'Square Kilometer', ratio: 1000000 },
      { id: 'hectare', symbol: 'ha', nameAr: 'هكتار', nameEn: 'Hectare', ratio: 10000 },
      { id: 'acre', symbol: 'ac', nameAr: 'فدان', nameEn: 'Acre', ratio: 4046.856 },
      { id: 'sqft', symbol: 'ft²', nameAr: 'قدم مربع', nameEn: 'Square Foot', ratio: 0.092903 }
    ]
  },
  {
    id: 'speed',
    nameAr: 'السرعة',
    nameEn: 'Speed',
    units: [
      { id: 'm_s', symbol: 'm/s', nameAr: 'متر في الثانية', nameEn: 'Meter per Second', ratio: 1 },
      { id: 'km_h', symbol: 'km/h', nameAr: 'كيلومتر في الساعة', nameEn: 'Kilometer per Hour', ratio: 1 / 3.6 },
      { id: 'mph', symbol: 'mph', nameAr: 'ميل في الساعة', nameEn: 'Miles per Hour', ratio: 0.44704 },
      { id: 'knot', symbol: 'kt', nameAr: 'عقدة برية/بحرية', nameEn: 'Knot', ratio: 0.514444 }
    ]
  },
  {
    id: 'temperature',
    nameAr: 'درجة الحرارة',
    nameEn: 'Temperature',
    units: [
      { id: 'C', symbol: '°C', nameAr: 'سيلسيوس', nameEn: 'Celsius', ratio: 1 },
      { id: 'F', symbol: '°F', nameAr: 'فهرنهايت', nameEn: 'Fahrenheit', ratio: 1 },
      { id: 'K', symbol: 'K', nameAr: 'كيلفن', nameEn: 'Kelvin', ratio: 1 }
    ]
  }
];

export function convertUnits(
  value: number,
  fromUnitId: string,
  toUnitId: string,
  categoryId: string
): number {
  if (isNaN(value)) return NaN;
  if (fromUnitId === toUnitId) return value;

  if (categoryId === 'temperature') {
    // Custom non-linear temperature formulas
    if (fromUnitId === 'C') {
      if (toUnitId === 'F') return (value * 9) / 5 + 32;
      if (toUnitId === 'K') return value + 273.15;
    } else if (fromUnitId === 'F') {
      if (toUnitId === 'C') return ((value - 32) * 5) / 9;
      if (toUnitId === 'K') return ((value - 32) * 5) / 9 + 273.15;
    } else if (fromUnitId === 'K') {
      if (toUnitId === 'C') return value - 273.15;
      if (toUnitId === 'F') return ((value - 273.15) * 9) / 5 + 32;
    }
    return value;
  }

  // Linear conversions via ratio
  const category = UNIT_CATEGORIES.find((cat) => cat.id === categoryId);
  if (!category) return NaN;

  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) return NaN;

  // Convert to base unit first (using fromUnit ratio), then to target unit
  const baseValue = value * fromUnit.ratio;
  return baseValue / toUnit.ratio;
}
