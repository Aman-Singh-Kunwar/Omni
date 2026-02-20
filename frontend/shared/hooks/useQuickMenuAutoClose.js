import { useEffect } from "react";

const SCROLL_CLOSE_THRESHOLD_PX = 4;
const MENU_INTERACTION_SCROLL_GUARD_MS = 250;

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
    let lastScrollX = window.scrollX;
    let lastScrollY = window.scrollY;
    let lastMenuInteractionAt = 0;

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

    const markMenuInteraction = (event) => {
      if (navRef?.current && navRef.current.contains(event.target)) {
        lastMenuInteractionAt = Date.now();
      }
    };

    const handleScroll = () => {
      const nextScrollX = window.scrollX;
      const nextScrollY = window.scrollY;
      const deltaX = Math.abs(nextScrollX - lastScrollX);
      const deltaY = Math.abs(nextScrollY - lastScrollY);
      const sinceInteractionMs = Date.now() - lastMenuInteractionAt;

      // Ignore tiny viewport jitter and immediate post-tap jitter on mobile.
      if (
        (deltaX < SCROLL_CLOSE_THRESHOLD_PX && deltaY < SCROLL_CLOSE_THRESHOLD_PX) ||
        sinceInteractionMs < MENU_INTERACTION_SCROLL_GUARD_MS
      ) {
        return;
      }

      lastScrollX = nextScrollX;
      lastScrollY = nextScrollY;
      closeQuickMenus();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", closeQuickMenus);
    window.addEventListener("blur", closeQuickMenus);
    document.addEventListener("mousedown", markMenuInteraction, true);
    document.addEventListener("touchstart", markMenuInteraction, true);
    document.addEventListener("mousedown", handleOutsideTap);
    document.addEventListener("touchstart", handleOutsideTap);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", closeQuickMenus);
      window.removeEventListener("blur", closeQuickMenus);
      document.removeEventListener("mousedown", markMenuInteraction, true);
      document.removeEventListener("touchstart", markMenuInteraction, true);
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
