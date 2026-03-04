import fs from 'fs';
const text = fs.readFileSync('bot_debug_out.txt', 'utf16le');
console.log(text);
