import styles from './legal.module.css'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '티끌(Ticgle) 개인정보처리방침',
}

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>개인정보처리방침</h1>
        <p className={styles.updated}>최종 수정일: 2026년 4월 15일</p>

        <section className={styles.section}>
          <h2>1. 개인정보의 수집 및 이용 목적</h2>
          <p>티끌(이하 &quot;서비스&quot;)은 다음 목적을 위해 개인정보를 수집·이용합니다.</p>
          <ul>
            <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지</li>
            <li>서비스 제공: 콘텐츠 제공, 맞춤형 서비스 제공</li>
            <li>서비스 개선: 기존 서비스 개선 및 신규 서비스 개발을 위한 통계 분석</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. 수집하는 개인정보 항목</h2>
          <ul>
            <li><strong>필수 항목:</strong> 이메일 주소, 비밀번호(이메일 가입 시), 닉네임(표시 이름)</li>
            <li><strong>소셜 로그인 시:</strong> 해당 소셜 계정에서 제공하는 이메일 주소, 프로필 이름, 프로필 이미지</li>
            <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 접속 IP 정보, 쿠키</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <p>회원의 개인정보는 원칙적으로 회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          <ul>
            <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
            <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
            <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 개인정보의 제3자 제공</h2>
          <p>서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우는 예외로 합니다.</p>
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. 개인정보의 파기 절차 및 방법</h2>
          <p>서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
          <ul>
            <li><strong>전자적 파일 형태:</strong> 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
            <li><strong>기록물, 인쇄물, 서면:</strong> 분쇄기로 분쇄하거나 소각</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. 이용자의 권리와 행사 방법</h2>
          <p>이용자는 언제든지 본인의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보의 수집 및 이용 동의를 철회할 수 있습니다.</p>
        </section>

        <section className={styles.section}>
          <h2>7. 쿠키(Cookie)의 운용 및 거부</h2>
          <p>서비스는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 쿠키를 사용합니다. 이용자는 웹브라우저의 설정을 통해 쿠키의 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.</p>
        </section>

        <section className={styles.section}>
          <h2>8. 개인정보 보호책임자</h2>
          <p>서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <ul>
            <li><strong>담당:</strong> 티끌 운영팀</li>
            <li><strong>문의:</strong> 서비스 내 문의 기능 이용</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. 개인정보처리방침의 변경</h2>
          <p>이 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 고지합니다.</p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
