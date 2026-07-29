import {
  useCallback,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Columns3,
  Copy,
  FileCode2,
  FileUp,
  FolderOpen,
  HardDrive,
  Languages,
  LoaderCircle,
  ListTree,
  LockKeyhole,
  Moon,
  Palette,
  Search,
  Settings2,
  Table2,
  Type,
  X,
} from "lucide-react";
import {
  parquetMetadataAsync,
  parquetReadObjects,
  type AsyncBuffer,
  type FileMetaData,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";

type ViewMode = "table" | "direct" | "json";
type AppPage = "viewer" | "settings";
type Language = "zh-CN" | "en-US";
type ColorTheme = "forest" | "ocean" | "violet";
type DisplayFont =
  | "system"
  | "segoe-ui"
  | "microsoft-yahei"
  | "cascadia-mono"
  | "consolas"
  | "arial"
  | "georgia";
type Preferences = {
  language: Language;
  colorTheme: ColorTheme;
  darkMode: boolean;
  displayFont: DisplayFont;
  fontSize: number;
};
type RowData = Record<string, unknown>;
type IndexedRow = {
  row: RowData;
  index: number;
};
type ActiveSearch = {
  query: string;
  field: string;
};
type ImageCandidate = {
  bytes?: Uint8Array;
  dataUrl?: string;
  mimeType: string;
  name?: string;
};

const PAGE_SIZES = [25, 50, 100];
const SEARCH_BATCH_SIZE = 500;
const ALL_FIELDS = "__all_fields__";
const PREFERENCES_KEY = "parqview-preferences";
const DEFAULT_PREFERENCES: Preferences = {
  language: "zh-CN",
  colorTheme: "forest",
  darkMode: false,
  displayFont: "cascadia-mono",
  fontSize: 10,
};
const DISPLAY_FONTS: DisplayFont[] = [
  "system",
  "segoe-ui",
  "microsoft-yahei",
  "cascadia-mono",
  "consolas",
  "arial",
  "georgia",
];

function clampFontSize(value: number) {
  return Math.min(32, Math.max(8, Math.round(value)));
}

function normalizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;
  const stored = value as Record<string, unknown>;
  const legacyFontSizes: Record<string, number> = {
    small: 9,
    medium: 10,
    large: 12,
  };
  const rawFontSize =
    typeof stored.fontSize === "number"
      ? stored.fontSize
      : legacyFontSizes[String(stored.fontSize)] ?? DEFAULT_PREFERENCES.fontSize;

  return {
    language: stored.language === "en-US" ? "en-US" : "zh-CN",
    colorTheme:
      stored.colorTheme === "ocean" || stored.colorTheme === "violet"
        ? stored.colorTheme
        : "forest",
    darkMode:
      typeof stored.darkMode === "boolean"
        ? stored.darkMode
        : DEFAULT_PREFERENCES.darkMode,
    displayFont: DISPLAY_FONTS.includes(stored.displayFont as DisplayFont)
      ? (stored.displayFont as DisplayFont)
      : stored.displayFont === "serif"
        ? "georgia"
        : stored.displayFont === "mono"
          ? "cascadia-mono"
          : DEFAULT_PREFERENCES.displayFont,
    fontSize: clampFontSize(rawFontSize),
  };
}

const COPY = {
  "zh-CN": {
    privacy: "数据仅在本机处理",
    openFile: "打开 Parquet 文件",
    currentFile: "当前文件",
    closeCurrentFile: "关闭当前文件",
    closeFile: "关闭文件",
    schema: "字段结构",
    noFile: "尚未打开文件",
    offline: "离线模式",
    settings: "设置",
    dropOpen: "松开以打开",
    dropFile: "拖放 .parquet 文件",
    orChoose: "或点击选择",
    localFile: "本地文件",
    ready: "已就绪",
    changeFile: "更换文件",
    totalRows: "总行数",
    fields: "字段数",
    rowGroups: "行组",
    fileSize: "文件大小",
    createdBy: "创建工具",
    searchPlaceholder: "搜索整个数据集...",
    searchDataset: "搜索整个数据集",
    allFields: "全部字段",
    fieldFilter: "搜索字段",
    clearSearch: "清除搜索",
    search: "搜索",
    ordinalPrefix: "第",
    rows: "行",
    record: "记录",
    dataView: "数据视图",
    table: "表格",
    direct: "直接展示",
    searching: "正在搜索",
    parsing: "正在解析数据…",
    noMatches: "没有匹配的记录",
    noRecords: "当前没有可展示的记录",
    searchHint: "试试其他关键词，或清除当前搜索。",
    emptyHint: "请确认文件中包含数据。",
    fieldCount: "个字段",
    copied: "已复制",
    copyJson: "复制 JSON",
    perPage: "每页",
    singleRecord: "单条记录模式",
    pageNumber: "页码",
    page: "页",
    previousPage: "上一页",
    previousRecord: "上一条",
    nextPage: "下一页",
    nextRecord: "下一条",
    dropNewFile: "松开以打开新的 Parquet 文件",
    settingsTitle: "设置",
    settingsDescription: "调整 Parqview 的显示与语言。",
    backToViewer: "返回数据浏览",
    appearance: "外观",
    appearanceDescription: "设置界面色彩与数据展示方式。",
    theme: "主题",
    forest: "森林绿",
    ocean: "海洋蓝",
    violet: "柔和紫",
    darkMode: "深色模式",
    darkModeDescription: "降低暗光环境下的屏幕亮度。",
    displayFont: "字体系列",
    systemFont: "系统字体",
    segoeFont: "Segoe UI",
    yaheiFont: "微软雅黑",
    cascadiaFont: "Cascadia Mono",
    consolasFont: "Consolas",
    arialFont: "Arial",
    georgiaFont: "Georgia",
    fontSize: "字号",
    general: "常规",
    language: "语言",
    chinese: "简体中文",
    english: "English",
    savedLocally: "设置自动保存在本机",
    invalidFile: "请选择扩展名为 .parquet 的文件",
    readFailed: "无法读取文件",
    invalidParquet: "无法读取这个 Parquet 文件",
    parseFailed: "数据解析失败",
    damagedFile: "请确认文件未损坏",
    searchFailed: "搜索失败",
    imagePreview: "图片预览",
    imageUnavailable: "无法预览图片",
  },
  "en-US": {
    privacy: "Data stays on this device",
    openFile: "Open Parquet file",
    currentFile: "Current file",
    closeCurrentFile: "Close current file",
    closeFile: "Close file",
    schema: "Schema",
    noFile: "No file open",
    offline: "Offline",
    settings: "Settings",
    dropOpen: "Release to open",
    dropFile: "Drop a .parquet file",
    orChoose: "or click to choose",
    localFile: "Local file",
    ready: "Ready",
    changeFile: "Change file",
    totalRows: "Rows",
    fields: "Fields",
    rowGroups: "Row groups",
    fileSize: "File size",
    createdBy: "Created by",
    searchPlaceholder: "Search the entire dataset...",
    searchDataset: "Search the entire dataset",
    allFields: "All fields",
    fieldFilter: "Search field",
    clearSearch: "Clear search",
    search: "Search",
    ordinalPrefix: "",
    rows: "rows",
    record: "Record",
    dataView: "Data view",
    table: "Table",
    direct: "Direct",
    searching: "Searching",
    parsing: "Parsing data…",
    noMatches: "No matching records",
    noRecords: "No records to display",
    searchHint: "Try another keyword or clear the search.",
    emptyHint: "Make sure the file contains data.",
    fieldCount: "fields",
    copied: "Copied",
    copyJson: "Copy JSON",
    perPage: "Per page",
    singleRecord: "Single-record mode",
    pageNumber: "Page number",
    page: "page",
    previousPage: "Previous page",
    previousRecord: "Previous record",
    nextPage: "Next page",
    nextRecord: "Next record",
    dropNewFile: "Release to open a new Parquet file",
    settingsTitle: "Settings",
    settingsDescription: "Adjust Parqview display and language.",
    backToViewer: "Back to data",
    appearance: "Appearance",
    appearanceDescription: "Set interface colors and data display.",
    theme: "Theme",
    forest: "Forest",
    ocean: "Ocean",
    violet: "Violet",
    darkMode: "Dark mode",
    darkModeDescription: "Reduce brightness in low-light environments.",
    displayFont: "Font family",
    systemFont: "System default",
    segoeFont: "Segoe UI",
    yaheiFont: "Microsoft YaHei",
    cascadiaFont: "Cascadia Mono",
    consolasFont: "Consolas",
    arialFont: "Arial",
    georgiaFont: "Georgia",
    fontSize: "Font size",
    general: "General",
    language: "Language",
    chinese: "简体中文",
    english: "English",
    savedLocally: "Settings are saved on this device",
    invalidFile: "Choose a file with the .parquet extension",
    readFailed: "Unable to read file",
    invalidParquet: "Unable to read this Parquet file",
    parseFailed: "Unable to parse data",
    damagedFile: "Make sure the file is not damaged",
    searchFailed: "Search failed",
    imagePreview: "Image preview",
    imageUnavailable: "Unable to preview image",
  },
} as const;

function makeAsyncBuffer(file: File): AsyncBuffer {
  return {
    byteLength: file.size,
    slice: (start, end) => file.slice(start, end).arrayBuffer(),
  };
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function hasBytes(bytes: Uint8Array, offset: number, signature: number[]) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function sniffImageMime(bytes: Uint8Array) {
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    hasBytes(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    hasBytes(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }
  if (
    hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  if (hasBytes(bytes, 0, [0x42, 0x4d])) return "image/bmp";
  if (hasBytes(bytes, 0, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";
  if (
    hasBytes(bytes, 4, [0x66, 0x74, 0x79, 0x70]) &&
    (hasBytes(bytes, 8, [0x61, 0x76, 0x69, 0x66]) ||
      hasBytes(bytes, 8, [0x61, 0x76, 0x69, 0x73]))
  ) {
    return "image/avif";
  }

  const header = new TextDecoder()
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 512)))
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (header.startsWith("<svg") || (header.startsWith("<?xml") && header.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

function readableBinaryText(bytes: Uint8Array) {
  if (sniffImageMime(bytes)) return null;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const hasUnsupportedControl = Array.from(text).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && character !== "\n" && character !== "\r" && character !== "\t";
    });
    return hasUnsupportedControl ? null : text;
  } catch {
    return null;
  }
}

function findImageCandidate(value: unknown): ImageCandidate | null {
  const visited = new WeakSet<object>();
  const preferredDataKeys = new Set([
    "bytes",
    "data",
    "buffer",
    "content",
    "image",
  ]);

  const visit = (
    current: unknown,
    inheritedName?: string,
    depth = 0,
  ): ImageCandidate | null => {
    if (current instanceof Uint8Array) {
      const mimeType = sniffImageMime(current);
      return mimeType
        ? { bytes: current, mimeType, name: inheritedName }
        : null;
    }
    if (typeof current === "string") {
      const match = current.match(/^data:(image\/[^;,]+)[;,]/i);
      return match
        ? { dataUrl: current, mimeType: match[1], name: inheritedName }
        : null;
    }
    if (!current || typeof current !== "object" || depth > 6) return null;
    if (visited.has(current)) return null;
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current.slice(0, 100)) {
        const candidate = visit(item, inheritedName, depth + 1);
        if (candidate) return candidate;
      }
      return null;
    }

    const entries = Object.entries(current);
    const record = current as Record<string, unknown>;
    const localName = ["path", "name", "filename", "file_name"]
      .map((key) => record[key])
      .find((item): item is string => typeof item === "string");
    const orderedEntries = [
      ...entries.filter(([key]) => preferredDataKeys.has(key.toLocaleLowerCase())),
      ...entries.filter(([key]) => !preferredDataKeys.has(key.toLocaleLowerCase())),
    ];

    for (const [, nestedValue] of orderedEntries) {
      const candidate = visit(nestedValue, localName ?? inheritedName, depth + 1);
      if (candidate) return candidate;
    }
    return null;
  };

  return visit(value);
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) {
    const text = readableBinaryText(value);
    if (text !== null) return text;
    return `[Binary · ${value.byteLength} bytes]`;
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function safeJson(value: unknown, spacing = 2) {
  return JSON.stringify(value, jsonReplacer, spacing);
}

function displayValue(value: unknown, locale: Language) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toLocaleString(locale);
  if (value instanceof Uint8Array) {
    return readableBinaryText(value) ?? `Binary · ${value.byteLength} bytes`;
  }
  if (typeof value === "object") return safeJson(value, 0);
  return String(value);
}

function findFieldValues(value: unknown, fieldName: string): unknown[] {
  const matches: unknown[] = [];

  const visit = (current: unknown) => {
    if (
      current === null ||
      current === undefined ||
      current instanceof Date ||
      current instanceof Uint8Array ||
      typeof current !== "object"
    ) {
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    Object.entries(current).forEach(([key, nestedValue]) => {
      if (key === fieldName) matches.push(nestedValue);
      visit(nestedValue);
    });
  };

  visit(value);
  return matches;
}

function searchValue(row: RowData, field: string) {
  if (field === ALL_FIELDS) return safeJson(row, 0) ?? "";
  const values = findFieldValues(row, field);
  if (values.length === 0) return "";
  return safeJson(values.length === 1 ? values[0] : values, 0) ?? "";
}

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return text;

  const normalizedText = text.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(needle);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) parts.push(text.slice(cursor, matchIndex));
    parts.push(
      <mark className="search-highlight" key={`${matchIndex}-${parts.length}`}>
        {text.slice(matchIndex, matchIndex + needle.length)}
      </mark>,
    );
    cursor = matchIndex + needle.length;
    matchIndex = normalizedText.indexOf(needle, cursor);
  }

  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function ImagePreview({
  candidate,
  alt,
  unavailable,
  query = "",
  compact = false,
}: {
  candidate: ImageCandidate;
  alt: string;
  unavailable: string;
  query?: string;
  compact?: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!candidate.bytes) {
      setObjectUrl("");
      return;
    }

    const copiedBytes = new Uint8Array(candidate.bytes.byteLength);
    copiedBytes.set(candidate.bytes);
    const nextUrl = URL.createObjectURL(
      new Blob([copiedBytes.buffer], { type: candidate.mimeType }),
    );
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [candidate.bytes, candidate.mimeType]);

  const source = candidate.dataUrl ?? objectUrl;
  if (failed) {
    return <span className="image-preview-error">{unavailable}</span>;
  }
  if (!source) return <span className="image-preview-loading" aria-hidden="true" />;

  return (
    <figure
      className={`image-preview ${compact ? "image-preview-compact" : "image-preview-full"}`}
    >
      <img
        src={source}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <figcaption>
        <span title={candidate.name}>
          <HighlightedText text={candidate.name ?? alt} query={query} />
        </span>
        {candidate.bytes && <small>{formatBytes(candidate.bytes.byteLength)}</small>}
      </figcaption>
    </figure>
  );
}

function schemaType(element: FileMetaData["schema"][number]) {
  const logical = element.logical_type?.type;
  if (logical) return logical;
  if (element.converted_type) return element.converted_type;
  return element.type ?? "GROUP";
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const [activePage, setActivePage] = useState<AppPage>("viewer");
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetaData | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [searchMatches, setSearchMatches] = useState<IndexedRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize, setPageSize] = useState(25);
  const [view, setView] = useState<ViewMode>("table");
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState(ALL_FIELDS);
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [copiedRow, setCopiedRow] = useState<number | null>(null);
  const copy = COPY[preferences.language];

  useEffect(() => {
    const openShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        inputRef.current?.click();
      }
    };

    window.addEventListener("keydown", openShortcut);
    return () => window.removeEventListener("keydown", openShortcut);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return;

    try {
      const parsed = normalizePreferences(JSON.parse(stored));
      const frame = window.requestAnimationFrame(() => {
        setPreferences(parsed);
      });
      return () => window.cancelAnimationFrame(frame);
    } catch {
      window.localStorage.removeItem(PREFERENCES_KEY);
    }
  }, []);

  const updatePreference = <Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const totalRowsBigInt = metadata?.num_rows ?? 0n;
  const totalRows = metadata
    ? Number(
        totalRowsBigInt > BigInt(Number.MAX_SAFE_INTEGER)
          ? BigInt(Number.MAX_SAFE_INTEGER)
          : totalRowsBigInt,
      )
    : 0;
  const isTableView = view === "table";
  const totalItems = searchMatches?.length ?? totalRows;
  const totalPages = Math.max(
    1,
    isTableView ? Math.ceil(totalItems / pageSize) : totalItems,
  );
  const readStart = isTableView ? page * pageSize : page;
  const readEnd = Math.min(
    isTableView ? (page + 1) * pageSize : page + 1,
    totalRows,
  );

  const openFile = useCallback(async (nextFile: File) => {
    if (!nextFile.name.toLowerCase().endsWith(".parquet")) {
      setError(copy.invalidFile);
      return;
    }

    setActivePage("viewer");
    setLoading(true);
    setError("");
    setRows([]);
    setQuery("");
    setSearchField(ALL_FIELDS);
    setActiveSearch(null);
    setSearchMatches(null);
    setSearching(false);
    setSearchProgress(0);
    setPage(0);
    setPageInput("1");
    searchRequestRef.current += 1;

    try {
      const nextMetadata = await parquetMetadataAsync(
        makeAsyncBuffer(nextFile),
      );
      setFile(nextFile);
      setMetadata(nextMetadata);
      setPageInput(nextMetadata.num_rows === 0n ? "0" : "1");
    } catch (reason) {
      setFile(null);
      setMetadata(null);
      setError(
        reason instanceof Error
          ? `${copy.readFailed}: ${reason.message}`
          : copy.invalidParquet,
      );
      setLoading(false);
    }
  }, [copy]);

  useEffect(() => {
    if (!file || !metadata || searchMatches !== null) return;

    let active = true;
    const readPage = async () => {
      setLoading(true);
      setError("");

      try {
        const nextRows = await parquetReadObjects({
          file: makeAsyncBuffer(file),
          metadata,
          compressors,
          utf8: false,
          rowStart: readStart,
          rowEnd: readEnd,
          useOffsetIndex: true,
        });
        if (active) setRows(nextRows as RowData[]);
      } catch (reason) {
        if (active) {
          setRows([]);
          setError(
            reason instanceof Error
              ? `${copy.parseFailed}: ${reason.message}`
              : `${copy.parseFailed}, ${copy.damagedFile}`,
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void readPage();
    return () => {
      active = false;
    };
  }, [copy, file, metadata, readEnd, readStart, searchMatches]);

  const activeRecords = useMemo<IndexedRow[]>(() => {
    if (searchMatches !== null) {
      const start = isTableView ? page * pageSize : page;
      const end = isTableView ? start + pageSize : start + 1;
      return searchMatches.slice(start, end);
    }

    return rows.map((row, index) => ({
      row,
      index: readStart + index,
    }));
  }, [isTableView, page, pageSize, readStart, rows, searchMatches]);

  const columns = useMemo(() => {
    const names = new Set<string>();
    activeRecords.forEach(({ row }) =>
      Object.keys(row).forEach((key) => names.add(key)),
    );
    return [...names];
  }, [activeRecords]);
  const activeRecordImages = useMemo(
    () =>
      Object.entries(activeRecords[0]?.row ?? {}).flatMap(
        ([fieldName, value]) => {
          const candidate = findImageCandidate(value);
          return candidate ? [{ fieldName, candidate }] : [];
        },
      ),
    [activeRecords],
  );

  const schema = useMemo(
    () =>
      metadata?.schema
        .slice(1)
        .filter((element) => element.type || element.logical_type)
        .slice(0, 100) ?? [],
    [metadata],
  );
  const searchFields = useMemo(
    () => [...new Set(schema.map((element) => element.name))],
    [schema],
  );

  const dropFile = (files: FileList | null) => {
    const nextFile = files?.[0];
    if (nextFile) void openFile(nextFile);
  };

  const clearFile = () => {
    searchRequestRef.current += 1;
    setFile(null);
    setMetadata(null);
    setRows([]);
    setSearchMatches(null);
    setSearching(false);
    setSearchProgress(0);
    setError("");
    setQuery("");
    setSearchField(ALL_FIELDS);
    setActiveSearch(null);
    setPage(0);
    setPageInput("1");
    if (inputRef.current) inputRef.current.value = "";
  };

  const copyRow = async (row: RowData, index: number) => {
    await navigator.clipboard.writeText(safeJson(row, 2));
    setCopiedRow(index);
    window.setTimeout(() => setCopiedRow(null), 1400);
  };

  const clearSearch = () => {
    searchRequestRef.current += 1;
    setQuery("");
    setActiveSearch(null);
    setSearchMatches(null);
    setSearching(false);
    setSearchProgress(0);
    setPage(0);
    setPageInput(totalRows === 0 ? "0" : "1");
  };

  const runSearch = async () => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) {
      clearSearch();
      return;
    }
    if (!file || !metadata) return;

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const matches: IndexedRow[] = [];
    const nextActiveSearch = {
      query: query.trim(),
      field: searchField,
    };

    setSearching(true);
    setSearchProgress(0);
    setSearchMatches([]);
    setActiveSearch(nextActiveSearch);
    setError("");
    setPage(0);
    setPageInput("0");

    try {
      for (
        let start = 0;
        start < totalRows;
        start += SEARCH_BATCH_SIZE
      ) {
        const end = Math.min(start + SEARCH_BATCH_SIZE, totalRows);
        const chunk = (await parquetReadObjects({
          file: makeAsyncBuffer(file),
          metadata,
          compressors,
          utf8: false,
          rowStart: start,
          rowEnd: end,
          useOffsetIndex: true,
        })) as RowData[];

        if (requestId !== searchRequestRef.current) return;

        chunk.forEach((row, index) => {
          if (
            searchValue(row, searchField)
              .toLocaleLowerCase()
              .includes(normalized)
          ) {
            matches.push({ row, index: start + index });
          }
        });

        setSearchProgress(end / Math.max(totalRows, 1));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }

      if (requestId === searchRequestRef.current) {
        setSearchMatches(matches);
        setPageInput(matches.length === 0 ? "0" : "1");
      }
    } catch (reason) {
      if (requestId === searchRequestRef.current) {
        setSearchMatches(null);
        setActiveSearch(null);
        setError(
          reason instanceof Error
            ? `${copy.searchFailed}: ${reason.message}`
            : `${copy.searchFailed}, ${copy.damagedFile}.`,
        );
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearching(false);
      }
    }
  };

  const commitPageInput = () => {
    const requestedPage = Number.parseInt(pageInput, 10);
    const nextPage = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), totalPages)
      : page + 1;
    setPage(totalItems === 0 ? 0 : nextPage - 1);
    setPageInput(totalItems === 0 ? "0" : String(nextPage));
  };

  const changeView = (nextView: ViewMode) => {
    const staysOnSingleRecord =
      view !== "table" && nextView !== "table";
    setView(nextView);
    if (!staysOnSingleRecord) {
      setPage(0);
      setPageInput(totalItems === 0 ? "0" : "1");
    }
  };

  return (
    <main
      className="app-shell"
      data-theme={preferences.colorTheme}
      data-color-mode={preferences.darkMode ? "dark" : "light"}
      data-display-font={preferences.displayFont}
      lang={preferences.language}
      style={
        {
          "--data-font-size": `${preferences.fontSize}px`,
        } as CSSProperties
      }
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".parquet,application/vnd.apache.parquet"
        onChange={(event) => dropFile(event.target.files)}
      />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Columns3 size={19} strokeWidth={2.2} />
          </div>
          <div>
            <strong>Parqview</strong>
            <span>Local data inspector</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="privacy-note">
            <LockKeyhole size={14} />
            <span>{copy.privacy}</span>
          </div>
          <button
            className={`topbar-settings ${
              activePage === "settings" ? "active" : ""
            }`}
            type="button"
            aria-label={copy.settings}
            title={copy.settings}
            onClick={() =>
              setActivePage((current) =>
                current === "settings" ? "viewer" : "settings",
              )
            }
          >
            <Settings2 size={16} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <button
            className="open-button"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <FolderOpen size={17} />
            {copy.openFile}
          </button>

          {file && metadata ? (
            <>
              <div className="side-section current-file">
                <div className="section-label">{copy.currentFile}</div>
                <div className="file-card">
                  <div className="file-icon">
                    <FileCode2 size={18} />
                  </div>
                  <div className="file-copy">
                    <strong title={file.name}>{file.name}</strong>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={copy.closeCurrentFile}
                    title={copy.closeFile}
                    onClick={clearFile}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="side-section schema-section">
                <div className="section-heading">
                  <span className="section-label">{copy.schema}</span>
                  <span>{schema.length}</span>
                </div>
                <div className="schema-list">
                  {schema.map((element, index) => (
                    <div
                      className="schema-item"
                      key={`${element.name}-${index}`}
                    >
                      <span className="field-glyph">
                        {element.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="field-name" title={element.name}>
                        {element.name}
                      </span>
                      <span className="field-type">
                        {schemaType(element).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="sidebar-empty">
              <HardDrive size={20} />
              <p>{copy.noFile}</p>
            </div>
          )}

          <div className="sidebar-bottom">
            <button
              className={`settings-navigation ${
                activePage === "settings" ? "active" : ""
              }`}
              type="button"
              onClick={() => setActivePage("settings")}
            >
              <Settings2 size={15} />
              {copy.settings}
            </button>
            <div className="sidebar-footer">
              <span className="status-dot" />
              {copy.offline}
              <span>v1.0</span>
            </div>
          </div>
        </aside>

        <div
          className={`content ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            dropFile(event.dataTransfer.files);
          }}
        >
          {activePage === "settings" ? (
            <div className="settings-page">
              <div className="settings-header">
                <button
                  className="settings-back"
                  type="button"
                  onClick={() => setActivePage("viewer")}
                >
                  <ChevronLeft size={16} />
                  {copy.backToViewer}
                </button>
                <div>
                  <h1>{copy.settingsTitle}</h1>
                  <p>{copy.settingsDescription}</p>
                </div>
              </div>

              <div className="settings-content">
                <section className="settings-card">
                  <div className="settings-section-title">
                    <Palette size={17} />
                    <div>
                      <h2>{copy.appearance}</h2>
                      <p>{copy.appearanceDescription}</p>
                    </div>
                  </div>

                  <div className="setting-row">
                    <div className="setting-label">
                      <strong>{copy.theme}</strong>
                    </div>
                    <div className="theme-options">
                      {(
                        [
                          ["forest", copy.forest],
                          ["ocean", copy.ocean],
                          ["violet", copy.violet],
                        ] as const
                      ).map(([theme, label]) => (
                        <button
                          className={
                            preferences.colorTheme === theme ? "active" : ""
                          }
                          type="button"
                          key={theme}
                          onClick={() =>
                            updatePreference("colorTheme", theme)
                          }
                        >
                          <span className={`theme-swatch ${theme}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="setting-row">
                    <div className="setting-label with-icon">
                      <Moon size={15} />
                      <div>
                        <strong>{copy.darkMode}</strong>
                        <span>{copy.darkModeDescription}</span>
                      </div>
                    </div>
                    <button
                      className={`toggle-switch ${
                        preferences.darkMode ? "active" : ""
                      }`}
                      type="button"
                      role="switch"
                      aria-checked={preferences.darkMode}
                      onClick={() =>
                        updatePreference("darkMode", !preferences.darkMode)
                      }
                    >
                      <span />
                    </button>
                  </div>

                  <div className="setting-row">
                    <div className="setting-label with-icon">
                      <Type size={15} />
                      <strong>{copy.displayFont}</strong>
                    </div>
                    <select
                      value={preferences.displayFont}
                      onChange={(event) =>
                        updatePreference(
                          "displayFont",
                          event.target.value as DisplayFont,
                        )
                      }
                    >
                      <option value="system">{copy.systemFont}</option>
                      <option value="segoe-ui">{copy.segoeFont}</option>
                      <option value="microsoft-yahei">
                        {copy.yaheiFont}
                      </option>
                      <option value="cascadia-mono">
                        {copy.cascadiaFont}
                      </option>
                      <option value="consolas">{copy.consolasFont}</option>
                      <option value="arial">{copy.arialFont}</option>
                      <option value="georgia">{copy.georgiaFont}</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <div className="setting-label">
                      <strong>{copy.fontSize}</strong>
                    </div>
                    <div className="font-size-control">
                      <input
                        type="range"
                        min="8"
                        max="32"
                        step="1"
                        value={preferences.fontSize}
                        aria-label={copy.fontSize}
                        onChange={(event) =>
                          updatePreference(
                            "fontSize",
                            clampFontSize(Number(event.target.value)),
                          )
                        }
                      />
                      <label>
                        <input
                          type="number"
                          min="8"
                          max="32"
                          step="1"
                          value={preferences.fontSize}
                          aria-label={copy.fontSize}
                          onChange={(event) =>
                            updatePreference(
                              "fontSize",
                              clampFontSize(Number(event.target.value)),
                            )
                          }
                        />
                        <span>px</span>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="settings-card">
                  <div className="settings-section-title compact">
                    <Languages size={17} />
                    <h2>{copy.general}</h2>
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <strong>{copy.language}</strong>
                    </div>
                    <select
                      value={preferences.language}
                      onChange={(event) =>
                        updatePreference(
                          "language",
                          event.target.value as Language,
                        )
                      }
                    >
                      <option value="zh-CN">{copy.chinese}</option>
                      <option value="en-US">{copy.english}</option>
                    </select>
                  </div>
                </section>

                <div className="settings-saved">
                  <CircleCheck size={14} />
                  {copy.savedLocally}
                </div>
              </div>
            </div>
          ) : !file || !metadata ? (
            <div className="empty-state">
              <h1>{copy.openFile}</h1>

              <button
                className={`drop-zone ${dragging ? "active" : ""}`}
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <span className="drop-icon">
                  <FileUp size={24} />
                </span>
                <strong>{dragging ? copy.dropOpen : copy.dropFile}</strong>
                <span>{copy.orChoose}</span>
              </button>

              {error && (
                <div className="error-banner" role="alert">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

            </div>
          ) : (
            <div className="data-view">
              <div className="data-header">
                <div>
                  <div className="breadcrumb">
                    {copy.localFile} <span>/</span> {file.name}
                  </div>
                  <div className="title-line">
                    <h1>{file.name}</h1>
                    <span className="ready-badge">
                      <CircleCheck size={13} />
                      {copy.ready}
                    </span>
                  </div>
                </div>
                <button
                  className="change-file"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  <FolderOpen size={15} />
                  {copy.changeFile}
                </button>
              </div>

              <div className="stat-strip">
                <div>
                  <span>{copy.totalRows}</span>
                  <strong>
                    {totalRowsBigInt.toLocaleString(preferences.language)}
                  </strong>
                </div>
                <div>
                  <span>{copy.fields}</span>
                  <strong>
                    {schema.length.toLocaleString(preferences.language)}
                  </strong>
                </div>
                <div>
                  <span>{copy.rowGroups}</span>
                  <strong>{metadata.row_groups.length}</strong>
                </div>
                <div>
                  <span>{copy.fileSize}</span>
                  <strong>{formatBytes(file.size)}</strong>
                </div>
                <div className="created-by">
                  <span>{copy.createdBy}</span>
                  <strong>{metadata.created_by || "Unknown"}</strong>
                </div>
              </div>

              <div className="table-card">
                <div className="toolbar">
                  <form
                    className="search-box"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runSearch();
                    }}
                  >
                    <select
                      className="field-filter"
                      value={searchField}
                      aria-label={copy.fieldFilter}
                      title={copy.fieldFilter}
                      onChange={(event) => setSearchField(event.target.value)}
                    >
                      <option value={ALL_FIELDS}>{copy.allFields}</option>
                      {searchFields.map((fieldName) => (
                        <option value={fieldName} key={fieldName}>
                          {fieldName}
                        </option>
                      ))}
                    </select>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.searchPlaceholder}
                      aria-label={copy.searchDataset}
                    />
                    {query && (
                      <button
                        className="search-clear"
                        type="button"
                        aria-label={copy.clearSearch}
                        onClick={clearSearch}
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      className="search-submit"
                      type="submit"
                      disabled={searching}
                    >
                      {copy.search}
                    </button>
                  </form>
                  <div className="toolbar-right">
                    <span className="result-count">
                      {isTableView ? (
                        <>
                          {copy.ordinalPrefix}{" "}
                          {totalItems === 0 ? 0 : page * pageSize + 1}–
                          {Math.min((page + 1) * pageSize, totalItems)} /{" "}
                          {totalItems.toLocaleString(preferences.language)}{" "}
                          {copy.rows}
                        </>
                      ) : (
                        <>
                          {copy.record} {totalItems === 0 ? 0 : page + 1} /{" "}
                          {totalItems.toLocaleString(preferences.language)}
                        </>
                      )}
                    </span>
                    <div className="view-switch" aria-label={copy.dataView}>
                      <button
                        type="button"
                        className={view === "table" ? "active" : ""}
                        onClick={() => changeView("table")}
                      >
                        <Table2 size={15} />
                        {copy.table}
                      </button>
                      <button
                        type="button"
                        className={view === "direct" ? "active" : ""}
                        onClick={() => changeView("direct")}
                      >
                        <ListTree size={15} />
                        {copy.direct}
                      </button>
                      <button
                        type="button"
                        className={view === "json" ? "active" : ""}
                        onClick={() => changeView("json")}
                      >
                        <Braces size={15} />
                        JSON
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="inline-error" role="alert">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                  </div>
                )}

                <div
                  className={`data-body ${loading || searching ? "loading" : ""}`}
                >
                  {(loading || searching) && (
                    <div className="loading-overlay" aria-live="polite">
                      <LoaderCircle className="spin" size={23} />
                      {searching
                        ? `${copy.searching} ${Math.round(searchProgress * 100)}%`
                        : copy.parsing}
                    </div>
                  )}

                  {!loading &&
                  !searching &&
                  !error &&
                  activeRecords.length === 0 ? (
                    <div className="no-results">
                      <Search size={20} />
                      <strong>
                        {searchMatches !== null
                          ? copy.noMatches
                          : copy.noRecords}
                      </strong>
                      <span>
                        {searchMatches !== null
                          ? copy.searchHint
                          : copy.emptyHint}
                      </span>
                    </div>
                  ) : view === "table" ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th className="row-number">#</th>
                            {columns.map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeRecords.map(({ row, index }) => (
                            <tr key={index}>
                              <td className="row-number">{index + 1}</td>
                              {columns.map((column) => {
                                const value = row[column];
                                const image = findImageCandidate(value);
                                const text = displayValue(
                                  value,
                                  preferences.language,
                                );
                                const highlightQuery =
                                  activeSearch &&
                                  (activeSearch.field === ALL_FIELDS ||
                                    activeSearch.field === column ||
                                    findFieldValues(
                                      value,
                                      activeSearch.field,
                                    ).length > 0)
                                    ? activeSearch.query
                                    : "";
                                return (
                                  <td
                                    className={image ? "image-cell" : undefined}
                                    key={column}
                                    title={image?.name ?? text ?? "null"}
                                  >
                                    {image ? (
                                      <ImagePreview
                                        candidate={image}
                                        alt={`${copy.imagePreview}: ${column}`}
                                        unavailable={copy.imageUnavailable}
                                        query={highlightQuery}
                                        compact
                                      />
                                    ) : text === null ? (
                                      <span className="null-value">null</span>
                                    ) : (
                                      <HighlightedText
                                        text={text}
                                        query={highlightQuery}
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : view === "direct" ? (
                    <div className="record-detail">
                      <article className="detail-record">
                        <div className="detail-record-head">
                          <div>
                            <span>
                              {copy.record} {activeRecords[0]?.index + 1}
                            </span>
                            <strong>
                              {Object.keys(activeRecords[0]?.row ?? {}).length}{" "}
                              {copy.fieldCount}
                            </strong>
                          </div>
                        </div>
                        <div className="field-accordion">
                          {Object.entries(activeRecords[0]?.row ?? {}).map(
                            ([fieldName, value], fieldIndex) => {
                              const image = findImageCandidate(value);
                              const text = displayValue(
                                value,
                                preferences.language,
                              );
                              const highlightQuery =
                                activeSearch &&
                                (activeSearch.field === ALL_FIELDS ||
                                  activeSearch.field === fieldName ||
                                  findFieldValues(
                                    value,
                                    activeSearch.field,
                                  ).length > 0) &&
                                (text ?? "")
                                  .toLocaleLowerCase()
                                  .includes(
                                    activeSearch.query.toLocaleLowerCase(),
                                  )
                                  ? activeSearch.query
                                  : "";
                              return (
                                <details
                                  className="field-panel"
                                  key={fieldName}
                                  open={fieldIndex === 0 || Boolean(highlightQuery)}
                                >
                                  <summary>
                                    <span className="field-panel-title">
                                      <HighlightedText
                                        text={fieldName}
                                        query={
                                          activeSearch?.field === ALL_FIELDS
                                            ? activeSearch.query
                                            : ""
                                        }
                                      />
                                    </span>
                                    <span className="field-panel-meta">
                                      {value === null || value === undefined
                                        ? "null"
                                        : Array.isArray(value)
                                          ? "array"
                                          : typeof value}
                                    </span>
                                    <ChevronDown
                                      className="field-panel-chevron"
                                      size={16}
                                    />
                                  </summary>
                                  <div className="field-panel-content">
                                    {image ? (
                                      <div className="image-field-preview">
                                        <ImagePreview
                                          candidate={image}
                                          alt={`${copy.imagePreview}: ${fieldName}`}
                                          unavailable={copy.imageUnavailable}
                                          query={highlightQuery}
                                        />
                                        <pre className="image-field-metadata">
                                          <HighlightedText
                                            text={safeJson(value, 2) ?? ""}
                                            query={highlightQuery}
                                          />
                                        </pre>
                                      </div>
                                    ) : text === null ? (
                                      <span className="null-value">null</span>
                                    ) : typeof value === "object" ? (
                                      <pre>
                                        <HighlightedText
                                          text={safeJson(value, 2) ?? ""}
                                          query={highlightQuery}
                                        />
                                      </pre>
                                    ) : (
                                      <div className="scalar-value">
                                        <HighlightedText
                                          text={text}
                                          query={highlightQuery}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </details>
                              );
                            },
                          )}
                        </div>
                      </article>
                    </div>
                  ) : (
                    <div className="json-list single-json-record">
                      <article className="json-row">
                        <div className="json-row-head">
                          <span>
                            {copy.record} {activeRecords[0]?.index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void copyRow(
                                activeRecords[0].row,
                                activeRecords[0].index,
                              )
                            }
                          >
                            {copiedRow === activeRecords[0]?.index ? (
                              <CircleCheck size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                            {copiedRow === activeRecords[0]?.index
                              ? copy.copied
                              : copy.copyJson}
                          </button>
                        </div>
                        {activeRecordImages.length > 0 && (
                          <div className="json-image-previews">
                            {activeRecordImages.map(({ fieldName, candidate }) => (
                              <ImagePreview
                                candidate={candidate}
                                alt={`${copy.imagePreview}: ${fieldName}`}
                                unavailable={copy.imageUnavailable}
                                query={activeSearch?.query ?? ""}
                                key={fieldName}
                              />
                            ))}
                          </div>
                        )}
                        <pre>
                          <HighlightedText
                            text={safeJson(activeRecords[0]?.row, 2) ?? ""}
                            query={activeSearch?.query ?? ""}
                          />
                        </pre>
                      </article>
                    </div>
                  )}
                </div>

                <div className="pagination">
                  {isTableView ? (
                    <label>
                      {copy.perPage}
                      <select
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          setPage(0);
                          setPageInput(totalItems === 0 ? "0" : "1");
                        }}
                      >
                        {PAGE_SIZES.map((size) => (
                          <option value={size} key={size}>
                            {size} {copy.rows}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="pagination-mode">
                      {copy.singleRecord}
                    </span>
                  )}
                  <span className="page-status">
                    {copy.ordinalPrefix}
                    <input
                      className="page-number-input"
                      value={pageInput}
                      inputMode="numeric"
                      aria-label={copy.pageNumber}
                      onChange={(event) =>
                        setPageInput(event.target.value.replace(/\D/g, ""))
                      }
                      onBlur={commitPageInput}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    /{" "}
                    {totalItems === 0
                      ? 0
                      : totalPages.toLocaleString(preferences.language)}{" "}
                    {copy.page}
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label={
                        isTableView ? copy.previousPage : copy.previousRecord
                      }
                      disabled={page === 0 || loading || searching}
                      onClick={() => {
                        const nextPage = Math.max(0, page - 1);
                        setPage(nextPage);
                        setPageInput(String(nextPage + 1));
                      }}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label={
                        isTableView ? copy.nextPage : copy.nextRecord
                      }
                      disabled={
                        page >= totalPages - 1 || loading || searching
                      }
                      onClick={() =>
                        {
                          const nextPage = Math.min(totalPages - 1, page + 1);
                          setPage(nextPage);
                          setPageInput(String(nextPage + 1));
                        }
                      }
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {dragging && file && (
            <div className="drag-overlay">
              <FileUp size={28} />
              <strong>{copy.dropNewFile}</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
