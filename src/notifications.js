/**
 * 在庫アラート通知機能
 */

/**
 * 共通：在庫月数アラート通知
 * - メール内で「ワンクリックでコピー」は出来ないため、
 *   ①商品名はリンクにしない
 *   ②行URLを生テキストで出す（選択→コピーしやすい）
 *   ③「コピー用（TSV）」ブロックも併記
 */
function notifyAvgStockAlert_(opts) {
  const {
    sheetName,
    emailTo,
    avgThreshold,
    digestMax,
    subjectPrefix,
    // row => boolean
    predicate,
    // 追加の条件説明（メール本文用）
    conditionLines,
  } = opts;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const ssUrl = ss.getUrl();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`シート「${sheetName}」が見つかりません。`);
  const gid   = sheet.getSheetId();

  const values = sheet.getDataRange().getValues();
  if (!values.length) return;

  const head = values[0];

  // 必要列（共通）
  const col = {
    name:   head.indexOf('商品名'),
    after1: head.indexOf('入荷後の直近1年在庫月数'),
    after3: head.indexOf('入荷後の直近3年度在庫月数'),
    ship4:  head.indexOf('4年以内に出荷があったか'),
    imp:    head.indexOf('輸入対象外'),
  };

  const missing = Object.entries(col).filter(([, ix]) => ix < 0).map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `必要な列が見当たりません（不足: ${missing.join(', ')}）。` +
      ` / 必須: 商品名, 入荷後の直近1年在庫月数, 入荷後の直近3年度在庫月数, 4年以内に出荷があったか, 輸入対象外`
    );
  }

  const toBool = (v) => String(v).toLowerCase() === 'true';
  const toNum  = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const hits = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const ctx = {
      row,
      rowIndex: i,        // 0-based data row
      rowNum: i + 1,      // sheet row number
      shippedOK: toBool(row[col.ship4]),
      isImportExcluded: toBool(row[col.imp]), // 「輸入対象外」= TRUE なら除外
      name: row[col.name],
      after1: toNum(row[col.after1]),
      after3: toNum(row[col.after3]),
    };

    if (!predicate(ctx)) continue;

    const avg = (ctx.after1 + ctx.after3) / 2;
    if (avg <= avgThreshold) {
      const link = `${ssUrl}#gid=${gid}&range=${ctx.rowNum}:${ctx.rowNum}`;
      hits.push({ name: ctx.name, avg, link, rowNum: ctx.rowNum });
    }
  }

  if (!hits.length) return;

  // HTMLダイジェスト：商品名はリンクにしない／URLを生で出す
  const digest = hits.slice(0, digestMax).map(h => {
    return `
      <li style="margin-bottom:8px;">
        <div><b>${escapeHtml(h.name)}</b>（平均 ${h.avg.toFixed(1)} ヶ月）</div>
        <div style="font-size:12px;color:#555;">
          行URL（コピー用）: <span style="font-family:monospace;">${escapeHtml(h.link)}</span>
        </div>
      </li>`;
  }).join('');

  const omitted = hits.length > digestMax
    ? `<p style="color:#888;">…ほか <b>${hits.length - digestMax} 件</b> 省略</p>`
    : '';

  // コピペしやすいTSV（Excel/スプシに貼れる）
  const tsv = hits.slice(0, digestMax).map(h =>
    `${String(h.name).replace(/\t/g, ' ')}\t${h.link}\t${h.avg.toFixed(1)}`
  ).join('\n');

  const subject = `【在庫アラート】${subjectPrefix} 平均在庫月数 ≤ ${avgThreshold}：${hits.length}件`;

  const htmlBody = `
    <p>以下の条件を満たす商品が <b>${hits.length}件</b> 見つかりました。</p>
    <ul style="margin-top:0;">
      ${conditionLines.map(x => `<li>${escapeHtml(x)}</li>`).join('')}
      <li>平均在庫月数（(直近1年＋3年度)/2） ≤ ${avgThreshold}</li>
    </ul>

    <p>▼ダイジェスト（最大 ${digestMax} 件）</p>
    <ul style="padding-left:18px;">${digest}</ul>
    ${omitted}

    <hr>

    <p style="margin:8px 0 4px;"><b>▼コピー用（TSV）</b>：スプレッドシートに貼り付け可</p>
    <pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;border:1px solid #ddd;padding:10px;border-radius:6px;">${escapeHtml(tsv)}</pre>

    <p style="font-size:0.85em;color:#666;">自動通知 / Apps Script</p>
  `;

  MailApp.sendEmail({ to: emailTo, subject, htmlBody });
}

/**
 * 1) 旧 notifyLowStockMonths 相当
 * 輸入対象の低在庫アラート
 */
function notifyLowStockMonths() {
  const SHEET_NAME    = '在庫管理';
  const EMAIL_TO      = Session.getActiveUser().getEmail();
  const AVG_THRESHOLD = 4;
  const DIGEST_MAX    = 100;

  notifyAvgStockAlert_({
    sheetName: SHEET_NAME,
    emailTo: EMAIL_TO,
    avgThreshold: AVG_THRESHOLD,
    digestMax: DIGEST_MAX,
    subjectPrefix: '（輸入対象）',
    predicate: ({ shippedOK, isImportExcluded }) => shippedOK && !isImportExcluded,
    conditionLines: [
      '4年以内に出荷があったか = TRUE',
      '輸入対象外 = FALSE',
    ],
  });
}

/**
 * 2) 旧 notifyAvgStockNonImport 相当
 * 非輸入対象の低在庫アラート
 */
function notifyAvgStockNonImport() {
  const SHEET_NAME    = '在庫管理';
  const EMAIL_TO      = Session.getActiveUser().getEmail();
  const AVG_THRESHOLD = 2;
  const DIGEST_MAX    = 100;

  notifyAvgStockAlert_({
    sheetName: SHEET_NAME,
    emailTo: EMAIL_TO,
    avgThreshold: AVG_THRESHOLD,
    digestMax: DIGEST_MAX,
    subjectPrefix: '（非輸入）',
    predicate: ({ shippedOK, isImportExcluded }) => shippedOK && isImportExcluded,
    conditionLines: [
      '4年以内に出荷があったか = TRUE',
      '輸入対象外 = TRUE',
    ],
  });
}
