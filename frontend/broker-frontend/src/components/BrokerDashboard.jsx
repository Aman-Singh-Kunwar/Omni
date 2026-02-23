import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import { toShortErrorMessage, toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import BrokerRoleSwitchModal from "./broker-dashboard/BrokerRoleSwitchModal";
import BrokerTopNav from "./broker-dashboard/BrokerTopNav";
import { EMPTY_STATS, landingUrl } from "./broker-dashboard/constants";

const BrokerOverviewPage = lazy(() => import("../pages/broker/BrokerOverviewPage"));
const BrokerWorkersPage = lazy(() => import("../pages/broker/BrokerWorkersPage"));
const BrokerBookingsPage = lazy(() => import("../pages/broker/BrokerBookingsPage"));
const BrokerEarningsPage = lazy(() => import("../pages/broker/BrokerEarningsPage"));
const BrokerProfilePage = lazy(() => import("../pages/broker/BrokerProfilePage"));
const BrokerSettingsPage = lazy(() => import("../pages/broker/BrokerSettingsPage"));

const BrokerDashboard = ({ onLogout, customerUrl, workerUrl, userName = "Sarah Broker", userEmail = "", authToken = "" }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: "" });
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentBookings, setRecentBookings] = useState([]);
  const [topWorkers, setTopWorkers] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
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
  const [profileInitialForm, setProfileInitialForm] = useState({
    name: userName,
    email: userEmail,
    bio: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    brokerCode: ""
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: "", success: "" });
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);
  useAutoDismissStatus(profileStatus, setProfileStatus);
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

  const loadDashboard = useCallback(async ({ forceFresh = true } = {}) => {
    try {
      const response = await api.get("/broker/dashboard", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        ...(forceFresh ? { cache: false } : {})
      });

      setStats(response.data?.stats || { ...EMPTY_STATS });
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
      setStats({ ...EMPTY_STATS });
      setRecentBookings([]);
      setTopWorkers([]);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      return;
    }

    setStats({ ...EMPTY_STATS });
    setRecentBookings([]);
    setTopWorkers([]);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    loadDashboard();
  }, [authToken, loadDashboard]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadDashboard();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [authToken, loadDashboard]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const socket = createRealtimeSocket(authToken);
    if (!socket) {
      return undefined;
    }

    let refreshTimerId = null;
    const triggerRealtimeRefresh = () => {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
      }

      refreshTimerId = window.setTimeout(() => {
        api.clearApiCache?.();
        setRefreshSignal((prev) => prev + 1);
        loadDashboard({ forceFresh: true });
      }, 250);
    };

    socket.on("connect", triggerRealtimeRefresh);
    socket.on("booking:changed", triggerRealtimeRefresh);

    return () => {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
      }
      socket.off("connect", triggerRealtimeRefresh);
      socket.off("booking:changed", triggerRealtimeRefresh);
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
      brokerCode: ""
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
          brokerCode: profile.brokerCode || ""
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
      const nextProfile = {
        ...profileForm,
        name: user.name || profileForm.name,
        email: user.email || profileForm.email,
        bio: profile.bio || "",
        gender: profile.gender || "",
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
        phone: profile.phone || "",
        brokerCode: profile.brokerCode || profileForm.brokerCode || ""
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
      return <BrokerOverviewPage stats={stats} topWorkers={topWorkers} />;
    }

    if (activeTab === "workers") {
      return <BrokerWorkersPage authToken={authToken} refreshSignal={refreshSignal} stats={stats} />;
    }

    if (activeTab === "bookings") {
      return <BrokerBookingsPage authToken={authToken} refreshSignal={refreshSignal} />;
    }

    if (activeTab === "earnings") {
      return <BrokerEarningsPage authToken={authToken} stats={stats} refreshSignal={refreshSignal} />;
    }

    if (activeTab === "profile") {
      return (
        <BrokerProfilePage
          profileForm={profileForm}
          profileInitialForm={profileInitialForm}
          setProfileForm={setProfileForm}
          profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
          stats={stats}
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
        <BrokerTopNav
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
          userName={userName}
        />

        <main className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoaderCard />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        <BrokerRoleSwitchModal
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

export default BrokerDashboard;
