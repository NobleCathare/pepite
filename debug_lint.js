const fs = require('fs');

try {
    // Read as buffer to handle BOM potentially, or just utf8
    let content = fs.readFileSync('lint_results.json', 'utf8');

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    // Sometimes PowerShell adds text at the start/end if something else outputted?
    // Try to find [ ... ]
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        content = content.substring(start, end + 1);
    }

    const results = JSON.parse(content);

    console.log("=== LINT ERRORS ===");
    let count = 0;
    results.forEach(res => {
        if (res.errorCount > 0) {
            console.log(`\n📄 ${res.filePath}`);
            res.messages.forEach(msg => {
                if (msg.severity === 2) {
                    console.log(`   ❌ Line ${msg.line}: ${msg.message} [${msg.ruleId}]`);
                    count++;
                }
            });
        }
    });
    console.log(`\nTotal Errors: ${count}`);

} catch (e) {
    console.error("Error:", e.message);
}
