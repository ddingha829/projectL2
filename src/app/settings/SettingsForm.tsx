"use client";

import { useState } from "react";
import { updateProfile, changePassword } from "./actions";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function SettingsForm({ user, profile }: { user: any, profile: any }) {
  const router = useRouter();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isWriter = profile?.role === "admin" || profile?.role === "editor";
  
  // Color presets (matching some in authors.ts)
  const colors = ["#FF3333", "#33CCFF", "#33FF99", "#FF9933", "#B833FF", "#000000", "#1a77ce"];
  const [selectedColor, setSelectedColor] = useState(profile?.color || colors[0]);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    if (isWriter) {
      formData.set("color", selectedColor);
    }

    const result = await updateProfile(formData);
    if (result.success) {
      setSuccessMsg("프로필 정보가 성공적으로 변경되었습니다.");
      router.refresh();
    } else {
      setErrorMsg(result.error || "변경 중 오류가 발생했습니다.");
    }
    setIsSubmittingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingPass(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await changePassword(formData);
    if (result.success) {
      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다.");
      (e.target as HTMLFormElement).reset();
    } else {
      setErrorMsg(result.error || "비밀번호 변경 중 오류가 발생했습니다.");
    }
    setIsSubmittingPass(false);
  };

  return (
    <div className={styles.formGrid}>
      {successMsg && <div className={styles.successMessage}>{successMsg}</div>}
      {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

      <section className={styles.formSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>👤</span>
          <h2 className={styles.sectionTitle}>프로필 설정</h2>
        </div>
        
        <form onSubmit={handleProfileUpdate} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>닉네임 (댓글용)</label>
            <input 
              name="displayName" 
              type="text" 
              className={styles.input} 
              defaultValue={profile?.display_name || ""} 
              placeholder="표시될 닉네임을 입력하세요"
              required 
            />
          </div>

          {isWriter && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>작가 한 줄 소개</label>
                <textarea 
                  name="bio" 
                  className={styles.textarea} 
                  defaultValue={profile?.bio || ""} 
                  placeholder="본인을 잘 나타내는 소개를 써주세요"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>아바타 이미지 URL</label>
                <input 
                  name="avatarUrl" 
                  type="text" 
                  className={styles.input} 
                  defaultValue={profile?.avatar_url || ""} 
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>대표 강점 (한 줄에 하나씩)</label>
                <textarea 
                  name="bullets" 
                  className={styles.textarea} 
                  defaultValue={profile?.bullets?.join("\n") || ""} 
                  placeholder="맥주없인 절대 치킨 안먹는 타입\n하루 세시간씩 출퇴근에 쓰지만 밝은 사람..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>프로필 포인트 컬러</label>
                <div className={styles.colorGrid}>
                  {colors.map(c => (
                    <div 
                      key={c} 
                      className={`${styles.colorOption} ${selectedColor === c ? styles.active : ""}`} 
                      style={{ backgroundColor: c }}
                      onClick={() => setSelectedColor(c)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isSubmittingProfile}>
            {isSubmittingProfile ? "저장 중..." : "프로필 저장하기"}
          </button>
        </form>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🔐</span>
          <h2 className={styles.sectionTitle}>비밀번호 변경</h2>
        </div>
        
        <form onSubmit={handlePasswordChange} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>새 비밀번호</label>
            <input 
              name="newPassword" 
              type="password" 
              className={styles.input} 
              required 
              placeholder="최소 6자 이상"
              minLength={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>비밀번호 확인</label>
            <input 
              name="confirmPassword" 
              type="password" 
              className={styles.input} 
              required 
              placeholder="다시 한번 입력하세요"
              minLength={6}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmittingPass}>
            {isSubmittingPass ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>
      </section>
    </div>
  );
}
