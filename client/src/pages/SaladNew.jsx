// client/src/pages/SaladNew.jsx
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadWithProgress } from '../lib/axios';
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const absUrl = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`);

export default function SaladNew() {
  const nav = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', category: '', tags: '' });
  const [bodyHtml, setBodyHtml] = useState('');
  const [uploadingName, setUploadingName] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Quill & wrapper
  const quillRef = useRef(null);
  const editorWrapRef = useRef(null);

  // ปุ่ม X ลอย
  const [xBtn, setXBtn] = useState({ show: false, top: 0, left: 0, imgEl: null });

  useEffect(() => {
    api.get('/api/posts').then((r) => setCategories(r.data.categories || []));
  }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.id]: e.target.value }));
  const onQuillChange = useCallback((html) => setBodyHtml(html), []);

  // อัปโหลดรูปแล้วแทรก
  const handleQuillImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setErr('เลือกไฟล์รูปเท่านั้น');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErr('ไฟล์ต้อง ≤ 5MB');
        return;
      }

      try {
        setErr('');
        setUploadingName(file.name);
        setProgress(0);

        const data = await uploadWithProgress({
          url: '/api/uploads/images',
          file,
          fieldName: 'image',
          onProgress: (p) => setProgress(p),
        });
        const url = absUrl(data?.url);
        if (!url) throw new Error('อัปโหลดสำเร็จแต่ไม่ได้รับ URL');

        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;

        const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
        quill.insertEmbed(range.index, 'image', url, 'user');
        quill.setSelection(range.index + 1, 0, 'user');
      } catch (_e) {
        setErr(_e?.response?.data?.message || _e.message || 'อัปโหลดรูปไม่สำเร็จ');
      } finally {
        setUploadingName('');
        setProgress(0);
      }
    };

    input.click();
  }, [setErr, setUploadingName, setProgress, quillRef]);

  // โมดูล Quill
  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: { image: handleQuillImageUpload },
      },
      clipboard: {
        matchers: [
          [
            'IMG',
            (node) => ({
              ops: [{ insert: { image: absUrl(node.getAttribute('src') || '') } }],
            }),
          ],
        ],
      },
    }),
    [handleQuillImageUpload]
  );

  // โชว์/ซ่อนปุ่ม X เมื่อชี้รูป
  useEffect(() => {
    const wrap = editorWrapRef.current;
    const quill = quillRef.current?.getEditor?.();
    if (!wrap || !quill) return;

    const root = quill.root;

    const onMouseMove = (ev) => {
      const el = ev.target;
      if (el && el.tagName === 'IMG') {
        const imgRect = el.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        setXBtn({
          show: true,
          top: imgRect.top - wrapRect.top + 6,
          left: imgRect.left - wrapRect.left + imgRect.width - 22 - 6,
          imgEl: el,
        });
      } else {
        setXBtn((s) => (s.show ? { show: false, top: 0, left: 0, imgEl: null } : s));
      }
    };

    const onScrollOrResize = () => {
      setXBtn((s) => (s.show ? { show: false, top: 0, left: 0, imgEl: null } : s));
    };

    root.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      root.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [bodyHtml]);

  // ลบรูปที่เลือก (จากปุ่ม X)
  const removeCurrentImage = useCallback(() => {
    const quill = quillRef.current?.getEditor?.();
    const imgEl = xBtn.imgEl;
    if (!quill || !imgEl) return;

    try {
      const Q = quill.constructor;
      const blot = Q.find(imgEl);
      if (blot) {
        const index = quill.getIndex(blot);
        quill.deleteText(index, 1, 'user'); // image embed ยาว 1
      } else {
        // fallback: เอาออกจาก DOM แล้ว sync
        imgEl.remove();
        const htmlNow = quill.root.innerHTML;
        const delta = quill.clipboard.convert(htmlNow);
        quill.setContents(delta, 'user');
      }
    // eslint-disable-next-line no-unused-vars
    } catch (_e1) {
      try {
        imgEl.remove();
        const htmlNow = quill.root.innerHTML;
        const delta = quill.clipboard.convert(htmlNow);
        quill.setContents(delta, 'user');
      // eslint-disable-next-line no-unused-vars
      } catch (_e2) {
        /* ignore */
      }
    } finally {
      setXBtn({ show: false, top: 0, left: 0, imgEl: null });
      setTimeout(() => {
        try {
          quill.focus();
        // eslint-disable-next-line no-unused-vars
        } catch (_e3) {
          /* ignore */
        }
      }, 0);
    }
  }, [xBtn.imgEl, quillRef]);

  // บันทึก
  const save = async (e) => {
    e.preventDefault();
    setErr('');

    try {
      const editor = quillRef.current?.getEditor?.();
      if (editor) setBodyHtml(editor.root.innerHTML);
    // eslint-disable-next-line no-unused-vars
    } catch (_eSync) {
      /* ignore */
    }

    const editor = quillRef.current?.getEditor?.();
    const html = (editor?.root?.innerHTML || bodyHtml || '').trim();
    if (!form.title.trim() || !html || !form.category) {
      setErr('กรุณากรอกหัวข้อ เนื้อหา และเลือกหมวด');
      return;
    }
    if (progress > 0 && progress < 100) {
      setErr('กรุณารอให้อัปโหลดรูปเสร็จก่อน');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        body: html,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const { data } = await api.post('/api/posts', payload);
      nav(`/salad/${data._id}`);
    } catch (_ePost) {
      setErr(_ePost?.friendlyMessage || _ePost?.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-3">
      <h3 className="mb-3">สร้างกระทู้ผักสลัด</h3>

      <form onSubmit={save} className="d-flex flex-column gap-3">
        <MDBInput id="title" label="หัวข้อ" value={form.title} onChange={onChange} size="lg" required />

        {/* หุ้ม editor เพื่อวางปุ่ม X แบบ absolute */}
        <div ref={editorWrapRef} style={{ position: 'relative' }}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={bodyHtml}
            onChange={onQuillChange}
            modules={quillModules}
            placeholder="พิมพ์เนื้อหาได้เลย (แนบรูปจากปุ่มเครื่องมือด้านบน)"
          />

          {/* ปุ่มกากบาทลอย */}
          {xBtn.show && (
            <button
              type="button"
              onClick={removeCurrentImage}
              title="ลบรูปนี้"
              style={{
                position: 'absolute',
                top: xBtn.top,
                left: xBtn.left,
                width: 22,
                height: 22,
                lineHeight: '20px',
                borderRadius: '50%',
                border: 'none',
                background: '#dc3545',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,.25)',
                zIndex: 10,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {uploadingName && (
          <div className="small">
            <div className="d-flex justify-content-between align-items-center">
              <span>กำลังอัปโหลด: {uploadingName}</span>
              <span>{progress}%</span>
            </div>
            <div className="progress" style={{ height: 6 }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="category" className="form-label">หมวด</label>
          <select id="category" className="form-select" value={form.category} onChange={onChange} required>
            <option value="">เลือกหมวด</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <MDBInput
          id="tags"
          label="แท็ก (คั่นด้วย ,)"
          value={form.tags}
          onChange={onChange}
          placeholder="เช่น ไฮโดร, ปลูกในบ้าน"
        />

        {err && <div className="text-danger">{err}</div>}

        <div>
          <MDBBtn type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </MDBBtn>
        </div>
      </form>
    </div>
  );
}
