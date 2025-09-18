import React from 'react';
import omniLogo from '../../assets/images/omni-logo.png'; // Adjust path as needed

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <img 
              src={omniLogo} 
              alt="Omni Logo" 
              className="h-8 w-8 mr-2" // Adjust size as needed
            />
            <span className="text-2xl font-bold text-gray-900">Omni</span>
          </div>
          
          {/* Contact Info */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <span>📞 +91 123-456-7890</span>
            </div>
            <div className="flex items-center">
              <span>📧 support@omniservices.com</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;