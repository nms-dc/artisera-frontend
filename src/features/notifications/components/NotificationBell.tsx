'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Iconify from '@/core/ui/Iconify';
import { tokens } from '@/core/theme/palette';
import { useGetNotificationsQuery, useMarkAllReadMutation, useMarkReadMutation } from '../api';
import { useAuth } from '@/core/auth/useAuth';
import type { AppNotification, NotificationType } from '@/lib/types';

const ICON: Record<NotificationType, { icon: string; color: string }> = {
  UNASSIGNED_INQUIRY: { icon: 'mdi:account-alert-outline', color: '#D32F2F' },
  NEW_INQUIRY: { icon: 'mdi:file-document-plus-outline', color: '#1665F5' },
  INQUIRY_ASSIGNED: { icon: 'mdi:account-check-outline', color: '#7C4DFF' },
  INQUIRY_REASSIGNED: { icon: 'mdi:account-switch-outline', color: '#F59E0B' },
  INQUIRY_UPDATED: { icon: 'mdi:pencil-outline', color: '#5B6B8C' },
  TOUCHBASE_RECORDED: { icon: 'mdi:message-text-outline', color: '#1665F5' },
  INTERACTION_RECORDED: { icon: 'mdi:message-reply-text-outline', color: '#1E8E3E' },
  FOLLOWUP_SNOOZED: { icon: 'mdi:clock-outline', color: '#F59E0B' },
  STATUS_CHANGED: { icon: 'mdi:flag-outline', color: '#7C4DFF' },
  CUSTOMER_CREATED: { icon: 'mdi:account-plus-outline', color: '#1665F5' },
  FOLLOWUP_DUE: { icon: 'mdi:calendar-clock-outline', color: '#F59E0B' },
  FOLLOWUP_OVERDUE: { icon: 'mdi:alarm-light-outline', color: '#D32F2F' },
  SALE_WON: { icon: 'mdi:trophy-outline', color: '#1E8E3E' },
  SALE_EMAIL_SENT: { icon: 'mdi:email-outline', color: '#1665F5' },
  ORDER_SHIPPED: { icon: 'mdi:truck-check-outline', color: '#1665F5' },
  CERTIFICATE_SENT: { icon: 'mdi:certificate-outline', color: '#7C4DFF' },
  ORDER_CREATED: { icon: 'mdi:clipboard-list-outline', color: '#F59E0B' },
  ORDER_DELIVERED: { icon: 'mdi:check-circle-outline', color: '#1E8E3E' },
};

const SALE_EVENTS: NotificationType[] = ['ORDER_CREATED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'CERTIFICATE_SENT'];

export function notificationHref(n: AppNotification, isAdmin: boolean): string {
  const id = n.inquiryId;
  if (n.orderId) return `/orders/${n.orderId}?highlight=order`;
  if (n.saleId) return `/sales/${n.saleId}?highlight=sale-card`;
  if (n.customerId) return `/customers/${n.customerId}?highlight=customer`;
  if (!id) return '/dashboard';
  if (SALE_EVENTS.includes(n.type)) return `/inquiries/${id}?highlight=sale`;
  if (n.type === 'UNASSIGNED_INQUIRY') return `/inquiries?tab=unassigned&highlight=${id}&assign=${id}`;
  if (!isAdmin && n.tab) return `/inquiries?tab=${n.tab}&highlight=${id}&open=${id}`;
  return `/inquiries/${id}?highlight=inquiry`;
}

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const { data } = useGetNotificationsQuery(undefined, { pollingInterval: 30000, refetchOnFocus: true, refetchOnMountOrArgChange: true });
  const [markRead] = useMarkReadMutation();
  const [markAll] = useMarkAllReadMutation();

  const unread = (data?.results ?? []).filter((n) => !n.read);

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: '#fff' }} aria-label="Notifications">
        <Badge badgeContent={data?.unreadCount ?? 0} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}>
          <Iconify icon="mdi:bell-outline" width={22} />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, maxHeight: 480 } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${tokens.border}` }}>
          <Typography variant="subtitle1">Notifications</Typography>
          <Button size="small" disabled={!data?.unreadCount} onClick={() => markAll()}>
            Mark all read
          </Button>
        </Stack>
        {unread.length === 0 && (
          <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: tokens.muted }}>
            You&apos;re all caught up.
          </Typography>
        )}
        {unread.map((n) => (
          <Stack
            key={n.id}
            direction="row"
            spacing={1.5}
            onClick={() => {
              if (!n.read) markRead(n.id);
              setAnchor(null);
              // `_` changes on every click so the same target can be highlighted again.
              const href = notificationHref(n, user?.role === 'ADMIN');
              router.push(`${href}${href.includes('?') ? '&' : '?'}_=${Date.now()}`);
            }}
            sx={{ px: 2, py: 1.25, cursor: 'pointer', bgcolor: n.read ? '#fff' : '#F0F6FF', borderBottom: `1px solid ${tokens.border}`, '&:hover': { bgcolor: '#E8F1FF' } }}
          >
            <Box sx={{ color: ICON[n.type].color, pt: 0.25 }}>
              <Iconify icon={ICON[n.type].icon} width={22} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: tokens.ink }}>{n.title}</Typography>
              <Typography variant="body2">{n.body}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
            {!n.read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tokens.blue, mt: 0.75 }} />}
          </Stack>
        ))}
      </Popover>
    </>
  );
}
