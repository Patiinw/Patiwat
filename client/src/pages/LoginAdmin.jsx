// client/src/pages/LoginAdmin.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

export default function LoginAdmin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErr('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/admin/login', { email, password });
      if (!data?.token) throw new Error('ไม่พบโทเคนจากเซิร์ฟเวอร์');

      // ไม่ลบ userToken เพื่อให้เปิดแท็บ user แยกกันได้
      // เขียน/แทนที่เฉพาะ adminToken
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);

      nav('/admin', { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        'เข้าสู่ระบบผู้ดูแลระบบไม่สำเร็จ';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="mx-auto" style={{ maxWidth: 480 }}>
        <h3 className="mb-4 text-center">เข้าสู่ระบบผู้ดูแลระบบ</h3>

        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <input
            type="email"
            className="form-control"
            placeholder="อีเมลผู้ดูแลระบบ"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="form-control"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {err && <div className="text-danger small">{err}</div>}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบผู้ดูแลระบบ'}
          </button>
        </form>

        <div className="mt-3 text-center small">
          กลับไปหน้าเข้าสู่ระบบผู้ใช้ทั่วไป?{' '}
          <Link to="/login" className="fw-semibold">
            คลิกที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
