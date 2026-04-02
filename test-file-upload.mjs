// Test file upload functionality
import fs from 'fs';

// Create a test file
const testContent = 'This is a test file for file upload functionality. Created on ' + new Date().toISOString();
const testFileName = 'test-file.txt';
const base64Data = Buffer.from(testContent).toString('base64');
const dataUrl = `data:text/plain;base64,${base64Data}`;

console.log('Testing file upload...');
console.log('File name:', testFileName);
console.log('File type:', 'text/plain');
console.log('Data length:', dataUrl.length);
console.log('First 100 chars:', dataUrl.substring(0, 100));

// Test payload
const payload = {
    content: testFileName,
    conversationId: 'cmm0nb8mx000612ashxpjpnqk',
    type: 'FILE',
    fileData: dataUrl,
    fileName: testFileName,
    fileType: 'text/plain'
};

console.log('\nPayload structure:');
console.log(JSON.stringify(payload, null, 2));
