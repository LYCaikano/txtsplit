document.getElementById('splitForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const file = document.getElementById('file').files[0];
  const chunkSizeMB = parseFloat(document.getElementById('chunkSize').value);
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';

  if (!file || isNaN(chunkSizeMB) || chunkSizeMB <= 0) {
    alert('请上传文件并输入合法的分块大小');
    return;
  }

  const MAX_BYTES = chunkSizeMB * 1024 * 1024;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks = [];
  let offset = 0;
  let index = 1;

  while (offset < bytes.length) {
    let end = Math.min(offset + MAX_BYTES, bytes.length);
    while (end > offset) {
      try {
        decoder.decode(bytes.slice(offset, end));
        break;
      } catch (e) {
        end--;
      }
    }

    if (end === offset) {
      resultDiv.innerHTML = '无法分割文件，可能编码错误或不完整的 UTF-8。';
      return;
    }

    const chunkBytes = bytes.slice(offset, end);
    const filename = `${index}_${baseName}.txt`;
    chunks.push({ name: filename, data: chunkBytes });

    offset = end;
    index++;
  }

  // 下载列表
  const fileList = document.createElement('ul');
  chunks.forEach(chunk => {
    const blob = new Blob([chunk.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.download = chunk.name;
    a.textContent = chunk.name;
    li.appendChild(a);
    fileList.appendChild(li);
  });

  // ZIP 下载按钮
  const zipButton = document.createElement('button');
  zipButton.textContent = '打包下载 ZIP';
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

  resultDiv.innerHTML = '<h3>分割完成：</h3>';
  resultDiv.appendChild(fileList);
  resultDiv.appendChild(zipButton);
});
