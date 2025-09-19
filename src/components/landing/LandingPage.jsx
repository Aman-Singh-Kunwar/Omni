import React, { useState } from 'react';
import omniLogo from '../../assets/images/omni-logo.png';
import { User, Briefcase, Wrench, Phone, Mail, MapPin, Star, Clock, Shield, Check } from 'lucide-react';

const LandingPage = () => {
    const [selectedUserType, setSelectedUserType] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const userTypes = [
        { id: 'customer', title: 'Customer', description: 'Find trusted professionals for your home and business needs.', icon: User, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:shadow-blue-300/40', features: ['Browse Services', 'Book Appointments', 'Track Progress', 'Rate & Review'] },
        { id: 'broker', title: 'Broker', description: 'Connect customers with professionals and earn commissions.', icon: Briefcase, color: 'from-green-500 to-green-600', hoverColor: 'hover:shadow-green-300/40', features: ['Manage Network', 'Earn Commission', 'Analytics Dashboard', 'Client Relations'] },
        { id: 'worker', title: 'Service Provider', description: 'Offer your professional services and grow your business.', icon: Wrench, color: 'from-purple-500 to-purple-600', hoverColor: 'hover:shadow-purple-300/40', features: ['List Services', 'Manage Bookings', 'Receive Payments', 'Build Reputation'] },
    ];

    const services = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'AC Repair', 'Cleaning', 'Gardening', 'Appliance Repair', 'Pest Control', 'Home Security'];

    const handleUserTypeSelect = (userType) => {
        setSelectedUserType(userType);
        setShowLoginModal(true);
    };

    const handleLogin = () => {
        if (selectedUserType) {
            // GitHub Pages/static hosting friendly navigation
            window.location.href = `#/${selectedUserType}`;
        }
        setShowLoginModal(false);
        setSelectedUserType(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white/80 shadow-sm border-b backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-2">
                            <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                            <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
                        </div>
                        <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center space-x-1.5"><Phone className="w-4 h-4" /><span>+91 123-456-7890</span></div>
                            <div className="flex items-center space-x-1.5"><Mail className="w-4 h-4" /><span>support@omniservices.com</span></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 sm:py-24 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                        Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Omni</span> Service Platform
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
                        Connect with skilled professionals for all your service needs. Fast, reliable, and secure booking at your fingertips.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-12 mb-16">
                        <div className="text-center"><div className="text-3xl font-bold text-blue-600">15K+</div><div className="text-sm text-gray-500 mt-1">Active Professionals</div></div>
                        <div className="text-center"><div className="text-3xl font-bold text-green-600">75K+</div><div className="text-sm text-gray-500 mt-1">Happy Customers</div></div>
                        <div className="text-center"><div className="text-3xl font-bold text-purple-600">2M+</div><div className="text-sm text-gray-500 mt-1">Services Completed</div></div>
                    </div>
                </div>
            </section>

            {/* User Type Selection */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Choose Your Role</h3>
                    <p className="text-center text-gray-600 mb-12">Select how you'd like to use our platform</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        {userTypes.map((type) => (
                            <div key={type.id} onClick={() => handleUserTypeSelect(type.id)} className={`bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-2xl ${type.hoverColor} transition-all duration-300 cursor-pointer transform hover:-translate-y-2 flex flex-col`}>
                                <div className={`w-16 h-16 bg-gradient-to-r ${type.color} rounded-xl flex items-center justify-center mb-6 self-start`}>
                                    <type.icon className="w-8 h-8 text-white" />
                                </div>
                                <h4 className="text-2xl font-bold text-gray-900 mb-4">{type.title}</h4>
                                <p className="text-gray-600 mb-6 flex-grow">{type.description}</p>
                                <ul className="space-y-3 mb-8">
                                    {type.features.map((feature, index) => (
                                        <li key={index} className="flex items-center text-sm text-gray-700"><Check className="w-4 h-4 text-green-500 mr-3" />{feature}</li>
                                    ))}
                                </ul>
                                <button className={`w-full mt-auto bg-gradient-to-r ${type.color} text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity`}>
                                    Continue as {type.title}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services Preview */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Services We Offer</h3>
                    <p className="text-center text-gray-600 mb-12">Professional services for every need, available now in Dehradun.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {services.map((service, index) => (
                            <div key={index} className="bg-white rounded-full py-2 px-5 text-center shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
                                <div className="font-semibold text-gray-800">{service}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-10 text-center">
                        <div>
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-blue-600" /></div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">24/7 Availability</h4>
                            <p className="text-gray-600">Book services anytime, anywhere with our round-the-clock platform.</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8 text-green-600" /></div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">Verified Professionals</h4>
                            <p className="text-gray-600">All service providers are background-checked and highly rated.</p>
                        </div>
                        <div>
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-purple-600" /></div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">Secure Payments</h4>
                            <p className="text-gray-600">Safe and secure payment processing with multiple options.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center space-x-2 mb-4"><img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" /><h1 className="text-xl font-bold">Omni</h1></div>
                            <p className="text-gray-300 text-sm text-center md:text-left">Your trusted platform for connecting with skilled professionals. Fast, reliable, and secure.</p>
                            <div className="flex items-center space-x-1.5 text-gray-400 mt-4"><MapPin className="w-4 h-4" /><span>Serving across India</span></div>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-center md:text-left">Quick Links</h4>
                            <ul className="space-y-2 text-sm text-center md:text-left">
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Services</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">How It Works</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-center md:text-left">Support</h4>
                            <ul className="space-y-2 text-sm text-center md:text-left">
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-center md:text-left">Connect With Us</h4>
                            <div className="flex justify-center md:justify-start space-x-4">
                                <a href="#" className="text-gray-300 hover:text-white transition-colors">Facebook</a>
                                <a href="#" className="text-gray-300 hover:text-white transition-colors">Twitter</a>
                                <a href="#" className="text-gray-300 hover:text-white transition-colors">Instagram</a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm"><p>&copy; 2025 Omni. All rights reserved.</p></div>
                </div>
            </footer>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                            {selectedUserType && userTypes.find((type) => type.id === selectedUserType)?.title} Login
                        </h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter your email"/></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter your password"/></div>
                        </div>
                        <div className="flex space-x-4 mt-6">
                            <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>
                            <button type="button" onClick={handleLogin} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Login</button>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4">Don't have an account? <a href="#" className="text-blue-600 hover:underline font-semibold">Sign up</a></p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
