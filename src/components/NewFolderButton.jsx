import React, { useState } from "react";
import Modal from "./Modal";

export default function NewFolderButton({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [modal, setModal] = useState({ open: false, message: "" });

  const handleCreate = () => {
    if (!folderName.trim()) {
      // Only local empty validation, rest handled by Dashboard
      setModal({ open: true, message: "Folder name cannot be empty." });
      return;
    }
    onCreate(folderName.trim());
    setFolderName("");
    setOpen(false);
  };

  const closeModal = () => setModal({ open: false, message: "" });

  return (
    <>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700"
        onClick={() => setOpen(true)}
      >
        📁 New folder
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded shadow-lg p-6 min-w-[300px] max-w-[90vw]">
            <div className="text-lg font-semibold mb-2">
              Create New Folder
            </div>
            <input
              type="text"
              className="border px-2 py-1 w-full mb-4"
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleCreate}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={modal.open}
        title="Error"
        message={modal.message}
        onConfirm={closeModal}
        confirmText="OK"
      />
    </>
  );
}
