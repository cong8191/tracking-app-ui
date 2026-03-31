import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Spin, Empty, message } from 'antd';
import axios from './axios-config';

const SelectionPopup = ({ visible, onCancel, onSave, gameId, selectedDate }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState('');

  // 1. Tự động gọi API khi mở Popup hoặc đổi Game/Ngày
  useEffect(() => {
    if (visible) {
      // 1. QUAN TRỌNG: Clear sạch các checkbox đã tích từ lần trước
      setSelectedRowKeys([]); 
      
      // 2. Clear ô tìm kiếm về rỗng
      setSearchText('');

      // 3. Gọi API lấy dữ liệu mới nếu có GameId
      if (gameId) {
        fetchData();
      }
    }
  }, [visible, gameId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {

     

      console.log(`Đang gọi API cho Game: ${gameId} vào ngày: ${selectedDate}`);

       const response = await axios.post(`/get_event_suggest`, { gameId, selectedDate: selectedDate.format('YYYY/MM/DD')});

      const data = response.data.map(item => ({
        key: item.id,
        name: item.name,
        g_name: item.g_name,
        from: selectedDate.format('YYYY/MM/DD'),
        to: selectedDate.add(item.days_diff, "day").format('YYYY/MM/DD'),
        totalday: item.days_diff

      }));

      setData(data);
    } catch (error) {
      message.error("Không thể lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Tên sự kiện', dataIndex: 'name', key: 'name' , width: '150px'},
    { title: 'G', dataIndex: 'g_name', key: 'g_name', width: '150px' },
    { title: 'From', dataIndex: 'from', key: 'from', width: '100px'  },
    { title: 'To', dataIndex: 'to', key: 'to', width: '100px'  },
    { title: 'Total Day', dataIndex: 'totalday', key: 'totalday', width: '50px' },
  ];

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title={`Chọn sự kiện - ID Game: ${gameId}`}
      open={visible}
      onOk={() => {
        const selectedObjects = data.filter(item => selectedRowKeys.includes(item.key));
        onSave(selectedObjects);
        onCancel();
      }}
      onCancel={onCancel}
     width="auto"
     style={{ 
    maxWidth: '50vw', // Không vượt quá 90% chiều rộng màn hình
    minWidth: '400px' // Đảm bảo không quá nhỏ khi ít dữ liệu
  }}
      okText="Xác nhận"
      cancelText="Đóng"
    >
      <Spin spinning={loading}>
        <Input 
          placeholder="Tìm tên sự kiện..." 
          style={{ marginBottom: 16 }}
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
          }}
          columns={columns}
          dataSource={filteredData}
          pagination={false} 
          scroll={{ y: 400 }} 
          size="small"
          locale={{ emptyText: <Empty description="Không tìm thấy sự kiện" /> }}
        />
      </Spin>
    </Modal>
  );
};

export default SelectionPopup;