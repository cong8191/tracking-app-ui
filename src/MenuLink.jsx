import { Menu } from 'antd';
import { 
  PlusCircleOutlined, 
  UnorderedListOutlined, 
  HomeOutlined, 
  SettingOutlined, 
  CheckCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom'; // Nếu dùng React Router DOM
// Nếu không dùng React Router, bạn có thể dùng window.location.href

export default function MenuLink({ activeKey }) {
  const navigate = useNavigate(); // Hook để chuyển trang

  // Định nghĩa các mục trong menu
  const items = [
    {
      label: '',
      key: 'home',
      icon: <HomeOutlined />,
    },
    {
      label: '',
      key: 'upload',
      icon: <UploadOutlined />,
    },
    {
      label: '',
      key: 'create-gallery',
      icon: <PlusCircleOutlined />,
    },
    {
      label: '',
      key: 'search',
      icon: <UnorderedListOutlined />,
    },
    {
      label: '',
      key: 'check',
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleMenuClick = (e) => {
    // Xử lý chuyển trang dựa vào key
    switch (e.key) {
      case 'home':
        //navigate('/'); 
        window.open('/', '_blank');
        break;
      case 'upload':
        // navigate('/createNew');
        window.open('/upload', '_blank');
        break;
      case 'create-gallery':
        // navigate('/createNew');
        window.open('/createNew', '_blank');
        break;
      case 'search':
        // navigate('/search');
        window.open('/search', '_blank');
        break;
      case 'check':
        // navigate('/check');
        window.open('/check', '_blank');
        break;
      default:
        console.log('Click on:', e.key);
    }
  };

  return (
    <div style={{ marginBottom: 20, background: '#fff' }}>
      <Menu
        onClick={handleMenuClick}
        selectedKeys={[activeKey]} // Highlight item đang được chọn
        mode="horizontal" // Menu ngang
        items={items}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', // Căn giữa menu
          borderBottom: '1px solid #f0f0f0' 
        }}
      />
    </div>
  );
}