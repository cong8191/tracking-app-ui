import React, { useEffect, useState } from 'react';
import { Table, Input, Select, Button, message, Spin } from 'antd';
import axios from './axios-config';
import MenuLink from './MenuLink';


export default function SearchableTable({gameId, returnParent}) {
  const [game, setGame] = useState(gameId);
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [eventOptions, setEventOptions] = useState([]);
  const [info, setInfo] = useState({});
  

  const fetcEventData = async () => {
    try {
      const response = await axios.get(`/listGame`);
      setEventOptions(response.data.map((item)=> {
        return { 'value': item.id, 'label': item.name }
      }))
    } catch (err) {
      console.error("❌ GET error:", err);
    }
  };

   useEffect(() => {
    fetcEventData();
  }, []);

  const handleSearch = async () => {
    if (!game) {
      message.warning('Vui lòng chọn game');
      return;
    }

    if(gameId && !keyword) {
      message.warning('Vui lòng nhập từ khóa');
      return;
    }

    setLoading(true);
    setData([]); // Clear table trước khi có kết quả
    setInfo({});

    try {
      // Gọi API tìm kiếm thật ở đây nếu cần
      message.info(`Bat dau search`);

      // Giả lập độ trễ tìm kiếm
      const response = await axios.post(`/search-gallery`, { gameId: game, search_keyword: keyword});
           
     setData(response.data);
     setLoading(false);

    } catch (err) {
      message.error('Lỗi khi tìm kiếm');
      setLoading(false);
    }
  };

  function cutString(str) {
  const lastDashIndex = str.lastIndexOf('-');
  if (lastDashIndex === -1) {
    return str; // Nếu không có dấu "-", giữ nguyên chuỗi
  }
  // Cắt từ đầu đến trước dấu "-" cuối cùng
  return str.slice(0, lastDashIndex).trim();
}

  const handleFetchId = async (index,record) => {
    if(returnParent) {
        returnParent(record)
        return;
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
       render: (text, record) => (
        <a href={record.href} target="_blank" rel="noopener noreferrer">{text}</a>
      ),
    },
    {
      title: 'Subtitle',
      dataIndex: 'sub',
      key: 'sub',
    },
    {
      title: 'Actions',
      minWidth: '150px',
      key: 'actions',
      render: (_, record, index) => (
        
        <div>
           <Text copyable={{ text: record.id}}>{record.id}</Text>
           {returnParent && (
              <Button
          loading={loadingId === record.href}
          onClick={() => handleFetchId(index,record)}
        >
          Lấy ID 
        </Button>
           )}

        </div>
        
        
      ),
    },
  ];

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <MenuLink activeKey="search" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {!gameId && (
          <Select showSearch
            filterOption={(input, option) => {
              const keyword = input.toLowerCase();
              const name = option.label?.toLowerCase?.() || '';
              return name.includes(keyword);
            }}
            style={{ flex: '1 1 150px', minWidth: 0 }}
            placeholder="Chọn game (bắt buộc)"
            value={game}
            options={eventOptions}
            onChange={value => setGame(value)}
          >
          </Select>
        )}
        
        <Input
          placeholder="Tìm theo từ khoá"
          style={{ flex: '1 1 150px', minWidth: 0 }}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <Button type="primary" onClick={handleSearch} loading={loading}>
          Tìm kiếm
        </Button>
      </div>
      <Spin spinning={loading} tip="Đang tìm kiếm...">
        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Table rowKey="href" dataSource={data} columns={columns} pagination={false} />
        </div>
      </Spin>
    </div>
  );
}