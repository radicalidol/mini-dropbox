import NewFolderButton from "../components/NewFolderButton";

import React, { useEffect, useState } from "react";
import FileList from "../components/FileList";
import { listFiles, uploadFile, downloadFile, deleteFile } from "../api";
import { createFolder } from "../api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import Breadcrumbs from "../components/Breadcrumbs";
import FileUpload from "../components/FileUpload";
import Modal from "../components/Modal";

export default function Dashboard({ onLogout = () => {} }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState({ open: false, message: "" });
  const token = sessionStorage.getItem("token");
  const username = sessionStorage.getItem("username");
  const navigate = useNavigate();

  const fetchFiles = async (path = "") => {
    try {
      const res = await listFiles(token, path);
      const authMsg = "Full authentication is required to access this resource";
      if (
        (res && (res.message === authMsg || res.error === authMsg)) ||
        (res && res.status === 401)
      ) {
        setModal({ open: true, message: authMsg });
        sessionStorage.clear();
        if (typeof onLogout === "function") onLogout();
        return;
      }
      if (!res || res.error || res.status === "error") {
        const msg = res && (res.message || res.error) ? (res.message || res.error) : "Unknown error";
        setModal({ open: true, message: "Failed to fetch files. " + msg });
        setFiles([]);
        return;
      }
      setFiles(res || []);
      setCurrentPath(path);
    } catch (err) {
      console.error(err);
      setModal({ open: true, message: "Failed to fetch files. " + (err.message || "") });
      setFiles([]);
    }
  };

  useEffect(() => {
    if (!token) {
      onLogout();
    } else {
      fetchFiles();
    }
  }, []);

  const handleOpenFolder = (folderPath) => {
    fetchFiles(folderPath);
  };

  const handleDownload = async (filePath) => {
    try {
      await downloadFile(filePath, token);
    } catch (err) {
      setModal({ open: true, message: "Download failed: " + (err.message || "") });
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    if (typeof onLogout === "function") onLogout();
    navigate("/login");
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(currentPath, file, token);
      if (res && res.error) {
        setModal({ open: true, message: "Upload failed: " + res.message });
      } else {
        await fetchFiles(currentPath);
      }
    } catch (err) {
      setModal({ open: true, message: "Upload failed: " + (err.message || "") });
    }
    setUploading(false);
  };

  const handleCreateFolder = async (folderName) => {
    const res = await createFolder(currentPath ? `${currentPath}/${folderName}` : folderName, token);
    if (res && res.error) {
      setModal({ open: true, message: "Create folder failed: " + res.message });
    } else {
      await fetchFiles(currentPath);
    }
  };

  const handleGoBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.join("/");
    fetchFiles(parentPath);
  };

  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];
  const handleBreadcrumbClick = (idx) => {
    const newPath = pathParts.slice(0, idx + 1).join("/");
    fetchFiles(newPath);
  };

  return (
    <div className="flex h-screen bg-[#f5f7fa]">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <TopBar username={username} onLogout={handleLogout} />
        <div className="flex flex-1">
          <section className="flex-1 p-8">
            <div className="bg-white rounded shadow p-4">
              <div className="flex items-center mb-4 w-full">
                <div className="flex items-center flex-grow">
                  <button
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 mr-2 self-center"
                    onClick={handleGoBack}
                    disabled={!currentPath}
                    style={{ marginBottom: '2px' }}
                  >
                    Go Back
                  </button>
                  <div className="flex-1 flex items-center">
                    <Breadcrumbs
                      pathParts={pathParts}
                      onNavigate={(newPath) => fetchFiles(newPath)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <FileUpload uploading={uploading} onUpload={handleUpload} />
                  <NewFolderButton
                    currentPath={currentPath}
                    token={token}
                    onCreate={handleCreateFolder}
                  />
                </div>
              </div>
              <FileList
                files={files}
                onOpenFolder={handleOpenFolder}
                onDownload={handleDownload}
                onDelete={async (filePath) => {
                  try {
                    await deleteFile(filePath, token);
                    await fetchFiles(currentPath);
                  } catch (err) {
                    setModal({ open: true, message: "Delete failed: " + (err.message || "") });
                  }
                }}
              />
              <Modal
                open={modal.open}
                title="Error"
                message={modal.message}
                onConfirm={() => setModal({ open: false, message: "" })}
                confirmText="OK"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
