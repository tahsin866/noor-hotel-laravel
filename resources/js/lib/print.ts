/**
 * Open a new window with the given HTML document and trigger the print dialog.
 */
export function openPrintWindow(html: string): void {
    const win = window.open('', '_blank');

    if (!win) {
        return;
    }

    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
        win.focus();
        win.print();
    }, 500);
}
