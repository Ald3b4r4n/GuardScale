/*
  Sanitize README.md across history:
  - Remove any lines starting with SMTP_ (SMTP credentials examples)
  - Replace common demo e-mails like *@gmail.com with user@example.com
  - Normalize leftover multiple blank lines
*/
const fs = require('fs');
const path = require('path');

const p = path.resolve('README.md');
if (!fs.existsSync(p)) {
  process.exit(0);
}

let s = fs.readFileSync(p, 'utf8');

// Remove SMTP_* lines entirely
s = s.replace(/^SMTP_.*\r?\n?/gim, '');

// Replace obvious demo addresses
s = s.replace(/[A-Za-z0-9._%+-]+@gmail\.com/g, 'user@example.com');

// Collapse 3+ blank lines to at most 2
s = s.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(p, s);