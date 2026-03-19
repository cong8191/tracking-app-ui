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

  // ==========================================================
  // TỐI ƯU: GỘP FILTER VÀ SLICE VÀO CHUNG 1 MEMO
  // Giúp data đồng bộ tức thì, không bị lệch pha state
  // ==========================================================
  const { filteredData, visibleData } = useMemo(() => {
    const list = apiData?.gallery || [];
    let filtered = list;

    // 1. Thực hiện Filter
    if (startDate) {
      const startOfSelectedDate = startDate.startOf("day");
      filtered = list.filter((item) => {
        const itemDate = dayjs.unix(Number(item.small_added));
        return itemDate.isAfter(startOfSelectedDate) || itemDate.isSame(startOfSelectedDate, "day");
      });
    }

    // 2. Thực hiện Slice ngay lập tức
    const visible = filtered.slice(0, displayLimit);

    return { 
      filteredData: filtered, 
      visibleData: visible 
    };
  }, [apiData, startDate, displayLimit]);

  // 3. Nhận diện phần tử cuối để load thêm
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
      // Reset limit về mặc định khi chuyển event hoặc refresh
      setDisplayLimit(24);
      setApiData({ gallery: [] }); 

      const response = await axios.post(`/vewImage`, { event_id });
      const resultData = response.data.result || { gallery: [] };
      
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

          // Gọi API xóa của bạn
          await axios.post(`/delete_file`, { gallery_id: event_id, file: item });

          // Cập nhật giao diện ngay lập tức bằng cách lọc bỏ phần tử đã xóa
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
    <div style={{ padding: "0 20px 20px 20px", background: "#f5f5f5", minHeight: "100vh" }}>
      
      <div style={stickyHeaderWrapper}>
        <div style={filterContainerStyle}>
          <Space size="middle">
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
               Gallery: <span style={{ color: '#1890ff' }}>{galleryName || event_id}</span>
            </Title>
            <DatePicker 
              value={startDate} 
              onChange={(date) => { setStartDate(date); setDisplayLimit(24); }} 
              format="DD/MM/YYYY"
            />
            <Button 
              type={startDate === null ? "primary" : "default"} 
              onClick={() => { setStartDate(null); setDisplayLimit(24); }}
            >
              Tất cả ảnh
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          </Space>

          <Text type="secondary" style={{ fontSize: '13px' }}>
              Tổng: {filteredData.length} | Đang hiện: {visibleData.length}
          </Text>
        </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        <Spin spinning={loading && visibleData.length === 0} tip="Đang tải..." size="large">
          <div style={{ minHeight: '200px' }}>
            {visibleData.length > 0 ? (
              <Row gutter={[12, 24]}>
                {visibleData.map((item, idx) => {
                  const ext = getFileExt(item.file_url);
                  const isLast = visibleData.length === idx + 1;
                  return (
                    <Col xs={12} sm={8} md={6} lg={4} xl={3} key={item.id} ref={isLast ? lastElementRef : null}>
                      <Card
                        className="custom-image-card"
                        hoverable
                        bodyStyle={{ padding: "10px" }}
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
                              className="btn-delete-hover"
                              type="primary"
                              danger
                              shape="circle"
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
                        <div style={{ wordBreak: 'break-word', minHeight: '40px' }}>
                           <Text strong style={{ fontSize: "12px", lineHeight: "1.4" }}>
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
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Spin tip="Đang tải thêm..." />
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
        .custom-image-card:hover .btn-delete-hover {
          opacity: 1 !important;
          visibility: visible !important;
          transform: scale(1) !important;
        }
      `}</style>
    </div>
  );
};

// --- STYLES GIỮ NGUYÊN ---
const stickyHeaderWrapper = {
  position: "sticky",
  top: 0,
  zIndex: 1000,
  background: "#f5f5f5",
  paddingTop: "20px",
  paddingBottom: "10px",
};

const filterContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#fff",
  padding: "15px 25px",
  borderRadius: "8px",
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
};

const imgContainerStyle = {
  position: "relative",
  paddingTop: "75%",
  background: "#e9e9e9",
  overflow: 'hidden',
  borderRadius: '8px 8px 0 0'
};

const imageStyle = {
  position: "absolute",
  top: 0, left: 0,
  width: "100%", height: "100%",
  objectFit: "cover",
  opacity: 0,
  transition: 'opacity 0.4s ease-in-out'
};

const playIconOverlay = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  color: "#fff",
  backgroundColor: "rgba(0,0,0,0.5)",
  borderRadius: "50%",
  width: "40px", height: "40px",
  fontSize: "20px",
  display: "flex", alignItems: "center", justifyContent: "center"
};

const deleteButtonStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  opacity: 0,
  visibility: "hidden",
  transform: "scale(0.8)",
  transition: 'all 0.2s ease-in-out',
  zIndex: 10
};

export default ViewImage;