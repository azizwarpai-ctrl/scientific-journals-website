const trimmed = 'a:3:{s:4:"name";s:20:"homepageImage_en.png";s:10:"uploadName";s:23:"homepageImage_en_US.png";s:12:"dateUploaded";s:19:"2026-03-10 21:55:51";}';

let result = null;
if (trimmed.includes('uploadName";s:')) {
    const match = trimmed.match(/uploadName";s:\d+:"([^"]+)"/)
    if (match?.[1]) result = match[1]
}
console.log("Extracted by current code:", result);

let newResult = null;
if (trimmed.includes('name";s:')) {
    const match = trimmed.match(/name";s:\d+:"([^"]+)"/)
    if (match?.[1]) newResult = match[1]
}
console.log("Extracted by new code:", newResult);
