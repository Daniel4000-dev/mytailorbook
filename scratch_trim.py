import re

keys_to_remove = [
    'wrist', 'stomach', 'underBust', 'shoulderToBustPoint', 'crotch',
    'armhole', 'bicep', 'knee', 'calf', 'inseam', 'outseam', 'halfLength',
    'nippleToNipple', 'shoulderToWaist', 'shoulderToHips', 'backLength',
    'napeToWaist', 'frontLength', 'crossFront', 'crossBack'
]

with open('/Users/mac/Desktop/mytailorbook/lib/constants.ts', 'r') as f:
    content = f.read()

for key in keys_to_remove:
    # Match objects like: { key: 'wrist', label: 'Wrist', hint: 'Around the wrist bone', gx: 176, gy: 122 },
    # and remove the whole line.
    pattern = r'^\s*\{\s*key:\s*[\'"]' + key + r'[\'"].*?\},?\s*$'
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

with open('/Users/mac/Desktop/mytailorbook/lib/constants.ts', 'w') as f:
    f.write(content)
