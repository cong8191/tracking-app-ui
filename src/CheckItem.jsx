import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Col,
  DatePicker,
  Input,
  List,
  message,
  Modal,
  Select,
  Spin,
  Typography,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import axios from './axios-config';
import TextArea from 'antd/es/input/TextArea';
import MenuLink from './MenuLink';
import dayjs from 'dayjs';

export default function CheckItem() {
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState();
  const [eventOptions, setEventOptions] = useState([]);
  const textAreaRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const tableContainerRef = useRef(null);
  const filterInputRef = useRef(null);
  const [searchDate, setSearchDate] = useState(dayjs().subtract(3, "month"));
  const [popupData, setPopupData] = useState([]);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    fetcGameData();
  }, []);

  const fetcGameData = async () => {
    try {
      const response = await axios.get(`/listGame`);
      setEventOptions(response.data.map((item) => {
        return { 'value': item.id, 'label': item.name }
      }))
    } catch (err) {
      console.error("❌ GET error:", err);
    }
  };

  const [value, setValue] = useState('');
  const [foundEvents, setFoundEvents] = useState([]);

  const processAndReplaceText = (rawInput, targetElement) => {
    if (!targetElement) return;

    const raw = rawInput.replace(/"/g, '');
    const lines = raw.split(/\r?\n/);
    const merged = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = line.match(urlRegex);

      if (/^https?:\/\/.*/i.test(line)) {
        if (merged.length > 0) merged[merged.length - 1] += ` | ${line}`;
      } else if (match) {
        const url = match[0];
        const text = line.replace(url, '').trim();
        merged.push(`${text} | ${url}`);
      } else {
        merged.push(line);
      }
    }

    const finalText = merged.join('\n');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;

    setter.call(targetElement, finalText);
    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const getRealTextAreaDOM = (ref) => {
    if (!ref || !ref.current) return null;
    const instance = ref.current;
    if (instance.resizableTextArea && instance.resizableTextArea.textArea) {
      return instance.resizableTextArea.textArea;
    }
    if (instance.input) return instance.input;
    if (instance instanceof HTMLElement) {
      return instance.querySelector('textarea') || instance;
    }
    return null;
  };

  const handleBtnPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const realInputDOM = getRealTextAreaDOM(textAreaRef);
      processAndReplaceText(text, realInputDOM);
    } catch (err) {
      console.error('Không thể đọc clipboard:', err);
      alert("Vui lòng cấp quyền clipboard hoặc dùng HTTPS!");
    }
  };

  const onManualPaste = (e) => {
    e.preventDefault();
    let content = e.clipboardData.getData('text/plain');
    if (!content) {
      const htmlContent = e.clipboardData.getData('text/html');
      if (htmlContent) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlContent;
        content = tempDiv.innerText || tempDiv.textContent || "";
      }
    }
    if (content) {
      processAndReplaceText(content, e.target);
    }
  };

  const getContent = async (gameId) => {
    if (!gameId) {
      message.warning('Vui lòng chọn game');
      return;
    }
    setLoading(true);
    try {
      message.info(`Bắt đầu lấy data...`);
      const res = await axios.post(`/getContent`, {
        gameId: gameId,
        action: 'GetData',
        selectedDate: selectedDate.format("YYYY/MM/DD")
      });
      const realInputDOM = getRealTextAreaDOM(textAreaRef);
      processAndReplaceText(res.data.data, realInputDOM);
      setLoading(false);
      message.success('Đã get thành công!');
    } catch (err) {
      console.error(err);
      message.error('Lỗi lấy data ' + err.message);
      setLoading(false);
    }
  };

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

  const handleOpenPopup = async () => {
    if (!game) {
      message.warning('Vui lòng chọn game');
      return;
    }
    setIsPopupVisible(true);
    setIsPopupLoading(true);
    setPopupData(null);
    try {
      const response = await axios.post(`/show-data`, { gameId: game, startDate: searchDate.format("YYYY-MM-DD") });
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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, width: '100%' }}>
      <MenuLink activeKey="check" />
      <div style={{ marginBottom: '10px' }}>
        <Select
          showSearch
          filterOption={(input, option) => {
            const keyword = input.toLowerCase();
            const name = option.label?.toLowerCase?.() || '';
            return name.includes(keyword);
          }}
          style={{ width: '100%' }}
          placeholder="Chọn game (bắt buộc)"
          value={game}
          options={eventOptions}
          onChange={value => {
            setFoundEvents([]);
            setValue('')
            setGame(value)
            getContent(value);
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <DatePicker
          style={{ width: '100%' }}
          value={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          format="YYYY/MM/DD"
        />
        <Button onClick={() => { getContent(game); }} loading={loading}>
          Get
        </Button>
        <Button type="text" icon={<DatabaseOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenPopup(); }}>
          Data
        </Button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <TextArea
          value={value}
          autoSize={{ minRows: 3, maxRows: 100 }}
          onPaste={onManualPaste}
          ref={textAreaRef}
          onChange={async (e) => {
            setValue(e.target.value)
          }}
          placeholder="Paste vào đây, sẽ tự lọc ký tự không hợp lệ"
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Button
          danger
          disabled={loading}
          onClick={async () => {
            if (!game) {
              message.warning('Vui lòng chọn game');
              return;
            }
            if (value == '') {
              message.warning('Vui lòng điền nội dung cần check');
              setFoundEvents([]);
              return;
            }
            const lines = value.split(/\r?\n/);
            setLoading(true);
            try {
              const response = await axios.post(`/check_item`, { gameId: game, checkData: lines, selectedDate: selectedDate.format("YYYY/MM/DD") });
              const data = response.data;
              setFoundEvents(data.resultData);
              setLoading(false)
            } catch (error) {
              setLoading(false)
              console.log(error);
              setFoundEvents([]);
            }
          }}
        >
          Run Check
        </Button>
        <Button danger onClick={handleBtnPaste} disabled={loading}>
          Dán Nội Dung
        </Button>
        {loading && <LoadingOutlined />}
      </div>

      <List
  bordered
  dataSource={foundEvents}
  renderItem={(item) => (
    <List.Item
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '12px 16px',
      }}
    >
      {/* Hàng 1: Tiêu đề và Cụm Icon nằm cùng 1 hàng ngang */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', // Căn giữa theo chiều dọc để icon và chữ thẳng hàng
        width: '100%' 
      }}>
        {/* Tiêu đề bên trái */}
        <div style={{ 
          flex: 1, 
          fontWeight: 'bold', 
          fontSize: '14px', 
          wordBreak: 'break-word',
          paddingRight: '15px' 
        }}>
          {item.name}
        </div>
        
        {/* Cụm ID và Icon bên phải (Khung đỏ trong ảnh) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', // Khoảng cách giữa các icon
          flexShrink: 0 
        }}>
          {/* Chữ ID màu đỏ như ảnh */}
          <span style={{ color: 'red', fontWeight: '500', fontSize: '13px' }}>
            {item.id || 'ID'}
          </span>

          {item.viewImage && (
            <Button 
              type="text" 
              size="small" 
              style={{ padding: 0, height: 'auto' }}
              icon={<ExpandOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => window.open(item.viewImage, '_blank')} 
            />
          )}
          
          {item.url && (
            <Button 
              type="text" 
              size="small" 
              style={{ padding: 0, height: 'auto' }}
              icon={<EyeOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => window.open(item.url, '_blank')} 
            />
          )}

          {item.editLink && (
            <Button 
              type="text" 
              size="small" 
              style={{ padding: 0, height: 'auto' }}
              icon={<EditOutlined style={{ fontSize: '16px' }} />} 
              onClick={() => window.open(item.editLink, '_blank')} 
            />
          )}

          <Button
            type="text"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            icon={item.valid ? 
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} /> : 
              <CloseCircleOutlined style={{ color: '#f5222d', fontSize: '18px' }} />
            }
          />
        </div>
      </div>

      {/* Hàng 2: Khung thông tin bổ sung bên dưới */}
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        backgroundColor: '#fafafa', 
        borderRadius: '4px',
        border: '1px solid #f0f0f0',
        fontSize: '13px',
        color: '#888',
        minHeight: '36px'
      }}>
        {item.details || "Thông tin bổ sung hiển thị tại đây..."}
      </div>
    </List.Item>
  )}
/>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            <div style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>Dữ liệu</div>
            <div style={{ display: 'flex', gap: '8px' }} onMouseDown={e => e.stopPropagation()}>
              <DatePicker format="YYYY/MM/DD" style={{ width: '135px' }} value={searchDate} onChange={(date) => { setSearchDate(date); }} />
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
    </div>
  );
}