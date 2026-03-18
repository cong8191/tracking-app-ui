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
    // fetcEventData();
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
  // --- Hàm xử lý logic chính (Tách ra để dùng chung) ---
  const processAndReplaceText = (rawInput, targetElement) => {
    // 1. Kiểm tra an toàn: Nếu không tìm thấy ô nhập liệu thì dừng
    if (!targetElement) return;

    // 2. Xử lý nội dung (giữ nguyên logic lọc link của bạn)
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

    // 3. THAY THẾ TOÀN BỘ GIÁ TRỊ (Không cần tính toán vị trí con trỏ)

    // Cách này giúp React nhận biết được sự thay đổi (trigger onChange)
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;

    setter.call(targetElement, finalText);

    // Bắn sự kiện input để cập nhật state của React
    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const getRealTextAreaDOM = (ref) => {
    // 1. Kiểm tra cơ bản
    if (!ref || !ref.current) return null;

    const instance = ref.current;

    // 2. CASE CHUẨN (Dựa trên ảnh bạn gửi):
    // Đi vào: ref.current -> resizableTextArea -> textArea
    if (instance.resizableTextArea && instance.resizableTextArea.textArea) {
      return instance.resizableTextArea.textArea;
    }

    // 3. CASE DỰ PHÒNG (Cho một số phiên bản Antd cũ/lạ):
    // Đôi khi thẻ thật nằm ngay ở property 'textArea' của resizableTextArea (nếu nó là object)
    // Hoặc nằm ở instance.input
    if (instance.input) return instance.input;

    // 4. CASE CỰC ĐOAN: Dùng querySelector tìm thẻ textarea bên trong wrapper
    // Nếu instance là một HTML Element (div wrapper)
    if (instance instanceof HTMLElement) {
      return instance.querySelector('textarea') || instance;
    }

    // Nếu instance là React Component, thử tìm node DOM của nó (nếu có thể)
    // Nhưng thường Case 2 ở trên là đã bắt trúng rồi.

    return null;
  };

  // --- Sự kiện 1: Khi bấm nút "Dán từ Clipboard" ---
  const handleBtnPaste = async () => {
    try {
      // Lệnh này sẽ kích hoạt popup xin quyền trên Android
      const text = await navigator.clipboard.readText();

      // Tìm thẻ thật
      const realInputDOM = getRealTextAreaDOM(textAreaRef);

      processAndReplaceText(text, realInputDOM);
    } catch (err) {
      console.error('Không thể đọc clipboard:', err);
      alert("Vui lòng cấp quyền clipboard hoặc dùng HTTPS!");
    }
  };

  // --- Sự kiện 2: Khi người dùng Paste thủ công (Long press) ---
  const onManualPaste = (e) => {
    e.preventDefault();
    // Vẫn dùng logic fallback lấy HTML/Text như câu trả lời trước
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

            // setValue(res.data.data);
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
    <div
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: 20,
        width: '100%' // Cho phép co giãn theo màn hình
      }}
    >
      <MenuLink activeKey="check" />
      <div style={{ marginBottom: '10px' }}>
        <Select
          showSearch
          filterOption={(input, option) => {
            const keyword = input.toLowerCase();
            const name = option.label?.toLowerCase?.() || '';
            return name.includes(keyword);
          }}
          style={{ width: '100%' }} // Quan trọng: width 100% để ăn theo Col
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
       <div style={{ display: 'flex', gap: '10px' }}>
<DatePicker
                        style={{ width: '100%' }}
                        value={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        format="YYYY/MM/DD"
                    />
                      <Button  onClick={()=>{
                        getContent(game);
                      }} loading={loading}>
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

            const value = e.target.value;
            // const lines = value.split(/\r?\n/);
            setValue(value)
           
          }}
          placeholder="Paste vào đây, sẽ tự lọc ký tự không hợp lệ"
        />
      </div>
      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16
        }}
      >
        <Button
          danger
          disabled={loading}
          onClick={async () => {
            if (!game) {
              message.warning('Vui lòng chọn game');
              return;
            }

            // const value = e.target.value;
           
            // setValue(value)
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
        <Button
          danger
          onClick={handleBtnPaste}
          disabled={loading}
        >
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
              justifyContent: 'space-between',
              alignItems: 'flex-start', // phần text dài có thể xuống dòng
              paddingTop: 8,
              paddingBottom: 8
            }}
          >
            <div style={{ flex: 1, wordBreak: 'break-word' }}>
              {item.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               {item.url && (
                <Button
                  type="text"
                  icon={<ExpandOutlined />}
                  onClick={() => window.open(item.viewImage, '_blank')}
                />
              )}
              {item.url && (
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => window.open(item.url, '_blank')}
                />
              )}
              {item.editLink && (
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => window.open(item.editLink, '_blank')}
                />
              )}

              <Button
                type="text"
                icon={item.valid ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />}

              />

            </div>
          </List.Item>
        )}
      />
    <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
            <div style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
             
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
    </div>
    
    

  );
}
