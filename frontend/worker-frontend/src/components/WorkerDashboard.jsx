import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import { toShortErrorMessage, toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus, useAutoDismissValue } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import WorkerRoleSwitchModal from "./worker-dashboard/WorkerRoleSwitchModal";
import WorkerTopNav from "./worker-dashboard/WorkerTopNav";
import { landingUrl } from "./worker-dashboard/constants";

const WorkerOverviewPage = lazy(() => import("../pages/worker/WorkerOverviewPage"));
const WorkerJobRequestsPage = lazy(() => import("../pages/worker/WorkerJobRequestsPage"));
const WorkerSchedulePage = lazy(() => import("../pages/worker/WorkerSchedulePage"));
const WorkerEarningsPage = lazy(() => import("../pages/worker/WorkerEarningsPage"));
const WorkerReviewsPage = lazy(() => import("../pages/worker/WorkerReviewsPage"));
const WorkerProfilePage = lazy(() => import("../pages/worker/WorkerProfilePage"));
const WorkerSettingsPage = lazy(() => import("../pages/worker/WorkerSettingsPage"));

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
  const [profileInitialForm, setProfileInitialForm] = useState({
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
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);
  useAutoDismissStatus(profileStatus, setProfileStatus);
  useAutoDismissValue(jobActionError, () => setJobActionError(""));
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);
  const displayUserName = authToken ? userName : "Guest Worker";
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
  const needsDashboardData = !["profile", "settings"].includes(activeTab);
  const needsProfileData = activeTab === "profile";

  const navTabs = ["overview", "job-requests", "schedule", "earnings", "reviews"];
  const notificationItems = useMemo(() => {
    const items = [];

    jobRequests.forEach((job) => {
      if (String(job.status || "").toLowerCase() === "pending") {
        const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.date}-${job.time}`);
        items.push({
          id: `job-request-${jobId}`,
          title: "New job request",
          message: `${job.customer} requested ${job.service}${job.date ? ` on ${job.date}` : ""}.`,
          targetTab: "job-requests"
        });
      }
    });

    recentJobs.forEach((job) => {
      const jobId = toStableId(job.id, `${job.customer}-${job.service}-${job.amount}`);
      items.push({
        id: `job-done-${jobId}`,
        title: "Job marked as done",
        message: `${job.service} completed for ${job.customer}.`,
        targetTab: "overview"
      });
      if (Number(job.amount || 0) > 0) {
        items.push({
          id: `earning-${jobId}`,
          title: "Earning credited",
          message: `INR ${Number(job.amount || 0).toLocaleString("en-IN")} added from ${job.service}.`,
          targetTab: "earnings"
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

  const loadDashboard = useCallback(async ({ forceFresh = true } = {}) => {
    try {
      const requestConfig = {
        params: { worker: userName },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        ...(forceFresh ? { cache: false } : {})
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
            customerName: job.customerName || "Customer",
            service: job.service || "Service",
            location: job.location || "",
            locationLat: typeof job.locationLat === "number" ? job.locationLat : null,
            locationLng: typeof job.locationLng === "number" ? job.locationLng : null,
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
  }, [authToken, userName]);

  useEffect(() => {
    if (!needsDashboardData) {
      return;
    }
    loadDashboard();
  }, [loadDashboard, needsDashboardData]);

  useEffect(() => {
    if (!authToken || !needsDashboardData) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadDashboard();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [authToken, loadDashboard, needsDashboardData]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const socket = createRealtimeSocket(authToken);
    if (!socket) {
      return undefined;
    }

    let refreshTimerId = null;
    const triggerFreshReload = () => {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
      }

      refreshTimerId = window.setTimeout(() => {
        api.clearApiCache?.();
        loadDashboard({ forceFresh: true });
      }, 250);
    };

    socket.on("connect", triggerFreshReload);
    socket.on("booking:changed", triggerFreshReload);

    return () => {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
      }
      socket.off("connect", triggerFreshReload);
      socket.off("booking:changed", triggerFreshReload);
      socket.disconnect();
    };
  }, [authToken, loadDashboard]);

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
      if (needsProfileData) {
        setProfileForm(fallback);
        setProfileInitialForm(fallback);
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
        const nextProfile = {
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
        };
        setProfileForm(nextProfile);
        setProfileInitialForm(nextProfile);
      } catch (_error) {
        setProfileForm(fallback);
        setProfileInitialForm(fallback);
      }
    };

    loadProfile();
  }, [authToken, userEmail, userName, needsProfileData]);

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
  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || "").trim();
    if (preferredTab && tabPathMap[preferredTab]) {
      return preferredTab;
    }

    const normalizedId = toStableId(notification.id).toLowerCase();
    if (normalizedId.startsWith("job-request-")) {
      return "job-requests";
    }
    if (normalizedId.startsWith("earning-")) {
      return "earnings";
    }
    if (normalizedId.startsWith("job-done-")) {
      return "overview";
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
          isAvailable: profileForm.isAvailable
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const user = response.data?.user || {};
      const profile = response.data?.profile || {};
      const nextProfile = {
        ...profileForm,
        name: user.name || profileForm.name,
        email: user.email || profileForm.email,
        bio: profile.bio || "",
        gender: profile.gender || "",
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
        phone: profile.phone || "",
        servicesProvided: Array.isArray(profile.servicesProvided) ? profile.servicesProvided.join(", ") : "",
        brokerCode: profile.brokerCode || "",
        brokerName: profile.brokerName || "",
        brokerCodeLocked: profile.brokerCodeLocked === true,
        brokerCommissionUsage: profile.brokerCommissionUsage || profileForm.brokerCommissionUsage || "0/10",
        isAvailable: profile.isAvailable !== false
      };
      setProfileForm(nextProfile);
      setProfileInitialForm(nextProfile);
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
      return <WorkerSchedulePage scheduleJobs={scheduleJobs} authToken={authToken} userName={userName} />;
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
          profileInitialForm={profileInitialForm}
          setProfileForm={setProfileForm}
          profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
        />
      );
    }

    return <WorkerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} />;
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
        <WorkerTopNav
          navRef={navRef}
          notificationMenuRef={notificationMenuRef}
          userMenuRef={userMenuRef}
          landingUrl={landingUrl}
          omniLogo={omniLogo}
          navTabs={navTabs}
          activeTab={activeTab}
          navigateToTab={navigateToTab}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          unreadNotificationCount={unreadNotificationCount}
          visibleNotificationItems={visibleNotificationItems}
          readNotificationIds={readNotificationIds}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onClearNotifications={handleClearNotifications}
          showUserMenu={showUserMenu}
          setShowUserMenu={setShowUserMenu}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenRoleSwitch={() => {
            setRoleSwitchStatus({ loading: false, error: "" });
            setShowRoleSwitchModal(true);
          }}
          onLogout={onLogout}
          displayUserName={displayUserName}
        />

        <main className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoaderCard />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        <WorkerRoleSwitchModal
          open={showRoleSwitchModal}
          status={roleSwitchStatus}
          onRoleSwitch={handleRoleSwitch}
          onClose={() => {
            setRoleSwitchStatus({ loading: false, error: "" });
            setShowRoleSwitchModal(false);
          }}
        />
      </div>
    </>
  );
};

export default WorkerDashboard;
