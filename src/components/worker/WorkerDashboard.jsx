import React, { useState } from 'react';
import omniLogo from '../../assets/images/omni-logo.png'; 
import { Calendar, DollarSign, Star, Clock, CheckCircle, Bell, Settings, MapPin, Menu, X } from 'lucide-react';

const WorkerDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                                <h1 className="text-2xl font-bold text-gray-900">Omni Worker</h1>
                            </div>
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
                            <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">W</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-500">
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navTabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
                                    className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium capitalize ${
                                        activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                                >
                                    {tab.replace('-', ' ')}
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
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                              <StatCard icon={DollarSign} title="Total Earnings" value={`₹${stats.totalEarnings.toLocaleString('en-IN')}`} />
                              <StatCard icon={CheckCircle} title="Completed Jobs" value={stats.completedJobs} />
                              <StatCard icon={Star} title="Average Rating" value={stats.averageRating} />
                              <StatCard icon={Clock} title="Pending Requests" value={stats.pendingRequests} />
                            </div>

                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                <div className="bg-white shadow-sm rounded-xl">
                                    <div className="px-4 py-5 sm:p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg leading-6 font-bold text-gray-900">New Job Requests</h3>
                                            <button onClick={() => setActiveTab('job-requests')} className="text-sm font-medium text-blue-600 hover:text-blue-800">View All</button>
                                        </div>
                                        <div className="space-y-3">
                                            {jobRequests.slice(0, 2).map((job) => (
                                                <div key={job.id} className="p-3 bg-gray-50 rounded-lg">
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

                                <div className="bg-white shadow-sm rounded-xl">
                                    <div className="px-4 py-5 sm:p-6">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Recent Completed Jobs</h3>
                                        <div className="space-y-3">
                                            {recentJobs.map((job) => (
                                                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                        <div className="bg-white shadow-sm rounded-xl">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">All Job Requests</h3>
                                <div className="space-y-4">
                                    {jobRequests.map((job) => (
                                        <div key={job.id} className="border border-gray-200 rounded-lg p-4">
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

export default WorkerDashboard;
