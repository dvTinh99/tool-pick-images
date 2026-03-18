const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { uploadWithPuppeteer, screenShotWithPuppeteer } = require('./puppeteer-utils');

const IMAGE_DIR = '/document/images';

const Fastify = require('fastify');
const app = Fastify();

app.get('/upload-puppeteer', async () => {
    const data = await uploadWithPuppeteer(IMAGE_DIR);
    return { success: true, data };
});

app.post('/capture-video', async (req, reply) => {
    const { url } = req.body;
    try {
        const {
            success,
            images // base64
        } = await screenShotWithPuppeteer(url)
    } catch (error) {
        return reply.status(500).send({ error: err.message });
    }

});

app.listen({ port: 3000 });
