document.getElementById("split-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById("file");
  const chunkSizeInput = document.getElementById("chunkSize");
  const resultDiv = document.getElementById("result");

  const file = fileInput.files[0];
  const chunkSizeMB = parseFloat(chunkSizeInput.value);

  if (!file || isNaN(chunkSizeMB) || chunkSizeMB <= 0) {
    alert("请确保选择了文件并正确输入了分块大小");
    return;
  }

  const MAX_BYTES = chunkSizeMB * 1024 * 1024;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8", { fatal: true });

  let offset = 0;
  let chunkIndex = 0;
  const chunks = [];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  while (offset < bytes.length) {
    let end = Math.min(offset + MAX_BYTES, bytes.length);
    let valid = false;

    while (!valid && end > offset) {
      try {
        decoder.decode(bytes.subarray(offset, end));
        valid = true;
      } catch (e) {
        end--;
      }
    }

    if (end === offset) {
      resultDiv.innerHTML = "<p style='color:red;'>无法在不破坏 UTF-8 字符的情况下分割文件。</p>";
      return;
    }

    const chunkData = bytes.slice(offset, end);
    const base64Data = uint8ToBase64(chunkData);
    const filename = `${++chunkIndex}_${baseName}.txt`;

    chunks.push({ filename, chunkData, base64Data });
    offset = end;
  }

  // 显示下载链接列表
  const ul = document.createElement("ul");
  chunks.forEach((chunk) => {
    const link = document.createElement("a");
    link.href = `data:text/plain;base64,${chunk.base64Data}`;
    link.download = chunk.filename;
    link.textContent = chunk.filename;
    const li = document.createElement("li");
    li.appendChild(link);
    ul.appendChild(li);
  });

  // 添加打包下载按钮
  const zipButton = document.createElement("button");
  zipButton.textContent = "打包下载 ZIP";
  zipButton.onclick = () => downloadZip(chunks, baseName);

  resultDiv.innerHTML = "<h3>下载分割后的文件</h3>";
  resultDiv.appendChild(ul);
  resultDiv.appendChild(zipButton);
});

function uint8ToBase64(u8Arr) {
  const CHUNK_SIZE = 0x8000;
  let index = 0;
  let result = "";
  while (index < u8Arr.length) {
    const slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, u8Arr.length));
    result += String.fromCharCode.apply(null, slice);
    index += CHUNK_SIZE;
  }
  return btoa(result);
}

// 创建并下载 ZIP 文件
function downloadZip(chunks, baseName) {
  const zip = new JSZip();
  chunks.forEach(({ filename, chunkData }) => {
    zip.file(filename, chunkData);
  });

  zip.generateAsync({ type: "blob" }).then((content) => {
    const blobURL = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = blobURL;
    link.download = `${baseName}_chunks.zip`;
    link.click();
    URL.revokeObjectURL(blobURL);
  });
}
