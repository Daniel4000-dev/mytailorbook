import re

with open('proxy.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!",
    r"process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!",
    content
)

with open('proxy.ts', 'w') as f:
    f.write(content)
