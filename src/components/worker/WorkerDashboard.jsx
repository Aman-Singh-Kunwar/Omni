import React, { useState } from 'react';
import omniLogo from '../../assets/images/omni-logo.png';
import { Calendar, DollarSign, Star, Clock, CheckCircle, Bell, Settings, MapPin, Menu, X, User, ChevronDown, Briefcase, LogOut } from 'lucide-react';

const WorkerDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);

    // Mock data
    const stats = {
        totalEarnings: 8500,
        completedJobs: 42,
        averageRating: 4.8,
        pendingRequests: 3
    };

    const jobRequests = [
        { id: 1, customer: 'Alice Johnson', service: 'Kitchen Plumbing Leak', location: '123 Main St, Dehradun', date: '2025-09-20', time: '10:00 AM', amount: 150, status: 'pending' },
        { id: 2, customer: 'Robert Davis', service: 'Electrical Outlet Installation', location: '456 Oak Ave, Dehradun', date: '2025-09-21', time: '2:00 PM', amount: 120, status: 'pending' },
        { id: 3, customer: 'Maria Garcia', service: 'Bathroom Tile Repair', location: '789 Pine St, Dehradun', date: '2025-09-22', time: '9:00 AM', amount: 200, status: 'pending' },
    ];

    const recentJobs = [
        { id: 1, customer: 'John Smith', service: 'Pipe Repair', amount: 180, rating: 5, status: 'completed' },
        { id: 2, customer: 'Emma Wilson', service: 'Faucet Installation', amount: 95, rating: 4, status: 'completed' },
        { id: 3, customer: 'David Brown', service: 'Water Heater Service', amount: 250, rating: 5, status: 'completed' },
    ];
    
    const navTabs = ['overview', 'job-requests', 'schedule', 'earnings', 'profile'];

    const handleJobAction = (jobId, action) => {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} job ${jobId}`);
        // In a real app, you would update the state here
    };

    const handleRoleSwitch = (role) => {
        setShowRoleSwitchModal(false);
        setShowUserMenu(false);
        if (role === 'customer') {
            window.location.hash = '#/customer';
        } else if (role === 'broker') {
            window.location.hash = '#/broker';
        }
    };

    const StatCard = ({ icon: Icon, title, value }) => (
        <div className="bg-white/80 backdrop-blur-sm p-5 shadow-sm rounded-xl border">
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

    // Global Styles for Animation
    const GlobalStyles = () => (
        <style>
            {`
                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animated-gradient {
                    background: linear-gradient(-45deg, #fef3e2, #f3e8ff, #fef3e2, #f3e8ff);
                    background-size: 400% 400%;
                    animation: gradient-animation 15s ease infinite;
                }
            `}
        </style>
    );

    return (
        <>
            <GlobalStyles />
            <div className="min-h-screen bg-gray-50 animated-gradient">
                {/* Merged Header and Navigation */}
                <nav className="bg-white/80 shadow-sm border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-8">
                                <div className="flex items-center">
                                    <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                                    <h1 className="text-2xl font-bold text-gray-900">Omni Worker</h1>
                                </div>
                                <div className="hidden lg:flex space-x-8">
                                    {navTabs.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-4 border-b-2 font-medium text-sm capitalize transition-colors ${
                                                activeTab === tab
                                                    ? 'border-purple-500 text-purple-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {tab.replace('-', ' ')}
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
                                
                                {/* User Menu with Role Switch */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="hidden lg:flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-50/80"
                                    >
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-sm text-left">
                                            <p className="font-medium text-gray-900">John Worker</p>
                                            <p className="text-gray-500 text-xs">Service Provider</p>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-md shadow-lg py-1 z-50 border">
                                            <button
                                                onClick={() => setShowRoleSwitchModal(true)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                            >
                                                <Briefcase className="w-4 h-4 mr-3" />
                                                Switch Role
                                            </button>
                                            <button
                                                onClick={() => setShowUserMenu(false)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"
                                            >
                                                <LogOut className="w-4 h-4 mr-3" />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-500">
                                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {isMobileMenuOpen && (
                        <div className="lg:hidden border-t border-gray-200 bg-white/90 backdrop-blur-sm">
                            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                                {navTabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
                                        className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium capitalize ${
                                            activeTab === tab ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                    >
                                        {tab.replace('-', ' ')}
                                    </button>
                                ))}
                                <div className="border-t pt-2 mt-2">
                                    <button 
                                        onClick={() => setShowRoleSwitchModal(true)}
                                        className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                    >
                                        <Briefcase className="w-5 h-5" />
                                        <span>Switch Role</span>
                                    </button>
                                    <button className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50 hover:text-red-800">
                                        <LogOut className="w-5 h-5" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Main Content */}
                <main className="py-6 sm:py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                  <StatCard icon={DollarSign} title="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString('en-IN')}`} />
                                  <StatCard icon={CheckCircle} title="Completed Jobs" value={stats.completedJobs} />
                                  <StatCard icon={Star} title="Average Rating" value={stats.averageRating} />
                                  <StatCard icon={Clock} title="Pending Requests" value={stats.pendingRequests} />
                                </div>

                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border">
                                        <div className="px-4 py-5 sm:p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg leading-6 font-bold text-gray-900">New Job Requests</h3>
                                                <button onClick={() => setActiveTab('job-requests')} className="text-sm font-medium text-purple-600 hover:text-purple-800">View All</button>
                                            </div>
                                            <div className="space-y-3">
                                                {jobRequests.slice(0, 2).map((job) => (
                                                    <div key={job.id} className="p-3 bg-gray-50/80 backdrop-blur-sm rounded-lg">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-900">{job.service}</p>
                                                                <p className="text-sm text-gray-500 mt-1">{job.date} at {job.time}</p>
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900">₹{job.amount.toLocaleString('en-IN')}</p>
                                                        </div>
                                                        <div className="flex space-x-2 mt-3">
                                                            <button onClick={() => handleJobAction(job.id, 'accept')} className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-semibold">Accept</button>
                                                            <button onClick={() => handleJobAction(job.id, 'reject')} className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-semibold">Decline</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border">
                                        <div className="px-4 py-5 sm:p-6">
                                            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Recent Completed Jobs</h3>
                                            <div className="space-y-3">
                                                {recentJobs.map((job) => (
                                                    <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50/80 backdrop-blur-sm rounded-lg">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{job.customer}</p>
                                                            <p className="text-sm text-gray-500">{job.service}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-gray-900">₹{job.amount.toLocaleString('en-IN')}</p>
                                                            <div className="flex items-center justify-end text-sm text-gray-500"><Star className="h-4 w-4 text-yellow-400 fill-current mr-1" /><span>{job.rating}</span></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'job-requests' && (
                            <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border">
                                <div className="px-4 py-5 sm:p-6">
                                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">All Job Requests</h3>
                                    <div className="space-y-4">
                                        {jobRequests.map((job) => (
                                            <div key={job.id} className="border border-gray-200 rounded-lg p-4 bg-white/60 backdrop-blur-sm">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900">{job.service}</h4>
                                                        <p className="text-sm text-gray-600 mt-1">Customer: {job.customer}</p>
                                                        <div className="flex items-center text-sm text-gray-500 mt-2"><MapPin className="h-4 w-4 mr-1.5" /><span>{job.location}</span></div>
                                                        <div className="flex items-center text-sm text-gray-500 mt-1"><Calendar className="h-4 w-4 mr-1.5" /><span>{job.date} at {job.time}</span></div>
                                                    </div>
                                                    <div className="text-left sm:text-right w-full sm:w-auto">
                                                        <p className="text-xl font-bold text-gray-900">₹{job.amount.toLocaleString('en-IN')}</p>
                                                        <div className="flex space-x-3 mt-3">
                                                            <button onClick={() => handleJobAction(job.id, 'accept')} className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold transition-colors">Accept</button>
                                                            <button onClick={() => handleJobAction(job.id, 'reject')} className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 font-semibold transition-colors">Decline</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {['schedule', 'earnings', 'profile'].includes(activeTab) && (
                            <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl border">
                                <div className="px-4 py-8 sm:p-10 text-center">
                                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4 capitalize">{activeTab} Management</h3>
                                    <p className="text-gray-600">Full {activeTab} management functionality will be implemented here.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Role Switch Modal */}
                {showRoleSwitchModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Switch Role</h3>
                            <p className="text-gray-600 text-center mb-6">Choose the role you want to switch to</p>
                            
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleRoleSwitch('customer')}
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <User className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Switch to Customer</h4>
                                            <p className="text-sm text-gray-600">Find and book services</p>
                                        </div>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => handleRoleSwitch('broker')}
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Briefcase className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Switch to Broker</h4>
                                            <p className="text-sm text-gray-600">Manage network of professionals</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button 
                                    onClick={() => setShowRoleSwitchModal(false)} 
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default WorkerDashboard;