"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Columns3,
  Copy,
  Database,
  FileCode2,
  FileUp,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  LockKeyhole,
  Search,
  Table2,
  X,
} from "lucide-react";
import {
  parquetMetadataAsync,
  parquetReadObjects,
  type AsyncBuffer,
  type FileMetaData,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";

type ViewMode = "table" | "json";
type RowData = Record<string, unknown>;

const PAGE_SIZES = [25, 50, 100];

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

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) {
    return `[Binary · ${value.byteLength} bytes]`;
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}

function safeJson(value: unknown, spacing = 2) {
  return JSON.stringify(value, jsonReplacer, spacing);
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toLocaleString("zh-CN");
  if (value instanceof Uint8Array) return `Binary · ${value.byteLength} bytes`;
  if (typeof value === "object") return safeJson(value, 0);
  return String(value);
}

function schemaType(element: FileMetaData["schema"][number]) {
  const logical = element.logical_type?.type;
  if (logical) return logical;
  if (element.converted_type) return element.converted_type;
  return element.type ?? "GROUP";
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetaData | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [view, setView] = useState<ViewMode>("table");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  const totalRowsBigInt = metadata?.num_rows ?? 0n;
  const totalRows = metadata
    ? Number(
        totalRowsBigInt > BigInt(Number.MAX_SAFE_INTEGER)
          ? BigInt(Number.MAX_SAFE_INTEGER)
          : totalRowsBigInt,
      )
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const openFile = useCallback(async (nextFile: File) => {
    if (!nextFile.name.toLowerCase().endsWith(".parquet")) {
      setError("请选择扩展名为 .parquet 的文件");
      return;
    }

    setLoading(true);
    setError("");
    setRows([]);
    setQuery("");
    setPage(0);

    try {
      const nextMetadata = await parquetMetadataAsync(
        makeAsyncBuffer(nextFile),
      );
      setFile(nextFile);
      setMetadata(nextMetadata);
    } catch (reason) {
      setFile(null);
      setMetadata(null);
      setError(
        reason instanceof Error
          ? `无法读取文件：${reason.message}`
          : "无法读取这个 Parquet 文件",
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!file || !metadata) return;

    let active = true;
    const readPage = async () => {
      setLoading(true);
      setError("");

      try {
        const nextRows = await parquetReadObjects({
          file: makeAsyncBuffer(file),
          metadata,
          compressors,
          rowStart: page * pageSize,
          rowEnd: Math.min((page + 1) * pageSize, totalRows),
          useOffsetIndex: true,
        });
        if (active) setRows(nextRows as RowData[]);
      } catch (reason) {
        if (active) {
          setRows([]);
          setError(
            reason instanceof Error
              ? `数据解析失败：${reason.message}`
              : "数据解析失败，请确认文件未损坏",
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
  }, [file, metadata, page, pageSize, totalRows]);

  const columns = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => names.add(key)));
    return [...names];
  }, [rows]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      safeJson(row, 0).toLocaleLowerCase().includes(normalized),
    );
  }, [query, rows]);

  const schema = useMemo(
    () =>
      metadata?.schema
        .slice(1)
        .filter((element) => element.type || element.logical_type)
        .slice(0, 100) ?? [],
    [metadata],
  );

  const dropFile = (files: FileList | null) => {
    const nextFile = files?.[0];
    if (nextFile) void openFile(nextFile);
  };

  const clearFile = () => {
    setFile(null);
    setMetadata(null);
    setRows([]);
    setError("");
    setQuery("");
    setPage(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const copyRow = async (row: RowData, index: number) => {
    await navigator.clipboard.writeText(safeJson(row));
    setCopiedRow(index);
    window.setTimeout(() => setCopiedRow(null), 1400);
  };

  return (
    <main className="app-shell">
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
        <div className="privacy-note">
          <LockKeyhole size={14} />
          <span>数据仅在本机处理</span>
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
            打开 Parquet 文件
          </button>

          {file && metadata ? (
            <>
              <div className="side-section current-file">
                <div className="section-label">当前文件</div>
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
                    aria-label="关闭当前文件"
                    title="关闭文件"
                    onClick={clearFile}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="side-section schema-section">
                <div className="section-heading">
                  <span className="section-label">字段结构</span>
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
              <p>选择文件后，这里会显示文件结构与字段类型。</p>
            </div>
          )}

          <div className="sidebar-footer">
            <span className="status-dot" />
            离线模式
            <span>v1.0</span>
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
          {!file || !metadata ? (
            <div className="empty-state">
              <div className="eyebrow">
                <span />
                本地 Parquet 浏览器
              </div>
              <h1>不用上传，直接查看<br />你的数据。</h1>
              <p>
                快速预览 Parquet 文件中的每一条记录。文件不会离开你的设备。
              </p>

              <button
                className={`drop-zone ${dragging ? "active" : ""}`}
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <span className="drop-icon">
                  <FileUp size={24} />
                </span>
                <strong>{dragging ? "松开以打开文件" : "将 .parquet 文件拖到这里"}</strong>
                <span>或点击选择本地文件</span>
                <small>支持 Snappy、GZIP、ZSTD、Brotli、LZ4 等压缩格式</small>
              </button>

              {error && (
                <div className="error-banner" role="alert">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              <div className="feature-row">
                <div>
                  <Database size={17} />
                  <span>
                    <strong>按页读取</strong>
                    轻松处理大文件
                  </span>
                </div>
                <div>
                  <Table2 size={17} />
                  <span>
                    <strong>双视图</strong>
                    表格与 JSON
                  </span>
                </div>
                <div>
                  <LockKeyhole size={17} />
                  <span>
                    <strong>完全本地</strong>
                    不上传数据
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="data-view">
              <div className="data-header">
                <div>
                  <div className="breadcrumb">
                    本地文件 <span>/</span> {file.name}
                  </div>
                  <div className="title-line">
                    <h1>{file.name}</h1>
                    <span className="ready-badge">
                      <CircleCheck size={13} />
                      已就绪
                    </span>
                  </div>
                </div>
                <button
                  className="change-file"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  <FolderOpen size={15} />
                  更换文件
                </button>
              </div>

              <div className="stat-strip">
                <div>
                  <span>总行数</span>
                  <strong>{totalRowsBigInt.toLocaleString("zh-CN")}</strong>
                </div>
                <div>
                  <span>字段数</span>
                  <strong>{schema.length.toLocaleString("zh-CN")}</strong>
                </div>
                <div>
                  <span>行组</span>
                  <strong>{metadata.row_groups.length}</strong>
                </div>
                <div>
                  <span>文件大小</span>
                  <strong>{formatBytes(file.size)}</strong>
                </div>
                <div className="created-by">
                  <span>创建工具</span>
                  <strong>{metadata.created_by || "Unknown"}</strong>
                </div>
              </div>

              <div className="table-card">
                <div className="toolbar">
                  <label className="search-box">
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="筛选当前页数据..."
                      aria-label="筛选当前页数据"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="清除筛选"
                        onClick={() => setQuery("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <div className="toolbar-right">
                    <span className="result-count">
                      第 {totalRows === 0 ? 0 : page * pageSize + 1}–
                      {Math.min((page + 1) * pageSize, totalRows)} 行
                    </span>
                    <div className="view-switch" aria-label="数据视图">
                      <button
                        type="button"
                        className={view === "table" ? "active" : ""}
                        onClick={() => setView("table")}
                      >
                        <Table2 size={15} />
                        表格
                      </button>
                      <button
                        type="button"
                        className={view === "json" ? "active" : ""}
                        onClick={() => setView("json")}
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

                <div className={`data-body ${loading ? "loading" : ""}`}>
                  {loading && (
                    <div className="loading-overlay" aria-live="polite">
                      <LoaderCircle className="spin" size={23} />
                      正在解析数据…
                    </div>
                  )}

                  {!loading && !error && visibleRows.length === 0 ? (
                    <div className="no-results">
                      <Search size={20} />
                      <strong>没有匹配的记录</strong>
                      <span>试试其他关键词，或清除当前筛选。</span>
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
                          {visibleRows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              <td className="row-number">
                                {page * pageSize + rowIndex + 1}
                              </td>
                              {columns.map((column) => {
                                const value = row[column];
                                const text = displayValue(value);
                                return (
                                  <td key={column} title={text ?? "null"}>
                                    {text === null ? (
                                      <span className="null-value">null</span>
                                    ) : (
                                      text
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="json-list">
                      {visibleRows.map((row, rowIndex) => {
                        const absoluteIndex = page * pageSize + rowIndex;
                        return (
                          <article className="json-row" key={rowIndex}>
                            <div className="json-row-head">
                              <span>记录 {absoluteIndex + 1}</span>
                              <button
                                type="button"
                                onClick={() => void copyRow(row, absoluteIndex)}
                              >
                                {copiedRow === absoluteIndex ? (
                                  <CircleCheck size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                                {copiedRow === absoluteIndex ? "已复制" : "复制"}
                              </button>
                            </div>
                            <pre>{safeJson(row)}</pre>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pagination">
                  <label>
                    每页
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(0);
                      }}
                    >
                      {PAGE_SIZES.map((size) => (
                        <option value={size} key={size}>
                          {size} 行
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>
                    第 <strong>{Math.min(page + 1, totalPages)}</strong> /{" "}
                    {totalPages.toLocaleString("zh-CN")} 页
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label="上一页"
                      disabled={page === 0 || loading}
                      onClick={() => setPage((value) => Math.max(0, value - 1))}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="下一页"
                      disabled={page >= totalPages - 1 || loading}
                      onClick={() =>
                        setPage((value) => Math.min(totalPages - 1, value + 1))
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
              <strong>松开以打开新的 Parquet 文件</strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
