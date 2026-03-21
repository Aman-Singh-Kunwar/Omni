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
import { clearChatbotPendingAction, readChatbotPendingAction } from "@shared/components/chatbot/sessionStorage";

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

  const handleOpenWorkerJobProfile = useCallback((worker) => {
    const workerId = String(worker?.id || "").trim();
    const workerName = String(worker?.name || "").trim();
    if (!workerId && !workerName) return;
    const params = new URLSearchParams();
    if (workerId) params.set("workerId", workerId);
    if (workerName) params.set("workerName", workerName);
    navigate(`/worker-profile${params.toString() ? `?${params.toString()}` : ""}`);
  }, [navigate]);

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

  useEffect(() => {
    const pendingAction = readChatbotPendingAction();
    if (!pendingAction || typeof pendingAction !== "object") return;

    if (pendingAction.type === "profile_section_action") {
      const section = String(pendingAction?.payload?.section || "").toLowerCase();
      clearChatbotPendingAction();
      const targetSection = ["email", "phone", "bio"].includes(section) ? section : "email";
      navigate(`/profile?section=${encodeURIComponent(targetSection)}`);
      return;
    }

    if (pendingAction.type === "settings_section_action") {
      const section = String(pendingAction?.payload?.section || "").toLowerCase();
      clearChatbotPendingAction();
      const targetSection = ["notifications", "password", "delete-account"].includes(section)
        ? section
        : "notifications";
      navigate(`/settings?section=${encodeURIComponent(targetSection)}`);
      return;
    }

    if (pendingAction.type === "broker_profile_action") {
      const actionType = String(pendingAction?.payload?.action || "").toLowerCase();
      const pendingEmail = String(pendingAction?.payload?.pendingEmail || profileForm?.email || "").trim().toLowerCase();
      const otpCode = String(pendingAction?.payload?.otpCode || "").replace(/\D/g, "").slice(0, 6);
      const confirmed = pendingAction?.payload?.confirmed === true;
      clearChatbotPendingAction();

      navigateToTab("profile");

      if (actionType === "open_email_verify") {
        setEmailVerification((prev) => ({
          ...prev,
          open: true,
          pendingEmail: pendingEmail || prev.pendingEmail || "",
          code: "",
          info: "",
          error: ""
        }));
        return;
      }

      if (actionType === "resend_email_otp") {
        if (pendingEmail) {
          requestEmailVerification(pendingEmail);
        }
        return;
      }

      if (actionType === "verify_email_otp") {
        if (!pendingEmail) {
          setEmailVerification((prev) => ({
            ...prev,
            open: true,
            error: "Email is required to verify OTP. Please provide the target email.",
            info: ""
          }));
          return;
        }

        if (!confirmed || otpCode.length !== 6) {
          setEmailVerification((prev) => ({
            ...prev,
            open: true,
            pendingEmail,
            code: otpCode || prev.code || "",
            error: "For safety, confirm explicitly: 'confirm verify otp 123456'.",
            info: ""
          }));
          return;
        }

        verifyEmailChange(pendingEmail, otpCode);
      }

      return;
    }

    if (pendingAction.type === "dashboard_notification_action") {
      const actionType = String(pendingAction?.payload?.action || "").toLowerCase();
      clearChatbotPendingAction();

      if (actionType === "mark_all_read") {
        handleMarkAllNotificationsRead();
        return;
      }
      if (actionType === "clear_all") {
        handleClearNotifications();
        return;
      }

      if (actionType === "open_unread_target") {
        const readSet = new Set(readNotificationIds.map((id) => toStableId(id)).filter(Boolean));
        const firstUnread = visibleNotificationItems.find((item) => !readSet.has(toStableId(item?.id)));
        if (firstUnread) {
          const normalizedId = toStableId(firstUnread.id);
          if (normalizedId) {
            handleMarkNotificationRead(normalizedId);
          }
          setShowNotifications(false);
          const preferredTab = String(firstUnread.targetTab || "").trim();
          if (preferredTab && TAB_PATH_MAP[preferredTab]) {
            navigateToTab(preferredTab);
          }
          return;
        }
      }

      setShowUserMenu(false);
      setIsMobileMenuOpen(false);
      setShowNotifications(true);
      return;
    }

    if (pendingAction.type === "role_switch_action") {
      const actionType = String(pendingAction?.payload?.action || "").toLowerCase();
      const targetRole = String(pendingAction?.payload?.role || "").toLowerCase();
      clearChatbotPendingAction();

      if (actionType === "switch_role" && ["customer", "worker"].includes(targetRole)) {
        handleRoleSwitch(targetRole);
        return;
      }

      setRoleSwitchStatus({ loading: false, error: "" });
      setShowUserMenu(false);
      setShowRoleSwitchModal(true);
      return;
    }

    if (pendingAction.type === "broker_workers_action") {
      const actionType = String(pendingAction?.payload?.action || "").toLowerCase();
      const workerId = String(pendingAction?.payload?.workerId || "").trim();
      clearChatbotPendingAction();

      if (actionType === "open_top_worker_profile") {
        const topWorker = Array.isArray(topWorkers) && topWorkers.length > 0 ? topWorkers[0] : null;
        if (topWorker) {
          handleOpenWorkerJobProfile(topWorker);
        } else {
          navigateToTab("overview");
        }
        return;
      }

      if (actionType === "open_worker_profile") {
        if (workerId) {
          navigate(`/worker-profile?workerId=${encodeURIComponent(workerId)}`);
        } else {
          navigateToTab("workers");
        }
        return;
      }

      if (actionType === "copy_code") {
        navigate("/workers?chatbotAction=copy");
        return;
      }

      if (actionType === "open_share_modal") {
        navigate("/workers?chatbotAction=share");
        return;
      }

      navigateToTab("workers");
    }
  }, [
    handleClearNotifications,
    handleMarkAllNotificationsRead,
    handleMarkNotificationRead,
    handleOpenWorkerJobProfile,
    handleRoleSwitch,
    profileForm?.email,
    navigate,
    navigateToTab,
    requestEmailVerification,
    readNotificationIds,
    setEmailVerification,
    topWorkers,
    verifyEmailChange,
    visibleNotificationItems
  ]);

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
    return <BrokerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} userEmail={userEmail} />;
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
