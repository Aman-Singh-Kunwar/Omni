import React, { useEffect, useMemo, useState } from "react";
import { Search, Star, Filter, Package, CheckCircle, Clock, CreditCard, Heart } from "lucide-react";

function CustomerHomePage({
  userName,
  searchQuery,
  setSearchQuery,
  services,
  handleServiceSelect,
  stats,
  featuredProviders,
  favoriteWorkerIds,
  workersLoading,
  renderStars,
  handleProviderBook,
  onToggleFavorite
}) {
  const MOBILE_BREAKPOINT_PX = 640;
  const MOBILE_SERVICES_BATCH_SIZE = 4;
  const MOBILE_WORKERS_BATCH_SIZE = 2;
  const DEFAULT_WORKERS_BATCH_SIZE = 3;
  const [isMobileView, setIsMobileView] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT_PX : false)
  );
  const [visibleServicesCount, setVisibleServicesCount] = useState(MOBILE_SERVICES_BATCH_SIZE);
  const [visibleProvidersCount, setVisibleProvidersCount] = useState(DEFAULT_WORKERS_BATCH_SIZE);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileView(window.innerWidth < MOBILE_BREAKPOINT_PX);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setVisibleServicesCount(MOBILE_SERVICES_BATCH_SIZE);
    setVisibleProvidersCount(isMobileView ? MOBILE_WORKERS_BATCH_SIZE : DEFAULT_WORKERS_BATCH_SIZE);
  }, [normalizedQuery, featuredProviders.length, services.length, isMobileView]);

  const filteredServices = useMemo(() => {
    if (!normalizedQuery) {
      return services;
    }
    return services.filter((service) => service.name.toLowerCase().includes(normalizedQuery));
  }, [services, normalizedQuery]);

  const filteredProviders = useMemo(() => {
    if (!normalizedQuery) {
      return featuredProviders;
    }
    return featuredProviders.filter(
      (provider) =>
        provider.name.toLowerCase().includes(normalizedQuery) ||
        provider.service.toLowerCase().includes(normalizedQuery) ||
        (Array.isArray(provider.servicesProvided)
          ? provider.servicesProvided.some((service) => service.toLowerCase().includes(normalizedQuery))
          : false)
    );
  }, [featuredProviders, normalizedQuery]);
  const visibleServices = isMobileView && !normalizedQuery ? filteredServices.slice(0, visibleServicesCount) : filteredServices;
  const hasMoreServices = isMobileView && !normalizedQuery && filteredServices.length > visibleServicesCount;
  const workerBatchSize = isMobileView ? MOBILE_WORKERS_BATCH_SIZE : DEFAULT_WORKERS_BATCH_SIZE;
  const visibleProviders = isMobileView && !normalizedQuery ? filteredProviders.slice(0, visibleProvidersCount) : filteredProviders;
  const hasMoreProviders = isMobileView && !normalizedQuery && filteredProviders.length > visibleProvidersCount;

  return (
    <>
      <header className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome back, {userName}!</h2>
        <p className="text-gray-600 mt-1">Ready to book your next service?</p>
      </header>

      <div className="space-y-10">
        <div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for services like 'Plumber' or 'AC Repair'..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          <div className="bg-white/80 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white/80 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white/80 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white/80 p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Money Saved</p>
                <p className="text-2xl font-bold text-purple-600">INR {Number(stats.moneySaved || 0).toLocaleString("en-IN")}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Popular Services</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {visibleServices.map((service) => (
              <div
                key={service.id}
                onClick={() => handleServiceSelect(service)}
                className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group border"
              >
                <div className={`w-12 h-12 ${service.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{service.name}</h4>
                <p className="text-sm font-semibold text-blue-600 mb-2">From INR {Number(service.price || 0).toLocaleString("en-IN")}</p>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{service.rating}</span>
                  </div>
                  <span className="hidden sm:inline">{service.providers} providers</span>
                </div>
              </div>
            ))}
            {!filteredServices.length && (
              <p className="text-gray-600 col-span-full">No services match "{searchQuery.trim()}".</p>
            )}
          </div>
          {hasMoreServices && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleServicesCount((prev) => prev + MOBILE_SERVICES_BATCH_SIZE)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                More Services
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Currently Available Workers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleProviders.map((provider) => (
              <div key={provider.id} className="bg-white/80 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-base font-semibold text-gray-700">
                      {provider.image}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 break-words">{provider.name}</h4>
                      <p className="text-sm text-gray-600">
                        {Array.isArray(provider.servicesProvided) && provider.servicesProvided.length
                          ? provider.servicesProvided.join(", ")
                          : provider.service}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(provider.id)}
                    aria-label={
                      favoriteWorkerIds.includes(String(provider.id || ""))
                        ? `Remove ${provider.name} from favorites`
                        : `Add ${provider.name} to favorites`
                    }
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-50"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favoriteWorkerIds.includes(String(provider.id || ""))
                          ? "text-red-500 fill-current"
                          : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(provider.rating)}
                    <span className="text-sm text-gray-600 ml-2">({provider.reviews})</span>
                  </div>
                  <span className="font-semibold text-blue-600">Available</span>
                </div>
                <button
                  onClick={() => handleProviderBook(provider)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Book Now
                </button>
              </div>
            ))}
            {!workersLoading && !filteredProviders.length && !normalizedQuery && (
              <p className="text-gray-600 col-span-full">No workers are currently available.</p>
            )}
            {!workersLoading && !filteredProviders.length && normalizedQuery && (
              <p className="text-gray-600 col-span-full">No workers match "{searchQuery.trim()}".</p>
            )}
            {workersLoading && <p className="text-gray-600 col-span-full">Loading available workers...</p>}
          </div>
          {!workersLoading && hasMoreProviders && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleProvidersCount((prev) => prev + workerBatchSize)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                More Workers
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CustomerHomePage;
