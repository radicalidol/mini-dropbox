import React from "react";

export default function Modal({ open, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg p-6 min-w-[300px] max-w-[90vw]">
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        <div className="mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onCancel}>{cancelText}</button>
          )}
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
