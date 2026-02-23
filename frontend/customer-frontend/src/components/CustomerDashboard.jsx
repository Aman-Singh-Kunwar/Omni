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
import { toShortErrorMessage, toStableId } from "@shared/utils/common";
import { createRealtimeSocket } from "@shared/utils/realtime";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";
import PageLoaderCard from "@shared/components/PageLoaderCard";
import CustomerRoleSwitchModal from "./customer-dashboard/CustomerRoleSwitchModal";
import CustomerTopNav from "./customer-dashboard/CustomerTopNav";
import { BASE_SERVICES, landingUrl } from "./customer-dashboard/constants";
import { formatInr, getRandomServicePrice, toFavoriteProvider } from "./customer-dashboard/utils";

const CustomerHomePage = lazy(() => import('../pages/customer/CustomerHomePage'));
const CustomerBookingFormPage = lazy(() => import('../pages/customer/CustomerBookingFormPage'));
const CustomerBookingsPage = lazy(() => import('../pages/customer/CustomerBookingsPage'));
const CustomerFavoritesPage = lazy(() => import('../pages/customer/CustomerFavoritesPage'));
const CustomerProfilePage = lazy(() => import('../pages/customer/CustomerProfilePage'));
const CustomerSettingsPage = lazy(() => import('../pages/customer/CustomerSettingsPage'));

const CustomerDashboard = ({ onLogout, brokerUrl, workerUrl, userName = 'Alex Johnson', userEmail = '', authToken = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [roleSwitchStatus, setRoleSwitchStatus] = useState({ loading: false, error: '' });
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completed: 0,
    upcoming: 0,
    moneySaved: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    workerId: '',
    service: '',
    applyDiscount: true,
    date: '',
    time: '',
    location: '',
    locationLat: '',
    locationLng: '',
    description: ''
  });
  const [bookingStatus, setBookingStatus] = useState({ loading: false, error: '' });
  const [cancelStatus, setCancelStatus] = useState({ loadingBookingId: '', error: '' });
  const [paymentStatus, setPaymentStatus] = useState({ loadingBookingId: '', error: '' });
  const [notProvidedStatus, setNotProvidedStatus] = useState({ loadingBookingId: '', error: '' });
  const [deleteStatus, setDeleteStatus] = useState({ loadingBookingId: '', error: '' });
  const [reviewStatus, setReviewStatus] = useState({ loadingBookingId: '', error: '' });
  const [favoriteWorkerIds, setFavoriteWorkerIds] = useState([]);
  const [favoriteWorkerCatalog, setFavoriteWorkerCatalog] = useState({});
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
  const [notificationsHydrated, setNotificationsHydrated] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userName,
    email: userEmail,
    bio: '',
    gender: '',
    dateOfBirth: '',
    phone: ''
  });
  const [profileInitialForm, setProfileInitialForm] = useState({
    name: userName,
    email: userEmail,
    bio: '',
    gender: '',
    dateOfBirth: '',
    phone: ''
  });
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: '', success: '' });
  useAutoDismissStatus(roleSwitchStatus, setRoleSwitchStatus);
  useAutoDismissStatus(bookingStatus, setBookingStatus);
  useAutoDismissStatus(cancelStatus, setCancelStatus);
  useAutoDismissStatus(paymentStatus, setPaymentStatus);
  useAutoDismissStatus(notProvidedStatus, setNotProvidedStatus);
  useAutoDismissStatus(deleteStatus, setDeleteStatus);
  useAutoDismissStatus(reviewStatus, setReviewStatus);
  useAutoDismissStatus(profileStatus, setProfileStatus);
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tabPathMap = useMemo(
    () => ({
      home: '/',
      bookService: '/bookings/new',
      bookings: '/bookings',
      favorites: '/favorites',
      profile: '/profile',
      settings: '/settings'
    }),
    []
  );
  const pathTabMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(tabPathMap).map(([tab, path]) => [path, tab])
      ),
    [tabPathMap]
  );
  const activeTab = pathTabMap[location.pathname] || 'home';
  const needsDashboardData = ['home', 'bookService', 'bookings', 'favorites'].includes(activeTab);
  const needsWorkersData = ['home', 'bookService', 'favorites'].includes(activeTab);
  const needsDashboardDataRef = useRef(needsDashboardData);
  const needsWorkersDataRef = useRef(needsWorkersData);
  const needsProfileData = activeTab === 'profile';
  const bookingQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      source: params.get('source') === 'worker' ? 'worker' : 'service',
      service: String(params.get('service') || '').trim(),
      workerId: String(params.get('workerId') || '').trim()
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
  const notificationStorageKey = useMemo(
    () => `omni:notifications:customer:${String(userEmail || userName || 'customer').trim().toLowerCase()}`,
    [userEmail, userName]
  );

  useEffect(() => {
    if (!pathTabMap[location.pathname]) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate, pathTabMap]);

  const navigateToTab = (tab) => {
    const nextPath = tabPathMap[tab] || '/';
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
    setShowMobileMenu(false);
  }, []);
  const closeQuickMenus = useCallback(() => {
    hideUserMenu();
    hideNotifications();
    hideMobileMenu();
  }, [hideMobileMenu, hideNotifications, hideUserMenu]);
  const navigateBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const serviceProviderCounts = useMemo(() => {
    const counts = new Map();

    availableWorkers.forEach((worker) => {
      const uniqueServices = new Set(
        (Array.isArray(worker.servicesProvided) ? worker.servicesProvided : [])
          .map((service) => String(service || '').trim().toLowerCase())
          .filter(Boolean)
      );
      uniqueServices.forEach((serviceName) => {
        counts.set(serviceName, (counts.get(serviceName) || 0) + 1);
      });
    });

    return counts;
  }, [availableWorkers]);

  const services = useMemo(
    () =>
      BASE_SERVICES.map((service) => ({
        ...service,
        providers: serviceProviderCounts.get(service.name.toLowerCase()) || 0,
        price: getRandomServicePrice(service.name)
      })),
    [serviceProviderCounts]
  );
  const getServiceMetaByName = (serviceName) => {
    const normalizedName = String(serviceName || '').trim();
    if (!normalizedName) {
      return null;
    }

    const matchingService = services.find((service) => service.name.toLowerCase() === normalizedName.toLowerCase());
    if (matchingService) {
      return matchingService;
    }

    return {
      id: `custom-${normalizedName.toLowerCase()}`,
      name: normalizedName,
      icon: Wrench,
      color: 'bg-blue-500',
      price: getRandomServicePrice(normalizedName)
    };
  };

  const featuredProviders = useMemo(
    () =>
      availableWorkers
        .map((worker) => ({
          id: worker.id,
          name: worker.name,
          service: worker.servicesProvided?.[0] || 'General Service',
          servicesProvided: Array.isArray(worker.servicesProvided) ? worker.servicesProvided : [],
          rating: Number(worker.averageRating || 0),
          reviews: Number(worker.completedJobs || 0),
          image: worker.name
            .split(' ')
            .map((chunk) => chunk[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        }))
        .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || a.name.localeCompare(b.name)),
    [availableWorkers]
  );
  const featuredProvidersById = useMemo(
    () =>
      new Map(
        featuredProviders
          .map((provider) => [String(provider.id || ''), toFavoriteProvider(provider)])
          .filter(([id, provider]) => id && provider)
      ),
    [featuredProviders]
  );
  const favoriteProviders = useMemo(
    () =>
      favoriteWorkerIds
        .map((id) => {
          const normalizedId = String(id || '').trim();
          if (!normalizedId) {
            return null;
          }

          return (
            featuredProvidersById.get(normalizedId) ||
            toFavoriteProvider(favoriteWorkerCatalog[normalizedId]) ||
            toFavoriteProvider({ id: normalizedId, name: 'Worker', service: 'Service' })
          );
        })
        .filter(Boolean),
    [favoriteWorkerCatalog, favoriteWorkerIds, featuredProvidersById]
  );
  const bookingSource = bookingQuery.source;
  const selectedServiceName = bookingSource === 'worker' ? String(bookingForm.service || '').trim() : bookingQuery.service;
  const selectedService = selectedServiceName ? getServiceMetaByName(selectedServiceName) : null;

  const workersForSelectedService = useMemo(() => {
    const selectedName = String(selectedService?.name || '')
      .trim()
      .toLowerCase();
    if (!selectedName) {
      return [];
    }

    return availableWorkers.filter((worker) => {
      const servicesProvided = Array.isArray(worker.servicesProvided) ? worker.servicesProvided : [];
      return servicesProvided.some((service) => service.trim().toLowerCase() === selectedName);
    });
  }, [availableWorkers, selectedService]);
  const selectedWorkerDetails = availableWorkers.find((worker) => worker.id === bookingForm.workerId) || null;
  const selectedWorkerServices = Array.isArray(selectedWorkerDetails?.servicesProvided) ? selectedWorkerDetails.servicesProvided : [];
  const notificationItems = useMemo(() => {
    const items = [];

    recentBookings.forEach((booking) => {
      const bookingId = toStableId(booking.id, `${booking.service}-${booking.date}-${booking.time}-${booking.createdAt}`);
      const status = String(booking.status || '').toLowerCase();
      const bookingTimeLabel = booking.date ? `${booking.date}${booking.time ? ` at ${booking.time}` : ''}` : 'recently';
      const serviceLabel = booking.service || 'service';

      if (['confirmed', 'upcoming', 'in-progress'].includes(status)) {
        items.push({
          id: `booking-confirmed-${bookingId}`,
          title: 'Booking confirmed',
          message: `${serviceLabel} booking is confirmed for ${bookingTimeLabel}.`,
          targetTab: 'bookings'
        });
      }

      if (status === 'completed') {
        items.push({
          id: `payment-done-${bookingId}`,
          title: 'Payment done',
          message: `Payment completed for ${serviceLabel}.`,
          targetTab: 'bookings'
        });
      }

      if (typeof booking.rating === 'number' || String(booking.feedback || '').trim()) {
        items.push({
          id: `feedback-submitted-${bookingId}`,
          title: 'Feedback submitted',
          message: `Feedback updated for ${serviceLabel}.`,
          targetTab: 'bookings'
        });
      }
    });

    return items.slice(0, 20);
  }, [recentBookings]);
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
    if (activeTab !== 'bookService') {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const workerIdFromQuery = bookingSource === 'worker' ? bookingQuery.workerId : '';
    setBookingForm((prev) => ({
      ...prev,
      date: prev.date || today,
      workerId: workerIdFromQuery || '',
      service: bookingSource === 'worker' ? '' : prev.service
    }));
    setBookingStatus({ loading: false, error: '' });
  }, [activeTab, bookingSource, bookingQuery.workerId]);

  const loadWorkers = useCallback(async ({ forceFresh = true } = {}) => {
    if (!authToken) {
      setAvailableWorkers([]);
      setWorkersLoading(false);
      return;
    }

    setWorkersLoading(true);
    try {
      const response = await api.get('/workers/available', forceFresh ? { cache: false } : {});
      setAvailableWorkers(Array.isArray(response.data?.workers) ? response.data.workers : []);
    } catch (_error) {
      setAvailableWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !needsWorkersData) {
      setAvailableWorkers([]);
      setWorkersLoading(false);
      return;
    }

    loadWorkers();
  }, [authToken, loadWorkers, needsWorkersData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesStorageKey);
      if (!raw) {
        setFavoriteWorkerIds([]);
      } else {
        const parsed = JSON.parse(raw);
        setFavoriteWorkerIds(Array.isArray(parsed) ? parsed.map((id) => String(id)) : []);
      }
    } catch (_error) {
      setFavoriteWorkerIds([]);
    }
    try {
      const rawCatalog = localStorage.getItem(favoriteCatalogStorageKey);
      const parsedCatalog = rawCatalog ? JSON.parse(rawCatalog) : {};
      if (!parsedCatalog || typeof parsedCatalog !== 'object' || Array.isArray(parsedCatalog)) {
        setFavoriteWorkerCatalog({});
      } else {
        const nextCatalog = Object.entries(parsedCatalog).reduce((acc, [id, provider]) => {
          const normalizedId = String(id || '').trim();
          const snapshot = toFavoriteProvider({ ...(provider || {}), id: normalizedId });
          if (normalizedId && snapshot) {
            acc[normalizedId] = snapshot;
          }
          return acc;
        }, {});
        setFavoriteWorkerCatalog(nextCatalog);
      }
    } catch (_error) {
      setFavoriteWorkerCatalog({});
    } finally {
      setFavoritesHydrated(true);
    }
  }, [favoriteCatalogStorageKey, favoritesStorageKey]);

  useEffect(() => {
    if (!favoritesHydrated) {
      return;
    }

    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteWorkerIds));
    } catch (_error) {
      // Ignore storage errors for private mode or blocked storage.
    }
    try {
      localStorage.setItem(favoriteCatalogStorageKey, JSON.stringify(favoriteWorkerCatalog));
    } catch (_error) {
      // Ignore storage errors for private mode or blocked storage.
    }
  }, [favoriteCatalogStorageKey, favoriteWorkerCatalog, favoriteWorkerIds, favoritesHydrated, favoritesStorageKey]);

  useEffect(() => {
    if (!favoriteWorkerIds.length) {
      return;
    }

    setFavoriteWorkerCatalog((prev) => {
      const favoriteIdSet = new Set(favoriteWorkerIds.map((id) => String(id || '').trim()).filter(Boolean));
      const next = { ...prev };
      let changed = false;

      featuredProviders.forEach((provider) => {
        const normalizedId = String(provider.id || '').trim();
        if (!normalizedId || !favoriteIdSet.has(normalizedId)) {
          return;
        }
        const snapshot = toFavoriteProvider(provider);
        if (!snapshot) {
          return;
        }
        const existing = next[normalizedId];
        if (!existing || JSON.stringify(existing) !== JSON.stringify(snapshot)) {
          next[normalizedId] = snapshot;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [favoriteWorkerIds, featuredProviders]);

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
      const response = await api.get('/customer/dashboard', {
        params: { customer: userName },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        ...(forceFresh ? { cache: false } : {})
      });

      setStats(response.data?.stats || { totalBookings: 0, completed: 0, upcoming: 0, moneySaved: 0 });

      const mappedBookings = Array.isArray(response.data?.recentBookings)
        ? response.data.recentBookings.map((booking) => ({
            status: booking.status || 'pending',
            showWorkerDetails: (booking.status || 'pending') !== 'pending',
            id: toStableId(booking._id || booking.id, `${booking.service}-${booking.date}-${booking.time}-${booking.createdAt}`),
            service: booking.service || 'Service',
            provider:
              (booking.status || 'pending') === 'pending'
                ? 'Worker will be assigned after acceptance'
                : booking.worker?.name || booking.workerName || 'Worker',
            workerEmail:
              (booking.status || 'pending') === 'pending' ? '' : booking.worker?.email || booking.workerEmail || '',
            workerPhone:
              (booking.status || 'pending') === 'pending' ? '' : booking.worker?.phone || booking.workerPhone || '',
            date: booking.date || '',
            time: booking.time || '',
            rating: typeof booking.rating === 'number' ? booking.rating : null,
            feedback: String(booking.feedback || ''),
            amount: Number(booking.amount || 0),
            createdAt: booking.createdAt || ''
          }))
        : [];

      setRecentBookings(mappedBookings);
    } catch (_error) {
      setStats({ totalBookings: 0, completed: 0, upcoming: 0, moneySaved: 0 });
      setRecentBookings([]);
    }
  }, [authToken, userName]);

  useEffect(() => {
    needsDashboardDataRef.current = needsDashboardData;
    needsWorkersDataRef.current = needsWorkersData;
  }, [needsDashboardData, needsWorkersData]);

  useEffect(() => {
    if (!needsDashboardData) {
      return;
    }
    loadDashboard();
  }, [loadDashboard, needsDashboardData]);

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
        if (needsDashboardDataRef.current) {
          loadDashboard({ forceFresh: true });
        }
        if (needsWorkersDataRef.current) {
          loadWorkers({ forceFresh: true });
        }
      }, 250);
    };

    socket.on('connect', triggerFreshReload);
    socket.on('booking:changed', triggerFreshReload);

    return () => {
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
      }
      socket.off('connect', triggerFreshReload);
      socket.off('booking:changed', triggerFreshReload);
      socket.disconnect();
    };
  }, [authToken, loadDashboard, loadWorkers]);

  useEffect(() => {
    const fallback = {
      name: userName,
      email: userEmail,
      bio: '',
      gender: '',
      dateOfBirth: '',
      phone: ''
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
        const response = await api.get('/profile', {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const user = response.data?.user || {};
        const profile = response.data?.profile || {};
        const nextProfile = {
          name: user.name || fallback.name,
          email: user.email || fallback.email,
          bio: profile.bio || '',
          gender: profile.gender || '',
          dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
          phone: profile.phone || ''
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

  const navigateToBooking = ({ source, serviceName, workerId = '' }) => {
    const params = new URLSearchParams();
    params.set('source', source === 'worker' ? 'worker' : 'service');
    if (serviceName) {
      params.set('service', serviceName);
    }
    if (workerId) {
      params.set('workerId', workerId);
    }
    navigate(`/bookings/new?${params.toString()}`);
  };

  const handleServiceSelect = (service) => {
    setBookingForm((prev) => ({ ...prev, workerId: '', service: '', applyDiscount: true }));
    setBookingStatus({ loading: false, error: '' });
    navigateToBooking({ source: 'service', serviceName: service.name });
  };

  const closeBookingModal = ({ navigateHome = true } = {}) => {
    setBookingStatus({ loading: false, error: '' });
    setBookingForm({
      workerId: '',
      service: '',
      applyDiscount: true,
      date: '',
      time: '',
      location: '',
      locationLat: '',
      locationLng: '',
      description: ''
    });
    if (navigateHome) {
      navigateToTab('home');
    }
  };

  const handleProviderBook = (provider) => {
    setBookingForm((prev) => ({ ...prev, workerId: provider.id || '', service: '', applyDiscount: true }));
    setBookingStatus({ loading: false, error: '' });
    navigateToBooking({
      source: 'worker',
      workerId: provider.id || ''
    });
  };

  const handleToggleFavorite = (providerId) => {
    const normalizedId = String(providerId || '').trim();
    if (!normalizedId) {
      return;
    }

    const selectedProvider = featuredProvidersById.get(normalizedId) || null;
    setFavoriteWorkerIds((prev) => {
      const isFavorite = prev.includes(normalizedId);

      if (isFavorite) {
        setFavoriteWorkerCatalog((current) => {
          if (!current[normalizedId]) {
            return current;
          }
          const next = { ...current };
          delete next[normalizedId];
          return next;
        });
        return prev.filter((id) => id !== normalizedId);
      }

      if (selectedProvider) {
        setFavoriteWorkerCatalog((current) => ({
          ...current,
          [normalizedId]: selectedProvider
        }));
      }
      return [...prev, normalizedId];
    });
  };
  const handleMarkNotificationRead = (notificationId) => {
    const normalizedId = toStableId(notificationId);
    if (!normalizedId) {
      return;
    }
    setReadNotificationIds((prev) => (prev.includes(normalizedId) ? prev : [...prev, normalizedId]));
  };
  const resolveNotificationTab = (notification = {}) => {
    const preferredTab = String(notification.targetTab || '').trim();
    if (preferredTab && tabPathMap[preferredTab]) {
      return preferredTab;
    }

    const normalizedId = toStableId(notification.id).toLowerCase();
    if (
      normalizedId.startsWith('booking-confirmed-') ||
      normalizedId.startsWith('payment-done-') ||
      normalizedId.startsWith('feedback-submitted-')
    ) {
      return 'bookings';
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

  const handleBookService = async () => {
    if (!authToken) {
      setBookingStatus({ loading: false, error: 'Please log in to book a service.' });
      return;
    }
    const selectedServiceName =
      bookingSource === 'worker'
        ? String(bookingForm.service || '').trim()
        : String(selectedService?.name || '').trim();
    if (!selectedServiceName) {
      setBookingStatus({ loading: false, error: 'Select a service first.' });
      return;
    }
    if (!bookingForm.date || !bookingForm.time) {
      setBookingStatus({ loading: false, error: 'Please choose date and time.' });
      return;
    }

    let workerIdForBooking = bookingForm.workerId;
    if (bookingSource === 'service') {
      workerIdForBooking = workersForSelectedService[0]?.id || '';
      if (!workerIdForBooking) {
        setBookingStatus({ loading: false, error: 'No worker is available for this service right now.' });
        return;
      }
    } else if (bookingSource === 'worker') {
      if (!workerIdForBooking) {
        setBookingStatus({ loading: false, error: 'Select a worker to continue.' });
        return;
      }

      const selectedWorker = availableWorkers.find((worker) => worker.id === workerIdForBooking) || null;
      const workerServices = Array.isArray(selectedWorker?.servicesProvided) ? selectedWorker.servicesProvided : [];
      const workerSupportsService = workerServices.some(
        (service) => service.trim().toLowerCase() === selectedServiceName.toLowerCase()
      );
      if (!workerSupportsService) {
        setBookingStatus({ loading: false, error: 'Selected worker does not provide this service.' });
        return;
      }
    } else {
      setBookingStatus({ loading: false, error: 'Please start booking from a service or available worker.' });
      return;
    }

    setBookingStatus({ loading: true, error: '' });
    try {
      const bookedServiceMeta = getServiceMetaByName(selectedServiceName);
      const bookingResponse = await api.post(
        '/bookings',
        {
          service: selectedServiceName,
          workerId: workerIdForBooking,
          date: bookingForm.date,
          time: bookingForm.time,
          location: bookingForm.location,
          description: bookingForm.description,
          applyDiscount: bookingForm.applyDiscount !== false,
          amount: Number(bookedServiceMeta?.price || 0) > 0 ? Number(bookedServiceMeta.price) : getRandomServicePrice(selectedServiceName)
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const createdBooking = bookingResponse?.data?.booking || null;
      if (createdBooking && (createdBooking._id || createdBooking.id)) {
        const createdBookingId = toStableId(
          createdBooking._id || createdBooking.id,
          `${selectedServiceName}-${bookingForm.date}-${bookingForm.time}-${Date.now()}`
        );
        const createdBookingRecord = {
          status: createdBooking.status || 'pending',
          showWorkerDetails: false,
          id: createdBookingId,
          service: createdBooking.service || selectedServiceName || 'Service',
          provider: 'Worker will be assigned after acceptance',
          workerEmail: '',
          workerPhone: '',
          date: createdBooking.date || bookingForm.date || '',
          time: createdBooking.time || bookingForm.time || '',
          rating: null,
          feedback: '',
          amount: Number(createdBooking.amount || 0),
          createdAt: createdBooking.createdAt || new Date().toISOString()
        };

        setRecentBookings((prev) => [createdBookingRecord, ...prev.filter((booking) => booking.id !== createdBookingId)]);
      }

      setBookingStatus({ loading: false, error: '' });
      closeBookingModal({ navigateHome: false });
      navigateToTab('bookings');
      await loadDashboard();
    } catch (error) {
      setBookingStatus({
        loading: false,
        error: error.response?.data?.message || 'Unable to book this service right now.'
      });
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!authToken) {
      setCancelStatus({ loadingBookingId: '', error: 'Please log in to cancel bookings.' });
      return;
    }

    setCancelStatus({ loadingBookingId: bookingId, error: '' });
    setPaymentStatus((prev) => ({ ...prev, error: '' }));
    try {
      await api.patch(
        `/customer/bookings/${bookingId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setCancelStatus({ loadingBookingId: '', error: '' });
      await loadDashboard();
    } catch (error) {
      setCancelStatus({
        loadingBookingId: '',
        error: error.response?.data?.message || 'Unable to cancel this booking right now.'
      });
    }
  };

  const handlePayBooking = async (bookingId) => {
    if (!authToken) {
      setPaymentStatus({ loadingBookingId: '', error: 'Please log in to continue payment.' });
      return;
    }

    setPaymentStatus({ loadingBookingId: bookingId, error: '' });
    setCancelStatus((prev) => ({ ...prev, error: '' }));
    try {
      await api.patch(
        `/customer/bookings/${bookingId}/pay`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setPaymentStatus({ loadingBookingId: '', error: '' });
      await loadDashboard();
    } catch (error) {
      setPaymentStatus({
        loadingBookingId: '',
        error: error.response?.data?.message || 'Unable to complete payment right now.'
      });
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!authToken) {
      setDeleteStatus({ loadingBookingId: '', error: 'Please log in to delete bookings.' });
      return;
    }

    setDeleteStatus({ loadingBookingId: bookingId, error: '' });
    setCancelStatus((prev) => ({ ...prev, error: '' }));
    setPaymentStatus((prev) => ({ ...prev, error: '' }));
    try {
      await api.delete(`/customer/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDeleteStatus({ loadingBookingId: '', error: '' });
      await loadDashboard();
    } catch (error) {
      setDeleteStatus({
        loadingBookingId: '',
        error: error.response?.data?.message || 'Unable to delete this booking right now.'
      });
    }
  };

  const handleMarkServiceNotProvided = async (bookingId) => {
    if (!authToken) {
      setNotProvidedStatus({ loadingBookingId: '', error: 'Please log in to report booking issues.' });
      return;
    }

    setNotProvidedStatus({ loadingBookingId: bookingId, error: '' });
    setCancelStatus((prev) => ({ ...prev, error: '' }));
    setPaymentStatus((prev) => ({ ...prev, error: '' }));
    try {
      await api.patch(
        `/customer/bookings/${bookingId}/not-provided`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setNotProvidedStatus({ loadingBookingId: '', error: '' });
      await loadDashboard();
    } catch (error) {
      setNotProvidedStatus({
        loadingBookingId: '',
        error: error.response?.data?.message || 'Unable to mark this booking right now.'
      });
    }
  };

  const handleSubmitReview = async (bookingId, { rating, feedback }) => {
    if (!authToken) {
      setReviewStatus({ loadingBookingId: '', error: 'Please log in to submit review.' });
      return false;
    }

    setReviewStatus({ loadingBookingId: bookingId, error: '' });
    try {
      await api.patch(
        `/customer/bookings/${bookingId}/review`,
        {
          rating,
          feedback
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setReviewStatus({ loadingBookingId: '', error: '' });
      await loadDashboard();
      return true;
    } catch (error) {
      setReviewStatus({
        loadingBookingId: '',
        error: error.response?.data?.message || 'Unable to submit review right now.'
      });
      return false;
    }
  };

  const handleRoleSwitch = async (role) => {
    const targetUrl = role === 'broker' ? brokerUrl : role === 'worker' ? workerUrl : '';
    if (!targetUrl) {
      return;
    }

    if (!authToken) {
      setShowRoleSwitchModal(false);
      setShowUserMenu(false);
      window.location.href = targetUrl;
      return;
    }

    setRoleSwitchStatus({ loading: true, error: '' });
    try {
      const response = await api.post(
        '/auth/switch-role',
        { role },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const switchedToken = String(response.data?.token || '').trim();
      const redirectUrl = new URL(targetUrl);
      if (switchedToken) {
        redirectUrl.searchParams.set('authToken', switchedToken);
      }
      setShowRoleSwitchModal(false);
      setShowUserMenu(false);
      window.location.href = redirectUrl.toString();
    } catch (error) {
      setRoleSwitchStatus({
        loading: false,
        error: error.response?.data?.message || 'Unable to switch role right now.'
      });
    }
  };

  const handleProfileSave = async () => {
    if (!authToken) {
      setProfileStatus({ loading: false, error: 'Please log in to save your profile.', success: '' });
      return;
    }

    setProfileStatus({ loading: true, error: '', success: '' });

    try {
      const response = await api.put(
        '/profile',
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
        name: user.name || profileForm.name,
        email: user.email || profileForm.email,
        bio: profile.bio || '',
        gender: profile.gender || '',
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
        phone: profile.phone || ''
      };
      setProfileForm(nextProfile);
      setProfileInitialForm(nextProfile);
      setProfileStatus({ loading: false, error: '', success: 'Profile updated.' });
    } catch (error) {
      setProfileStatus({
        loading: false,
        error: toShortErrorMessage(error.response?.data?.message, 'Unable to save profile.'),
        success: ''
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'upcoming':
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'not-provided':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));

  const navItems = [
    { id: 'home', name: 'Dashboard', icon: Home },
    { id: 'bookings', name: 'My Bookings', icon: Calendar },
    { id: 'favorites', name: 'Favorites', icon: Heart }
  ];
  const workerSupportsSelectedService = selectedWorkerServices.some(
    (service) => service.trim().toLowerCase() === String(bookingForm.service || '').trim().toLowerCase()
  );
  const canSubmitBooking =
    bookingSource === 'service'
      ? workersForSelectedService.length > 0
      : bookingSource === 'worker'
        ? Boolean(selectedWorkerDetails) && Boolean(bookingForm.service) && workerSupportsSelectedService
        : false;

  const renderActivePage = () => {
    if (activeTab === 'home') {
      return (
        <CustomerHomePage
          userName={userName}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          services={services}
          handleServiceSelect={handleServiceSelect}
          stats={stats}
          featuredProviders={featuredProviders}
          favoriteWorkerIds={favoriteWorkerIds}
          workersLoading={workersLoading}
          renderStars={renderStars}
          handleProviderBook={handleProviderBook}
          onToggleFavorite={handleToggleFavorite}
        />
      );
    }

    if (activeTab === 'bookService') {
      return (
        <CustomerBookingFormPage
          bookingSource={bookingSource}
          selectedService={selectedService}
          selectedWorkerDetails={selectedWorkerDetails}
          selectedWorkerServices={selectedWorkerServices}
          workersForSelectedService={workersForSelectedService}
          bookingForm={bookingForm}
          setBookingForm={setBookingForm}
          bookingStatus={bookingStatus}
          canSubmitBooking={canSubmitBooking}
          handleBookService={handleBookService}
          onServiceChange={(serviceName) => {
            setBookingForm((prev) => ({ ...prev, service: serviceName }));
            setBookingStatus({ loading: false, error: '' });
          }}
          onBack={navigateBack}
          formatInr={formatInr}
        />
      );
    }

    if (activeTab === 'bookings') {
      return (
        <CustomerBookingsPage
          recentBookings={recentBookings}
          getStatusColor={getStatusColor}
          renderStars={renderStars}
          onCancelBooking={handleCancelBooking}
          onPayBooking={handlePayBooking}
          onMarkServiceNotProvided={handleMarkServiceNotProvided}
          onDeleteBooking={handleDeleteBooking}
          cancelLoadingBookingId={cancelStatus.loadingBookingId}
          cancelError={cancelStatus.error}
          payLoadingBookingId={paymentStatus.loadingBookingId}
          payError={paymentStatus.error}
          notProvidedLoadingBookingId={notProvidedStatus.loadingBookingId}
          notProvidedError={notProvidedStatus.error}
          deleteLoadingBookingId={deleteStatus.loadingBookingId}
          deleteError={deleteStatus.error}
          onSubmitReview={handleSubmitReview}
          reviewLoadingBookingId={reviewStatus.loadingBookingId}
          reviewError={reviewStatus.error}
        />
      );
    }

    if (activeTab === 'favorites') {
      return (
        <CustomerFavoritesPage
          favoriteProviders={favoriteProviders}
          renderStars={renderStars}
          onToggleFavorite={handleToggleFavorite}
          onBookProvider={handleProviderBook}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <CustomerProfilePage
          userName={userName}
          userEmail={userEmail}
          profileForm={profileForm}
          profileInitialForm={profileInitialForm}
          setProfileForm={setProfileForm}
          profileStatus={profileStatus}
          handleProfileSave={handleProfileSave}
        />
      );
    }

    return <CustomerSettingsPage onLogout={onLogout} authToken={authToken} userName={userName} />;
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
          background: linear-gradient(-45deg, #f8fafc, #f1f5f9, #f8fafc, #f1f5f9);
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
        <CustomerTopNav
          navRef={navRef}
          notificationMenuRef={notificationMenuRef}
          userMenuRef={userMenuRef}
          landingUrl={landingUrl}
          omniLogo={omniLogo}
          navItems={navItems}
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
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          onOpenRoleSwitch={() => {
            setRoleSwitchStatus({ loading: false, error: "" });
            setShowRoleSwitchModal(true);
          }}
          onLogout={onLogout}
          userName={userName}
        />

        <main className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageLoaderCard />}>{renderActivePage()}</Suspense>
          </div>
        </main>

        <CustomerRoleSwitchModal
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

export default CustomerDashboard;
