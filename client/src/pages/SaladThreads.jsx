// client/src/pages/SaladThreads.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/axios';
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit';

export default function SaladThreads() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get('page') || '1', 10);

  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [data, setData] = useState({
    items: [],
    categories: [],
    pagination: { page: 1, pages: 1, total: 0 },
  });

  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    const res = await api.get('/api/posts', { params: { page, q, category } });
    setData(res.data);
  }, [page, q, category]);

  useEffect(() => { load(); }, [load]);

  // ให้คอนเทนเนอร์เลื่อนกลับ “ด้านบนสุด”
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, q, category, data.items.length]);

  // อัปเดต query string เมื่อเปลี่ยนค่าค้นหา/หมวด (รีเซ็ตหน้าเป็น 1)
  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      if (q) next.set('q', q); else next.delete('q');
      if (category) next.set('category', category); else next.delete('category');
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const go = (p) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      if (q) next.set('q', q); else next.delete('q');
      if (category) next.set('category', category); else next.delete('category');
      return next;
    });
  };

  return (
    <div className="thread-page">
      <div className="d-flex justify-content-between align-items-center thread-header">
        <h4 className="mb-0">กระทู้ผักสลัด</h4>
      </div>

      <div className="row g-2 thread-filters">
        <div className="col-md">
          <MDBInput
            label="ค้นหา"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="sm"
          />
        </div>
        <div className="col-md">
          <select
            className="form-select form-select-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">ทุกหมวด</option>
            {data.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="thread-scroll" ref={scrollRef}>
        {data.items.map((p) => (
          <div key={p._id} className="post-card border">
            {/* ✅ ลิงก์ตรงไปหน้ากระทู้ได้ แม้ยังไม่ได้ล็อกอิน */}
            <Link to={`/salad/${p._id}`} className="text-decoration-none">
              <h5 className="mb-1">{p.title}</h5>
            </Link>

            <div className="post-meta">
              หมวด: {p.category} • โดย {p.author?.name} • {new Date(p.createdAt).toLocaleString()} • 👁 {p.views} • ❤ {p.likes?.length || 0}
            </div>

            {!!p.tags?.length && (
              <div className="post-tags">
                {p.tags.map((t) => (
                  <span key={t} className="badge rounded-pill text-bg-light me-2">#{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="d-flex justify-content-between align-items-center mt-2 pb-2">
          <div className="small text-muted">รวม {data.pagination.total} กระทู้</div>
          <div className="d-flex align-items-center gap-2">
            <MDBBtn size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>ก่อนหน้า</MDBBtn>
            <span className="small">หน้า {page} / {data.pagination.pages}</span>
            <MDBBtn size="sm" disabled={page >= data.pagination.pages} onClick={() => go(page + 1)}>ถัดไป</MDBBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
