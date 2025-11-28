#!/bin/bash
ssh root@147.93.108.205 << 'EOF'
curl -s 'http://localhost:3000/api/products?limit=1' | python3 -m json.tool | head -150
EOF
