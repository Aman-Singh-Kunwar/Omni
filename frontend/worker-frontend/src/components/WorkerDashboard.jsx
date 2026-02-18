import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import WorkerOverviewPage from "../pages/worker/WorkerOverviewPage";
import WorkerJobRequestsPage from "../pages/worker/WorkerJobRequestsPage";
import WorkerSchedulePage from "../pages/worker/WorkerSchedulePage";
import WorkerEarningsPage from "../pages/worker/WorkerEarningsPage";
import WorkerReviewsPage from "../pages/worker/WorkerReviewsPage";
import WorkerProfilePage from "../pages/worker/WorkerProfilePage";
import WorkerSettingsPage from "../pages/worker/WorkerSettingsPage";
import { Bell, Settings, Menu, X, User, ChevronDown, Briefcase, LogOut } from "lucide-react";

function toStableId(value, fallback = "") {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    if (typeof value.$oid === "string") {
      return value.$oid;
    }
    if (typeof value.id === "string" || typeof value.id === "number") {
      return String(value.id);
    }
    if (typeof value._id === "string" || typeof value._id === "number") {
      return String(value._id);
    }
    if (typeof value.toString === "function") {
      const next = value.toString();
      if (next && next !== "[object Object]") {
        return next;
      }
    }
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(fallback || "");
    }
  }

  return String(fallback || "");
}

const WorkerDashboard = ({ onLogout, customerUrl, brokerUrl, userName = "John Worker", userEmail = "", authToken = "" }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: "" });
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedJobs: 0,
    averageRating: 0,
    pendingRequests: 0
  });
  const [jobRequests, setJobRequests] = useState([]);
  const [scheduleJobs, setScheduleJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [processingJobId, setProcessingJobId] = useState("");
  const [jobActionError, setJobActionError] = useState("");
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
    servicesProvided: "",
    brokerCode: "",
    brokerName: "",
    brokerCodeLocked: false,
    brokerCommissionUsage: "0/10",
    isAvailable: true
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: "", success: "" });
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const displayUserName = authToken ? userName : "Preview";
  const notificationStorageKey = useMemo(
    () => `omni:notifications:worker:${String(userEmail || userName || "worker").trim().toLowerCase()}`,
    [userEmail, userName]
  );
  const navigate = useNavigate();
  const location = useLocation();
  const tabPathMap = {
    overview: "/",
    "job-requests": "/job-requests",
    schedule: "/schedule",
    earnings: "/earnings",
    reviews: "/reviews",
    profile: "/profile",
    settings: "/settings"
  };
  const pathTabMap = Object.fromEntries(Object.entries(tabPathMap).map(([tab, path]) => [path, tab]));
  const activeTab = pathTabMap[location.pathname] || "overview";

  const navTabs = ["overview", "job-requests", "schedule", "earnings", "reviews"];
  const notificationItems = useMemo(() => {
    const items = [];

    jobRequests.forEach((job) => {
      if (String(job.status || "").toLowerCase() === "pending") {
        const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.date}-${job.time}`);
        items.push({
          id: `job-request-${jobId}`,
          title: "New job request",
          message: `${job.customer} requested ${job.service}${job.date ? ` on ${job.date}` : ""}.`
        });
      }
    });

    recentJobs.forEach((job) => {
      const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.amount}`);
      items.push({
        id: `job-done-${jobId}`,
        title: "Job marked as done",
        message: `${job.service} completed for ${job.customer}.`
      });
      if (Number(job.amount || 0) > 0) {
        items.push({
          id: `earning-${jobId}`,
          title: "Earning credited",
          message: `INR ${Number(job.amount || 0).toLocaleString("en-IN")} added from ${job.service}.`
        });
      }
    });

    return items.slice(0, 20);
  }, [jobRequests, recentJobs]);
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

  useEffect(() => {
    const handleOutsideTap = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideTap);
    document.addEventListener("touchstart", handleOutsideTap);

    return () => {
      document.removeEventListener("mousedown", handleOutsideTap);
      document.removeEventListener("touchstart", handleOutsideTap);
    };
  }, []);

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

  const loadDashboard = async () => {
    try {
      const requestConfig = {
        params: { worker: userName },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      };
      const [dashboardResponse, reviewsResponse] = await Promise.all([
        api.get("/worker/dashboard", requestConfig),
        api.get("/worker/reviews", requestConfig)
      ]);
      const response = dashboardResponse;

      setStats(response.data?.stats || { totalEarnings: 0, completedJobs: 0, averageRating: 0, pendingRequests: 0 });

      const nextJobRequests = Array.isArray(response.data?.jobRequests)
        ? response.data.jobRequests.map((job) => ({
            id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.date}-${job.time}`),
            customer: job.customerName || "Customer",
            service: job.service || "Service",
            location: job.location || "",
            date: job.date || "",
            time: job.time || "",
            amount: Number(job.amount || 0),
            status: job.status || "pending"
          }))
        : [];

      const nextScheduleJobs = Array.isArray(response.data?.scheduleJobs)
        ? response.data.scheduleJobs.map((job) => ({
            id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.date}-${job.time}`),
            customer: job.customerName || "Customer",
            service: job.service || "Service",
            location: job.location || "",
            date: job.date || "",
            time: job.time || "",
            amount: Number(job.amount || 0),
            status: job.status || "confirmed"
          }))
        : [];

      const nextRecentJobs = Array.isArray(response.data?.recentJobs)
        ? response.data.recentJobs.map((job) => ({
            id: toStableId(job._id || job.id, `${job.customerName}-${job.service}-${job.amount}`),
            customer: job.customerName || "Customer",
            service: job.service || "Service",
            grossAmount: Number(job.amount || 0),
            brokerCommissionAmount: Number(job.brokerCommissionAmount || 0),
            amount: Number(job.workerPayout || job.amount || 0),
            rating: Number(job.rating || 0),
            feedback: String(job.feedback || ""),
            status: job.status || "completed"
          }))
        : [];
      const nextReviews = Array.isArray(reviewsResponse.data?.reviews)
        ? reviewsResponse.data.reviews.map((review) => ({
            id: toStableId(review._id || review.id, `${review.customer}-${review.service}-${review.date}-${review.time}`),
            customer: review.customer || review.customerName || "Customer",
            service: review.service || "Service",
            rating: Number(review.rating || 0),
            feedback: String(review.feedback || ""),
            amount: Number(review.amount || 0),
            date: review.date || "",
            time: review.time || ""
          }))
        : [];

      setJobRequests(nextJobRequests);
      setScheduleJobs(nextScheduleJobs);
      setRecentJobs(nextRecentJobs);
      setReviews(nextReviews);
    } catch (_error) {
      setStats({ totalEarnings: 0, completedJobs: 0, averageRating: 0, pendingRequests: 0 });
      setJobRequests([]);
      setScheduleJobs([]);
      setRecentJobs([]);
      setReviews([]);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [authToken, userName]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadDashboard();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [authToken, userName]);

  useEffect(() => {
    const fallback = {
      name: userName,
      email: userEmail,
      bio: "",
      gender: "",
      dateOfBirth: "",
      phone: "",
      servicesProvided: "",
      brokerCode: "",
      brokerName: "",
      brokerCodeLocked: false,
      brokerCommissionUsage: "0/10",
      isAvailable: true
    };

    if (!authToken) {
      setProfileForm(fallback);
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
          servicesProvided: Array.isArray(profile.servicesProvided) ? profile.servicesProvided.join(", ") : "",
          brokerCode: profile.brokerCode || "",
          brokerName: profile.brokerName || "",
          brokerCodeLocked: profile.brokerCodeLocked === true,
          brokerCommissionUsage: profile.brokerCommissionUsage || "0/10",
          isAvailable: profile.isAvailable !== false
        });
      } catch (_error) {
        setProfileForm(fallback);
      }
    };

    loadProfile();
  }, [authToken, userEmail, userName]);

  const handleJobAction = async (jobId, action) => {
    if (!authToken) {
      setJobActionError("Please log in to manage job requests.");
      return;
    }

    setProcessingJobId(jobId);
    setJobActionError("");
    try {
      await api.patch(
        `/worker/bookings/${jobId}`,
        { action },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      await loadDashboard();
      if (action === "accept") {
        navigateToTab("schedule");
      }
    } catch (error) {
      setJobActionError(error.response?.data?.message || "Unable to update job request.");
    } finally {
      setProcessingJobId("");
    }
  };

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === "customer" ? customerUrl : role === "broker" ? brokerUrl : "";
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
      const servicesProvided = profileForm.servicesProvided
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean);

      const response = await api.put(
        "/profile",
        {
          name: profileForm.name,
          email: profileForm.email,
          bio: profileForm.bio,
          gender: profileForm.gender,
          dateOfBirth: profileForm.dateOfBirth || null,
          phone: profileForm.phone,
          servicesProvided,
          brokerCode: profileForm.brokerCode,
          isAvailable: profileForm.isAvailable
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
        servicesProvided: Array.isArray(profile.servicesProvided) ? profile.servicesProvided.join(", ") : "",
        brokerCode: profile.brokerCode || "",
        brokerName: profile.brokerName || "",
        brokerCodeLocked: profile.brokerCodeLocked === true,
        brokerCommissionUsage: profile.brokerCommissionUsage || prev.brokerCommissionUsage || "0/10",
        isAvailable: profile.isAvailable !== false
      }));
      setProfileStatus({ loading: false, error: "", success: "Profile updated." });
    } catch (error) {
      setProfileStatus({
        loading: false,
        error: error.response?.data?.message || "Unable to save profile.",
        success: ""
      });
    }
  };

  const renderActivePage = () => {
    if (activeTab === "overview") {
      return (
        <WorkerOverviewPage
          stats={stats}
          jobRequests={jobRequests}
          recentJobs={recentJobs}
          setActiveTab={navigateToTab}
          handleJobAction={handleJobAction}
          processingJobId={processingJobId}
          jobActionError={jobActionError}
        />
      );
    }

    if (activeTab === "job-requests") {
      return (
        <WorkerJobRequestsPage
          jobRequests={jobRequests}
          handleJobAction={handleJobAction}
          processingJobId={processingJobId}
          jobActionError={jobActionError}
        />
      );
    }

    if (activeTab === "schedule") {
      return <WorkerSchedulePage scheduleJobs={scheduleJobs} />;
    }

    if (activeTab === "earnings") {
      return <WorkerEarningsPage stats={stats} recentJobs={recentJobs} />;
    }

    if (activeTab === "reviews") {
      return <WorkerReviewsPage reviews={reviews} />;
    }

    if (activeTab === "profile") {
      return (
        <WorkerProfilePage
          authToken={authToken}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
        />
      );
    }

    return <WorkerSettingsPage />;
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
                      onClick={() => navigateToTab(tab)}
                      className={`py-4 border-b-2 font-medium text-sm capitalize transition-colors ${
                        activeTab === tab
                          ? "border-purple-500 text-purple-600"
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
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative p-2 text-gray-500 hover:text-gray-700"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-6 w-6" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-white rounded-lg shadow-lg border z-50">
                      <div className="px-4 py-3 border-b flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                        <span className="text-xs text-gray-500">{unreadNotificationCount} unread</span>
                      </div>
                      <div className="h-[216px] overflow-y-auto">
                        {visibleNotificationItems.length ? (
                          visibleNotificationItems.map((notification) => {
                            const normalizedNotificationId = toStableId(notification.id);
                            const isRead = readNotificationIds.includes(normalizedNotificationId);
                            return (
                              <button
                                key={normalizedNotificationId}
                                type="button"
                                onClick={() => handleMarkNotificationRead(normalizedNotificationId)}
                                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                                  isRead ? "bg-gray-50" : "bg-purple-50/40"
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
                      <div className="px-4 py-2 border-t flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          className="text-xs font-medium text-purple-600 hover:text-purple-700"
                        >
                          Mark all read
                        </button>
                        <button
                          type="button"
                          onClick={handleClearNotifications}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
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
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    className="hidden lg:flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-50/80"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-left">
                      <p className="font-medium text-gray-900">{displayUserName}</p>
                      <p className="text-gray-500 text-xs">Service Provider</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
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

                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-500">
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                      activeTab === tab ? "bg-purple-50 text-purple-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    {tab === "overview" ? "dashboard" : tab.replace("-", " ")}
                  </button>
                ))}
                <div className="border-t pt-2 mt-2">
                  <button
                    onClick={() => {
                      setRoleSwitchStatus({ loading: false, error: "" });
                      setShowRoleSwitchModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  >
                    <Briefcase className="w-5 h-5" />
                    <span>Switch Role</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50 hover:text-red-800"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>

        <main className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{renderActivePage()}</div>
        </main>

        {showRoleSwitchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
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
                  onClick={() => handleRoleSwitch("broker")}
                  disabled={roleSwitchStatus.loading}
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

              {roleSwitchStatus.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{roleSwitchStatus.error}</p>}

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setRoleSwitchStatus({ loading: false, error: "" });
                    setShowRoleSwitchModal(false);
                  }}
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
