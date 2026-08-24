import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import Button from "./Button";
import { Upload, X, CheckCircle, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import "./ImportExcelModal.css";

export default function ImportExcelModal({
  isOpen,
  onClose,
  onImport,
  title = "Import tu Excel",
  fieldMap = [],
  sampleRow = {},
}) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState("upload");
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = () => {
    setStep("upload");
    setParsedRows([]);
    setErrors([]);
    setFileName("");
    setImporting(false);
    setResult(null);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => { reset(); onClose(); };

  const parseFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const newErrors = [];
        const validated = rawRows.map((row, idx) => {
          const mapped = {};
          fieldMap.forEach(({ excelHeader, fieldKey, required, type }) => {
            let val = row[excelHeader];
            if (val === undefined || val === "") {
              if (required) newErrors.push(`Dong ${idx + 2}: Thieu cot bat buoc "${excelHeader}"`);
              val = type === "number" ? 0 : "";
            }
            if (type === "number") {
              val = Number(val);
              if (isNaN(val)) { newErrors.push(`Dong ${idx + 2}: Cot "${excelHeader}" phai la so`); val = 0; }
            }
            mapped[fieldKey] = val;
          });
          return mapped;
        });
        setParsedRows(validated);
        setErrors(newErrors);
        setStep("preview");
      } catch (err) {
        setErrors(["Khong the doc file Excel. File phai dung dinh dang .xlsx hoac .xls"]);
        setStep("preview");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [fieldMap]);

  const handleFileChange = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const handleDownloadTemplate = () => {
    const headers = fieldMap.map(f => f.excelHeader);
    const sampleValues = headers.map(h => {
      const field = fieldMap.find(f => f.excelHeader === h);
      return sampleRow[field?.fieldKey] ?? (field?.type === "number" ? 0 : "");
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleValues]);
    ws["!cols"] = headers.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_import.xlsx");
  };

  const handleImport = async () => {
    if (parsedRows.length === 0 || errors.length > 0) return;
    setImporting(true);
    try {
      const res = await onImport(parsedRows);
      setResult(res);
      setStep("result");
    } catch (err) {
      setResult({ success: 0, failed: parsedRows.length, error: err.message });
      setStep("result");
    }
    setImporting(false);
  };

  if (!isOpen) return null;
  const headers = fieldMap.map(f => f.excelHeader);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box import-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--accent-green)" }} />
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>{title}</h3>
          </div>
          <button className="btn-icon" onClick={handleClose} title="Dong"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="import-hint-box">
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Buoc 1:</strong> Tai file mau, dien du lieu vao.
                  &nbsp;<strong style={{ color: "var(--text-primary)" }}>Buoc 2:</strong> Upload file vua dien len day.
                </p>
                <Button variant="ghost" icon={Download} iconPosition="left" onClick={handleDownloadTemplate} size="sm">
                  Tai file mau (.xlsx)
                </Button>
              </div>
              <div
                className={`import-dropzone${isDragOver ? " drag-over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload size={36} style={{ opacity: 0.35, marginBottom: "0.5rem" }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--text-md)" }}>Keo tha file vao day</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  hoac click de chon file &nbsp;·&nbsp; Ho tro .xlsx, .xls
                </p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />
              </div>
            </div>
          )}
          {step === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  <strong>{fileName}</strong> &mdash; {parsedRows.length} dong du lieu
                </span>
                <Button variant="ghost" size="sm" onClick={reset}>Chon file khac</Button>
              </div>
              {errors.length > 0 && (
                <div className="import-error-box">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    <AlertTriangle size={15} style={{ color: "var(--accent-amber)", flexShrink: 0 }} />
                    <strong style={{ fontSize: "var(--text-sm)", color: "var(--accent-amber)" }}>
                      Phat hien {errors.length} loi &mdash; Hay sua file va upload lai
                    </strong>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {errors.slice(0, 5).map((e, i) => (
                      <li key={i} style={{ fontSize: "var(--text-sm)", color: "var(--accent-red)" }}>{e}</li>
                    ))}
                    {errors.length > 5 && <li style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>...va {errors.length - 5} loi khac</li>}
                  </ul>
                </div>
              )}
              {parsedRows.length > 0 && errors.length === 0 && (
                <div className="import-preview-table-wrapper">
                  <table className="import-preview-table">
                    <thead>
                      <tr><th>#</th>{headers.map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)" }}>{i + 1}</td>
                          {fieldMap.map(f => <td key={f.fieldKey}>{row[f.fieldKey] ?? "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <p style={{ textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "0.5rem 0 0" }}>
                      ...va {parsedRows.length - 10} dong khac
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {step === "result" && result && (
            <div style={{ textAlign: "center", padding: "var(--space-lg) 0" }}>
              <CheckCircle size={48} style={{ color: "var(--accent-green)", marginBottom: "1rem" }} />
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "var(--text-lg)" }}>Import hoan thanh!</h4>
              <p style={{ fontSize: "var(--text-md)", color: "var(--text-secondary)", margin: 0 }}>
                <strong style={{ color: "var(--accent-green)" }}>{result.success}</strong> dong thanh cong
                {result.failed > 0 && <> &nbsp;&middot;&nbsp; <strong style={{ color: "var(--accent-red)" }}>{result.failed}</strong> dong that bai</>}
              </p>
              {result.error && <p style={{ fontSize: "var(--text-sm)", color: "var(--accent-red)", marginTop: "0.5rem" }}>{result.error}</p>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step === "upload" && <Button variant="secondary" onClick={handleClose}>Dong</Button>}
          {step === "preview" && (
            <>
              <Button variant="secondary" onClick={reset}>Quay lai</Button>
              <Button variant="primary" icon={Upload} iconPosition="left" onClick={handleImport} loading={importing} disabled={errors.length > 0 || parsedRows.length === 0}>
                {importing ? "Dang import..." : `Import ${parsedRows.length} dong`}
              </Button>
            </>
          )}
          {step === "result" && <Button variant="primary" onClick={handleClose}>Xong</Button>}
        </div>
      </div>
    </div>
  );
}
