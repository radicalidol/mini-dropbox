import React from "react";

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r flex flex-col p-6">
      <h1 className="text-2xl font-bold mb-8 text-blue-700">Dropbox</h1>
      <nav className="flex-1">
        <ul className="space-y-4 text-gray-700">
          <li className="font-semibold text-blue-600">Files</li>
        </ul>
      </nav>
    </aside>
  );
}
