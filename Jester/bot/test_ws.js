import WebSocket from 'ws';

const token = '1473229591074357261.0zLFo3tZXZ9jTaxg5eaBcD-5dQV9CQq-EfpI0w3z10E';

function connect(testName, identifyPayload) {
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://gateway.fluxer.app/?v=1&encoding=json');

        ws.on('open', () => {
            console.log(`[${testName}] Connected`);
        });

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            console.log(`[${testName}] Received Opcode:`, payload.op, payload.t || '');

            if (payload.op === 10) { // Hello
                console.log(`[${testName}] Sending Identify`);
                ws.send(JSON.stringify({
                    op: 2, // Identify
                    d: identifyPayload
                }));
            }

            if (payload.op === 9) { // Invalid Session
                console.log(`[${testName}] ❌ Invalid Session:`, payload.d);
                ws.close();
                resolve();
            }

            if (payload.t === 'READY') {
                console.log(`[${testName}] ✅ READY received!`);
                ws.close();
                resolve();
            }
        });

        ws.on('error', (err) => {
            console.error(`[${testName}] Error:`, err.message);
            resolve();
        });
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
}

run();
