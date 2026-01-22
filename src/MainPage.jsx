import React, { useState, useEffect, useRef } from "react";
import { Button, Collapse, Space, DatePicker, Select, Tag, Popover, Input, Modal, Form, Table, Spin } from "antd"; // Thêm Table
import { 
  CloseOutlined, CloudOutlined, EditOutlined, 
  EyeOutlined, LoadingOutlined, PlusOutlined, ReadOutlined, 
  DatabaseOutlined // Đổi icon thành Database cho hợp ngữ cảnh data
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
  
  // --- STATE CHO POPUP DATA MỚI ---
  const [popupSectionIndex, setPopupSectionIndex] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState([]); // <--- Data từ API sẽ đẩy vào đây
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  // --------------------------------

  const [form] = Form.useForm();
  const [isLogin, setLogin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cookie, setCookie] = useState("");

  const selectedDateRef = useRef(selectedDate);
  const toRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const removeColumnFromHtml = (htmlString, columnName) => {
    if (!htmlString) return "";

    // 1. Tạo một thẻ div ảo để chứa HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;

    // 2. Tìm vị trí (index) của cột cần xóa trong thẻ <thead>
    // Lưu ý: Code này giả định bảng có thẻ <th>
    const headers = Array.from(tempDiv.querySelectorAll("th"));
    const targetIndex = headers.findIndex(th => th.innerText.trim() === columnName);

    // Nếu không tìm thấy cột tên là "Game" thì trả về nguyên gốc
    if (targetIndex === -1) return htmlString;

    // 3. Xóa cái Header đó đi
    headers[targetIndex].remove();

    // 4. Quét tất cả các dòng (tr) trong bảng để xóa ô dữ liệu (td) tương ứng
    const rows = tempDiv.querySelectorAll("tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      // Nếu dòng này có chứa ô ở vị trí đó thì xóa đi
      if (cells.length > targetIndex) {
        cells[targetIndex].remove();
      }
    });

    // 5. Trả về HTML đã bị cắt gọt
    return tempDiv.innerHTML;
  };

  // --- HÀM XỬ LÝ MỞ POPUP & LOAD DATA (MÔ PHỎNG) ---
  const handleOpenPopup = async (sectionIndex, gameId) => {
    setPopupSectionIndex(sectionIndex);
    setIsPopupVisible(true);
    setIsPopupLoading(true);
    setPopupData(null); // Reset

    try {
      console.log("Đang lấy HTML cho Game ID:", gameId);

      const response = await axios.post(`/show-data`, { gameId: gameId });
      const data = response.data;
      
      const cleanHtml = removeColumnFromHtml(data.content_html, "Game");
      setPopupData(cleanHtml);
      setIsPopupLoading(false);
    } catch (error) {
      console.error(error);
      setIsPopupLoading(false);
      setPopupData("<p style='color:red'>Lỗi tải dữ liệu</p>");
    }
  };

  // Các hàm cũ giữ nguyên
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
    if (defaultDay && defaultDay != '') {
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
      const eventIndex = newSections[activeSectionIndex].events.findIndex(item => item.id == data.lastedId);
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

  // --- Hàm render nội dung chính (giữ nguyên logic cũ) ---
  const renderSectionBody = (fields, sectionIndex) => {
    if (!fields) return null;
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        {fields['event-details']?.filter(item => !item.isDelete)?.map((field, fieldIndex) => (
          <div key={sectionIndex + '- ' + fieldIndex} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", width: "100%" }}>
            
            {/* Cột 1: Date Range */}
            <div style={{ flex: 2, minWidth: "300px", maxWidth: "500px" }}>
              <DatePicker
                format="YYYY/MM/DD"
                disabled={field.status == "1"}
                style={{ width: "50%" }}
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
                  style={{ width: "50%" }}
                  disabled={field.status == "1"}
                  readOnly
                  ref={toRef}
                  placeholder="Chọn ngày"
                  value={field.to ? dayjs(field.to).format('YYYY/MM/DD') : ''}
                  onClick={() => setOpenIndex(sectionIndex + '- ' + fieldIndex)}
                />
              </Popover>
            </div>

            {/* Cột 2: Select Events */}
            <div style={{ flex: 1, minWidth: "150px" }}>
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
                    <Button type="link" onClick={() => {
                      setEventModalVisible(true);
                      setActiveSectionIndex(sectionIndex);
                    }}>+ Thêm mới</Button>
                  </>
                )}
              >
                {fields.events.map((event) => (
                  <Select.Option
                    key={event.id}
                    value={event.id}
                    label={`${event.name} ${event.id}`}
                    defaultDay={event.default_day}
                    g_name={event.g_name}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', whiteSpace: 'normal', wordBreak: 'break-word', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        {event.name}
                        {event.g_name ? ` (${event.g_name})` : ''}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
                        {event.post_slug && event.post_slug != '' &&
                          <Button
                            type="text" size="small" icon={<ReadOutlined />}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://my.liquidandgrit.com/library/gallery/${event.post_slug}`, '_blank');
                            }}
                          />
                        }
                        <Button
                          type="text" size="small" icon={<EyeOutlined />}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open('https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=' + event.gallery_id, '_blank');
                          }}
                        />
                        {field.status !== "1" && (
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
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Cột 3: Select Type */}
            <Select
              placeholder="Select a type"
              style={{ width: 150 }}
              value={field.type}
              disabled={field.status == "1"}
              onChange={(value, option) => handleFieldChange(sectionIndex, fieldIndex, "type", value)}
            >
              <Option value="date">Date</Option>
              <Option value="image">Image</Option>
              <Option value="video">Img/Video</Option>
              <Option value="nochanged">No Changed</Option>
            </Select>

            {/* Cột 4: Status */}
            {!field.loading && field.status === "1" && (<Tag color={"green"}>{"Success"}</Tag>)}
            {field.status !== "1" && (
              <div style={{ flexShrink: 0 }}>
                <Button icon={field.loading ? <LoadingOutlined /> : <CloudOutlined />} disabled={field.loading} type="text" onClick={() => saveCloud(sectionIndex, fieldIndex)} />
                {!field.loading && <Button icon={<CloseOutlined />} type="text" onClick={() => removeField(sectionIndex, fieldIndex)} />}
              </div>
            )}
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => addField(sectionIndex)} block>
          Add Field
        </Button>
      </Space>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4 space-y-4">
      <MenuLink activeKey="home" />
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Button type="primary" onClick={() => {
          navigator.clipboard.writeText('copy(JSON.stringify({"csrf": window.csrfHash, "cookies" : document.cookie }));')
        }} disabled={isLogin}>
          Script Get Token
        </Button>
      </div>
      <div style={{ marginBottom: "16px", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
        <TextArea
          placeholder="Nhập cookie tại đây..."
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 5 }}
          style={{ width: "400px" }}
        />
        <Button type="primary" onClick={login} disabled={isLogin}>Save Token</Button>
        {isLogin && <LoadingOutlined />}
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
              // Nút bấm mở Popup Data
              extra={
                <Button 
                  type="text" 
                  icon={<DatabaseOutlined />} // Icon data
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPopup(sectionIndex, fields.id); // Gọi hàm mở popup và chuẩn bị load data
                  }}
                >
                  Data
                </Button>
              }
            >
              {renderSectionBody(fields, sectionIndex)}
            </Panel>
          </Collapse>
        ))}
      </div>

      {/* --- MODAL HIỂN THỊ DỮ LIỆU RIÊNG (TABLE) --- */}
      <Modal
        title={popupSectionIndex !== null ? `Dữ liệu của: ${sections[popupSectionIndex]?.name}` : "Data"}
        open={isPopupVisible}
        width="fit-content"
        onCancel={() => setIsPopupVisible(false)}
        footer={[
           <Button key="close" onClick={() => setIsPopupVisible(false)}>Đóng</Button>
        ]}
        // width={autoSize}
        destroyOnClose
      > 
        <div 
           style={{ 
            height: '70vh',    
             overflowY: 'auto', // Cuộn dọc
             overflowX: 'auto', // Cuộn ngang (QUAN TRỌNG CHO MOBILE)
             borderTop: '1px solid #f0f0f0',
             width: '100%'      // Chiếm hết chiều rộng modal
           }}
        >
        {isPopupLoading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Spin size="large" tip="Đang tải HTML..." />
          </div>
        ) : (
          <div 
            className="html-table-wrapper responsive-table-container"
            dangerouslySetInnerHTML={{ __html: popupData || "<p>Không có dữ liệu</p>" }} 
          />
        )}
        </div>
      </Modal>

      {/* Các Modal khác giữ nguyên */}
      <Modal title="Thêm sự kiện mới" open={eventModalVisible} onCancel={() => setEventModalVisible(false)} onOk={handleAddEvent} okText="Thêm">
        <Form form={form} layout="vertical">
          <Button onClick={() => { setIsModalOpen(true) }}>Find event</Button>
          <Form.Item hidden name="eventId" ></Form.Item>
          <Form.Item label="Tên game" name="gameName" rules={[{ required: true, message: 'Nhập tên event' }]}><Input /></Form.Item>
          <Form.Item label="Gallery ID" name="galleryId" rules={[{ required: true, message: 'Nhập gallery ID' }]}><Input /></Form.Item>
          <Form.Item label="Post Slug" name="post_slug"><Input /></Form.Item>
          <Form.Item label="Day" name="day"><Input /></Form.Item>
          <Form.Item label="Tên sự kiện (related_name)" name="relatedName">
            <Select showSearch placeholder="Chọn hoặc nhập tên sự kiện" allowClear optionFilterProp="children" mode={false} 
              filterOption={(input, option) => (option.label?.toLowerCase() || '').includes(input.toLowerCase())}
              onChange={(value, option) => { form.setFieldsValue({ galleryId: option?.galleryId || '', post_slug: option?.post_slug || '' }); }}>
              {sections[activeSectionIndex]?.events?.filter(event => (event.g_name || '') == '').map((event) => (
                <Select.Option key={event.id} galleryId={event.gallery_id} post_slug={event.post_slug} value={event.name}>{event.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Chọn event" open={isModalOpen} onCancel={() => { setIsModalOpen(false); }} footer={null} destroyOnClose>
        <SearchableTable gameId={sections[activeSectionIndex]?.id} returnParent={(data) => {
          setIsModalOpen(false);
          const galleruName = data?.events?.[0] || data.title;
          const galleryId = data?.id;
          let day = '', eventId = undefined;
          const eventIndex = sections[activeSectionIndex].events.findIndex(item => item.gallery_id == galleryId & item.name == galleruName);
          if (eventIndex !== -1) { eventId = sections[activeSectionIndex].events[eventIndex].id; day = sections[activeSectionIndex].events[eventIndex].default_day; }
          form.setFieldsValue({ eventId: eventId, galleryId: data?.id, gameName: galleruName, relatedName: data?.events?.[0] != data.title ? data.title : '', post_slug: data.permalink.replace('https://my.liquidandgrit.com/library/gallery/', ''), day: day });
        }} />
      </Modal>
    </div>
  );
}