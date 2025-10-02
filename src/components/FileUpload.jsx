import React from "react";

const FileUpload = ({ uploading, onUpload }) => (
	<label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 ml-auto">
		{uploading ? "Uploading..." : "Upload File"}
		<input
			type="file"
			className="hidden"
			onChange={onUpload}
		/>
	</label>
);

export default FileUpload;
// }
