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
    setLoadingId(record.href);
    try {
      const response = await axios.post(`/get-gallery-info`, { gameId: game, galleryName: record.title});
      const data = response.data;
      const ifo = {...info};
      
      const list = (record.sub?.split(',').map(item => item.trim()) || []);
      list.push(cutString(record.title));
      

      ifo[index] = {...data, title: cutString(record.title) , events: list.filter((kw) =>
    kw.toLowerCase().includes(keyword.toLowerCase())
    ) };
      if(returnParent) {
        returnParent(ifo[index])
        return;
      }
      setInfo(ifo);
      message.success(`ID của "${record.title}" là: ${data.id}`);
    } catch (err) {
      message.error('Không lấy được ID', err);
    } finally {
      setLoadingId(null);
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
<Button
          loading={loadingId === record.href}
          onClick={() => handleFetchId(index,record)}
        >
          Lấy ID 
        </Button>
       {info?.[index] && (
        <div>
            <div style={{ marginTop: '10px'}}>
            ID:   {info[index]?.id}
        </div>
        {info[index]?.events?.map(name=>(
             <div>{name}  </div>
        ))}
       
            </div>
        
        )} 
        </div>
        
        
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <MenuLink activeKey="search" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {!gameId && (
          <Select showSearch
          filterOption={(input, option) => {
    const keyword = input.toLowerCase();
    const name = option.label?.toLowerCase?.() || '';

    return name.includes(keyword);
  }}
          style={{ width: 200 }}
          placeholder="Chọn game (bắt buộc)"
          value={game}
          options={eventOptions}
          onChange={value => setGame(value)}
        >
        </Select>
        )}
        
        <Input
          placeholder="Tìm theo từ khoá"
          style={{ width: 200 }}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <Button type="primary" onClick={handleSearch} loading={loading}>
          Tìm kiếm
        </Button>
      </div>
      <Spin spinning={loading} tip="Đang tìm kiếm...">
        <Table rowKey="href" dataSource={data} columns={columns} pagination={false} />
      </Spin>
    </div>
  );
}