"use client";

import Link from "next/link";

import styles from "./pricing-studio.module.css";

const valueHighlights = [
  { label: "SongsAI Flow", value: "Create · Assets · Video" },
  { label: "Preview First", value: "먼저 듣고, 그다음 확정" },
  { label: "Account Based", value: "계정 안에서 이어지는 작업 흐름" },
];

const capabilityCards = [
  {
    title: "음악 생성",
    body: "한 번의 생성 요청은 계정 기준 작업 흐름으로 연결되고, 이후 Create와 My Assets에서 같은 결과를 계속 이어서 확인할 수 있습니다.",
  },
  {
    title: "미리듣기",
    body: "완전한 파일을 기다리기보다 먼저 들어보고 방향을 판단할 수 있도록 SongsAI Music은 preview 경험을 우선으로 설계되어 있습니다.",
  },
  {
    title: "다운로드",
    body: "불완전한 파일 대신 최종 자산 기준으로 내려받을 수 있도록, 다운로드 시점은 preview와 분리해 더 안정적으로 운영합니다.",
  },
  {
    title: "비디오 생성",
    body: "음악, 커버, 가사 자산을 바탕으로 SongsAI Music 서버에서 비디오를 만들고 같은 자산 흐름 안에 결과를 묶어둡니다.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create에서 시작",
    body: "곡 제목, 가사 모드, 스타일 프롬프트를 정하면 SongsAI Music의 생성 흐름이 바로 시작됩니다.",
  },
  {
    step: "02",
    title: "미리듣기로 먼저 판단",
    body: "생성 직후에는 빠르게 들어보고 방향을 잡을 수 있도록 완전한 다운로드보다 preview 경험을 먼저 제공합니다.",
  },
  {
    step: "03",
    title: "자산 확정 후 확장",
    body: "다운로드와 비디오 생성은 자산이 정리된 뒤 같은 계정 흐름 안에서 이어지고, 결과는 My Assets에서 계속 관리됩니다.",
  },
];

const policyItems = [
  "이메일 인증 계정을 기준으로 생성 이력, 자산 흐름, 비디오 작업까지 같은 사용자 축 안에 연결합니다.",
  "생성 직후의 상태와 최종 자산이 정리되는 시점은 다를 수 있으며, 이 간격을 기준으로 미리듣기와 다운로드를 분리해 운영합니다.",
  "다운로드와 비디오 생성은 자산 확정 이후 기준으로 제공되어 더 안정적인 결과를 전달하는 방향을 우선합니다.",
  "운영 문의가 필요할 때는 Support 메뉴에서 계정, 생성, 다운로드, 비디오 이슈를 바로 남길 수 있습니다.",
];

const futureItems = [
  "초기 운영 단계에서는 사용 흐름과 자산 정책을 먼저 정리하고, 이후 무료 체험 구간과 진입 구조를 나누는 방향을 검토하고 있습니다.",
  "장기적으로는 크레딧 기반 생성 구조로 확장할 수 있도록 화면과 계정 흐름을 미리 준비하고 있습니다.",
  "고급 생성, 비디오, 추가 자산 기능은 이후 별도 정책이나 상위 구간으로 확장될 가능성이 있습니다.",
  "정확한 가격과 충전 정책은 결제 흐름이 정리되는 시점에 Pricing 화면에서 다시 공지할 예정입니다.",
];

const faqItems = [
  {
    question: "왜 생성 직후와 다운로드 가능한 시점이 다른가요?",
    answer:
      "SongsAI Music은 먼저 듣고 판단하는 흐름을 우선합니다. 생성 직후에는 preview 중심으로 이어지고, 확정된 자산은 이후 기준으로 정리해 제공합니다.",
  },
  {
    question: "비디오는 어디에서 만들어지나요?",
    answer:
      "비디오는 확정된 음악, 이미지, 가사 자산을 바탕으로 SongsAI Music 서버에서 만들고, 결과는 My Assets 안에 다시 연결됩니다.",
  },
  {
    question: "계정 인증이 필요한 이유는 무엇인가요?",
    answer:
      "생성 이력, 자산 흐름, 비밀번호 재설정, 운영 문의를 하나의 작업 계정 기준으로 안전하게 이어가기 위해서입니다.",
  },
  {
    question: "요금 정책은 언제 반영되나요?",
    answer:
      "현재는 제품 경험과 운영 흐름을 먼저 정리하는 단계입니다. 크레딧과 결제 정책이 확정되면 이 화면에서 가격표와 함께 다시 안내할 예정입니다.",
  },
];

export function PricingStudio() {
  return (
    <section className={styles.section}>
      <div className={styles.heroBlock}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>SongsAI Music Policy</p>
            <h2 className={styles.title}>곡을 만들고, 먼저 듣고, 그다음 확정하는 SongsAI Music의 작업 흐름</h2>
            <p className={styles.description}>
              지금 단계의 Pricing은 가격표보다 서비스 운영 방식을 설명하는 화면에 가깝습니다. SongsAI Music에서
              생성, 미리듣기, 자산 확정, 비디오 확장까지 어떤 순서로 이어지는지 제품 기준으로 정리해두었습니다.
            </p>
            <div className={styles.heroBadgeRow}>
              <span className={styles.heroBadge}>Creative Workflow</span>
              <span className={styles.heroBadge}>Preview Driven</span>
              <span className={styles.heroBadge}>Credit Ready</span>
            </div>
          </div>

          <div className={styles.heroAside}>
            {valueHighlights.map((item) => (
              <div key={item.label} className={styles.highlightCard}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Workflow</p>
          <h3>SongsAI Music은 빠르게 확인하고, 그다음 정리하는 흐름으로 설계되어 있습니다</h3>
        </div>
        <div className={styles.workflowGrid}>
          {workflowSteps.map((item) => (
            <article key={item.step} className={styles.workflowCard}>
              <span className={styles.workflowStep}>{item.step}</span>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Capabilities</p>
          <h3>지금 바로 사용할 수 있는 핵심 기능</h3>
        </div>
        <div className={styles.cardGrid}>
          {capabilityCards.map((card) => (
            <article key={card.title} className={styles.infoCard}>
              <h4>{card.title}</h4>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.dualSection}>
        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Current Policy</p>
            <h3>현재 운영 정책</h3>
          </div>
          <ul className={styles.list}>
            {policyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Next Step</p>
            <h3>향후 요금과 크레딧 방향</h3>
          </div>
          <ul className={styles.list}>
            {futureItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>FAQ</p>
          <h3>자주 묻는 질문</h3>
        </div>
        <div className={styles.faqGrid}>
          {faqItems.map((item) => (
            <article key={item.question} className={styles.faqCard}>
              <h4>{item.question}</h4>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCopy}>
          <p className={styles.eyebrow}>Start Here</p>
          <h3>지금은 가격표보다 작업 경험과 연결감을 먼저 완성하는 단계입니다</h3>
          <p>
            SongsAI Music은 Create에서 시작해 My Assets에서 이어지고, 필요할 때 Support로 연결되는 하나의 작업
            흐름을 기준으로 정리되어 있습니다.
          </p>
        </div>
        <div className={styles.ctaButtons}>
          <Link href="/create" className={styles.primaryButton}>
            지금 Create 시작하기
          </Link>
          <Link href="/assets" className={styles.secondaryButton}>
            자산 흐름 확인하기
          </Link>
          <Link href="/support" className={styles.secondaryButton}>
            운영팀에 문의하기
          </Link>
        </div>
      </section>
    </section>
  );
}
