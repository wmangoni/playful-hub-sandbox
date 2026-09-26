const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const results = {
    missingFiles: [],
    brokenIframeTargets: [],
    missingImages: [],
    missingRoutes: [],
    qaTestStatus: []
};

// 1. Check all games in jogos/*.html
const jogosDir = path.join(rootDir, 'jogos');
const jogosFiles = fs.readdirSync(jogosDir).filter(f => f.endsWith('.html'));

console.log(`Found ${jogosFiles.length} files in /jogos/`);

jogosFiles.forEach(f => {
    const filePath = path.join(jogosDir, f);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check iframe src
    const iframeMatches = content.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatches && iframeMatches[1]) {
        const src = iframeMatches[1];
        if (!src.startsWith('http') && !src.startsWith('//')) {
            // resolve relative to jogos directory or root
            let target = path.resolve(jogosDir, src);
            if (!fs.existsSync(target)) {
                // try relative to root
                target = path.resolve(rootDir, src.startsWith('/') ? src.slice(1) : src);
                if (!fs.existsSync(target)) {
                    results.brokenIframeTargets.push({ file: f, src, resolved: target });
                }
            }
        }
    }
});

// 2. Check index.html GAMES_DATA and static cards
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

// Match previewImg: '...'
const previewImgRegex = /previewImg:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = previewImgRegex.exec(indexHtml)) !== null) {
    const imgSrc = match[1];
    const resolved = path.resolve(rootDir, imgSrc.startsWith('./') ? imgSrc.slice(2) : imgSrc);
    if (!fs.existsSync(resolved)) {
        results.missingImages.push({ context: 'GAMES_DATA', src: imgSrc, resolved });
    }
}

// Match <img ... src="..."
const imgTagRegex = /<img[^>]+src=["']([^"']+)["']/g;
while ((match = imgTagRegex.exec(indexHtml)) !== null) {
    const imgSrc = match[1];
    if (imgSrc.startsWith('./') || imgSrc.startsWith('assets/')) {
        const cleanPath = imgSrc.startsWith('./') ? imgSrc.slice(2) : imgSrc;
        const resolved = path.resolve(rootDir, cleanPath);
        if (!fs.existsSync(resolved)) {
            results.missingImages.push({ context: 'index.html <img>', src: imgSrc, resolved });
        }
    }
}

// 3. Check server.js routes vs jogos/ directory
const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf-8');
jogosFiles.forEach(f => {
    const baseName = f.replace('.html', '');
    const route = `/jogos/${baseName}`;
    if (!serverJs.includes(route)) {
        results.missingRoutes.push({ file: f, expectedRoute: route });
    }
});

// Check if blender_game is in server.js or index.html
if (!serverJs.includes('blender_game')) {
    results.missingRoutes.push({ file: 'blender_game/game_fps.html', expectedRoute: '/blender_game or /jogos/blender_game' });
}

console.log('=== AUDIT RESULTS ===');
console.log(JSON.stringify(results, null, 2));
