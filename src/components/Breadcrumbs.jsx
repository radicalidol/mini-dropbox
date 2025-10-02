import React from "react";

const Breadcrumbs = ({ pathParts, onNavigate }) => (
  <div className="flex space-x-1 text-sm mb-2">
    <span
      className="cursor-pointer text-blue-600"
      onClick={() => onNavigate("")}
    >
      Home
    </span>
    {pathParts.map((part, idx) => (
      <span key={idx} className="flex items-center">
        <span className="mx-1">/</span>
        <span
          className="cursor-pointer text-blue-600"
          onClick={() => onNavigate(pathParts.slice(0, idx + 1).join("/"))}
        >
          {part}
        </span>
      </span>
    ))}
  </div>
);

export default Breadcrumbs;

