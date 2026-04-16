/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { NotificationService } from "../../lib/axios";

export default function AdminNotification() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendBroadcast = async () => {
    try {
      await NotificationService.broadcast({
        title,
        message,
        type: "warning"
      });

      alert('ส่งแจ้งเตือนสำเร็จ');
      setTitle('');
      setMessage('');
    } catch (e) {
      alert('ส่งไม่สำเร็จ');
    }
  };

  return (
    <div className="p-3">
      <h3>ส่งแจ้งเตือนถึงผู้ใช้ทั้งหมด</h3>

      <input
        className="form-control mb-2"
        placeholder="หัวข้อ"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="form-control mb-2"
        placeholder="ข้อความ"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button className="btn btn-danger" onClick={sendBroadcast}>
        ส่งแจ้งเตือน
      </button>
    </div>
  );
}