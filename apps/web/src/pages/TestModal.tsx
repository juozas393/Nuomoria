import React, { useState } from 'react';
import AddAddressModal from '../components/properties/AddAddressModal';

/**
 * Test page to view AddAddressModal without authentication
 * Access at: /test-modal
 */
const TestModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Test Page - AddAddressModal
                </h1>
                <p className="text-gray-600 mb-6">
                    This page is for testing the AddAddressModal component without authentication.
                </p>

                <button
                    onClick={() => setIsOpen(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    Open Modal
                </button>

                <AddAddressModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSave={(data) => {
                        console.log('Saved data:', data);
                        alert('Data saved (check console)');
                    }}
                />
            </div>
        </div>
    );
};

export default TestModal;
