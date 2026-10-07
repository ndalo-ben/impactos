/* Build tiny real XLSX + PDF fixtures for the ImpactOS upload check. */
const fs = require("fs");
const XLSX = require("xlsx");

// ---- XLSX (Beneficiary Register style) ----
const rows = [
  ["Beneficiary ID", "Name", "Project", "Enrolment date", "Status"],
  ["B-001", "A. Otieno", "Youth Skills Development", "2026-04-02", "Enrolled"],
  ["B-002", "M. Anyango", "Water & Sanitation Access", "2026-04-05", "Enrolled"],
  ["B-003", "J. Ochieng", "Community Health Outreach", "2026-04-09", "Enrolled"],
  ["B-004", "L. Wanjiku", "Youth Skills Development", "2026-05-11", "Enrolled"],
  ["B-005", "D. Mwangi", "Youth Skills Development", "2026-06-30", "Enrolled"],
];
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, "Register");
XLSX.writeFile(wb, "/tmp/Beneficiary Register Test.xlsx");
console.log("xlsx bytes:", fs.statSync("/tmp/Beneficiary Register Test.xlsx").size);

// ---- PDF (minimal, valid xref) ----
const text =
  "Q2 2026 field report. During the second quarter the programme reached 120 beneficiaries across three projects in Kisumu County. The master register lists 127 enrolled beneficiaries as at 30 June 2026.";
const esc = text.replace(/([\\()])/g, "\\$1");
const stream = `BT /F1 12 Tf 72 720 Td 14 TL (${esc}) Tj ET`;
const objs = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];
let pdf = "%PDF-1.4\n";
const offsets = [];
objs.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
fs.writeFileSync("/tmp/Q2 Field Report Test.pdf", pdf, "latin1");
console.log("pdf bytes:", fs.statSync("/tmp/Q2 Field Report Test.pdf").size);
