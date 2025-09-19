import React, { useState } from 'react';
import omniLogo from '../../assets/images/omni-logo.png'; 
import { Users, DollarSign, TrendingUp, Calendar, Bell, Settings, Menu, X, Star } from 'lucide-react';

const BrokerDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Mock data
    const stats = {
        totalWorkers: 45,
        totalEarnings: 12500,
        activeBookings: 18,
        monthlyGrowth: 15
    };

    const recentBookings = [
        { id: 1, customer: 'John Doe', service: 'Plumbing', worker: 'Mike Johnson', commission: 250, status: 'completed' },
        { id: 2, customer: 'Sarah Smith', service: 'Electrical', worker: 'Tom Wilson', commission: 180, status: 'in-progress' },
        { id: 3, customer: 'Bob Brown', service: 'Painting', worker: 'Lisa Davis', commission: 320, status: 'pending' },
        { id: 4, customer: 'Emily White', service: 'Cleaning', worker: 'Jane Foster', commission: 150, status: 'completed' },
    ];

    const topWorkers = [
        { id: 1, name: 'Mike Johnson', service: 'Plumbing', rating: 4.9, jobs: 28 },
        { id: 2, name: 'Tom Wilson', service: 'Electrical', rating: 4.8, jobs: 25 },
        { id: 3, name: 'Lisa Davis', service: 'Painting', rating: 4.7, jobs: 22 },
        { id: 4, name: 'Jane Foster', service: 'Cleaning', rating: 4.9, jobs: 35 },
    ];
    
    const navTabs = ['overview', 'workers', 'bookings', 'earnings'];

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in-progress': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const StatCard = ({ icon: Icon, title, value }) => (
        <div className="bg-white p-5 shadow-sm rounded-xl">
            <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 w-0 flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                    <dd className="flex items-baseline">
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </dd>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Merged Header and Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <div className="flex items-center">
                                <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                                <h1 className="text-2xl font-bold text-gray-900">Omni Broker</h1>
                            </div>
                            {/* Desktop Navigation */}
                            <div className="hidden lg:flex space-x-8">
                                {navTabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 border-b-2 font-medium text-sm capitalize transition-colors ${
                                            activeTab === tab
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <button className="relative p-2 text-gray-500 hover:text-gray-700">
                                <Bell className="h-6 w-6" />
                                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500"></span>
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-700">
                                <Settings className="h-6 w-6" />
                            </button>
                            <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">B</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-500">
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navTabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium capitalize ${
                                    activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="py-6 sm:py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                              <StatCard icon={Users} title="Total Workers" value={stats.totalWorkers} />
                              <StatCard icon={DollarSign} title="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString('en-IN')}`} />
                              <StatCard icon={Calendar} title="Active Bookings" value={stats.activeBookings} />
                              <StatCard icon={TrendingUp} title="Monthly Growth" value={`${stats.monthlyGrowth}%`} />
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                {/* Recent Bookings */}
                                <div className="bg-white shadow-sm rounded-xl">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Recent Bookings</h3>
                                        <div className="space-y-3">
                                            {recentBookings.map((booking) => (
                                                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{booking.customer}</p>
                                                        <p className="text-sm text-gray-500">{booking.service} - {booking.worker}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-gray-900">₹{booking.commission.toLocaleString('en-IN')}</p>
                                                        <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                            {booking.status.replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Workers */}
                                <div className="bg-white shadow-sm rounded-xl">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Top Performing Workers</h3>
                                        <div className="space-y-3">
                                            {topWorkers.map((worker) => (
                                                <div key={worker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-gray-700">{worker.name.charAt(0)}</span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                                                            <p className="text-sm text-gray-500">{worker.service}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-gray-900 flex items-center"><Star className="w-4 h-4 text-yellow-400 fill-current mr-1"/> {worker.rating}</p>
                                                        <p className="text-sm text-gray-500">{worker.jobs} jobs</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder content for other tabs */}
                    {['workers', 'bookings', 'earnings'].includes(activeTab) && (
                        <div className="bg-white shadow-sm rounded-xl">
                            <div className="px-4 py-8 sm:p-10 text-center">
                                <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4 capitalize">{activeTab} Management</h3>
                                <p className="text-gray-600">Full {activeTab} management functionality will be implemented here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default BrokerDashboard;

