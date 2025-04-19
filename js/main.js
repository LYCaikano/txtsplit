document.getElementById('file').addEventListener('change', function () {
  const fileNameDisplay = document.getElementById('fileName');
  fileNameDisplay.textContent = this.files[0]?.name || '';
});

document.getElementById('splitForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const file = document.getElementById('file').files[0];
  const chunkSizeInput = document.getElementById('chunkSize');
  const chunkSizeMB = parseFloat(chunkSizeInput.value);
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';

  // 自定义校验逻辑
  if (!file) {
    showAlert("请选择一个TXT文件");
    return;
  }

  if (!chunkSizeInput.value || isNaN(chunkSizeMB) || chunkSizeMB <= 0) {
    showAlert("请输入分块大小");
    return;
  }

  const MAX_BYTES = chunkSizeMB * 1024 * 1024;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  // 编码判断逻辑
  let encoding = null;
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    encoding = 'utf-16le';
  } else {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      encoding = 'utf-8';
    } catch (e) {
      encoding = null;
    }
  }

  if (encoding === 'utf-8') {
    splitUTF8(bytes, baseName, MAX_BYTES);
  } else if (encoding === 'utf-16le') {
    splitUTF16LE(bytes, baseName, MAX_BYTES);
  } else {
    showAlert("仅支持utf8及utf16");
  }
});

function splitUTF8(bytes, baseName, maxBytes) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks = [];
  let offset = 0, index = 1;

  while (offset < bytes.length) {
    let end = Math.min(offset + maxBytes, bytes.length);
    while (end > offset) {
      try {
        decoder.decode(bytes.slice(offset, end));
        break;
      } catch (e) {
        end--;
      }
    }

    if (end === offset) {
      document.getElementById('result').innerHTML = '无法分割文件，可能编码错误或不完整的 UTF-8。';
      return;
    }

    const chunkBytes = bytes.slice(offset, end);
    chunks.push({ name: `${index}_${baseName}.txt`, data: chunkBytes });
    offset = end;
    index++;
  }

  displayResult(chunks, baseName);
}

function splitUTF16LE(bytes, baseName, maxBytes) {
  const chunks = [];
  let offset = 0, index = 1;

  while (offset < bytes.length) {
    let end = offset + maxBytes;

    if (end > bytes.length) {
      end = bytes.length;
    } else if ((end - offset) % 2 !== 0) {
      end--; // 保证双字节对齐
    }

    const chunkBytes = bytes.slice(offset, end); // 不包含BOM
    chunks.push({ name: `${index}_${baseName}.txt`, data: chunkBytes });
    offset = end;
    index++;
  }

  displayResult(chunks, baseName, 'utf-16le');
}

function displayResult(chunks, baseName, encoding = 'utf-8') {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<h3>分割完成!</h3>';

  const zipButton = document.createElement('button');
  zipButton.textContent = '下载ZIP';
  zipButton.style.display = 'block';
  zipButton.style.margin = '20px auto';
  zipButton.onclick = async () => {
    const zip = new JSZip();
    chunks.forEach(chunk => {
      zip.file(chunk.name, chunk.data);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_split.zip`;
    a.click();
  };

  resultDiv.appendChild(zipButton);
}

let alertTimeout;

function showAlert(message) {
  const alertEl = document.getElementById('custom-alert');
  alertEl.textContent = message;
  alertEl.classList.remove('hide');
  alertEl.classList.add('show');

  if (alertTimeout) clearTimeout(alertTimeout);

  alertTimeout = setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    alertTimeout = null;
  }, 2000);
}

