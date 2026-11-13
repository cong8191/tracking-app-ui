import { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  List,
  message,
  Modal,
  Row,
  Select,
  Tag,
} from 'antd';
import {
  ExpandOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from './axios-config';
import MenuLink from './MenuLink';
import ViewImage from './ViewImage';

export default function MediaActions() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'image' | 'video'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewImageModal, setViewImageModal] = useState({ open: false, galleryId: null, url: null, post_slug: null, reskinName: null });

  const loadMediaActions = useCallback(async (dateVal, typeVal, showToast = false) => {
    if (!dateVal) return;
    setLoading(true);
    try {
      const dateStr = dayjs(dateVal).format('YYYY-MM-DD');
      const res = await axios.get('/media-actions', {
        params: {
          date: dateStr,
          type: typeVal || 'all',
        },
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setItems(data);
      if (showToast) {
        message.success(`Đã tải ${data.length} action.`);
      }
    } catch (err) {
      console.error('❌ Lỗi tải danh sách action media:', err);
      message.error(`Lỗi tải dữ liệu: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMediaActions(selectedDate, selectedType);
  }, [selectedDate, selectedType, loadMediaActions]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <MenuLink activeKey="media-actions" />

      {/* Bộ lọc Date & Type */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[16, 12]} align="bottom">
          <Col xs={24} sm={12} md={9}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
              📅 Chọn Date
            </div>
            <DatePicker
              style={{ width: '100%' }}
              value={selectedDate}
              onChange={(date) => {
                if (date) setSelectedDate(date);
              }}
              format="YYYY/MM/DD"
            />
          </Col>

          <Col xs={24} sm={12} md={9}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
              🖼 Chọn Type
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              options={[
                { value: 'all', label: 'Tất cả (Image & Img/Video)' },
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Img/Video' },
              ]}
            />
          </Col>

          <Col xs={24} md={6}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => loadMediaActions(selectedDate, selectedType, true)}
              loading={loading}
              block
              style={{ fontWeight: 600 }}
            >
              Tải danh sách
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Danh sách Action theo Date & Type (Style giống CreateNew / Check) */}
      <List
        bordered
        loading={loading}
        style={{ marginTop: 20, backgroundColor: '#ffffff' }}
        header={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
              Danh sách Action Image/Video ({items.length})
            </span>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => loadMediaActions(selectedDate, selectedType, true)}
              loading={loading}
              style={{ color: '#2563eb', fontWeight: 500 }}
            >
              Load lại danh sách
            </Button>
          </div>
        }
        locale={{
          emptyText: 'Không có action nào (image / video) trong ngày đã chọn.',
        }}
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              padding: '12px 16px',
              gap: '12px 20px',
            }}
          >
            {/* BÊN TAY TRÁI: Tên Event + Game + Type + Khoảng ngày */}
            <div
              style={{
                flex: '1 1 220px',
                minWidth: 0,
                paddingTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                wordBreak: 'break-word',
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.name}</span>
              {item.game_name && (
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  {item.game_name}
                </Tag>
              )}
              <Tag color={item.type === 'video' ? 'purple' : 'cyan'} style={{ marginInlineEnd: 0 }}>
                {item.type === 'video' ? 'Img/Video' : 'Image'}
              </Tag>
              {(item.from || item.to) && (
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  ({item.from || ''}{item.to && item.to !== item.from ? ` - ${item.to}` : ''})
                </span>
              )}
            </div>

            {/* BÊN TAY PHẢI: Gallery ID màu đỏ + Icon Xem ảnh & Mở CMS */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '150px',
                maxWidth: '100%',
                marginLeft: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  padding: '4px 0',
                }}
              >
                <span
                  style={{
                    color: 'red',
                    fontSize: '12px',
                    fontWeight: '500',
                    wordBreak: 'break-word',
                    cursor: item.gallery_id ? 'pointer' : 'default',
                  }}
                  title={item.gallery_id ? `Click để copy ID: ${item.gallery_id}` : 'Chưa có ID'}
                  onClick={() => {
                    if (item.gallery_id) {
                      navigator.clipboard?.writeText(item.gallery_id);
                      message.success('Đã copy ID!');
                    }
                  }}
                >
                  {item.gallery_id || 'ID'}
                </span>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <Button
                    type="text"
                    size="small"
                    disabled={!item.gallery_id}
                    icon={<ExpandOutlined />}
                    onClick={() => {
                      if (item.gallery_id || item.post_slug || item.url) {
                        const postSlug = item.post_slug || item.postSlug;
                        const targetUrl = postSlug ? `https://ai.liquidandgrit.com/feature-database/${postSlug}` : (item.url || '');
                        setViewImageModal({ 
                          open: true, 
                          galleryId: item.gallery_id, 
                          url: targetUrl, 
                          post_slug: postSlug,
                          reskinName: item.name || item.title 
                        });
                      }
                    }}
                    title="Xem ảnh gallery"
                  />
                  <Button
                    type="text"
                    size="small"
                    disabled={!item.url}
                    icon={<EyeOutlined />}
                    onClick={() => {
                      if (item.url) {
                        window.open(item.url, '_blank');
                      }
                    }}
                    title={item.url ? 'Mở gallery CMS' : 'Chưa có link CMS'}
                  />
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />

      {/* Modal Xem Ảnh Gallery Chuẩn Mobile */}
      <Modal
        open={viewImageModal.open}
        onCancel={() => setViewImageModal({ open: false, galleryId: null, url: null, post_slug: null, reskinName: null })}
        width="95vw"
        style={{ maxWidth: '95vw', top: 10 }}
        footer={null}
        destroyOnClose
      >
        {viewImageModal.open && (
          <ViewImage 
            gallery_id={viewImageModal.galleryId} 
            url={viewImageModal.url}
            reskinName={viewImageModal.reskinName}
          />
        )}
      </Modal>
    </div>
  );
}
