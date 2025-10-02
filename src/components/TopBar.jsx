import React from "react";

export default function TopBar({ username, onLogout }) {
  return (
    <div className="flex items-center justify-end px-8 py-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <span className="text-gray-500"><i className="fas fa-bell"></i></span>
        <span className="font-semibold text-gray-700">{username}</span>
        <button className="bg-red-100 text-red-600 px-3 py-1 rounded" onClick={onLogout}>Logout</button>
        <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="avatar" className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}
