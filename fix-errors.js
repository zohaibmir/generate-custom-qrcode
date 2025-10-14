const fs = require('fs');

const filePath = './services/qr-service/src/services/qr-category.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all error objects with a simple error string - more comprehensive regex
content = content.replace(/error:\s*\{[^}]*code:\s*['"][^'"]*['"][^}]*message:\s*['"]([^'"]*)['"'][^}]*\}/gm, "error: '$1'");

// Additional pattern for error objects with details
content = content.replace(/error:\s*\{[^}]*code:\s*[^,]*,[^}]*message:\s*[^,]*,[^}]*statusCode:\s*[^,}]*[^}]*\}/gm, match => {
  const messageMatch = match.match(/message:\s*['"]([^'"]*)['"]/);
  return messageMatch ? `error: '${messageMatch[1]}'` : "error: 'Operation failed'";
});

fs.writeFileSync(filePath, content);
console.log('Fixed error objects in qr-category.service.ts');