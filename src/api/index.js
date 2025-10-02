const API_BASE = "http://localhost:8080";
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

export const registerUser = async (username, email, password) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
};

export const loginUser = async (username, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

export const createFolder = async (folderName, token) => {
  const url = `${API_BASE}/files/mkdir/${encodePath(folderName)}/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    let msg = "Unknown error";
    try { msg = (await res.json()).message || msg; } catch {}
    return { error: true, status: res.status, message: msg };
  }
  try {
    return await res.json();
  } catch {
    return { error: false, status: res.status, message: await res.text() };
  }
};

export const listFiles = async (token, path = "") => {
  const url = path ? `${API_BASE}/files/list/${encodePath(path)}` : `${API_BASE}/files/list`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};

export const uploadFile = async (path, file, token) => {
  const formData = new FormData();
  formData.append("file", file);
  const url = path ? `${API_BASE}/files/upload/${encodePath(path)}` : `${API_BASE}/files/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    let msg = "Unknown error";
    try { msg = (await res.json()).message || msg; } catch {}
    return { error: true, status: res.status, message: msg };
  }
  try {
    return await res.json();
  } catch {
    return { error: false, status: res.status, message: await res.text() };
  }
};

export const downloadFile = async (filePath, token) => {
  const url = filePath ? `${API_BASE}/files/download/${encodePath(filePath)}` : `${API_BASE}/files/download`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    let msg = "Unknown error";
    try { msg = (await res.json()).message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const downloadName = filePath.split("/").pop();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
};

export const deleteFile = async (filePath, token) => {
  const url = filePath ? `${API_BASE}/files/delete/${encodePath(filePath)}` : `${API_BASE}/files/delete`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.text();
};
