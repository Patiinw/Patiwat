// client/src/layouts/AppLayout.jsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MDBContainer } from 'mdb-react-ui-kit';
import { useEffect, useState, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api, { API_BASE } from '../lib/axios';
import NotificationBell from '../components/NotificationBell';

const AVATAR_PH = 'https://placehold.co/32x32?text=AV';
const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

const absUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${API_BASE.replace(/\/$/, '')}${path}`;
};

const getAvatarSrc = (u, bust) => {
  const base = absUrl(u) || AVATAR_PH;
  return `${base}${base.includes('?') ? '&' : '?'}v=${bust}`;
};

export default function AppLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const isAdminPage =
    pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/admin/login';
  const isSalad = pathname === '/salad' || pathname.startsWith('/salad/');
  const isSaladDetail =
    pathname.startsWith('/salad/') && !pathname.endsWith('/edit');

  const fromAdmin =
    location.state?.fromAdmin === true ||
    new URLSearchParams(location.search).get('fromAdmin') === '1';

  // อ่าน token ปัจจุบัน
  const userToken =
    typeof window !== 'undefined'
      ? localStorage.getItem(USER_TOKEN_KEY)
      : null;
  const adminToken =
    typeof window !== 'undefined'
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;

  const hasUser = !!userToken;
  const hasAdmin = !!adminToken;

  // เลือก token ตาม "ประเภทหน้า"
  // - หน้า /admin/* ใช้ adminToken เสมอ
  // - หน้าอื่นใช้ userToken ถ้ามี
  // - ถ้าไม่มี userToken แต่มี adminToken ให้ใช้ adminToken
  const getActiveToken = () => {
    if (isAdminPage) {
      return adminToken || null;
    }
    if (userToken) return userToken;
    if (adminToken) return adminToken;
    return null;
  };

  const activeToken = getActiveToken();

  const [me, setMe] = useState(null);
  const [, setMeLoading] = useState(!!activeToken);
  const [avatarBust, setAvatarBust] = useState(Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // โหลด me ตาม token ของหน้านั้น
  const loadMe = useCallback(async () => {
    if (typeof window === 'undefined') {
      setMe(null);
      setMeLoading(false);
      return;
    }

    const u = localStorage.getItem(USER_TOKEN_KEY);
    const a = localStorage.getItem(ADMIN_TOKEN_KEY);

    const isAdminRoute =
      location.pathname.startsWith('/admin') &&
      !location.pathname.startsWith('/admin/login');

    let tokenToUse = null;
    if (isAdminRoute) {
      tokenToUse = a || null;
    } else if (u) {
      tokenToUse = u;
    } else if (a) {
      tokenToUse = a;
    }

    if (!tokenToUse) {
      setMe(null);
      setMeLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/users/me', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setMe(data || null);
    } catch (error) {
      console.error(error);
      setMe(null);
    } finally {
      setMeLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (ignore) return;
      await loadMe();
    })();
    return () => {
      ignore = true;
    };
  }, [loadMe]);

  useEffect(() => {
    const onProfileUpdated = () => {
      loadMe();
      setAvatarBust(Date.now());
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => {
      window.removeEventListener('profile-updated', onProfileUpdated);
    };
  }, [loadMe]);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }

    if (isAdminPage) {
      nav('/admin/login');
    } else {
      nav('/login');
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const AdminTabs = () => null;

  return (
    <>
      {/* ===== Navbar ===== */}
      <nav className="navbar navbar-expand app-navbar px-3 px-md-4">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand fw-bold">
            🥗 SaladBoard
          </Link>

          <div className="d-flex gap-2 ms-auto align-items-center">
            <AdminTabs />
            {activeToken && <NotificationBell />}

            {/* ===== Public side ===== */}
            {!isAdminPage && (
              <>
                <Link to="/salad" className="nav-link">
                  กระทู้
                </Link>

                {/* ถ้ามี userToken ให้ถือเป็นโหมดผู้ใช้ */}
                {hasUser && (
                  <>
                    <Link to="/salad/new" className="nav-link">
                      สร้างกระทู้
                    </Link>

                    <div className="position-relative" ref={menuRef}>
                      <button
                        type="button"
                        className="d-flex align-items-center border-0 bg-transparent px-2"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen ? 'true' : 'false'}
                        title="เมนูผู้ใช้"
                      >
                        <img
                          src={getAvatarSrc(me?.avatarUrl, avatarBust)}
                          alt="avatar"
                          className="nav-avatar"
                          onError={(ev) => {
                            ev.currentTarget.src = AVATAR_PH;
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                        <span className="ms-2 fw-semibold">
                          {me?.name || 'ผู้ใช้'}
                        </span>
                        <span className="ms-1" aria-hidden>
                          ▾
                        </span>
                      </button>

                      {menuOpen && (
                        <div
                          role="menu"
                          className="shadow rounded-3"
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 'calc(100% + 8px)',
                            minWidth: 220,
                            background: 'var(--bs-body-bg, #fff)',
                            border: '1px solid rgba(0,0,0,.08)',
                            zIndex: 1050,
                          }}
                        >
                          <Link
                            to="/profile"
                            className="dropdown-item py-2 px-3"
                            onClick={() => setMenuOpen(false)}
                          >
                            👤 หน้าของฉัน
                          </Link>
                          <Link
                            to="/salad/new"
                            className="dropdown-item py-2 px-3"
                            onClick={() => setMenuOpen(false)}
                          >
                            📝 สร้างกระทู้
                          </Link>
                          <div className="dropdown-divider" />
                          <button
                            type="button"
                            className="dropdown-item py-2 px-3 w-100 text-start"
                            onClick={() => {
                              setMenuOpen(false);
                              logout();
                            }}
                          >
                            🚪 ออกจากระบบ
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ถ้าไม่มี userToken แต่มี adminToken ให้แสดงเป็น admin บนหน้า public */}
                {!hasUser && hasAdmin && (
                  <div className="d-flex gap-2">
                    <Link
                      to="/admin"
                      className="btn btn-sm btn-outline-primary"
                    >
                      ไปหลังบ้าน
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={logout}
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                )}

                {/* guest */}
                {!hasUser && !hasAdmin && (
                  <>
                    <Link
                      to="/login"
                      className="btn btn-sm btn-outline-primary"
                    >
                      เข้าสู่ระบบ
                    </Link>
                    <Link
                      to="/register"
                      className="btn btn-sm btn-primary"
                    >
                      สมัครสมาชิก
                    </Link>
                  </>
                )}
              </>
            )}

            {/* ===== Admin side ===== */}
            {isAdminPage && (
              <>
                {hasAdmin ? (
                  <div className="d-flex gap-2">
                    <Link
                      to="/admin/password"
                      className="btn btn-sm btn-outline-primary"
                    >
                      เปลี่ยนรหัสผ่าน
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={logout}
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Link
                      to="/admin/login"
                      className="btn btn-sm btn-outline-primary"
                    >
                      เข้าสู่ระบบผู้ดูแล
                    </Link>
                    <Link
                      to="/salad"
                      className="btn btn-sm btn-outline-secondary"
                    >
                      กลับหน้ากระทู้
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== Layout ===== */}
      <div className="layout-2col">
        {!isAuthPage && !isAdminPage && !(isSaladDetail && fromAdmin) && (
          <Sidebar />
        )}

        <main className={`main-pane ${isSalad ? 'no-top-gap' : ''}`}>
          <MDBContainer
            className={
              isAuthPage || isAdminPage ? '' : isSalad ? 'py-0' : 'py-3'
            }
          >
            <Outlet />
          </MDBContainer>
        </main>
      </div>

      <footer className="app-footer text-center py-4">
        © {new Date().getFullYear()} SaladBoard • React + MDB
      </footer>
    </>
  );
}
