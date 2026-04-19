// receiptFormatter.js - Perbaikan untuk PDF full page

/**
 * src/utils/receiptFormatter.js
 * ─────────────────────────────────────────────────────────────
 * Satu sumber kebenaran untuk format struk / receipt.
 * Dipakai di:
 *   - ReceiptScreen   → tampilan layar & PDF
 *   - ReceiptSettingsScreen → live preview
 *
 * Ekspor:
 *   buildReceiptHtml(receipt, settings)  → string HTML siap print
 *   buildReceiptData(receipt, settings)  → objek data terstruktur
 *   PAPER_WIDTHS, FONT_SIZES, TEMPLATES  → konstanta opsi
 * ─────────────────────────────────────────────────────────────
 */

import { formatCurrency, formatDate } from './helpers';

// ── Konstanta opsi ────────────────────────────────────────────
export const PAPER_WIDTHS = {
    '58mm': { bodyWidth: '300px', charWidth: 32, paperWidth: '58mm' },
    '80mm': { bodyWidth: '380px', charWidth: 42, paperWidth: '80mm' },
};

export const FONT_SIZES = {
    small: { base: 10, store: 13, total: 13 },
    normal: { base: 12, store: 15, total: 15 },
    large: { base: 14, store: 17, total: 17 },
};

export const TEMPLATES = {
    standard: 'standard',
    detail: 'detail',
    minimal: 'minimal',
};

// ── Helper internal ───────────────────────────────────────────
const padLine = (left, right, width = 32) => {
    const space = width - String(left).length - String(right).length;
    return String(left) + ' '.repeat(Math.max(space, 1)) + String(right);
};

const dashed = (width = 32) => '-'.repeat(width);

/**
 * Normalisasi settings dengan default value.
 * Menerima data dari API maupun dari form lokal.
 */
export const normalizeSettings = (raw = {}) => ({
    store_name: raw.store_name || '',
    store_address: raw.store_address || '',
    store_phone: raw.store_phone || '',
    store_email: raw.store_email || '',
    store_website: raw.store_website || '',
    footer_text: raw.footer_text || 'Terima kasih atas kunjungan Anda!',
    show_tax: raw.show_tax === 1 || raw.show_tax === true || raw.show_tax === '1',
    show_discount: raw.show_discount !== 0 && raw.show_discount !== false && raw.show_discount !== '0',
    paper_width: raw.paper_width || '58mm',
    font_size: raw.font_size || 'normal',
    template: raw.template || 'standard',
});

/**
 * Ekstrak & normalisasi data transaksi dari response API.
 * Menerima berbagai bentuk response (transaction.data / flat).
 */
export const normalizeReceipt = (raw = {}) => {
    const trx = raw.transaction || raw;
    const items = raw.items || trx.items || [];
    const store = raw.store || trx.store || {};
    return { trx, items, store };
};

// ── buildReceiptHtml ──────────────────────────────────────────
/**
 * Hasilkan HTML struk yang sama persis untuk layar preview maupun PDF.
 *
 * @param {object} receipt   - data dari receiptAPI.getData() atau objek dummy
 * @param {object} settings  - dari receiptSettingsAPI.get() atau state form
 * @returns {string} HTML string
 */
export const buildReceiptHtml = (receipt = {}, settings = {}) => {
    const cfg = normalizeSettings(settings);
    const { trx, items, store } = normalizeReceipt(receipt);

    const paper = PAPER_WIDTHS[cfg.paper_width] || PAPER_WIDTHS['58mm'];
    const fs = FONT_SIZES[cfg.font_size] || FONT_SIZES.normal;
    const isMin = cfg.template === 'minimal';
    const isDet = cfg.template === 'detail';
    const charW = paper.charWidth;

    // Nilai toko — setting menang atas store dari API
    const storeName = cfg.store_name || store.store_name || 'KasirPOS';
    const storeAddr = cfg.store_address || store.store_address || '';
    const storePhone = cfg.store_phone || store.store_phone || '';
    const storeEmail = cfg.store_email || '';
    const storeWeb = cfg.store_website || '';
    const footerText = cfg.footer_text || store.footer || 'Terima kasih!';

    const subtotal = Number(trx.subtotal || 0);
    const discount = Number(trx.discount || 0);
    const tax = Number(trx.tax || 0);
    const total = Number(trx.total || 0);
    const payAmount = Number(trx.payment_amount || 0);
    const changeAmount = Number(trx.change_amount || 0);
    const payMethod = (trx.payment_method || 'cash').toUpperCase();

    // ── CSS yang DIOPTIMASI UNTUK PDF FULL PAGE ───────────────────
    const css = `
    * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
    }
    
    html, body {
        margin: 0;
        padding: 0;
        background: #fff;
    }
    
    body {
        font-family: 'Courier New', Courier, monospace;
        font-size: ${fs.base}px;
        line-height: 1.4;
        color: #111;
        background: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }
    
    /* Container utama struk */
    .receipt-container {
        width: ${paper.bodyWidth};
        max-width: 100%;
        margin: 0 auto;
        padding: 16px 12px;
        background: #fff;
    }
    
    .center { text-align: center; }
    .left   { text-align: left; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }
    .muted  { color: #555; }
    .green  { color: #1a7a4a; }
    
    .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin: 2px 0;
    }
    .row .l { 
        flex: 1; 
        padding-right: 8px;
        word-break: break-word;
    }
    .row .r { 
        white-space: nowrap;
        flex-shrink: 0;
    }
    
    .divider { 
        border: none; 
        border-top: 1px dashed #aaa; 
        margin: 8px 0; 
    }
    .divider-solid { 
        border: none; 
        border-top: 2px solid #333; 
        margin: 8px 0; 
    }
    
    .store-name { 
        font-size: ${fs.store}px; 
        font-weight: bold; 
        margin-bottom: 4px;
    }
    .total-val { 
        font-size: ${fs.total}px; 
        font-weight: bold; 
    }
    
    .item-block { 
        margin: 6px 0; 
    }
    .item-detail { 
        color: #555; 
        padding-left: 4px; 
        margin-top: 2px;
    }
    .spacer { 
        height: 4px; 
    }
    
    /* Break page prevention - jaga agar struk tidak terpotong */
    .receipt-container {
        page-break-inside: avoid;
        break-inside: avoid;
    }
    
    /* Media print - OPTIMAL UNTUK PDF FULL PAGE */
    @media print {
        html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            height: auto;
        }
        
        body {
            padding: 0;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .receipt-container {
            margin: 0 auto;
            padding: 12px;
            box-shadow: none;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        /* Pastikan tidak ada page break di dalam struk */
        .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    }
    
    /* Untuk layar preview */
    @media screen {
        .receipt-container {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 20px auto;
        }
    }
  `;

    // ── Header toko ───────────────────────────────────────────────
    let header = '';
    if (isMin) {
        header = `<div class="store-name center">${storeName}</div>`;
    } else {
        header = `
      <div class="center">
        <div class="store-name">${storeName}</div>
        ${storeAddr ? `<div class="muted" style="font-size:${fs.base - 1}px;">${storeAddr}</div>` : ''}
        ${storePhone ? `<div class="muted" style="font-size:${fs.base - 1}px;">Telp: ${storePhone}</div>` : ''}
        ${storeEmail ? `<div class="muted" style="font-size:${fs.base - 1}px;">${storeEmail}</div>` : ''}
      </div>
    `;
    }

    // ── Info transaksi ────────────────────────────────────────────
    const invoiceNo = trx.invoice_number || '-';
    const trxDate = formatDate(trx.transaction_date || trx.created_at, true);
    const cashierName = trx.cashier_name || '-';
    const custName = trx.customer_name || '';

    const infoRows = `
    <div style="font-size:${fs.base}px; margin:3px 0;">No   : ${invoiceNo}</div>
    <div style="font-size:${fs.base}px; margin:3px 0;">Tgl  : ${trxDate}</div>
    <div style="font-size:${fs.base}px; margin:3px 0;">Kasir: ${cashierName}</div>
    ${custName ? `<div style="font-size:${fs.base}px; margin:3px 0;">Cust : ${custName}</div>` : ''}
  `;

    // ── Daftar item ───────────────────────────────────────────────
    let itemsHtml = '';
    items.forEach(item => {
        const name = item.product_name || item.name || '-';
        const qty = Number(item.quantity);
        const price = formatCurrency(Number(item.price));
        const sub = formatCurrency(Number(item.subtotal));

        if (isDet) {
            // Template detail: nama di baris sendiri, qty × harga di baris berikutnya
            itemsHtml += `
        <div class="item-block">
          <div style="font-size:${fs.base}px;">${name}</div>
          <div class="row item-detail" style="font-size:${fs.base - 1}px;">
            <span>${qty} x ${price}</span><span>${sub}</span>
          </div>
        </div>
      `;
        } else {
            // Template standard / minimal: satu baris
            itemsHtml += `
        <div class="row" style="font-size:${fs.base}px; margin:3px 0;">
          <span class="l">${name} (${qty}x)</span>
          <span class="r">${sub}</span>
        </div>
      `;
        }
    });

    // ── Ringkasan pembayaran ──────────────────────────────────────
    const subtotalHtml = `
    <div class="row" style="font-size:${fs.base}px;">
      <span>Subtotal</span><span>${formatCurrency(subtotal)}</span>
    </div>
  `;
    const discountHtml = (cfg.show_discount && discount > 0) ? `
    <div class="row green" style="font-size:${fs.base}px;">
      <span>Diskon</span><span>-${formatCurrency(discount)}</span>
    </div>
  ` : '';
    const taxHtml = (cfg.show_tax && tax > 0) ? `
    <div class="row" style="font-size:${fs.base}px;">
      <span>Pajak</span><span>${formatCurrency(tax)}</span>
    </div>
  ` : '';
    const totalHtml = `
    <hr class="divider-solid"/>
    <div class="row" style="font-size:${fs.total}px; font-weight:bold; margin:4px 0;">
      <span>TOTAL</span><span class="total-val">${formatCurrency(total)}</span>
    </div>
  `;
    const payHtml = `
    <div class="row" style="font-size:${fs.base}px; margin:3px 0;">
      <span>Bayar (${payMethod})</span><span>${formatCurrency(payAmount)}</span>
    </div>
  `;
    const changeHtml = changeAmount > 0 ? `
    <div class="row bold" style="font-size:${fs.base}px; margin:3px 0;">
      <span>Kembalian</span><span>${formatCurrency(changeAmount)}</span>
    </div>
  ` : '';

    // ── Footer ────────────────────────────────────────────────────
    const footerHtml = isMin ? '' : `
    <hr class="divider"/>
    <div class="center muted" style="font-size:${fs.base - 1}px; font-style:italic;">${footerText}</div>
    ${storeWeb ? `<div class="center" style="font-size:${fs.base - 2}px; color:#999; margin-top:3px;">${storeWeb}</div>` : ''}
  `;

    // ── Gabungkan dengan container yang lebih baik ─────────────────
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes"/>
  <style>${css}</style>
</head>
<body>
  <div class="receipt-container">
    ${header}
    ${!isMin ? '<hr class="divider"/>' : ''}
    ${infoRows}
    <hr class="divider"/>
    ${itemsHtml || '<div class="muted center">Tidak ada item</div>'}
    <hr class="divider"/>
    ${subtotalHtml}
    ${discountHtml}
    ${taxHtml}
    ${totalHtml}
    ${payHtml}
    ${changeHtml}
    ${footerHtml}
    <div style="height:16px;"></div>
  </div>
</body>
</html>`;
};

// ── buildReceiptData ──────────────────────────────────────────
/**
 * Hasilkan objek data terstruktur untuk ditampilkan di React Native
 * (dipakai ReceiptScreen untuk render native, bukan HTML).
 */
export const buildReceiptData = (receipt = {}, settings = {}) => {
    const cfg = normalizeSettings(settings);
    const { trx, items, store } = normalizeReceipt(receipt);

    const storeName = cfg.store_name || store.store_name || 'KasirPOS';
    const storeAddr = cfg.store_address || store.store_address || '';
    const storePhone = cfg.store_phone || store.store_phone || '';
    const storeEmail = cfg.store_email || '';
    const footerText = cfg.footer_text || store.footer || 'Terima kasih atas kunjungan Anda!';

    const subtotal = Number(trx.subtotal || 0);
    const discount = Number(trx.discount || 0);
    const tax = Number(trx.tax || 0);
    const total = Number(trx.total || 0);
    const payAmount = Number(trx.payment_amount || 0);
    const changeAmount = Number(trx.change_amount || 0);
    const payMethod = (trx.payment_method || 'cash').toUpperCase();

    return {
        store: { name: storeName, address: storeAddr, phone: storePhone, email: storeEmail },
        transaction: {
            invoice: trx.invoice_number || '-',
            date: formatDate(trx.transaction_date || trx.created_at, true),
            cashier: trx.cashier_name || '-',
            customer: trx.customer_name || '',
        },
        items: items.map(item => ({
            name: item.product_name || item.name || '-',
            quantity: Number(item.quantity),
            price: Number(item.price),
            subtotal: Number(item.subtotal),
        })),
        payment: {
            subtotal, discount, tax, total,
            payAmount, changeAmount, payMethod,
        },
        options: {
            showDiscount: cfg.show_discount,
            showTax: cfg.show_tax,
            isMinimal: cfg.template === 'minimal',
            isDetail: cfg.template === 'detail',
            footerText,
        },
    };
};

// ── buildShareText ────────────────────────────────────────────
/**
 * Hasilkan teks plain-text untuk Share (WhatsApp, dll).
 */
export const buildShareText = (receipt = {}, settings = {}) => {
    const cfg = normalizeSettings(settings);
    const { trx, items, store } = normalizeReceipt(receipt);

    const storeName = cfg.store_name || store.store_name || 'KasirPOS';
    const footer = cfg.footer_text || store.footer || 'Terima kasih! 🙏';

    const subtotal = Number(trx.subtotal || 0);
    const discount = Number(trx.discount || 0);
    const total = Number(trx.total || 0);
    const payAmount = Number(trx.payment_amount || 0);
    const changeAmount = Number(trx.change_amount || 0);
    const payMethod = (trx.payment_method || 'cash').toUpperCase();
    const trxDate = formatDate(trx.transaction_date || trx.created_at, true);

    let text = `🧾 *STRUK BELANJA*\n${storeName}\n`;
    text += `─────────────────\n`;
    text += `No : ${trx.invoice_number || '-'}\n`;
    text += `Tgl: ${trxDate}\n`;
    text += `─────────────────\n`;
    items.forEach(item => {
        text += `${item.product_name || item.name}\n`;
        text += `  ${item.quantity} x ${formatCurrency(Number(item.price))} = ${formatCurrency(Number(item.subtotal))}\n`;
    });
    text += `─────────────────\n`;
    text += `Subtotal: ${formatCurrency(subtotal)}\n`;
    if (cfg.show_discount && discount > 0) text += `Diskon: -${formatCurrency(discount)}\n`;
    text += `*TOTAL: ${formatCurrency(total)}*\n`;
    text += `Bayar (${payMethod}): ${formatCurrency(payAmount)}\n`;
    if (changeAmount > 0) text += `Kembalian: ${formatCurrency(changeAmount)}\n`;
    text += `─────────────────\n${footer}`;
    return text;
};

// ── buildPreviewHtml (untuk ReceiptSettingsScreen) ────────────
/**
 * HTML preview mini di dalam app (ReactNative WebView / iframe).
 * Sama persis dengan buildReceiptHtml tapi menggunakan data dummy.
 */
export const buildPreviewHtml = (settings = {}) => {
    const dummyReceipt = {
        transaction: {
            invoice_number: 'INV-20250101-00001',
            transaction_date: new Date().toISOString(),
            cashier_name: 'Admin',
            customer_name: '',
            subtotal: 35000,
            discount: 5000,
            tax: 0,
            total: 30000,
            payment_amount: 50000,
            change_amount: 20000,
            payment_method: 'cash',
        },
        items: [
            { product_name: 'Nasi Goreng Spesial', quantity: 1, price: 25000, subtotal: 25000 },
            { product_name: 'Es Teh Manis', quantity: 2, price: 5000, subtotal: 10000 },
        ],
        store: {},
    };
    return buildReceiptHtml(dummyReceipt, settings);
};