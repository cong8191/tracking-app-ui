import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Input,
  Select,
  Button,
  message,
  DatePicker,
  Row,
  Col,
  Tag,
  Card,
  Alert,
  Modal,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExpandOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import axios from './axios-config';
import dayjs from 'dayjs';
import MenuLink from './MenuLink';
import ViewImage from './ViewImage';
import localOptionsData from './data/options.json';

const FormLabel = ({ label }) => (
  <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
    {label} <span style={{ color: '#ef4444' }}>*</span>
  </div>
);

// Format helper to capitalize branch name (e.g. 'events' -> 'Events')
const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '');

// Chuẩn hóa chuỗi để so khớp Game sang App
const normalizeName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function CreateNew() {
  // Chọn Game & Date bộ lọc toàn cục
  const [selectedGame, setSelectedGame] = useState();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [gameList, setGameList] = useState([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [fromDate, setFromDate] = useState(dayjs());
  const [toDate, setToDate] = useState();
  const [app, setApp] = useState();
  const [category, setCategory] = useState();
  const [mechanic, setMechanic] = useState();
  const [dynamics, setDynamics] = useState();
  const [rewardTypes, setRewardTypes] = useState();

  // Search queries for dropdowns to allow custom additions
  const [catSearch, setCatSearch] = useState('');
  const [mechSearch, setMechSearch] = useState('');
  const [dynSearch, setDynSearch] = useState('');
  const [rewSearch, setRewSearch] = useState('');

  // Options state (initialized with local options.json, ready for API override later)
  const [rawOptions, setRawOptions] = useState(localOptionsData || {});
  const [categoryList, setCategoryList] = useState([]);
  const [mechanicList, setMechanicList] = useState([]);
  const [dynamicsList, setDynamicsList] = useState([]);
  const [rewardTypesList, setRewardTypesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [urlEdit, setURLEdit] = useState(undefined);
  const [submittedLog, setSubmittedLog] = useState(null);

  // Modal xem ảnh gallery
  const [viewImageModal, setViewImageModal] = useState({ open: false, galleryId: null });

  // Grid danh sách các release
  const [createdList, setCreatedList] = useState(() => {
    try {
      const saved = localStorage.getItem('created_releases_grid');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('created_releases_grid', JSON.stringify(createdList));
    } catch (e) {}
  }, [createdList]);

  // Format apps from options.apps
  const appOptions = useMemo(() => {
    const apps = rawOptions?.apps || [];
    return apps.map((item) => ({
      value: item.id,
      label: item.name,
      name: item.name,
    }));
  }, [rawOptions]);

  // Initialize option lists from rawOptions (data.json)
  useEffect(() => {
    if (rawOptions) {
      // 1. Categories (branches: Events, Features, Content, Seasons)
      if (Array.isArray(rawOptions.mechanicCategories)) {
        const uniqueBranches = Array.from(
          new Set(rawOptions.mechanicCategories.map((m) => capitalize(m.branch)))
        ).filter(Boolean);
        setCategoryList(uniqueBranches);

        // Lưu toàn bộ danh sách object { id, name, branch } để lấy ID
        setMechanicList(rawOptions.mechanicCategories);
      }

      // 2. Dynamics: Lưu toàn bộ danh sách object { id, name }
      if (rawOptions.tagOptions?.Dynamics) {
        setDynamicsList(rawOptions.tagOptions.Dynamics);
      }

      // 3. Reward Types: Lưu toàn bộ danh sách object { id, name }
      if (rawOptions.tagOptions?.['Reward Types']) {
        setRewardTypesList(rawOptions.tagOptions['Reward Types']);
      }
    }
  }, [rawOptions]);

  // When category changes, filter mechanics relevant to that category/branch
  const availableMechanics = useMemo(() => {
    if (!category || !Array.isArray(rawOptions.mechanicCategories)) {
      return mechanicList;
    }
    const filtered = rawOptions.mechanicCategories.filter(
      (m) => capitalize(m.branch) === category || m.branch?.toLowerCase() === category?.toLowerCase()
    );
    return filtered.length > 0 ? filtered : mechanicList;
  }, [category, rawOptions, mechanicList]);

  // Hàm tìm kiếm App tương ứng từ Game được chọn
  const matchAppFromGame = useCallback(
    (gameObj) => {
      if (!gameObj || !appOptions.length) return null;
      const targetApp = normalizeName(gameObj.app_name);
      const targetName = normalizeName((gameObj.name || '').replace(/^\d+[\.\s\-]+/, ''));

      // 1. So khớp chính xác
      let found = appOptions.find(
        (a) => normalizeName(a.name) === targetApp || normalizeName(a.name) === targetName
      );
      if (found) return found;

      // 2. So khớp chứa chuỗi (contains)
      found = appOptions.find((a) => {
        const aNorm = normalizeName(a.name);
        return aNorm.includes(targetApp) || targetApp.includes(aNorm) || aNorm.includes(targetName);
      });
      return found || null;
    },
    [appOptions]
  );

  // Tải danh sách Release/Event cho Game + Date vào grid
  const loadGameEvents = useCallback(
    async (gameId, date, showToast = false) => {
      if (!gameId) {
        if (showToast) message.warning('Vui lòng chọn game trước!');
        return;
      }

      setGridLoading(true);
      try {
        const dateStr = date ? date.format('YYYY-MM-DD') : '';

        // 1. Ưu tiên: Gọi API mới /createNewItem từ backend
        try {
          const itemRes = await axios.get(`/createNewItem?gameid=${gameId}${dateStr ? `&date=${dateStr}` : ''}`, { timeout: 3500 });
          if (itemRes.data && Array.isArray(itemRes.data.data) && itemRes.data.data.length > 0) {
            setCreatedList(itemRes.data.data);
            if (showToast) message.success(`Đã tải ${itemRes.data.data.length} release từ Database!`);
            return;
          }
        } catch (itemErr) {
          // Bỏ qua và chuyển sang phương án tiếp theo
        }

        // 2. Thử gọi API theo ngày: /games?date=YYYY-MM-DD
        let events = [];
        try {
          const res = await axios.get(`/games?date=${dateStr || dayjs().format('YYYY-MM-DD')}`, { timeout: 3500 });
          if (Array.isArray(res.data)) {
            const section = res.data.find((s) => s.id === gameId);
            if (section && Array.isArray(section.events) && section.events.length > 0) {
              events = section.events;
            }
          }
        } catch (e) {
          // Bỏ qua lỗi timeout hoặc mạng và fallback
        }

        if (events.length > 0) {
          const formatted = events.slice(0, 30).map((e, idx) => {
            const releaseName = e.name + (e.g_name ? ` (${e.g_name})` : '');
            return {
              id: e.gallery_id || e.id || `evt-${idx}`,
              galleryId: e.gallery_id || 'ID',
              title: releaseName,
              displayText: `-Added tracker date for ${releaseName}`,
              from: e.from || '',
              to: e.to || '',
              status: 1,
              url: e.gallery_id
                ? `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${e.gallery_id}`
                : undefined,
              createdAt: new Date().toISOString(),
              valid: true,
            };
          });

          setCreatedList(formatted);
          if (showToast) message.success(`Đã tải ${formatted.length} release cho game!`);
        } else {
          if (showToast) message.info('Không có release nào cho game này.');
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách release:', err);
        if (showToast) message.error('Lỗi tải danh sách!');
      } finally {
        setGridLoading(false);
      }
    },
    []
  );

  // Khi người dùng chọn Game ở thanh điều khiển
  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId);
    const gameObj = gameList.find((g) => g.value === gameId);

    // Tự động tìm và gán đúng App trong form
    if (gameObj) {
      const matchedApp = matchAppFromGame(gameObj);
      if (matchedApp) {
        setApp(matchedApp.value);
      }
    }

    // Tự động tải danh sách release tương ứng vào grid
    loadGameEvents(gameId, selectedDate);
  };

  // Khi người dùng đổi Date
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (date) setFromDate(date);
    if (selectedGame) {
      loadGameEvents(selectedGame, date);
    }
  };

  // Nút "Load lại danh sách" ở header của grid
  const handleReloadList = () => {
    if (selectedGame) {
      loadGameEvents(selectedGame, selectedDate, true);
    } else {
      message.info('Vui lòng chọn game trước!');
    }
  };

  // Load ban đầu: danh sách game và options
  const fetchInitialData = async () => {
    try {
      // 1. Lấy danh sách Game từ API /listGame
      try {
        const gamesRes = await axios.get('/listGame');
        if (Array.isArray(gamesRes.data)) {
          setGameList(
            gamesRes.data.map((item) => ({
              value: item.id,
              label: item.name,
              name: item.name,
              app_name: item.app_name,
            }))
          );
        }
      } catch (e) {
        // Fallback
      }

      // 2. Fetch options từ API (/release-options)
      try {
        const optionsRes = await axios.get('/release-options');
        if (optionsRes.data && (optionsRes.data.options || optionsRes.data.apps)) {
          setRawOptions(optionsRes.data.options || optionsRes.data);
        }

        if (Array.isArray(optionsRes.data?.listGame) && optionsRes.data.listGame.length > 0) {
          setGameList(
            optionsRes.data.listGame.map((item) => ({
              value: item.id,
              label: item.name,
              name: item.name,
              app_name: item.app_name,
            }))
          );
        }
      } catch (optErr) {
        // Fallback: Giữ nguyên dữ liệu từ data.json
      }
    } catch (err) {
      console.error('Lỗi khi khởi tạo dữ liệu:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Helper function to build select options preserving ID as value and Name as label
  const buildSelectOptions = (list, searchVal) => {
    const trimmed = (searchVal || '').trim();
    const options = (list || []).map((item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          value: item.id || item.value || item.name,
          label: item.name || item.label || item.id,
          name: item.name || item.label,
        };
      }
      return { value: item, label: item, name: item };
    });

    const exists = options.some(
      (opt) => (opt.label || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (trimmed && !exists) {
      return [{ value: trimmed, label: `+ Add "${trimmed}"`, name: trimmed }, ...options];
    }
    return options;
  };

  const catOptions = useMemo(() => buildSelectOptions(categoryList, catSearch), [categoryList, catSearch]);
  const mechOptions = useMemo(() => buildSelectOptions(availableMechanics, mechSearch), [availableMechanics, mechSearch]);
  const dynOptions = useMemo(() => buildSelectOptions(dynamicsList, dynSearch), [dynamicsList, dynSearch]);
  const rewOptions = useMemo(() => buildSelectOptions(rewardTypesList, rewSearch), [rewardTypesList, rewSearch]);

  const handleSelectWithCustom = (val, currentList, setList, setValue) => {
    setValue(val);
    if (val && !currentList.some((item) => (typeof item === 'object' ? item.id === val : item === val))) {
      setList((prev) => [{ id: val, name: val }, ...prev]);
    }
  };

  // Hàm sinh UUID giả lập chuẩn RFC4122
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Hàm xử lý Reset trắng các ô nhập khi tạo mới thành công
  const resetFormInputs = () => {
    setTitle('');
    setCategory(undefined);
    setMechanic(undefined);
    setDynamics(undefined);
    setRewardTypes(undefined);
    setFromDate(selectedDate || dayjs());
    setToDate(undefined);
    setURLEdit(undefined);
  };

  // Xử lý nút Create New: Gọi API /createNewItem (với fallback tự động)
  const handleCreate = async () => {
    // 1. Kiểm tra bắt buộc chọn Game
    if (!selectedGame) {
      message.warning('Vui lòng chọn Game bắt buộc trước khi tạo!');
      return;
    }

    const releaseTitle = title?.trim();
    if (!releaseTitle) {
      message.warning('Vui lòng nhập Title!');
      return;
    }

    const selectedGameObj = gameList.find((g) => g.value === selectedGame);
    const gameName = selectedGameObj ? selectedGameObj.name : `Game #${selectedGame}`;

    // Tìm tên tương ứng của các ID để hiển thị log rõ ràng
    const selectedAppObj = appOptions.find((a) => a.value === app);
    const appName = selectedAppObj ? selectedAppObj.name : (app || 'Chưa chọn');

    const selectedMechObj = mechOptions.find((m) => m.value === mechanic);
    const mechanicName = selectedMechObj ? selectedMechObj.label : (mechanic || 'Chưa chọn');

    const selectedDynObj = dynOptions.find((d) => d.value === dynamics);
    const dynamicsName = selectedDynObj ? selectedDynObj.label : (dynamics || 'Chưa chọn');

    const selectedRewObj = rewOptions.find((r) => r.value === rewardTypes);
    const rewardTypesName = selectedRewObj ? selectedRewObj.label : (rewardTypes || 'Chưa chọn');

    const fromStr = fromDate ? fromDate.format('YYYY/MM/DD') : '';
    const toStr = toDate ? toDate.format('YYYY/MM/DD') : '';
    const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

    // Cấu trúc log hiển thị rõ ID gửi đi
    const logInfo = {
      gameId: selectedGame,
      gameName,
      title: releaseTitle,
      date: dateStr,
      from: fromStr,
      to: toStr,
      appId: app,
      appName,
      category: category || '',
      mechanicId: mechanic || '',
      mechanicName,
      dynamicsId: dynamics || '',
      dynamicsName,
      rewardTypesId: rewardTypes || '',
      rewardTypesName,
      status: 1,
      timestamp: new Date().toLocaleTimeString(),
    };

    // 1. In log ra Browser Console theo thứ tự lần lượt (hiển thị rõ ID gửi đi):
    console.log('%c====================================================', 'color: #2563eb');
    console.log('%c🚀 [TRUYỀN LÊN ITEM MỚI] - GỬI ID THEO THỨ TỰ LẦN LƯỢT:', 'background: #2563eb; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    console.log('1️⃣ Game ID:', selectedGame, `(${gameName})`);
    console.log('2️⃣ Title:', releaseTitle);
    console.log('3️⃣ Publish Date:', dateStr);
    console.log('4️⃣ From:', fromStr || '(trống)');
    console.log('5️⃣ To:', toStr || '(trống)');
    console.log('6️⃣ App ID:', app, `(${appName})`);
    console.log('7️⃣ Category:', category || '(trống)');
    console.log('8️⃣ Mechanic ID:', mechanic || '(trống)', `(${mechanicName})`);
    console.log('9️⃣ Dynamics ID:', dynamics || '(trống)', `(${dynamicsName})`);
    console.log('🔟 Reward Types ID:', rewardTypes || '(trống)', `(${rewardTypesName})`);
    console.log('1️⃣1️⃣ Status:', 1, '(Chưa public)');
    console.log('📦 Toàn bộ Payload Object gửi đi (Chỉ gửi ID):', {
      gameid: selectedGame,
      gameId: selectedGame,
      name: releaseTitle,
      title: releaseTitle,
      date: dateStr,
      publicDate: dateStr,
      from: fromStr,
      to: toStr,
      app: app, // App ID
      category,
      mechanic, // Mechanic ID
      mechanic_id: mechanic,
      dynamics, // Dynamics ID
      dynamics_id: dynamics,
      rewardTypes, // Reward Types ID
      reward_types: rewardTypes,
      status: 1,
    });
    console.log('%c====================================================', 'color: #2563eb');

    // Lưu vào state để hiển thị trực tiếp lên UI
    setSubmittedLog(logInfo);

    setLoading(true);

    try {
      // GỌI API BACKEND: POST /createNewItem (chỉ truyền ID)
      const response = await axios.post('/createNewItem', {
        gameid: selectedGame,
        gameId: selectedGame,
        name: releaseTitle,
        title: releaseTitle,
        date: dateStr,
        publicDate: dateStr,
        from: fromStr,
        to: toStr,
        app: app,
        appName,
        category,
        mechanic,
        mechanic_id: mechanic,
        dynamics,
        dynamics_id: dynamics,
        rewardTypes,
        reward_types: rewardTypes,
        status: 1,
      });

      if (response.data && (response.data.data || response.data.result)) {
        const item = response.data.data || response.data.result;
        setCreatedList((prev) => [item, ...prev]);
        resetFormInputs();
        setLoading(false);
        message.success(`Đã tạo và lưu CSDL: "${releaseTitle}"`);
        return;
      }
    } catch (apiErr) {
      console.warn('Backend chưa sẵn sàng hoặc lỗi, dùng fallback client:', apiErr.message);
    }

    // 2. FALLBACK TẠO NHANH (Khi chưa bật backend hoặc offline)
    const dummyId = generateUUID();
    const editUrl = `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${dummyId}`;

    const displayText = releaseTitle.startsWith('-Added')
      ? releaseTitle
      : `-Added tracker date for ${releaseTitle}`;

    const newItem = {
      id: dummyId,
      galleryId: dummyId,
      title: releaseTitle,
      displayText,
      from: fromStr,
      to: toStr,
      status: 1,
      url: editUrl,
      createdAt: new Date().toISOString(),
      valid: true,
    };

    setCreatedList((prev) => [newItem, ...prev]);
    resetFormInputs();
    setLoading(false);
    message.success(`Đã tạo và thêm vào danh sách: "${releaseTitle}"`);
  };

  // Cập nhật trạng thái status: 1 -> 2 (Public) hoặc 3 (Đẩy Google Sheet)
  const handleUpdateStatus = async (item, newStatus) => {
    try {
      if (item.id && typeof item.id === 'number') {
        await axios.put(`/createNewItem/${item.id}`, { status: newStatus });
      }
      setCreatedList((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
      if (newStatus === 3) {
        message.success('Đã cập nhật và đẩy lên Google Sheet thành công!');
      } else {
        message.success('Cập nhật trạng thái thành công!');
      }
    } catch (err) {
      message.error('Lỗi cập nhật trạng thái');
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <MenuLink activeKey="create-gallery" />

      {/* THANH ĐIỀU KHIỂN: Chọn Game + Date (Tự động điền App và tải danh sách) */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[16, 12]} align="bottom">
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
              🎮 Chọn Game <span style={{ color: '#ef4444' }}>*</span> (Tự động gán App & tải danh sách bên dưới)
            </div>
            <Select
              showSearch
              allowClear
              placeholder="Chọn game (bắt buộc)..."
              style={{ width: '100%' }}
              status={!selectedGame ? 'warning' : ''}
              value={selectedGame}
              options={gameList}
              onChange={handleGameSelect}
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>

          <Col xs={24} md={8}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
              📅 Chọn Date
            </div>
            <DatePicker
              style={{ width: '100%' }}
              value={selectedDate}
              onChange={handleDateSelect}
              format="YYYY/MM/DD"
            />
          </Col>

          <Col xs={24} md={4}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => loadGameEvents(selectedGame, selectedDate, true)}
              loading={gridLoading}
              block
              style={{ fontWeight: 600 }}
            >
              Tải danh sách
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Form Tạo Mới */}
      <Card
        style={{
          marginTop: 16,
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Row gutter={[16, 20]}>
          {/* 1. Title * */}
          <Col xs={24} md={12}>
            <FormLabel label="Title" />
            <Input
              placeholder="Release name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              allowClear
            />
          </Col>

          {/* 2. Publish Date * */}
          <Col xs={24} sm={8} md={4}>
            <FormLabel label="Publish Date" />
            <DatePicker
              style={{ width: '100%' }}
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                if (!fromDate) setFromDate(date);
              }}
              format="MMM D, YYYY"
            />
          </Col>

          {/* 3. From */}
          <Col xs={12} sm={8} md={4}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
              From
            </div>
            <DatePicker
              style={{ width: '100%' }}
              value={fromDate}
              onChange={(date) => setFromDate(date)}
              format="YYYY/MM/DD"
              placeholder="Từ ngày"
            />
          </Col>

          {/* 4. To */}
          <Col xs={12} sm={8} md={4}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
              To
            </div>
            <DatePicker
              style={{ width: '100%' }}
              value={toDate}
              onChange={(date) => setToDate(date)}
              format="YYYY/MM/DD"
              placeholder="Đến ngày"
            />
          </Col>

          {/* 5. App * (Tự động điền khi chọn Game ở trên) */}
          <Col xs={24} md={8}>
            <FormLabel label="App" />
            <Select
              showSearch
              allowClear
              placeholder="Choose an app..."
              style={{ width: '100%' }}
              value={app}
              options={appOptions}
              onChange={(val) => setApp(val)}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
            />
          </Col>

          {/* 6. Category * */}
          <Col xs={24} md={8}>
            <FormLabel label="Category" />
            <Select
              showSearch
              allowClear
              placeholder="Choose a category..."
              style={{ width: '100%' }}
              value={category}
              options={catOptions}
              onSearch={setCatSearch}
              onChange={(val) => {
                handleSelectWithCustom(val, categoryList, setCategoryList, setCategory);
                setMechanic(undefined);
              }}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
            />
          </Col>

          {/* 7. Mechanic * */}
          <Col xs={24} md={8}>
            <FormLabel label="Mechanic" />
            <Select
              showSearch
              allowClear
              placeholder="Choose a mechanic..."
              style={{ width: '100%' }}
              value={mechanic}
              options={mechOptions}
              onSearch={setMechSearch}
              onChange={(val) => handleSelectWithCustom(val, mechanicList, setMechanicList, setMechanic)}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
            />
          </Col>
        </Row>

        {/* Section Tags */}
        <div
          style={{
            marginTop: 28,
            marginBottom: 20,
            paddingTop: 20,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Tags</div>
        </div>

        <Row gutter={[16, 20]}>
          {/* 8. Dynamics * */}
          <Col xs={24} md={8}>
            <FormLabel label="Dynamics" />
            <Select
              showSearch
              allowClear
              placeholder="Choose..."
              style={{ width: '100%' }}
              value={dynamics}
              options={dynOptions}
              onSearch={setDynSearch}
              onChange={(val) => handleSelectWithCustom(val, dynamicsList, setDynamicsList, setDynamics)}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
            />
          </Col>

          {/* 9. Reward Types * */}
          <Col xs={24} md={8}>
            <FormLabel label="Reward Types" />
            <Select
              showSearch
              allowClear
              placeholder="Choose..."
              style={{ width: '100%' }}
              value={rewardTypes}
              options={rewOptions}
              onSearch={setRewSearch}
              onChange={(val) => handleSelectWithCustom(val, rewardTypesList, setRewardTypesList, setRewardTypes)}
              filterOption={(input, option) =>
                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
              }
            />
          </Col>
        </Row>

        {/* Action Button & API Indicator */}
        <div style={{ marginTop: 32, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleCreate}
            loading={loading}
            style={{ minWidth: 160, fontWeight: 600 }}
          >
            Create New
          </Button>

          <Tag color="green" style={{ padding: '4px 10px', fontSize: 13, borderRadius: 4 }}>
            ⚡ API Connected: POST /createNewItem
          </Tag>
        </div>

        {/* Khối hiển thị Log tuần tự các Item khi truyền lên */}
        {submittedLog && (
          <div
            style={{
              marginTop: 20,
              padding: '14px 18px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                borderBottom: '1px dashed #bbf7d0',
                paddingBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>
                📋 Log các item đã truyền lên (thứ tự lần lượt lúc {submittedLog.timestamp}):
              </span>
              <Button
                type="text"
                size="small"
                onClick={() => setSubmittedLog(null)}
                style={{ color: '#6b7280', fontSize: 12 }}
              >
                ✕ Đóng log
              </Button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '8px 20px',
                fontSize: 13,
                color: '#1f2937',
              }}
            >
              <div><b>1. Game ID:</b> <Tag color="blue">{submittedLog.gameId}</Tag> <span style={{ color: '#4b5563', fontSize: 12 }}>({submittedLog.gameName})</span></div>
              <div><b>2. Title:</b> <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{submittedLog.title}</span></div>
              <div><b>3. Publish Date:</b> <span>{submittedLog.date}</span></div>
              <div><b>4. From:</b> <span>{submittedLog.from || '(trống)'}</span></div>
              <div><b>5. To:</b> <span>{submittedLog.to || '(trống)'}</span></div>
              <div><b>6. App ID:</b> <Tag color="cyan">{submittedLog.appId}</Tag> <span style={{ color: '#4b5563', fontSize: 12 }}>({submittedLog.appName})</span></div>
              <div><b>7. Category:</b> <span>{submittedLog.category || '(trống)'}</span></div>
              <div><b>8. Mechanic ID:</b> <Tag color="purple">{submittedLog.mechanicId || '(chưa chọn)'}</Tag> <span style={{ color: '#4b5563', fontSize: 12 }}>({submittedLog.mechanicName})</span></div>
              <div><b>9. Dynamics ID:</b> <Tag color="magenta">{submittedLog.dynamicsId || '(chưa chọn)'}</Tag> <span style={{ color: '#4b5563', fontSize: 12 }}>({submittedLog.dynamicsName})</span></div>
              <div><b>10. Reward Types ID:</b> <Tag color="geekblue">{submittedLog.rewardTypesId || '(chưa chọn)'}</Tag> <span style={{ color: '#4b5563', fontSize: 12 }}>({submittedLog.rewardTypesName})</span></div>
              <div><b>11. Status:</b> <Tag color="orange">1 (Chưa public)</Tag></div>
            </div>
          </div>
        )}

        {/* Link Edit Result */}
        {urlEdit && (
          <div style={{ marginTop: 20 }}>
            <Alert
              message={
                <a href={urlEdit} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                  👉 Edit Gallery Here
                </a>
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          </div>
        )}
      </Card>

      {/* Grid Danh Sách Kết Quả Tạo (Như ảnh số 2) */}
      <Card
        style={{
          marginTop: 20,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>
            Danh sách Release ({createdList.length})
          </span>
          {/* Nút "Load lại danh sách" */}
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReloadList}
            loading={gridLoading}
            style={{ color: '#2563eb', fontWeight: 500 }}
          >
            Load lại danh sách
          </Button>
        </div>

        {createdList.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Chưa có release nào trong danh sách. Hãy chọn <b>Game</b> để tải danh sách hoặc nhấn <b>Create New</b>.
          </div>
        ) : (
          createdList.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: index < createdList.length - 1 ? '1px solid #f0f0f0' : 'none',
                gap: 16,
                backgroundColor: '#ffffff',
                transition: 'background-color 0.15s ease',
              }}
            >
              {/* Bên trái: Tên Event / Release + Khoảng ngày From-To */}
              <div
                style={{
                  fontSize: 14,
                  color: '#1f2937',
                  fontWeight: 400,
                  flex: 1,
                  wordBreak: 'break-word',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span>{item.displayText}</span>
                {(item.from || item.to) && (
                  <Tag color="blue" style={{ fontSize: 12, margin: 0 }}>
                    📅 {item.from || '...'} {item.to ? `~ ${item.to}` : ''}
                  </Tag>
                )}

                {/* Tag hiển thị trạng thái */}
                {item.status === 3 ? (
                  <Tag color="success">Đã lên Sheet</Tag>
                ) : item.status === 2 ? (
                  <Tag color="processing">Đã Public</Tag>
                ) : (
                  <Tag color="default">Chưa Public</Tag>
                )}
              </div>

              {/* Bên phải: ID màu đỏ + 3 Icon (Expand, Eye, Checkmark/Status) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                {/* ID màu đỏ */}
                <span
                  style={{
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'monospace',
                  }}
                >
                  {item.galleryId || item.gallery_id || 'ID'}
                </span>

                {/* Nút xem ảnh / gallery */}
                <Button
                  type="text"
                  size="small"
                  icon={<ExpandOutlined style={{ fontSize: 16 }} />}
                  onClick={() => setViewImageModal({ open: true, galleryId: item.galleryId || item.gallery_id })}
                  title="Xem ảnh gallery"
                />

                {/* Nút mở trang CMS Liquid & Grit */}
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined style={{ fontSize: 16 }} />}
                  onClick={() =>
                    window.open(
                      item.url ||
                        `https://my.liquidandgrit.com/admin/cms/blog/?page=8&gallery-edit-instance=${item.galleryId || item.gallery_id}`,
                      '_blank'
                    )
                  }
                  title="Mở gallery CMS"
                />

                {/* Icon tích xanh / Thay đổi trạng thái */}
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    const nextStatus = item.status === 1 ? 2 : (item.status === 2 ? 3 : 1);
                    handleUpdateStatus(item, nextStatus);
                  }}
                  title={`Status: ${item.status || 1} (Bấm để đổi)`}
                  icon={
                    <CheckCircleOutlined
                      style={{
                        color: item.status === 3 ? '#1677ff' : '#52c41a',
                        fontSize: 18,
                      }}
                    />
                  }
                />
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Modal Xem Ảnh Gallery Chuẩn Mobile */}
      <Modal
        open={viewImageModal.open}
        onCancel={() => setViewImageModal({ open: false, galleryId: null })}
        width="95vw"
        style={{ maxWidth: '95vw', top: 10 }}
        footer={null}
        destroyOnClose
      >
        {viewImageModal.galleryId && <ViewImage event_id={viewImageModal.galleryId} />}
      </Modal>
    </div>
  );
}
