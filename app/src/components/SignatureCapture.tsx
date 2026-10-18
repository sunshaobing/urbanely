import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Check, Eraser, PenLine, Signature, X } from "lucide-react";
import type { InspectionSignatures, SealingSignatures, SignatureImage } from "../types";

export interface SignatureParty {
  key: string;
  label: string;
  signerName: string;
  hint: string;
}

interface SignatureCaptureProps {
  open: boolean;
  title: string;
  subtitle?: string;
  parties: SignatureParty[];
  initial?: InspectionSignatures | SealingSignatures | Record<string, SignatureImage | undefined>;
  onClose: () => void;
  onComplete: (signatures: Record<string, SignatureImage>) => void;
}

function formatSignatureTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SignaturePartyCard({
  label,
  signerName,
  hint,
  signature,
  onSign,
  compact = false,
}: {
  label: string;
  signerName: string;
  hint: string;
  signature?: SignatureImage;
  onSign: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`signature-party-card ${signature ? "is-signed" : ""} ${compact ? "compact" : ""}`}>
      <div className="signature-party-card-head">
        <div className="signature-party-icon">
          <Signature size={17} />
        </div>
        <div>
          <strong>{label}</strong>
          <span>{signerName}</span>
          <small>{signature ? `已签 · ${formatSignatureTime(signature.signedAt)}` : hint}</small>
        </div>
      </div>
      {signature ? (
        <img className="signature-thumb" src={signature.dataUrl} alt={`${label}签名`} />
      ) : (
        <button type="button" className="button secondary" onClick={onSign}>
          <PenLine size={15} />
          手写签字
        </button>
      )}
    </div>
  );
}

export function SignatureCapture({
  open,
  title,
  subtitle,
  parties,
  initial,
  onClose,
  onComplete,
}: SignatureCaptureProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, SignatureImage>>({});
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setDrafts(
      Object.fromEntries(
        Object.entries(initialRef.current ?? {}).filter((entry): entry is [string, SignatureImage] => Boolean(entry[1])),
      ),
    );
    setHasInk(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHasInk(false);
    setError("");
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = 720;
      canvas.height = 240;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.lineWidth = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#17201d";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, activeIndex]);

  if (!open) return null;

  const activeParty = parties[activeIndex] ?? parties[0];
  const currentDraft = activeParty ? drafts[activeParty.key] : undefined;
  const signedCount = parties.filter((party) => drafts[party.key]).length;
  const allSigned = parties.every((party) => drafts[party.key]);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (currentDraft || !activeParty) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.1, point.y);
    context.stroke();
    setHasInk(true);
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || currentDraft) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const clearCanvas = () => {
    resetCanvas();
    setHasInk(false);
    setError("");
  };

  const confirmSignature = () => {
    if (!activeParty) return;
    if (!hasInk) {
      setError("请先在签名区手写签名");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature: SignatureImage = {
      dataUrl: canvas.toDataURL("image/png"),
      signedAt: new Date().toISOString(),
      signerName: activeParty.signerName,
    };
    const nextDrafts = { ...drafts, [activeParty.key]: signature };
    setDrafts(nextDrafts);
    setHasInk(false);
    setError("");
    if (activeIndex < parties.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      setError("双方签字已完成，请点击完成签字");
    }
  };

  const resign = () => {
    if (!activeParty) return;
    const nextDrafts = { ...drafts };
    delete nextDrafts[activeParty.key];
    setDrafts(nextDrafts);
    resetCanvas();
    setHasInk(false);
    setError("");
  };

  const complete = () => {
    if (!allSigned) {
      setError("请完成双方签字后再提交");
      return;
    }
    onComplete(drafts);
  };

  return (
    <div className="signature-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="signature-modal">
        <div className="signature-modal-head">
          <div>
            <span className="eyebrow">SIGN ON PHONE</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭签字">
            <X size={18} />
          </button>
        </div>

        <div className="signature-party-tabs">
          {parties.map((party, index) => (
            <button
              type="button"
              key={party.key}
              className={`${index === activeIndex ? "active" : ""} ${drafts[party.key] ? "signed" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{party.label}</strong>
                <small>{drafts[party.key] ? "已签" : "待签"}</small>
              </div>
            </button>
          ))}
        </div>

        {activeParty ? (
          <>
            <div className="signature-party-title">
              <span className="eyebrow">SIGNER {activeIndex + 1} / {parties.length}</span>
              <h3>{activeParty.label}</h3>
              <p>{activeParty.hint}</p>
            </div>

            {currentDraft ? (
              <div className="signature-existing">
                <img src={currentDraft.dataUrl} alt={`${activeParty.label}签名`} />
                <div>
                  <strong>{currentDraft.signerName}</strong>
                  <span>{formatSignatureTime(currentDraft.signedAt)}</span>
                </div>
                <button type="button" className="button secondary" onClick={resign}>
                  <PenLine size={15} />
                  重新签名
                </button>
              </div>
            ) : (
              <div className="signature-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  width={720}
                  height={240}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
                <div className="signature-line" />
                <span className="signature-canvas-hint">请在此处手写签名</span>
              </div>
            )}

            {error ? <p className="signature-error">{error}</p> : null}

            {!currentDraft ? (
              <div className="signature-actions">
                <button type="button" className="button ghost" onClick={clearCanvas}>
                  <Eraser size={15} />
                  清除
                </button>
                <button type="button" className="button primary" onClick={confirmSignature}>
                  <Check size={15} />
                  确认签名
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="signature-modal-foot">
          <span className="signature-foot-note">
            <Signature size={15} />
            {signedCount} / {parties.length} 已签
          </span>
          <div>
            <button type="button" className="button secondary" onClick={onClose}>
              稍后再说
            </button>
            <button type="button" className="button primary" onClick={complete} disabled={!allSigned}>
              完成签字
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

