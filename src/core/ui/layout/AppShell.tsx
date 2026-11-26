'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Iconify from '../Iconify';
import { tokens } from '@/core/theme/palette';
import { GALLERY_ROLE } from '@/lib/constants';
import { useAuth } from '@/core/auth/useAuth';
import NotificationBell from '@/features/notifications/components/NotificationBell';
import { initials } from '@/lib/formatters';
import { wasLoggedOut } from '@/core/auth/session';
import type { PermissionAction, PermissionModule } from '@/lib/types';

type Perm = [PermissionModule, PermissionAction];
type NavItem = { title: string; icon: string; path: string; perm?: Perm; children?: { title: string; path: string; perm?: Perm }[] };

const ADMIN_NAV: NavItem[] = [
  { title: 'Dashboard', icon: 'mdi:home-outline', path: '/dashboard' },
  { title: 'Inquiries', icon: 'mdi:file-document-outline', path: '/inquiries', perm: ['inquiries', 'view'] },
  { title: 'Customers', icon: 'mdi:account-outline', path: '/customers', perm: ['customers', 'view'] },
  { title: 'Orders', icon: 'mdi:email-outline', path: '/orders', perm: ['orders', 'view'] },
  {
    title: 'Masters',
    icon: 'mdi:database-outline',
    path: '/masters',
    children: [
      { title: 'Categories', path: '/masters/categories', perm: ['masters', 'view'] },
      { title: 'Subcategories', path: '/masters/subcategories', perm: ['masters', 'view'] },
      { title: 'Artists', path: '/masters/artists', perm: ['masters', 'view'] },
      { title: 'Roles', path: '/masters/roles', perm: ['users', 'view'] },
      { title: 'Users', path: '/masters/users', perm: ['users', 'view'] },
    ],
  },
  {
    title: 'Reports',
    icon: 'mdi:chart-box-outline',
    path: '/reports',
    perm: ['reports', 'view'],
    children: [
      { title: 'Inquiry Summary', path: '/reports/inquiry-summary' },
      { title: 'Inquiry Detail', path: '/reports/inquiry-detail' },
    ],
  },
];
const RM_NAV: NavItem[] = [
  { title: 'Dashboard', icon: 'mdi:home-outline', path: '/dashboard' },
  { title: 'My Inquiries', icon: 'mdi:clipboard-text-outline', path: '/inquiries', perm: ['inquiries', 'view'] },
  { title: 'New Inquiry', icon: 'mdi:plus-circle-outline', path: '/inquiries/new', perm: ['inquiries', 'create'] },
  { title: 'Customers', icon: 'mdi:account-outline', path: '/customers', perm: ['customers', 'view'] },
  { title: 'Orders', icon: 'mdi:email-outline', path: '/orders', perm: ['orders', 'view'] },
  {
    title: 'Masters',
    icon: 'mdi:database-outline',
    path: '/masters',
    children: [
      { title: 'Categories', path: '/masters/categories', perm: ['masters', 'view'] },
      { title: 'Subcategories', path: '/masters/subcategories', perm: ['masters', 'view'] },
      { title: 'Artists', path: '/masters/artists', perm: ['masters', 'view'] },
    ],
  },
  {
    title: 'Reports',
    icon: 'mdi:chart-box-outline',
    path: '/reports',
    perm: ['reports', 'view'],
    children: [
      { title: 'Inquiry Summary', path: '/reports/inquiry-summary' },
      { title: 'Inquiry Detail', path: '/reports/inquiry-detail' },
    ],
  },
];
const GALLERY_NAV: NavItem[] = [
  { title: 'Dashboard', icon: 'mdi:home-outline', path: '/dashboard' },
  { title: 'Sales (Won)', icon: 'mdi:trophy-outline', path: '/sales', perm: ['sales', 'view'] },
  { title: 'Orders', icon: 'mdi:email-outline', path: '/orders', perm: ['orders', 'view'] },
  { title: 'Shipments', icon: 'mdi:truck-outline', path: '/shipments', perm: ['shipments', 'view'] },
  { title: 'Certificates', icon: 'mdi:shield-star-outline', path: '/certificates', perm: ['certificates', 'view'] },
];

const HEADER_H = 56;
const W_OPEN = 208;
const W_CLOSED = 64;

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: collapsed ? 'center' : 'flex-start' }}>
      <Iconify icon="mdi:star-four-points-circle-outline" width={30} sx={{ color: '#fff', flexShrink: 0 }} />
      {!collapsed && (
        <Typography noWrap sx={{ color: '#fff', fontWeight: 700, fontSize: 19, letterSpacing: 0.2 }}>
          Artisera CRM
        </Typography>
      )}
    </Box>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, user, logout, can } = useAuth();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [collapsed, setCollapsedState] = React.useState(false);
  const setCollapsed = (v: boolean | ((c: boolean) => boolean)) =>
    setCollapsedState((c) => {
      const n = typeof v === 'function' ? v(c) : v;
      try {
        window.localStorage.setItem('artisera_sidebar', n ? '1' : '0');
      } catch {}
      return n;
    });
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem('artisera_sidebar');
      setCollapsedState(saved === null ? window.innerWidth < 1400 : saved === '1');
    } catch {}
  }, []);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    setOpen((o) => ({ ...o, Masters: pathname.startsWith('/masters') || o.Masters, Reports: pathname.startsWith('/reports') || o.Reports }));
  }, [pathname]);

  React.useEffect(() => {
    if (ready && !user) router.replace(wasLoggedOut() ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  // An admin-created user signs in with a generated password and must set their own first.
  React.useEffect(() => {
    if (ready && user?.mustChangePassword) router.replace('/change-password');
  }, [ready, user, router]);

  if (!ready)
    return (
      <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  if (!user) return null;

  const allowed = (perm?: Perm) => !perm || can(perm[0], perm[1]);
  const nav = (user.role === 'ADMIN' ? ADMIN_NAV : user.role === GALLERY_ROLE ? GALLERY_NAV : RM_NAV)
    .map((i) => (i.children ? { ...i, children: i.children.filter((c) => allowed(c.perm)) } : i))
    .filter((i) => allowed(i.perm) && (!i.children || i.children.length > 0));
  const isGallery = user.role === GALLERY_ROLE;
  const roleLabel = user.role === 'ADMIN' ? 'Admin' : user.role === GALLERY_ROLE ? 'Gallery Manager' : 'Relationship Manager';
  const width = collapsed ? W_CLOSED : W_OPEN;

  const isActive = (item: NavItem) => {
    if (item.path === '/dashboard' && pathname.startsWith('/rm/')) return true;
    if (item.path === '/inquiries') return pathname.startsWith('/inquiries') && pathname !== '/inquiries/new';
    return pathname === item.path || pathname.startsWith(item.path + '/');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tokens.bg }}>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: HEADER_H, bgcolor: tokens.navy, zIndex: 1200, display: 'flex', alignItems: 'center', px: 2, gap: 2 }}>
        <Box sx={{ width: width - 24, transition: 'width .2s', overflow: 'hidden', flexShrink: 0 }}>
          <Logo collapsed={collapsed} />
        </Box>
        <IconButton
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,.08)', borderRadius: 1.5, width: 36, height: 36 }}
        >
          <Iconify icon="mdi:menu" width={20} />
        </IconButton>
        <Box sx={{ flex: 1, maxWidth: 640, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, height: 36, bgcolor: 'rgba(255,255,255,.12)', borderRadius: 1.5 }}>
          <Iconify icon="mdi:magnify" width={18} sx={{ color: 'rgba(255,255,255,.7)' }} />
          <InputBase
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isGallery ? 'Search by Order No, Sale No, Customer, Product, Artist...' : 'Search inquiries, customers, artists, categories...'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) router.push(`${isGallery ? '/sales' : '/inquiries'}?q=${encodeURIComponent(q.trim())}`);
            }}
            sx={{ flex: 1, color: '#fff', fontSize: 13, '& input::placeholder': { color: 'rgba(255,255,255,.7)', opacity: 1 } }}
          />
        </Box>
        <Box sx={{ flex: 1 }} />
        <NotificationBell />
        <Box onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', color: '#fff' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: tokens.blue, fontSize: 13, fontWeight: 700 }}>{initials(user.name)}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.15 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user.name}</Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{roleLabel}</Typography>
          </Box>
          <Iconify icon="mdi:chevron-down" width={18} />
        </Box>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              router.push('/change-password');
            }}
          >
            Change Password
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              logout();
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          top: HEADER_H,
          bottom: 0,
          left: 0,
          width,
          bgcolor: tokens.navySide,
          transition: 'width .2s',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1100,
          overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 1.25, flex: 1 }}>
          {nav.map((item) => {
            const active = isActive(item);
            const expanded = !collapsed && item.children && open[item.title];
            return (
              <Box key={item.title} sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.title : ''} placement="right">
                  <Box
                    onClick={() => {
                      if (item.children && !collapsed) setOpen((o) => ({ ...o, [item.title]: !o[item.title] }));
                      router.push(item.title === 'Reports' && item.children ? item.children[0].path : item.path);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      height: 42,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      color: '#fff',
                      bgcolor: active && !item.children ? tokens.blue : item.children && active ? tokens.blue : 'transparent',
                      '&:hover': { bgcolor: active ? tokens.blue : 'rgba(255,255,255,.08)' },
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                  >
                    <Iconify icon={item.icon} width={20} />
                    {!collapsed && <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#fff', flex: 1 }}>{item.title}</Typography>}
                    {!collapsed && item.children && <Iconify icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'} width={18} />}
                  </Box>
                </Tooltip>
                {expanded &&
                  item.children!.map((c) => {
                    const ca = pathname.startsWith(c.path);
                    return (
                      <Box
                        key={c.path}
                        onClick={() => router.push(c.path)}
                        sx={{
                          ml: 3.5,
                          pl: 1.5,
                          height: 34,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: 13,
                          color: ca ? '#fff' : 'rgba(255,255,255,.72)',
                          fontWeight: ca ? 700 : 400,
                          borderLeft: '1px solid rgba(255,255,255,.18)',
                          bgcolor: ca ? 'rgba(22,101,245,.45)' : 'transparent',
                          borderRadius: '0 6px 6px 0',
                          '&:hover': { color: '#fff' },
                        }}
                      >
                        <Box component="span" sx={{ mr: 1 }}>
                          •
                        </Box>
                        {c.title}
                      </Box>
                    );
                  })}
              </Box>
            );
          })}
        </Box>
        <Box
          onClick={() => setCollapsed((c) => !c)}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: '#fff',
            cursor: 'pointer',
            borderTop: `1px solid ${tokens.navyLine}`,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <Iconify icon={collapsed ? 'mdi:chevron-double-right' : 'mdi:chevron-double-left'} width={22} />
          {!collapsed && <Typography sx={{ fontSize: 14, color: '#fff' }}>Collapse</Typography>}
        </Box>
      </Box>

      <Box component="main" sx={{ ml: `${width}px`, mt: `${HEADER_H}px`, p: 3, transition: 'margin .2s', minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
