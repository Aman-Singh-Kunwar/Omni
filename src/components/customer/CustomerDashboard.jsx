import React, { useState } from 'react';
import { 
  Search, Bell, User, MapPin, Calendar, Clock, Star, 
  Filter, Heart, Settings, LogOut, Home, Wrench, 
  Zap, Paintbrush, Droplets, Wind, Scissors, Car,
  Shield, Phone, MessageCircle, CreditCard, ChevronRight,
  Plus, CheckCircle, AlertCircle, Package
} from 'lucide-react';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    { id: 1, service: 'Plumber', provider: 'John Smith', date: '2024-09-05', time: '10:00 AM', status: 'completed', rating: 5 },
    { id: 2, service: 'Electrician', provider: 'Mike Johnson', date: '2024-09-03', time: '2:00 PM', status: 'completed', rating: 4 },
    { id: 3, service: 'House Cleaning', provider: 'Sarah Wilson', date: '2024-09-08', time: '9:00 AM', status: 'upcoming', rating: null }
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

  const sidebarItems = [
    { id: 'home', name: 'Dashboard', icon: Home },
    { id: 'bookings', name: 'My Bookings', icon: Calendar },
    { id: 'favorites', name: 'Favorites', icon: Heart },
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ServiceHub</h1>
          </div>
        </div>
        
        <nav className="mt-6">
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-blue-50 transition-colors ${
                  activeTab === item.id ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-6 left-6 right-6">
          <button className="flex items-center space-x-3 text-gray-700 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back, Alex!</h2>
              <p className="text-gray-600">Find the perfect service for your needs</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-gray-900">Alex Johnson</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeTab === 'home' && (
            <div>
              {/* Search Bar */}
              <div className="mb-8">
                <div className="relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Filter className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-900">24</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">22</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Upcoming</p>
                      <p className="text-2xl font-bold text-blue-600">2</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Money Saved</p>
                      <p className="text-2xl font-bold text-purple-600">₹2,450</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Services Grid */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Popular Services</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {services.map((service) => {
                    const IconComponent = service.icon;
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className={`w-12 h-12 ${service.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{service.name}</h4>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{service.rating}</span>
                          </div>
                          <span>{service.providers} providers</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Featured Providers */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Top Rated Providers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredProviders.map((provider) => (
                    <div key={provider.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                          {provider.image}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                          <p className="text-sm text-gray-600">{provider.service}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-1">
                          {renderStars(provider.rating)}
                          <span className="text-sm text-gray-600 ml-2">({provider.reviews})</span>
                        </div>
                        <span className="font-semibold text-blue-600">{provider.price}</span>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Book Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h3>
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Wrench className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{booking.service}</h4>
                          <p className="text-sm text-gray-600">{booking.provider}</p>
                          <p className="text-sm text-gray-500">{booking.date} at {booking.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        {booking.rating && (
                          <div className="flex items-center mt-2">
                            {renderStars(booking.rating)}
                          </div>
                        )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredProviders.slice(0, 2).map((provider) => (
                  <div key={provider.id} className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                          {provider.image}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                          <p className="text-sm text-gray-600">{provider.service}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {renderStars(provider.rating)}
                            <span className="text-sm text-gray-600">({provider.reviews})</span>
                          </div>
                        </div>
                      </div>
                      <Heart className="w-6 h-6 text-red-500 fill-current" />
                    </div>
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Book Again
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h3>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">Alex Johnson</h4>
                    <p className="text-gray-600">alex.johnson@email.com</p>
                    <p className="text-gray-600">+91 98765-43210</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      defaultValue="Alex Johnson"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      defaultValue="alex.johnson@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      defaultValue="+91 98765-43210"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      rows={3}
                      placeholder="Enter your address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">Settings</h3>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-4">Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Email Notifications</span>
                      <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">SMS Notifications</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-4">Privacy</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Profile Visibility</span>
                      <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Show Booking History</span>
                      <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 ${selectedService.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {React.createElement(selectedService.icon, { className: "w-8 h-8 text-white" })}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Book {selectedService.name}</h3>
              <p className="text-gray-600">Choose your preferred date and time</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>9:00 AM</option>
                  <option>10:00 AM</option>
                  <option>11:00 AM</option>
                  <option>2:00 PM</option>
                  <option>3:00 PM</option>
                  <option>4:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe your requirements..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBookService}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Book Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;