import { useEffect, useRef, useState } from 'react';
import {
  Button,
  List,
  message,
  Select,
  Typography,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import axios from './axios-config';
import TextArea from 'antd/es/input/TextArea';
import MenuLink from './MenuLink';

export default function CheckItem() {
  const [loading, setLoading] = useState(false);

  const [game, setGame] = useState();


  const [eventOptions, setEventOptions] = useState([]);
  const textAreaRef = useRef(null);


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
          }}
        />
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
            const lines = value.split(/\r?\n/);
            // setValue(value)
            if (lines.length == 0) {
              message.warning('Vui lòng điền nội dung cần check');
              setFoundEvents([]);
            }

            setLoading(true);
            try {
              const response = await axios.post(`/check_item`, { gameId: game, checkData: lines });
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

    </div>

  );
}
