import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/Layout';
import { useAppStore } from '@/store';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProjectManagement = lazy(() => import('@/pages/ProjectManagement'));
const TechnicianSchedule = lazy(() => import('@/pages/TechnicianSchedule'));
const AppointmentManagement = lazy(() => import('@/pages/AppointmentManagement'));
const MembershipManagement = lazy(() => import('@/pages/MembershipManagement'));
const TransactionRecords = lazy(() => import('@/pages/TransactionRecords'));

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-cream-200 rounded-lg" />
          <div className="h-4 w-60 bg-cream-200 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-card">
            <div className="h-4 w-20 bg-cream-200 rounded" />
            <div className="h-9 w-28 bg-cream-200 rounded-lg mt-3" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-card">
        <div className="h-64 bg-cream-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    useAppStore.getState().initStore();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/projects"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <ProjectManagement />
              </Suspense>
            }
          />
          <Route
            path="/schedule"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <TechnicianSchedule />
              </Suspense>
            }
          />
          <Route
            path="/appointments"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <AppointmentManagement />
              </Suspense>
            }
          />
          <Route
            path="/memberships"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <MembershipManagement />
              </Suspense>
            }
          />
          <Route
            path="/transactions"
            element={
              <Suspense fallback={<LoadingSkeleton />}>
                <TransactionRecords />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
