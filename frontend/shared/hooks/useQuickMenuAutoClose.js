import { useEffect } from "react";

function useQuickMenuAutoClose({
  userMenuRef,
  notificationMenuRef,
  navRef,
  hideUserMenu,
  hideNotifications,
  hideMobileMenu,
  closeQuickMenus,
  routePath = "",
  routeSearch = ""
}) {
  useEffect(() => {
    const handleOutsideTap = (event) => {
      if (userMenuRef?.current && !userMenuRef.current.contains(event.target)) {
        hideUserMenu();
      }
      if (notificationMenuRef?.current && !notificationMenuRef.current.contains(event.target)) {
        hideNotifications();
      }
      if (navRef?.current && !navRef.current.contains(event.target)) {
        hideMobileMenu();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeQuickMenus();
      }
    };

    window.addEventListener("scroll", closeQuickMenus, { passive: true });
    window.addEventListener("resize", closeQuickMenus);
    window.addEventListener("blur", closeQuickMenus);
    document.addEventListener("mousedown", handleOutsideTap);
    document.addEventListener("touchstart", handleOutsideTap);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("scroll", closeQuickMenus);
      window.removeEventListener("resize", closeQuickMenus);
      window.removeEventListener("blur", closeQuickMenus);
      document.removeEventListener("mousedown", handleOutsideTap);
      document.removeEventListener("touchstart", handleOutsideTap);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeQuickMenus, hideMobileMenu, hideNotifications, hideUserMenu, navRef, notificationMenuRef, userMenuRef]);

  useEffect(() => {
    closeQuickMenus();
  }, [closeQuickMenus, routePath, routeSearch]);
}

export default useQuickMenuAutoClose;
