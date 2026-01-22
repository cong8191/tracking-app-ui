import React, { useState } from 'react';
import { Button, Upload, message, List, Typography, Spin } from 'antd';
import { UploadOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons';
import axios from './axios-config';

const { Text } = Typography;

export default function SQLiteFileUploader() {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleUpload = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('sqlite_file', file);

    try {
      const response = await axios.post('/upload-sqlite', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        message.success(`Tải lên thành công: ${file.name}`);
      } else {
        message.error('Tải lên thất bại');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi mạng khi tải lên');
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file) => {
    if (!file.name.endsWith('.sqlite') && !file.name.endsWith('.db')) {
      message.error('Chỉ chấp nhận file .sqlite hoặc .db');
      return false;
    }
    setFileList([file]);
    handleUpload(file);
    return false;
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await axios.get('/template-sqlite.db', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_game_db.sqlite');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      message.error('Tải file mẫu thất bại');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ width: 500, margin: '0 auto', padding: 20 }}>
      <h3>Tải lên file SQLite</h3>

      <Upload
        beforeUpload={beforeUpload}
        showUploadList={false}
        accept=".sqlite,.db"
        disabled={uploading}
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          {uploading ? 'Đang tải lên...' : 'Chọn file SQLite'}
        </Button>
      </Upload>

      <div style={{ marginTop: 24 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={downloadTemplate}
          loading={downloading}
        >
          {downloading ? 'Đang tải xuống...' : 'Tải file mẫu'}
        </Button>
      </div>
    </div>
  );
}
