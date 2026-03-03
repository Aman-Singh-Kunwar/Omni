import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import { toStableId } from "@shared/utils/common";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import BrokerRoleSwitchModal from "./broker-dashboard/BrokerRoleSwitchModal";
import BrokerTopNav from "./broker-dashboard/BrokerTopNav";
import { landingUrl } from "./broker-dashboard/constants";
import useBrokerDashboardData from "./broker-dashboard/useBrokerDashboardData";
import useBrokerProfile from "./broker-dashboard/useBrokerProfile";
import useBrokerNotifications from "./broker-dashboard/useBrokerNotifications";

const BrokerOverviewPage = lazy(() => import("../pages/broker/BrokerOverviewPage"));
const BrokerWorkersPage = lazy(() => import("../pages/broker/BrokerWorkersPage"));
const BrokerBookingsPage = lazy(() => import("../pages/broker/BrokerBookingsPage"));
const BrokerEarningsPage = lazy(() => import("../pages/broker/BrokerEarningsPage"));
const BrokerWorkerJobProfilePage = lazy(() => import("../pages/broker/BrokerWorkerJobProfilePage"));
const BrokerProfilePage = lazy(() => import("../pages/broker/BrokerProfilePage"));
const BrokerSettingsPage = lazy(() => import("../pages/broker/BrokerSettingsPage"));

const TAB_PATH_MAP = {
  overview: "/",
  workers: "/workers",
  workerProfile: "/worker-profile",
  bookings: "/bookings",
  earnings: "/earnings",
  profile: "/profile",
  settings: "/settings"
};
const PATH_TAB_MAP = Object.fromEntries(Object.entries(TAB_PATH_MAP).map(([tab, path]) => [path, tab]));
const NAV_TABS = ["overview", "workers", "bookings", "earnings"];

function GlobalStyles() {
  return (
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
}

const BrokerDashboard = ({
  onLogout,
  customerUrl,
  workerUrl,
  userName = "Sarah Broker",
  userEmail = "",
  userPhotoUrl = "",
  authToken = ""
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: "" });
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);

  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = PATH_TAB_MAP[location.pathname] || "overview";
  const needsProfileData = Boolean(authToken);

  const {
    profileForm, setProfileForm,
    profileInitialForm, setProfileInitialForm,
    profileStatus,
    emailVerification, setEmailVerification,
    handleProfileSave,
    requestEmailVerification,
    verifyEmailChange
  } = useBrokerProfile({ authToken, userName, userEmail, needsProfileData });
  const profilePhotoUrl = String(profileForm.photoUrl || userPhotoUrl || "").trim();

  const { stats, recentBookings, topWorkers, refreshSignal } = useBrokerDashboardData({
    authToken,
    setProfileForm,
    setProfileInitialForm
  });

  const {
    showNotifications, setShowNotifications,
    readNotificationIds,
    visibleNotificationItems,
    unreadNotificationCount,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    handleClearNotifications
  } = useBrokerNotifications({ userEmail, userName, recentBookings, stats });

  useEffect(() => {
    if (!PATH_TAB_MAP[location.pathname]) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = (tab) => {
    const nextPath = TAB_PATH_MAP[tab] || "/";
    if (nextPath !== location.pathname) {
      navigate(nextPath);
    }
  };

  const hideUserMenu = useCallback(() => setShowUserMenu(false), []);
  const hideNotifications = useCallback(() => setShowNotifications(false), [setShowNotifications]);
  const hideMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
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

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === "customer" ? customerUrl : role === "worker" ? workerUrl : "";
    if (!targetUrl) return;

    if (!authToken) {
      setShowRoleSwitchModal(false);
      setShowUserMenu(false);
      window.location.href = targetUrl;
      return;
    }

    setRoleSwitchStatus({ loading: true, error: "" });
    try {
      const response = await api.post("/auth/switch-role", { role }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const switchedToken = String(response.data?.token || "").trim();
      const redirectUrl = new URL(targetUrl);
      if (switchedToken) redirectUrl.searchParams.set("authToken", switchedToken);
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

  const handleOpenWorkerJobProfile = (worker) => {
    const workerId = String(worker?.id || "").trim();
    const workerName = String(worker?.name || "").trim();
    if (!workerId && !workerName) return;
    const params = new URLSearchParams();
    if (workerId) params.set("workerId", workerId);
    if (workerName) params.set("workerName", workerName);
    navigate(`/worker-profile${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || "").trim();
    if (preferredTab && TAB_PATH_MAP[preferredTab]) return preferredTab;
    const normalizedId = toStableId(notification.id).toLowerCase();
    if (normalizedId.startsWith("broker-earning-")) return "earnings";
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
    if (!normalizedId) return;
    handleMarkNotificationRead(normalizedId);
    setShowNotifications(false);
    navigateToTab(resolveNotificationTab(notification));
  };
  const renderActivePage = () => {
    if (activeTab === "overview") {
      return <BrokerOverviewPage stats={stats} topWorkers={topWorkers} onViewWorkerProfile={handleOpenWorkerJobProfile} />;
    }
    if (activeTab === "workers") {
      return (
        <BrokerWorkersPage
          authToken={authToken}
          refreshSignal={refreshSignal}
          stats={stats}
          onViewWorkerProfile={handleOpenWorkerJobProfile}
        />
      );
    }
    if (activeTab === "workerProfile") {
      return <BrokerWorkerJobProfilePage authToken={authToken} />;
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
          emailVerification={emailVerification}
          setEmailVerification={setEmailVerification}
          onRequestEmailVerification={requestEmailVerification}
          onVerifyEmailChange={verifyEmailChange}
        />
      );
    }
    return <BrokerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} />;
  };

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
          navTabs={NAV_TABS}
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
          profilePhotoUrl={profilePhotoUrl}
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
