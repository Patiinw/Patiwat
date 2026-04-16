// client/src/pages/SaladEdit.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import api, { uploadWithProgress, API_BASE } from '../lib/axios';

const USER_TOKEN_KEY = 'userToken';
const ADMIN_TOKEN_KEY = 'adminToken';

const absUrl = (u) =>
  !u
    ? ''
    : /^https?:\/\//i.test(u)
    ? u
    : `${API_BASE.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`;

export default function SaladEdit() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: '',
    tags: '',
  });
  const [categories, setCategories] = useState([]);
  const [bodyHtml, setBodyHtml] = useState('');

  // upload progress
  const [uploadingName, setUploadingName] = useState('');
  const [progress, setProgress] = useState(0);

  // refs
  const quillRef = useRef(null);
  const editorWrapRef = useRef(null);

  // ปุ่ม X ลอยบนรูป
  const [xBtn, setXBtn] = useState({
    show: false,
    top: 0,
    left: 0,
    imgEl: null,
  });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.id]: e.target.value }));
  const onQuillChange = useCallback((html) => setBodyHtml(html), []);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    // ให้สิทธิ์กับ admin ก่อน หากมี adminToken ใช้อันนั้น ไม่งั้นใช้ userToken
    return (
      localStorage.getItem(ADMIN_TOKEN_KEY) ||
      localStorage.getItem(USER_TOKEN_KEY) ||
      null
    );
  };

  // โหลดโพสต์ + หมวดหมู่
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const token = getAuthToken();
        if (!token) {
          if (!alive) return;
          setErr('กรุณาเข้าสู่ระบบ');
          setLoading(false);
          return;
        }

        const [postRes, catsRes] = await Promise.all([
          api.get(`/api/posts/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get('/api/posts', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!alive) return;

        const p = postRes.data;
        setForm({
          title: p.title || '',
          category: p.category || '',
          tags: (p.tags || []).join(', '),
        });
        setBodyHtml(p.body || '');
        setCategories(catsRes.data.categories || []);
      } catch (e) {
        if (!alive) return;
        const status = e?.response?.status;
        if (status === 404) setNotFound(true);
        else if (status === 403) setForbidden(true);
        else if (status === 401) setErr('กรุณาเข้าสู่ระบบ');
        else
          setErr(
            e?.response?.data?.message || 'โหลดโพสต์ไม่สำเร็จ'
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // อัปโหลดรูป -> แทรกใน Quill
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
        if (!url)
          throw new Error('อัปโหลดสำเร็จแต่ไม่ได้รับ URL');

        const quill = quillRef.current?.getEditor?.();
        if (!quill) return;

        const range =
          quill.getSelection(true) || {
            index: quill.getLength(),
            length: 0,
          };
        quill.insertEmbed(range.index, 'image', url, 'user');
        quill.setSelection(range.index + 1, 0, 'user');
      } catch (e) {
        setErr(
          e?.response?.data?.message ||
            e.message ||
            'อัปโหลดรูปไม่สำเร็จ'
        );
      } finally {
        setUploadingName('');
        setProgress(0);
      }
    };

    input.click();
  }, []);

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
              ops: [
                {
                  insert: {
                    image: absUrl(
                      node.getAttribute('src') || ''
                    ),
                  },
                },
              ],
            }),
          ],
        ],
      },
    }),
    [handleQuillImageUpload]
  );

  // โชว์/ซ่อนปุ่ม X ตามตำแหน่งเมาส์บน IMG
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
          left:
            imgRect.left -
            wrapRect.left +
            imgRect.width -
            22 -
            6,
          imgEl: el,
        });
      } else {
        setXBtn((s) =>
          s.show
            ? {
                show: false,
                top: 0,
                left: 0,
                imgEl: null,
              }
            : s
        );
      }
    };

    const onScrollOrResize = () => {
      setXBtn((s) =>
        s.show
          ? {
              show: false,
              top: 0,
              left: 0,
              imgEl: null,
            }
          : s
      );
    };

    root.addEventListener('mousemove', onMouseMove);
    window.addEventListener(
      'scroll',
      onScrollOrResize,
      true
    );
    window.addEventListener(
      'resize',
      onScrollOrResize
    );

    return () => {
      root.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener(
        'scroll',
        onScrollOrResize,
        true
      );
      window.removeEventListener(
        'resize',
        onScrollOrResize
      );
    };
  }, [bodyHtml]);

  // ลบรูปที่ชี้อยู่
  const removeCurrentImage = useCallback(() => {
    const quill = quillRef.current?.getEditor?.();
    const imgEl = xBtn.imgEl;
    if (!quill || !imgEl) return;

    try {
      const Q = quill.constructor;
      const blot = Q.find(imgEl);
      if (blot) {
        const index = quill.getIndex(blot);
        quill.deleteText(index, 1, 'user');
      } else {
        imgEl.remove();
        const htmlNow = quill.root.innerHTML;
        const delta = quill.clipboard.convert(htmlNow);
        quill.setContents(delta, 'user');
      }
    } catch {
      try {
        imgEl.remove();
        const htmlNow = quill.root.innerHTML;
        const delta = quill.clipboard.convert(htmlNow);
        quill.setContents(delta, 'user');
      } catch {
        /* noop */
      }
    } finally {
      setXBtn({
        show: false,
        top: 0,
        left: 0,
        imgEl: null,
      });
      setTimeout(() => {
        try {
          quill.focus();
        } catch {
          /* noop */
        }
      }, 0);
    }
  }, [xBtn.imgEl]);

  const save = async (e) => {
    e.preventDefault();
    setErr('');

    // sync HTML ล่าสุดจาก editor
    try {
      const editor = quillRef.current?.getEditor?.();
      if (editor) setBodyHtml(editor.root.innerHTML);
    } catch {
      /* noop */
    }

    const editor = quillRef.current?.getEditor?.();
    const html =
      (editor?.root?.innerHTML || bodyHtml || '').trim();
    if (!form.title.trim() || !html || !form.category) {
      setErr('กรุณากรอกหัวข้อ เนื้อหา และเลือกหมวด');
      return;
    }
    if (progress > 0 && progress < 100) {
      setErr('กรุณารอให้อัปโหลดรูปเสร็จก่อน');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setErr('กรุณาเข้าสู่ระบบ');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        body: html,
        category: form.category,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      await api.put(`/api/posts/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      nav(`/salad/${id}`, { replace: true });
    } catch (e2) {
      const status = e2?.response?.status;
      if (status === 403)
        setErr('คุณไม่มีสิทธิ์แก้ไขกระทู้นี้');
      else if (status === 404)
        setErr('ไม่พบกระทู้');
      else if (status === 401)
        setErr('กรุณาเข้าสู่ระบบ');
      else
        setErr(
          e2?.response?.data?.message ||
            'บันทึกไม่สำเร็จ'
        );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="container py-4">
        กำลังโหลดกระทู้...
      </div>
    );
  if (notFound)
    return (
      <div className="container py-4 text-danger">
        ไม่พบกระทู้
      </div>
    );
  if (forbidden)
    return (
      <div className="container py-4 text-danger">
        คุณไม่มีสิทธิ์แก้ไขกระทู้นี้
      </div>
    );

  return (
    <div className="py-3">
      <h3 className="mb-3">แก้ไขกระทู้</h3>

      <form
        onSubmit={save}
        className="d-flex flex-column gap-3"
      >
        <MDBInput
          id="title"
          label="หัวข้อ"
          value={form.title}
          onChange={onChange}
          size="lg"
          required
        />

        <div>
          <label
            htmlFor="category"
            className="form-label"
          >
            หมวด
          </label>
          <select
            id="category"
            className="form-select"
            value={form.category}
            onChange={onChange}
            required
          >
            <option value="">เลือกหมวด</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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

        {/* หุ้ม editor เพื่อวางปุ่ม X ลอย */}
        <div
          ref={editorWrapRef}
          style={{ position: 'relative' }}
        >
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
                boxShadow:
                  '0 1px 3px rgba(0,0,0,.25)',
                zIndex: 10,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* แถบสถานะอัปโหลด */}
        {uploadingName && (
          <div className="small">
            <div className="d-flex justify-content-between align-items-center">
              <span>
                กำลังอัปโหลด: {uploadingName}
              </span>
              <span>{progress}%</span>
            </div>
            <div
              className="progress"
              style={{ height: 6 }}
            >
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

        {err && (
          <div className="text-danger">{err}</div>
        )}

        <div className="d-flex gap-2">
          <MDBBtn type="submit" disabled={saving}>
            {saving
              ? 'กำลังบันทึก...'
              : 'บันทึกการแก้ไข'}
          </MDBBtn>
          <MDBBtn
            type="button"
            color="secondary"
            onClick={() => nav(`/salad/${id}`)}
            disabled={saving}
          >
            ยกเลิก
          </MDBBtn>
        </div>
      </form>
    </div>
  );
}
