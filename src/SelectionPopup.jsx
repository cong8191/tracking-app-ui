import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Spin, Empty, message } from 'antd';

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
      
      // GIẢ LẬP GỌI API (DUMP DATA)
      await new Promise(resolve => setTimeout(resolve, 800)); 
      const mockData = [
        { key: 'ev1', name: 'River of Riches', type: 'Event' },
        { key: 'ev2', name: 'Keeping it Reel', type: 'Mini Game' },
        { key: 'ev3', name: 'Present Pursuit', type: 'Limited' },
        { key: 'ev4', name: 'Treasure Quest', type: 'Quest' },
        { key: 'ev5', name: 'Gilly Panda', type: 'Rescue' },
      ];
      
      setData(mockData);
    } catch (error) {
      message.error("Không thể lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Tên sự kiện', dataIndex: 'name', key: 'name' },
    { title: 'Phân loại', dataIndex: 'type', key: 'type' },
  ];

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      title={`Chọn sự kiện - ID Game: ${gameId}`}
      open={visible}
      onOk={() => {
        onSave(selectedRowKeys);
        onCancel();
      }}
      onCancel={onCancel}
      width={600}
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