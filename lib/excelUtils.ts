import * as XLSX from 'xlsx';

export interface TradeRecord {
  type: 'BUY' | 'SELL';
  price: number;
  units: number;
  security: string;
  accountNumber: string;
}

export interface ParsedExcelData {
  trades: TradeRecord[];
}

/**
 * Parse Excel file with the exact 19-column specification:
 * Board, Security, Buy_Trader, Buy_Trading_Account, Sell_Trader, Sell_Trading_Account,
 * Time, Trade_No, Buy_Order_No, Sell_Order_No, Price, Qty, Value, Settlement_Value,
 * Is_Auto_Trade, Trade_Time, Maturity_Date, Status, Amend_Time
 */
export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
          reject(new Error('No sheet found in workbook'));
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
          reject(new Error('No data found in sheet'));
          return;
        }

        // Parse trades from the expected columns
        // Handle cross trades: a row can have BOTH Buy_Trading_Account AND Sell_Trading_Account populated
        const trades: TradeRecord[] = [];
        for (const row of jsonData) {
          const trade = row as Record<string, any>;

          // Extract the required fields
          const security = (trade['Security'] || '').toString().trim();
          const price = parseFloat(trade['Price']);
          const qty = parseFloat(trade['Qty']);

          // Get both accounts - they may both be populated (cross trade)
          const buyAccount = (trade['Buy_Trading_Account'] || '').toString().trim();
          const sellAccount = (trade['Sell_Trading_Account'] || '').toString().trim();

          // Validate price, qty, and security
          if (!isNaN(price) && !isNaN(qty) && security) {
            // Add BUY trade if Buy_Trading_Account is populated
            if (buyAccount) {
              trades.push({
                type: 'BUY',
                price,
                units: qty,
                security,
                accountNumber: buyAccount,
              });
            }

            // Add SELL trade if Sell_Trading_Account is populated
            if (sellAccount) {
              trades.push({
                type: 'SELL',
                price,
                units: qty,
                security,
                accountNumber: sellAccount,
              });
            }
          }
        }

        if (trades.length === 0) {
          reject(new Error('No valid trades found in file'));
          return;
        }

        resolve({
          trades,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normalize account number for comparison: trim whitespace and strip leading zeros
 */
function normalizeAccount(account: string): string {
  return account.trim().replace(/^0+/, '') || '0';
}

/**
 * Filter trades by account number with tolerance for whitespace and leading zeros.
 * Matches against the account based on the trade type:
 * - BUY trades: match against Buy_Trading_Account
 * - SELL trades: match against Sell_Trading_Account
 */
export function filterByAccount(trades: TradeRecord[], accountFilter: string): TradeRecord[] {
  if (!accountFilter.trim()) {
    return trades;
  }

  const normalized = normalizeAccount(accountFilter);
  return trades.filter((trade) => {
    const tradeNormalized = normalizeAccount(trade.accountNumber);
    return tradeNormalized === normalized;
  });
}

/**
 * Filter trades by type (BUY, SELL, or ALL)
 */
export function filterByType(trades: TradeRecord[], typeFilter: 'ALL' | 'BUY' | 'SELL'): TradeRecord[] {
  if (typeFilter === 'ALL') {
    return trades;
  }
  return trades.filter((trade) => trade.type === typeFilter);
}

export interface AggregatedTrade {
  type: 'BUY' | 'SELL';
  price: number;
  units: number;
  security: string;
}

/**
 * Aggregate trades by security with volume-weighted average price
 */
export function aggregateBySecurityVWAP(trades: TradeRecord[]): AggregatedTrade[] {
  const grouped: Record<string, { totalValue: number; totalUnits: number; type: 'BUY' | 'SELL' }> = {};

  for (const trade of trades) {
    const key = trade.security;
    if (!grouped[key]) {
      grouped[key] = { totalValue: 0, totalUnits: 0, type: trade.type };
    }
    grouped[key].totalValue += trade.price * trade.units;
    grouped[key].totalUnits += trade.units;
  }

  const result: AggregatedTrade[] = [];
  for (const [security, data] of Object.entries(grouped)) {
    const vwap = data.totalUnits > 0 ? data.totalValue / data.totalUnits : 0;
    result.push({
      type: data.type,
      price: parseFloat(vwap.toFixed(4)),
      units: data.totalUnits,
      security,
    });
  }

  return result.sort((a, b) => a.security.localeCompare(b.security));
}

/**
 * Aggregate trades by security and price (no averaging)
 */
export function aggregateBySecurityAndPrice(trades: TradeRecord[]): AggregatedTrade[] {
  const grouped: Record<string, AggregatedTrade> = {};

  for (const trade of trades) {
    const key = `${trade.security}|${trade.price}`;
    if (!grouped[key]) {
      grouped[key] = {
        type: trade.type,
        price: trade.price,
        units: 0,
        security: trade.security,
      };
    }
    grouped[key].units += trade.units;
  }

  const result = Object.values(grouped);
  return result.sort((a, b) => {
    const secCompare = a.security.localeCompare(b.security);
    return secCompare !== 0 ? secCompare : a.price - b.price;
  });
}

/**
 * Format aggregated trades as TSV (tab-separated values)
 * includeTitle: if true, prepends "{clientName} - {accountNumber}\n\n" to the output
 *
 * This is the plain-text fallback used when the paste target cannot accept
 * rich HTML. Values are formatted (commas, 4dp price, whole-number units) so
 * the plain-text paste matches the on-screen display; Excel still parses these
 * as numbers.
 */
export function formatAsTSV(
  trades: AggregatedTrade[],
  clientName: string,
  accountNumber: string,
  includeTitle: boolean = false
): string {
  const rows: string[] = [];

  if (includeTitle) {
    rows.push(`${clientName} - ${accountNumber}`);
    rows.push('');
  }

  // Header row
  rows.push('TYPE\tPRICE\tUNITS\tSECURITY');

  // Data rows with formatted values (comma thousands separators)
  for (const trade of trades) {
    rows.push(`${trade.type}\t${formatPrice(trade.price)}\t${formatUnits(trade.units)}\t${trade.security}`);
  }

  return rows.join('\n');
}

/**
 * Escape a value for safe inclusion in HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format aggregated trades as an HTML table with solid black borders.
 *
 * Pasting plain TSV drops all formatting, so tables land in Google Docs / email
 * bodies with no visible borders. Putting this HTML on the clipboard (as
 * `text/html`) makes Docs, Gmail, Word and Excel all render a bordered table.
 * Borders are inlined on every cell (with border-collapse) because email
 * clients strip <style> blocks and only honor inline cell borders.
 */
export function formatAsHTML(
  trades: AggregatedTrade[],
  clientName: string,
  accountNumber: string,
  includeTitle: boolean = false
): string {
  const border = 'border:2px solid #000 !important;';
  const cell = `${border}padding:4px 8px;`;
  const headCell = `${cell}font-weight:bold;background:#d9d9d9;text-align:center;`;

  const title = includeTitle
    ? `<p style="font-weight:bold;text-align:center;margin:0 0 8px;">${escapeHtml(
        `${clientName} - ${accountNumber}`
      )}</p>`
    : '';

  const header =
    `<tr>` +
    `<th style="${headCell}">TYPE</th>` +
    `<th style="${headCell}">PRICE</th>` +
    `<th style="${headCell}">UNITS</th>` +
    `<th style="${headCell}">SECURITY</th>` +
    `</tr>`;

  const body = trades
    .map(
      (trade) =>
        `<tr>` +
        `<td style="${cell}">${escapeHtml(trade.type)}</td>` +
        `<td style="${cell}text-align:right;">${formatPrice(trade.price)}</td>` +
        `<td style="${cell}text-align:right;">${formatUnits(trade.units)}</td>` +
        `<td style="${cell}">${escapeHtml(trade.security)}</td>` +
        `</tr>`
    )
    .join('');

  return (
    `${title}` +
    `<table style="border-collapse:collapse;${border}font-family:Arial,sans-serif;font-size:13px;">` +
    `<thead>${header}</thead>` +
    `<tbody>${body}</tbody>` +
    `</table>`
  );
}

/**
 * Format price for display: thousands separator + 4 decimal places
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/**
 * Format units (volume) for display: thousands separator, no decimals
 */
export function formatUnits(units: number): string {
  return Math.round(units).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
