import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Sidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (p) => pathname === p || pathname.startsWith(p + '/');

  return (
    <aside className={`app-sidebar-enhanced ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Header */}
      <div className="sb-head">
        <div className="sb-brand">
          <i className="fa-solid fa-seedling me-2" />
          <span className="sb-brand-text">เมนูหลัก</span>
        </div>
        <button className="sb-toggle" onClick={() => setCollapsed(v => !v)}>
          <i className="fa-solid fa-angles-left" />
        </button>
      </div>

      {/* การใช้งาน */}
      <div className="sb-section mt-2">
        <div className="sb-section-title">การใช้งาน</div>

        <Link to="/salad" className={`sb-link ${isActive('/salad') ? 'active' : ''}`}>
          <span className="sb-icon"><i className="fa-solid fa-leaf" /></span>
          <span className="sb-text">กระทู้ผักสลัด</span>
          <span className="sb-active-indicator" />
        </Link>

        <Link to="/salad/new" className={`sb-link ${isActive('/salad/new') ? 'active' : ''}`}>
          <span className="sb-icon"><i className="fa-solid fa-plus" /></span>
          <span className="sb-text">สร้างกระทู้</span>
          <span className="sb-active-indicator" />
        </Link>

        <Link to="/profile" className={`sb-link ${isActive('/profile') ? 'active' : ''}`}>
          <span className="sb-icon"><i className="fa-solid fa-user" /></span>
          <span className="sb-text">โปรไฟล์</span>
          <span className="sb-active-indicator" />
        </Link>
      </div>

      {/* ลบส่วน “ทรัพยากร / คู่มือความรู้” ออกแล้ว */}

      <div className="sb-footer">
        <small className="text-muted">© {new Date().getFullYear()} SaladBoard</small>
      </div>
    </aside>
  );
}
