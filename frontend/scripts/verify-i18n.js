/**
 * SmartCV i18n Parity Checker
 * Recursively verifies that `en.ts` and `ar.ts` have 100% key parity,
 * no missing keys, no orphan keys, and no empty strings.
 */

const fs = require("fs");
const path = require("path");

const enPath = path.join(__dirname, "../src/lib/i18n/en.ts");
const arPath = path.join(__dirname, "../src/lib/i18n/ar.ts");

function extractObjectFromTs(filePath, varName) {
  const content = fs.readFileSync(filePath, "utf-8");
  // Find `export const <varName>`
  const declIndex = content.indexOf(`export const ${varName}`);
  if (declIndex === -1) {
    throw new Error(`Failed to find declaration of ${varName} in ${filePath}`);
  }
  const startIndex = content.indexOf("{", declIndex);
  const lastIndex = content.lastIndexOf("}");
  if (startIndex === -1 || lastIndex === -1) {
    throw new Error(`Failed to find object boundaries in ${filePath}`);
  }
  let body = content.slice(startIndex, lastIndex + 1);

  // Evaluate safely as JS object
  const fn = new Function(`return (${body});`);
  return fn();
}

try {
  const enObj = extractObjectFromTs(enPath, "en");
  const arObj = extractObjectFromTs(arPath, "ar");

  let missingInAr = [];
  let orphanInAr = [];
  let emptyInAr = [];
  let emptyInEn = [];
  let totalKeys = 0;

  function compareObjects(enNode, arNode, currentPath = "") {
    // Check all keys in en
    for (const key of Object.keys(enNode)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      totalKeys++;

      if (!(key in arNode)) {
        missingInAr.push(fullPath);
        continue;
      }

      const enVal = enNode[key];
      const arVal = arNode[key];

      if (typeof enVal === "object" && enVal !== null) {
        if (typeof arVal !== "object" || arVal === null) {
          missingInAr.push(`${fullPath} (expected object, got ${typeof arVal})`);
        } else {
          compareObjects(enVal, arVal, fullPath);
        }
      } else {
        if (typeof arVal === "string" && arVal.trim() === "") {
          emptyInAr.push(fullPath);
        }
        if (typeof enVal === "string" && enVal.trim() === "") {
          emptyInEn.push(fullPath);
        }
      }
    }

    // Check for orphan keys in ar
    for (const key of Object.keys(arNode)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      if (!(key in enNode)) {
        orphanInAr.push(fullPath);
      }
    }
  }

  compareObjects(enObj, arObj);

  console.log("==========================================");
  console.log("   SmartCV i18n Key Parity Audit Report   ");
  console.log("==========================================");
  console.log(`Total Keys Inspected: ${totalKeys}`);

  let hasError = false;

  if (missingInAr.length > 0) {
    hasError = true;
    console.error(`❌ Keys missing in ar.ts (${missingInAr.length}):`);
    missingInAr.forEach((k) => console.error(`   - ${k}`));
  }

  if (orphanInAr.length > 0) {
    hasError = true;
    console.error(`❌ Orphan keys in ar.ts (${orphanInAr.length}):`);
    orphanInAr.forEach((k) => console.error(`   - ${k}`));
  }

  if (emptyInAr.length > 0) {
    hasError = true;
    console.error(`⚠️ Empty strings in ar.ts (${emptyInAr.length}):`);
    emptyInAr.forEach((k) => console.error(`   - ${k}`));
  }

  if (emptyInEn.length > 0) {
    hasError = true;
    console.error(`⚠️ Empty strings in en.ts (${emptyInEn.length}):`);
    emptyInEn.forEach((k) => console.error(`   - ${k}`));
  }

  if (!hasError) {
    console.log("✅ 100% PARITY CONFIRMED!");
    console.log("   - 0 missing keys in ar.ts");
    console.log("   - 0 orphan keys in ar.ts");
    console.log("   - 0 empty strings detected");
    console.log("==========================================");
    process.exit(0);
  } else {
    console.error("==========================================");
    console.error("❌ PARITY AUDIT FAILED!");
    process.exit(1);
  }
} catch (err) {
  console.error("Fatal error during parity test:", err.message);
  process.exit(1);
}
