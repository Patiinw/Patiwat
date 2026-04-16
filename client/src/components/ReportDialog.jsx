// client/src/components/ReportDialog.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

const OPTIONS = [
  { value: 'spam', label: 'สแปม' },
  { value: 'abuse', label: 'คำหยาบคาย/ดูหมิ่น' },
  { value: 'inappropriate', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'ads', label: 'โฆษณา/เชิญชวน' },
  { value: 'illegal', label: 'ผิดกฎหมาย' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function ReportDialog({ open, onClose, onSubmit, title='เลือกเหตุผลการรายงาน' }) {
  const [reason, setReason] = useState('spam');
  const [note, setNote]     = useState('');

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault();
    if (!reason) return;
    await onSubmit?.({ reason, note });
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,.45)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="list-group mb-3">
              {OPTIONS.map(opt => (
                <label key={opt.value} className="list-group-item d-flex align-items-center gap-2">
                  <input
                    type="radio"
                    name="reportReason"
                    className="form-check-input"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={() => setReason(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <label className="form-label">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
            <textarea
              className="form-control"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติมได้ที่นี่ (ถ้าต้องการ)"
            />
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={submit}>ส่งรายงาน</button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReportDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  title: PropTypes.string,
};
