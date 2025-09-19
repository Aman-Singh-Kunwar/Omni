import React, { useState } from 'react';
import omniLogo from '../../assets/images/omni-logo.png'; 
import {
  Search, Bell, User, Calendar, Clock, Star,
  Filter, Heart, Settings, LogOut, Home, Wrench,
  Zap, Paintbrush, Droplets, Wind, Scissors, Car,
  Phone, MessageCircle, CreditCard, CheckCircle, Package, Menu, X
} from 'lucide-react';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Sample data
  const services = [
    { id: 1, name: 'Plumber', icon: Droplets, color: 'bg-blue-500', rating: 4.8, providers: 234 },
    { id: 2, name: 'Electrician', icon: Zap, color: 'bg-yellow-500', rating: 4.9, providers: 189 },
    { id: 3, name: 'Carpenter', icon: Wrench, color: 'bg-orange-500', rating: 4.7, providers: 156 },
    { id: 4, name: 'Painter', icon: Paintbrush, color: 'bg-green-500', rating: 4.6, providers: 98 },
    { id: 5, name: 'AC Repair', icon: Wind, color: 'bg-cyan-500', rating: 4.8, providers: 87 },
    { id: 6, name: 'House Cleaning', icon: Home, color: 'bg-purple-500', rating: 4.9, providers: 267 },
    { id: 7, name: 'Hair Stylist', icon: Scissors, color: 'bg-pink-500', rating: 4.7, providers: 134 },
    { id: 8, name: 'Car Service', icon: Car, color: 'bg-gray-600', rating: 4.5, providers: 76 }
  ];

  const recentBookings = [
    { id: 1, service: 'Plumber', provider: 'John Smith', date: '2025-09-25', time: '10:00 AM', status: 'upcoming', rating: null },
    { id: 2, service: 'Electrician', provider: 'Mike Johnson', date: '2025-09-13', time: '2:00 PM', status: 'completed', rating: 4 },
    { id: 3, service: 'House Cleaning', provider: 'Sarah Wilson', date: '2025-10-08', time: '9:00 AM', status: 'upcoming', rating: null }
  ];

  const featuredProviders = [
    { id: 1, name: 'David Brown', service: 'Plumber', rating: 4.9, reviews: 156, image: '👨‍🔧', price: '₹500/hr' },
    { id: 2, name: 'Lisa Garcia', service: 'House Cleaning', rating: 5.0, reviews: 203, image: '👩‍💼', price: '₹300/hr' },
    { id: 3, name: 'Tom Wilson', service: 'Electrician', rating: 4.8, reviews: 142, image: '👨‍⚡', price: '₹600/hr' }
  ];

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleBookService = () => {
    alert(`Booking ${selectedService.name} service...`);
    setShowBookingModal(false);
    setSelectedService(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const navItems = [
    { id: 'home', name: 'Dashboard', icon: Home },
    { id: 'bookings', name: 'My Bookings', icon: Calendar },
    { id: 'favorites', name: 'Favorites', icon: Heart },
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Alex Johnson</p>
                  <p className="text-gray-500 text-xs">Customer</p>
                </div>
              </div>
              <div className="hidden md:flex items-center">
                <button className="text-gray-600 hover:text-red-600 transition-colors p-2">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              {/* Mobile menu button */}
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 text-gray-500">
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}
              <div className="border-t pt-2 mt-2">
                <button className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800">
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, Alex!</h2>
            <p className="text-gray-600 mt-1">Ready to book your next service? It's on us today, Happy Friday from Dehradun!</p>
          </header>

          {activeTab === 'home' && (
            <div className="space-y-10">
              {/* Search Bar */}
              <div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for services like 'Plumber' or 'AC Repair'..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Total Bookings</p><p className="text-2xl font-bold text-gray-900">24</p></div><Package className="w-8 h-8 text-blue-500" /></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Completed</p><p className="text-2xl font-bold text-green-600">22</p></div><CheckCircle className="w-8 h-8 text-green-500" /></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Upcoming</p><p className="text-2xl font-bold text-blue-600">2</p></div><Clock className="w-8 h-8 text-blue-500" /></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">Money Saved</p><p className="text-2xl font-bold text-purple-600">₹2,450</p></div><CreditCard className="w-8 h-8 text-purple-500" /></div></div>
              </div>

              {/* Services Grid */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Popular Services</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                  {services.map((service) => (
                    <div key={service.id} onClick={() => handleServiceSelect(service)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                      <div className={`w-12 h-12 ${service.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <service.icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{service.name}</h4>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-1"><Star className="w-4 h-4 text-yellow-400 fill-current" /><span>{service.rating}</span></div>
                        <span className="hidden sm:inline">{service.providers} providers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured Providers */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Top Rated Providers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredProviders.map((provider) => (
                    <div key={provider.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-3xl">{provider.image}</div>
                        <div><h4 className="font-semibold text-gray-900">{provider.name}</h4><p className="text-sm text-gray-600">{provider.service}</p></div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-1">{renderStars(provider.rating)}<span className="text-sm text-gray-600 ml-2">({provider.reviews})</span></div>
                        <span className="font-semibold text-blue-600">{provider.price}</span>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">Book Now</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Other Tabs Content */}
          {activeTab !== 'home' && (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm">
                {activeTab === 'bookings' && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h3>
                        <div className="space-y-4">
                        {recentBookings.map((booking) => (
                            <div key={booking.id} className="border p-4 sm:p-6 rounded-lg">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><Wrench className="w-6 h-6 text-blue-600" /></div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{booking.service}</h4>
                                        <p className="text-sm text-gray-600">with {booking.provider}</p>
                                        <p className="text-sm text-gray-500 mt-1">{booking.date} at {booking.time}</p>
                                    </div>
                                    </div>
                                    <div className="text-left sm:text-right w-full sm:w-auto">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                                    {booking.rating && <div className="flex items-center mt-2 justify-start sm:justify-end">{renderStars(booking.rating)}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Favorite Providers</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {featuredProviders.slice(0, 2).map((provider) => (
                            <div key={provider.id} className="border p-6 rounded-lg">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-3xl shrink-0">{provider.image}</div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                                    <p className="text-sm text-gray-600">{provider.service}</p>
                                    <div className="flex items-center space-x-1 mt-1">{renderStars(provider.rating)}<span className="text-sm text-gray-600">({provider.reviews})</span></div>
                                </div>
                                </div>
                                <Heart className="w-6 h-6 text-red-500 fill-current shrink-0" />
                            </div>
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">Book Again</button>
                                <div className="flex space-x-3">
                                <button className="flex-1 sm:flex-none px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"><MessageCircle className="w-5 h-5 text-gray-600" /></button>
                                <button className="flex-1 sm:flex-none px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"><Phone className="w-5 h-5 text-gray-600" /></button>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h3>
                        <div className="max-w-2xl mx-auto">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
                                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shrink-0"><User className="w-12 h-12 text-white" /></div>
                                <div>
                                <h4 className="text-xl font-semibold text-gray-900">Alex Johnson</h4>
                                <p className="text-gray-600">alex.johnson@email.com</p>
                                <p className="text-gray-600">+91 98765-43210</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" defaultValue="Alex Johnson" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" defaultValue="alex.johnson@email.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" defaultValue="+91 98765-43210" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea rows={3} placeholder="Enter your address" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div>
                                <button className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'settings' && (
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Settings</h3>
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="border rounded-lg p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Notifications</h4>
                                <div className="space-y-4">
                                <div className="flex items-center justify-between"><span className="text-gray-700">Email Notifications</span><button className="w-12 h-6 bg-blue-600 rounded-full p-0.5 flex items-center transition-colors"><span className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-6 transition-transform"></span></button></div>
                                <div className="flex items-center justify-between"><span className="text-gray-700">SMS Notifications</span><button className="w-12 h-6 bg-gray-300 rounded-full p-0.5 flex items-center transition-colors"><span className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform"></span></button></div>
                                </div>
                            </div>
                            <div className="border rounded-lg p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Privacy</h4>
                                <div className="space-y-4">
                                <div className="flex items-center justify-between"><span className="text-gray-700">Profile Visibility</span><button className="w-12 h-6 bg-blue-600 rounded-full p-0.5 flex items-center transition-colors"><span className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-6 transition-transform"></span></button></div>
                                <div className="flex items-center justify-between"><span className="text-gray-700">Show Booking History</span><button className="w-12 h-6 bg-gray-300 rounded-full p-0.5 flex items-center transition-colors"><span className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform"></span></button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          )}

        </div>
      </main>

      {/* Service Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 ${selectedService.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <selectedService.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Book {selectedService.name}</h3>
              <p className="text-gray-600">Choose your preferred date and time</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" min={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>9:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
                  <option>2:00 PM</option><option>3:00 PM</option><option>4:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} placeholder="Describe your requirements..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button onClick={() => setShowBookingModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleBookService} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Book Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
