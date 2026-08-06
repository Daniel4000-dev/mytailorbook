import React, { forwardRef, ChangeEvent, useState } from 'react';
import { COUNTRIES, type Country } from './countries';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './PhoneInput.module.css';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, className, ...props }, ref) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const handleCountrySelect = (country: Country) => {
      if (onChange) {
        const cleanLocal = localNumber.replace(/\D/g, '');
        onChange(cleanLocal ? `+${country.dialCode}${cleanLocal}` : `+${country.dialCode}`);
      }
      setIsSheetOpen(false);
      setSearchQuery('');
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

    const filteredCountries = COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.dialCode.includes(searchQuery)
    );

    return (
      <div className={`${styles.container} ${className || ''}`}>
        <button 
          type="button" 
          className={styles.countryBtn} 
          onClick={() => setIsSheetOpen(true)}
          aria-label="Select Country"
        >
          {matchedCountry.flag} +{matchedCountry.dialCode}
          <Symbol name="expand_more" size={18} />
        </button>
        <input
          {...props}
          ref={ref}
          type="tel"
          className={styles.input}
          value={localNumber}
          onChange={handleNumberChange}
        />

        <BottomSheet 
          isOpen={isSheetOpen} 
          onClose={() => setIsSheetOpen(false)}
          title="Select Country"
          noPadding
          subHeader={
            <div className={styles.searchWrap}>
              <Symbol name="search" size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                className={styles.searchInput} 
                placeholder="Search country or code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          }
        >
          <div className={styles.countryList}>
            {filteredCountries.length > 0 ? (
              filteredCountries.map(c => (
                <button 
                  key={c.code} 
                  type="button" 
                  className={styles.countryItem}
                  onClick={() => handleCountrySelect(c)}
                >
                  <span>{c.flag}</span>
                  <span className={styles.countryName}>{c.name}</span>
                  <span className={styles.countryDialCode}>+{c.dialCode}</span>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>No countries found</div>
            )}
          </div>
        </BottomSheet>
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
