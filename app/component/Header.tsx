import React from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-[#fffdf5] border-b z-50 w-screen overflow-x-hidden">
      <div className="w-full max-w-full md:max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Header (shown on all screen sizes) */}
        <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <svg className="w-6 h-6 text-blue-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L12 12M12 12L20 4M12 12L4 20M12 12L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-bold text-lg">exa</span>
        </a>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">We're hiring</span>
          <button 
            className="p-1.5 text-gray-500 hover:bg-[var(--secondary-darker)] rounded-md transition-colors"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header; 
