import url from './assets/sample.png';
const img = new Image();
img.src = url;
document.body.appendChild(img);
console.log('image url', url);
