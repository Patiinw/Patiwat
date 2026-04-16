// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

import LoginUser from './pages/LoginUser.jsx';
import LoginAdmin from './pages/LoginAdmin.jsx';

// User pages
import Register from './pages/Register';
import Profile from './pages/Profile';
import SaladThreads from './pages/SaladThreads';
import SaladNew from './pages/SaladNew';
import SaladDetail from './pages/SaladDetail';
import SaladEdit from './pages/SaladEdit';
import NotificationsPage from './pages/Notifications';

// Admin pages
import AdminPosts from './pages/admin/AdminPosts';
import AdminChangePassword from './pages/admin/AdminChangePassword';
import AdminNotification from './pages/admin/AdminNotification';

import { io } from 'socket.io-client';
import { useEffect } from 'react';

// 🔥 socket connect (เพิ่ม)
const socket = io('http://localhost:5000');

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

const getUserToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USER_TOKEN_KEY);
  } catch {
    return null;
  }
};

const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

function PrivateUser({ children }) {
  const userToken = getUserToken();
  const adminToken = getAdminToken();

  if (adminToken && !userToken) {
    return <Navigate to="/admin" replace />;
  }
  if (!userToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PrivateAdmin({ children }) {
  const userToken = getUserToken();
  const adminToken = getAdminToken();

  if (!adminToken) {
    if (userToken) {
      return <Navigate to="/salad" replace />;
    }
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function GuestOnly({ children, mode }) {
  const userToken = getUserToken();
  const adminToken = getAdminToken();

  if (mode === 'admin') {
    if (adminToken) return <Navigate to="/admin" replace />;
  } else {
    if (userToken) return <Navigate to="/salad" replace />;
  }

  return children;
}

function SaladDetailGate({ children }) {
  return children;
}

function HomeRedirect() {
  return <Navigate to="/salad" replace />;
}

export default function App() {

  // 🔥 realtime notification (เพิ่ม)
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));

      if (!user?._id) return;

      // join room
      socket.emit('join', user._id);

      // รับแจ้งเตือน
      socket.on('notification', (data) => {
        alert(`${data.title}: ${data.message}`);
      });

      return () => {
        socket.off('notification');
      };
    } catch (e) {
      console.log('socket error', e);
    }
  }, []);

  return (
    <Routes>
      <Route element={<AppLayout />}>

        <Route path="/" element={<HomeRedirect />} />

        {/* User Auth */}
        <Route
          path="/login"
          element={
            <GuestOnly mode="user">
              <LoginUser />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly mode="user">
              <Register />
            </GuestOnly>
          }
        />

        {/* Admin Auth */}
        <Route
          path="/admin/login"
          element={
            <GuestOnly mode="admin">
              <LoginAdmin />
            </GuestOnly>
          }
        />

        {/* Public */}
        <Route path="/salad" element={<SaladThreads />} />
        <Route
          path="/salad/:id"
          element={
            <SaladDetailGate>
              <SaladDetail />
            </SaladDetailGate>
          }
        />

        {/* User Protected */}
        <Route
          path="/salad/new"
          element={
            <PrivateUser>
              <SaladNew />
            </PrivateUser>
          }
        />
        <Route
          path="/salad/:id/edit"
          element={
            <PrivateUser>
              <SaladEdit />
            </PrivateUser>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateUser>
              <Profile />
            </PrivateUser>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateUser>
              <NotificationsPage />
            </PrivateUser>
          }
        />

        {/* Admin Protected */}
        <Route
          path="/admin"
          element={
            <PrivateAdmin>
              <AdminPosts />
            </PrivateAdmin>
          }
        />
        <Route
          path="/admin/password"
          element={
            <PrivateAdmin>
              <AdminChangePassword />
            </PrivateAdmin>
          }
        />
        <Route
          path="/admin/notify"
          element={
            <PrivateAdmin>
              <AdminNotification />
            </PrivateAdmin>
          }
        />
        <Route
          path="/admin/posts/:id/edit"
          element={
            <PrivateAdmin>
              <SaladEdit />
            </PrivateAdmin>
          }
        />

        {/* 404 */}
        <Route path="*" element={<h3 style={{ padding: 24 }}>404 Not Found</h3>} />

      </Route>
    </Routes>
  );
}