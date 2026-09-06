import os
import re

def split_main_js():
    with open('main.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # // --- [ 로 시작하는 줄을 기준으로 분리
    parts = re.split(r'(?=\n// --- \[)', '\n' + content)
    
    os.makedirs('src/js', exist_ok=True)
    
    script_files = []
    
    # parts[0] is empty or whitespace before the first match
    for i, p in enumerate(parts):
        if not p.strip():
            continue
        
        # 첫 번째 줄에서 제목 추출
        lines = p.strip().split('\n')
        header_line = lines[0]
        
        # 안전한 파일명 생성 (특수문자 제거, 번호 붙이기)
        # 예: // --- [0. 환경설정] ---
        match = re.search(r'\[(.*?)\]', header_line)
        name = match.group(1) if match else "misc"
        
        # Windows-safe filename
        safe_name = re.sub(r'[^a-zA-Z0-9가-힣]', '_', name)
        safe_name = re.sub(r'_+', '_', safe_name).strip('_')
        
        if not safe_name:
            safe_name = "misc"
            
        filename = f"src/js/{i:02d}_{safe_name}.js"
        
        with open(filename, 'w', encoding='utf-8') as out_f:
            out_f.write(p.strip() + '\n')
            
        script_files.append(filename)
        print(f"Created {filename}")
        
    print("Script files lists:")
    for sf in script_files:
        print(f'<script src="{sf}"></script>')

    # Update index.html
    with open('index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    script_tags = '\n'.join([f'<script src="{sf}"></script>' for sf in script_files])
    
    # Replace <script src="main.js"></script> with the new script tags
    if '<script src="main.js"></script>' in html_content:
        new_html = html_content.replace('<script src="main.js"></script>', script_tags)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Updated index.html successfully.")
    else:
        print("Warning: <script src=\"main.js\"></script> not found in index.html")

if __name__ == '__main__':
    split_main_js()
