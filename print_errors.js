const fs = require('fs');

try {
    // PowerShell often writes UTF-16LE with BOM
    const content = fs.readFileSync('lint_results.json', 'utf16le');

    // Clean up potential JSON issues if mixed content
    const jsonStr = content.trim();
    const results = JSON.parse(jsonStr);

    console.log("=== LINT ERRORS ===");
    results.forEach(res => {
        if (res.errorCount > 0) {
            console.log(`\n📄 ${res.filePath}`);
            res.messages.forEach(msg => {
                if (msg.severity === 2) {
                    console.log(`   ❌ Line ${msg.line}: ${msg.message} [${msg.ruleId}]`);
                }
            });
        }
    });

} catch (e) {
    console.error("Error parsing log:", e.message);
    // Fallback: print raw file part to debug
    try {
        const raw = fs.readFileSync('lint_results.json', 'utf8');
        console.log("Raw preview:", raw.substring(0, 200));
    } catch (err) { }
}
