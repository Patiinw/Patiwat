import { useState } from 'react';
import { MDBInput, MDBBtn, MDBCard, MDBCardBody } from 'mdb-react-ui-kit';
import api from '../../lib/axios';

export default function AdminChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.id]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!form.currentPassword || !form.newPassword) {
      setErr('กรุณากรอกรหัสผ่านให้ครบ');
      return;
    }
    try {
      setSaving(true);
      const { data } = await api.put('/api/users/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMsg(data?.message || 'เปลี่ยนรหัสผ่านสำเร็จ');
      setForm({ currentPassword: '', newPassword: '' });
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4 d-flex justify-content-center">
      <MDBCard className="w-100" style={{ maxWidth: 520, borderRadius: 20 }}>
        <MDBCardBody className="p-4">
          <h4 className="fw-bold mb-3">เปลี่ยนรหัสผ่าน (ผู้ดูแลระบบ)</h4>

          <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
            <MDBInput
              id="currentPassword"
              label="รหัสผ่านปัจจุบัน"
              type="password"
              value={form.currentPassword}
              onChange={onChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
              autoComplete="current-password"
            />
            <MDBInput
              id="newPassword"
              label="รหัสผ่านใหม่"
              type="password"
              value={form.newPassword}
              onChange={onChange}
              size="lg"
              labelClass="fs-6 fw-semibold"
              autoComplete="new-password"
            />

            {err && <div className="text-danger">{err}</div>}
            {msg && <div className="text-success">{msg}</div>}

            <div className="d-flex gap-2">
              <MDBBtn type="submit" disabled={saving}>
                {saving ? 'กำลังเปลี่ยน...' : 'ยืนยันการเปลี่ยนรหัสผ่าน'}
              </MDBBtn>
            </div>
          </form>

          <hr className="my-4" />
          <div className="small text-muted">
            เคล็ดลับ: ใช้รหัสผ่านที่คาดเดายากและไม่ซ้ำกับระบบอื่น ๆ
          </div>
        </MDBCardBody>
      </MDBCard>
    </div>
  );
}
