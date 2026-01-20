import json
import sys
import os

filename = 'lighthouse-prod.json'

if not os.path.exists(filename):
    print(f"Error: {filename} not found.")
    sys.exit(1)

try:
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        data = json.load(f)

    categories = data.get('categories', {})
    print("### Lighthouse Scores (Production)")
    for k, v in categories.items():
        score = v.get('score', 0)
        if score is None: score = 0
        print(f"- **{v['title']}**: {int(score * 100)}")

    audits = data.get('audits', {})
    print("\n### Key Metrics (Production)")
    metrics = [
        'first-contentful-paint',
        'largest-contentful-paint',
        'total-blocking-time',
        'cumulative-layout-shift',
        'speed-index',
        'interactive'
    ]
    for m in metrics:
        if m in audits:
            print(f"- {audits[m]['title']}: {audits[m]['displayValue']}")

except Exception as e:
    print(f"Error parsing report: {e}")
