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
  DatePicker,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusCircleOutlined,
  InboxOutlined,
  SyncOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import axios from './axios-config';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
dayjs.extend(advancedFormat);

// --- DND KIT IMPORTS ---
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy, 
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MenuLink from './MenuLink';

const { Text } = Typography;

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

// --- UTILS ---
function cleanFilename(name) {
  const isVideo = VIDEO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
  if (isVideo) return name;
  if (name.toUpperCase().startsWith('IMG_')) {
    return name;
  }
  return name.replace(/\s*\(\d+\)\s*/g, '').replace(/\.[^/.]+$/, '');
}

// --- COMPONENT CON: SORTABLE ITEM ---
const SortableItem = ({ fileObj, index, onNameChange, onDelete, onAddMore, progress, isFailed, onPasteAtCursor }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fileObj.id });
  const inputRef = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#fafafa' : isFailed ? '#fff2f0' : 'transparent',
    touchAction: 'pan-y', 
  };

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8, 
          position: 'relative', 
          paddingLeft: 40,
          borderLeft: isFailed ? '4px solid #ff4d4f' : 'none' 
        }}
        actions={[
          <Button
            key="paste-action"
            type="text"
            icon={<SnippetsOutlined style={{ fontSize: '18px', color: '#722ed1' }} />}
            onClick={() => onPasteAtCursor(index, inputRef.current)}
            size="small"
            title="Dán vào vị trí con trỏ"
          />,
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
        <div 
          {...attributes} 
          {...listeners} 
          style={{ 
            position: 'absolute', 
            left: 10, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            cursor: 'grab', 
            padding: 5, 
            color: '#999',
            touchAction: 'none'
          }}
        >
          <HolderOutlined style={{ fontSize: '18px' }} />
        </div>
        
        <Input 
          ref={inputRef}
          value={fileObj.customName} 
          onChange={(e) => onNameChange(index, e.target.value)} 
          size="small" 
          allowClear={true} 
          status={isFailed ? 'error' : ''} 
        />

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Text type={isFailed ? 'danger' : 'secondary'}>{fileObj.name} ({Math.round(fileObj.size / 1024)} KB)</Text>
        </div>
        <Progress percent={progress || 0} size="small" status={isFailed ? 'exception' : 'active'} />
      </List.Item>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function MultiFileUploader() {
  const [fileList, setFileList] = useState([]);
  const [eventId, setEventId] = useState('');
  const [progressMap, setProgressMap] = useState({});
  const [uploading, setUploading] = useState(false);
  const [failedFiles, setFailedFiles] = useState([]); 
  const [url, setURL] = useState(undefined);
  const [urlEdit, setURLEdit] = useState(undefined);
  const [eventOptions, setEventOptions] = useState([]);
  const [searchDate, setSearchDate] = useState(dayjs().subtract(1, "day"));
  const [eventName, setEventName] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0); 

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, 
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePasteAtCursor = async (index, inputRefComponent) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const input = inputRefComponent.input;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const content = fileList[index].customName || "";
      const newText = content.substring(0, start) + text + content.substring(end);
      handleNameChange(index, newText);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    } catch (err) {
      message.error("Lỗi Clipboard.");
    }
  };

  const handleAddFiles = (filesInput) => {
    const filesArray = filesInput instanceof File ? [filesInput] : filesInput;
    const formatted = Array.from(filesArray instanceof FileList ? filesArray : filesArray).map((f) => ({
      id: f.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      size: f.size,
      file: f,
      customName: cleanFilename(f.name),
    }));

    setTimeout(() => {
      setFileList((prev) => [...prev, ...formatted]);
      setProgressMap((prev) => {
        const newMap = { ...prev };
        formatted.forEach(f => { if (!newMap[f.name]) newMap[f.name] = 0; });
        return newMap;
      });
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
      setEventOptions(response.data.map((item) => ({
        name: item.name,
        value: item.id,
        label: item.g_name ? `${item.name} ( ${item.g_name} ) - ${item.gameName}` : `${item.name} - ${item.gameName}`,
        event_id: item.gallery_id,
        post_slug: item.post_slug,
      })));
    } catch (err) { console.error('❌ GET error:', err); }
  };

  const clearAll = () => {
    setFileList([]);
    setProgressMap({});
    setFailedFiles([]);
    setUploading(false);
  };

  const uploadChunkWithRetry = async (formData, maxRetries = 3) => {
    const shouldRetry = (error) => (!error.response || error.response.status >= 500);
    for (let i = 0; i < maxRetries; i++) {
      const controller = new AbortController();
      try {
        const response = await axios.post('/upload', formData, {
          timeout: 600000, 
          signal: controller.signal, 
        });
        return response; 
      } catch (err) {
        controller.abort();
        if (i === maxRetries - 1 || !shouldRetry(err)) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };

  const processSingleFile = async (fileObj, index, totalFilesCnt) => {
    const file = fileObj.file;
    const filename = fileObj.customName;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
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
      formData.append('flowFilename', file.name);
      formData.append('flowRelativePath', file.name);
      formData.append('flowTotalChunks', totalChunks);
      formData.append('relate', 'gallery_version');
      formData.append('id', eventId);
      formData.append('order_index', safeOrder);
      formData.append('file', chunk);
      formData.append('customFilename', safeFilename);
      if (i === totalChunks - 1) formData.append('isLastChunk', 'true');
      chunksData.push(formData);
    }

    let completed = 0;
    const CHUNK_BATCH_SIZE = 5; 
    for (let i = 0; i < chunksData.length; i += CHUNK_BATCH_SIZE) {
      const batch = chunksData.slice(i, i + CHUNK_BATCH_SIZE);
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
    setFailedFiles(prev => prev.filter(id => id !== fileObj.id));
  };

  const uploadFiles = async (retryOnly = false) => {
    if (!eventId) { message.warning('Vui lòng chọn Event ID.'); return; }
    const targets = retryOnly ? fileList.filter(f => failedFiles.includes(f.id)) : fileList;
    if (targets.length === 0) return;

    setUploading(true);
    try {
      const response = await axios.post(`/getInfo`, { event_id: eventId });
      const currentServerFileCount = response.data.result.gallery.length + 1;
      const MAX_PARALLEL_FILES = 4; 

      for (let i = 0; i < targets.length; i += MAX_PARALLEL_FILES) {
        const fileBatch = targets.slice(i, i + MAX_PARALLEL_FILES);
        const results = await Promise.allSettled(fileBatch.map((f, idx) => processSingleFile(f, i + idx, currentServerFileCount)));
        results.forEach((res, idx) => {
          if (res.status === 'rejected') setFailedFiles(prev => [...new Set([...prev, fileBatch[idx].id])]);
        });
      }
    } catch (err) { message.error("Lỗi server."); }
    setUploading(false);
    if (failedFiles.length === 0) message.success('Hoàn tất!');
  };

  const handleDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length > 0) setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length > 0) handleAddFiles(e.dataTransfer.files);
  };

  const currentDate = dayjs();

  return (
    <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} 
         onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
         style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      
      {isDraggingFile && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(24, 144, 255, 0.1)', border: '3px dashed #1890ff', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <InboxOutlined style={{ fontSize: 80, color: '#1890ff' }} />
          <Typography.Title level={3} style={{ color: '#1890ff', marginTop: 20 }}>Thả file để upload</Typography.Title>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20, width: '100%' }}>
        <MenuLink activeKey="upload" />

        <Row gutter={[24, 24]}>
          <Col span={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {failedFiles.length > 0 && !uploading && (
                <Alert message={`Lỗi ở ${failedFiles.length} file.`} type="error" showIcon action={<Button size="small" danger icon={<SyncOutlined />} onClick={() => uploadFiles(true)}>Retry</Button>} />
              )}

              {/* Phần hiển thị Ngày tháng */}
              <div style={{ margin: '10px 0 20px 0', textAlign: 'center' }}>
                <div>
                  <span style={{ display: 'inline-block', width: '101px' }}>Current Date: </span>
                  <span> | </span>
                  <Text copyable={{ text: currentDate.format('MMMM D, YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentDate.format('MMMM D, YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: currentDate.format('MMMM Do YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentDate.format('MMMM Do YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: currentDate.format('M/D/YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentDate.format('M/D/YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: currentDate.format('M-D-YY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentDate.format('M-D-YY')}</Text>
                </div>
                <div>
                  <DatePicker format="YYYY/MM/DD" style={{ width: '105px', padding: '2px 5px' }} value={searchDate} onChange={(date) => { setSearchDate(date); }} />
                  <span> | </span>
                  <Text copyable={{ text: searchDate.format('MMMM D, YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{searchDate.format('MMMM D, YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: searchDate.format('MMMM Do YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{searchDate.format('MMMM Do YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: searchDate.format('M/D/YYYY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{searchDate.format('M/D/YYYY')}</Text>
                  <span> | </span>
                  <Text copyable={{ text: currentDate.format('M-D-YY') }} style={{ fontSize: '16px', fontWeight: 'bold' }}>{searchDate.format('M-D-YY')}</Text>
                </div>
              </div>

              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <div style={{ marginBottom: 12 }}>
                  <AutoComplete options={eventOptions} value={eventId} style={{ width: '100%' }} placeholder="Nhập hoặc chọn Event ID"
                    onChange={(val, opt) => { setEventId(opt?.event_id || val); setURLEdit(opt?.event_id ? `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${opt.event_id}` : undefined); setURL(opt?.post_slug ? `https://my.liquidandgrit.com/library/gallery/${opt.post_slug}` : undefined); setEventName(opt?.name); }}
                    filterOption={(input, opt) => (opt?.event_id?.toString().toLowerCase().includes(input.toLowerCase()) || opt?.label?.toLowerCase().includes(input.toLowerCase()))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button danger onClick={clearAll} disabled={fileList.length === 0} size="small">Clear All</Button>
                  {urlEdit && <a href={urlEdit} target="_blank" rel="noopener noreferrer">Edit Gallery</a>}
                  {url && <a href={url} target="_blank" rel="noopener noreferrer">Xem Gallery</a>}
                  <Text copyable={{ text: eventName || '' }} strong>{eventName || ''}</Text>
                </div>
              </Card>

              {/* Ô UPLOAD TO CHUẨN (KHÔI PHỤC THEO HÌNH 3) */}
              {fileList.length === 0 && (
                <Upload
                  multiple
                  showUploadList={false}
                  beforeUpload={(file) => { handleAddFiles([file]); return false; }}
                  className="full-width-upload"
                >
                  <div style={{ 
                    height: 100, 
                    width: '100%', // Dùng 100% để rộng ngang đúng như hình 3
                    border: '2px dashed #d9d9d9', 
                    borderRadius: '8px', 
                    backgroundColor: '#fafafa', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    cursor: 'pointer' 
                  }}>
                    <UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <p style={{ marginTop: 5, fontSize: 16 }}>Click để chọn file</p>
                  </div>
                </Upload>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fileList.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <List bordered dataSource={fileList} style={{ background: '#fff' }} renderItem={(fileObj, index) => (
                    <SortableItem key={fileObj.id} fileObj={fileObj} index={index} progress={progressMap[fileObj.name]} isFailed={failedFiles.includes(fileObj.id)} onNameChange={handleNameChange} onAddMore={handleAddFiles} onDelete={(idx) => setFileList((prev) => prev.filter((_, i) => i !== idx))} onPasteAtCursor={handlePasteAtCursor} />
                  )} />
                </SortableContext>
              </DndContext>

              <Button type="primary" onClick={() => uploadFiles(false)} disabled={fileList.length === 0 || uploading} block size="large" loading={uploading}>
                Save All {fileList.length > 0 && `(${fileList.length})`}
              </Button>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}