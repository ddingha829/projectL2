
import os

path = r'c:\Users\User\Documents\ProjectL2\src\app\layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Site Name and Description
content = content.replace('WoogaWooga 우가우가', '티끌 Ticgle')
content = content.replace('우가우가', '티끌')
content = content.replace('WoogaWooga', 'Ticgle')
content = content.replace('일상의 모든 순간을 리뷰합니다. 영화, 책, 게임, 맛집까지 에디터들이 전하는 생생한 리뷰 사이트, 티끌.', '티끌 모아 반짝이는, 일상 매거진')
content = content.replace('일상의 모든 것을 리뷰하는 매거진, 티끌', '티끌 모아 반짝이는, 일상 매거진')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated layout.tsx")
