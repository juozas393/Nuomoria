import React from 'react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  className = "", 
  showText = true 
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 ${className}`}
      title="Atsijungti"
    >
      <ArrowRightOnRectangleIcon className="w-5 h-5" />
      {showText && <span>Atsijungti</span>}
    </button>
  );
};

export default LogoutButton;
