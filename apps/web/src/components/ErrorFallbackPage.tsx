import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorFallbackPage: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Kažkas nutiko</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Įvyko netikėta klaida. Pabandykite atnaujinti puslapį.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2F8481] text-white rounded-xl font-medium hover:bg-[#267673] transition-colors duration-200"
            >
                <RefreshCw className="w-4 h-4" />
                Bandyti dar kartą
            </button>
        </div>
    </div>
);

export default ErrorFallbackPage;
