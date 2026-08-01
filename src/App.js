import React from "react";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage";
import UploadManager from "./UploadManager";
import SQLiteFileUploader from "./SQLiteFileUploader";
import SearchableTable from "./SearchableTable";
import CheckItem from "./CheckItem";
import CreateNew from "./CreateNew";
import MobileEditor from "./MobileEditor";
import ViewImage from "./ViewImage";

// Tự động chọn Router phù hợp với môi trường
// @ts-ignore
const isNative = window.Capacitor?.isNativePlatform();
const AppRouter = isNative ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <AppRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/upload" element={<UploadManager />} />
        <Route path="/dbManager" element={<SQLiteFileUploader />} />
        <Route path="/search" element={<SearchableTable />} />
        <Route path="/check" element={<CheckItem />} />
        <Route path="/createNew" element={<CreateNew />} />
        <Route path="/updateContent" element={<MobileEditor />} />
        <Route path="/vewImage/:event_id" element={<ViewImage />} />
      </Routes>
    </AppRouter>
  );
}
