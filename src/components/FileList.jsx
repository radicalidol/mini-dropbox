import React, { useState } from "react";
import Modal from "./Modal";

const token = sessionStorage.getItem("token");
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');
const isPdfOrImage = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return ext === 'pdf' || ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext);
};

async function fetchAndDownload(url, filename) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch file");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    throw err;
  }
}

async function fetchAndOpenInTab(url) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Failed to fetch file");
    const contentType = res.headers.get("content-type") || "";
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const newTab = window.open();
    if (contentType.includes("pdf") || contentType.startsWith("image/")) {
      newTab.document.write(`<iframe src='${blobUrl}' frameborder='0' style='border:0;width:100vw;height:100vh;' allowfullscreen></iframe>`);
    } else {
      window.open(blobUrl, '_blank');
    }
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    alert(err.message || "Open failed");
  }
}

export default function FileList({ files, onOpenFolder, onDownload, onDelete }) {
  const [modal, setModal] = useState({ open: false, file: null });
  const handleDelete = file => setModal({ open: true, file });
  const confirmDelete = () => {
    if (modal.file) onDelete(modal.file.path);
    setModal({ open: false, file: null });
  };
  const cancelDelete = () => setModal({ open: false, file: null });
  const handleOpenFileInNewTab = (filePath, fileName) => fetchAndOpenInTab(`http://localhost:8080/files/download/${encodePath(filePath)}`);
  // Helper to format date as DMY without comma
  const formatDate = ts => {
    if (!ts) return '--';
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };
  // Helper to format size
  const formatSize = size => {
    if (size == null) return '--';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };
  return (
    <>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-gray-400 text-sm">
            <th className="py-2 font-normal">Name</th>
            <th className="py-2 font-normal">Date Modified</th>
            <th className="py-2 font-normal">Size</th>
            <th className="py-2 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.path} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <span className="mr-2 text-blue-600">{file.type === "folder" ? "📁" : "📄"}</span>
                {file.type === "folder" ? (
                  <span className="font-semibold text-blue-700 cursor-pointer" onClick={() => onOpenFolder(file.path)}>{file.name}</span>
                ) : (
                  <span className="text-blue-700 hover:underline cursor-pointer" onClick={() => handleOpenFileInNewTab(file.path, file.name)}>{file.name}</span>
                )}
              </td>
              <td className="py-2">{formatDate(file.lastModified)}</td>
              <td className="py-2">{formatSize(file.size)}</td>
              <td className="py-2 text-right flex gap-2 justify-end">
                {file.type === "folder" ? (
                  <>
                    <button
                      title="Download as Zip"
                      className="text-blue-600 hover:text-blue-800 text-lg"
                      onClick={() => fetchAndDownload(`http://localhost:8080/files/download/${encodePath(file.path)}`, file.name + '.zip')}
                    >
                      <span role="img" aria-label="Download">⬇️</span>
                    </button>
                    <button
                      title="Delete folder"
                      className="text-red-600 hover:text-red-800 text-lg"
                      onClick={() => handleDelete(file)}
                    >
                      <span role="img" aria-label="Delete">🗑️</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      title="Download file"
                      className="text-blue-600 hover:text-blue-800 text-lg"
                      onClick={() => onDownload(file.path)}
                    >
                      <span role="img" aria-label="Download">⬇️</span>
                    </button>
                    <button
                      title="Delete file"
                      className="text-red-600 hover:text-red-800 text-lg"
                      onClick={() => handleDelete(file)}
                    >
                      <span role="img" aria-label="Delete">🗑️</span>
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        open={modal.open}
        title={modal.file?.type === "folder" ? "Delete Folder" : "Delete File"}
        message={`Are you sure you want to delete "${modal.file?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
