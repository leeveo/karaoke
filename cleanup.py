import re

with open('components/LiveKaraokeRecorder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all setStatus(...) calls 
content = re.sub(r'\s*setStatus\([^)]*\);\s*', ' ', content)

# Remove useSnapFilters from if condition
content = re.sub(r'if \(useSnapFilters && session\?\.output\?\.live\)', 'if (session?.output?.live)', content)

with open('components/LiveKaraokeRecorder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned up setStatus and useSnapFilters!')
