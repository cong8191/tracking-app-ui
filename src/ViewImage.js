import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dayjs from "dayjs";
import { 
  Row, Col, Typography, Empty, Button, 
  Card, Spin, message, Select, Tag, Badge, Modal, Input 
} from "antd";
import { useParams, useSearchParams } from "react-router-dom"; 
import { 
  ReloadOutlined, 
  CalendarOutlined, 
  PictureOutlined, 
  DownOutlined, 
  UpOutlined,
  EyeOutlined,
  FolderOutlined,
  EditOutlined,
  CloudUploadOutlined
} from "@ant-design/icons";
import axios from './axios-config';

// Lightbox & Plugins
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const { Text, Title } = Typography;

// --- Helper Functions ---
const getFileExt = (url) => {
  if (!url) return "";
  return url.split(/[#?]/)[0].split('.').pop().trim().toLowerCase();
};

const isVideo = (ext, assetType) => {
  if (assetType === 'video') return true;
  return ["mp4", "mov", "webm", "ogg"].includes(ext);
};

const currentDate = dayjs();

// --- Subcomponent: Lazy Loaded Image Card Content ---
const LazyMedia = ({ item, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ext = getFileExt(item.url);
  const isVid = isVideo(ext, item.assetType);

  return (
    <div style={mediaContainerStyle} onClick={onClick}>
      {/* Display Order Tag */}
      {item.displayOrder !== null && item.displayOrder !== undefined && (
        <span style={orderBadgeStyle}>
          #{item.displayOrder}
        </span>
      )}

      {/* Asset Type Tag */}
      {isVid && (
        <Tag color="volcano" style={assetTypeBadgeStyle}>
          VIDEO
        </Tag>
      )}

      {isVid ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
              borderRadius: '4px'
            }}
          />
          <div style={playIconOverlay}>▶</div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!loaded && !error && (
            <div style={{ position: 'absolute' }}>
              <Spin size="small" />
            </div>
          )}
          {error ? (
            <div style={{ color: '#bfbfbf', textAlign: 'center', padding: '8px', fontSize: '11px' }}>
              <PictureOutlined style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }} />
              <span>Không tải được ảnh</span>
            </div>
          ) : (
            <img
              src={item.url}
              alt={item.caption || `media-${item.mediaId}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in'
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// --- Main ViewImage Component ---
const ViewImage = ({ gallery_id, url, reskinName }) => {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Xác định tham số gallery_id
  const targetGalleryId = useMemo(() => {
    return gallery_id || searchParams.get('gallery_id') || '';
  }, [gallery_id, searchParams]);

  // Xác định tham số reskin
  const targetReskinParam = useMemo(() => {
    return reskinName || searchParams.get('reskinName') || searchParams.get('reskin') || '';
  }, [reskinName, searchParams]);

  // Xác định URL: ưu tiên url truyền vào -> query params -> fallback theo gallery_id hoặc router params
  const initialUrl = useMemo(() => {
    if (url) return url;
    const fromQuery = searchParams.get('url');
    if (fromQuery) return fromQuery;
    const fallbackId = gallery_id || params.event_id;
    if (fallbackId) {
      if (typeof fallbackId === 'string' && fallbackId.startsWith('http')) return fallbackId;
      return `https://ai.liquidandgrit.com/feature-database/${fallbackId}`;
    }
    return '';
  }, [url, gallery_id, params.event_id, searchParams]);

  const [targetUrl, setTargetUrl] = useState(initialUrl);

  const [apiData, setApiData] = useState({
    releaseId: '',
    hasReskins: false,
    totalMedia: 0,
    reskins: [],
    unassignedMedia: []
  });

  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [activeLightboxReskin, setActiveLightboxReskin] = useState(null);
  const [selectedReskinFilter, setSelectedReskinFilter] = useState('all');

  // State cho Modal Đổi Caption
  const [editModal, setEditModal] = useState({
    open: false,
    item: null,
    reskin: null,
    caption: '',
    saving: false
  });

  // Quản lý đóng/mở từng reskin section
  const [collapsedReskins, setCollapsedReskins] = useState({});

  // Lazy render cho các section reskin để tối ưu hiệu năng trang khi có nhiều dữ liệu
  const [visibleReskinLimit, setVisibleReskinLimit] = useState(6);
  const observer = useRef();

  // Đồng bộ khi initialUrl thay đổi
  useEffect(() => {
    if (initialUrl && initialUrl !== targetUrl) {
      setTargetUrl(initialUrl);
    }
  }, [initialUrl]);

  // Tự động chọn Reskin tương ứng nếu có tham số truyền lên
  useEffect(() => {
    if (!targetReskinParam || !apiData.reskins || apiData.reskins.length === 0) return;

    const query = targetReskinParam.trim().toLowerCase();

    // 1. Tìm chính xác tên reskin
    let matched = apiData.reskins.find(r => r.name && r.name.trim().toLowerCase() === query);

    // 2. Tìm chứa chuỗi con (substring)
    if (!matched) {
      matched = apiData.reskins.find(r => 
        r.name && (r.name.toLowerCase().includes(query) || query.includes(r.name.toLowerCase()))
      );
    }

    // 3. Tìm theo reskinId nếu param là id
    if (!matched) {
      matched = apiData.reskins.find(r => r.reskinId === targetReskinParam);
    }

    if (matched) {
      setSelectedReskinFilter(matched.reskinId);
    }
  }, [apiData.reskins, targetReskinParam]);

  // Gọi API lấy dữ liệu theo url
  const fetchData = useCallback(async (overrideUrl) => {
    const fetchUrl = overrideUrl || targetUrl;
    if (!fetchUrl) {
      message.info("Vui lòng nhập hoặc truyền URL để tải dữ liệu!");
      return;
    }

    try {
      setLoading(true);
      setVisibleReskinLimit(6);

      // Gọi API /getImage truyền param url (GET với fallback POST)
      let res;
      try {
        res = await axios.get('/getImage', { params: { url: fetchUrl } });
      } catch (getErr) {
        if (getErr.response?.status === 404 || getErr.response?.status === 405) {
          res = await axios.post('/getImage', { url: fetchUrl });
        } else {
          throw getErr;
        }
      }

      const result = res.data?.data || res.data?.result || res.data || {};
      
      // Xử lý danh sách reskins
      let reskinsList = Array.isArray(result.reskins) ? result.reskins : [];

      // Nếu có unassignedMedia thì thêm thành 1 nhóm riêng
      if (Array.isArray(result.unassignedMedia) && result.unassignedMedia.length > 0) {
        reskinsList = [
          ...reskinsList,
          {
            reskinId: 'unassigned-media-group',
            name: 'Unassigned Media',
            startedOn: null,
            thumbUrl: null,
            media: result.unassignedMedia
          }
        ];
      }

      // Trường hợp không có reskins mà có allMedia
      if (reskinsList.length === 0 && Array.isArray(result.allMedia) && result.allMedia.length > 0) {
        reskinsList = [
          {
            reskinId: 'all-media-group',
            name: result.releaseId || 'Tất cả ảnh',
            startedOn: null,
            thumbUrl: null,
            media: result.allMedia
          }
        ];
      }

      setApiData({
        releaseId: result.releaseId || fetchUrl.split('/').filter(Boolean).pop() || '',
        hasReskins: result.hasReskins ?? reskinsList.length > 0,
        totalMedia: result.totalMedia || reskinsList.reduce((acc, r) => acc + (r.media?.length || 0), 0),
        reskins: reskinsList,
        unassignedMedia: result.unassignedMedia || []
      });

      document.title = result.releaseId ? `Gallery - ${result.releaseId}` : 'Gallery';
    } catch (error) {
      console.error("API Error (/getImage):", error);
      message.error(error.response?.data?.error || "Lỗi tải dữ liệu ảnh từ API!");
    } finally {
      setLoading(false);
    }
  }, [targetUrl]);

  useEffect(() => {
    if (targetUrl) {
      fetchData(targetUrl);
    }
    return () => { document.title = "React App"; };
  }, [targetUrl]);

  // Lọc và Sắp xếp Reskins & Media theo thứ tự giảm dần
  const processedReskins = useMemo(() => {
    let list = apiData.reskins || [];

    // 1. Lọc theo Reskin cụ thể (nếu chọn từ dropdown hoặc tự động chọn)
    if (selectedReskinFilter && selectedReskinFilter !== 'all') {
      list = list.filter(r => r.reskinId === selectedReskinFilter);
    }

    // 2. Sắp xếp giảm dần:
    // - Media trong mỗi reskin: displayOrder giảm dần
    // - Các reskin: startedOn giảm dần (mới nhất lên đầu)
    const sorted = list.map(r => ({
      ...r,
      media: [...(r.media || [])].sort((a, b) => {
        const orderA = a.displayOrder ?? 0;
        const orderB = b.displayOrder ?? 0;
        return orderB - orderA;
      })
    }));

    sorted.sort((a, b) => {
      const dateA = a.startedOn ? dayjs(a.startedOn).valueOf() : 0;
      const dateB = b.startedOn ? dayjs(b.startedOn).valueOf() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.name || '').localeCompare(a.name || '');
    });

    return sorted;
  }, [apiData.reskins, selectedReskinFilter]);

  // Tổng số media để hiển thị trên Badge
  const totalMediaCount = useMemo(() => {
    return processedReskins.reduce((sum, r) => sum + (r.media?.length || 0), 0);
  }, [processedReskins]);

  // Media của Reskin đang xem Lightbox, sắp xếp TỪ THẤP ĐẾN CAO (displayOrder tăng dần)
  const lightboxMediaList = useMemo(() => {
    if (!activeLightboxReskin || !activeLightboxReskin.media) return [];
    return [...activeLightboxReskin.media].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [activeLightboxReskin]);

  // Slides cho Lightbox: CHỈ XEM CHO CÙNG RESKIN, THỨ TỰ TỪ THẤP ĐẾN CAO
  const slides = useMemo(() => {
    return lightboxMediaList.map(item => {
      const ext = getFileExt(item.url);
      const isVid = isVideo(ext, item.assetType);
      const orderTitle = item.displayOrder !== null && item.displayOrder !== undefined ? `#${item.displayOrder}` : '';
      const mainTitle = item.caption || orderTitle;

      if (isVid) {
        return {
          type: "video",
          title: mainTitle,
          description: activeLightboxReskin?.name ? `Reskin: ${activeLightboxReskin.name}` : undefined,
          sources: [
            {
              src: item.url,
              type: ext === "mov" ? "video/mp4" : `video/${ext || 'mp4'}`
            }
          ]
        };
      }
      return {
        type: "image",
        src: item.url,
        alt: mainTitle,
        title: mainTitle,
        description: activeLightboxReskin?.name ? `Reskin: ${activeLightboxReskin.name}` : undefined
      };
    });
  }, [lightboxMediaList, activeLightboxReskin]);

  // Hàm mở Lightbox cho một reskin cụ thể
  const handleOpenLightbox = (reskin, startIndex = 0) => {
    setActiveLightboxReskin(reskin);
    setLightboxIndex(startIndex);
  };

  // Danh sách reskin hiển thị (Lazy rendering reskin sections)
  const visibleReskins = useMemo(() => {
    return processedReskins.slice(0, visibleReskinLimit);
  }, [processedReskins, visibleReskinLimit]);

  // Observer load thêm reskins khi cuộn tới cuối
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleReskinLimit < processedReskins.length) {
        setVisibleReskinLimit(prev => prev + 6);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, visibleReskinLimit, processedReskins.length]);

  // Toggle thu gọn / mở rộng từng reskin
  const toggleReskinCollapse = (reskinId) => {
    setCollapsedReskins(prev => ({
      ...prev,
      [reskinId]: !prev[reskinId]
    }));
  };

  // Mở modal đổi Caption cho một ảnh
  const handleOpenEditModal = (item, reskin) => {
    setEditModal({
      open: true,
      item,
      reskin,
      caption: item.caption || '',
      saving: false
    });
  };

  // Lưu / Đẩy caption mới lên server
  const handleSaveCaption = async () => {
    if (!editModal.item) return;

    const newCaption = editModal.caption.trim();
    const currentItem = editModal.item;
    const currentReskin = editModal.reskin;

    try {
      setEditModal(prev => ({ ...prev, saving: true }));

      const payload = {
        mediaId: currentItem.mediaId,
        caption: newCaption,
        galleryId: targetGalleryId || '',
        url: targetUrl,
        fileUrl: currentItem.url
      };

      const res = await axios.post('/update-caption', payload);

      if (res.data?.success) {
        // 1. Cập nhật ngay lập tức vào state apiData để UI phản hồi tức thì
        setApiData(prev => {
          const updatedReskins = (prev.reskins || []).map(r => {
            if (r.reskinId === currentReskin?.reskinId || (!currentReskin && r.media?.some(m => m.mediaId === currentItem.mediaId))) {
              return {
                ...r,
                media: (r.media || []).map(m => {
                  if (m.mediaId === currentItem.mediaId) {
                    return { ...m, caption: newCaption };
                  }
                  return m;
                })
              };
            }
            return r;
          });

          const updatedUnassigned = (prev.unassignedMedia || []).map(m => {
            if (m.mediaId === currentItem.mediaId) {
              return { ...m, caption: newCaption };
            }
            return m;
          });

          return {
            ...prev,
            reskins: updatedReskins,
            unassignedMedia: updatedUnassigned
          };
        });

        // 2. Cập nhật activeLightboxReskin nếu đang mở Lightbox
        setActiveLightboxReskin(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            media: (prev.media || []).map(m => {
              if (m.mediaId === currentItem.mediaId) {
                return { ...m, caption: newCaption };
              }
              return m;
            })
          };
        });

        message.success('Đã cập nhật caption thành công!');
        setEditModal(prev => ({ ...prev, open: false, saving: false }));
      } else {
        throw new Error(res.data?.error || 'Không thể lưu caption lên server');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật caption:', err);
      message.error(err.response?.data?.error || err.message || 'Lỗi khi cập nhật caption lên server!');
      setEditModal(prev => ({ ...prev, saving: false }));
    }
  };


  return (
    <div style={{ padding: "8px 6px", background: "#f5f5f5", minHeight: "100vh", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      
      {/* Sticky Header Tinh Gọn */}
      <div style={stickyHeaderWrapper}>
        <div className="filter-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Tiêu đề & Thông tin tổng số */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                <span style={{ color: '#1890ff' }}>{apiData.releaseId || 'Gallery'}</span>
              </Title>
              <Badge 
                count={selectedReskinFilter === 'all' 
                  ? `${totalMediaCount} media / ${processedReskins.length} reskins` 
                  : `${totalMediaCount} media`} 
                style={{ backgroundColor: '#52c41a' }} 
              />
            </div>

            {/* Điều khiển: Dropdown chọn Reskin & Nút Tải lại */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Dropdown Chọn Reskin */}
              <Select
                showSearch
                optionFilterProp="label"
                value={selectedReskinFilter}
                onChange={(val) => setSelectedReskinFilter(val)}
                style={{ minWidth: '240px', maxWidth: '380px' }}
                placeholder="Chọn Reskin để xem"
                options={[
                  { value: 'all', label: `Tất cả Reskin (${apiData.reskins?.length || 0})` },
                  ...(apiData.reskins || []).map(r => ({
                    value: r.reskinId,
                    label: `${r.name || 'Unassigned'} (${r.media?.length || 0})${r.startedOn ? ` - ${r.startedOn}` : ''}`
                  }))
                ]}
              />

              <Button icon={<ReloadOutlined />} onClick={() => fetchData()} loading={loading} title="Tải lại dữ liệu" />
            </div>

          </div>
        </div>
      </div>

      {/* Danh sách các Reskin */}
      <div style={{ marginTop: '10px' }}>
        <Spin spinning={loading && visibleReskins.length === 0} tip="Đang tải dữ liệu từ API..." size="large">
          <div style={{ minHeight: '200px' }}>
            {visibleReskins.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visibleReskins.map((reskin, rIdx) => {
                  const isCollapsed = !!collapsedReskins[reskin.reskinId];
                  const isLastReskin = visibleReskins.length === rIdx + 1;
                  const mediaCount = reskin.media?.length || 0;

                  return (
                    <Card
                      key={reskin.reskinId || `reskin-${rIdx}`}
                      ref={isLastReskin ? lastElementRef : null}
                      className="reskin-card"
                      bodyStyle={{ padding: isCollapsed ? '0px' : '10px 10px 12px 10px' }}
                      style={{
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        border: '1px solid #e8e8e8'
                      }}
                    >
                      {/* Tiêu đề của từng Reskin */}
                      <div 
                        style={reskinHeaderStyle}
                        onClick={() => toggleReskinCollapse(reskin.reskinId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                          <FolderOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                          <Text strong style={{ fontSize: '15px', color: '#1f1f1f' }}>
                            {reskin.name || 'Unassigned'}
                          </Text>

                          {reskin.startedOn && (
                            <Tag color="blue" icon={<CalendarOutlined />} style={{ borderRadius: '4px' }}>
                              {dayjs(reskin.startedOn).format('DD/MM/YYYY')}
                            </Tag>
                          )}

                          <Badge 
                            count={`${mediaCount} item`} 
                            style={{ backgroundColor: mediaCount > 0 ? '#108ee9' : '#d9d9d9' }} 
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {mediaCount > 0 && !isCollapsed && (
                            <Button 
                              type="link" 
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLightbox(reskin, 0); // Bắt đầu từ thấp nhất (thấp đến cao) của reskin này
                              }}
                            >
                              Xem Lightbox
                            </Button>
                          )}
                          <Button 
                            type="text" 
                            size="small" 
                            icon={isCollapsed ? <DownOutlined /> : <UpOutlined />} 
                          />
                        </div>
                      </div>

                      {/* Lưới hình ảnh thuộc Reskin này */}
                      {!isCollapsed && (
                        <div style={{ marginTop: '8px' }}>
                          {mediaCount > 0 ? (
                            <Row gutter={[8, 10]}>
                              {(() => {
                                // Danh sách media của reskin này sắp xếp từ thấp đến cao (để xác định vị trí mở Lightbox)
                                const ascMediaList = [...(reskin.media || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                                return reskin.media.map((item) => {
                                  const itemIdxInAsc = ascMediaList.findIndex(m => m.mediaId === item.mediaId);
                                  const onCardClick = () => handleOpenLightbox(reskin, itemIdxInAsc >= 0 ? itemIdxInAsc : 0);

                                  return (
                                    <Col xs={8} sm={6} md={4} lg={3} xl={3} key={item.mediaId}>
                                      <Card
                                        className="custom-image-card"
                                        hoverable
                                        bodyStyle={{ padding: "6px" }}
                                        cover={
                                          <LazyMedia 
                                            item={item} 
                                            onClick={onCardClick}
                                          />
                                        }
                                        onClick={onCardClick}
                                      >
                                        {/* Footer ảnh: Caption hiển thị (để trống nếu ko có) & Nút sửa Caption */}
                                        <div 
                                          style={{ 
                                            minHeight: '26px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            gap: '4px',
                                            padding: '2px 0'
                                          }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            {item.caption ? (
                                              <Text 
                                                style={{ fontSize: "11px", lineHeight: "1.2", color: '#434343', display: 'block' }} 
                                                ellipsis={{ tooltip: item.caption }}
                                              >
                                                {item.caption}
                                              </Text>
                                            ) : null}
                                          </div>

                                          <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined style={{ fontSize: '13px', color: '#1890ff' }} />}
                                            title="Đổi caption ảnh"
                                            style={{ 
                                              padding: '0 4px', 
                                              height: '22px', 
                                              minWidth: '22px', 
                                              flexShrink: 0, 
                                              borderRadius: '4px' 
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenEditModal(item, reskin);
                                            }}
                                          />
                                        </div>
                                      </Card>
                                    </Col>
                                  );
                                });
                              })()}
                            </Row>
                          ) : (
                            <Empty description="Reskin này chưa có media" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              !loading && <Empty description="Không có dữ liệu media hoặc reskin phù hợp" />
            )}

            {/* Spinner Lazy Load cho Reskins */}
            {visibleReskinLimit < processedReskins.length && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Spin tip={`Đang tải thêm reskin (${visibleReskinLimit}/${processedReskins.length})...`} />
              </div>
            )}
          </div>
        </Spin>
      </div>

      {/* Lightbox Xem Ảnh & Video Toàn Màn Hình - Chỉ cho cùng 1 Reskin, thứ tự từ thấp đến cao */}
      <Lightbox
        index={lightboxIndex}
        open={lightboxIndex >= 0 && slides.length > 0}
        close={() => {
          setLightboxIndex(-1);
          setActiveLightboxReskin(null);
        }}
        slides={slides}
        carousel={{ imageFit: "contain" }}
        plugins={[Thumbnails, Zoom, Video]}
        video={{ autoPlay: true, controls: true }}
        toolbar={{
          buttons: [
            <button
              key="edit-caption-btn"
              type="button"
              className="yarl__button"
              title="Đổi Caption ảnh này"
              onClick={() => {
                const currentMedia = lightboxMediaList[lightboxIndex];
                if (currentMedia) {
                  handleOpenEditModal(currentMedia, activeLightboxReskin);
                }
              }}
            >
              <EditOutlined style={{ fontSize: '20px' }} />
            </button>,
            "close"
          ]
        }}
      />

      {/* Modal Đổi Caption Ảnh & Đẩy Lên Server */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>
              Đổi Caption {editModal.item?.displayOrder !== null && editModal.item?.displayOrder !== undefined ? `#${editModal.item.displayOrder}` : ''}
            </span>
          </div>
        }
        open={editModal.open}
        onCancel={() => !editModal.saving && setEditModal(prev => ({ ...prev, open: false }))}
        destroyOnClose
        zIndex={2000}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setEditModal(prev => ({ ...prev, open: false }))} 
            disabled={editModal.saving}
          >
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            icon={<CloudUploadOutlined />} 
            loading={editModal.saving} 
            onClick={handleSaveCaption}
          >
            Đẩy lên server
          </Button>
        ]}
      >
        {editModal.item && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '6px' }}>
            {/* Xem trước ảnh và thông tin */}
            <div 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                background: '#fafafa', 
                padding: '10px', 
                borderRadius: '6px', 
                border: '1px solid #f0f0f0' 
              }}
            >
              <div 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: '#f0f2f5', 
                  borderRadius: '4px', 
                  overflow: 'hidden', 
                  flexShrink: 0 
                }}
              >
                {isVideo(getFileExt(editModal.item.url), editModal.item.assetType) ? (
                  <video 
                    src={editModal.item.url} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    muted 
                  />
                ) : (
                  <img 
                    src={editModal.item.url} 
                    alt="preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {editModal.item.displayOrder !== null && editModal.item.displayOrder !== undefined && (
                    <Tag color="geekblue" style={{ margin: 0 }}>#{editModal.item.displayOrder}</Tag>
                  )}
                  {editModal.reskin?.name && (
                    <Tag color="cyan" style={{ margin: 0 }}>{editModal.reskin.name}</Tag>
                  )}
                  <Tag 
                    color={isVideo(getFileExt(editModal.item.url), editModal.item.assetType) ? 'volcano' : 'blue'}
                    style={{ margin: 0 }}
                  >
                    {editModal.item.assetType ? editModal.item.assetType.toUpperCase() : 'IMAGE'}
                  </Tag>
                </div>
                {editModal.item.mediaId && (
                  <Text type="secondary" style={{ fontSize: '11px' }} ellipsis={{ tooltip: editModal.item.mediaId }}>
                    ID: {editModal.item.mediaId}
                  </Text>
                )}
              </div>
            </div>

            {/* Ô nhập Caption */}
            <div>
               <Text copyable={{ text: currentDate.format('MM/DD/YY') + ' ' +  editModal.reskin?.name}}>{currentDate.format('MM/DD/YY')} {editModal.reskin?.name}</Text>
              <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>
                Nội dung Caption:
              </div>
              <Input.TextArea
                rows={4}
                value={editModal.caption}
                onChange={(e) => setEditModal(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Nhập caption cho ảnh tại đây..."
                autoFocus
                maxLength={500}
                showCount
              />
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .filter-card {
          background: #fff;
          padding: 10px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .reskin-card {
          transition: box-shadow 0.2s ease;
        }
        .reskin-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        }

        .custom-image-card {
          border-radius: 6px;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .custom-image-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }

        .custom-image-card .ant-card-cover > div {
          height: 240px !important;
        }

        /* Responsive Mobile */
        @media (max-width: 767px) {
          .custom-image-card .ant-card-cover > div {
            height: 160px !important;
          }
          .filter-card { padding: 8px; }
          .ant-typography { font-size: 13px !important; }
        }
      `}</style>
    </div>
  );
};

// --- STYLES ---
const stickyHeaderWrapper = {
  position: "sticky",
  top: 0,
  zIndex: 1000,
  background: "#f5f5f5",
  paddingBottom: "4px",
};

const reskinHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 10px',
  background: '#fafafa',
  borderBottom: '1px solid #f0f0f0',
  cursor: 'pointer',
  borderRadius: '6px'
};

const mediaContainerStyle = {
  position: "relative",
  height: "240px",
  background: "#f0f2f5",
  overflow: 'hidden',
  borderRadius: '4px 4px 0 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  cursor: 'pointer'
};

const orderBadgeStyle = {
  position: "absolute",
  top: "4px",
  left: "4px",
  background: "rgba(0, 0, 0, 0.65)",
  color: "#fff",
  padding: "1px 5px",
  borderRadius: "3px",
  fontSize: "10px",
  fontWeight: "bold",
  zIndex: 2,
  letterSpacing: "0.5px"
};

const assetTypeBadgeStyle = {
  position: "absolute",
  top: "4px",
  right: "4px",
  margin: 0,
  fontSize: "10px",
  padding: "0 4px",
  lineHeight: "16px",
  zIndex: 2
};

const playIconOverlay = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "#fff",
  backgroundColor: "rgba(0,0,0,0.55)",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: 'none',
  zIndex: 3
};

export default ViewImage;
