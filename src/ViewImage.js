import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dayjs from "dayjs";
import { Row, Col, DatePicker, Typography, Empty, Button, Space, Card, Spin, message, Modal } from "antd";
import { useParams } from "react-router-dom"; 
import { DeleteOutlined, QuestionCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from './axios-config';

// Lightbox & Plugins
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const { Text, Title } = Typography;

const ViewImage = () => {
  const { event_id } = useParams();
  const [apiData, setApiData] = useState({ gallery: [] });
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(-1);
  const [startDate, setStartDate] = useState(dayjs().subtract(2, "day"));
  const [galleryName, setGalleryName] = useState("");

  // --- LOGIC INFINITE SCROLL ---
  const [displayLimit, setDisplayLimit] = useState(24);
  const observer = useRef();

  const getFileExt = (url) => {
    if (!url) return "";
    return url.split(/[#?]/)[0].split('.').pop().trim().toLowerCase();
  };

  const isVideo = (ext) => ["mp4", "mov", "webm", "ogg"].includes(ext);

  const { filteredData, visibleData } = useMemo(() => {
    const list = apiData?.gallery || [];
    let filtered = list;

    if (startDate) {
      const startOfSelectedDate = startDate.startOf("day");
      filtered = list.filter((item) => {
        const itemDate = dayjs.unix(Number(item.small_added));
        return itemDate.isAfter(startOfSelectedDate) || itemDate.isSame(startOfSelectedDate, "day");
      });
    }

    const visible = filtered.slice(0, displayLimit);

    return { 
      filteredData: filtered, 
      visibleData: visible 
    };
  }, [apiData, startDate, displayLimit]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayLimit < filteredData.length) {
        setDisplayLimit(prev => prev + 24);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, displayLimit, filteredData.length]); 

  const fetchData = async () => {
    try {
      setLoading(true);
      setDisplayLimit(24);
      setApiData({ gallery: [] }); 

      const response = await axios.post(`/vewImage`, { event_id });
      const resultData = response.data.result || { gallery: [] };
      
      const list = [...(resultData?.gallery || [])].reverse();
      resultData.gallery  = list;

      if(list.length > 0) {
      const lastDate = dayjs.unix(Number(list[0].small_added));
      setStartDate(lastDate);
      }

      setApiData({ ...resultData });
      setGalleryName(resultData.gallery_name || '');
      document.title = resultData.gallery_name || 'Gallery';
      
    } catch (error) {
      console.error("API Error:", error);
      message.error("Lỗi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (event_id) fetchData();
    return () => { document.title = "React App"; };
  }, [event_id]);

  const handleDeleteImage = (item) => {
    Modal.confirm({
      title: 'Xác nhận xóa?',
      icon: <QuestionCircleOutlined style={{ color: 'red' }} />,
      content: `Bạn có chắc chắn muốn xóa "${item.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          message.loading({ content: 'Đang xử lý xóa...', key: 'del_task' });
          await axios.post(`/delete_file`, { gallery_id: event_id, file: item });
          setApiData(prev => ({
            ...prev,
            gallery: prev.gallery.filter(g => g.id !== item.id)
          }));
          message.success({ content: 'Đã xóa thành công!', key: 'del_task', duration: 2 });
        } catch (error) {
          message.error({ content: 'Lỗi khi xóa ảnh!', key: 'del_task' });
        }
      },
    });
  };

  const slides = useMemo(() => {
    return filteredData.map((item) => {
      const ext = getFileExt(item.file_url);
      const videoStatus = isVideo(ext);
      return {
        src: item.large,
        alt: item.name,
        thumbnail: item.small,
        type: videoStatus ? "video" : "image",
        ...(videoStatus && {
          sources: [{ 
            src: item.file_url, 
            type: ext === "mov" ? "video/mp4" : `video/${ext}` 
          }]
        })
      };
    });
  }, [filteredData]);

  return (
    <div style={{ padding: "10px", background: "#f5f5f5", minHeight: "100vh" }}>
      
      {/* Sticky Header Tối ưu cho Mobile */}
      <div style={stickyHeaderWrapper}>
        <div className="filter-card">
          <div className="filter-header-top">
            <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               <span style={{ color: '#1890ff' }}>{galleryName || event_id}</span>
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
               {visibleData.length}/{filteredData.length} item
            </Text>
          </div>

          <div className="filter-controls">
            <DatePicker 
              value={startDate} 
              onChange={(date) => { setStartDate(date); setDisplayLimit(24); }} 
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
              style={{ flex: 1, minWidth: '120px' }}
            />
            <Button 
              type={startDate === null ? "primary" : "default"} 
              onClick={() => { setStartDate(null); setDisplayLimit(24); }}
            >
              Tất cả
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <Spin spinning={loading && visibleData.length === 0} tip="Đang tải..." size="large">
          <div style={{ minHeight: '200px' }}>
            {visibleData.length > 0 ? (
              <Row gutter={[8, 12]}> {/* Khoảng cách nhỏ hơn trên Mobile */}
                {visibleData.map((item, idx) => {
                  const ext = getFileExt(item.file_url);
                  const isLast = visibleData.length === idx + 1;
                  return (
                    <Col xs={12} sm={8} md={6} lg={4} xl={3} key={item.id} ref={isLast ? lastElementRef : null}>
                      <Card
                        className="custom-image-card"
                        hoverable
                        bodyStyle={{ padding: "8px" }}
                        cover={
                          <div style={imgContainerStyle}>
                            <img 
                                src={item.small} 
                                alt={item.name} 
                                style={imageStyle} 
                                loading="lazy" 
                                onLoad={(e) => e.target.style.opacity = 1}
                            />
                            {isVideo(ext) && <div style={playIconOverlay}>▶</div>}
                            
                            <Button
                              className="btn-delete-node"
                              type="primary"
                              danger
                              shape="circle"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(item);
                              }}
                              style={deleteButtonStyle}
                            />
                          </div>
                        }
                        onClick={() => setIndex(idx)}
                      >
                        <div style={{ minHeight: '32px' }}>
                           <Text strong style={{ fontSize: "11px", lineHeight: "1.2" }} ellipsis={{ tooltip: item.name }}>
                             {item.name}
                           </Text>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              !loading && <Empty description="Không có dữ liệu" />
            )}

            {displayLimit < filteredData.length && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" tip="Tải thêm..." />
              </div>
            )}
          </div>
        </Spin>
      </div>

      <Lightbox
        index={index}
        open={index >= 0}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Thumbnails, Zoom, Video]}
        video={{ autoPlay: true, controls: true }}
      />

      <style>{`
        /* Style cho Header linh hoạt */
        .filter-card {
          background: #fff;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .filter-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .filter-controls {
          display: flex;
          gap: 8px;
        }

        /* Nút xóa mặc định ẩn trên desktop, hiện khi hover */
        .btn-delete-node {
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
        }
        .custom-image-card:hover .btn-delete-node {
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* Responsive cho Mobile */
        @media (max-width: 767px) {
          .btn-delete-node {
            opacity: 0.7; /* Mobile không có hover nên hiện mờ mờ sẵn */
            visibility: visible;
            transform: scale(0.9);
          }
          .filter-card { padding: 8px; }
          .ant-typography { font-size: 13px !important; }
        }

        /* Grid Desktop */
        @media (min-width: 768px) {
          .filter-card {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          .filter-controls { width: auto; }
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

const imgContainerStyle = {
  position: "relative",
  paddingTop: "75%",
  background: "#e9e9e9",
  overflow: 'hidden',
  borderRadius: '4px 4px 0 0'
};

const imageStyle = {
  position: "absolute",
  top: 0, left: 0,
  width: "100%", height: "100%",
  objectFit: "cover",
  opacity: 0,
  transition: 'opacity 0.3s ease-in'
};

const playIconOverlay = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  color: "#fff",
  backgroundColor: "rgba(0,0,0,0.4)",
  borderRadius: "50%",
  width: "32px", height: "32px",
  fontSize: "16px",
  display: "flex", alignItems: "center", justifyContent: "center",
  pointerEvents: 'none'
};

const deleteButtonStyle = {
  position: "absolute",
  top: "4px",
  right: "4px",
  zIndex: 10
};

export default ViewImage;