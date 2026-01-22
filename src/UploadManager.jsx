import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Progress,
  List,
  Typography,
  Input,
  message,
  AutoComplete,
  Upload,
  Card,
  Row,
  Col,
  Grid,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import axios from './axios-config';

// --- DND KIT IMPORTS ---
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MenuLink from './MenuLink';

const { Text } = Typography;
const { useBreakpoint } = Grid; 

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

// --- UTILS ---
function cleanFilename(name) {
  const isVideo = VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
  if (isVideo) return name;
  return name.replace(/\s*\(\d+\)\s*/g, '').replace(/\.[^/.]+$/, '');
}

// --- COMPONENT CON: SORTABLE ITEM ---
const SortableItem = ({ fileObj, index, onNameChange, onDelete, onAddMore, progress }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fileObj.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#fafafa' : 'transparent',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', paddingLeft: 40 }}
        actions={[
          <Upload 
            key="add-mini"
            multiple 
            showUploadList={false} 
            beforeUpload={(file) => { onAddMore(file); return false; }}
          >
             <Button type="text" icon={<PlusCircleOutlined style={{ fontSize: '18px', color: '#1890ff' }} />} size="small" />
          </Upload>,
          <Button 
            key="delete"
            type="text"
            icon={<DeleteOutlined style={{ fontSize: '18px', color: 'red' }} />}
            onClick={() => onDelete(index)}
            size="small"
          />
        ]}
      >
        <div {...attributes} {...listeners} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'grab', padding: 5, color: '#999' }}>
          <HolderOutlined style={{ fontSize: '18px' }} />
        </div>
        <Input value={fileObj.customName} onChange={(e) => onNameChange(index, e.target.value)} size="small" />
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">{fileObj.name} ({Math.round(fileObj.size / 1024)} KB)</Text>
        </div>
        <Progress percent={progress || 0} size="small" />
      </List.Item>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function MultiFileUploader() {
  const screens = useBreakpoint(); 
  const isMobile = !screens.md; 

  const [fileList, setFileList] = useState([]);
  const [eventId, setEventId] = useState('');
  const [uploadKey, setUploadKey] = useState(0);
  const [progressMap, setProgressMap] = useState({});
  const [uploading, setUploading] = useState(false);
  const [url, setURL] = useState(undefined);
  const [urlEdit, setURLEdit] = useState(undefined);
  const [eventOptions, setEventOptions] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 1. Hàm xử lý khi chọn file
  const handleAddFiles = (filesInput) => {
    const newFiles = filesInput instanceof File ? [filesInput] : filesInput;
    const formatted = Array.from(newFiles).map((f) => ({
      id: f.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      size: f.size,
      file: f,
      customName: cleanFilename(f.name),
    }));
    
    setTimeout(() => {
      setFileList((prev) => [...prev, ...formatted]);
      setProgressMap({});
    }, 0);
  };

  const handleNameChange = (index, newName) => {
    setFileList((prev) => {
      const newList = [...prev];
      newList[index].customName = newName;
      return newList;
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFileList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => { fetcEventData(); }, []);

  const fetcEventData = async () => {
    try {
      const response = await axios.get(`/events`);
      setEventOptions(
        response.data.map((item) => ({
           value: item.id,
           label: item.g_name ? `${item.name} ( ${item.g_name} ) - ${item.gameName}` : `${item.name} - ${item.gameName}`,
           event_id: item.gallery_id,
           post_slug: item.post_slug,
        }))
      );
    } catch (err) { console.error('❌ GET error:', err); }
  };

  const clearAll = () => {
    setFileList([]);
    setProgressMap({});
    setUploadKey((k) => k + 1);
    setUploading(false);
  };

  // --- 2. HÀM CORE: UPLOAD 1 CHUNK CÓ RETRY ---
  const uploadChunkWithRetry = async (formData, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await axios.post('/upload', formData, {
          timeout: 600000, // 10 phút timeout
          onUploadProgress: () => {}, 
        });
        return; 
      } catch (err) {
        if (i === maxRetries - 1) throw err; // Hết lượt retry thì báo lỗi
        console.log(`Retrying chunk... (${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, 1000)); // Đợi 1s trước khi thử lại
      }
    }
  };

  // --- 3. HÀM CORE: XỬ LÝ 1 FILE (Chia chunk & upload song song 3 chunk) ---
  const processSingleFile = async (fileObj, index, totalFilesCnt) => {
    const file = fileObj.file;
    const filename = fileObj.customName;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // Tạo ID duy nhất tránh trùng lặp
    const identifier = `${file.size}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
    const safeFilename = filename.trim() === '' ? file.name : filename;
    const safeOrder = totalFilesCnt + index;

    const chunksData = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('flowChunkNumber', i + 1);
      formData.append('flowChunkSize', CHUNK_SIZE);
      formData.append('flowCurrentChunkSize', chunk.size);
      formData.append('flowTotalSize', file.size);
      formData.append('flowIdentifier', identifier);
      formData.append('flowFilename', safeFilename);
      formData.append('flowRelativePath', file.name);
      formData.append('flowTotalChunks', totalChunks);
      formData.append('relate', 'gallery_version');
      formData.append('id', eventId);
      formData.append('order_index', safeOrder);
      formData.append('file', chunk);

      chunksData.push(formData);
    }

    let completed = 0;
    
    // Batching Chunk: Chỉ upload 3 chunk cùng lúc
    const CHUNK_BATCH_SIZE = 5; 
    
    for (let i = 0; i < chunksData.length; i += CHUNK_BATCH_SIZE) {
       const batch = chunksData.slice(i, i + CHUNK_BATCH_SIZE);
       
       // Gọi hàm uploadChunkWithRetry ở đây
       await Promise.all(batch.map(formData => 
           uploadChunkWithRetry(formData).then(() => {
               completed++;
               setProgressMap((prev) => ({ 
                   ...prev, 
                   [file.name]: Math.round((completed / totalChunks) * 100) 
               }));
           })
       ));
    }
    setProgressMap((prev) => ({ ...prev, [file.name]: 100 }));
  };

  // --- 4. HÀM CORE: UPLOAD TẤT CẢ FILE (Chia nhóm 3 file song song) ---
  const uploadFiles = async () => {
    if (!eventId) {
      message.warning('Vui lòng nhập hoặc chọn Event ID trước.');
      return;
    }

    setUploading(true);

    let currentServerFileCount = 0;
    try {
      const response = await axios.post(`/getInfo`, { event_id: eventId });
      currentServerFileCount = response.data.result.gallery.length + 1;
      // setURL(`https://my.liquidandgrit.com/library/gallery/${response.data.result.post_slug}`);
    } catch (err) {
      message.error("❌ GET error:", err);
      setUploading(false);
      return;
    }

    // CẤU HÌNH: Upload 3 file cùng lúc
    const MAX_PARALLEL_FILES = 3; 
    
    for (let i = 0; i < fileList.length; i += MAX_PARALLEL_FILES) {
        const fileBatch = fileList.slice(i, i + MAX_PARALLEL_FILES);
        
        await Promise.all(fileBatch.map((fileObj, batchIndex) => {
            return processSingleFile(fileObj, i + batchIndex, currentServerFileCount);
        }));
    }

    setUploading(false);
    message.success('Tải lên hoàn tất!');
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20, width: '100%' }}>
       <MenuLink activeKey="upload" />
      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <div style={{ marginBottom: 12 }}>
                  <AutoComplete
                    options={eventOptions}
                    value={eventId}
                    onChange={(val, option) => {setEventId(option?.event_id || val)
                      setURLEdit(option && option.event_id ? `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${option.event_id}` : undefined);
                      setURL(option && option.post_slug ? `https://my.liquidandgrit.com/library/gallery/${option.post_slug}` : undefined);
                    }}
                    placeholder="Nhập hoặc chọn Event ID"
                    style={{ width: '100%' }}
                    allowClear
                    filterOption={(inputValue, option) => {
                        const val = option?.event_id?.toString().toLowerCase() || '';
                        const label = option?.label?.toLowerCase() || '';
                        return val.includes(inputValue.toLowerCase()) || label.includes(inputValue.toLowerCase());
                     }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button danger onClick={clearAll} disabled={fileList.length === 0} size="small">Clear All</Button>
                    {urlEdit && <a href={urlEdit} target="_blank" rel="noopener noreferrer">Edit Gallery</a>}
                    {url && <a href={url} target="_blank" rel="noopener noreferrer">Xem Gallery</a>}
                </div>
             </Card>

             {fileList.length === 0 && (
                <Upload.Dragger
                    multiple
                    showUploadList={false}
                    beforeUpload={(file) => { handleAddFiles([file]); return false; }}
                    style={{ padding: 20, background: '#fff' }}
                >
                    <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                    <p>Bấm hoặc kéo ảnh vào đây</p>
                </Upload.Dragger>
             )}

             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fileList.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <List
                  bordered
                  dataSource={fileList}
                  style={{ background: '#fff' }}
                  renderItem={(fileObj, index) => (
                    <SortableItem
                      key={fileObj.id}
                      fileObj={fileObj}
                      index={index}
                      progress={progressMap[fileObj.name]}
                      onNameChange={handleNameChange}
                      onAddMore={(file) => handleAddFiles(file)}
                      onDelete={(idx) => setFileList((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  )}
                />
              </SortableContext>
            </DndContext>

            <Button type="primary" onClick={uploadFiles} disabled={fileList.length === 0 || uploading} block size="large">
                Save All {fileList.length > 0 && `(${fileList.length})`}
            </Button>
          </div>
        </Col>

        {!isMobile && (
            <Col md={8}>
            <div style={{ position: 'sticky', top: 20, zIndex: 10 }}>
                <Card title="Kéo thả ảnh" size="small">
                    <Upload.Dragger
                        key={uploadKey}
                        multiple
                        height={400} 
                        showUploadList={false}
                        beforeUpload={(file) => { handleAddFiles([file]); return false; }}
                    >
                        <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} /></p>
                        <p>Kéo & thả file</p>
                    </Upload.Dragger>
                </Card>
            </div>
            </Col>
        )}
      </Row>
    </div>
  );
}