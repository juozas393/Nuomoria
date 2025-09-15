import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  pattern?: string;
  maxLength?: number;
  error?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SuggestionInput: React.FC<SuggestionInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  disabled = false,
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  error = false,
  onFocus,
  onBlur,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setShowSuggestions(filteredSuggestions.length > 0);
          onFocus?.();
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2F8481] focus:border-[#2F8481] ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${className}`}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                index === highlightedIndex ? 'bg-gray-100' : ''
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
