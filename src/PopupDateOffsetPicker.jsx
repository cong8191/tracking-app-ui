import { useState, useEffect } from 'react';
import { Button, Calendar, InputNumber, Space } from 'antd';
import dayjs from 'dayjs';
import { CloseOutlined } from '@ant-design/icons';

export default function PopupDateOffsetPicker({ selectedDate, onChange , onClose}) {
  console.log(selectedDate?.format("YYYY/MM/DD") || '');
  // (dayjs(selectedDate) || dayjs()).startOf('day').diff(dayjs().startOf('day'), 'day')
  const [baseDate] = useState(dayjs()); // ngày gốc hôm nay
  const [offset, setOffset] = useState({ day: selectedDate ? selectedDate.diff(dayjs().startOf('day'), 'day') : 0, hour: 0, minute: 0 });
  const [resultDate, setResultDate] = useState(baseDate);

  // Tính ngày mới mỗi khi offset thay đổi
  useEffect(() => {
    const calculated = baseDate
      .add(offset.day, 'day')
      .add(offset.hour, 'hour')
      .add(offset.minute, 'minute');
    setResultDate(calculated);
    onChange?.(calculated);
  }, [offset]);

  return (
    <div style={{ padding: 10, width: 330 }}>
      <Space style={{ marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 'bold' }}>Day</div>
          <InputNumber controls={true} value={offset.day} onChange={(v) => setOffset(o => ({ ...o, day: v ?? 0 }))} />
        </div>
        <div>
          <div style={{ fontWeight: 'bold' }}>Hour</div>
          <InputNumber controls={true} value={offset.hour} onChange={(v) => setOffset(o => ({ ...o, hour: v ?? 0 }))} />
        </div>
        <div>
          <div style={{ fontWeight: 'bold' }}>Minute</div>
          <InputNumber controls={true} value={offset.minute} onChange={(v) => setOffset(o => ({ ...o, minute: v ?? 0 }))} />
        </div>
        <Button icon={<CloseOutlined />} onClick={()=>{
          onClose();
        }}></Button>

      </Space>

      <Calendar format="YYYY/MM/DD"
       disabledDate={(current) => current && current < dayjs()}
        fullscreen={false}
        value={resultDate}
        // headerRender={() => null} // ẩn header nếu muốn
        onSelect={(selected) => {
          const dayDiff = selected.startOf('day').diff(baseDate.startOf('day'), 'day');
          const hour = 0;
          const minute = 0;
          setOffset({ day: dayDiff, hour, minute });

          onClose();
        }}
      />
    </div>
  );
}
