// Lightweight script: recalc totals, add rows, export image
document.addEventListener('DOMContentLoaded', function () {
    function parseNumber(v) {
        if (typeof v === 'number') return v;
        return parseFloat(String(v).replace(/[,₹\s]/g, '')) || 0;
    }

    function formatNumber(n) {
        return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function recalcRow(row) {
        const qtyEl = row.querySelector('.qty');
        const rateEl = row.querySelector('.rate');
        const cgstPctEl = row.querySelector('.cgst-percent-input');
        const sgstPctEl = row.querySelector('.sgst-percent-input');
        const cgstCell = row.querySelector('.cgst-amount');
        const sgstCell = row.querySelector('.sgst-amount');
        const totalCell = row.querySelector('.item-total');

        const qty = parseNumber(qtyEl ? qtyEl.value : qtyEl);
        const rate = parseNumber(rateEl ? rateEl.value : rateEl);
        const cgstPct = parseNumber(cgstPctEl ? cgstPctEl.value : cgstPctEl);
        const sgstPct = parseNumber(sgstPctEl ? sgstPctEl.value : sgstPctEl);

        const base = qty * rate;
        const cgst = (base * cgstPct) / 100;
        const sgst = (base * sgstPct) / 100;
        const total = base + cgst + sgst;

        if (cgstCell) cgstCell.textContent = formatNumber(cgst);
        if (sgstCell) sgstCell.textContent = formatNumber(sgst);
        if (totalCell) totalCell.textContent = formatNumber(total);

        return { base, cgst, sgst, total, qty };
    }

    function recalcAll() {
        const rows = Array.from(document.querySelectorAll('.item-row'));
        let subtotal = 0, totalCgst = 0, totalSgst = 0, itemsCount = 0;
        rows.forEach(r => {
            const v = recalcRow(r);
            subtotal += v.base;
            totalCgst += v.cgst;
            totalSgst += v.sgst;
            itemsCount += v.qty;
        });

        const grand = subtotal + totalCgst + totalSgst;
        const subtotalEl = document.getElementById('subtotal');
        const totalCgstEl = document.getElementById('total-cgst');
        const totalSgstEl = document.getElementById('total-sgst');
        const grandEl = document.getElementById('grand-total');
        const itemsCountEl = document.getElementById('items-count');

        if (subtotalEl) subtotalEl.textContent = formatNumber(subtotal);
        if (totalCgstEl) totalCgstEl.textContent = formatNumber(totalCgst);
        if (totalSgstEl) totalSgstEl.textContent = formatNumber(totalSgst);
        if (grandEl) grandEl.textContent = '₹' + formatNumber(grand);
        if (itemsCountEl) itemsCountEl.textContent = formatNumber(itemsCount);
    }

    // attach listeners for editable inputs
    function attachRowListeners(row) {
        ['.qty', '.rate', '.cgst-percent-input', '.sgst-percent-input'].forEach(sel => {
            const el = row.querySelector(sel);
            if (!el) return;
            el.addEventListener('input', recalcAll);
        });
    }

    document.querySelectorAll('.item-row').forEach(attachRowListeners);
    // Event delegation as a robust fallback: listen for input events on tbody so CGST/SGST changes always trigger recalculation
    const invoiceTbody = document.getElementById('invoice-items');
    if (invoiceTbody) {
        invoiceTbody.addEventListener('input', function (e) {
            const target = e.target;
            if (!target) return;
            // if the changed element is one of the inputs we care about, recalc
            if (target.matches('.qty, .rate, .cgst-percent-input, .sgst-percent-input')) {
                recalcAll();
            }
        });
    }
    recalcAll();

    // add item
    const addItemBtn = document.getElementById('add-item');
    if (addItemBtn) addItemBtn.addEventListener('click', function () {
        const tbody = document.querySelector('#invoice-items');
        const id = (tbody.querySelectorAll('.item-row').length || 0) + 1;
        const tr = document.createElement('tr');
        tr.className = 'item-row';
        tr.innerHTML = `
            <td class="item-index">${id}</td>
            <td><input type="text" class="description" value=""></td>
            <td><input type="text" class="hsn" value=""></td>
            <td><input type="date" class="mfg" value=""></td>
            <td><input type="number" class="qty" value="0" min="0" step="0.01"></td>
            <td><input type="number" class="rate" value="0" min="0" step="0.01"></td>
            <td><input type="number" class="cgst-percent-input" value="0" min="0" max="100">%</td>
            <td class="cgst-amount">0.00</td>
            <td><input type="number" class="sgst-percent-input" value="0" min="0" max="100">%</td>
            <td class="sgst-amount">0.00</td>
            <td class="item-total">0.00</td>
        `;
        tbody.appendChild(tr);
        attachRowListeners(tr);
        updateIndexes();
        recalcAll();
    });

    // update row indexes after add/remove
    function updateIndexes() {
        const rows = Array.from(document.querySelectorAll('.item-row'));
        rows.forEach((r, i) => {
            const idx = r.querySelector('.item-index');
            if (idx) idx.textContent = String(i + 1);
        });
    }

    // download image of invoice area
    const downloadImageBtn = document.getElementById('download-image');
    if (downloadImageBtn) {
        downloadImageBtn.addEventListener('click', function () {
            const el = document.querySelector('.invoice');
            if (!el || !window.html2canvas) return alert('html2canvas missing or invoice element not found');
            html2canvas(el, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                onclone: function (clonedDoc) {
                    // hide interactive controls in the cloned document so they don't appear in the exported image
                    const hideSelectors = ['#add-item', '#remove-item', '#download-image', '.table-actions', '.form-actions'];
                    hideSelectors.forEach(sel => {
                        clonedDoc.querySelectorAll(sel).forEach(el => el.style.display = 'none');
                    });
                    // make form inputs look like plain text in the exported image
                    clonedDoc.querySelectorAll('input, textarea, select').forEach(input => {
                        input.style.border = 'none';
                        input.style.background = 'transparent';
                        input.style.outline = 'none';
                    });
                }
            }).then(canvas => {
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                // use invoice number if present
                const invNoEl = document.getElementById('invoice-no');
                const filename = (invNoEl && invNoEl.value) ? `${invNoEl.value}.png` : 'invoice.png';
                a.download = filename;
                a.click();
            });
        });
    }

    // remove last row button functionality
    const removeItemBtn = document.getElementById('remove-item');
    if (removeItemBtn) removeItemBtn.addEventListener('click', function () {
        const tbody = document.querySelector('#invoice-items');
        if (!tbody) return;
        const rows = tbody.querySelectorAll('.item-row');
        if (rows.length === 0) return alert('No rows to remove');
        const last = rows[rows.length - 1];
        last.remove();
        updateIndexes();
        recalcAll();
    });

        // Responsive font scaling: reduce invoice font-size if content causes horizontal overflow
        (function () {
            const invoiceEl = document.querySelector('.invoice');
            if (!invoiceEl) return;

            function adjustFontToFit() {
                // Use document-level scroll width to detect horizontal overflow
                const maxWidth = window.innerWidth || document.documentElement.clientWidth;
                // start from computed font size
                const computed = window.getComputedStyle(invoiceEl).fontSize;
                let current = parseFloat(computed) || 12;
                const minFont = 9; // don't shrink below this
                const step = 0.5; // px step

                // If there's no overflow, try to restore up to base (12px) optionally (no auto-grow for now)
                // Reduce font until the document fits or we reach minFont
                let attempts = 0;
                while (document.documentElement.scrollWidth > maxWidth && current > minFont && attempts < 40) {
                    current = Math.max(minFont, current - step);
                    invoiceEl.style.fontSize = current + 'px';
                    attempts++;
                }
            }

            // Run after layout changes
            function scheduleAdjust() {
                // small debounce
                clearTimeout(window.__invoiceAdjustTimeout);
                window.__invoiceAdjustTimeout = setTimeout(() => {
                    adjustFontToFit();
                }, 120);
            }

            // Observe DOM changes inside invoice and adjust
            const mo = new MutationObserver(scheduleAdjust);
            mo.observe(invoiceEl, { childList: true, subtree: true, characterData: true });

            // Adjust on resize
            window.addEventListener('resize', scheduleAdjust);

            // Adjust after recalculation (recalcAll calls on load). Hook add-item button also.
            const addBtn = document.getElementById('add-item');
            if (addBtn) addBtn.addEventListener('click', function () {
                // wait a tick for DOM insert
                setTimeout(scheduleAdjust, 60);
            });

            // initial run
            scheduleAdjust();
        })();
});