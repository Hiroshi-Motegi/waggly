const CATEGORY_LABELS: Record<string, string> = {
  bug: "不具合",
  feature: "機能要望",
  question: "質問",
  other: "その他",
};

const REASON_LABELS: Record<string, string> = {
  inappropriate: "不適切なコンテンツ",
  spam: "スパム",
  harassment: "嫌がらせ",
  other: "その他",
};

export function buildInquiryEmail(inquiry: {
  name: string | null;
  email: string;
  category: string;
  message: string;
  user_id: string | null;
}): { subject: string; html: string } {
  const categoryLabel = CATEGORY_LABELS[inquiry.category] ?? inquiry.category;
  return {
    subject: `[Waggly] 新しいお問い合わせ: ${categoryLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006728;">新しいお問い合わせ</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">カテゴリ</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${categoryLabel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">名前</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(inquiry.name ?? "(ログインユーザー)")}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">メール</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(inquiry.email)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ユーザーID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${inquiry.user_id ?? "(未ログイン)"}</td></tr>
        </table>
        <h3 style="margin-top: 20px;">内容</h3>
        <p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 8px;">${escapeHtml(inquiry.message)}</p>
      </div>
    `,
  };
}

export function buildReportEmail(report: {
  reported_username: string;
  reason: string;
  detail: string | null;
  reporter_email: string | null;
}): { subject: string; html: string } {
  const reasonLabel = REASON_LABELS[report.reason] ?? report.reason;
  return {
    subject: `[Waggly] 新しい通報: ${report.reported_username}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">新しい通報</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">対象ユーザー</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(report.reported_username)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">理由</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reasonLabel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">通報者メール</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(report.reporter_email ?? "(未入力)")}</td></tr>
        </table>
        ${report.detail ? `<h3 style="margin-top: 20px;">詳細</h3><p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 8px;">${escapeHtml(report.detail)}</p>` : ""}
      </div>
    `,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
