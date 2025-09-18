import React, { useState } from 'react';
import { Calendar, DollarSign, Star, Clock, CheckCircle, XCircle, Bell, Settings, MapPin } from 'lucide-react';

const WorkerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with real data from your API
  const stats = {
    totalEarnings: 8500,
    completedJobs: 42,
    averageRating: 4.8,
    pendingRequests: 3
  };

  const jobRequests = [
    { 
      id: 1, 
      customer: 'Alice Johnson', 
      service: 'Kitchen Plumbing', 
      location: '123 Main St', 
      date: '2024-01-15', 
      time: '10:00 AM',
      amount: 150,
      status: 'pending'
    },
    { 
      id: 2, 
      customer: 'Robert Davis', 
      service: 'Electrical Outlet Installation', 
      location: '456 Oak Ave', 
      date: '2024-01-16', 
      time: '2:00 PM',
      amount: 120,
      status: 'pending'
    },
    { 
      id: 3, 
      customer: 'Maria Garcia', 
      service: 'Bathroom Repair', 
      location: '789 Pine St', 
      date: '2024-01-17', 
      time: '9:00 AM',
      amount: 200,
      status: 'pending'
    },
  ];

  const recentJobs = [
    { id: 1, customer: 'John Smith', service: 'Pipe Repair', amount: 180, rating: 5, status: 'completed' },
    { id: 2, customer: 'Emma Wilson', service: 'Faucet Installation', amount: 95, rating: 4, status: 'completed' },
    { id: 3, customer: 'David Brown', service: 'Water Heater Service', amount: 250, rating: 5, status: 'completed' },
  ];

  const handleJobAction = (jobId, action) => {
    console.log(`${action} job ${jobId}`);
    // Implement job acceptance/rejection logic here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Omni Worker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings className="h-6 w-6" />
              </button>
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">W</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'job-requests', 'schedule', 'earnings', 'profile'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="px-4 py-6 sm:px-0">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Earnings</dt>
                        <dd className="text-lg font-medium text-gray-900">${stats.totalEarnings}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed Jobs</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.completedJobs}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Star className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Average Rating</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.averageRating} ⭐</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.pendingRequests}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Jobs */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Job Requests Preview */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">New Job Requests</h3>
                    <button 
                      onClick={() => setActiveTab('job-requests')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {jobRequests.slice(0, 2).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{job.service}</p>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{job.location}</span>
                          </div>
                          <p className="text-sm text-gray-500">{job.date} at {job.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">${job.amount}</p>
                          <div className="flex space-x-2 mt-2">
                            <button 
                              onClick={() => handleJobAction(job.id, 'accept')}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleJobAction(job.id, 'reject')}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Completed Jobs */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Completed Jobs</h3>
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{job.customer}</p>
                          <p className="text-sm text-gray-500">{job.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">${job.amount}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                            <span>{job.rating}</span>
                          </div>
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
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Job Requests</h3>
                <div className="space-y-4">
                  {jobRequests.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{job.service}</h4>
                          <p className="text-gray-600 mt-1">Customer: {job.customer}</p>
                          <div className="flex items-center text-gray-500 mt-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{job.date} at {job.time}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">${job.amount}</p>
                          <div className="flex space-x-3 mt-4">
                            <button 
                              onClick={() => handleJobAction(job.id, 'accept')}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              Accept Job
                            </button>
                            <button 
                              onClick={() => handleJobAction(job.id, 'reject')}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">My Schedule</h3>
                <p className="text-gray-600">Schedule management functionality will be implemented here.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Earnings Overview</h3>
                <p className="text-gray-600">Earnings tracking and analytics will be implemented here.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Profile Settings</h3>
                <p className="text-gray-600">Profile management functionality will be implemented here.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkerDashboard;