import React, { memo } from 'react';
import { Save, X, RotateCcw, Layout } from 'lucide-react';
import { useLayoutEditor } from './LayoutEditorProvider';

// =============================================================================
// EDIT MODE TOOLBAR
// =============================================================================

export const EditModeToolbar = memo(() => {
    const {
        isEditing,
        saveLayout,
        cancelEdit,
        resetToDefault,
        hasUnsavedChanges,
    } = useLayoutEditor();

    const [isVisible, setIsVisible] = React.useState(false);

    // Handle mount animation
    React.useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
        }
    }, [isEditing]);

    if (!isEditing) return null;

    const handleSave = async () => {
        try {
            await saveLayout();
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    return (
        <div
            className={`
                sticky top-0 z-20 
                flex items-center gap-3 px-4 py-2.5 mb-3
                bg-white border border-gray-200 rounded-xl shadow-md
                transition-all duration-300 ease-out
                ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
            `}
        >
            <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
                <Layout className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">Redagavimo režimas</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <button
                    onClick={resetToDefault}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                    <RotateCcw className="w-4 h-4" />
                    Atkurti numatytąjį
                </button>

                <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                    <X className="w-4 h-4" />
                    Atšaukti
                </button>

                <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    <Save className="w-4 h-4" />
                    Išsaugoti
                </button>
            </div>
        </div>
    );
});

EditModeToolbar.displayName = 'EditModeToolbar';

// =============================================================================
// EDIT MODE BUTTON (for header)
// =============================================================================

interface EditLayoutButtonProps {
    className?: string;
}

export const EditLayoutButton = memo<EditLayoutButtonProps>(({ className }) => {
    const { isEditing, startEdit } = useLayoutEditor();

    if (isEditing) return null;

    return (
        <button
            onClick={startEdit}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover shadow-sm transition-colors ${className || ''}`}
        >
            <Layout className="w-3.5 h-3.5" />
            Redaguoti išdėstymą
        </button>
    );
});

EditLayoutButton.displayName = 'EditLayoutButton';

export default EditModeToolbar;
