
import sys
import os

path = r'c:\Users\User\Documents\ProjectL2\src\app\post\[id]\page.module.css'
if not os.path.exists(path):
    print(f"File not found: {path}")
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """
.commentList {
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 24px;
}

.comment {
  padding: 0;
  position: relative;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 32px;
}

.comment:last-child {
  border-bottom: none;
}

.authorComment {
  /* No special background anymore */
}

.commentHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  width: 100%;
}

.commentUserSide {
  display: flex;
  align-items: center;
  gap: 12px;
}

.commentAvatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  flex-shrink: 0;
}

.commentAvatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarPlaceholder {
  font-size: 1.2rem;
}

.commentUserInfo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.commentNickname {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.writerBadge {
  background-color: var(--accent-primary);
  color: white;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.commentDate {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  font-family: var(--font-outfit), sans-serif;
}

.commentBody {
  padding-left: 50px;
}

.commentText {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-all;
  white-space: pre-wrap;
  margin: 0;
}
"""

# Replace lines 543 to 622 (indices 542 to 621)
lines[542:622] = [new_content.strip() + '\n']

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Successfully updated comments section styles by line numbers.')
