import React from 'react';
import { Tabs } from 'antd';
import { 
  PlusCircleOutlined, 
  UnorderedListOutlined, 
  HomeOutlined, 
  CheckCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MenuLink({ activeKey }) {
  const navigate = useNavigate();
  const location = useLocation();

  const keyToPath = {
    'home': '/',
    'upload': '/upload',
    'create-gallery': '/createNew',
    'search': '/search',
    'check': '/check',
  };

  const pathToKey = {
    '/': 'home',
    '/upload': 'upload',
    '/createNew': 'create-gallery',
    '/search': 'search',
    '/check': 'check',
  };

  const currentKey = activeKey || pathToKey[location.pathname] || 'home';

  const items = [
    {
      key: 'home',
      label: 'Home',
      icon: <HomeOutlined style={{ fontSize: 18 }} />,
    },
    {
      key: 'upload',
      label: 'Upload',
      icon: <UploadOutlined style={{ fontSize: 18 }} />,
    },
    {
      key: 'create-gallery',
      label: 'Tạo mới',
      icon: <PlusCircleOutlined style={{ fontSize: 18 }} />,
    },
    {
      key: 'search',
      label: 'Tìm kiếm',
      icon: <UnorderedListOutlined style={{ fontSize: 18 }} />,
    },
    {
      key: 'check',
      label: 'Kiểm tra',
      icon: <CheckCircleOutlined style={{ fontSize: 18 }} />,
    },
  ];

  const handleTabChange = (key) => {
    const targetPath = keyToPath[key] || '/';
    navigate(targetPath);
  };

  return (
    <div style={{ 
      marginBottom: 16, 
      background: '#fff', 
      width: '100%', 
      maxWidth: '100vw', 
      boxSizing: 'border-box',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <Tabs
        activeKey={currentKey}
        onChange={handleTabChange}
        centered
        items={items.map(item => ({
          key: item.key,
          label: (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 4, 
              padding: '4px 2px',
              fontSize: '13px',
              fontWeight: 500
            }}>
              {item.icon}
              <span className="tab-label-text">{item.label}</span>
            </span>
          )
        }))}
        tabBarStyle={{ margin: 0, borderBottom: 'none' }}
      />
    </div>
  );
}