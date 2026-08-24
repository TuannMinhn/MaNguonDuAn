import os

directory = r'c:\Users\tungm\Downloads\ThucTap_New\frontend\src\pages'
for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'className="main-content' in content:
                content = content.replace('className="main-content', 'className="page-container')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Updated {file}')
