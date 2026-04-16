// client/src/pages/Notifications.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotificationService } from '../lib/axios';
import { MDBBtn } from 'mdb-react-ui-kit';

export default function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const pageFromUrl = parseInt(params.get('page') || '1', 10);

  const [data, setData] = useState({
    items: [],
    pagination: { page: 1, pages: 1, total: 0 },
  });
  const [page, setPage] = useState(pageFromUrl);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [busy, setBusy] = useState(false); // ป้องกันกดซ้ำตอน mark read
  const limit = 20;
  const aliveRef = useRef(true);

  // sync page -> URL
  useEffect(() => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('page', String(page));
      return p;
    }, { replace: true });
  }, [page, setParams]);

  // ถ้าแก้ URL ด้วยมือ -> sync กลับ state
  useEffect(() => {
    if (pageFromUrl !== page) setPage(pageFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageFromUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const res = await NotificationService.list({ page, limit });
      if (!aliveRef.current) return;
      setData(res || { items: [], pagination: { page: 1, pages: 1, total: 0 } });
    } catch (e) {
      if (!aliveRef.current) return;
      setErrMsg(e?.friendlyMessage || 'โหลดการแจ้งเตือนไม่สำเร็จ');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    const iv = setInterval(load, 30_000); // refresh ทุก 30 วิ
    return () => {
      aliveRef.current = false;
      clearInterval(iv);
    };
  }, [load]);

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await NotificationService.markAllRead();
      await load();
    } catch (e) {
      setErrMsg(e?.friendlyMessage || 'ทำเครื่องหมายทั้งหมดว่าอ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      await NotificationService.markRead(id);
      await load();
    } catch (e) {
      setErrMsg(e?.friendlyMessage || 'ทำเครื่องหมายว่าอ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(data.pagination.pages || 1, p + 1));

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">การแจ้งเตือน</h4>
        <MDBBtn size="sm" outline onClick={markAll} disabled={busy || loading}>
          ทำเครื่องหมายว่าอ่านทั้งหมด
        </MDBBtn>
      </div>

      {errMsg && (
        <div className="alert alert-danger py-2">{errMsg}</div>
      )}

      {loading ? (
        <div className="text-muted">กำลังโหลด…</div>
      ) : (
        <>
          <div className="d-flex flex-column gap-2">
            {data.items.length === 0 ? (
              <div className="text-center text-muted py-5">ยังไม่มีการแจ้งเตือน</div>
            ) : (
              data.items.map((n) => (
                <div
                  key={n._id}
                  className={`border rounded p-3 ${n.isRead ? '' : 'bg-light'}`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="fw-semibold">{n.title}</div>
                    {!n.isRead && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => markOne(n._id)}
                        disabled={busy}
                      >
                        อ่านแล้ว
                      </button>
                    )}
                  </div>
                  <div className="text-muted small">{new Date(n.createdAt).toLocaleString()}</div>
                  <div className="mt-1">{n.message}</div>
                </div>
              ))
            )}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="small text-muted">รวม {data.pagination.total} รายการ</div>
            <div className="d-flex gap-2 align-items-center">
              <MDBBtn size="sm" disabled={page <= 1 || loading} onClick={goPrev}>
                ก่อนหน้า
              </MDBBtn>
              <span className="small">หน้า {page} / {data.pagination.pages || 1}</span>
              <MDBBtn
                size="sm"
                disabled={page >= (data.pagination.pages || 1) || loading}
                onClick={goNext}
              >
                ถัดไป
              </MDBBtn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
