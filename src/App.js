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
import MediaActions from "./MediaActions";

function KeepAliveMainLayout() {
  const location = useLocation();

  const pathToKey = {
    '/': 'home',
    '/createNew': 'create-gallery',
    '/search': 'search',
    '/check': 'check',
    '/media-actions': 'media-actions',
    '/updateContent': 'updateContent',
  };

  const currentTab = pathToKey[location.pathname] || 'home';

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 12px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* 1. Home Tab */}
      <div style={{ display: currentTab === 'home' ? 'block' : 'none' }}>
        <MainPage />
      </div>

      {/* 2. Upload Tab */}
      {/* <div style={{ display: currentTab === 'upload' ? 'block' : 'none' }}>
        <UploadManager />
      </div> */}

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

      {/* 6. Media Actions Tab */}
      <div style={{ display: currentTab === 'media-actions' ? 'block' : 'none' }}>
        <MediaActions />
      </div>

      <div style={{ display: currentTab === 'updateContent' ? 'block' : 'none' }}>
        <MobileEditor />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<KeepAliveMainLayout />} />
        {/* <Route path="/upload" element={<KeepAliveMainLayout />} /> */}
        <Route path="/createNew" element={<KeepAliveMainLayout />} />
        <Route path="/search" element={<KeepAliveMainLayout />} />
        <Route path="/check" element={<KeepAliveMainLayout />} />
        <Route path="/media-actions" element={<KeepAliveMainLayout />} />
        <Route path="/updateContent" element={<KeepAliveMainLayout />} />
        
        {/* Các trang riêng lẻ khác */}
        <Route path="/dbManager" element={<SQLiteFileUploader />} />
        <Route path="/viewImage/:event_id" element={<ViewImage />} />
      </Routes>
    </HashRouter>
  );
}
