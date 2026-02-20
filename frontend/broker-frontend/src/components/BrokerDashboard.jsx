import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import { Bell, Settings, MoreVertical, X, User, ChevronDown, LogOut, Briefcase, Wrench } from "lucide-react";
import { toShortErrorMessage, toStableId } from "@shared/utils/common";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";

const BrokerOverviewPage = lazy(() => import("../pages/broker/BrokerOverviewPage"));
const BrokerWorkersPage = lazy(() => import("../pages/broker/BrokerWorkersPage"));
const BrokerBookingsPage = lazy(() => import("../pages/broker/BrokerBookingsPage"));
const BrokerEarningsPage = lazy(() => import("../pages/broker/BrokerEarningsPage"));
const BrokerProfilePage = lazy(() => import("../pages/broker/BrokerProfilePage"));
const BrokerSettingsPage = lazy(() => import("../pages/broker/BrokerSettingsPage"));

function PageLoader() {
  return <div className="rounded-xl border bg-white/70 p-6 text-sm font-medium text-gray-600">Loading section...</div>;
}
const defaultLandingUrl = import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173";
const landingUrl = import.meta.env.VITE_LANDING_APP_URL || defaultLandingUrl;

const BrokerDashboard = ({ onLogout, customerUrl, workerUrl, userName = "Sarah Broker", userEmail = "", authToken = "" }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: "" });
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalEarnings: 0,
    activeBookings: 0,
    monthlyGrowth: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [topWorkers, setTopWorkers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
  const [notificationsHydrated, setNotificationsHydrated] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userName,
    email: userEmail,
    bio: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    brokerCode: ""
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: "", success: "" });
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);
  const notificationStorageKey = useMemo(
    () => `omni:notifications:broker:${String(userEmail || userName || "broker").trim().toLowerCase()}`,
    [userEmail, userName]
  );
  const navigate = useNavigate();
  const location = useLocation();
  const tabPathMap = {
    overview: "/",
    workers: "/workers",
    bookings: "/bookings",
    earnings: "/earnings",
    profile: "/profile",
    settings: "/settings"
  };
  const pathTabMap = Object.fromEntries(Object.entries(tabPathMap).map(([tab, path]) => [path, tab]));
  const activeTab = pathTabMap[location.pathname] || "overview";
  const needsDashboardData = !["profile", "settings"].includes(activeTab);
  const needsProfileData = activeTab === "profile";

  const navTabs = ["overview", "workers", "bookings", "earnings"];
  const notificationItems = useMemo(() => {
    const items = [];

    recentBookings.forEach((booking) => {
      const bookingId = toStableId(booking.id, `${booking.customer}-${booking.service}-${booking.status}`);
      const status = String(booking.status || "").toLowerCase();
      const serviceLabel = booking.service || "service";
      const customerLabel = booking.customer || "customer";

      if (["pending", "confirmed", "in-progress", "upcoming"].includes(status)) {
        items.push({
          id: `broker-request-${bookingId}`,
          title: "New booking request",
          message: `${customerLabel} requested ${serviceLabel}.`,
          targetTab: "bookings"
        });
      }

      if (status === "completed") {
        items.push({
          id: `broker-job-done-${bookingId}`,
          title: "Job done",
          message: `${serviceLabel} completed by ${booking.worker || "worker"}.`,
          targetTab: "bookings"
        });
        if (Number(booking.commission || 0) > 0) {
          items.push({
            id: `broker-earning-${bookingId}`,
            title: "Earning credited",
            message: `INR ${Number(booking.commission || 0).toLocaleString("en-IN")} commission added.`,
            targetTab: "earnings"
          });
        }
      }
    });

    if (Number(stats.activeBookings || 0) > 0) {
      items.push({
        id: "broker-active-bookings",
        title: "Active bookings",
        message: `${Number(stats.activeBookings)} active bookings in your network.`,
        targetTab: "bookings"
      });
    }

    return items.slice(0, 20);
  }, [recentBookings, stats.activeBookings]);
  const visibleNotificationItems = useMemo(
    () => {
      const clearedIds = new Set(clearedNotificationIds.map((id) => toStableId(id)).filter(Boolean));
      return notificationItems.filter((notification) => !clearedIds.has(toStableId(notification.id)));
    },
    [notificationItems, clearedNotificationIds]
  );
  const unreadNotificationCount = useMemo(
    () => {
      const readIds = new Set(readNotificationIds.map((id) => toStableId(id)).filter(Boolean));
      return visibleNotificationItems.filter((notification) => !readIds.has(toStableId(notification.id))).length;
    },
    [visibleNotificationItems, readNotificationIds]
  );

  useEffect(() => {
    if (!pathTabMap[location.pathname]) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = (tab) => {
    const nextPath = tabPathMap[tab] || "/";
    if (nextPath !== location.pathname) {
      navigate(nextPath);
    }
  };
  const hideUserMenu = useCallback(() => {
    setShowUserMenu(false);
  }, []);
  const hideNotifications = useCallback(() => {
    setShowNotifications(false);
  }, []);
  const hideMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);
  const closeQuickMenus = useCallback(() => {
    hideUserMenu();
    hideNotifications();
    hideMobileMenu();
  }, [hideMobileMenu, hideNotifications, hideUserMenu]);

  useQuickMenuAutoClose({
    userMenuRef,
    notificationMenuRef,
    navRef,
    hideUserMenu,
    hideNotifications,
    hideMobileMenu,
    closeQuickMenus,
    routePath: location.pathname,
    routeSearch: location.search
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notificationStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setReadNotificationIds(Array.isArray(parsed?.readIds) ? parsed.readIds.map((id) => toStableId(id)).filter(Boolean) : []);
      setClearedNotificationIds(Array.isArray(parsed?.clearedIds) ? parsed.clearedIds.map((id) => toStableId(id)).filter(Boolean) : []);
    } catch (_error) {
      setReadNotificationIds([]);
      setClearedNotificationIds([]);
    } finally {
      setNotificationsHydrated(true);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!notificationsHydrated) {
      return;
    }

    try {
      localStorage.setItem(
        notificationStorageKey,
        JSON.stringify({
          readIds: readNotificationIds,
          clearedIds: clearedNotificationIds
        })
      );
    } catch (_error) {
      // Ignore storage errors for private mode or blocked storage.
    }
  }, [notificationStorageKey, notificationsHydrated, readNotificationIds, clearedNotificationIds]);

  useEffect(() => {
    if (!needsDashboardData) {
      return;
    }

    const loadDashboard = async () => {
      try {
        const response = await api.get("/broker/dashboard", {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });

        setStats(response.data?.stats || { totalWorkers: 0, totalEarnings: 0, activeBookings: 0, monthlyGrowth: 0 });
        setRecentBookings(
          Array.isArray(response.data?.recentBookings)
            ? response.data.recentBookings.map((booking) => ({
                id: toStableId(booking.id || booking._id, `${booking.customer}-${booking.service}-${booking.status}`),
                customer: booking.customer || "Customer",
                service: booking.service || "Service",
                worker: booking.worker || "Worker",
                commission: Number(booking.commission || 0),
                status: booking.status || "pending"
              }))
            : []
        );
        setTopWorkers(Array.isArray(response.data?.topWorkers) ? response.data.topWorkers : []);
        if (response.data?.brokerCode) {
          setProfileForm((prev) => ({ ...prev, brokerCode: response.data.brokerCode }));
        }
      } catch (_error) {
        setStats({ totalWorkers: 0, totalEarnings: 0, activeBookings: 0, monthlyGrowth: 0 });
        setRecentBookings([]);
        setTopWorkers([]);
      }
    };

    loadDashboard();
  }, [authToken, needsDashboardData]);

  useEffect(() => {
    const fallback = {
      name: userName,
      email: userEmail,
      bio: "",
      gender: "",
      dateOfBirth: "",
      phone: "",
      brokerCode: ""
    };

    if (!authToken) {
      if (needsProfileData) {
        setProfileForm(fallback);
      }
      return;
    }

    if (!needsProfileData) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await api.get("/profile", {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const user = response.data?.user || {};
        const profile = response.data?.profile || {};
        setProfileForm({
          name: user.name || fallback.name,
          email: user.email || fallback.email,
          bio: profile.bio || "",
          gender: profile.gender || "",
          dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
          phone: profile.phone || "",
          brokerCode: profile.brokerCode || ""
        });
      } catch (_error) {
        setProfileForm(fallback);
      }
    };

    loadProfile();
  }, [authToken, userEmail, userName, needsProfileData]);

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === "customer" ? customerUrl : role === "worker" ? workerUrl : "";
    if (!targetUrl) {
      return;
    }

    if (!authToken) {
      setShowRoleSwitchModal(false);
      setShowUserMenu(false);
      window.location.href = targetUrl;
      return;
    }

    setRoleSwitchStatus({ loading: true, error: "" });
    try {
      const response = await api.post(
        "/auth/switch-role",
        { role },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const switchedToken = String(response.data?.token || "").trim();
      const redirectUrl = new URL(targetUrl);
      if (switchedToken) {
        redirectUrl.searchParams.set("authToken", switchedToken);
      }
      setShowRoleSwitchModal(false);
      setShowUserMenu(false);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setRoleSwitchStatus({
        loading: false,
        error: error.response?.data?.message || "Unable to switch role right now."
      });
    }
  };
  const handleMarkNotificationRead = (notificationId) => {
    const normalizedId = toStableId(notificationId);
    if (!normalizedId) {
      return;
    }
    setReadNotificationIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
  };
  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || "").trim();
    if (preferredTab && tabPathMap[preferredTab]) {
      return preferredTab;
    }

    const normalizedId = toStableId(notification.id).toLowerCase();
    if (normalizedId.startsWith("broker-earning-")) {
      return "earnings";
    }
    if (
      normalizedId.startsWith("broker-request-") ||
      normalizedId.startsWith("broker-job-done-") ||
      normalizedId.startsWith("broker-active-bookings")
    ) {
      return "bookings";
    }

    return activeTab;
  };
  const handleNotificationClick = (notification) => {
    const normalizedId = toStableId(notification?.id);
    if (!normalizedId) {
      return;
    }

    handleMarkNotificationRead(normalizedId);
    setShowNotifications(false);
    navigateToTab(resolveNotificationTab(notification));
  };
  const handleMarkAllNotificationsRead = () => {
    const nextIds = visibleNotificationItems.map((notification) => toStableId(notification.id)).filter(Boolean);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...nextIds])));
  };
  const handleClearNotifications = () => {
    const nextIds = visibleNotificationItems.map((notification) => toStableId(notification.id)).filter(Boolean);
    setClearedNotificationIds((prev) => Array.from(new Set([...prev, ...nextIds])));
  };

  const handleProfileSave = async () => {
    if (!authToken) {
      setProfileStatus({ loading: false, error: "Please log in to save your profile.", success: "" });
      return;
    }

    setProfileStatus({ loading: true, error: "", success: "" });
    try {
      const response = await api.put(
        "/profile",
        {
          name: profileForm.name,
          email: profileForm.email,
          bio: profileForm.bio,
          gender: profileForm.gender,
          dateOfBirth: profileForm.dateOfBirth || null,
          phone: profileForm.phone
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const user = response.data?.user || {};
      const profile = response.data?.profile || {};
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        bio: profile.bio || "",
        gender: profile.gender || "",
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
        phone: profile.phone || "",
        brokerCode: profile.brokerCode || prev.brokerCode || ""
      }));
      setProfileStatus({ loading: false, error: "", success: "Profile updated." });
    } catch (error) {
      setProfileStatus({
        loading: false,
        error: toShortErrorMessage(error.response?.data?.message, "Unable to save profile."),
        success: ""
      });
    }
  };

  const renderActivePage = () => {
    if (activeTab === "overview") {
      return <BrokerOverviewPage stats={stats} topWorkers={topWorkers} />;
    }

    if (activeTab === "workers") {
      return <BrokerWorkersPage authToken={authToken} />;
    }

    if (activeTab === "bookings") {
      return <BrokerBookingsPage authToken={authToken} />;
    }

    if (activeTab === "earnings") {
      return <BrokerEarningsPage authToken={authToken} stats={stats} />;
    }

    if (activeTab === "profile") {
      return (
        <BrokerProfilePage
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
        />
      );
    }

    return <BrokerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} />;
  };

  const GlobalStyles = () => (
    <style>
      {`
        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-gradient {
          background: linear-gradient(-45deg, #f0fdf4, #ecfdf5, #f0fdf4, #ecfdf5);
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
        <nav ref={navRef} className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3 sm:space-x-8">
                <a
                  href={landingUrl}
                  data-public-navigation="true"
                  className="flex items-center transition-opacity hover:opacity-90"
                  aria-label="Go to Omni landing page"
                >
                  <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                  <h1 className="text-lg font-bold text-gray-900 sm:text-2xl">
                    <span>Omni</span>
                    <span className="hidden sm:inline"> Broker</span>
                  </h1>
                </a>
                <div className="hidden lg:flex space-x-8">
                  {navTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => navigateToTab(tab)}
                      className={`py-4 border-b-2 font-medium text-sm capitalize transition-colors ${
                        activeTab === tab
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {tab === "overview" ? "dashboard" : tab.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div ref={notificationMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsMobileMenuOpen(false);
                      setShowNotifications((prev) => !prev);
                    }}
                    className="relative p-2 text-gray-500 hover:text-gray-700"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-6 w-6" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  </button>
                  {showNotifications && (
                    <div className="fixed left-14 right-2 top-16 z-50 overflow-hidden rounded-lg border bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[90vw]">
                      <div className="px-4 py-3 border-b flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                        <span className="text-xs text-gray-500">{unreadNotificationCount} unread</span>
                      </div>
                      <div className="h-44 overflow-y-auto">
                        {visibleNotificationItems.length ? (
                          visibleNotificationItems.map((notification) => {
                            const normalizedNotificationId = toStableId(notification.id);
                            const isRead = readNotificationIds.includes(normalizedNotificationId);
                            return (
                              <button
                                key={normalizedNotificationId}
                                type="button"
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                                  isRead ? "bg-gray-50" : "bg-green-50/40"
                                }`}
                              >
                                <p className={`text-sm ${isRead ? "font-medium text-gray-500" : "font-semibold text-gray-900"}`}>
                                  {notification.title}
                                </p>
                                <p className={`text-xs mt-0.5 ${isRead ? "text-gray-400" : "text-gray-600"}`}>{notification.message}</p>
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-4 py-6 text-sm text-gray-500">No notifications.</p>
                        )}
                      </div>
                      <div className="border-t px-3 py-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="rounded-md border border-green-200 bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Mark all read
                        </button>
                        <button
                          type="button"
                          onClick={handleClearNotifications}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Clear notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => navigateToTab("settings")} className="p-2 text-gray-500 hover:text-gray-700">
                  <Settings className="h-6 w-6" />
                </button>

                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setIsMobileMenuOpen(false);
                      setShowUserMenu((prev) => !prev);
                    }}
                    className="hidden lg:flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-50/80"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-left">
                      <p className="font-medium text-gray-900">{userName}</p>
                      <p className="text-gray-500 text-xs">Network Manager</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setIsMobileMenuOpen(false);
                      setShowUserMenu((prev) => !prev);
                    }}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                    aria-label="Open profile menu"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="fixed right-2 top-16 w-44 bg-white rounded-md shadow-lg py-1 z-50 border sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-48">
                      <button
                        onClick={() => {
                          navigateToTab("profile");
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setRoleSwitchStatus({ loading: false, error: "" });
                          setShowRoleSwitchModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Briefcase className="w-4 h-4 mr-3" />
                        Switch Role
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowNotifications(false);
                    setIsMobileMenuOpen((prev) => !prev);
                  }}
                  className="lg:hidden p-2 text-gray-500"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <MoreVertical className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      navigateToTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium capitalize ${
                      activeTab === tab ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    {tab === "overview" ? "dashboard" : tab.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <main className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoader />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        {showRoleSwitchModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-md p-4 sm:items-center">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Switch Role</h3>
              <p className="text-gray-600 text-center mb-6">Choose the role you want to switch to</p>

              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSwitch("customer")}
                  disabled={roleSwitchStatus.loading}
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
                  onClick={() => handleRoleSwitch("worker")}
                  disabled={roleSwitchStatus.loading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Switch to Worker</h4>
                      <p className="text-sm text-gray-600">Accept and complete service jobs</p>
                    </div>
                  </div>
                </button>
              </div>

              {roleSwitchStatus.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{roleSwitchStatus.error}</p>}

              <div className="mt-6">
                <button
                  onClick={() => {
                    setRoleSwitchStatus({ loading: false, error: "" });
                    setShowRoleSwitchModal(false);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
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

export default BrokerDashboard;
