const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testsDir = path.join(__dirname);
const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));

console.log(`Starting execution of ${testFiles.length} test files...`);

const report = [];

const HEAVY_TESTS = new Set([
    'qa_ded_make_character.test.js',
    'qa_ded_card.test.js',
    'qa_poker.test.js',
    'tumbalacatumba_mobile.test.js',
    'qa_desafio.test.js',
    'blood_and_silver_procedural_scenery.test.js',
    'qa_tetris.test.js',
    'qa_ded.test.js',
    'blood_and_silver_music.test.js',
    'qa_museum_crt_pc.test.js'
]);

for (const file of testFiles) {
    if (process.env.SKIP_HEAVY === '1' && HEAVY_TESTS.has(file)) {
        report.push({ file, status: 'SKIPPED', duration: '0s' });
        console.log(`⏭ [SKIP] ${file} (teste pesado ignorado no CI)`);
        continue;
    }
    const filePath = path.join(testsDir, file);
    const start = Date.now();
    try {
        const output = execSync(`node "${filePath}"`, {
            cwd: path.resolve(__dirname, '..'),
            timeout: parseInt(process.env.TEST_TIMEOUT || '150000', 10),
            env: { ...process.env, NODE_ENV: 'test' },
            encoding: 'utf-8'
        });
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        report.push({ file, status: 'PASSED', duration: `${duration}s` });
        console.log(`✅ [PASS] ${file} (${duration}s)`);
    } catch (err) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        report.push({
            file,
            status: 'FAILED',
            duration: `${duration}s`,
            error: (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + (err.message || '')
        });
        console.log(`❌ [FAIL] ${file} (${duration}s)`);
        console.log(err.stdout || err.message);
    }
}

console.log('\n=== SUMMARY ===');
const passed = report.filter(r => r.status === 'PASSED').length;
const skipped = report.filter(r => r.status === 'SKIPPED').length;
const failed = report.filter(r => r.status === 'FAILED').length;
console.log(`Total: ${report.length} | Passed: ${passed} | Skipped: ${skipped} | Failed: ${failed}`);

fs.writeFileSync(path.join(__dirname, 'test_summary_report.json'), JSON.stringify(report, null, 2));

if (failed > 0) {
    process.exit(1);
}
