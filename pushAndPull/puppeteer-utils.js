const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = '/document/images';

async function uploadWithPuppeteer(IMAGE_DIR) {
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

async function screenShotWithPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: true
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 👉 đảm bảo video load
    await page.waitForSelector('video');

    await page.evaluate(() => {
        const v = document.querySelector('video');
        v.play();
    });

    // 👉 inject script để control video
    let duration = 30 * 60;
    try {
        
        duration = await page.evaluate(() => {
          const video = document.querySelector('video');
          return video.duration;
        });
    } catch (error) {
        duration = await page.waitForFunction(() => {
            const v = document.querySelector('video');
            return v && v.duration && v.duration > 0;
        });
    }

    if (!duration || duration === Infinity) {
      throw new Error('Cannot get video duration');
    }

    const screenshots = [];

    for (let i = 0; i < 6; i++) {
      const randomTime = duration * (0.1 + Math.random() * 0.8);

      await page.evaluate((time) => {
        const video = document.querySelector('video');
        video.currentTime = time;
      }, randomTime);

      // 👉 chờ frame render
      await page.waitForTimeout(1000);

      const videoElement = await page.$('video');

      const buffer = await videoElement.screenshot({
        type: 'png'
      });

      screenshots.push(buffer.toString('base64'));
    }

    await browser.close();

    return {
      success: true,
      images: screenshots // base64
    };
 } catch (error) {
     await browser.close();
    return {
      success: false,
      images: [] // base64
    };
 }
}

module.exports = {
  uploadWithPuppeteer,
  screenShotWithPuppeteer
};
