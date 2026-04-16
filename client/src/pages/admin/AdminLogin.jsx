// client/src/pages/admin/AdminLogin.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAdminToken, clearToken, getAdminToken } from '../../lib/axios';
import { MDBContainer, MDBCard, MDBCardBody, MDBInput, MDBBtn, MDBIcon } from 'mdb-react-ui-kit';

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ถ้าเคยล็อกอินแอดมินแล้ว ไม่ต้องเห็นหน้า login
  useEffect(() => {
    if (getAdminToken()) {
      nav('/admin', { replace: true });
    }
  }, [nav]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.id]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      setLoading(true);
      // 🔐 เรียกเอ็นด์พอยต์สำหรับผู้ดูแลระบบโดยเฉพาะ
      const { data } = await api.post('/api/auth/admin/login', form);

      // กัน token ผู้ใช้ทั่วไปกับแอดมินไม่ให้ปะปน
      clearToken();                 // ล้าง token ผู้ใช้ทั่วไป (ถ้ามี)
      setAdminToken(data.token);    // เก็บ admin_token

      nav('/admin', { replace: true });
    } catch (e) {
      setErr(e?.friendlyMessage || e?.response?.data?.message || 'เข้าสู่ระบบผู้ดูแลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDBContainer fluid className="auth-center bg-light">
      <MDBCard className="auth-card text-black shadow-4 w-100" style={{ maxWidth: 560 }}>
        <MDBCardBody className="p-4 p-md-5">
          <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
            <p className="text-center h2 fw-bold mb-3">เข้าสู่ระบบผู้ดูแล</p>

            <div className="d-flex flex-row align-items-center">
              <MDBIcon fas icon="envelope" size="lg" className="me-3" />
              <MDBInput
                id="email"
                type="email"
                label="อีเมล (Admin)"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
                className="w-100"
              />
            </div>

            <div className="d-flex flex-row align-items-center">
              <MDBIcon fas icon="lock" size="lg" className="me-3" />
              <MDBInput
                id="password"
                type="password"
                label="รหัสผ่าน"
                value={form.password}
                onChange={onChange}
                autoComplete="current-password"
                className="w-100"
              />
            </div>

            {err && <div className="text-danger small">{err}</div>}

            <MDBBtn className="w-100" size="lg" type="submit" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบผู้ดูแล'}
            </MDBBtn>

            <p className="text-center mt-3 mb-0">
              กลับไป <Link to="/login">เข้าสู่ระบบผู้ใช้ทั่วไป</Link>
            </p>
          </form>
        </MDBCardBody>
      </MDBCard>
    </MDBContainer>
  );
}
