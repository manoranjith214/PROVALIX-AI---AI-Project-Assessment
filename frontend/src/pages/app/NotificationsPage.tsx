import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Bell, 
  CheckCheck, 
  Users, 
  School, 
  Sparkles, 
  ClipboardCheck, 
  Clock, 
  RotateCcw, 
  Award,
  ArrowRight
} from 'lucide-react';
import { AppNotification } from '../../types';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      setIsDemo(false);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      toastError('Could not load latest notifications from server');
      setNotifications([]);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }, [user.id, toastError]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      success('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toastError('Failed to mark all as read');
    }
  };


  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const filteredNotifs = notifications.filter(n =>
    activeFilter === 'unread' ? !n.read : true
  );


  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'team_invitation':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'classroom_invitation':
        return <School className="w-4 h-4 text-slate-400" />;
      case 'ai_evaluated':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'faculty_evaluated':
      case 'viva_assigned':
        return <ClipboardCheck className="w-4 h-4 text-purple-400" />;
      case 'verification':
      case 'result_published':
        return <Award className="w-4 h-4 text-success" />;
      case 'deadline_reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'returned_evaluation':
        return <RotateCcw className="w-4 h-4 text-error" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications & Activity Alerts"
        subtitle="Stay updated on submission verifications, faculty evaluations, team invitations, and impending deadlines."
        showDemoBadge={isDemo}
        actions={
          unreadCount > 0 && !loading && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#243047] pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-[#0F172A] text-slate-300 border border-[#243047] hover:bg-[#172033]'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'unread'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-[#0F172A] text-slate-300 border border-[#243047] hover:bg-[#172033]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <Card className="divide-y divide-[#243047] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No {activeFilter === 'unread' ? 'unread ' : ''}notifications at this time.
          </div>
        ) : (
          filteredNotifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                !n.read ? 'bg-purple-950/25 hover:bg-purple-950/40' : 'bg-[#111827] hover:bg-[#172033]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-[#0F172A] border border-[#243047] shrink-0 mt-0.5">
                  {getNotifIcon(n.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm ${!n.read ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-2" />
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
