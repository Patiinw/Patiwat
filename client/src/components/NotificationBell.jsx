// client/src/components/NotificationBell.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { NotificationService } from '../lib/axios';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // โหลดรายการล่าสุด 5 รายการ
      const latest = await NotificationService.list({ page: 1, limit: 5 });
      setItems(Array.isArray(latest?.items) ? latest.items : []);

      // นับจำนวนที่ยังไม่ได้อ่าน
      if (typeof NotificationService.unreadCount === 'function') {
        const cnt = await NotificationService.unreadCount();
        setUnread(Number(cnt?.count || 0));
      } else {
        // กรณี API ไม่มี unreadCount ให้เดาจากรายการ (ถ้ามี isRead)
        const guessed = (latest?.items || []).filter((n) => !n.isRead).length;
        setUnread(guessed);
      }
    } catch {
      // เงียบไว้ ไม่ให้แตก UI
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const onItemClick = async (id) => {
    try {
      if (typeof NotificationService.markRead === 'function') {
        await NotificationService.markRead(id);
      } else if (typeof NotificationService.markAllRead === 'function') {
        await NotificationService.markAllRead();
      }
      await load();
    } catch {
      // เงียบไว้
    }
  };

  return (
    <div className="position-relative" ref={menuRef}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary position-relative"
        onClick={() => setOpen((v) => !v)}
        title="แจ้งเตือน"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
      >
        🔔
        {unread > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="shadow rounded-3 p-2"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 320,
            background: 'var(--bs-body-bg,#fff)',
            zIndex: 1050,
          }}
        >
          <div className="d-flex justify-content-between align-items-center px-2 pb-2">
            <div className="fw-semibold">การแจ้งเตือน</div>
            <Link to="/notifications" onClick={() => setOpen(false)} className="small">
              ดูทั้งหมด
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="text-center text-muted small py-3">ยังไม่มีการแจ้งเตือน</div>
          ) : (
            <ul className="list-unstyled mb-0">
              {items.map((n) => (
                <li
                  key={n._id}
                  className={`p-2 rounded mb-1 ${n.isRead ? '' : 'bg-light'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onItemClick(n._id)}
                  title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                >
                  <div className="fw-semibold">{n.title}</div>
                  <div className="small text-muted">{n.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
