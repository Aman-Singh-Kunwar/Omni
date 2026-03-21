import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import api from "../api";
import { toStableId } from "@shared/utils/common";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus, useAutoDismissValue } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import WorkerRoleSwitchModal from "./worker-dashboard/WorkerRoleSwitchModal";
import WorkerTopNav from "./worker-dashboard/WorkerTopNav";
import { landingUrl } from "./worker-dashboard/constants";
import useWorkerDashboardData from "./worker-dashboard/useWorkerDashboardData";
import useWorkerProfile from "./worker-dashboard/useWorkerProfile";
import useWorkerNotifications from "./worker-dashboard/useWorkerNotifications";
import { clearChatbotPendingAction, readChatbotPendingAction } from "@shared/components/chatbot/sessionStorage";

const WorkerOverviewPage = lazy(() => import("../pages/worker/WorkerOverviewPage"));
const WorkerJobRequestsPage = lazy(() => import("../pages/worker/WorkerJobRequestsPage"));
const WorkerSchedulePage = lazy(() => import("../pages/worker/WorkerSchedulePage"));
const WorkerEarningsPage = lazy(() => import("../pages/worker/WorkerEarningsPage"));
const WorkerReviewsPage = lazy(() => import("../pages/worker/WorkerReviewsPage"));
const WorkerJobProfilePage = lazy(() => import("../pages/worker/WorkerJobProfilePage"));
const WorkerProfilePage = lazy(() => import("../pages/worker/WorkerProfilePage"));
const WorkerSettingsPage = lazy(() => import("../pages/worker/WorkerSettingsPage"));

const TAB_PATH_MAP = {
  overview: "/",
  "job-requests": "/job-requests",
  schedule: "/schedule",
  earnings: "/earnings",
  reviews: "/reviews",
  "job-profile": "/job-profile",
  profile: "/profile",
  settings: "/settings"
};
const PATH_TAB_MAP = Object.fromEntries(Object.entries(TAB_PATH_MAP).map(([tab, path]) => [path, tab]));
const NAV_TABS = ["overview", "job-requests", "schedule", "earnings", "reviews", "job-profile"];

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
          background: linear-gradient(-45deg, #fef3e2, #f3e8ff, #fef3e2, #f3e8ff);
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }
      `}
    </style>
  );
}

const WorkerDashboard = ({
  onLogout,
  customerUrl,
  brokerUrl,
  userId = "",
  userName = "John Worker",
  userEmail = "",
  userPhotoUrl = "",
  authToken = ""
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: "" });
  const [processingJobId, setProcessingJobId] = useState("");
  const [jobActionError, setJobActionError] = useState("");
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);
  useAutoDismissValue(jobActionError, () => setJobActionError(""));

  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);
  const displayUserName = authToken ? userName : "Guest Worker";
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = PATH_TAB_MAP[location.pathname] || "overview";
  const needsDashboardData = !["profile", "settings", "job-profile"].includes(activeTab);
  const needsProfileData = Boolean(authToken);

  const {
    profileForm, setProfileForm,
    profileInitialForm,
    profileStatus,
    emailVerification, setEmailVerification,
    handleProfileSave,
    requestEmailVerification,
    verifyEmailChange
  } = useWorkerProfile({ authToken, userName, userEmail, needsProfileData });
  const profilePhotoUrl = String(profileForm.photoUrl || userPhotoUrl || "").trim();

  const { stats, jobRequests, scheduleJobs, recentJobs, reviews, loadDashboard } = useWorkerDashboardData({
    authToken, userName, needsDashboardData
  });

  const {
    showNotifications, setShowNotifications,
    readNotificationIds,
    visibleNotificationItems,
    unreadNotificationCount,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    handleClearNotifications
  } = useWorkerNotifications({ userEmail, userName, jobRequests, recentJobs });

  useEffect(() => {
    if (!PATH_TAB_MAP[location.pathname]) navigate("/", { replace: true });
  }, [location.pathname, navigate]);

  const navigateToTab = (tab) => {
    const nextPath = TAB_PATH_MAP[tab] || "/";
    if (nextPath !== location.pathname) navigate(nextPath);
  };

  const hideUserMenu = useCallback(() => setShowUserMenu(false), []);
  const hideNotifications = useCallback(() => setShowNotifications(false), [setShowNotifications]);
  const hideMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const closeQuickMenus = useCallback(() => {
    hideUserMenu(); hideNotifications(); hideMobileMenu();
  }, [hideMobileMenu, hideNotifications, hideUserMenu]);

  useQuickMenuAutoClose({
    userMenuRef, notificationMenuRef, navRef,
    hideUserMenu, hideNotifications, hideMobileMenu, closeQuickMenus,
    routePath: location.pathname, routeSearch: location.search
  });

  const handleJobAction = async (jobId, action) => {
    if (!authToken) { setJobActionError("Please log in to manage job requests."); return; }
    setProcessingJobId(jobId);
    setJobActionError("");
    try {
      await api.patch(`/worker/bookings/${jobId}`, { action }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      await loadDashboard();
      if (action === "accept") navigateToTab("schedule");
    } catch (error) {
      setJobActionError(error.response?.data?.message || "Unable to update job request.");
    } finally {
      setProcessingJobId("");
    }
  };

  useEffect(() => {
    const pendingAction = readChatbotPendingAction();
    if (pendingAction?.type !== "worker_job_action") return;

    const payload = pendingAction.payload || {};
    const actionType = String(payload.action || "").toLowerCase();
    if (!actionType || !["accept", "reject"].includes(actionType)) {
      clearChatbotPendingAction();
      return;
    }

    if (!authToken) {
      setJobActionError("Please log in to manage job requests.");
      clearChatbotPendingAction();
      return;
    }

    if (!Array.isArray(jobRequests) || jobRequests.length === 0) {
      return;
    }

    const requestedBookingId = String(payload.bookingId || "").trim();
    const explicitTarget = requestedBookingId
      ? jobRequests.find((job) => String(job?.id || "").trim() === requestedBookingId)
      : null;
    const targetJob = explicitTarget || jobRequests[0];

    clearChatbotPendingAction();
    if (!targetJob?.id) return;

    handleJobAction(targetJob.id, actionType);
  }, [authToken, handleJobAction, jobRequests]);

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === "customer" ? customerUrl : role === "broker" ? brokerUrl : "";
    if (!targetUrl) return;
    if (!authToken) {
      setShowRoleSwitchModal(false); setShowUserMenu(false);
      window.location.href = targetUrl; return;
    }
    setRoleSwitchStatus({ loading: true, error: "" });
    try {
      const response = await api.post("/auth/switch-role", { role }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const switchedToken = String(response.data?.token || "").trim();
      const redirectUrl = new URL(targetUrl);
      if (switchedToken) redirectUrl.searchParams.set("authToken", switchedToken);
      setShowRoleSwitchModal(false); setShowUserMenu(false);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setRoleSwitchStatus({ loading: false, error: error.response?.data?.message || "Unable to switch role right now." });
    }
  };

  useEffect(() => {
    const pendingAction = readChatbotPendingAction();
    if (!pendingAction || typeof pendingAction !== "object") return;

    if (pendingAction.type === "worker_page_action") {
      const actionType = String(pendingAction?.payload?.action || "").toLowerCase();
      const monthFilter = String(pendingAction?.payload?.monthFilter || "").trim();
      const starsFilter = String(pendingAction?.payload?.starsFilter || "").trim();
      clearChatbotPendingAction();

      if (actionType === "open_earnings") {
        const params = new URLSearchParams();
        if (monthFilter) params.set("month", monthFilter);
        navigate(`/earnings${params.toString() ? `?${params.toString()}` : ""}`);
        return;
      }

      if (actionType === "open_reviews") {
        const params = new URLSearchParams();
        if (starsFilter) params.set("stars", starsFilter);
        navigate(`/reviews${params.toString() ? `?${params.toString()}` : ""}`);
        return;
      }

      return;
    }

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

      if (actionType === "switch_role" && ["customer", "broker"].includes(targetRole)) {
        handleRoleSwitch(targetRole);
        return;
      }

      setRoleSwitchStatus({ loading: false, error: "" });
      setShowUserMenu(false);
      setShowRoleSwitchModal(true);
    }
  }, [
    handleClearNotifications,
    handleMarkAllNotificationsRead,
    handleMarkNotificationRead,
    handleRoleSwitch,
    navigate,
    navigateToTab,
    readNotificationIds,
    visibleNotificationItems
  ]);

  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || "").trim();
    if (preferredTab && TAB_PATH_MAP[preferredTab]) return preferredTab;
    const nid = toStableId(notification.id).toLowerCase();
    if (nid.startsWith("job-request-")) return "job-requests";
    if (nid.startsWith("earning-")) return "earnings";
    if (nid.startsWith("job-done-")) return "overview";
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
      return (
        <WorkerOverviewPage stats={stats} jobRequests={jobRequests} recentJobs={recentJobs}
          setActiveTab={navigateToTab} handleJobAction={handleJobAction}
          processingJobId={processingJobId} jobActionError={jobActionError} />
      );
    }
    if (activeTab === "job-requests") {
      return (
        <WorkerJobRequestsPage jobRequests={jobRequests} handleJobAction={handleJobAction}
          processingJobId={processingJobId} jobActionError={jobActionError} />
      );
    }
    if (activeTab === "schedule") return <WorkerSchedulePage scheduleJobs={scheduleJobs} authToken={authToken} userName={userName} />;
    if (activeTab === "earnings") return <WorkerEarningsPage stats={stats} recentJobs={recentJobs} />;
    if (activeTab === "reviews") return <WorkerReviewsPage reviews={reviews} />;
    if (activeTab === "job-profile") return <WorkerJobProfilePage authToken={authToken} defaultWorkerId={userId} defaultWorkerName={userName} />;
    if (activeTab === "profile") {
      return (
        <WorkerProfilePage authToken={authToken}
          profileForm={profileForm} profileInitialForm={profileInitialForm}
          setProfileForm={setProfileForm} profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
          emailVerification={emailVerification} setEmailVerification={setEmailVerification}
          onRequestEmailVerification={requestEmailVerification}
          onVerifyEmailChange={verifyEmailChange} />
      );
    }
    return <WorkerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} userEmail={userEmail} />;
  };

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 animated-gradient">
        <WorkerTopNav navRef={navRef} notificationMenuRef={notificationMenuRef} userMenuRef={userMenuRef}
          landingUrl={landingUrl} omniLogo={omniLogo} navTabs={NAV_TABS} activeTab={activeTab}
          navigateToTab={navigateToTab}
          showNotifications={showNotifications} setShowNotifications={setShowNotifications}
          unreadNotificationCount={unreadNotificationCount}
          visibleNotificationItems={visibleNotificationItems} readNotificationIds={readNotificationIds}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onClearNotifications={handleClearNotifications}
          showUserMenu={showUserMenu} setShowUserMenu={setShowUserMenu}
          isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenRoleSwitch={() => { setRoleSwitchStatus({ loading: false, error: "" }); setShowRoleSwitchModal(true); }}
          onLogout={onLogout}
          displayUserName={displayUserName}
          profilePhotoUrl={profilePhotoUrl} />

        <main className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoaderCard />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        <WorkerRoleSwitchModal open={showRoleSwitchModal} status={roleSwitchStatus}
          onRoleSwitch={handleRoleSwitch}
          onClose={() => { setRoleSwitchStatus({ loading: false, error: "" }); setShowRoleSwitchModal(false); }} />
      </div>
    </>
  );
};

export default WorkerDashboard;
