import React from "react";
import { Bell, Briefcase, ChevronDown, LogOut, MoreVertical, Settings, User, X } from "lucide-react";
import { toStableId } from "@shared/utils/common";

function CustomerTopNav({
  navRef,
  notificationMenuRef,
  userMenuRef,
  landingUrl,
  omniLogo,
  navItems,
  activeTab,
  navigateToTab,
  showNotifications,
  setShowNotifications,
  unreadNotificationCount,
  visibleNotificationItems,
  readNotificationIds,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onClearNotifications,
  showUserMenu,
  setShowUserMenu,
  showMobileMenu,
  setShowMobileMenu,
  onOpenRoleSwitch,
  onLogout,
  userName
}) {
  return (
    <nav ref={navRef} className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 sm:space-x-8">
            <a
              href={landingUrl}
              data-public-navigation="true"
              className="flex items-center space-x-2 transition-opacity hover:opacity-90"
              aria-label="Go to Omni landing page"
            >
              <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Omni</h1>
            </a>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateToTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === item.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              </button>
              {showNotifications && (
                <div className="fixed right-2 top-16 z-50 w-[70vw] max-w-[260px] overflow-hidden rounded-lg border bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[90vw]">
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
                            onClick={() => onNotificationClick(notification)}
                            className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                              isRead ? "bg-gray-50" : "bg-blue-50/40"
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
                  <div className="grid grid-cols-2 gap-1.5 border-t px-2 py-1.5">
                    <button
                      type="button"
                      onClick={onMarkAllNotificationsRead}
                      className="whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-1.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={onClearNotifications}
                      className="whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-1.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Clear notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => navigateToTab("settings")} className="p-2 text-gray-400 hover:text-gray-600">
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

              <button
                onClick={() => {
                  setShowNotifications(false);
                  setShowMobileMenu(false);
                  setShowUserMenu((prev) => !prev);
                }}
                className="md:hidden ui-touch-target p-2 text-gray-500 hover:text-gray-700"
                aria-label="Open profile menu"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {showUserMenu && (
                <div className="fixed right-2 top-16 z-50 w-44 rounded-md border bg-white py-1 shadow-lg ui-popover-enter sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-48">
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
                  <button onClick={onOpenRoleSwitch} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
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
              className="md:hidden ui-touch-target p-2 text-gray-500"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <MoreVertical className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 bg-white ui-mobile-nav-enter">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigateToTab(item.id);
                  setShowMobileMenu(false);
                }}
                className={`ui-touch-target w-full text-left flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                  activeTab === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export default CustomerTopNav;
