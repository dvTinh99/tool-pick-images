let images = [];
let currentIndex = 0;

const preview = document.getElementById("preview");
const canvas = document.getElementById("cropCanvas");

async function getScreenshots(url) {
  const res = await fetch('http://localhost:3000/capture-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  const data = await res.json();

  data.images.map(base64 => `data:image/png;base64,${base64}`);

  images = data.images
      .filter(Boolean);

  showImage()
}

document.getElementById("load").addEventListener("click", async () => {
  const url = document.getElementById("url").value;

  try {
    const res = await fetch(url);
    const text = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const imgs = [...doc.querySelectorAll("img")];

    images = imgs
      .map(img => {
        let src = img.getAttribute("src");

        if (src && !src.startsWith("http")) {
          const base = new URL(url);
          src = new URL(src, base.origin).href;
        }

        return src;
      })
      .filter(Boolean);

    currentIndex = 0;
    showImage();

  } catch (err) {
    console.error(err);
    alert("Error loading images");
  }
});

function saveState() {
  chrome.storage.local.set({
    images,
    currentIndex,
    zoom,
    cropRect
  });
}

function showImage() {
  if (images.length === 0) return;
  preview.src = images[currentIndex];
  document.getElementById("counter").innerText =
    `${currentIndex + 1} / ${images.length}`;

  saveState()
}

document.getElementById("next").addEventListener("click", () => {
  if (images.length === 0) return;
  currentIndex = (currentIndex + 1) % images.length;
  showImage();
});

document.getElementById("prev").addEventListener("click", () => {
  if (images.length === 0) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  showImage();
});

const ctx = canvas.getContext("2d");

let startX = 0;
let startY = 0;
let isDragging = false;
let cropRect = null;

let zoom = 1;

preview.onload = () => {
  const container = document.querySelector('.viewer');

  const scale = Math.min(
    container.clientWidth / preview.naturalWidth,
    container.clientHeight / preview.naturalHeight
  );

  const displayWidth = preview.naturalWidth * scale;
  const displayHeight = preview.naturalHeight * scale;

  preview.style.width = displayWidth + 'px';
  preview.style.height = displayHeight + 'px';

  canvas.width = displayWidth;
  canvas.height = displayHeight;

  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
};

// resize canvas theo image
// preview.onload = () => {
//   canvas.width = preview.clientWidth;
//   canvas.height = preview.clientHeight;
// };

function applyZoom() {
  const stage = document.getElementById('stage');
  stage.style.transform = `scale(${zoom})`;
}

document.getElementById('zoomIn').onclick = () => {
  zoom *= 1.2;
  applyZoom();
};

document.getElementById('zoomOut').onclick = () => {
  zoom /= 1.2;
  applyZoom();
};

// mouse events
canvas.addEventListener("mousedown", (e) => {
  startX = e.offsetX;
  startY = e.offsetY;
  isDragging = true;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  const width = currentX - startX;
  const height = currentY - startY;

  cropRect = { x: startX, y: startY, width, height };

  drawRect();
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

function drawRect() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!cropRect) return;

  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height
  );
}

document.getElementById('crop').onclick = () => {
  const img = new Image();
  img.src = preview.src;

  img.onload = () => {
    // 👉 scale giữa natural và display
    const displayWidth = preview.clientWidth;
    const displayHeight = preview.clientHeight;

    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;

    // 👉 tính cả zoom
    const realX = (cropRect.x / zoom) * scaleX;
    const realY = (cropRect.y / zoom) * scaleY;
    const realWidth = (cropRect.width / zoom) * scaleX;
    const realHeight = (cropRect.height / zoom) * scaleY;

    const outCanvas = document.createElement('canvas');
    const ctx = outCanvas.getContext('2d');

    outCanvas.width = Math.abs(realWidth);
    outCanvas.height = Math.abs(realHeight);

    ctx.drawImage(
      img,
      realX,
      realY,
      realWidth,
      realHeight,
      0,
      0,
      outCanvas.width,
      outCanvas.height
    );

    outCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url,
        filename: `crop_${Date.now()}.png`
      });
    });
  };
};

document.getElementById("clear").onclick = () => {
  chrome.storage.local.clear(() => {
    images = [];
    currentIndex = 0;
    zoom = 1;
    cropRect = null;

    preview.src = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    alert("Cleared!");
  });
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["images", "currentIndex", "zoom", "cropRect"],
    (data) => {
      images = data.images || [];
      currentIndex = data.currentIndex || 0;
      zoom = data.zoom || 1;
      cropRect = data.cropRect || null;

      if (images.length > 0) {
        preview.src = images[currentIndex];
      }

      applyZoom();
      drawRect();
      showImage()
    }
  );
});