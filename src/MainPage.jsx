import React, { useState, useEffect, useRef } from "react";
import { Button, Collapse, Space, DatePicker, Select, Tag, Popover, Input, Modal, Form, Spin, message, Alert } from "antd";
import { Capacitor } from '@capacitor/core';


import {
  CloseOutlined, CloudOutlined, EditOutlined,
  EyeOutlined, LoadingOutlined, PlusOutlined, ReadOutlined,
  DatabaseOutlined,
  ExpandOutlined,
  BulbOutlined,
  ReloadOutlined,
  KeyOutlined
} from "@ant-design/icons";

import dayjs from "dayjs";
import PopupDateOffsetPicker from "./PopupDateOffsetPicker";
import axios from './axios-config';
import SearchableTable from "./SearchableTable";
import TextArea from "antd/es/input/TextArea";
import MenuLink from "./MenuLink";
import SelectionPopup from "./SelectionPopup";
import ViewImage from "./ViewImage";

const { Panel } = Collapse;
const { Option } = Select;

export default function App() {
  const [sections, setSections] = useState([]);
  const [viewImageModal, setViewImageModal] = useState({ open: false, galleryId: null });
  const [loginWebModalOpen, setLoginWebModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(null);

  const [popupSectionIndex, setPopupSectionIndex] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState([]);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(dayjs().subtract(3, "month"));

  const [form] = Form.useForm();
  const [isLogin, setLogin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cookie, setCookie] = useState("");

  const selectedDateRef = useRef(selectedDate);
  const [openIndex, setOpenIndex] = useState(null);
  const tableContainerRef = useRef(null);
  const filterInputRef = useRef(null);

  const [suggetEventModal, setSuggetEventModal] = useState({isModalVisible: false, gameId: null, selectedDate: null});

  // 1. Theo dõi kích thước màn hình
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    const keyword = (e.target || e).value.toLowerCase();
    if (tableContainerRef.current) {
      const rows = tableContainerRef.current.querySelectorAll('table.table-cnd tbody tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const activityText = cells[2]?.innerText.toLowerCase() || '';
        const altTitleText = cells[3]?.innerText.toLowerCase() || '';
        const isMatch = activityText.includes(keyword) || altTitleText.includes(keyword);
        row.style.display = isMatch ? '' : 'none';
      });
    }
  };

  const removeColumnsFromHtml = (htmlString, columnNames) => {
    if (!htmlString || !columnNames || columnNames.length === 0) return htmlString;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;
    const headers = Array.from(tempDiv.querySelectorAll("th"));
    let targetIndexes = [];
    headers.forEach((th, index) => {
      if (columnNames.includes(th.innerText.trim())) targetIndexes.push(index);
    });
    if (targetIndexes.length === 0) return htmlString;
    targetIndexes.sort((a, b) => b - a);
    targetIndexes.forEach(index => headers[index]?.remove());
    const rows = tempDiv.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      targetIndexes.forEach(index => cells[index]?.remove());
    });
    return tempDiv.innerHTML;
  };

  const handleOpenPopup = async (sectionIndex, gameId) => {
    setPopupSectionIndex(sectionIndex);
    setIsPopupVisible(true);
    setIsPopupLoading(true);
    setPopupData(null);
    try {
      const response = await axios.post(`/show-data`, { gameId: gameId, startDate: searchDate.format("YYYY-MM-DD") });
      const data = response.data;
      let cleanHtml = removeColumnsFromHtml(data.content_html, ["Game", "Total Days"]);
      setPopupData(cleanHtml);
      setIsPopupLoading(false);
      setSearchTerm('');
    } catch (error) {
      console.error(error);
      setIsPopupLoading(false);
      setPopupData("<p style='color:red'>Lỗi tải dữ liệu</p>");
    }
  };

  const fetchGameData = async (dateStr) => {
    try {
      setLogin(true);
      const response = await axios.get(`/games?date=${dateStr}`);
      const data = response.data;
      // Đảm bảo data là một mảng, và mỗi item trong đó có 'events' và 'event-details' là một mảng
      const sanitizedData = Array.isArray(data)
        ? data.map(section => ({
            ...section,
            events: Array.isArray(section.events) ? section.events : [],
            'event-details': Array.isArray(section['event-details']) ? section['event-details'] : [],
          }))
        : [];
      setSections(sanitizedData);
      setLogin(false);
    } catch (err) {
      setLogin(false);
      console.error("❌ GET error:", err);
      setSections([]); // Reset về mảng rỗng khi có lỗi
    }
  };

  const refreshEventsOnly = async (dateStr) => {
    try {
      setLogin(true);
      const response = await axios.get(`/games?date=${dateStr}`);
      const data = response.data;
      if (Array.isArray(data)) {
        setSections(prevSections => {
          return prevSections.map(oldSection => {
            const newSectionData = data.find(s => s.id === oldSection.id);
            if (newSectionData && Array.isArray(newSectionData.events)) {
              return {
                ...oldSection,
                events: newSectionData.events // CHỈ cập nhật danh sách Event gợi ý trong dropdown
                // Giữ nguyên 100% 'event-details' (các ô input người dùng đang nhập dở)
              };
            }
            return oldSection;
          });
        });
        message.success('Đã cập nhật danh sách Sự kiện (Giữ nguyên dữ liệu đang nhập)!');
      }
      setLogin(false);
    } catch (err) {
      setLogin(false);
      console.error("❌ GET error:", err);
      message.error("Lỗi cập nhật danh sách sự kiện!");
    }
  };

  const login = async () => {
    setLogin(true);
    try {
      const response = await axios.post("/saveLoginData", { datas: cookie });
      const data = response.data;
      alert(data.success ? "Login successful!" : "Login failed!");
      setLogin(false);
    } catch (err) {
      setLogin(false);
      alert("Login failed!");
      console.error(err);
    }
  };

  const addField = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex]['event-details'].push({
      from: selectedDate.format("YYYY/MM/DD"),
      to: null,
      event_id: undefined,
      status: '',
      type: 'date',
    });
    setSections(newSections);
  };

  const removeField = (sectionIndex, fieldIndex) => {
    const newSections = [...sections];
    if (newSections[sectionIndex]['event-details'][fieldIndex].id) {
      newSections[sectionIndex]['event-details'][fieldIndex].isDelete = true;
    } else {
      newSections[sectionIndex]['event-details'].splice(fieldIndex, 1);
    }
    setSections(newSections);
  };

  const saveCloud = async (sectionIndex, fieldIndex) => {
    try {
      let newSections = [...sections];
      newSections[sectionIndex]['event-details'][fieldIndex].loading = true;
      setSections(newSections);
      const payload = newSections[sectionIndex]['event-details'][fieldIndex];
      payload.date = selectedDate.format("YYYY/MM/DD");
      payload.gameId = newSections[sectionIndex].id;
      const res = await axios.post("/action", payload);
      const data = res.data;
      newSections = [...sections];
      newSections[sectionIndex]['event-details'][fieldIndex].loading = false;
      newSections[sectionIndex]['event-details'][fieldIndex].id = data.id;
      newSections[sectionIndex]['event-details'][fieldIndex].status = data.status;
      setSections(newSections);
    } catch (err) {
      console.error("❌ Save error:", err);
      let newSections = [...sections];
      newSections[sectionIndex]['event-details'][fieldIndex].loading = false;
      newSections[sectionIndex]['event-details'][fieldIndex].status = '';
      setSections(newSections);
    }
  };

  const handleFieldChange = (sectionIndex, fieldIndex, key, value, defaultDay) => {
    const newSections = [...sections];
    newSections[sectionIndex]['event-details'][fieldIndex][key] = value;
    if (defaultDay && defaultDay !== '') {
      newSections[sectionIndex]['event-details'][fieldIndex].to = dayjs().add(defaultDay, 'day').format("YYYY/MM/DD")
    }
    setSections(newSections);
  };

  const readCookieDat = async () => {
    try {
      const response = await axios.get(`/readDataCookies`);
      const rawData = response.data?.result;
      
      if (rawData) {
        let finalCookieJson = '';
        if (typeof rawData === 'string' && rawData.trim().startsWith('{')) {
          finalCookieJson = rawData;
        } else {
          const csrfMatch = typeof rawData === 'string' ? rawData.match(/var\s+csrfHash\s*=\s*['"]([^'"]+)['"]/) : null;
          const extractedCsrf = csrfMatch ? csrfMatch[1] : (rawData?.csrf || 'e873a075f5587c1c013772ef1f501333');
          const cookieStr = typeof rawData === 'object' ? (rawData.cookies || '') : rawData;
          
          finalCookieJson = JSON.stringify({
            csrf: extractedCsrf,
            cookies: cookieStr
          });
        }
        
        setCookie(finalCookieJson);
        message.success('Đã tự động nạp Token & Cookie JSON mới nhất!');
      } else {
        message.warning('Chưa có dữ liệu Cookie trên Server.');
      }
    } catch (err) {
      console.error("❌ GET error:", err);
      message.error('Lỗi khi đọc Cookie từ Server.');
    }
  };

  const extractDirectlyFromPopup = (win) => {
    try {
      if (win && !win.closed) {
        const doc = win.document;
        if (doc) {
          const cookiesStr = doc.cookie || '';
          const htmlStr = doc.documentElement ? doc.documentElement.innerHTML : '';
          const csrfMatch = htmlStr.match(/var\s+csrfHash\s*=\s*['"]([^'"]+)['"]/);
          const csrfVal = win.csrfHash || (csrfMatch ? csrfMatch[1] : '');

          if (cookiesStr && csrfVal) {
            const jsonToken = JSON.stringify({
              csrf: csrfVal,
              cookies: cookiesStr
            });
            setCookie(jsonToken);
            message.success('Đã bóc tách Token & Cookie JSON trực tiếp từ Popup!');
            try { win.close(); } catch(e) {}
            return true;
          }
        }
      }
    } catch (err) {
      // Bỏ qua lỗi cross-origin tạm thời cho tới khi cùng origin hoặc lấy được dữ liệu
    }
    return false;
  };

  const handleNativeAppLogin = async () => {
    try {
      const loginWin = window.open('https://my.liquidandgrit.com/admin/login', 'LiquidGritAuthWindow', 'width=600,height=750');
      message.info('Vui lòng đăng nhập. Token & Cookie sẽ được bóc tách trực tiếp từ cửa sổ Popup!');
      
      const timer = setInterval(() => {
        const success = extractDirectlyFromPopup(loginWin);
        if (success || (loginWin && loginWin.closed)) {
          clearInterval(timer);
        }
      }, 500);
    } catch (e) {
      console.error('Native login error:', e);
    }
  };

  useEffect(() => { readCookieDat(); }, []);
  useEffect(() => { fetchGameData(selectedDate.format("YYYY/MM/DD")); }, [selectedDate]);

  const handleDeleteEvent = async () => {
    try {
      await axios.post("/deleteEvent", {
        eventId: form.getFieldValue('eventId'),
      });

      const newSections = [...sections];
      newSections[activeSectionIndex].events = newSections[activeSectionIndex].events.filter(event => event.id !== form.getFieldValue('eventId'));

      setSections(newSections);
      setEventModalVisible(false);
    } catch (error) {
      console.error('Delete failed:', error);
    }

  }
  const handleAddEvent = async () => {
    try {
      const values = await form.validateFields();


      const datap = { eventId: values.eventId, name: values.gameName, gallery_id: values.galleryId, g_name: values.relatedName, default_day: values.day, post_slug: values.post_slug, gameId: sections[activeSectionIndex].id };
      const res = await axios.post("/event", datap);
      const data = res.data;
      const newEvent = {
        id: data.lastedId,
        name: values.gameName,
        gallery_id: values.galleryId,
        default_day: values.day,
        g_name: values.relatedName,
        post_slug: values.post_slug
      };
      const newSections = [...sections];
      const eventIndex = newSections[activeSectionIndex].events.findIndex(item => item.id === data.lastedId);
      if (eventIndex !== -1) {
        newSections[activeSectionIndex].events[eventIndex] = newEvent;
      } else {
        newSections[activeSectionIndex].events.push(newEvent);
      }
      setSections(newSections);
      setEventModalVisible(false);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const renderSectionBody = (fields, sectionIndex) => {
    if (!fields) return null;
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        {fields['event-details']?.filter(item => !item.isDelete)?.map((field, fieldIndex) => (
          <div key={sectionIndex + '- ' + fieldIndex}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
              width: "100%",
              padding: isMobile ? "12px 0" : "4px 0",
              borderBottom: isMobile ? "1px dashed #ddd" : "none"
            }}>

            {/* Cột 1: Date Range - Desktop cố định rộng, Mobile 100% */}
            <div style={{
              display: "flex",
              gap: "4px",
              flex: isMobile ? "1 1 100%" : "0 0 310px",
              maxWidth: "100%"
            }}>
              <DatePicker
                format="YYYY/MM/DD"
                disabled={field.status === "1"}
                style={{ flex: 1, minWidth: 0 }}
                value={field.from ? dayjs(field.from) : ''}
                onChange={(date) => {
                  handleFieldChange(sectionIndex, fieldIndex, "from", date.format('YYYY/MM/DD'));
                  setOpenIndex(sectionIndex + '- ' + fieldIndex);
                }}
              />
              <Popover
                key={sectionIndex + '- ' + fieldIndex}
                open={openIndex === (sectionIndex + '- ' + fieldIndex)}
                trigger="click"
                onOpenChange={(visible) => setOpenIndex(visible ? sectionIndex + '- ' + fieldIndex : null)}
                content={
                  <PopupDateOffsetPicker
                    selectedDate={field.to ? dayjs(field.to) : undefined}
                    onChange={(date) => {
                      handleFieldChange(sectionIndex, fieldIndex, "to", date?.format('YYYY/MM/DD') || '')
                    }}
                    onClose={() => setOpenIndex(null)}
                  />
                }>
                <Input
                  style={{ flex: 1, minWidth: 0 }}
                  disabled={field.status === "1"}
                  readOnly
                  placeholder="Chọn ngày"
                  value={field.to ? dayjs(field.to).format('YYYY/MM/DD') : ''}
                  onClick={() => setOpenIndex(sectionIndex + '- ' + fieldIndex)}
                />
              </Popover>
            </div>

            {/* Cột 2: Select Event - Desktop tự giãn, Mobile 100% (XUỐNG DÒNG) */}
            <div style={{
              flex: isMobile ? "1 1 100%" : "1 1 auto",
              minWidth: 0,
              maxWidth: "100%"
            }}>
              <Select allowClear
                disabled={field.status === "1"}
                showSearch
                value={field.event_id}
                style={{ width: '100%' }}
                placeholder="Chọn sự kiện"
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                dropdownStyle={{ minWidth: 280, maxWidth: '95vw' }}
                filterOption={(input, option) => {
                  const keyword = input.toLowerCase();
                  const name = option.label?.toLowerCase?.() || '';
                  const g_name = option.g_name?.toLowerCase?.() || '';
                  const id = String(option.value).toLowerCase();
                  return name.includes(keyword) || id.includes(keyword) || g_name.includes(keyword);
                }}
                onChange={(value, option) =>
                  handleFieldChange(sectionIndex, fieldIndex, "event_id", value, option?.defaultDay)
                }
                dropdownRender={menu => (
                  <>
                    {menu}
                    <Button type="link" size="small" onClick={() => {
                      form.resetFields();
                      setEventModalVisible(true);
                      setActiveSectionIndex(sectionIndex);

                    }}>+ Thêm mới</Button>
                  </>
                )}
              >
                {fields.events.map((event) => (
                  <Select.Option key={event.id} value={event.id} label={`${event.name} ${event.id}`} defaultDay={event.default_day} g_name={event.g_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {event.name} {event.g_name ? ` (${event.g_name})` : ''}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
                        <Button type="text" size="small" icon={<ExpandOutlined />} onClick={(e) => { e.stopPropagation(); setViewImageModal({ open: true, galleryId: event.gallery_id }); }} />
                        {event.post_slug && <Button type="text" size="small" icon={<ReadOutlined />} onClick={(e) => { e.stopPropagation(); window.open(`https://my.liquidandgrit.com/library/gallery/${event.post_slug}`, '_blank'); }} />}
                        <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); window.open('https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=' + event.gallery_id, '_blank'); }} />
                        <Button
                          type="text" size="small" icon={<EditOutlined />}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            form.setFieldsValue({
                              eventId: event.id,
                              gameName: event.name,
                              day: event.default_day,
                              galleryId: event.gallery_id,
                              relatedName: event.g_name,
                              post_slug: event.post_slug
                            });
                            setEventModalVisible(true);
                            setActiveSectionIndex(sectionIndex);
                          }} />
                      </div>

                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Cột 3: Type & Status - Desktop nằm cùng hàng, Mobile 100% */}
            <div style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flex: isMobile ? "1 1 100%" : "0 0 auto",
              maxWidth: "100%"
            }}>
              <Select
                placeholder="Type"
                style={{ flex: isMobile ? "1 1 auto" : "0 0 130px", minWidth: 0 }}
                value={field.type}
                disabled={field.status === "1"}
                onChange={(value) => handleFieldChange(sectionIndex, fieldIndex, "type", value)}
              >
                <Option value="date">Date</Option>
                <Option value="image">Image</Option>
                <Option value="video">Img/Video</Option>
                <Option value="nochanged">No Change</Option>
              </Select>

              <div style={{ flexShrink: 0 }}>
                {!field.loading && field.status === "1" ? (
                  <Tag color={"green"}>Success</Tag>
                ) : (
                  <div style={{ display: "flex" }}>
                    <Button icon={field.loading ? <LoadingOutlined /> : <CloudOutlined />} disabled={field.loading} type="text" onClick={() => saveCloud(sectionIndex, fieldIndex)} />
                    {!field.loading && <Button icon={<CloseOutlined />} type="text" onClick={() => removeField(sectionIndex, fieldIndex)} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => addField(sectionIndex)} block>Add Field</Button>
      </Space>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4 space-y-4" style={{ maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>

      <MenuLink activeKey="home" />

      <div style={{ textAlign: "center", marginBottom: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
        <Button type="primary" onClick={() => {
          navigator.clipboard.writeText('copy(JSON.stringify({"csrf": window.csrfHash, "cookies" : document.cookie }));')
        }} disabled={isLogin}>Script Get Token</Button>

      </div>

      <div style={{ marginBottom: "16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <TextArea
          placeholder="Nhập cookie tại đây..."
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 5 }}
          style={{ width: "100%", maxWidth: "500px", boxSizing: "border-box", wordBreak: "break-all" }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button type="primary" onClick={login} disabled={isLogin}>Save Token</Button>
          {Capacitor.isNativePlatform() && (
            <Button icon={<KeyOutlined />} type="primary" onClick={handleNativeAppLogin}>
              📱 Đăng nhập App Lấy Cookie Tự Động
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "16px", textAlign: "center", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
        <DatePicker disabled={isLogin} value={selectedDate} onChange={(date) => setSelectedDate(date)} format="YYYY/MM/DD" />
        <Button icon={<ReloadOutlined />} onClick={() => refreshEventsOnly(selectedDate.format("YYYY/MM/DD"))} title="Tải lại danh sách sự kiện (Giữ nguyên dữ liệu đang nhập)" />
      </div>

      <div className="w-full max-w-screen-xl px-2" style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>
        {sections.map((fields, sectionIndex) => (
          <Collapse key={fields.id || sectionIndex} defaultActiveKey={["0"]} className="mb-4" style={{ width: '100%', maxWidth: '100%' }}>
            <Panel
              header={
                <div style={{ fontWeight: 'bold', wordBreak: 'break-word', overflowWrap: 'anywhere', paddingRight: '4px' }}>
                  {fields.name}
                </div>
              }
              key="0"
              extra={
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <Button type="text" size="small" icon={<BulbOutlined />} onClick={(e) => {
                    e.stopPropagation();
                    setSuggetEventModal({isModalVisible: true, gameId: fields.id, selectedDate: selectedDate, sectionIndex})
                  }}>
                    {!isMobile && "Gợi ý event"}
                  </Button>

                  <Button type="text" size="small" icon={<DatabaseOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenPopup(sectionIndex, fields.id); }}>
                    {!isMobile && "Data"}
                  </Button>
                </div>
              }
            >
              {renderSectionBody(fields, sectionIndex)}
            </Panel>
          </Collapse>
        ))}
      </div>

      {/* MODAL DATA */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            <div style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
              {popupSectionIndex !== null ? `Dữ liệu: ${sections[popupSectionIndex]?.name}` : "Data"}
            </div>
            <div style={{ display: 'flex', gap: '8px' }} onMouseDown={e => e.stopPropagation()}>
              <DatePicker format="YYYY/MM/DD" style={{ width: '135px' }} value={searchDate} onChange={(date) => { setSearchDate(date); handleOpenPopup(popupSectionIndex, sections[popupSectionIndex].id) }} />
              <Input ref={filterInputRef} value={searchTerm} placeholder="Tìm..." onChange={handleSearch} style={{ width: '120px' }} />
            </div>
          </div>
        }
        open={isPopupVisible}
        width={isMobile ? "95vw" : "fit-content"}
        style={{ maxWidth: '95vw' }}
        onCancel={() => setIsPopupVisible(false)}
        footer={[<Button key="close" onClick={() => setIsPopupVisible(false)}>Đóng</Button>]}
        destroyOnClose
      >
        <div style={{ height: '70vh', overflow: 'auto', borderTop: '1px solid #f0f0f0' }}>
          {isPopupLoading ? <div style={{ textAlign: "center", padding: "20px" }}><Spin size="large" /></div> : <div ref={tableContainerRef} dangerouslySetInnerHTML={{ __html: popupData || "<p>Không có dữ liệu</p>" }} />}
        </div>
      </Modal>

      {/* CÁC MODAL THÊM SỰ KIỆN GIỮ NGUYÊN */}
      <Modal title="Thêm sự kiện mới" open={eventModalVisible} style={{ maxWidth: '95vw' }} onCancel={() => setEventModalVisible(false)}
        footer={[
          // Nút Delete nằm bên trái
          (form.getFieldValue('eventId')) &&
          <Button
            key="delete"
            danger
            onClick={handleDeleteEvent}
            style={{ float: 'left' }} // Đẩy nút Delete sang trái cho tách biệt
          >
            Xóa
          </Button>,
          // Nút Hủy và Thêm nằm bên phải như cũ
          <Button key="back" onClick={() => setEventModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddEvent}>
            Thêm
          </Button>,
        ]}

      >
        <Form form={form} layout="vertical">
          <Button onClick={() => setIsModalOpen(true)}>Find event</Button>
          <Form.Item hidden name="eventId"></Form.Item>
          <Form.Item label="Related event (related_name)" name="relatedName">
            <Select showSearch style={{ width: '100%' }} allowClear optionFilterProp="label" filterOption={(input, option) => (option.label ?? '').toLowerCase().includes(input.toLowerCase())} onChange={(v, opt) => form.setFieldsValue({ galleryId: opt?.galleryId || '', post_slug: opt?.post_slug || '' })}>
              {sections[activeSectionIndex]?.events?.filter(e => (e.g_name || '') === '').map(event => (
                <Select.Option key={event.id} galleryId={event.gallery_id} post_slug={event.post_slug} value={event.name} label={event.name} defaultDay={event.default_day} g_name={event.g_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {event.name} {event.g_name ? ` (${event.g_name})` : ''}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
                      <Button type="text" size="small" icon={<ExpandOutlined />} onClick={(e) => { e.stopPropagation(); window.open('vewImage/' + event.gallery_id, '_blank'); }} />
                      {event.post_slug && <Button type="text" size="small" icon={<ReadOutlined />} onClick={(e) => { e.stopPropagation(); window.open(`https://my.liquidandgrit.com/library/gallery/${event.post_slug}`, '_blank'); }} />}
                      <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); window.open('https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=' + event.gallery_id, '_blank'); }} />
                    </div>

                  </div>
                </Select.Option>
                // <Select.Option key={e.id} galleryId={e.gallery_id} post_slug={e.post_slug} value={e.name} label={e.name}>{e.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Tên sự kiện" name="gameName" rules={[{ required: true },
          ({ getFieldValue }) => ({
            validator(_, value) {
              const relatedEvent = getFieldValue('relatedName'); // Lấy giá trị field khác ở đây

              if (!value || !relatedEvent || relatedEvent != value) {
                return Promise.resolve();
              }

              return Promise.reject(new Error('Tên sự kiện và related event không đc giống nhau'));
            },
          }),

          ]}><Input /></Form.Item>
          <Form.Item label="Gallery ID" name="galleryId" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Post Slug" name="post_slug"><Input /></Form.Item>
          <Form.Item label="Day" name="day"><Input /></Form.Item>

        </Form>
      </Modal>

      <Modal title="Chọn event" open={isModalOpen} style={{ maxWidth: '95vw' }} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose>
        <SearchableTable gameId={sections[activeSectionIndex]?.id} returnParent={(data) => {
          setIsModalOpen(false);
          form.resetFields();
          const name = data?.events?.[0] || data.title;
          const gId = data?.id;
          let d = '', eId = undefined;
          const idx = sections[activeSectionIndex].events.findIndex(i => i.gallery_id === gId && i.name === name);
          if (idx !== -1) { eId = sections[activeSectionIndex].events[idx].id; d = sections[activeSectionIndex].events[idx].default_day; }
          form.setFieldsValue({ eventId: eId, galleryId: gId, gameName: name, relatedName: data?.events?.[0] !== data.title ? data.title : '', post_slug: data.permalink.replace('https://my.liquidandgrit.com/library/gallery/', ''), day: d });


        }} />
      </Modal>

      <SelectionPopup 
        visible={suggetEventModal.isModalVisible}
        gameId={suggetEventModal.gameId}
        selectedDate={suggetEventModal.selectedDate}
        onCancel={() => setSuggetEventModal({isModalVisible: false, gameId: null, selectedDate: null})}
        onSave={(selectedObjects) => {

          const newSections = [...sections];
          selectedObjects.forEach((obj, index) => {
             newSections[suggetEventModal.sectionIndex]['event-details'].push({
                from: obj.from,
                to: obj.to,
                event_id: obj.key,
                status: '',
                type: 'date',
              });
          });

          
   
          setSections(newSections);

        }}
      />

      {/* MODAL XEM ẢNH / GALLERY POPUP CHUẨN MOBILE */}
      <Modal
        open={viewImageModal.open}
        onCancel={() => setViewImageModal({ open: false, galleryId: null })}
        width="95vw"
        style={{ maxWidth: '95vw', top: 10 }}
        footer={null}
        destroyOnClose
      >
        {viewImageModal.galleryId && <ViewImage event_id={viewImageModal.galleryId} />}
      </Modal>
      {/* MODAL MỞ TRÌNH DUYỆT ĐĂNG NHẬP LIQUIDANDGRIT */}
      <Modal
        title="🔐 Đăng nhập liquidandgrit.com để tự lấy Cookie"
        open={loginWebModalOpen}
        onCancel={async () => {
          setLoginWebModalOpen(false);
          await readCookieDat();
        }}
        width="95vw"
        style={{ maxWidth: '850px', top: 15 }}
        footer={[
          <Button key="fetch" type="primary" icon={<CloudOutlined />} onClick={async () => {
            setLoginWebModalOpen(false);
            await readCookieDat();
          }}>
            Tự điền Cookie & Đóng
          </Button>,
          <Button key="close" onClick={async () => {
            setLoginWebModalOpen(false);
            await readCookieDat();
          }}>
            Đóng
          </Button>
        ]}
        destroyOnClose
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Alert
            message="Hướng dẫn Đăng nhập:"
            description="Bấm nút bên dưới để mở trang đăng nhập bảo mật. Sau khi đăng nhập xong, hãy đóng cửa sổ và bấm nút 'Tự điền Cookie & Đóng' để ứng dụng tự nạp Token & Cookie JSON."
            type="info"
            showIcon
            style={{ marginBottom: 20, textAlign: 'left' }}
          />
          <Button
            type="primary"
            size="large"
            icon={<KeyOutlined />}
            style={{ height: '48px', fontSize: '16px', borderRadius: '8px' }}
            onClick={() => {
              window.open('https://my.liquidandgrit.com/admin/login', '_blank', 'width=600,height=750');
            }}
          >
            🔑 Mở Trang Đăng Nhập LiquidAndGrit (Chuẩn Bảo Mật)
          </Button>
        </div>
      </Modal>
    </div>
  );
}