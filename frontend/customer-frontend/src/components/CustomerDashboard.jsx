import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from '../assets/images/omni-logo.png';
import api from '../api';
import CustomerHomePage from '../pages/customer/CustomerHomePage';
import CustomerBookingFormPage from '../pages/customer/CustomerBookingFormPage';
import CustomerBookingsPage from '../pages/customer/CustomerBookingsPage';
import CustomerFavoritesPage from '../pages/customer/CustomerFavoritesPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';
import CustomerSettingsPage from '../pages/customer/CustomerSettingsPage';
import {
  Bell,
  User,
  Calendar,
  Star,
  Heart,
  Settings,
  LogOut,
  Home,
  Wrench,
  Zap,
  Paintbrush,
  Droplets,
  Wind,
  Scissors,
  Car,
  Menu,
  X,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import { toShortErrorMessage, toStableId } from "@shared/utils/common";
import useQuickMenuAutoClose from "@shared/hooks/useQuickMenuAutoClose";

const SERVICE_PRICE_MIN = 250;
const SERVICE_PRICE_MAX = 2500;
const SERVICE_PRICE_STEP = 50;

const BASE_SERVICES = [
  { id: 1, name: 'Plumber', icon: Droplets, color: 'bg-blue-500', rating: 4.8 },
  { id: 2, name: 'Electrician', icon: Zap, color: 'bg-yellow-500', rating: 4.9 },
  { id: 3, name: 'Carpenter', icon: Wrench, color: 'bg-orange-500', rating: 4.7 },
  { id: 4, name: 'Painter', icon: Paintbrush, color: 'bg-green-500', rating: 4.6 },
  { id: 5, name: 'AC Repair', icon: Wind, color: 'bg-cyan-500', rating: 4.8 },
  { id: 6, name: 'House Cleaning', icon: Home, color: 'bg-purple-500', rating: 4.9 },
  { id: 7, name: 'Hair Stylist', icon: Scissors, color: 'bg-pink-500', rating: 4.7 },
  { id: 8, name: 'Car Service', icon: Car, color: 'bg-gray-600', rating: 4.5 }
];

function hashServiceName(name) {
  return Array.from(String(name || '')).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

function getRandomServicePrice(serviceName) {
  const stepCount = Math.floor((SERVICE_PRICE_MAX - SERVICE_PRICE_MIN) / SERVICE_PRICE_STEP) + 1;
  const offset = hashServiceName(serviceName) % stepCount;
  return SERVICE_PRICE_MIN + offset * SERVICE_PRICE_STEP;
}

function formatInr(amount) {
  return `INR ${Number(amount || 0).toLocaleString('en-IN')}`;
}

function toFavoriteProvider(provider = {}) {
  const id = String(provider.id || '').trim();
  if (!id) {
    return null;
  }

  const name = String(provider.name || 'Worker').trim() || 'Worker';
  const servicesProvided = Array.isArray(provider.servicesProvided)
    ? provider.servicesProvided.map((service) => String(service || '').trim()).filter(Boolean)
    : [];
  const service = String(provider.service || servicesProvided[0] || 'General Service').trim() || 'General Service';
  const numericRating = Number(provider.rating || 0);
  const numericReviews = Number(provider.reviews || 0);
  const fallbackImage = name
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    id,
    name,
    service,
    servicesProvided,
    rating: Number.isFinite(numericRating) ? numericRating : 0,
    reviews: Number.isFinite(numericReviews) ? numericReviews : 0,
    image: String(provider.image || fallbackImage || 'W')
      .slice(0, 2)
      .toUpperCase()
  };
}

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
    location: 'Dehradun',
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
  const [profileStatus, setProfileStatus] = useState({ loading: false, error: '', success: '' });
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

  useEffect(() => {
    if (!authToken) {
      setAvailableWorkers([]);
      setWorkersLoading(false);
      return;
    }

    const loadWorkers = async () => {
      setWorkersLoading(true);
      try {
        const response = await api.get('/workers/available');
        setAvailableWorkers(Array.isArray(response.data?.workers) ? response.data.workers : []);
      } catch (_error) {
        setAvailableWorkers([]);
      } finally {
        setWorkersLoading(false);
      }
    };

    loadWorkers();
  }, [authToken]);

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

  const loadDashboard = async () => {
    try {
      const response = await api.get('/customer/dashboard', {
        params: { customer: userName },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
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
  };

  useEffect(() => {
    loadDashboard();
  }, [authToken, userName]);

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
      setProfileForm(fallback);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await api.get('/profile', {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const user = response.data?.user || {};
        const profile = response.data?.profile || {};
        setProfileForm({
          name: user.name || fallback.name,
          email: user.email || fallback.email,
          bio: profile.bio || '',
          gender: profile.gender || '',
          dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
          phone: profile.phone || ''
        });
      } catch (_error) {
        setProfileForm(fallback);
      }
    };

    loadProfile();
  }, [authToken, userEmail, userName]);

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

  const closeBookingModal = () => {
    setBookingStatus({ loading: false, error: '' });
    setBookingForm({
      workerId: '',
      service: '',
      applyDiscount: true,
      date: '',
      time: '',
      location: 'Dehradun',
      description: ''
    });
    navigateToTab('home');
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
      await api.post(
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

      setBookingStatus({ loading: false, error: '' });
      closeBookingModal();
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

      setProfileForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        bio: profile.bio || '',
        gender: profile.gender || '',
        dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
        phone: profile.phone || ''
      }));
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
        <nav ref={navRef} className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                  <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
                </div>

                <div className="hidden md:flex items-center space-x-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateToTab(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div ref={notificationMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowMobileMenu(false);
                      setShowNotifications((prev) => !prev);
                    }}
                    className="relative p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Open notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
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
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                                  isRead ? 'bg-gray-50' : 'bg-blue-50/40'
                                }`}
                              >
                                <p className={`text-sm ${isRead ? 'font-medium text-gray-500' : 'font-semibold text-gray-900'}`}>
                                  {notification.title}
                                </p>
                                <p className={`text-xs mt-0.5 ${isRead ? 'text-gray-400' : 'text-gray-600'}`}>{notification.message}</p>
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
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
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
                <button onClick={() => navigateToTab('settings')} className="p-2 text-gray-400 hover:text-gray-600">
                  <Settings className="w-5 h-5" />
                </button>

                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setShowMobileMenu(false);
                      setShowUserMenu((prev) => !prev);
                    }}
                    className="hidden md:flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-left">
                      <p className="font-medium text-gray-900">{userName}</p>
                      <p className="text-gray-500 text-xs">Customer</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <button
                        onClick={() => {
                          navigateToTab('profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setRoleSwitchStatus({ loading: false, error: '' });
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
                    setShowMobileMenu((prev) => !prev);
                  }}
                  className="md:hidden p-2 text-gray-500"
                >
                  {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateToTab(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                ))}
                <div className="border-t pt-2 mt-2">
                  <button
                    onClick={() => {
                      setRoleSwitchStatus({ loading: false, error: '' });
                      setShowRoleSwitchModal(true);
                      setShowMobileMenu(false);
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

        <main className="px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">{renderActivePage()}</div>
        </main>

        {showRoleSwitchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Switch Role</h3>
              <p className="text-gray-600 text-center mb-6">Choose the role you want to switch to</p>

              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSwitch('broker')}
                  disabled={roleSwitchStatus.loading}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Switch to Broker</h4>
                      <p className="text-sm text-gray-600">Manage a network of professionals</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSwitch('worker')}
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

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setRoleSwitchStatus({ loading: false, error: '' });
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

export default CustomerDashboard;
