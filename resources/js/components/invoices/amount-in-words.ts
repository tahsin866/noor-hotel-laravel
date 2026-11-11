const ONES = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
];

const TENS = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
];

/** Words for 0–999. */
function hundredsToWords(n: number): string {
    let words = '';

    if (n >= 100) {
        words += ONES[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
    }

    if (n >= 20) {
        words += TENS[Math.floor(n / 10)] + ' ';
        n %= 10;
    }

    if (n > 0) {
        words += ONES[n] + ' ';
    }

    return words.trim();
}

/**
 * Taka amount in words using the Bangladeshi system (Crore / Lakh),
 * e.g. 125050.5 → "One Lakh Twenty Five Thousand Fifty Taka and Fifty Paisa Only".
 */
export function amountInWords(amount: number): string {
    let whole = Math.floor(amount);
    let paisa = Math.round((amount - whole) * 100);
    let words: string;

    if (whole === 0) {
        words = 'Zero';
    } else {
        words = '';

        for (const [size, name] of [
            [10000000, 'Crore'],
            [100000, 'Lakh'],
            [1000, 'Thousand'],
        ] as const) {
            if (whole >= size) {
                words += `${hundredsToWords(Math.floor(whole / size))} ${name} `;
                whole %= size;
            }
        }

        words += hundredsToWords(whole);
        words = words.trim() + ' Taka';
    }

    if (paisa > 0) {
        let paisaWords = '';

        if (paisa >= 20) {
            paisaWords += TENS[Math.floor(paisa / 10)] + ' ';
            paisa %= 10;
        }

        if (paisa > 0) {
            paisaWords += ONES[paisa];
        }

        words += ' and ' + paisaWords.trim() + ' Paisa';
    }

    return words + ' Only';
}
