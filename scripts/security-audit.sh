#!/bin/bash

# Package Security Audit Script
echo "🔍 Running security audit for Family Messenger..."

# 1. Check for known vulnerabilities
echo "📋 Checking for known vulnerabilities..."
npm audit --audit-level moderate

# 2. Check for unused dependencies
echo "📦 Checking for unused dependencies..."
npx depcheck

# 3. Check package versions
echo "🔄 Checking for outdated packages..."
npm outdated

# 4. Check for suspicious packages
echo "🕵️ Checking for suspicious packages..."
SUSPICIOUS_PATTERNS=("crypto-mining" "bitcoin" "monero" "mining" "backdoor" "malware")

for pattern in "${SUSPICIOUS_PATTERNS[@]}"; do
    if npm list | grep -i "$pattern"; then
        echo "⚠️  WARNING: Suspicious package found containing '$pattern'"
    fi
done

# 5. Verify package integrity
echo "🔐 Verifying package integrity..."
npm ls --depth=0

# 6. Check for pinned versions
echo "📌 Checking package version pinning..."
if grep -E "\^|~" package.json; then
    echo "⚠️  WARNING: Some packages are not pinned to exact versions"
    echo "Run 'npm shrinkwrap' to lock all versions"
else
    echo "✅ All packages are pinned to exact versions"
fi

# 7. Generate security report
echo "📝 Generating security report..."
cat > security-audit.md << EOF
# Package Security Audit Report

## Date: $(date)

### Installed Packages:
$(npm list --depth=0)

### Audit Results:
$(npm audit --json | jq '.vulnerabilities | length') vulnerabilities found

### Recommendations:
- Keep all packages pinned to exact versions
- Regularly run security audits
- Remove unused dependencies
- Monitor for new vulnerabilities

### Critical Actions:
- Update vulnerable packages immediately
- Review all new package additions
- Use npm ci in production instead of npm install
EOF

echo "✅ Security audit complete. Check security-audit.md for details."
