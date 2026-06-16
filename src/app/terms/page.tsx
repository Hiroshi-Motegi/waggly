"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function TermsPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="利用規約" variant="dark" />

      <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
        <p className="text-xs text-[#8b8b8b]">最終更新日: 2026年6月15日</p>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第1条（サービス内容）</h3>
          <p className="text-base">Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。本サービスには無料プランと有料プラン（Waggly Pro）があり、プランに応じて利用できる機能の範囲が異なります。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第2条（プランと料金）</h3>
          <p className="text-base">本サービスには以下のプランがあります。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li><strong>無料プラン</strong>: ギア管理・練習記録は無制限。AI機能（チャット・練習メニュー提案）には月間利用回数の制限があります。</li>
            <li><strong>Waggly Pro（月額¥480）</strong>: 無料プランの全機能に加え、AI機能の月間利用回数が大幅に増加します。</li>
          </ul>
          <p className="text-base">また、広告非表示オプション（¥100・買い切り）を購入することで、アプリ内の広告を非表示にできます。広告非表示はプランとは独立したオプションです。</p>
          <p className="text-base">各プランの具体的な利用回数の上限は、アプリ内のプラン画面に表示される内容に従います。運営者は、事前の通知をもってプラン内容や料金を変更する場合があります。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第3条（有料プランの契約・解約）</h3>
          <p className="text-base">有料プランの契約は、アプリ内の決済画面からクレジットカードによるお支払いで開始されます。契約は1ヶ月単位の自動更新となり、契約日と同日に毎月課金されます。</p>
          <p className="text-base">有料プランの解約（無料プランへの変更）は、アプリ内のプラン画面からいつでも行えます。解約した場合、現在の課金期間の終了日まで有料プランの機能を引き続きご利用いただけます。課金期間の途中で解約した場合の日割り返金は行いません。</p>
          <p className="text-base">解約後、課金期間内であればプランの再開（Proに戻す）が可能です。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第4条（AI機能について）</h3>
          <p className="text-base">本サービスのAI機能（AIチャット・練習メニュー提案）は、一般的な情報に基づくものであり、回答の正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。AI機能の利用回数は毎月1日にリセットされます。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第5条（個人情報の取り扱い）</h3>
          <p className="text-base">本サービスでは、アカウント情報（LINE・Googleアカウントの表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴、お支払い情報（Pay.jpを通じて処理）を保存します。これらの情報はサービス提供の目的のみに使用し、個人を特定できる形での第三者への提供は行いません。クレジットカード情報はPay.jp社が管理し、本サービスのサーバーには保存されません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第6条（匿名データの活用）</h3>
          <p className="text-base">本サービスでは、サービス品質の向上を目的として、ユーザーの登録データ（クラブスペック、練習記録、AI提案への評価等）を匿名化・統計化した上で、AI機能の改善に活用する場合があります。</p>
          <p className="text-base">統計データには個人を特定できる情報は含まれません。活用例：</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>クラブの平均飛距離の算出</li>
            <li>練習メニューの傾向分析</li>
            <li>AIアドバイスの精度向上</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第7条（投稿コンテンツ）</h3>
          <p className="text-base">ユーザーは、本サービスにおいて画像やテキスト等のコンテンツ（以下「投稿コンテンツ」）を投稿・公開することができます。投稿コンテンツに関して以下の事項に同意するものとします。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>投稿コンテンツの内容について、ユーザー自身が一切の責任を負います。</li>
            <li>投稿コンテンツに関する著作権その他の権利は、投稿したユーザーに帰属します。ただし、運営者はサービス提供に必要な範囲で投稿コンテンツを利用できるものとします。</li>
            <li>第三者の著作権、肖像権、プライバシーその他の権利を侵害するコンテンツを投稿してはなりません。</li>
            <li>運営者は、本規約に違反する投稿コンテンツを事前の通知なく削除する権利を有します。</li>
          </ul>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第8条（禁止事項）</h3>
          <p className="text-base">以下の行為を禁止します。</p>
          <ul className="list-disc pl-5 space-y-0.5 text-base">
            <li>本サービスへの不正アクセスや過度な負荷をかける行為</li>
            <li>AI機能を本来の目的以外で利用する行為</li>
            <li>他のユーザーに迷惑をかける行為</li>
            <li>不正な手段による有料プランの利用回避</li>
            <li>公序良俗に反する画像・テキストの投稿</li>
            <li>わいせつ、暴力的、差別的なコンテンツの投稿</li>
            <li>他者の権利（著作権、肖像権、プライバシー等）を侵害するコンテンツの投稿</li>
          </ul>
          <p className="text-base">運営者は、上記の禁止事項に違反した場合、事前の通知なく投稿コンテンツの削除、アカウントの一時停止または永久停止等の措置を講じることができます。これにより生じた損害について、運営者は一切の責任を負いません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第9条（コンテンツの通報）</h3>
          <p className="text-base">ユーザーは、本規約に違反すると思われる投稿コンテンツを発見した場合、公開プロフィールページの通報機能またはお問い合わせ先より運営者に報告することができます。運営者は通報を受けた場合、合理的な期間内に内容を確認し、必要に応じて削除等の措置を講じます。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第10条（アカウントの削除）</h3>
          <p className="text-base">ユーザーは、アプリ内の設定画面からいつでもアカウントを削除できます。アカウント削除により、登録された全てのデータ（クラブ、練習記録、AI相談履歴等）が完全に削除され、復元はできません。有料プランを契約中の場合、アカウント削除と同時にサブスクリプションも解約されます。残りの課金期間の返金は行いません。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第11条（免責事項）</h3>
          <p className="text-base">本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。決済に関するトラブルについては、決済代行会社（Pay.jp）の規約に従います。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第12条（サービスの変更・停止）</h3>
          <p className="text-base">運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。サービス停止の場合、有料プランの未消化期間については返金を行います。</p>
        </section>

        <section className="space-y-1">
          <h3 className="text-base font-bold text-[#006728]">第13条（規約の変更）</h3>
          <p className="text-base">本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。有料プランの料金に関わる重要な変更については、変更の30日前までにアプリ内で通知します。</p>
        </section>
      </div>
      </div>
    </div>
  );
}
