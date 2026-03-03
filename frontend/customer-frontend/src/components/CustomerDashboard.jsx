import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from '../assets/images/omni-logo.png';
import api from '../api';
import {
  Calendar,
  Star,
  Heart,
  Home,
  Wrench
} from 'lucide-react';
import { toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import CustomerRoleSwitchModal from "./customer-dashboard/CustomerRoleSwitchModal";
import CustomerTopNav from "./customer-dashboard/CustomerTopNav";
import { BASE_SERVICES, landingUrl } from "./customer-dashboard/constants";
import { formatInr, getRandomServicePrice, toFavoriteProvider } from "./customer-dashboard/utils";
import useCustomerProfile from "./customer-dashboard/useCustomerProfile";
import useCustomerNotifications from "./customer-dashboard/useCustomerNotifications";
import useCustomerBookingActions from "./customer-dashboard/useCustomerBookingActions";

const CustomerHomePage = lazy(() => import('../pages/customer/CustomerHomePage'));
const CustomerBookingFormPage = lazy(() => import('../pages/customer/CustomerBookingFormPage'));
const CustomerBookingsPage = lazy(() => import('../pages/customer/CustomerBookingsPage'));
const CustomerFavoritesPage = lazy(() => import('../pages/customer/CustomerFavoritesPage'));
const CustomerProfilePage = lazy(() => import('../pages/customer/CustomerProfilePage'));
const CustomerSettingsPage = lazy(() => import('../pages/customer/CustomerSettingsPage'));
const CustomerWorkerJobProfilePage = lazy(() => import('../pages/customer/CustomerWorkerJobProfilePage'));

function sortWorkersByRating(workers = []) {
  return [...workers].sort(
    (left, right) =>
      Number(right.averageRating || 0) - Number(left.averageRating || 0) ||
      Number(right.completedJobs || 0) - Number(left.completedJobs || 0) ||
      String(left.name || '').localeCompare(String(right.name || ''))
  );
}

const TAB_PATH_MAP = {
  home: '/',
  bookService: '/bookings/new',
  bookings: '/bookings',
  favorites: '/favorites',
  workerProfile: '/worker-profile',
  profile: '/profile',
  settings: '/settings'
};
const PATH_TAB_MAP = Object.fromEntries(Object.entries(TAB_PATH_MAP).map(([tab, path]) => [path, tab]));

const NAV_ITEMS = [
  { id: 'home', name: 'Dashboard', icon: Home },
  { id: 'bookings', name: 'My Bookings', icon: Calendar },
  { id: 'favorites', name: 'Favorites', icon: Heart }
];

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
          background: linear-gradient(-45deg, #f8fafc, #f1f5f9, #f8fafc, #f1f5f9);
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }
      `}
    </style>
  );
}

const CustomerDashboard = ({
  onLogout,
  brokerUrl,
  workerUrl,
  userName = 'Alex Johnson',
  userEmail = '',
  userPhotoUrl = '',
  authToken = ''
}) => {
  const bookingDiscountPercent = 5;
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: '' });
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0, completed: 0, upcoming: 0, moneySaved: 0, hasActiveSubscription: false
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    workerId: '', service: '', applyDiscount: true,
    date: '', time: '', location: '', locationLat: '', locationLng: '', description: ''
  });
  const [bookingStatus, setBookingStatus] = useState({ loading: false, error: '' });
  const [favoriteWorkerIds, setFavoriteWorkerIds] = useState([]);
  const [favoriteWorkerCatalog, setFavoriteWorkerCatalog] = useState({});
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);
  useAutoDismissStatus(bookingStatus, setBookingStatus);

  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = PATH_TAB_MAP[location.pathname] || 'home';
  const needsDashboardData = ['home', 'bookService', 'bookings', 'favorites'].includes(activeTab);
  const needsWorkersData = ['home', 'bookService', 'favorites'].includes(activeTab);
  const needsDashboardDataRef = useRef(needsDashboardData);
  const needsWorkersDataRef = useRef(needsWorkersData);
  const needsProfileData = Boolean(authToken);

  const {
    profileForm, setProfileForm, profileInitialForm,
    profileStatus, emailVerification, setEmailVerification,
    handleProfileSave, requestEmailVerification, verifyEmailChange
  } = useCustomerProfile({ authToken, userName, userEmail, needsProfileData });
  const profilePhotoUrl = String(profileForm.photoUrl || userPhotoUrl || '').trim();

  const {
    showNotifications, setShowNotifications,
    readNotificationIds, visibleNotificationItems, unreadNotificationCount,
    handleMarkNotificationRead, handleMarkAllNotificationsRead, handleClearNotifications
  } = useCustomerNotifications({ userEmail, userName, recentBookings });

  const bookingQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const rawPrice = Number(params.get('price'));
    const rawOfferDiscount = Number(params.get('discount'));
    const parsedPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : 0;
    const parsedOfferDiscount = Number.isFinite(rawOfferDiscount) && rawOfferDiscount > 0 ? Math.round(rawOfferDiscount) : 0;
    const rawAddons = String(params.get('addons') || '').split(',').map((item) => item.trim()).filter(Boolean);
    return {
      source: params.get('source') === 'worker' ? 'worker' : 'service',
      service: String(params.get('service') || '').trim(),
      workerId: String(params.get('workerId') || '').trim(),
      plan: String(params.get('plan') || '').trim(),
      addons: rawAddons,
      offer: String(params.get('offer') || '').trim(),
      discount: parsedOfferDiscount,
      price: parsedPrice
    };
  }, [location.search]);

  const favoritesStorageKey = useMemo(
    () => `omni:favorites:${String(userEmail || userName || 'customer').trim().toLowerCase()}`,
    [userEmail, userName]
  );
  const favoriteCatalogStorageKey = useMemo(
    () => `omni:favorite-workers:${String(userEmail || userName || 'customer').trim().toLowerCase()}`,
    [userEmail, userName]
  );

  useEffect(() => {
    if (!PATH_TAB_MAP[location.pathname]) navigate('/', { replace: true });
  }, [location.pathname, navigate]);

  const navigateToTab = (tab) => {
    const nextPath = TAB_PATH_MAP[tab] || '/';
    if (nextPath !== location.pathname) navigate(nextPath);
  };

  const hideUserMenu = useCallback(() => setShowUserMenu(false), []);
  const hideNotifications = useCallback(() => setShowNotifications(false), [setShowNotifications]);
  const hideMobileMenu = useCallback(() => setShowMobileMenu(false), []);
  const closeQuickMenus = useCallback(() => {
    hideUserMenu(); hideNotifications(); hideMobileMenu();
  }, [hideMobileMenu, hideNotifications, hideUserMenu]);
  const navigateBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate('/');
  };

  useQuickMenuAutoClose({
    userMenuRef, notificationMenuRef, navRef,
    hideUserMenu, hideNotifications, hideMobileMenu, closeQuickMenus,
    routePath: location.pathname, routeSearch: location.search
  });

  const serviceProviderCounts = useMemo(() => {
    const counts = new Map();
    availableWorkers.forEach((worker) => {
      const uniqueServices = new Set(
        (Array.isArray(worker.servicesProvided) ? worker.servicesProvided : [])
          .map((service) => String(service || '').trim().toLowerCase()).filter(Boolean)
      );
      uniqueServices.forEach((serviceName) => counts.set(serviceName, (counts.get(serviceName) || 0) + 1));
    });
    return counts;
  }, [availableWorkers]);

  const services = useMemo(
    () => BASE_SERVICES.map((service) => ({
      ...service,
      providers: serviceProviderCounts.get(service.name.toLowerCase()) || 0,
      price: getRandomServicePrice(service.name)
    })),
    [serviceProviderCounts]
  );

  const getServiceMetaByName = (serviceName) => {
    const normalizedName = String(serviceName || '').trim();
    if (!normalizedName) return null;
    const matchingService = services.find((s) => s.name.toLowerCase() === normalizedName.toLowerCase());
    if (matchingService) return matchingService;
    return { id: `custom-${normalizedName.toLowerCase()}`, name: normalizedName, icon: Wrench, color: 'bg-blue-500', price: getRandomServicePrice(normalizedName) };
  };

  const featuredProviders = useMemo(
    () => sortWorkersByRating(availableWorkers).map((worker) => ({
      id: worker.id, name: worker.name,
      service: worker.servicesProvided?.[0] || 'General Service',
      servicesProvided: Array.isArray(worker.servicesProvided) ? worker.servicesProvided : [],
      rating: Number(worker.averageRating || 0),
      reviews: Number(worker.completedJobs || 0),
      photoUrl: String(worker.photoUrl || ''),
      image: worker.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()
    })),
    [availableWorkers]
  );
  const featuredProvidersById = useMemo(
    () => new Map(featuredProviders.map((p) => [String(p.id || ''), toFavoriteProvider(p)]).filter(([id, p]) => id && p)),
    [featuredProviders]
  );
  const favoriteProviders = useMemo(
    () => favoriteWorkerIds.map((id) => {
      const nid = String(id || '').trim();
      if (!nid) return null;
      return featuredProvidersById.get(nid) || toFavoriteProvider(favoriteWorkerCatalog[nid]) || toFavoriteProvider({ id: nid, name: 'Worker', service: 'Service' });
    }).filter(Boolean),
    [favoriteWorkerCatalog, favoriteWorkerIds, featuredProvidersById]
  );

  const bookingSource = bookingQuery.source;
  const selectedServiceName = bookingSource === 'worker' ? String(bookingForm.service || '').trim() : bookingQuery.service;
  const selectedService = useMemo(() => {
    if (!selectedServiceName) return null;
    const baseMeta = getServiceMetaByName(selectedServiceName);
    if (!baseMeta) return null;
    if (bookingSource === 'service' && Number(bookingQuery.price) > 0) return { ...baseMeta, price: Number(bookingQuery.price) };
    return baseMeta;
  }, [bookingQuery.price, bookingSource, selectedServiceName]);

  const workersForSelectedService = useMemo(() => {
    const selectedName = String(selectedService?.name || '').trim().toLowerCase();
    if (!selectedName) return [];
    return availableWorkers.filter((w) => {
      const sp = Array.isArray(w.servicesProvided) ? w.servicesProvided : [];
      return sp.some((s) => s.trim().toLowerCase() === selectedName);
    });
  }, [availableWorkers, selectedService]);

  const selectedWorkerDetails = availableWorkers.find((w) => w.id === bookingForm.workerId) || null;
  const selectedWorkerServices = Array.isArray(selectedWorkerDetails?.servicesProvided) ? selectedWorkerDetails.servicesProvided : [];

  useEffect(() => {
    if (activeTab !== 'bookService') return;
    const today = new Date().toISOString().split('T')[0];
    const workerIdFromQuery = bookingSource === 'worker' ? bookingQuery.workerId : '';
    const serviceFromQuery = bookingSource === 'worker' ? bookingQuery.service : '';
    setBookingForm((prev) => ({
      ...prev, date: prev.date || today, workerId: workerIdFromQuery || '',
      service: bookingSource === 'worker' ? serviceFromQuery : prev.service
    }));
    setBookingStatus({ loading: false, error: '' });
  }, [activeTab, bookingSource, bookingQuery.workerId, bookingQuery.service]);

  const loadWorkers = useCallback(async ({ forceFresh = true } = {}) => {
    if (!authToken) { setAvailableWorkers([]); setWorkersLoading(false); return; }
    setWorkersLoading(true);
    try {
      const response = await api.get('/workers/available', forceFresh ? { cache: false } : {});
      setAvailableWorkers(sortWorkersByRating(Array.isArray(response.data?.workers) ? response.data.workers : []));
    } catch (_error) { setAvailableWorkers([]); }
    finally { setWorkersLoading(false); }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !needsWorkersData) { setAvailableWorkers([]); setWorkersLoading(false); return; }
    loadWorkers();
  }, [authToken, loadWorkers, needsWorkersData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesStorageKey);
      if (!raw) { setFavoriteWorkerIds([]); }
      else { const parsed = JSON.parse(raw); setFavoriteWorkerIds(Array.isArray(parsed) ? parsed.map(String) : []); }
    } catch (_error) { setFavoriteWorkerIds([]); }
    try {
      const rawCatalog = localStorage.getItem(favoriteCatalogStorageKey);
      const parsedCatalog = rawCatalog ? JSON.parse(rawCatalog) : {};
      if (!parsedCatalog || typeof parsedCatalog !== 'object' || Array.isArray(parsedCatalog)) {
        setFavoriteWorkerCatalog({});
      } else {
        const nextCatalog = Object.entries(parsedCatalog).reduce((acc, [id, provider]) => {
          const nid = String(id || '').trim();
          const snapshot = toFavoriteProvider({ ...(provider || {}), id: nid });
          if (nid && snapshot) acc[nid] = snapshot;
          return acc;
        }, {});
        setFavoriteWorkerCatalog(nextCatalog);
      }
    } catch (_error) { setFavoriteWorkerCatalog({}); }
    finally { setFavoritesHydrated(true); }
  }, [favoriteCatalogStorageKey, favoritesStorageKey]);

  useEffect(() => {
    if (!favoritesHydrated) return;
    try { localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteWorkerIds)); } catch (_e) { /* ignore */ }
    try { localStorage.setItem(favoriteCatalogStorageKey, JSON.stringify(favoriteWorkerCatalog)); } catch (_e) { /* ignore */ }
  }, [favoriteCatalogStorageKey, favoriteWorkerCatalog, favoriteWorkerIds, favoritesHydrated, favoritesStorageKey]);

  useEffect(() => {
    if (!favoriteWorkerIds.length) return;
    setFavoriteWorkerCatalog((prev) => {
      const favoriteIdSet = new Set(favoriteWorkerIds.map((id) => String(id || '').trim()).filter(Boolean));
      const next = { ...prev };
      let changed = false;
      featuredProviders.forEach((provider) => {
        const nid = String(provider.id || '').trim();
        if (!nid || !favoriteIdSet.has(nid)) return;
        const snapshot = toFavoriteProvider(provider);
        if (!snapshot) return;
        if (!next[nid] || JSON.stringify(next[nid]) !== JSON.stringify(snapshot)) { next[nid] = snapshot; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [favoriteWorkerIds, featuredProviders]);

  const loadDashboard = useCallback(async ({ forceFresh = true } = {}) => {
    try {
      const response = await api.get('/customer/dashboard', {
        params: { customer: userName },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        ...(forceFresh ? { cache: false } : {})
      });
      const nextStats = response.data?.stats || {};
      setStats({
        totalBookings: Number(nextStats.totalBookings || 0),
        completed: Number(nextStats.completed || 0),
        upcoming: Number(nextStats.upcoming || 0),
        moneySaved: Number(nextStats.moneySaved || 0),
        hasActiveSubscription: nextStats.hasActiveSubscription === true
      });
      const mappedBookings = Array.isArray(response.data?.recentBookings)
        ? response.data.recentBookings.map((booking) => ({
          status: booking.status || 'pending',
          showWorkerDetails: (booking.status || 'pending') !== 'pending',
          id: toStableId(booking._id || booking.id, `${booking.service}-${booking.date}-${booking.time}-${booking.createdAt}`),
          service: booking.service || 'Service',
          provider: (booking.status || 'pending') === 'pending' ? 'Worker will be assigned after acceptance' : booking.worker?.name || booking.workerName || 'Worker',
          workerEmail: (booking.status || 'pending') === 'pending' ? '' : booking.worker?.email || booking.workerEmail || '',
          workerPhone: (booking.status || 'pending') === 'pending' ? '' : booking.worker?.phone || booking.workerPhone || '',
          workerId: booking.workerId ? String(booking.workerId) : '',
          workerName: (booking.status || 'pending') !== 'pending' ? (booking.worker?.name || booking.workerName || '') : '',
          locationLat: typeof booking.locationLat === 'number' ? booking.locationLat : null,
          locationLng: typeof booking.locationLng === 'number' ? booking.locationLng : null,
          date: booking.date || '', time: booking.time || '',
          rating: typeof booking.rating === 'number' ? booking.rating : null,
          feedback: String(booking.feedback || ''),
          feedbackMedia: Array.isArray(booking.feedbackMedia)
            ? booking.feedbackMedia
              .map((media) => ({
                kind: media?.kind === 'video' ? 'video' : 'image',
                mimeType: String(media?.mimeType || ''),
                dataUrl: String(media?.dataUrl || '')
              }))
              .filter((media) => media.dataUrl)
            : [],
          amount: Number(booking.amount || 0),
          createdAt: booking.createdAt || ''
        }))
        : [];
      setRecentBookings(mappedBookings);
    } catch (_error) {
      setStats({ totalBookings: 0, completed: 0, upcoming: 0, moneySaved: 0, hasActiveSubscription: false });
      setRecentBookings([]);
    }
  }, [authToken, userName]);

  useEffect(() => {
    needsDashboardDataRef.current = needsDashboardData;
    needsWorkersDataRef.current = needsWorkersData;
  }, [needsDashboardData, needsWorkersData]);

  useEffect(() => {
    if (!needsDashboardData) return;
    loadDashboard();
  }, [loadDashboard, needsDashboardData]);

  useEffect(() => {
    if (!authToken) return undefined;
    const socket = createRealtimeSocket(authToken);
    if (!socket) return undefined;
    let refreshTimerId = null;
    const triggerFreshReload = () => {
      if (refreshTimerId) window.clearTimeout(refreshTimerId);
      refreshTimerId = window.setTimeout(() => {
        api.clearApiCache?.();
        if (needsDashboardDataRef.current) loadDashboard({ forceFresh: true });
        if (needsWorkersDataRef.current) loadWorkers({ forceFresh: true });
      }, 250);
    };
    socket.on('connect', triggerFreshReload);
    socket.on('booking:changed', triggerFreshReload);
    return () => {
      if (refreshTimerId) window.clearTimeout(refreshTimerId);
      socket.off('connect', triggerFreshReload);
      socket.off('booking:changed', triggerFreshReload);
      socket.disconnect();
    };
  }, [authToken, loadDashboard, loadWorkers]);

  const {
    cancelStatus, paymentStatus, notProvidedStatus, deleteStatus, reviewStatus,
    handleCancelBooking, handlePayBooking, handleDeleteBooking,
    handleMarkServiceNotProvided, handleSubmitReview
  } = useCustomerBookingActions({ authToken, loadDashboard });

  const navigateToBooking = ({ source, serviceName, workerId = '' }) => {
    const params = new URLSearchParams();
    params.set('source', source === 'worker' ? 'worker' : 'service');
    if (serviceName) params.set('service', serviceName);
    if (workerId) params.set('workerId', workerId);
    navigate(`/bookings/new?${params.toString()}`);
  };

  const closeBookingModal = ({ navigateHome = true } = {}) => {
    setBookingStatus({ loading: false, error: '' });
    setBookingForm({ workerId: '', service: '', applyDiscount: true, date: '', time: '', location: '', locationLat: '', locationLng: '', description: '' });
    if (navigateHome) navigateToTab('home');
  };

  const handleOpenWorkerJobProfile = (provider) => {
    const workerId = String(provider?.id || provider?.workerId || '').trim();
    const workerName = String(provider?.name || provider?.workerName || '').trim();
    if (!workerId && !workerName) return;
    const params = new URLSearchParams();
    if (workerId) params.set('workerId', workerId);
    if (workerName) params.set('workerName', workerName);
    navigate(`/worker-profile?${params.toString()}`);
  };

  const handleBookWorkerFromProfile = (worker) => {
    const workerId = String(worker?.id || worker?.workerId || '').trim();
    const selectedService = String(worker?.selectedService || worker?.service || '').trim();
    if (!workerId) {
      return;
    }
    setBookingForm((prev) => ({ ...prev, workerId, service: selectedService, applyDiscount: true }));
    setBookingStatus({ loading: false, error: '' });
    navigateToBooking({ source: 'worker', workerId, serviceName: selectedService });
  };

  const handleToggleFavorite = (providerId) => {
    const normalizedId = String(providerId || '').trim();
    if (!normalizedId) return;
    const selectedProvider = featuredProvidersById.get(normalizedId) || null;
    setFavoriteWorkerIds((prev) => {
      const isFavorite = prev.includes(normalizedId);
      if (isFavorite) {
        setFavoriteWorkerCatalog((current) => {
          if (!current[normalizedId]) return current;
          const next = { ...current }; delete next[normalizedId]; return next;
        });
        return prev.filter((id) => id !== normalizedId);
      }
      if (selectedProvider) setFavoriteWorkerCatalog((current) => ({ ...current, [normalizedId]: selectedProvider }));
      return [...prev, normalizedId];
    });
  };

  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || '').trim();
    if (preferredTab && TAB_PATH_MAP[preferredTab]) return preferredTab;
    const nid = toStableId(notification.id).toLowerCase();
    if (nid.startsWith('booking-confirmed-') || nid.startsWith('payment-done-') || nid.startsWith('feedback-submitted-')) return 'bookings';
    return activeTab;
  };

  const handleNotificationClick = (notification) => {
    const normalizedId = toStableId(notification?.id);
    if (!normalizedId) return;
    handleMarkNotificationRead(normalizedId);
    setShowNotifications(false);
    navigateToTab(resolveNotificationTab(notification));
  };

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === 'broker' ? brokerUrl : role === 'worker' ? workerUrl : '';
    if (!targetUrl) return;
    if (!authToken) { setShowRoleSwitchModal(false); setShowUserMenu(false); window.location.href = targetUrl; return; }
    setRoleSwitchStatus({ loading: true, error: '' });
    try {
      const response = await api.post('/auth/switch-role', { role }, { headers: { Authorization: `Bearer ${authToken}` } });
      const switchedToken = String(response.data?.token || '').trim();
      const redirectUrl = new URL(targetUrl);
      if (switchedToken) redirectUrl.searchParams.set('authToken', switchedToken);
      setShowRoleSwitchModal(false); setShowUserMenu(false);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setRoleSwitchStatus({ loading: false, error: error.response?.data?.message || 'Unable to switch role right now.' });
    }
  };

  const handleBookService = async () => {
    if (!authToken) { setBookingStatus({ loading: false, error: 'Please log in to book a service.' }); return; }
    const svcName = bookingSource === 'worker' ? String(bookingForm.service || '').trim() : String(selectedService?.name || '').trim();
    if (!svcName) { setBookingStatus({ loading: false, error: 'Select a service first.' }); return; }
    if (!bookingForm.date || !bookingForm.time) { setBookingStatus({ loading: false, error: 'Please choose date and time.' }); return; }

    let workerIdForBooking = bookingForm.workerId;
    if (bookingSource === 'service') {
      workerIdForBooking = workersForSelectedService[0]?.id || '';
      if (!workerIdForBooking) { setBookingStatus({ loading: false, error: 'No worker is available for this service right now.' }); return; }
    } else if (bookingSource === 'worker') {
      if (!workerIdForBooking) { setBookingStatus({ loading: false, error: 'Select a worker to continue.' }); return; }
      const selWorker = availableWorkers.find((w) => w.id === workerIdForBooking) || null;
      const wServices = Array.isArray(selWorker?.servicesProvided) ? selWorker.servicesProvided : [];
      if (!wServices.some((s) => s.trim().toLowerCase() === svcName.toLowerCase())) {
        setBookingStatus({ loading: false, error: 'Selected worker does not provide this service.' }); return;
      }
    } else { setBookingStatus({ loading: false, error: 'Please start booking from a service or available worker.' }); return; }

    setBookingStatus({ loading: true, error: '' });
    try {
      const bookedServiceMeta = getServiceMetaByName(svcName);
      const baseAmount = Number(selectedService?.price || bookedServiceMeta?.price || getRandomServicePrice(svcName));
      const isDiscountApplied = bookingForm.applyDiscount !== false;
      const discountAmount = isDiscountApplied && baseAmount > 0 ? Math.round(baseAmount * (bookingDiscountPercent / 100)) : 0;
      const bookingAmount = baseAmount > 0 ? Math.max(0, baseAmount - discountAmount) : 0;
      const bookingResponse = await api.post('/bookings', {
        service: svcName, workerId: workerIdForBooking,
        date: bookingForm.date, time: bookingForm.time,
        location: bookingForm.location,
        locationLat: Number.isFinite(Number(bookingForm.locationLat)) ? Number(bookingForm.locationLat) : null,
        locationLng: Number.isFinite(Number(bookingForm.locationLng)) ? Number(bookingForm.locationLng) : null,
        description: bookingForm.description,
        applyDiscount: bookingForm.applyDiscount !== false,
        amount: bookingAmount
      }, { headers: { Authorization: `Bearer ${authToken}` } });

      const createdBooking = bookingResponse?.data?.booking || null;
      if (createdBooking && (createdBooking._id || createdBooking.id)) {
        const createdBookingId = toStableId(createdBooking._id || createdBooking.id, `${svcName}-${bookingForm.date}-${bookingForm.time}-${Date.now()}`);
        setRecentBookings((prev) => [{
          status: createdBooking.status || 'pending', showWorkerDetails: false, id: createdBookingId,
          service: createdBooking.service || svcName || 'Service',
          provider: 'Worker will be assigned after acceptance',
          workerEmail: '', workerPhone: '',
          date: createdBooking.date || bookingForm.date || '',
          time: createdBooking.time || bookingForm.time || '',
          rating: null, feedback: '', feedbackMedia: [], amount: Number(createdBooking.amount || 0),
          createdAt: createdBooking.createdAt || new Date().toISOString()
        }, ...prev.filter((b) => b.id !== createdBookingId)]);
      }
      setBookingStatus({ loading: false, error: '' });
      closeBookingModal({ navigateHome: false });
      navigateToTab('bookings');
      await loadDashboard();
    } catch (error) {
      setBookingStatus({ loading: false, error: error.response?.data?.message || 'Unable to book this service right now.' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'upcoming': case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'failed': return 'text-red-700 bg-red-100';
      case 'not-provided': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));

  const workerSupportsSelectedService = selectedWorkerServices.some(
    (s) => s.trim().toLowerCase() === String(bookingForm.service || '').trim().toLowerCase()
  );
  const canSubmitBooking = bookingSource === 'service'
    ? workersForSelectedService.length > 0
    : bookingSource === 'worker'
      ? Boolean(selectedWorkerDetails) && Boolean(bookingForm.service) && workerSupportsSelectedService
      : false;

  const renderActivePage = () => {
    if (activeTab === 'home') {
      return (
        <CustomerHomePage userName={userName} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          stats={stats} featuredProviders={featuredProviders} favoriteWorkerIds={favoriteWorkerIds}
          workersLoading={workersLoading} renderStars={renderStars}
          onViewWorkerProfile={handleOpenWorkerJobProfile} onToggleFavorite={handleToggleFavorite} />
      );
    }
    if (activeTab === 'bookService') {
      return (
        <CustomerBookingFormPage bookingSource={bookingSource} selectedService={selectedService}
          selectedPlanName={bookingQuery.plan} selectedAddOnNames={bookingQuery.addons}
          selectedOfferTitle={bookingQuery.offer} selectedOfferDiscount={bookingQuery.discount}
          selectedWorkerDetails={selectedWorkerDetails} selectedWorkerServices={selectedWorkerServices}
          workersForSelectedService={workersForSelectedService}
          bookingForm={bookingForm} setBookingForm={setBookingForm}
          bookingStatus={bookingStatus} canSubmitBooking={canSubmitBooking}
          handleBookService={handleBookService}
          onServiceChange={(serviceName) => { setBookingForm((prev) => ({ ...prev, service: serviceName })); setBookingStatus({ loading: false, error: '' }); }}
          onBack={navigateBack} formatInr={formatInr} discountPercent={bookingDiscountPercent} />
      );
    }
    if (activeTab === 'bookings') {
      return (
        <CustomerBookingsPage recentBookings={recentBookings} getStatusColor={getStatusColor} renderStars={renderStars}
          onCancelBooking={handleCancelBooking} onPayBooking={handlePayBooking}
          onMarkServiceNotProvided={handleMarkServiceNotProvided} onDeleteBooking={handleDeleteBooking}
          cancelLoadingBookingId={cancelStatus.loadingBookingId} cancelError={cancelStatus.error}
          payLoadingBookingId={paymentStatus.loadingBookingId} payError={paymentStatus.error}
          notProvidedLoadingBookingId={notProvidedStatus.loadingBookingId} notProvidedError={notProvidedStatus.error}
          deleteLoadingBookingId={deleteStatus.loadingBookingId} deleteError={deleteStatus.error}
          onSubmitReview={handleSubmitReview} reviewLoadingBookingId={reviewStatus.loadingBookingId}
          reviewError={reviewStatus.error} authToken={authToken} userName={userName} />
      );
    }
    if (activeTab === 'favorites') {
      return (
        <CustomerFavoritesPage favoriteProviders={favoriteProviders} renderStars={renderStars}
          onToggleFavorite={handleToggleFavorite} onBookProvider={handleBookWorkerFromProfile}
          onViewWorkerProfile={handleOpenWorkerJobProfile} />
      );
    }
    if (activeTab === 'workerProfile') return <CustomerWorkerJobProfilePage authToken={authToken} onBookWorker={handleBookWorkerFromProfile} />;
    if (activeTab === 'profile') {
      return (
        <CustomerProfilePage userName={userName} userEmail={userEmail}
          profileForm={profileForm} profileInitialForm={profileInitialForm}
          setProfileForm={setProfileForm} profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
          emailVerification={emailVerification} setEmailVerification={setEmailVerification}
          onRequestEmailVerification={requestEmailVerification} onVerifyEmailChange={verifyEmailChange} />
      );
    }
    return <CustomerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} />;
  };

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 animated-gradient">
        <CustomerTopNav navRef={navRef} notificationMenuRef={notificationMenuRef} userMenuRef={userMenuRef}
          landingUrl={landingUrl} omniLogo={omniLogo} navItems={NAV_ITEMS} activeTab={activeTab}
          navigateToTab={navigateToTab}
          showNotifications={showNotifications} setShowNotifications={setShowNotifications}
          unreadNotificationCount={unreadNotificationCount}
          visibleNotificationItems={visibleNotificationItems} readNotificationIds={readNotificationIds}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onClearNotifications={handleClearNotifications}
          showUserMenu={showUserMenu} setShowUserMenu={setShowUserMenu}
          showMobileMenu={showMobileMenu} setShowMobileMenu={setShowMobileMenu}
          onOpenRoleSwitch={() => { setRoleSwitchStatus({ loading: false, error: "" }); setShowRoleSwitchModal(true); }}
          onLogout={onLogout}
          userName={userName}
          profilePhotoUrl={profilePhotoUrl} />

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageLoaderCard />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        <CustomerRoleSwitchModal open={showRoleSwitchModal} status={roleSwitchStatus}
          onRoleSwitch={handleRoleSwitch}
          onClose={() => { setRoleSwitchStatus({ loading: false, error: "" }); setShowRoleSwitchModal(false); }} />
      </div>
    </>
  );
};

export default CustomerDashboard;
