const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testsDir = path.join(__dirname);
const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));

console.log(`Starting execution of ${testFiles.length} test files...`);

const report = [];

for (const file of testFiles) {
    const filePath = path.join(testsDir, file);
    const start = Date.now();
    try {
        const output = execSync(`node "${filePath}"`, {
            cwd: path.resolve(__dirname, '..'),
            timeout: 25000,
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
const failed = report.filter(r => r.status === 'FAILED').length;
console.log(`Total: ${report.length} | Passed: ${passed} | Failed: ${failed}`);

fs.writeFileSync(path.join(__dirname, 'test_summary_report.json'), JSON.stringify(report, null, 2));
