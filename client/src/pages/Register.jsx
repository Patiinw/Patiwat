// client/src/pages/Register.jsx
import { useEffect, useState } from 'react';
import api from '../lib/axios';
import {
  MDBBtn,
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBInput,
  MDBIcon,
} from 'mdb-react-ui-kit';
import { Link, useNavigate } from 'react-router-dom';

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

const ReqLabel = ({ children }) => (
  <>
    {children} <span className="text-danger">*</span>
  </>
);

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ถ้า "ล็อกอินอยู่แล้ว" ไม่ควรเข้า register
  useEffect(() => {
    const userToken = localStorage.getItem(USER_TOKEN_KEY);
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (userToken) {
      navigate('/salad', { replace: true });
    } else if (adminToken) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setForm((f) => ({ ...f, [id]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.name || !form.email || !form.password || !form.phone) {
      return setErr('กรุณากรอกข้อมูลให้ครบ');
    }
    if (!/^0\d{9}$/.test(form.phone.trim())) {
      return setErr('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (เช่น 0812345678)');
    }

    // อีเมลต้องลงท้ายด้วย .com
    const email = form.email.trim().toLowerCase();
    const emailComRx = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/i;
    if (!emailComRx.test(email)) {
      return setErr(
        'กรุณากรอกอีเมลให้ถูกต้องและลงท้ายด้วย .com เท่านั้น (เช่น name@example.com)'
      );
    }

    try {
      setLoading(true);
      await api.post('/api/auth/register', {
        ...form,
        email,
      });
      navigate('/login', { replace: true });
    } catch (e) {
      setErr(
        e?.friendlyMessage ||
          e?.response?.data?.message ||
          'สมัครสมาชิกไม่สำเร็จ'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MDBContainer fluid className="auth-center bg-light">
      <MDBCard
        className="auth-card text-black w-100 shadow-4"
        style={{ borderRadius: 28, maxWidth: 560 }}
      >
        <MDBCardBody className="p-4 p-md-5">
          <form
            onSubmit={onSubmit}
            className="d-flex flex-column align-items-center gap-3"
          >
            <p
              className="text-center fw-bold mb-4 mt-1"
              style={{ fontSize: '1.8rem' }}
            >
              สมัครสมาชิก
            </p>

            {/* Name */}
            <div className="d-flex flex-column w-100">
              <div className="d-flex flex-row align-items-center">
                <MDBIcon fas icon="user" size="2x" className="me-3" />
                <MDBInput
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={onChange}
                  autoComplete="name"
                  size="lg"
                  labelClass="fs-6 fw-semibold"
                  label={<ReqLabel>ชื่อ-นามสกุล</ReqLabel>}
                  required
                  aria-describedby="help-name"
                  className="w-100"
                />
              </div>
              <small
                id="help-name"
                className="form-text text-muted ms-5 mt-1"
              >
                ระบุชื่อ-นามสกุลจริงหรือชื่อที่ต้องการแสดงในระบบ
              </small>
            </div>

            {/* Email */}
            <div className="d-flex flex-column w-100">
              <div className="d-flex flex-row align-items-center">
                <MDBIcon fas icon="envelope" size="2x" className="me-3" />
                <MDBInput
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                  size="lg"
                  labelClass="fs-6 fw-semibold"
                  label={<ReqLabel>อีเมล</ReqLabel>}
                  required
                  aria-describedby="help-email"
                  className="w-100"
                  pattern="^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$"
                  title="อีเมลต้องอยู่ในรูปแบบ name@example.com และลงท้ายด้วย .com เท่านั้น"
                />
              </div>
              <small
                id="help-email"
                className="form-text text-muted ms-5 mt-1"
              >
                ใช้อีเมลรูปแบบถูกต้อง เช่น{' '}
                <code>name@example.com</code>
              </small>
            </div>

            {/* Password */}
            <div className="d-flex flex-column w-100">
              <div className="d-flex flex-row align-items-center">
                <MDBIcon fas icon="lock" size="2x" className="me-3" />
                <MDBInput
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="new-password"
                  size="lg"
                  labelClass="fs-6 fw-semibold"
                  label={<ReqLabel>รหัสผ่าน</ReqLabel>}
                  required
                  minLength={6}
                  aria-describedby="help-password"
                  className="w-100"
                />
              </div>
              <small
                id="help-password"
                className="form-text text-muted ms-5 mt-1"
              >
                ความยาวอย่างน้อย 6 ตัวอักษร
              </small>
            </div>

            {/* Phone */}
            <div className="d-flex flex-column w-100">
              <div className="d-flex flex-row align-items-center">
                <MDBIcon fas icon="phone" size="2x" className="me-3" />
                <MDBInput
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={onChange}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder=" "
                  size="lg"
                  labelClass="fs-6 fw-semibold"
                  label={<ReqLabel>เบอร์โทรศัพท์</ReqLabel>}
                  required
                  pattern="^0[0-9]{9}$"
                  title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก เริ่มด้วย 0 (เช่น 0812345678)"
                  aria-describedby="help-phone"
                  className="w-100"
                />
              </div>
              <small
                id="help-phone"
                className="form-text text-muted ms-5 mt-1"
              >
                กรอกตัวเลข 10 หลัก เริ่มด้วย 0 เช่น{' '}
                <code>0812345678</code>
              </small>
            </div>

            {err && (
              <p
                className="text-danger w-100 text-center mt-2 mb-0"
                style={{ fontSize: '1rem' }}
              >
                {err}
              </p>
            )}

            <MDBBtn
              className="mt-2 w-100 py-2"
              size="lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </MDBBtn>

            <p className="mt-3 mb-0" style={{ fontSize: '1rem' }}>
              หากมีบัญชีอยู่แล้ว?{' '}
              <Link to="/login">เข้าสู่ระบบ</Link>
            </p>
          </form>
        </MDBCardBody>
      </MDBCard>
    </MDBContainer>
  );
}
