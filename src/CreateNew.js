import { useEffect, useState } from 'react';
import { Input, Select, Button, message, Checkbox, DatePicker, Row, Col } from 'antd'; // Import thêm Row, Col
import axios from './axios-config';
import dayjs from 'dayjs';
import MenuLink from './MenuLink';

export default function CreateNew() {
  const [gameId, setGameId] = useState();
  const [game, setGame] = useState();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventOptions, setEventOptions] = useState([]);
  const [isContent, setContent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [urlEdit, setURLEdit] = useState(undefined);

  const fetcEventData = async () => {
    try {
      const response = await axios.get(`/listGame`);
      setEventOptions(response.data.map((item) => {
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
    <div style={{ padding: 16, maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
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

        {/* Input Name */}
        <Col xs={24} md={6} lg={5}>
          <Input
            placeholder="Tên gallery (bắt buộc)"
            style={{ width: '100%' }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
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