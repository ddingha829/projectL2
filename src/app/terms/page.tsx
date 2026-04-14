import styles from '../privacy/legal.module.css'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '서비스 이용약관',
  description: '티끌(Ticgle) 서비스 이용약관',
}

export default function TermsOfService() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>서비스 이용약관</h1>
        <p className={styles.updated}>최종 수정일: 2026년 4월 15일</p>

        <section className={styles.section}>
          <h2>제1조 (목적)</h2>
          <p>이 약관은 티끌(이하 &quot;서비스&quot;)이 제공하는 온라인 매거진 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정하는 것을 목적으로 합니다.</p>
        </section>

        <section className={styles.section}>
          <h2>제2조 (정의)</h2>
          <ul>
            <li><strong>&quot;서비스&quot;</strong>란 티끌이 제공하는 웹사이트 및 관련 서비스 일체를 말합니다.</li>
            <li><strong>&quot;이용자&quot;</strong>란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li><strong>&quot;회원&quot;</strong>이란 서비스에 가입하여 이메일과 비밀번호 또는 소셜 로그인을 통해 인증된 이용자를 말합니다.</li>
            <li><strong>&quot;티끌러&quot;</strong>란 서비스 내에서 콘텐츠를 작성할 수 있는 권한(에디터 등급)이 부여된 회원을 말합니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <ul>
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>서비스는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 변경 시 적용일자 7일 전부터 공지합니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제4조 (회원 가입)</h2>
          <ul>
            <li>이용자는 서비스가 정한 가입 양식에 따라 회원 정보를 기입한 후 약관에 동의하여 회원 가입을 신청합니다.</li>
            <li>서비스는 이메일 인증 또는 소셜 로그인(구글 등)을 통해 본인 확인 후 가입을 승인합니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제5조 (서비스의 제공)</h2>
          <p>서비스는 다음과 같은 기능을 제공합니다.</p>
          <ul>
            <li>매거진 콘텐츠(리뷰, 에세이 등)의 열람</li>
            <li>회원 간 댓글 및 소통 기능</li>
            <li>티끌러에 의한 콘텐츠 작성 및 관리</li>
            <li>기타 서비스가 정하는 부가 기능</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제6조 (이용자의 의무)</h2>
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul>
            <li>타인의 개인정보를 도용하거나 부정하게 사용하는 행위</li>
            <li>서비스에 게시된 콘텐츠를 무단으로 복제, 배포, 전송, 전시하는 행위</li>
            <li>타인의 명예를 훼손하거나 불이익을 주는 행위</li>
            <li>음란, 폭력적, 차별적 내용의 정보를 게시하는 행위</li>
            <li>서비스의 안정적 운영을 방해하는 행위</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제7조 (콘텐츠의 저작권)</h2>
          <ul>
            <li>서비스에 게시된 콘텐츠의 저작권은 해당 콘텐츠를 작성한 이용자에게 있습니다.</li>
            <li>이용자가 서비스에 게시한 콘텐츠는 서비스 내에서의 노출, 홍보 목적으로 사용될 수 있으며, 이를 위해 필요한 범위 내에서 수정, 복제, 편집할 수 있습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제8조 (서비스 이용의 제한 및 중지)</h2>
          <ul>
            <li>서비스는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고·일시 정지·영구 이용 정지 등의 조치를 취할 수 있습니다.</li>
            <li>서비스는 천재지변, 시스템 장애 등 불가항력의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제9조 (회원 탈퇴 및 자격 상실)</h2>
          <ul>
            <li>회원은 언제든지 서비스에 탈퇴를 요청할 수 있으며, 서비스는 즉시 회원 탈퇴를 처리합니다.</li>
            <li>탈퇴 후 재가입 시 이전 활동 기록 및 데이터는 복구되지 않을 수 있습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제10조 (면책 조항)</h2>
          <ul>
            <li>서비스는 이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 하여 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.</li>
            <li>서비스는 무료로 제공되는 서비스와 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>제11조 (준거법 및 관할)</h2>
          <p>이 약관에 관한 분쟁은 대한민국 법률을 준거법으로 하며, 서비스와 관련하여 발생한 분쟁에 대한 소송은 민사소송법상의 관할 법원에 제기합니다.</p>
        </section>

        <section className={styles.section}>
          <h2>부칙</h2>
          <p>이 약관은 2026년 4월 15일부터 적용됩니다.</p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
