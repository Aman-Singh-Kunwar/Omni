import React from 'react';
// import omniLogo from '../../assets/images/omni-logo.png';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              {/* Your logo here */}
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="text-2xl font-bold">Omni</span>
            </div>
            <p className="text-gray-300">
              Your trusted platform for connecting with skilled professionals.
            </p>
          </div>
          {/* Add more footer content as needed */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;