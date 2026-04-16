// client/src/pages/Login.jsx
import { useEffect, useState } from 'react';
import api, { setToken, clearToken } from '../lib/axios';
import {
  MDBBtn, MDBContainer, MDBCard, MDBCardBody,
  MDBInput, MDBIcon
} from 'mdb-react-ui-kit';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  // โชว์ข้อความเมื่อถูกรีไดเรกต์มาจากส่วนที่ต้องล็อกอิน/แอดมิน
  useEffect(() => {
    const reason = location.state?.reason;
    if (reason === 'admin_required') {
      setInfo('ต้องเป็นผู้ดูแลระบบจึงจะเข้าหน้านี้ได้ โปรดเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ');
    } else if (reason === 'need_login') {
      setInfo('โปรดเข้าสู่ระบบก่อนจึงจะใช้งานส่วนนี้ได้');
    } else {
      setInfo('');
    }
  }, [location.state]);

  // ถ้ามี token แล้ว ไม่ให้เห็นหน้า login
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/salad', { replace: true });
    }
  }, [navigate]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setForm((f) => ({ ...f, [id]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // กันกดซ้ำ
    setErr('');
    setInfo('');

    try {
      setLoading(true);

      // สะกดอีเมล/รหัสผ่านให้ชัดเจนก่อนส่ง
      const payload = {
        email: (form.email || '').trim().toLowerCase(),
        password: (form.password || '').trim(),
      };
      if (!payload.email || !payload.password) {
        setErr('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
      }

      // เรียก endpoint เดียว (รองรับทั้ง user/admin)
      const { data } = await api.post('/api/auth/login', payload);
      if (!data?.token) {
        setErr('ไม่สามารถรับโทเค็นจากเซิร์ฟเวอร์');
        return;
      }

      // เก็บโทเค็นลง localStorage และใส่เฮดเดอร์ให้ instance api
      setToken(data.token);

      // ตรวจสิทธิ์ผู้ใช้เพื่อเลือกเส้นทาง
      let me;
      try {
        const r = await api.get('/api/users/me');
        me = r?.data || {};
      } catch {
        // ถ้าเรียก me ล้มเหลว ให้ถอยไปหน้า /salad
        navigate('/salad', { replace: true });
        return;
      }

      const isAdmin = Boolean(me?.isAdmin) || me?.role === 'admin';
      navigate(isAdmin ? '/admin' : '/salad', { replace: true });
    } catch (ex) {
      // ล้างโทเค็นเผื่อฝั่ง server ให้ 401
      clearToken();

      // แปลงข้อความให้เข้าใจง่าย
      const status = ex?.response?.status;
      const msg = ex?.response?.data?.message || ex?.friendlyMessage || ex?.message || 'เข้าสู่ระบบไม่สำเร็จ';

      if (status === 404 || msg === 'Not Found') {
        setErr('ไม่พบผู้ใช้ของคุณ โปรดลองใหม่ หรือสมัครสมาชิก');
      } else if (status === 401 || status === 403) {
        setErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDBContainer fluid className="auth-center bg-light">
      <MDBCard className="auth-card text-black shadow-4 w-100">
        <MDBCardBody className="p-4 p-md-5">
          <form onSubmit={onSubmit}>
            <p className="text-center h2 fw-bold mb-4">ลงชื่อเข้าใช้งาน</p>

            {info && <p className="text-info small mb-3">{info}</p>}

            <div className="d-flex flex-row align-items-center mb-4">
              <MDBIcon fas icon="envelope" size="lg" className="me-3" />
              <MDBInput
                label="อีเมล"
                id="email"
                type="email"
                value={form.email}
                onChange={onChange}
                className="w-100"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="d-flex flex-row align-items-center mb-3">
              <MDBIcon fas icon="lock" size="lg" className="me-3" />
              <MDBInput
                label="รหัสผ่าน"
                id="password"
                type="password"
                value={form.password}
                onChange={onChange}
                className="w-100"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            {err && <p className="text-danger small mb-3">{err}</p>}

            <MDBBtn className="w-100 mb-2" size="lg" type="submit" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </MDBBtn>

            <p className="text-center mt-3 mb-0">
              ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
            </p>
          </form>
        </MDBCardBody>
      </MDBCard>
    </MDBContainer>
  );
}
