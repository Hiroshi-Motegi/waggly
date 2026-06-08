"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function TermsPage() {
  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="利用規約" />

      <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
        <p className="text-[10px] text-[#8b8b8b]">最終更新日: 2026年6月8日</p>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第1条（サービス内容）</h3>
          <p className="text-base">Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。本サービスは現在ベータ版として提供しており、全機能を無料でご利用いただけます。正式リリース時には、機能内容や料金体系が変更される場合があります。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第2条（ベータ版について）</h3>
          <p className="text-base">本サービスはベータ版であり、予告なく機能の追加・変更・削除、またはサービスの中断が発生する可能性があります。ベータ版の利用に起因する不具合やデータの消失について、運営者は一切の責任を負いません。また、ベータ期間中に登録されたデータは、正式リリース時に引き継がれることを保証するものではありません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第3条（AI機能について）</h3>
          <p className="text-base">本サービスのAIコーチ機能はベータ版として提供しています。AIの回答は一般的な情報に基づくものであり、正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第4条（個人情報の取り扱い）</h3>
          <p className="text-base">本サービスでは、LINEアカウント情報（表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴を保存します。これらの情報はサービス提供の目的のみに使用し、個人を特定できる形での第三者への提供は行いません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第5条（匿名データの活用）</h3>
          <p className="text-base">本サービスでは、サービス品質の向上を目的として、ユーザーの登録データ（クラブスペック、練習記録、AI提案への評価等）を匿名化・統計化した上で、AI機能の改善に活用する場合があります。</p>
          <p className="text-base">統計データには個人を特定できる情報は含まれません。活用例：</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>クラブの平均飛距離の算出</li>
            <li>練習メニューの傾向分析</li>
            <li>AIアドバイスの精度向上</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第6条（禁止事項）</h3>
          <p className="text-base">以下の行為を禁止します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>本サービスへの不正アクセスや過度な負荷をかける行為</li>
            <li>AI機能を本来の目的以外で利用する行為</li>
            <li>他のユーザーに迷惑をかける行為</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第7条（免責事項）</h3>
          <p className="text-base">本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第8条（サービスの変更・停止）</h3>
          <p className="text-base">運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第9条（規約の変更）</h3>
          <p className="text-base">本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。</p>
        </section>
      </div>
    </div>
  );
}
