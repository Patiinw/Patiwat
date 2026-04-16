// client/src/pages/LoginUser.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

export default function LoginUser() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      // ล้าง token แอดมินทิ้งกันชนกัน
      localStorage.removeItem(ADMIN_TOKEN_KEY);

      const { data } = await api.post('/api/auth/login', {
        email,
        password,
      });

      if (data?.token) {
        localStorage.setItem(USER_TOKEN_KEY, data.token);
      }

      nav('/salad', { replace: true });
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'เข้าสู่ระบบไม่สำเร็จ';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div
        className="shadow-lg bg-white rounded-4 p-4 p-md-5"
        style={{ width: '100%', maxWidth: 640 }}
      >
        <h2 className="text-center mb-2 fw-bold">
          เข้าสู่ระบบ
        </h2>
        <p className="text-center text-muted mb-4">
          ยินดีต้อนรับกลับสู่ SaladBoard
        </p>

        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label">อีเมล</label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password"
              className="form-control form-control-lg"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && (
            <div className="text-danger small">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-100 mt-2"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* ลิงก์สมัครสมาชิก & แอดมิน */}
        <div className="mt-4 text-center small">
          <div className="mb-2">
            ยังไม่มีบัญชี?{' '}
            <Link
              to="/register"
              className="fw-semibold text-primary text-decoration-none"
            >
              สมัครสมาชิก
            </Link>
          </div>
          <div>
            ผู้ดูแลระบบ?{' '}
            <Link
              to="/admin/login"
              className="text-secondary text-decoration-none"
            >
              เข้าสู่ระบบผู้ดูแล
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
