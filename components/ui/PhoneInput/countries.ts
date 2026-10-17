export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  maxDigits?: number;
}

export const COUNTRIES: Country[] = [
  { name: 'Nigeria', code: 'NG', dialCode: '234', flag: '🇳🇬', maxDigits: 11 },
  { name: 'Ghana', code: 'GH', dialCode: '233', flag: '🇬🇭', maxDigits: 10 },
  { name: 'Kenya', code: 'KE', dialCode: '254', flag: '🇰🇪', maxDigits: 10 },
  { name: 'South Africa', code: 'ZA', dialCode: '27', flag: '🇿🇦', maxDigits: 10 },
  { name: 'Tanzania', code: 'TZ', dialCode: '255', flag: '🇹🇿', maxDigits: 10 },
  { name: 'Uganda', code: 'UG', dialCode: '256', flag: '🇺🇬', maxDigits: 10 },
  { name: 'Rwanda', code: 'RW', dialCode: '250', flag: '🇷🇼', maxDigits: 9 },
  { name: 'United States', code: 'US', dialCode: '1', flag: '🇺🇸', maxDigits: 10 },
  { name: 'United Kingdom', code: 'GB', dialCode: '44', flag: '🇬🇧', maxDigits: 11 },
  { name: 'Canada', code: 'CA', dialCode: '1', flag: '🇨🇦', maxDigits: 10 },
  { name: 'Australia', code: 'AU', dialCode: '61', flag: '🇦🇺', maxDigits: 10 },
  { name: 'India', code: 'IN', dialCode: '91', flag: '🇮🇳', maxDigits: 10 },
  { name: 'Cameroon', code: 'CM', dialCode: '237', flag: '🇨🇲', maxDigits: 9 },
  { name: 'Ivory Coast', code: 'CI', dialCode: '225', flag: '🇨🇮', maxDigits: 10 },
  { name: 'Senegal', code: 'SN', dialCode: '221', flag: '🇸🇳', maxDigits: 9 },
  { name: 'Mali', code: 'ML', dialCode: '223', flag: '🇲🇱', maxDigits: 8 },
  { name: 'Egypt', code: 'EG', dialCode: '20', flag: '🇪🇬', maxDigits: 10 },
  { name: 'Morocco', code: 'MA', dialCode: '212', flag: '🇲🇦', maxDigits: 9 },
  { name: 'Zambia', code: 'ZM', dialCode: '260', flag: '🇿🇲', maxDigits: 10 },
  { name: 'Zimbabwe', code: 'ZW', dialCode: '263', flag: '🇿🇼', maxDigits: 9 },
  { name: 'Germany', code: 'DE', dialCode: '49', flag: '🇩🇪', maxDigits: 11 },
  { name: 'France', code: 'FR', dialCode: '33', flag: '🇫🇷', maxDigits: 10 },
  { name: 'Italy', code: 'IT', dialCode: '39', flag: '🇮🇹', maxDigits: 10 },
  { name: 'Spain', code: 'ES', dialCode: '34', flag: '🇪🇸', maxDigits: 9 },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '971', flag: '🇦🇪', maxDigits: 9 },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '966', flag: '🇸🇦', maxDigits: 9 },
  { name: 'China', code: 'CN', dialCode: '86', flag: '🇨🇳', maxDigits: 11 },
  { name: 'Japan', code: 'JP', dialCode: '81', flag: '🇯🇵', maxDigits: 10 },
  { name: 'Brazil', code: 'BR', dialCode: '55', flag: '🇧🇷', maxDigits: 11 },
  { name: 'Mexico', code: 'MX', dialCode: '52', flag: '🇲🇽', maxDigits: 10 },
];
