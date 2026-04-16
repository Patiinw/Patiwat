import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit';
import api from '../../lib/axios';

export default function AdminPosts() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const qRef = useRef(q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qRef.current !== q) {
        qRef.current = q;
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      setErr('');
      setLoading(true);
      const { data } = await api.get('/api/admin/posts', {
        params: { q: qRef.current, page, limit },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) setErr('ต้องเป็นผู้ดูแลระบบ');
      else setErr(e?.response?.data?.message || 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, limit]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id) => {
    if (!confirm('ยืนยันลบกระทู้นี้?')) return;
    try {
      await api.delete(`/api/admin/posts/${id}`);
      const remainInPage = rows.length - 1;
      const hasPrev = page > 1 && remainInPage === 0;
      hasPrev ? setPage((p) => Math.max(1, p - 1)) : load();
    } catch (e) {
      alert(e?.response?.data?.message || 'ลบไม่สำเร็จ');
    }
  };

  const onSearchClick = () => load();
  const onKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchClick();
    }
  };

  // เปิดกระทู้ (รองรับ Ctrl/Cmd/คลิกกลาง)
  const openPost = (id, e) => {
    if (e?.ctrlKey || e?.metaKey || e?.button === 1) {
      window.open(`/salad/${id}`, '_blank', 'noopener');
      return;
    }
    navigate(`/salad/${id}`, { state: { fromAdmin: true } });
  };

  return (
    <div className="py-3">
      <div className="d-flex align-items-center mb-3">
        <h3 className="mb-0">ผู้ดูแลระบบ · จัดการกระทู้</h3>
      </div>

      <div className="d-flex gap-2 align-items-center mb-3">
        <MDBInput
          id="q"
          label="ค้นหาหัวข้อ/แท็ก/ผู้เขียน"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDownSearch}
          className="flex-grow-1"
        />
        <MDBBtn color="secondary" onClick={onSearchClick} disabled={loading}>
          ค้นหา
        </MDBBtn>
      </div>

      {err && <div className="text-danger mb-3">{err}</div>}

      {loading ? (
        <div>กำลังโหลด…</div>
      ) : rows.length === 0 ? (
        <div className="text-muted">ไม่พบรายการ</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>หัวข้อ</th>
                <th>หมวด</th>
                <th>แท็ก</th>
                <th>ผู้เขียน</th>
                <th style={{ width: 220 }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r._id}>
                  <td>{(page - 1) * limit + i + 1}</td>

                  {/* หัวข้อ: ทำงานเหมือนลิงก์ */}
                  <td
                    role="link"
                    tabIndex={0}
                    className="text-break text-primary"
                    style={{ cursor: 'pointer', textDecoration: 'none' }}
                    title="เปิดกระทู้"
                    onClick={(e) => openPost(r._id, e)}
                    onAuxClick={(e) => openPost(r._id, e)}  // เมาส์กลาง
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPost(r._id, e);
                      }
                    }}
                  >
                    {r.title || '-'}
                  </td>

                  <td>{r.category || '-'}</td>
                  <td>{(r.tags || []).length ? r.tags.join(', ') : '-'}</td>
                  <td>{r.author?.name || r.author?.email || '-'}</td>

                  <td className="d-flex gap-2">
                    <Link className="btn btn-sm btn-outline-primary" to={`/admin/posts/${r._id}/edit`}>
                      แก้ไข
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(r._id)}
                      disabled={loading}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted small">
              หน้าที่ {page} / {totalPages} · รวม {total} รายการ
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ก่อนหน้า
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
