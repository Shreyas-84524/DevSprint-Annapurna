"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Bell, Check, RefreshCw, ExternalLink, AlertCircle, Inbox } from "lucide-react";
import { getNotificationsService } from "@/services/notifications";
import { NotificationDTO } from "@/types/contracts";
import Link from "next/link";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const notificationsService = useMemo(() => getNotificationsService(), []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await notificationsService.getNotifications();
      if (error) {
        setErrorMessage("Unable to load notifications. Please check your connection.");
      } else {
        setNotifications(data || []);
      }
    } catch {
      setErrorMessage("Network error loading notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [notificationsService]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await notificationsService.markAsRead(id);
    } catch {
      // Revert if failed
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    for (const notif of unread) {
      try {
        await notificationsService.markAsRead(notif.id);
      } catch {
        // Continue marking others
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            fetchNotifications();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-brand-gold rounded-full ring-2 ring-black"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-brand-charcoal text-white rounded-2xl shadow-2xl border border-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-brand-gold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold rounded px-1"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={isLoading}
                aria-label="Refresh notifications"
                className="p-1 text-gray-400 hover:text-white rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            className="max-h-[380px] overflow-y-auto divide-y divide-gray-800/60"
            role="region"
            aria-live="polite"
          >
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <span className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-sm text-gray-400">Loading notifications...</p>
              </div>
            ) : errorMessage ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <AlertCircle size={28} className="text-red-400 mb-2" />
                <p className="text-sm text-gray-300 mb-3">{errorMessage}</p>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="px-3 py-1 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Inbox size={32} className="text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-300">No notifications yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Updates on food claims, delivery milestones, and campaigns will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const linkHref = notif.link || "#";
                const isExternal = linkHref.startsWith("http");

                return (
                  <div
                    key={notif.id}
                    className={`relative p-3.5 transition-colors ${
                      notif.read
                        ? "bg-brand-charcoal/60 hover:bg-gray-800/40"
                        : "bg-brand-charcoal hover:bg-gray-800/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Unread indicator dot */}
                        <div className="pt-1">
                          <span
                            className={`block w-2 h-2 rounded-full ${
                              notif.read ? "bg-transparent" : "bg-brand-gold"
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-sm truncate ${
                              notif.read
                                ? "font-normal text-gray-300"
                                : "font-semibold text-white"
                            }`}
                          >
                            {notif.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                            <span>
                              {new Date(notif.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {notif.link && (
                              <Link
                                href={linkHref}
                                target={isExternal ? "_blank" : undefined}
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                onClick={() => {
                                  if (!notif.read) {
                                    handleMarkAsRead(notif.id);
                                  }
                                  setIsOpen(false);
                                }}
                                className="inline-flex items-center gap-1 text-brand-gold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold rounded"
                              >
                                <span>View</span>
                                <ExternalLink size={10} aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mark as read button */}
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          title="Mark as read"
                          aria-label={`Mark "${notif.title}" as read`}
                          className="shrink-0 p-1 text-gray-400 hover:text-brand-gold hover:bg-gray-700 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold"
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
