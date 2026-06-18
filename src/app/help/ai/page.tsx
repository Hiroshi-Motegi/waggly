"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function HelpAiPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative flex flex-col space-y-2">
        <PageHeader title="AI機能について" variant="dark" />

        <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">AIチャット</h3>
            <p className="text-base">ゴルフに関するお悩みをAIに相談できる機能です。クラブ選び、スイングの改善、コースマネジメントなど、幅広い相談に対応します。</p>
            <p className="text-base">ホーム画面のメニューまたは「AI相談」からアクセスできます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">AI練習メニュー</h3>
            <p className="text-base">あなたのスキルや目標に合わせた練習メニューをAIが提案します。登録済みのクラブ情報や練習記録を元に、より適切なメニューを作成します。</p>
            <p className="text-base">ホーム画面のメニューまたは「練習メニュー」からアクセスできます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">利用回数について</h3>
            <p className="text-base">AI機能には月間の利用回数制限があります。利用回数は毎月1日にリセットされます。</p>
            <ul className="list-disc pl-5 space-y-0.5 text-base">
              <li><strong>無料プラン</strong>: AIチャット・練習メニューそれぞれ月5回まで</li>
              <li><strong>Waggly Pro</strong>: AIチャット・練習メニューそれぞれ月50回まで</li>
            </ul>
            <p className="text-base">残り回数はそれぞれの機能画面で確認できます。</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-base font-bold text-[#006728]">ご注意</h3>
            <ul className="list-disc pl-5 space-y-0.5 text-base">
              <li>AIの回答は一般的な情報に基づくものであり、専門的な指導の代わりにはなりません</li>
              <li>回答の正確性は保証しておりません</li>
              <li>クラブ選びやスイング改善の最終判断はご自身で行ってください</li>
              <li>ゴルフに関係のない質問にはお答えできない場合があります</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
