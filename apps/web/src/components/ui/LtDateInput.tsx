import React, { useRef, useCallback, memo } from 'react';
import { Calendar } from 'lucide-react';

/**
 * LtDateInput — Lithuanian date input that always shows yyyy-mm-dd
 * 
 * Read-only text display + native calendar picker opened on click.
 * This ensures consistent yyyy-mm-dd display regardless of browser/OS locale.
 * 
 * Drop-in replacement for <input type="date"> with the same value/onChange API.
 */

interface LtDateInputProps {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    min?: string;
    max?: string;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    required?: boolean;
}

const LtDateInput = memo<LtDateInputProps>(({
    value,
    onChange,
    min,
    max,
    className = '',
    placeholder = 'Pasirinkite datą',
    disabled = false,
    id,
    required,
}) => {
    const hiddenRef = useRef<HTMLInputElement>(null);

    const openPicker = useCallback(() => {
        if (disabled) return;
        try {
            hiddenRef.current?.showPicker();
        } catch {
            hiddenRef.current?.focus();
            hiddenRef.current?.click();
        }
    }, [disabled]);

    const handleHiddenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ target: { value: e.target.value } });
    }, [onChange]);

    return (
        <div className="relative">
            {/* Visible read-only text showing yyyy-mm-dd */}
            <input
                type="text"
                id={id}
                value={value || ''}
                readOnly
                onClick={openPicker}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={`${className} pr-9 cursor-pointer`}
                style={{ caretColor: 'transparent' }}
            />

            {/* Calendar icon */}
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 transition-colors disabled:opacity-50"
                tabIndex={-1}
                aria-label="Pasirinkti datą"
            >
                <Calendar className={`w-4 h-4 ${value ? 'text-teal-500' : 'text-gray-400'}`} />
            </button>

            {/* Hidden native date input for calendar popup */}
            <input
                ref={hiddenRef}
                type="date"
                value={value}
                onChange={handleHiddenChange}
                min={min}
                max={max}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
            />
        </div>
    );
});

LtDateInput.displayName = 'LtDateInput';
export default LtDateInput;
