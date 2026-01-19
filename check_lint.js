const { execSync } = require('child_process');

try {
    console.log("Running ESLint...");
    // Run eslint and capture stdout. Ignore errors (exit code 1) to process output.
    const stdout = execSync('npx eslint . --format json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });

    const results = JSON.parse(stdout);

    let totalErrors = 0;

    results.forEach(res => {
        if (res.errorCount > 0) {
            console.log(`\nFILE: ${res.filePath}`);
            res.messages.forEach(msg => {
                if (msg.severity === 2) { // 2 = Error
                    console.log(`  [Line ${msg.line}] ${msg.message} (${msg.ruleId})`);
                    totalErrors++;
                }
            });
        }
    });

    console.log(`\nTotal Errors Found: ${totalErrors}`);

} catch (e) {
    // execSync throws if exit code is not 0, but stdout might still have the JSON
    if (e.stdout) {
        try {
            const results = JSON.parse(e.stdout.toString());
            let totalErrors = 0;
            results.forEach(res => {
                if (res.errorCount > 0) {
                    console.log(`\nFILE: ${res.filePath}`);
                    res.messages.forEach(msg => {
                        if (msg.severity === 2) {
                            console.log(`  [Line ${msg.line}] ${msg.message} (${msg.ruleId})`);
                            totalErrors++;
                        }
                    });
                }
            });
            console.log(`\nTotal Errors Found: ${totalErrors}`);
        } catch (parseErr) {
            console.error("Failed to parse JSON output from exception.", parseErr);
        }
    } else {
        console.error("Execution failed without stdout:", e.message);
    }
}
