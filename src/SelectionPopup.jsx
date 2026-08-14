import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Input, Spin, Empty, Collapse, Tag, Typography, Button, Space, message } from 'antd';
import { SearchOutlined, BulbOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from './axios-config';

const { Panel } = Collapse;
const { Text } = Typography;

// --- HÀM LẤY TÊN THỨ TRONG TUẦN (TIẾNG VIỆT) ---
const getVietnameseDayName = (dateObj) => {
  const dayIndex = dateObj.day(); // 0: Chủ nhật, 1: Thứ hai, ..., 6: Thứ bảy
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return dayNames[dayIndex];
};

// --- HÀM HỖ TRỢ GOM NHÓM NẾU API TRẢ VỀ DẠNG MẢNG PHẲNG (FLAT ARRAY) ---
const parseFlatDataToGroups = (flatArray, baseDate) => {
  const currentDate = baseDate ? dayjs(baseDate) : dayjs();

  const lastWeekDate = currentDate.subtract(7, 'day');
  const twoWeeksAgoDate = currentDate.subtract(14, 'day');

  const groupsMap = {
    'last-week': {
      key: 'last-week',
      title: `📅 ${getVietnameseDayName(lastWeekDate)} (Tuần trước)`,
      badgeTag: '1 tuần trước',
      dateStr: lastWeekDate.format('DD/MM/YYYY'),
      events: []
    },
    'two-weeks-ago': {
      key: 'two-weeks-ago',
      title: `📅 ${getVietnameseDayName(twoWeeksAgoDate)} (2 tuần trước)`,
      badgeTag: '2 tuần trước',
      dateStr: twoWeeksAgoDate.format('DD/MM/YYYY'),
      events: []
    }
  };

  for (let idx = 1; idx <= 7; idx++) {
    const targetDate = currentDate.subtract(idx, 'day');
    const dayName = getVietnameseDayName(targetDate);
    const note = idx === 1 ? 'Hôm qua' : idx === 2 ? 'Hôm kia' : `-${idx} ngày`;
    const key = `day-back-${idx}`;

    groupsMap[key] = {
      key: key,
      title: `🗓️ ${dayName} (${note})`,
      badgeTag: `-${idx} ngày`,
      dateStr: targetDate.format('DD/MM/YYYY'),
      events: []
    };
  }

  flatArray.forEach((item, i) => {
    const realId = item.id || item.event_id || `evt-${i}`;
    const groupKey = item.group_key || item.group_type || 
      (item.days_back === 7 ? 'last-week' : 
       item.days_back === 14 ? 'two-weeks-ago' : 
       item.days_back ? `day-back-${item.days_back}` : 'last-week');
    const itemKey = `suggest-${groupKey}-${realId}-${i}`;

    const formattedItem = {
      ...item,
      key: itemKey,
      id: realId,
      name: item.name,
      g_name: item.g_name || item.related_name || '',
      from: item.from || item.start_date || currentDate.format('YYYY/MM/DD'),
      to: item.to || item.end_date || currentDate.format('YYYY/MM/DD'),
      totalday: item.totalday || item.days_diff || item.default_day || 1
    };

    if (groupsMap[groupKey]) {
      groupsMap[groupKey].events.push(formattedItem);
    } else {
      groupsMap['last-week'].events.push(formattedItem);
    }
  });

  return Object.values(groupsMap);
};

// --- HÀM TẠO DỮ LIỆU MOCK DỰ PHÒNG THEO NGÀY ĐƯỢC CHỌN ---
const generateMockGroups = (baseDate) => {
  const currentDate = baseDate ? dayjs(baseDate) : dayjs();

  const sampleEvents = [
    { id: '101', name: 'Deal Promotion', g_name: '', defaultDays: 2 },
    { id: '102', name: 'Honor Challenge', g_name: '', defaultDays: 6 },
    { id: '103', name: 'Lost Revenant', g_name: '', defaultDays: 2 },
    { id: '104', name: 'Draconic Trove', g_name: '', defaultDays: 13 },
    { id: '105', name: 'Masked Revelry', g_name: 'Chasing Trickster Treats', defaultDays: 6 },
    { id: '106', name: 'Party Frenzy', g_name: 'Pirate Gifts', defaultDays: 6 },
    { id: '107', name: 'Lucky Treasure Hunt', g_name: '', defaultDays: 6 },
    { id: '108', name: 'Heroes Descend', g_name: 'Heroes Descend', defaultDays: 2 },
  ];

  const buildGroupEvents = (targetDate, groupPrefix) => {
    const formattedFrom = targetDate.format('YYYY/MM/DD');
    return sampleEvents.map((sample) => {
      const days = sample.defaultDays;
      const formattedTo = targetDate.add(days, 'day').format('YYYY/MM/DD');
      const uniqueKey = `mock-${groupPrefix}-${sample.id}-${targetDate.format('MMDD')}`;

      return {
        key: uniqueKey,
        id: sample.id,
        name: sample.name,
        g_name: sample.g_name,
        from: formattedFrom,
        to: formattedTo,
        totalday: days,
      };
    });
  };

  const lastWeekDate = currentDate.subtract(7, 'day');
  const twoWeeksAgoDate = currentDate.subtract(14, 'day');

  const groups = [
    {
      key: 'last-week',
      title: `📅 ${getVietnameseDayName(lastWeekDate)} (Tuần trước)`,
      badgeTag: '1 tuần trước',
      dateStr: lastWeekDate.format('DD/MM/YYYY'),
      dateObj: lastWeekDate,
      events: buildGroupEvents(lastWeekDate, 1),
    },
    {
      key: 'two-weeks-ago',
      title: `📅 ${getVietnameseDayName(twoWeeksAgoDate)} (2 tuần trước)`,
      badgeTag: '2 tuần trước',
      dateStr: twoWeeksAgoDate.format('DD/MM/YYYY'),
      dateObj: twoWeeksAgoDate,
      events: buildGroupEvents(twoWeeksAgoDate, 2),
    },
    ...Array.from({ length: 7 }, (_, idx) => {
      const daysBack = idx + 1;
      const targetDate = currentDate.subtract(daysBack, 'day');
      const dayName = getVietnameseDayName(targetDate);
      const note = daysBack === 1 ? 'Hôm qua' : daysBack === 2 ? 'Hôm kia' : `-${daysBack} ngày`;

      return {
        key: `day-back-${daysBack}`,
        title: `🗓️ ${dayName} (${note})`,
        badgeTag: `-${daysBack} ngày`,
        dateStr: targetDate.format('DD/MM/YYYY'),
        dateObj: targetDate,
        events: buildGroupEvents(targetDate, 10 + daysBack),
      };
    }),
  ];

  return groups;
};

const SelectionPopup = ({ visible, onCancel, onSave, gameId, selectedDate, existingEvents = [], sectionEvents = [] }) => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedObjectsMap, setSelectedObjectsMap] = useState({});
  const [groupsData, setGroupsData] = useState([]);
  const [activeCollapseKeys, setActiveCollapseKeys] = useState(['last-week', 'two-weeks-ago', 'day-back-1']);

  // Tập hợp các Tên sự kiện đã có ở danh sách bên dưới
  const existingEventNameSet = useMemo(() => {
    const set = new Set();

    // Map id -> name từ sectionEvents nếu có
    const idToNameMap = {};
    if (Array.isArray(sectionEvents)) {
      sectionEvents.forEach((e) => {
        if (e.id && e.name) {
          idToNameMap[String(e.id)] = e.name.trim().toLowerCase();
        }
      });
    }

    if (Array.isArray(existingEvents)) {
      existingEvents.forEach((item) => {
        if (!item.isDelete) {
          if (item.name) {
            set.add(item.name.trim().toLowerCase());
          }
          if (item.event_id && idToNameMap[String(item.event_id)]) {
            set.add(idToNameMap[String(item.event_id)]);
          }
          if (item.id && idToNameMap[String(item.id)]) {
            set.add(idToNameMap[String(item.id)]);
          }
        }
      });
    }

    return set;
  }, [existingEvents, sectionEvents]);

  // Kiểm tra 1 dòng sự kiện đã được thêm bên dưới hay chưa (Chỉ đối chiếu Tên sự kiện)
  const isAlreadyAdded = (record) => {
    if (!record || !record.name) return false;
    const nameClean = record.name.trim().toLowerCase();
    return existingEventNameSet.has(nameClean);
  };

  useEffect(() => {
    if (visible) {
      setSelectedRowKeys([]);
      setSelectedObjectsMap({});
      setSearchText('');
      setGroupsData([]); // Clear dữ liệu cũ ngay khi mở Modal

      if (gameId) {
        fetchData();
      } else {
        const mockGroups = generateMockGroups(selectedDate);
        setGroupsData(mockGroups);
        setActiveCollapseKeys(['last-week', 'two-weeks-ago', 'day-back-1']);
      }
    }
  }, [visible, gameId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const formattedDate = selectedDate ? dayjs(selectedDate).format('YYYY/MM/DD') : dayjs().format('YYYY/MM/DD');
      console.log(`📡 Calling API /get_event_suggest for gameId: ${gameId}, selectedDate: ${formattedDate}`);

      const response = await axios.post(`/get_event_suggest`, {
        gameId: gameId,
        selectedDate: formattedDate,
      });

      const resData = response.data;
      const dataArray = Array.isArray(resData) ? resData : (resData?.result || resData?.data || []);

      if (dataArray.length > 0) {
        if (dataArray[0].events && Array.isArray(dataArray[0].events)) {
          const sanitizedGroups = dataArray.map((group) => ({
            ...group,
            events: (group.events || []).map((item, i) => ({
              ...item,
              key: item.key || item.id || `suggest-${group.key}-${i}`,
              id: item.id || item.key || item.name,
            })),
          }));
          setGroupsData(sanitizedGroups);
          setActiveCollapseKeys(sanitizedGroups.map((g) => g.key));
        } else {
          const parsedGroups = parseFlatDataToGroups(dataArray, selectedDate);
          setGroupsData(parsedGroups);
          setActiveCollapseKeys(parsedGroups.map((g) => g.key));
        }
      } else {
        // Nếu API trả về mảng rỗng [], để trống hoàn toàn
        console.log("ℹ️ API trả về mảng rỗng [], để trống hoàn toàn.");
        setGroupsData([]);
        setActiveCollapseKeys([]);
      }
    } catch (error) {
      console.warn("⚠️ API /get_event_suggest gặp lỗi mạng hoặc 404, sử dụng dữ liệu Mock:", error);
      const mockGroups = generateMockGroups(selectedDate);
      setGroupsData(mockGroups);
      setActiveCollapseKeys(['last-week', 'two-weeks-ago', 'day-back-1']);
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình cột bảng
  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const added = isAlreadyAdded(record);
        return (
          <Space>
            <span style={{ color: added ? '#bfbfbf' : '#262626', textDecoration: added ? 'line-through' : 'none' }}>
              {text}
            </span>
            {added && <Tag color="default" style={{ fontSize: 11, margin: 0 }}>Đã có</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'G',
      dataIndex: 'g_name',
      key: 'g_name',
      width: 180,
      render: (text, record) => {
        const added = isAlreadyAdded(record);
        return text ? <span style={{ color: added ? '#bfbfbf' : '#262626' }}>{text}</span> : '-';
      },
    },
    {
      title: 'From',
      dataIndex: 'from',
      key: 'from',
      width: 100,
      align: 'center',
    },
    {
      title: 'To',
      dataIndex: 'to',
      key: 'to',
      width: 100,
      align: 'center',
    },
    {
      title: 'Total Day',
      dataIndex: 'totalday',
      key: 'totalday',
      width: 85,
      align: 'center',
      render: (val) => val ? `${val} ngày` : '-',
    },
  ];

  // Lọc tìm kiếm (Ẩn hoàn toàn các Panel/Grid không có sự kiện khớp để tiết kiệm diện tích)
  const filteredGroups = useMemo(() => {
    const validGroups = groupsData.filter((g) => (g.events || []).length > 0);
    if (!searchText.trim()) return validGroups;

    const lowerSearch = searchText.toLowerCase();
    return validGroups
      .map((group) => {
        const filteredEvents = (group.events || []).filter(
          (evt) =>
            (evt.name && evt.name.toLowerCase().includes(lowerSearch)) ||
            (evt.g_name && evt.g_name.toLowerCase().includes(lowerSearch))
        );
        return {
          ...group,
          events: filteredEvents,
        };
      })
      .filter((group) => group.events.length > 0);
  }, [groupsData, searchText]);

  // Xử lý khi click vào từng Checkbox sự kiện: Đồng bộ tất cả các group có CÙNG TÊN SỰ KIỆN
  const handleSingleRowSelect = (record, selected) => {
    if (!record || !record.name) return;
    const targetNameClean = record.name.trim().toLowerCase();

    // Tìm tất cả các row key thuộc các sự kiện có CÙNG TÊN trên mọi Collapse Panel
    const allMatchingKeys = [];
    groupsData.forEach((group) => {
      (group.events || []).forEach((e) => {
        if (e.name && e.name.trim().toLowerCase() === targetNameClean) {
          allMatchingKeys.push(e.key);
        }
      });
    });

    if (selected) {
      // Đánh dấu check đồng bộ tất cả nhóm có cùng tên sự kiện này
      setSelectedRowKeys((prevKeys) => [...new Set([...prevKeys, ...allMatchingKeys])]);
      setSelectedObjectsMap((prevMap) => ({
        ...prevMap,
        [targetNameClean]: record,
      }));
    } else {
      // Bỏ check đồng bộ tất cả nhóm có cùng tên sự kiện này
      const matchingKeySet = new Set(allMatchingKeys);
      setSelectedRowKeys((prevKeys) => prevKeys.filter((k) => !matchingKeySet.has(k)));
      setSelectedObjectsMap((prevMap) => {
        const newMap = { ...prevMap };
        delete newMap[targetNameClean];
        return newMap;
      });
    }
  };

  // Xác nhận và lưu các sự kiện đã chọn
  const handleSaveConfirm = () => {
    const selectedObjects = Object.values(selectedObjectsMap);
    onSave(selectedObjects);
    onCancel();
  };

  // Tổng số sự kiện duy nhất được chọn
  const uniqueSelectedCount = Object.keys(selectedObjectsMap).length;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24 }}>
          <BulbOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>
            Gợi ý sự kiện {gameId ? `- Game ID: ${gameId}` : ''}
          </span>
        </div>
      }
      open={visible}
      onOk={handleSaveConfirm}
      onCancel={onCancel}
      width="90vw"
      style={{ maxWidth: '850px', top: 20 }}
      okText={`Xác nhận thêm (${uniqueSelectedCount})`}
      cancelText="Hủy bỏ"
      okButtonProps={{ disabled: uniqueSelectedCount === 0 }}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Tìm kiếm sự kiện theo tên hoặc nhóm..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ flex: 1, minWidth: 260 }}
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            📅 Ngày mốc: <b>{selectedDate ? dayjs(selectedDate).format('YYYY/MM/DD') : dayjs().format('YYYY/MM/DD')}</b>
          </Text>
        </div>

        <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
          {groupsData.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có sự kiện gợi ý nào"
              style={{ margin: '40px 0' }}
            />
          ) : filteredGroups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không tìm thấy sự kiện phù hợp"
              style={{ margin: '40px 0' }}
            />
          ) : (
            <Collapse activeKey={activeCollapseKeys} onChange={setActiveCollapseKeys} style={{ background: '#fafafa' }}>
            {filteredGroups.map((group) => {
              // Số lượng sự kiện trong panel này đã được check
              const groupCheckedCount = group.events.filter((e) => selectedRowKeys.includes(e.key)).length;

              return (
                <Panel
                  key={group.key}
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{group.title}</span>
                        <Tag color="blue">{group.dateStr}</Tag>
                        <Tag color="cyan">{group.badgeTag}</Tag>
                      </div>
                      <div style={{ marginRight: 16 }}>
                        {groupCheckedCount > 0 ? (
                          <Tag color="green">Đã chọn ({groupCheckedCount})</Tag>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>({group.events.length} gợi ý)</Text>
                        )}
                      </div>
                    </div>
                  }
                >
                  {group.events.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy sự kiện phù hợp" />
                  ) : (
                    <Table
                      rowSelection={{
                        type: 'checkbox',
                        hideSelectAll: true, // Bỏ nút check tổng trên tiêu đề bảng
                        getCheckboxProps: (record) => ({
                          disabled: isAlreadyAdded(record), // Vô hiệu hóa checkbox nếu sự kiện đã có bên dưới
                        }),
                        selectedRowKeys: group.events
                          .map((e) => e.key)
                          .filter((k) => selectedRowKeys.includes(k)),
                        onSelect: (record, selected) => handleSingleRowSelect(record, selected),
                      }}
                      columns={columns}
                      dataSource={group.events}
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 600 }}
                    />
                  )}
                </Panel>
              );
            })}
          </Collapse>
          )}
        </div>
      </Spin>
    </Modal>
  );
};

export default SelectionPopup;