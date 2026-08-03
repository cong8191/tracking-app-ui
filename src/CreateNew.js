import { useEffect, useState } from 'react';
import { Input, Select, Button, message, Checkbox, DatePicker, Row, Col, AutoComplete, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from './axios-config';
import dayjs from 'dayjs';
import MenuLink from './MenuLink';

export default function CreateNew() {
  const [gameId, setGameId] = useState();
  const [game, setGame] = useState();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [eventOptions, setEventOptions] = useState([]);
  const [existingGalleries, setExistingGalleries] = useState([]);
  const [isContent, setContent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [urlEdit, setURLEdit] = useState(undefined);

  const fetcEventData = async (showToast = false) => {
    try {
      setRefreshLoading(true);
      const response = await axios.get(`/listGame`);
      setEventOptions(response.data.map((item) => {
        return { 'value': item.id, 'label': item.name }
      }));

      const eventsRes = await axios.get(`/events`);
      const responseData = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      setExistingGalleries(responseData.map((item) => ({
        value: item.name,
        label: item.g_name ? `${item.name} ( ${item.g_name} ) - ${item.gameName}` : `${item.name} - ${item.gameName}`,
        name: item.name,
        galleryId: item.gallery_id || item.id,
        gameId: item.gameId || item.game_id,
      })));
      if (showToast) message.success('Đã cập nhật danh sách mới nhất!');
    } catch (err) {
      console.error("❌ GET error:", err);
      if (showToast) message.error('Lỗi khi cập nhật dữ liệu!');
    } finally {
      setRefreshLoading(false);
    }
  };

  useEffect(() => {
    fetcEventData();
  }, []);

  const isDuplicate = existingGalleries.some(
    g => g.name?.trim().toLowerCase() === keyword?.trim().toLowerCase()
  );

  const handleSearch = async () => {
    if (!game) {
      message.warning('Vui lòng chọn game');
      return;
    }

    if (!keyword) { // Sửa logic check một chút cho chuẩn
      message.warning('Vui lòng nhập tên gallery');
      return;
    }

    setLoading(true);

    try {
      message.info(`Bắt đầu tạo gallery mới...`);

      const response = await axios.post(`/createNewGallery`, {
        gameId: game,
        galleryName: keyword,
        IsContent: isContent,
        publicDate: selectedDate.format("YYYY/MM/DD")
      });

      setURLEdit(response && response.data ? `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${response.data.result.gallery_id}` : undefined);

      setLoading(false);
      message.success('Tạo gallery mới thành công!');

    } catch (err) {
      console.error(err);
      message.error('Lỗi tạo gallery mới');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <MenuLink activeKey="create-gallery" />
      {/* Sử dụng Row và gutter để tạo khoảng cách giữa các phần tử */}
      <Row gutter={[16, 16]} style={{ marginLeft: 0, marginRight: 0 }}> 

        
        {/* Game Select: Mobile chiếm hết (24), Desktop chiếm 1 phần (6) */}
        {!gameId && (
          <Col xs={24} md={6} lg={5}>
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
              onChange={value => setGame(value)}
            />
          </Col>
        )}

        {/* Input / AutoComplete Name */}
        <Col xs={24} md={6} lg={6}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AutoComplete
              options={existingGalleries}
              value={keyword}
              onChange={val => setKeyword(val)}
              onSelect={(val, option) => {
                setKeyword(option.name || val);
              }}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
              placeholder="Tên gallery (bắt buộc)"
              allowClear
              style={{ flex: 1 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetcEventData(true)} loading={refreshLoading} title="Tải lại danh sách Gallery" />
          </div>
          {isDuplicate && (
            <div style={{ marginTop: 4 }}>
              <Tag color="warning">⚠️ Gallery này đã tồn tại</Tag>
            </div>
          )}
        </Col>

        {/* Date Picker */}
        <Col xs={24} md={5} lg={4}>
          <DatePicker
            style={{ width: '100%' }}
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="YYYY/MM/DD"
          />
        </Col>

        {/* Checkbox */}
        <Col xs={24} md={3} lg={3} style={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox checked={isContent} onChange={e => setContent(e.target.checked)}>
            Content
          </Checkbox>
        </Col>

        {/* Button */}
        <Col xs={24} md={4} lg={4}>
          <Button type="primary" onClick={handleSearch} loading={loading} block>
            Create New
          </Button>
        </Col>

        {/* Link Edit (hiện khi có kết quả) */}
        {urlEdit && (
          <Col xs={24}>
            <div style={{ marginTop: 8 }}>
              <a href={urlEdit} target="_blank" rel="noopener noreferrer">👉 Edit Gallery Here</a>
            </div>
          </Col>
        )}

      </Row>
    </div>
  );
}