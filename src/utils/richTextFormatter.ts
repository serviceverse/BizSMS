/**
 * Rich Text Formatter for Cellular SMS
 * Converts text to/from Unicode Mathematical Bold, Italic, and Monospace styles.
 * These characters render natively as real bold and italic on Android Google Messages,
 * Samsung Messages, iOS iMessage/SMS, and WhatsApp without requiring HTML or MMS.
 */

// Mathematical Sans-Serif Bold
const BOLD_CAP_START = 0x1d5d4; // 𝗔 - 𝗭
const BOLD_LOW_START = 0x1d5ee; // 𝗮 - 𝘇
const BOLD_DIGIT_START = 0x1d7ec; // 𝟬 - 𝟵

// Mathematical Sans-Serif Italic
const ITALIC_CAP_START = 0x1d608; // 𝘈 - 𝘡
const ITALIC_LOW_START = 0x1d622; // 𝘢 - 𝘻

// Mathematical Monospace
const MONO_CAP_START = 0x1d670; // 𝙰 - 𝚉
const MONO_LOW_START = 0x1d68a; // 𝚊 - 𝚣
const MONO_DIGIT_START = 0x1d7f6; // 𝟶 - 𝟿

// Mathematical Serif Bold (for reverse mapping)
const SERIF_BOLD_CAP_START = 0x1d400; // 𝐀 - 𝐙
const SERIF_BOLD_LOW_START = 0x1d41a; // 𝐚 - 𝐳
const SERIF_BOLD_DIGIT_START = 0x1d7ce; // 𝟎 - 𝟗

/**
 * Converts standard text to Unicode Bold
 */
export function toUnicodeBold(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) {
      result += char;
      continue;
    }

    if (code >= 0x41 && code <= 0x5a) {
      // A-Z
      result += String.fromCodePoint(BOLD_CAP_START + (code - 0x41));
    } else if (code >= 0x61 && code <= 0x7a) {
      // a-z
      result += String.fromCodePoint(BOLD_LOW_START + (code - 0x61));
    } else if (code >= 0x30 && code <= 0x39) {
      // 0-9
      result += String.fromCodePoint(BOLD_DIGIT_START + (code - 0x30));
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Converts standard text to Unicode Italic
 */
export function toUnicodeItalic(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) {
      result += char;
      continue;
    }

    if (code >= 0x41 && code <= 0x5a) {
      // A-Z
      result += String.fromCodePoint(ITALIC_CAP_START + (code - 0x41));
    } else if (code >= 0x61 && code <= 0x7a) {
      // a-z
      result += String.fromCodePoint(ITALIC_LOW_START + (code - 0x61));
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Converts standard text to Unicode Monospace (useful for coupon codes, dates, phone numbers)
 */
export function toUnicodeMonospace(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) {
      result += char;
      continue;
    }

    if (code >= 0x41 && code <= 0x5a) {
      result += String.fromCodePoint(MONO_CAP_START + (code - 0x41));
    } else if (code >= 0x61 && code <= 0x7a) {
      result += String.fromCodePoint(MONO_LOW_START + (code - 0x61));
    } else if (code >= 0x30 && code <= 0x39) {
      result += String.fromCodePoint(MONO_DIGIT_START + (code - 0x30));
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Converts any Unicode Bold, Italic, or Monospace text back to normal ASCII text
 */
export function toPlainText(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) {
      result += char;
      continue;
    }

    // Sans-serif Bold
    if (code >= BOLD_CAP_START && code <= BOLD_CAP_START + 25) {
      result += String.fromCharCode(0x41 + (code - BOLD_CAP_START));
    } else if (code >= BOLD_LOW_START && code <= BOLD_LOW_START + 25) {
      result += String.fromCharCode(0x61 + (code - BOLD_LOW_START));
    } else if (code >= BOLD_DIGIT_START && code <= BOLD_DIGIT_START + 9) {
      result += String.fromCharCode(0x30 + (code - BOLD_DIGIT_START));
    }
    // Serif Bold
    else if (code >= SERIF_BOLD_CAP_START && code <= SERIF_BOLD_CAP_START + 25) {
      result += String.fromCharCode(0x41 + (code - SERIF_BOLD_CAP_START));
    } else if (code >= SERIF_BOLD_LOW_START && code <= SERIF_BOLD_LOW_START + 25) {
      result += String.fromCharCode(0x61 + (code - SERIF_BOLD_LOW_START));
    } else if (code >= SERIF_BOLD_DIGIT_START && code <= SERIF_BOLD_DIGIT_START + 9) {
      result += String.fromCharCode(0x30 + (code - SERIF_BOLD_DIGIT_START));
    }
    // Sans-serif Italic
    else if (code >= ITALIC_CAP_START && code <= ITALIC_CAP_START + 25) {
      result += String.fromCharCode(0x41 + (code - ITALIC_CAP_START));
    } else if (code >= ITALIC_LOW_START && code <= ITALIC_LOW_START + 25) {
      result += String.fromCharCode(0x61 + (code - ITALIC_LOW_START));
    }
    // Monospace
    else if (code >= MONO_CAP_START && code <= MONO_CAP_START + 25) {
      result += String.fromCharCode(0x41 + (code - MONO_CAP_START));
    } else if (code >= MONO_LOW_START && code <= MONO_LOW_START + 25) {
      result += String.fromCharCode(0x61 + (code - MONO_LOW_START));
    } else if (code >= MONO_DIGIT_START && code <= MONO_DIGIT_START + 9) {
      result += String.fromCharCode(0x30 + (code - MONO_DIGIT_START));
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Checks if a string contains any Unicode stylized characters
 */
export function isUnicodeStyled(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0);
    if (!code) continue;
    if (
      (code >= BOLD_CAP_START && code <= BOLD_LOW_START + 25) ||
      (code >= BOLD_DIGIT_START && code <= BOLD_DIGIT_START + 9) ||
      (code >= ITALIC_CAP_START && code <= ITALIC_LOW_START + 25) ||
      (code >= MONO_CAP_START && code <= MONO_LOW_START + 25) ||
      (code >= MONO_DIGIT_START && code <= MONO_DIGIT_START + 9) ||
      (code >= SERIF_BOLD_CAP_START && code <= SERIF_BOLD_LOW_START + 25)
    ) {
      return true;
    }
  }
  return false;
}

export type RichFormatStyle = "bold" | "italic" | "mono" | "normal" | "upper" | "lower" | "title";

/**
 * Applies a rich formatting transformation to a specific selection range or current word.
 */
export function applyRichFormat(
  fullText: string,
  selection: { start: number; end: number },
  style: RichFormatStyle
): { newText: string; newSelection: { start: number; end: number } } {
  let { start, end } = selection;

  // Normalize selection bounds
  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  // If no range is selected, attempt to select current word or insert styled placeholder
  if (start === end) {
    if (fullText.length === 0) {
      const placeholder =
        style === "bold"
          ? toUnicodeBold("Headline")
          : style === "italic"
          ? toUnicodeItalic("Subheading")
          : style === "mono"
          ? toUnicodeMonospace("CODE20")
          : "Text";
      return {
        newText: placeholder,
        newSelection: { start: 0, end: placeholder.length },
      };
    }

    // Find word boundaries around cursor
    let wordStart = start;
    while (wordStart > 0 && !/\s/.test(fullText[wordStart - 1])) {
      wordStart--;
    }

    let wordEnd = end;
    while (wordEnd < fullText.length && !/\s/.test(fullText[wordEnd])) {
      wordEnd++;
    }

    if (wordStart < wordEnd) {
      start = wordStart;
      end = wordEnd;
    } else {
      // Empty line or whitespace: insert formatted sample
      const sample =
        style === "bold"
          ? toUnicodeBold("SPECIAL OFFER")
          : style === "italic"
          ? toUnicodeItalic("Don't miss out")
          : style === "mono"
          ? toUnicodeMonospace("OFFER50")
          : "Text";
      const before = fullText.slice(0, start);
      const after = fullText.slice(start);
      return {
        newText: before + sample + after,
        newSelection: { start: start, end: start + sample.length },
      };
    }
  }

  const selectedSubstring = fullText.slice(start, end);
  let transformed = selectedSubstring;

  switch (style) {
    case "bold": {
      // If already bold, revert to normal plain text; otherwise convert to bold
      const plain = toPlainText(selectedSubstring);
      if (toUnicodeBold(plain) === selectedSubstring) {
        transformed = plain;
      } else {
        transformed = toUnicodeBold(plain);
      }
      break;
    }
    case "italic": {
      const plain = toPlainText(selectedSubstring);
      if (toUnicodeItalic(plain) === selectedSubstring) {
        transformed = plain;
      } else {
        transformed = toUnicodeItalic(plain);
      }
      break;
    }
    case "mono": {
      const plain = toPlainText(selectedSubstring);
      transformed = toUnicodeMonospace(plain);
      break;
    }
    case "normal": {
      transformed = toPlainText(selectedSubstring);
      break;
    }
    case "upper": {
      const plain = toPlainText(selectedSubstring).toUpperCase();
      // Keep styling if was bold
      if (isUnicodeStyled(selectedSubstring)) {
        transformed = toUnicodeBold(plain);
      } else {
        transformed = plain;
      }
      break;
    }
    case "lower": {
      const plain = toPlainText(selectedSubstring).toLowerCase();
      transformed = plain;
      break;
    }
    case "title": {
      const plain = toPlainText(selectedSubstring)
        .toLowerCase()
        .replace(/\b\w/g, (s) => s.toUpperCase());
      transformed = plain;
      break;
    }
  }

  const before = fullText.slice(0, start);
  const after = fullText.slice(end);
  const newText = before + transformed + after;
  const newEnd = start + transformed.length;

  return {
    newText,
    newSelection: { start, end: newEnd },
  };
}

/**
 * Inserts text at current cursor location or replaces selection
 */
export function insertAtCursor(
  fullText: string,
  selection: { start: number; end: number },
  toInsert: string
): { newText: string; newSelection: { start: number; end: number } } {
  let { start, end } = selection;
  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  const before = fullText.slice(0, start);
  const after = fullText.slice(end);
  const newText = before + toInsert + after;
  const newPos = start + toInsert.length;

  return {
    newText,
    newSelection: { start: newPos, end: newPos },
  };
}

/**
 * Curated Promotional Headlines with Unicode Bold styling for Broadcasts
 */
export const PROMO_HEADLINES = [
  { label: "Special Offer", text: `🎉 ✦ ${toUnicodeBold("SPECIAL OFFER")} ✦ 🎉\n` },
  { label: "Exclusive Deal", text: `⭐ ✦ ${toUnicodeBold("EXCLUSIVE DEAL")} ✦ ⭐\n` },
  { label: "Festive Greetings", text: `🎁 ✦ ${toUnicodeBold("FESTIVE GREETINGS")} ✦ 🎁\n` },
  { label: "Clinic Alert", text: `🩺 ✦ ${toUnicodeBold("HEALTH CHECKUP CAMP")} ✦ 🩺\n` },
  { label: "Fresh Sweets", text: `🍰 ✦ ${toUnicodeBold("FRESH BATCH TODAY")} ✦ 🍰\n` },
  { label: "Weekend Sale", text: `🛍️ ✦ ${toUnicodeBold("WEEKEND MEGA SALE")} ✦ 🛍️\n` },
  { label: "Limited Time", text: `🔥 ✦ ${toUnicodeBold("LIMITED TIME DISCOUNT")} ✦ 🔥\n` },
  { label: "Important Notice", text: `📢 ✦ ${toUnicodeBold("CUSTOMER NOTICE")} ✦ 📢\n` },
];

/**
 * Aesthetic Dividers for structuring multi-line messages
 */
export const AESTHETIC_DIVIDERS = [
  "━━━━━━━━━━━━━━━━━━",
  "══════════════════",
  "★ ★ ★ ★ ★ ★ ★ ★ ★",
  "~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~",
  "• • • • • • • • • • • •",
];

/**
 * Popular Business Broadcast Emojis
 */
export const POPULAR_EMOJIS = [
  "🎉",
  "🔥",
  "🩺",
  "🍰",
  "🎁",
  "🛍️",
  "📍",
  "📞",
  "💬",
  "⭐",
  "✅",
  "🏷️",
  "⏰",
  "✨",
  "💐",
  "🙏",
  "📢",
  "💯",
  "👋",
  "🎊",
];

