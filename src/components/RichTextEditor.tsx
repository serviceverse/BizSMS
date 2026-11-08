import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import {
  Bold,
  Italic,
  Code,
  Type,
  Smile,
  Sparkles,
  RotateCcw,
  Minus,
  Check,
} from "lucide-react-native";
import {
  applyRichFormat,
  insertAtCursor,
  PROMO_HEADLINES,
  AESTHETIC_DIVIDERS,
  POPULAR_EMOJIS,
  RichFormatStyle,
} from "../utils/richTextFormatter";
import { calculateSmsParts } from "../services/smsService";

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  tags?: string[];
  placeholder?: string;
  minHeight?: number;
  previewSample?: string;
  onTagInsert?: (tag: string) => void;
}

export default function RichTextEditor({
  value,
  onChangeText,
  tags = [
    "{name}",
    "{business_name}",
    "{whatsapp}",
    "{maps_link}",
    "{catalog_link}",
  ],
  placeholder = "Write your broadcast message here... Use Bold & Italic tools above to customize text!",
  minHeight = 120,
  previewSample,
}: RichTextEditorProps) {
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [showEmojis, setShowEmojis] = useState(false);
  const [showHeadlines, setShowHeadlines] = useState(false);
  const [showDividers, setShowDividers] = useState(false);

  const handleFormat = (style: RichFormatStyle) => {
    const res = applyRichFormat(value, selection, style);
    onChangeText(res.newText);
    setSelection(res.newSelection);
  };

  const handleInsert = (textToInsert: string) => {
    const res = insertAtCursor(value, selection, textToInsert);
    onChangeText(res.newText);
    setSelection(res.newSelection);
  };

  const smsMetrics = calculateSmsParts(value);

  return (
    <View style={styles.container}>
      {/* Primary Formatting Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarScroll}
        >
          {/* Bold Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, styles.toolBtnActive]}
            onPress={() => handleFormat("bold")}
            activeOpacity={0.7}
          >
            <Bold color="#1E3A8A" size={16} />
            <Text style={styles.toolBtnTextBold}>Bold</Text>
          </TouchableOpacity>

          {/* Italic Tool */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => handleFormat("italic")}
            activeOpacity={0.7}
          >
            <Italic color="#334155" size={15} />
            <Text style={styles.toolBtnTextItalic}>Italic</Text>
          </TouchableOpacity>

          {/* Monospace Tool */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => handleFormat("mono")}
            activeOpacity={0.7}
          >
            <Code color="#334155" size={15} />
            <Text style={styles.toolBtnTextMono}>Code</Text>
          </TouchableOpacity>

          {/* UPPERCASE Tool */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => handleFormat("upper")}
            activeOpacity={0.7}
          >
            <Type color="#334155" size={15} />
            <Text style={styles.toolBtnText}>CAPS</Text>
          </TouchableOpacity>

          {/* Revert / Normal Text */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => handleFormat("normal")}
            activeOpacity={0.7}
          >
            <RotateCcw color="#64748B" size={14} />
            <Text style={styles.toolBtnText}>Plain</Text>
          </TouchableOpacity>

          <View style={styles.toolbarDivider} />

          {/* Bullet List helper */}
          <TouchableOpacity
            style={styles.toolIconBtn}
            onPress={() => handleInsert("\n• ")}
            activeOpacity={0.7}
          >
            <Text style={styles.bulletText}>• List</Text>
          </TouchableOpacity>

          {/* Checkmark helper */}
          <TouchableOpacity
            style={styles.toolIconBtn}
            onPress={() => handleInsert("\n✓ ")}
            activeOpacity={0.7}
          >
            <Check color="#16A34A" size={14} />
            <Text style={[styles.toolBtnText, { color: "#16A34A" }]}>Check</Text>
          </TouchableOpacity>

          {/* Dividers Tray Toggle */}
          <TouchableOpacity
            style={[styles.toolBtn, showDividers && styles.toolBtnSelected]}
            onPress={() => {
              setShowDividers(!showDividers);
              if (showHeadlines) setShowHeadlines(false);
              if (showEmojis) setShowEmojis(false);
            }}
            activeOpacity={0.7}
          >
            <Minus color="#334155" size={14} />
            <Text style={styles.toolBtnText}>Line</Text>
          </TouchableOpacity>

          {/* Headlines Tray Toggle */}
          <TouchableOpacity
            style={[styles.toolBtn, showHeadlines && styles.toolBtnSelected]}
            onPress={() => {
              setShowHeadlines(!showHeadlines);
              if (showDividers) setShowDividers(false);
              if (showEmojis) setShowEmojis(false);
            }}
            activeOpacity={0.7}
          >
            <Sparkles color="#D97706" size={14} />
            <Text style={[styles.toolBtnText, { color: "#B45309" }]}>Headlines</Text>
          </TouchableOpacity>

          {/* Emoji Tray Toggle */}
          <TouchableOpacity
            style={[styles.toolBtn, showEmojis && styles.toolBtnSelected]}
            onPress={() => {
              setShowEmojis(!showEmojis);
              if (showHeadlines) setShowHeadlines(false);
              if (showDividers) setShowDividers(false);
            }}
            activeOpacity={0.7}
          >
            <Smile color="#2563EB" size={15} />
            <Text style={[styles.toolBtnText, { color: "#2563EB" }]}>Emoji</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Expandable Promotional Headlines Tray */}
      {showHeadlines && (
        <View style={styles.drawerContainer}>
          <Text style={styles.drawerTitle}>⚡ 1-Tap Bold Headlines:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {PROMO_HEADLINES.map((h, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.drawerChip}
                onPress={() => {
                  handleInsert(h.text);
                  setShowHeadlines(false);
                }}
              >
                <Text style={styles.drawerChipText}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Expandable Dividers Tray */}
      {showDividers && (
        <View style={styles.drawerContainer}>
          <Text style={styles.drawerTitle}>📐 Format Dividers:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {AESTHETIC_DIVIDERS.map((div, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dividerChip}
                onPress={() => {
                  handleInsert(`\n${div}\n`);
                  setShowDividers(false);
                }}
              >
                <Text style={styles.dividerChipText}>{div}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Expandable Emojis Tray */}
      {showEmojis && (
        <View style={styles.drawerContainer}>
          <Text style={styles.drawerTitle}>😃 Business Emojis:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {POPULAR_EMOJIS.map((emoji, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.emojiBtn}
                onPress={() => handleInsert(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Rich Text Input */}
      <View style={[styles.inputWrapper, { minHeight }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          style={[styles.textInput, { minHeight, color: "#0F172A" }]}
        />
      </View>

      {/* Character & Segment Counter Bar */}
      <View style={styles.metricsBar}>
        <Text style={[styles.metricsText, smsMetrics.parts > 1 && { color: "#D97706" }]}>
          📏 {smsMetrics.charCount} chars • {smsMetrics.parts} {smsMetrics.parts === 1 ? "part" : "parts"} {smsMetrics.isUnicode ? "(Unicode/Styled/Emoji)" : "(Standard GSM)"}
        </Text>
        <Text style={[styles.metricsStatus, smsMetrics.parts > 1 ? { color: "#D97706" } : { color: "#16A34A" }]}>
          {smsMetrics.parts > 1 ? `⚠️ Multi-part (${smsMetrics.parts} segments)` : "✓ Single Segment"}
        </Text>
      </View>

      {/* Insert Dynamic Variables */}
      <View style={styles.tagsSection}>
        <Text style={styles.tagsLabel}>Insert Dynamic Tags:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          {tags.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tagBadge}
              onPress={() => handleInsert(" " + t + " ")}
              activeOpacity={0.7}
            >
              <Text style={styles.tagText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  toolbar: {
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toolbarScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toolBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  toolBtnSelected: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  toolBtnTextBold: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  toolBtnTextItalic: {
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
    color: "#334155",
  },
  toolBtnTextMono: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    color: "#334155",
  },
  toolIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bulletText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 4,
  },
  drawerContainer: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  drawerChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  drawerChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  dividerChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dividerChipText: {
    fontSize: 11,
    color: "#475569",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
  },
  emojiBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    marginRight: 4,
  },
  emojiText: {
    fontSize: 18,
  },
  inputWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  textInput: {
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 22,
    padding: 0,
  },
  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  metricsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  metricsStatus: {
    fontSize: 11,
    fontWeight: "700",
  },
  tagsSection: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  tagsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  tagBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
});
