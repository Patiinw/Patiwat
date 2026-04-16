// client/src/pages/SaladDetail.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/axios';
import { MDBBtn, MDBTextArea } from 'mdb-react-ui-kit';
import ReportDialog from '../components/ReportDialog';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const REASON_LABELS = {
  spam: 'สแปม',
  abuse: 'คำหยาบคาย/ดูหมิ่น',
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  ads: 'โฆษณา/เชิญชวน',
  illegal: 'ผิดกฎหมาย',
  other: 'อื่นๆ',
};
const reasonToLabel = (v) => REASON_LABELS[v] || v || '';

function toDisplayHtml(raw) {
  if (!raw) return '';
  return String(raw)
    .replaceAll('src="/api', `src="${API_BASE}/api`)
    .replaceAll("src='/api", `src='${API_BASE}/api`)
    .replaceAll('href="/api', `href="${API_BASE}/api`)
    .replaceAll("href='/api", `href='${API_BASE}/api`);
}

function sameSub(token, id) {
  try {
    if (!token || !id) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub === String(id);
  } catch {
    return false;
  }
}

export default function SaladDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const fromAdmin =
    location.state?.fromAdmin === true ||
    new URLSearchParams(location.search).get('fromAdmin') === '1';

  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [, setMe] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);

  // แสดง/ซ่อนรายละเอียดการรายงาน
  const [openReportFor, setOpenReportFor] = useState(null);

  // โมดัลส่งรายงาน
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [reportCommentId, setReportCommentId] = useState(null);

  const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
  const [likesCount, setLikesCount] = useState(0);

  // ✅ อย่าเรียก /api/users/me เมื่อไม่มี token (กัน redirect ไป login)
  const loadMe = useCallback(async () => {
    if (!token) {                         // <— จุดแก้หลัก
      setMe(null);
      setIsAdminView(false);
      return;
    }
    try {
      const { data } = await api.get('/api/users/me');
      setMe(data || null);
      setIsAdminView(Boolean(data?.isAdmin && fromAdmin));
    } catch {
      setMe(null);
      setIsAdminView(false);
    }
  }, [fromAdmin, token]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/posts/${id}`);
      setPost(data);
      setLikesCount(data?.likes?.length || 0);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.friendlyMessage || 'โหลดกระทู้ไม่สำเร็จ';
      if (status === 410) {
        alert(msg);               // << แจ้งว่า "กระทู้นี้ถูกผู้ดูแลระบบลบแล้ว"
        nav('/salad', { replace: true });
        return;
      }
      if (status === 404) {
        alert(msg);
        nav('/salad', { replace: true });
        return;
      }
      alert(msg);
    }
  }, [id, nav]);

  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { load(); }, [load]);

  // poll likes
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/posts/${id}`);
        setLikesCount(data?.likes?.length || 0);
      } catch { /* empty */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [id]);

  // นับวิว
  const viewedRef = useRef(false);
  useEffect(() => { viewedRef.current = false; }, [id]);
  useEffect(() => {
    if (!id) return;
    if (fromAdmin) return;
    const key = `viewed:${id}`;
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last < 1500) return;
    sessionStorage.setItem(key, String(now));
    api.post(`/api/posts/${id}/view`)
      .then(({ data }) => setPost(prev => (prev ? { ...prev, views: data?.views ?? prev.views } : prev)))
      .catch(() => {});
  }, [id, fromAdmin]);

  const addComment = async () => {
    if (isAdminView) return;
    if (!comment.trim()) return;
    await api.post(`/api/posts/${id}/comments`, { body: comment });
    setComment('');
    await load();
  };

  const toggleLike = async () => {
    if (isAdminView) return;
    const { data } = await api.post(`/api/posts/${id}/like`);
    if (typeof data?.likes === 'number') setLikesCount(data.likes);
    await load();
  };

  const del = async () => {
    if (isAdminView) return;
    if (!confirm('ลบกระทู้นี้?')) return;
    await api.delete(`/api/posts/${id}`);
    nav('/salad', { replace: true });
  };

  const reportComment = (commentId) => {
    if (isAdminView) return;
    setReportCommentId(commentId);
    setOpenReportDialog(true);
  };

  const submitReport = async ({ reason, note }) => {
    if (!reportCommentId) return;
    try {
      await api.post(`/api/posts/${id}/comments/${reportCommentId}/report`, { reason, note });
      setOpenReportDialog(false);
      setReportCommentId(null);
      await load();
      alert('ส่งรายงานแล้ว');
    } catch (e) {
      alert(e?.friendlyMessage || e?.response?.data?.message || 'รายงานไม่สำเร็จ');
    }
  };

  const unreportComment = async (commentId) => {
    if (isAdminView) return;
    try {
      await api.delete(`/api/posts/${id}/comments/${commentId}/report`);
      await load();
    } catch (e) {
      alert(e?.friendlyMessage || e?.response?.data?.message || 'ยกเลิกรายงานไม่สำเร็จ');
    }
  };

  if (!post) return <div className="py-4">กำลังโหลด...</div>;

  const isOwner = token ? sameSub(token, post.author?._id) : false;
  const commentsDesc = (post.comments || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const displayHtml = toDisplayHtml(post.body || '');

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-start">
        <h3 className="mb-2">{post.title}</h3>

        {!isAdminView && (
          <div className="d-flex gap-2">
            {!!token && (
              <MDBBtn size="sm" outline onClick={toggleLike}>
                ถูกใจ ({likesCount})
              </MDBBtn>
            )}
            {isOwner && (
              <>
                <Link to={`/salad/${post._id}/edit`} className="btn btn-sm btn-outline-secondary">
                  แก้ไข
                </Link>
                <MDBBtn size="sm" color="danger" onClick={del}>ลบ</MDBBtn>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-muted mb-2">
        หมวด: {post.category} • โดย {post.author?.name} • {new Date(post.createdAt).toLocaleString()} • 👁 {post.views} • ❤️ {likesCount}
      </div>

      <div
        className="post-body border rounded p-3 bg-white mb-4"
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />

      {!!post.tags?.length && (
        <div className="mb-3">
          {post.tags.map((t) => (
            <span key={t} className="badge rounded-pill text-bg-light me-2">#{t}</span>
          ))}
        </div>
      )}

      <h5 className="mb-3">คอมเมนต์ ({post.comments?.length || 0})</h5>
      <div className="d-flex flex-column gap-3 mb-4">
        {commentsDesc.map((c) => {
          const reportedByMe = !!token && (c.reports || []).some(r => sameSub(token, r.reporter));
          const reportCount = c.reports?.length || 0;
          const isReportOpen = openReportFor === c._id;

          const reportItems = (c.reports || []).map((r) => ({
            reason: reasonToLabel(r.reason),
            note: r.note || '',
            date: r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
          }));

          return (
            <div key={c._id} className="border rounded p-3 bg-white">
              <div className="d-flex justify-content-between align-items-start">
                <div className="small text-muted mb-1">
                  {c.author?.name} • {new Date(c.createdAt).toLocaleString()}
                </div>

                <div className="d-flex align-items-center gap-2">
                  {reportCount > 0 && (
                    <button
                      type="button"
                      className="badge text-bg-warning border-0"
                      onClick={() => setOpenReportFor(isReportOpen ? null : c._id)}
                      title="คลิกเพื่อดูรายละเอียดรายงาน"
                    >
                      ถูกรายงาน {reportCount}
                    </button>
                  )}

                  {!!token && !isAdminView && (
                    !reportedByMe ? (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => reportComment(c._id)}>
                        รายงาน
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => unreportComment(c._id)}>
                        ยกเลิกรายงาน
                      </button>
                    )
                  )}
                </div>
              </div>

              <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>

              {isReportOpen && reportItems.length > 0 && (
                <div className="mt-2 p-2 rounded border bg-light">
                  <div className="small fw-semibold mb-1">รายละเอียดการรายงาน</div>
                  <ul className="mb-0 ps-3">
                    {reportItems.map((r, i) => (
                      <li key={i} className="small">
                        <span className="fw-semibold">{r.reason || 'ไม่ระบุเหตุผล'}</span>
                        {r.note && <> — <span>{r.note}</span></>}
                        {r.date && <> <span className="text-muted">({r.date})</span></>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {token && !isAdminView ? (
        <div className="border rounded p-3 bg-white">
          <MDBTextArea
            rows={4}
            id="comment"
            label="เขียนคอมเมนต์"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-2">
            <MDBBtn size="sm" onClick={addComment} disabled={!comment.trim()}>
              ส่งคอมเมนต์
            </MDBBtn>
          </div>
        </div>
      ) : !token ? (
        <div className="alert alert-info">
          กรุณา <Link to="/login">เข้าสู่ระบบ</Link> เพื่อคอมเมนต์
        </div>
      ) : null}

      <ReportDialog
        open={openReportDialog}
        onClose={() => { setOpenReportDialog(false); setReportCommentId(null); }}
        onSubmit={submitReport}
        title="เลือกเหตุผลการรายงานคอมเมนต์นี้"
      />
    </div>
  );
}
