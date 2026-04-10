const sanitizeHtml = require('sanitize-html');

const input = '<h3>Title</h3><p>Hello <strong>world</strong></p><script>alert("xss")</script><div onclick="evil()">Bad</div>';
const output = sanitizeHtml(input, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
    allowedAttributes: {},
});

console.log('Input:', input);
console.log('Output:', output);

if (output.includes('<h3>Title</h3>') && output.includes('<p>Hello <strong>world</strong></p>') && !output.includes('<script>') && !output.includes('onclick')) {
    console.log('Verification PASSED');
} else {
    console.log('Verification FAILED');
    process.exit(1);
}
