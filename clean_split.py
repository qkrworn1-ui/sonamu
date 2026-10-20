import os
import re

def clean_filenames():
    js_dir = 'src/js'
    if not os.path.exists(js_dir):
        print("Directory not found")
        return
    
    mapping = {
        "01": "01_kakao_optimization.js",
        "02": "02_env_version.js",
        "03": "03_init_utils.js",
        "04": "04_scope_adjust.js",
        "05": "05_mileage_engine.js",
        "06": "06_common_ui_utils.js",
        "07": "07_firebase_init.js",
        "08": "08_auth_logic.js",
        "09": "09_navigation_sync.js",
        "10": "10_dashboard_logic.js",
        "11": "11_vote_logic.js",
        "12": "12_team_mgmt.js",
        "13": "13_finance_logic.js",
        "14": "14_member_mgmt.js",
        "15": "15_board_logic.js",
        "16": "16_gallery_report.js",
        "17": "17_calendar_logic.js",
        "18": "18_member_positions.js"
    }
    
    files = os.listdir(js_dir)
    for f in files:
        prefix = f[:2]
        if prefix in mapping:
            old_path = os.path.join(js_dir, f)
            new_path = os.path.join(js_dir, mapping[prefix])
            if old_path != new_path:
                if os.path.exists(new_path):
                    os.remove(new_path)
                os.rename(old_path, new_path)
                print(f"Renamed {f} -> {mapping[prefix]}")

    # Re-read files to update index.html
    new_files = sorted(os.listdir(js_dir))
    
    with open('index.html', 'r', encoding='utf-8') as html_f:
        html = html_f.read()
        
    # Find all <script src="src/js/..."> tags and replace them
    pattern = r'<script src="src/js/.*?"></script>'
    new_tags = '\n'.join([f'<script src="src/js/{nf}"></script>' for nf in new_files])
    
    # Simple replacement of the block
    import re
    # Find the start of the block and end of the block
    matches = list(re.finditer(pattern, html))
    if matches:
        start = matches[0].start()
        end = matches[-1].end()
        new_html = html[:start] + new_tags + html[end:]
        with open('index.html', 'w', encoding='utf-8') as html_out:
            html_out.write(new_html)
        print("Updated index.html")

if __name__ == '__main__':
    clean_filenames()
