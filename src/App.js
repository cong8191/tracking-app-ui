import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage";
import UploadManager from "./UploadManager";
import SQLiteFileUploader from "./SQLiteFileUploader";
import SearchableTable from "./SearchableTable";
import CheckItem from "./CheckItem";
import CreateNew from "./CreateNew";

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/upload" element={<UploadManager />} />
        <Route path="/dbManager" element={<SQLiteFileUploader />} />
        <Route path="/search" element={<SearchableTable />} />
        <Route path="/check" element={<CheckItem />} />
        <Route path="/createNew" element={<CreateNew />} />
        

      </Routes>
    </BrowserRouter>
  );
}
