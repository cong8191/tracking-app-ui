import React from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import MainPage from "./MainPage";
import UploadManager from "./UploadManager";
import SQLiteFileUploader from "./SQLiteFileUploader";
import SearchableTable from "./SearchableTable";
import CheckItem from "./CheckItem";
import CreateNew from "./CreateNew";
import MobileEditor from "./MobileEditor";
import ViewImage from "./ViewImage";

function KeepAliveMainLayout() {
  const location = useLocation();

  const pathToKey = {
    '/': 'home',
    '/upload': 'upload',
    '/createNew': 'create-gallery',
    '/search': 'search',
    '/check': 'check',
  };

  const currentTab = pathToKey[location.pathname] || 'home';

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 12px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* 1. Home Tab */}
      <div style={{ display: currentTab === 'home' ? 'block' : 'none' }}>
        <MainPage />
      </div>

      {/* 2. Upload Tab */}
      <div style={{ display: currentTab === 'upload' ? 'block' : 'none' }}>
        <UploadManager />
      </div>

      {/* 3. Create Gallery Tab */}
      <div style={{ display: currentTab === 'create-gallery' ? 'block' : 'none' }}>
        <CreateNew />
      </div>

      {/* 4. Search Tab */}
      <div style={{ display: currentTab === 'search' ? 'block' : 'none' }}>
        <SearchableTable />
      </div>

      {/* 5. Check Tab */}
      <div style={{ display: currentTab === 'check' ? 'block' : 'none' }}>
        <CheckItem />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<KeepAliveMainLayout />} />
        <Route path="/upload" element={<KeepAliveMainLayout />} />
        <Route path="/createNew" element={<KeepAliveMainLayout />} />
        <Route path="/search" element={<KeepAliveMainLayout />} />
        <Route path="/check" element={<KeepAliveMainLayout />} />
        
        {/* Các trang riêng lẻ khác */}
        <Route path="/dbManager" element={<SQLiteFileUploader />} />
        <Route path="/updateContent" element={<MobileEditor />} />
        <Route path="/viewImage/:event_id" element={<ViewImage />} />
      </Routes>
    </HashRouter>
  );
}
