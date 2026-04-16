// client/src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import api, { API_BASE, uploadWithProgress } from '../lib/axios';
import { MDBContainer, MDBCard, MDBCardBody, MDBInput, MDBBtn } from 'mdb-react-ui-kit';

const PLACEHOLDER = 'https://placehold.co/96x96?text=Avatar';

// ทำ URL ให้เป็น absolute เสมอ (รองรับ /uploads/* และลิงก์ภายนอก)
const abs = (u) => {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${API_BASE.replace(/\/$/, '')}${path}`;
};

// รวม bust-query เพื่อกัน cache หลังอัปโหลด/ลบ
const getAvatarSrc = (u, bust) => {
  const base = abs(u) || PLACEHOLDER;
  return `${base}${base.includes('?') ? '&' : '?'}v=${bust}`;
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  // อัปโหลด
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState('');

  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', avatarUrl: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [avatarBust, setAvatarBust] = useState(Date.now()); // ใช้ bust cache

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.id]: e.target.value }));
  const onPwChange = (e) => setPw((p) => ({ ...p, [e.target.id]: e.target.value }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/users/me');
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatarUrl: data.avatarUrl || '',
        });
        setAvatarBust(Date.now());
      } catch (e) {
        setErr(e?.response?.data?.message || 'โหลดโปรไฟล์ไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    setErr(''); setMsg(''); setSaving(true);
    try {
      // ใช้ PUT หรือ PATCH ตามที่ฝั่ง server รองรับ (โค้ดเดิมใช้ PUT)
      const { data } = await api.put('/api/users/me', { name: form.name, phone: form.phone });
      setMsg(data?.message || 'บันทึกสำเร็จ');
      window.dispatchEvent(new Event('profile-updated'));
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'บันทึกโปรไฟล์ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e?.preventDefault();
    setErr(''); setMsg(''); setChanging(true);
    try {
      const { data } = await api.put('/api/users/password', pw);
      setMsg(data?.message || 'เปลี่ยนรหัสผ่านสำเร็จ');
      setPw({ currentPassword: '', newPassword: '' });
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setChanging(false);
    }
  };

  // === อัปโหลดรูปโปรไฟล์: อัปไป /api/uploads/images แล้ว PATCH/PUT avatarUrl ===
  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(''); setMsg('');
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      e.target.value = '';
      return setErr('รองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp, gif)');
    }
    if (file.size > 2 * 1024 * 1024) {
      e.target.value = '';
      return setErr('ขนาดไฟล์ห้ามเกิน 2MB');
    }

    try {
      setUploading(true);
      setUploadingName(file.name);
      setProgress(0);

      // 1) อัปโหลดไฟล์
      const data = await uploadWithProgress({
        url: '/api/uploads/images',
        file,
        fieldName: 'image',
        onProgress: (p) => setProgress(p),
      });
      const url = data?.url;
      if (!url) throw new Error('อัปโหลดสำเร็จแต่ไม่ได้รับ URL');

      // 2) อัปเดต avatarUrl ในโปรไฟล์
      // ใช้ PUT หรือ PATCH ให้ตรงกับเซิร์ฟเวอร์ของคุณ (โค้ดนี้ใช้ PUT)
      await api.put('/api/users/me', { avatarUrl: url });

      // 3) อัปเดตหน้าจอ
      setForm((f) => ({ ...f, avatarUrl: url }));
      setAvatarBust(Date.now());
      setMsg('อัปโหลดรูปสำเร็จ');

      // แจ้ง Navbar ให้รีโหลดรูปทันที
      window.dispatchEvent(new Event('profile-updated'));
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
      setUploadingName('');
      setProgress(0);
      e.target.value = '';
    }
  };

  // === ลบรูปโปรไฟล์: แค่ตั้ง avatarUrl เป็นค่าว่าง ===
  const removeAvatar = async () => {
    setErr(''); setMsg('');
    try {
      setUploading(true);
      // ใช้ PUT หรือ PATCH ให้ตรงกับเซิร์ฟเวอร์ของคุณ
      await api.put('/api/users/me', { avatarUrl: '' });
      setForm((f) => ({ ...f, avatarUrl: '' }));
      setAvatarBust(Date.now());
      setMsg('ลบรูปโปรไฟล์แล้ว');
      window.dispatchEvent(new Event('profile-updated'));
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'ลบรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="container py-4">กำลังโหลดโปรไฟล์...</div>;

  const avatarSrc = getAvatarSrc(form.avatarUrl, avatarBust);

  return (
    <MDBContainer fluid className="d-flex justify-content-center align-items-start min-vh-100 bg-light py-5">
      <MDBCard className="w-100 shadow-4" style={{ borderRadius: 20, maxWidth: 720 }}>
        <MDBCardBody className="p-4 p-md-5">
          <h3 className="fw-bold mb-4">โปรไฟล์ของฉัน</h3>

          {/* Avatar */}
          <div className="d-flex align-items-center gap-3 mb-3">
            <img
              key={avatarBust}
              src={avatarSrc}
              alt="avatar"
              onError={(ev) => { ev.currentTarget.src = PLACEHOLDER; }}
              style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #eef' }}
            />
            <div className="d-flex flex-column gap-2">
              <label className="btn btn-sm btn-primary mb-0">
                {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปโปรไฟล์'}
                <input type="file" accept="image/*" onChange={onPickAvatar} hidden disabled={uploading} />
              </label>
              {form.avatarUrl && (
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={removeAvatar} disabled={uploading}>
                  ลบรูปโปรไฟล์
                </button>
              )}
              <small className="text-muted">รองรับ: jpg, png, webp, gif (สูงสุด 2MB)</small>
            </div>
          </div>

          {/* แถบสถานะอัปโหลด */}
          {!!uploadingName && (
            <div className="small mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span>กำลังอัปโหลด: {uploadingName}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress" style={{ height: 6 }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Profile form */}
          <form onSubmit={save} className="d-flex flex-column gap-3 mb-4">
            <MDBInput
              id="name"
              label="ชื่อ-นามสกุล"
              value={form.name}
              onChange={onChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
            />
            <MDBInput
              id="email"
              label="อีเมล"
              type="email"
              value={form.email}
              disabled
              size="lg"
              labelClass="fs-6 fw-semibold"
            />
            <MDBInput
              id="phone"
              label="เบอร์โทรศัพท์"
              type="tel"
              value={form.phone}
              onChange={onChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
              placeholder="0812345678"
            />

            {err && <div className="text-danger">{err}</div>}
            {msg && <div className="text-success">{msg}</div>}

            <div className="d-flex gap-2">
              <MDBBtn type="submit" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
              </MDBBtn>
            </div>
          </form>

          <hr className="my-4" />

          {/* Change password */}
          <h5 className="fw-bold mb-3">เปลี่ยนรหัสผ่าน</h5>
          <form onSubmit={changePw} className="d-flex flex-column gap-3">
            <MDBInput
              id="currentPassword"
              label="รหัสผ่านปัจจุบัน"
              type="password"
              value={pw.currentPassword}
              onChange={onPwChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
            />
            <MDBInput
              id="newPassword"
              label="รหัสผ่านใหม่"
              type="password"
              value={pw.newPassword}
              onChange={onPwChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
            />
            <div>
              <MDBBtn type="submit" color="secondary" disabled={changing}>
                {changing ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
              </MDBBtn>
            </div>
          </form>
        </MDBCardBody>
      </MDBCard>
    </MDBContainer>
  );
}
