import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Theme Snow phổ biến

const MobileEditor = () => {
  const [value, setValue] = useState('');

  // Cấu hình Toolbar rút gọn cho Mobile
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean'] 
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link', 'image'
  ];

  const handleSave = () => {
    console.log("Nội dung lưu lại:", value);
    alert("Đã lưu thành công!");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Mobile Editor</h3>
        <button onClick={handleSave} style={styles.saveBtn}>Lưu</button>
      </div>
      
      <div style={styles.editorWrapper}>
        <ReactQuill 
          theme="snow"
          value={value}
          onChange={setValue}
          modules={modules}
          formats={formats}
          placeholder="Nhập nội dung tại đây..."
          style={styles.quill}
        />
      </div>
    </div>
  );
};

// CSS Inline để tối ưu giao diện mobile
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh', // Full màn hình điện thoại
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    borderBottom: '1px solid #ddd',
  },
  saveBtn: {
    padding: '8px 15px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px'
  },
  editorWrapper: {
    flex: 1,
    overflowY: 'auto', // Cho phép cuộn nếu nội dung dài
  },
  quill: {
    height: 'calc(100% - 42px)', // Trừ đi chiều cao của toolbar Quill
    display: 'flex',
    flexDirection: 'column'
  }
};

export default MobileEditor;