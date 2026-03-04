import fs from 'fs';
import WebSocket from 'ws';

const token = '1473229591074357261.0zLFo3tZXZ9jTaxg5eaBcD-5dQV9CQq-EfpI0w3z10E';
const results = [];

function connect(testName, identifyPayload) {
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://gateway.fluxer.app/?v=1&encoding=json');
        let resolved = false;

        const done = (status, extra) => {
            if (resolved) return;
            resolved = true;
            results.push({ testName, status, extra });
            ws.close();
            resolve();
        };

        ws.on('open', () => { });

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            if (payload.op === 10) { // Hello
                ws.send(JSON.stringify({ op: 2, d: identifyPayload }));
            } else if (payload.op === 9) { // Invalid Session
                done('Invalid Session', payload.d);
            } else if (payload.t === 'READY') {
                done('READY', null);
            }
        });

        ws.on('error', (err) => {
            done('Error', err.message);
        });

        setTimeout(() => done('Timeout', null), 5000);
    });
}

async function run() {
    await connect('With Intents', {
        token,
        intents: 0,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    await connect('Without Intents', {
        token,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    await connect('With Default Discord Intents', {
        token,
        intents: 32767,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    fs.writeFileSync('test_ws_results.json', JSON.stringify(results, null, 2));
}

run();
