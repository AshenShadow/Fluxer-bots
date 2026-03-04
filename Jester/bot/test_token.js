import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const tokenLine = envFile.split('\n').find(line => line.startsWith('FLUXER_BOT_TOKEN='));
const token = tokenLine ? tokenLine.split('=')[1].trim() : null;

async function test() {
    try {
        const res = await fetch('https://api.fluxer.app/users/@me', {
            headers: { Authorization: `Bot ${token}` }
        });
        const data = await res.json();
        console.log(res.status, JSON.stringify(data));
    } catch (e) {
        console.error('Error fetching gateway:', e.message);
    }
}
test();
