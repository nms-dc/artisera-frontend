'use client';

import { useAuth } from '@/core/auth/useAuth';
import AdminDashboard from '@/features/dashboard/components/AdminDashboard';
import RmDashboard from '@/features/dashboard/components/RmDashboard';
import GalleryDashboard from '@/features/gallery/components/GalleryDashboard';
import { GALLERY_ROLE } from '@/lib/constants';

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  return user?.role === GALLERY_ROLE ? <GalleryDashboard /> : <RmDashboard />;
}
