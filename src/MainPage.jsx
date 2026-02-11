import React, { useState, useEffect, useRef } from "react";
import { Button, Collapse, Space, DatePicker, Select, Tag, Popover, Input, Modal, Form, Spin } from "antd";
import {
  CloseOutlined, CloudOutlined, EditOutlined,
  EyeOutlined, LoadingOutlined, PlusOutlined, ReadOutlined,
  DatabaseOutlined
} from "@ant-design/icons";

import dayjs from "dayjs";
import PopupDateOffsetPicker from "./PopupDateOffsetPicker";
import axios from './axios-config';
import SearchableTable from "./SearchableTable";
import TextArea from "antd/es/input/TextArea";
import MenuLink from "./MenuLink";

const { Panel } = Collapse;
const { Option } = Select;

export default function App() {
  const [sections, setSections] = useState([]);
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
      setSections(response.data);
      setLogin(false);
    } catch (err) {
      setLogin(false);
      console.error("❌ GET error:", err);
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
      setCookie(response.data?.result);
    } catch (err) {
      setCookie('');
      console.error("❌ GET error:", err);
    }
  }

  useEffect(() => { readCookieDat(); }, []);
  useEffect(() => { fetchGameData(selectedDate.format("YYYY/MM/DD")); }, [selectedDate]);

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
      form.resetFields();
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
              flex: isMobile ? "1 1 100%" : "0 0 310px" 
            }}>
              <DatePicker
                format="YYYY/MM/DD"
                disabled={field.status === "1"}
                style={{ width: isMobile ? "50%" : "150px" }}
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
                  style={{ width: isMobile ? "50%" : "150px" }}
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
              minWidth: isMobile ? "100%" : "200px" 
            }}>
              <Select
                disabled={field.status === "1"}
                showSearch
                value={field.event_id}
                style={{ width: '100%' }}
                placeholder="Chọn sự kiện"
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                dropdownStyle={{ minWidth: 300, maxWidth: '95vw' }}
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
                            }}/>
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
              flex: isMobile ? "1 1 100%" : "0 0 auto"
            }}>
              <Select
                placeholder="Type"
                style={{ width: isMobile ? "100%" : 130 }}
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
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4 space-y-4">
      <MenuLink activeKey="home" />
      
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Button type="primary" onClick={() => {
          navigator.clipboard.writeText('copy(JSON.stringify({"csrf": window.csrfHash, "cookies" : document.cookie }));')
        }} disabled={isLogin}>Script Get Token</Button>
      </div>

      <div style={{ marginBottom: "16px", textAlign: "center", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", width: "100%" }}>
        <TextArea
          placeholder="Nhập cookie tại đây..."
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 5 }}
          style={{ width: isMobile ? "100%" : "500px" }}
        />
        <Button type="primary" onClick={login} disabled={isLogin}>Save Token</Button>
      </div>

      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        <DatePicker disabled={isLogin} value={selectedDate} onChange={(date) => setSelectedDate(date)} format="YYYY/MM/DD" />
      </div>

      <div className="w-full max-w-screen-xl px-2">
        {sections.map((fields, sectionIndex) => (
          <Collapse key={fields.id || sectionIndex} defaultActiveKey={["0"]} className="mb-4">
            <Panel
              header={<div className="flex justify-between items-center w-full">{fields.name}</div>}
              key="0"
              extra={
                <Button type="text" icon={<DatabaseOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenPopup(sectionIndex, fields.id); }}>
                  Data
                </Button>
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
        onCancel={() => setIsPopupVisible(false)}
        footer={[<Button key="close" onClick={() => setIsPopupVisible(false)}>Đóng</Button>]}
        destroyOnClose
      >
        <div style={{ height: '70vh', overflow: 'auto', borderTop: '1px solid #f0f0f0' }}>
          {isPopupLoading ? <div style={{ textAlign: "center", padding: "20px" }}><Spin size="large" /></div> : <div ref={tableContainerRef} dangerouslySetInnerHTML={{ __html: popupData || "<p>Không có dữ liệu</p>" }} />}
        </div>
      </Modal>

      {/* CÁC MODAL THÊM SỰ KIỆN GIỮ NGUYÊN */}
      <Modal title="Thêm sự kiện mới" open={eventModalVisible} onCancel={() => setEventModalVisible(false)} onOk={handleAddEvent} okText="Thêm">
        <Form form={form} layout="vertical">
          <Button onClick={() => setIsModalOpen(true)}>Find event</Button>
          <Form.Item hidden name="eventId"></Form.Item>
          <Form.Item label="Tên game" name="gameName" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Gallery ID" name="galleryId" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Post Slug" name="post_slug"><Input /></Form.Item>
          <Form.Item label="Day" name="day"><Input /></Form.Item>
          <Form.Item label="Tên sự kiện (related_name)" name="relatedName">
            <Select showSearch style={{ width: '100%' }} optionFilterProp="label" filterOption={(input, option) => (option.label ?? '').toLowerCase().includes(input.toLowerCase())} onChange={(v, opt) => form.setFieldsValue({ galleryId: opt?.galleryId || '', post_slug: opt?.post_slug || '' })}>
              {sections[activeSectionIndex]?.events?.filter(e => (e.g_name || '') === '').map(e => (
                <Select.Option key={e.id} galleryId={e.gallery_id} post_slug={e.post_slug} value={e.name} label={e.name}>{e.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Chọn event" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose>
        <SearchableTable gameId={sections[activeSectionIndex]?.id} returnParent={(data) => {
          setIsModalOpen(false);
          const name = data?.events?.[0] || data.title;
          const gId = data?.id;
          let d = '', eId = undefined;
          const idx = sections[activeSectionIndex].events.findIndex(i => i.gallery_id === gId && i.name === name);
          if (idx !== -1) { eId = sections[activeSectionIndex].events[idx].id; d = sections[activeSectionIndex].events[idx].default_day; }
          form.setFieldsValue({ eventId: eId, galleryId: gId, gameName: name, relatedName: data?.events?.[0] !== data.title ? data.title : '', post_slug: data.permalink.replace('https://my.liquidandgrit.com/library/gallery/', ''), day: d });
        }} />
      </Modal>
    </div>
  );
}