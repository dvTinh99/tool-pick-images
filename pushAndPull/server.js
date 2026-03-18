const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = '/document/images';

async function uploadWithPuppeteer() {
  const browser = await puppeteer.launch({
    headless: false // debug dễ hơn
  });

  const page = await browser.newPage();

  // 👉 2. vào trang upload
  await page.goto('https://target-site.com/upload');

  const files = fs.readdirSync(IMAGE_DIR);
  const results = [];

  for (const fileName of files) {
    const filePath = path.join(IMAGE_DIR, fileName);

    if (!fs.statSync(filePath).isFile()) continue;

    try {
      // 👉 3. chọn input file
      const input = await page.$('input[type="file"]');

      await input.uploadFile(filePath);

      // 👉 4. submit (tuỳ site)
      await page.click('#uploadBtn');

      // 👉 5. chờ upload xong
      await page.waitForSelector('.uploaded-image-url');

      // 👉 6. lấy link
      const url = await page.$eval(
        '.uploaded-image-url',
        el => el.value || el.src || el.innerText
      );

      results.push({
        file: fileName,
        url
      });

      // 👉 7. xoá file sau khi thành công
      fs.unlinkSync(filePath);

    } catch (err) {
      console.error(`Fail: ${fileName}`, err);
    }
  }

  await browser.close();

  return results;
}

const Fastify = require('fastify');
const app = Fastify();

app.get('/upload-puppeteer', async () => {
  const data = await uploadWithPuppeteer();
  return { success: true, data };
});

app.listen({ port: 3000 });