import React, { forwardRef, ChangeEvent } from 'react';
import { COUNTRIES } from './countries';
import styles from './PhoneInput.module.css';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, className, ...props }, ref) => {
    // 1. Determine the country code and local number from the incoming value
    let matchedCountry = COUNTRIES[0]; // Default: NG
    let digits = value.replace(/\D/g, '');
    let localNumber = value;

    if (value.startsWith('+')) {
      // Find the country with the longest matching dialCode (e.g. +1 vs +1242)
      const possibleCountries = COUNTRIES.filter(c => value.startsWith('+' + c.dialCode))
                                         .sort((a, b) => b.dialCode.length - a.dialCode.length);
      if (possibleCountries.length > 0) {
        matchedCountry = possibleCountries[0];
        localNumber = value.slice(matchedCountry.dialCode.length + 1).trim();
      }
    } else if (digits.length >= 10) {
      // Handle legacy numbers (e.g. 234803... or 0803...)
      if (digits.startsWith('234')) {
        matchedCountry = COUNTRIES[0]; // NG
        localNumber = digits.slice(3);
      } else if (digits.startsWith('0')) {
        matchedCountry = COUNTRIES[0]; // NG
        localNumber = digits; // allow the 0 to stay in the local part if they just typed it
      }
    }

    const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      const country = COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
      if (onChange) {
        const cleanLocal = localNumber.replace(/\D/g, '');
        // When changing country, ensure we pass the combined value
        onChange(cleanLocal ? `+${country.dialCode}${cleanLocal}` : `+${country.dialCode}`);
      }
    };

    const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
      const newLocal = e.target.value;
      if (onChange) {
        const cleanLocal = newLocal.replace(/\D/g, '');
        // Strip leading zero for Nigerian numbers if it's being concatenated with +234
        const adjustedLocal = (matchedCountry.code === 'NG' && cleanLocal.startsWith('0'))
          ? cleanLocal.slice(1)
          : cleanLocal;
          
        onChange(adjustedLocal ? `+${matchedCountry.dialCode}${adjustedLocal}` : `+${matchedCountry.dialCode}`);
      }
    };

    return (
      <div className={`${styles.container} ${className || ''}`}>
        <select 
          className={styles.countrySelect}
          value={matchedCountry.code}
          onChange={handleCountryChange}
          aria-label="Country Code"
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.dialCode}
            </option>
          ))}
        </select>
        <span className={styles.chevron}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
        </span>
        <input
          {...props}
          ref={ref}
          type="tel"
          className={styles.input}
          value={localNumber}
          onChange={handleNumberChange}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
