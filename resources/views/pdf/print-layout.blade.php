<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>{{ $title }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; }

        #toolbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
            background: #0f172a; color: #fff; padding: 10px 20px;
            display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        #toolbar .title { font-size: 14px; font-weight: 600; margin-right: auto; }
        #toolbar .group { display: flex; align-items: center; gap: 6px; }
        #toolbar label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        #toolbar input[type="number"] {
            width: 56px; height: 30px; border: 1px solid #334155; border-radius: 4px;
            background: #1e293b; color: #fff; text-align: center; font-size: 12px;
            padding: 0 4px; outline: none;
        }
        #toolbar input[type="number"]:focus { border-color: #3b82f6; }
        #toolbar .sep { width: 1px; height: 24px; background: #334155; }
        #toolbar button {
            height: 32px; padding: 0 14px; border: none; border-radius: 5px;
            font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
        }
        #toolbar .btn-print { background: #2563eb; color: #fff; }
        #toolbar .btn-print:hover { background: #1d4ed8; }
        #toolbar .btn-download { background: #059669; color: #fff; }
        #toolbar .btn-download:hover { background: #047857; }
        #toolbar .btn-reset { background: #475569; color: #fff; }
        #toolbar .btn-reset:hover { background: #334155; }

        #document-frame {
            margin-top: 60px; display: flex; justify-content: center; padding: 20px;
        }
        #document-content {
            background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,0.1); width: 210mm; min-height: 297mm;
            padding: 15mm;
        }

        @media print {
            body { background: #fff; }
            #toolbar { display: none !important; }
            #document-frame { margin: 0; padding: 0; }
            #document-content {
                box-shadow: none; width: 100%; min-height: auto; padding: 0;
            }
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <div class="title">{{ $title }}</div>
        <div class="group">
            <label>Top</label>
            <input type="number" id="m-top" value="15" min="0" max="50"/>
        </div>
        <div class="group">
            <label>Right</label>
            <input type="number" id="m-right" value="15" min="0" max="50"/>
        </div>
        <div class="group">
            <label>Bottom</label>
            <input type="number" id="m-bottom" value="15" min="0" max="50"/>
        </div>
        <div class="group">
            <label>Left</label>
            <input type="number" id="m-left" value="15" min="0" max="50"/>
        </div>
        <div class="sep"></div>
        <button class="btn-reset" onclick="resetMargins()">Reset</button>
        <button class="btn-print" onclick="printDocument()">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
        </button>
        <button class="btn-download" onclick="downloadPdf()">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
        </button>
    </div>

    <div id="document-frame">
        <div id="document-content">
            {!! $content !!}
        </div>
    </div>

    <script>
        var downloadUrl = '{{ $downloadUrl }}';

        function getMargins() {
            return {
                top: document.getElementById('m-top').value + 'mm',
                right: document.getElementById('m-right').value + 'mm',
                bottom: document.getElementById('m-bottom').value + 'mm',
                left: document.getElementById('m-left').value + 'mm'
            };
        }

        function applyMargins() {
            var m = getMargins();
            var el = document.getElementById('document-content');
            el.style.padding = m.top + ' ' + m.right + ' ' + m.bottom + ' ' + m.left;
        }

        function resetMargins() {
            document.getElementById('m-top').value = 15;
            document.getElementById('m-right').value = 15;
            document.getElementById('m-bottom').value = 15;
            document.getElementById('m-left').value = 15;
            applyMargins();
        }

        function printDocument() {
            applyMargins();
            var style = document.createElement('style');
            style.id = 'print-margins';
            style.textContent = '@page { size: A4; margin: ' + getMargins().top + ' ' + getMargins().right + ' ' + getMargins().bottom + ' ' + getMargins().left + '; }';
            var existing = document.getElementById('print-margins');
            if (existing) existing.remove();
            document.head.appendChild(style);
            window.print();
        }

        function downloadPdf() {
            window.location.href = downloadUrl;
        }

        document.querySelectorAll('#toolbar input[type="number"]').forEach(function(input) {
            input.addEventListener('change', applyMargins);
            input.addEventListener('input', applyMargins);
        });

        applyMargins();
    </script>
</body>
</html>
