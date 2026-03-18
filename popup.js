let images = [];
let currentIndex = 0;

const preview = document.getElementById("preview");
const canvas = document.getElementById("cropCanvas");

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

function showImage() {
  if (images.length === 0) return;
  preview.src = images[currentIndex];
  document.getElementById("counter").innerText =
    `${currentIndex + 1} / ${images.length}`;
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

// resize canvas theo image
preview.onload = () => {
  canvas.width = preview.clientWidth;
  canvas.height = preview.clientHeight;
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

document.getElementById("crop").addEventListener("click", () => {
  if (!cropRect) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = preview.src;

  img.onload = () => {
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const tempCanvas = document.createElement("canvas");
    const tctx = tempCanvas.getContext("2d");

    tempCanvas.width = Math.abs(cropRect.width) * scaleX;
    tempCanvas.height = Math.abs(cropRect.height) * scaleY;

    tctx.drawImage(
      img,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.width * scaleX,
      cropRect.height * scaleY,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );

    tempCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: url,
        filename: `cropped_${Date.now()}.png`
      });
    });
  };
});