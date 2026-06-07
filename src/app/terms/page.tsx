"use client";

export default function TermsPage() {
  return (
    <div className="p-4 pb-24 space-y-6 text-sm">
      <h2 className="text-xl font-bold">利用規約</h2>
      <p className="text-xs text-muted-foreground">最終更新日: 2026年6月8日</p>

      <section className="space-y-2">
        <h3 className="font-semibold">第1条（サービス内容）</h3>
        <p>Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第2条（AI機能について）</h3>
        <p>本サービスのAIコーチ機能はベータ版として提供しています。AIの回答は一般的な情報に基づくものであり、正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第3条（個人情報の取り扱い）</h3>
        <p>本サービスでは、LINEアカウント情報（表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴を保存します。これらの情報はサービス提供の目的のみに使用し、第三者への提供は行いません。</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第4条（禁止事項）</h3>
        <p>以下の行為を禁止します。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本サービスへの不正アクセスや過度な負荷をかける行為</li>
          <li>AI機能を本来の目的以外で利用する行為</li>
          <li>他のユーザーに迷惑をかける行為</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第5条（免責事項）</h3>
        <p>本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第6条（サービスの変更・停止）</h3>
        <p>運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">第7条（規約の変更）</h3>
        <p>本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。</p>
      </section>
    </div>
  );
}
