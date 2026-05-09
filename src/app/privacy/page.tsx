import styles from './privacy.module.css';
import layoutStyles from '@/app/layout.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={layoutStyles.centeredContent}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>개인정보처리방침</h1>
          <p className={styles.lastUpdated}>최종 수정일: 2026. 05. 09</p>

          <section>
            <h2>1. 개인정보의 수집 및 이용 목적</h2>
            <p>티끌(Ticgle)은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
            <ul>
              <li>회원 가입 및 관리: 회원 가입 의사 확인, 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리 등</li>
              <li>서비스 제공: 게시글 작성, 댓글 서비스, 좋아요 등 커뮤니티 기능 제공</li>
            </ul>
          </section>

          <section>
            <h2>2. 수집하는 개인정보 항목</h2>
            <p>티끌은 서비스 제공을 위해 최소한의 개인정보를 수집하고 있습니다.</p>
            <ul>
              <li>필수 항목: 이메일 주소, 비밀번호, 닉네임, 프로필 이미지(선택 시)</li>
              <li>소셜 로그인 시: 구글/카카오/페이스북(인스타그램) 계정 정보(이메일, 이름, 프로필 사진)</li>
            </ul>
          </section>

          <section>
            <h2>3. 개인정보의 보유 및 이용 기간</h2>
            <p>회원 탈퇴 시까지 또는 서비스 종료 시까지 보유 및 이용합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보관합니다.</p>
          </section>

          <section>
            <h2>4. 개인정보의 제3자 제공</h2>
            <p>티끌은 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우나 법령의 규정에 의거한 경우에는 예외로 합니다.</p>
          </section>

          <section>
            <h2>5. 이용자의 권리 및 행사 방법 (사용자 데이터 삭제 안내)</h2>
            <p>이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용 동의를 철회할 수 있습니다. 특히 <strong>페이스북(Instagram) 등 소셜 로그인을 통해 가입한 사용자</strong>의 데이터 삭제 절차는 다음과 같습니다.</p>
            <ul>
              <li><strong>티끌 사이트 내 탈퇴:</strong> [설정] 메뉴의 [회원 탈퇴] 버튼을 클릭하면 즉시 모든 개인정보와 활동 데이터가 영구적으로 삭제됩니다.</li>
              <li><strong>Facebook 연동 해제 및 데이터 삭제:</strong> 귀하의 Facebook 계정 설정 &gt; [보안 및 로그인] &gt; [앱 및 웹사이트] 메뉴에서 '티끌(ticgle)' 앱을 찾아 제거하시면, 당사에 부여된 데이터 접근 권한이 즉시 취소됩니다.</li>
              <li>별도의 데이터 완전 삭제 확인이 필요하신 경우 아래 개인정보 보호책임자 이메일로 요청해 주시면 영업일 기준 3일 이내에 삭제 처리를 완료하고 결과를 안내해 드립니다.</li>
            </ul>
          </section>

          <section>
            <h2>6. 개인정보 보호책임자</h2>
            <p>개인정보 보호와 관련한 문의사항 및 데이터 삭제 요청은 아래의 메일로 연락주시기 바랍니다.</p>
            <p>이메일: admin@ticgle.kr</p>
          </section>
        </div>
      </div>
    </div>
  );
}
