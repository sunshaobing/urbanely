import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CloudOff,
  MapPin,
  Mic,
  Plus,
  Save,
  ShieldCheck,
  Signature,
  Smartphone,
  Wifi,
} from "lucide-react";
import { getSite, inspections } from "../data";
import { Chip, PhotoTile, ProgressBar, RiskPill, StatusPill } from "../components/ui";
import { SignatureCapture, SignaturePartyCard } from "../components/SignatureCapture";
import { useInspectionSignatures } from "../signatureStore";
import { PageHeader } from "../components/PageHeader";

interface FieldModeProps {
  onNotify: (message: string) => void;
}

const steps = ["门店确认", "结构检查", "结构风险拍照", "治理建议", "双方签字", "提交"] as const;

export function FieldMode({ onNotify }: FieldModeProps) {
  const inspection = inspections[0];
  const [step, setStep] = useState(0);
  const [structure, setStructure] = useState<string[]>([
    "全员无吊顶",
    "梁柱裸露",
    "墙体结构漏洞",
    "管线穿墙缝隙",
  ]);
  const [fieldPhotos, setFieldPhotos] = useState<string[]>(() =>
    inspection.riskPhotos.map((photo) => photo.label),
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [storedSignatures, saveInspectionSignatures] = useInspectionSignatures(inspection.id);
  const bothSigned = Boolean(storedSignatures.surveyor && storedSignatures.customer);
  const [advice, setAdvice] = useState(
    "对墙体穿孔使用铝塑板、防火泥、密封胶、防鼠网进行封堵；门窗缝隙整改；加强店污管理。",
  );
  const [submitted, setSubmitted] = useState(false);
  const site = getSite(inspection.siteId);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const handleFieldFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const remaining = 100 - fieldPhotos.length;
    if (remaining <= 0) {
      onNotify("结构风险图片已达到 100 张上限");
      return;
    }
    const accepted = files.slice(0, remaining);
    setFieldPhotos((current) => [
      ...current,
      ...accepted.map(
        (file, index) => file.name || `结构风险 ${String(current.length + index + 1).padStart(2, "0")}`,
      ),
    ]);
    onNotify(
      files.length > remaining
        ? `最多上传 100 张，本次已加入 ${accepted.length} 张`
        : `已加入 ${accepted.length} 张结构风险图片`,
    );
  };

  const next = () => {
    if (step === 4 && !bothSigned) {
      onNotify("请先完成勘测人员和客户代表双方签字");
      return;
    }
    if (step === steps.length - 1) {
      setSubmitted(true);
      onNotify("勘测单已保存到本地，联网后自动同步");
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  return (
    <div className="page field-page">
      <PageHeader
        eyebrow="FIELD PWA / OFFLINE FIRST"
        title="现场模式"
        description="手机端先保证能填、能拍、能存，再考虑网络。"
        meta={
          <>
            <span className="live-dot" />
            本机：王三毛 · 勘测单 KC-2026-BG-128
          </>
        }
        actions={
          <span className="pill status-success">
            <Wifi size={12} />
            在线 · 已同步
          </span>
        }
      />

      <div className="field-layout">
        <div className="phone-shell">
          <div className="phone-status">
            <span>22:41</span>
            <span className="phone-notch" />
            <span>5G · 82%</span>
          </div>
          <div className="phone-top">
            <button type="button" className="icon-button" onClick={() => setStep((current) => Math.max(0, current - 1))} aria-label="上一步">
              <ArrowLeft size={18} />
            </button>
            <div>
              <strong>{steps[step]}</strong>
              <span>KC-2026-BG-128</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onNotify("草稿已保存到本机")} aria-label="保存草稿">
              <Save size={18} />
            </button>
          </div>
          <div className="phone-progress">
            <ProgressBar value={progress} />
            <span>{step + 1}/{steps.length}</span>
          </div>

          <div className="phone-body">
            {step === 0 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 01</span>
                <h2>确认门店与对接人</h2>
                <div className="phone-site-card">
                  <div className="phone-site-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <strong>{site.name}</strong>
                    <span>{site.customer} · {site.code}</span>
                  </div>
                  <RiskPill risk={site.risk} compact />
                </div>
                <div className="phone-info-list">
                  <div>
                    <span>地址</span>
                    <strong>{site.address}</strong>
                  </div>
                  <div>
                    <span>对接人</span>
                    <strong>{site.contact}</strong>
                  </div>
                  <div>
                    <span>联系电话</span>
                    <strong>{inspection.contactPhone}</strong>
                  </div>
                  <div>
                    <span>勘测时间</span>
                    <strong>2026-10-11 22:20</strong>
                  </div>
                  <div>
                    <span>任务来源</span>
                    <strong>常规服务计划</strong>
                  </div>
                </div>
                <div className="phone-note">
                  <MapPin size={15} />
                  <span>定位已记录。照片会自动去除精确定位信息，只保留门店与时间。</span>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 02</span>
                <h2>结构情况</h2>
                <p className="phone-lead">按现场实际勾选，不需要输入长段文字。</p>
                <div className="phone-chip-grid">
                  {[
                    "全员无吊顶",
                    "梁柱裸露",
                    "墙体结构漏洞",
                    "管线穿墙缝隙",
                    "墙体开裂",
                    "门底缝隙过大",
                    "缺少隔断",
                    "通风口无防护",
                  ].map((item) => (
                    <Chip
                      key={item}
                      active={structure.includes(item)}
                      onClick={() =>
                        setStructure((current) =>
                          current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
                        )
                      }
                    >
                      {structure.includes(item) ? <Check size={13} /> : null}
                      {item}
                    </Chip>
                  ))}
                </div>
                <div className="phone-check-card">
                  <div>
                    <strong>{structure.length} 项结构风险</strong>
                    <span>其中 2 项需要封堵施工</span>
                  </div>
                  <StatusPill status="待整改" />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 03</span>
                <h2>结构风险拍照</h2>
                <p className="phone-lead">支持一次选择多张，最多 100 张；照片统一归档到本次勘测单。</p>
                <div className="phone-photo-grid">
                  {fieldPhotos.slice(0, 6).map((label, index) => (
                    <PhotoTile
                      key={`${label}-${index}`}
                      label={label}
                      sublabel="结构风险"
                      tone="neutral"
                      captured
                    />
                  ))}
                  <button
                    type="button"
                    className="phone-add-photo"
                    disabled={fieldPhotos.length >= 100}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Plus size={18} />
                    <span>{fieldPhotos.length >= 100 ? "已达上限" : "批量选择"}</span>
                  </button>
                </div>
                <div className="phone-photo-count">
                  <Camera size={15} />
                  已上传 {fieldPhotos.length} / 100 张结构风险图片
                </div>
                <div className="phone-finding-list">
                  {inspection.findings.slice(0, 3).map((finding) => (
                    <div className="phone-finding compact" key={finding.id}>
                      <div className="phone-finding-head">
                        <div>
                          <strong>{finding.location}</strong>
                          <span>{finding.area} · {finding.type}</span>
                        </div>
                        <RiskPill risk={finding.severity} compact />
                      </div>
                    </div>
                  ))}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden-input"
                  onChange={(event) => {
                    handleFieldFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 04</span>
                <h2>治理建议</h2>
                <div className="phone-templates">
                  {["鼠类综合防治方案", "结构封堵", "环境整改"].map((item) => (
                    <button
                      type="button"
                      className="phone-template"
                      key={item}
                      onClick={() => {
                        setAdvice((current) => `${current}\n${item}：按现场标准执行。`);
                        onNotify(`已插入${item}`);
                      }}
                    >
                      <Plus size={14} />
                      {item}
                    </button>
                  ))}
                </div>
                <textarea
                  className="phone-textarea"
                  rows={5}
                  value={advice}
                  onChange={(event) => setAdvice(event.target.value)}
                />
                <button type="button" className="phone-voice" onClick={() => onNotify("语音转文字已开始（演示）")}>
                  <Mic size={16} />
                  语音补充
                </button>
                <div className="phone-note">
                  <ShieldCheck size={15} />
                  <span>建议会保存为结构化段落，报告中按模板输出，不再形成新的多选选项。</span>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 05</span>
                <h2>双方签字</h2>
                <p className="phone-lead">勘测人员先签，再把同一台手机交给客户代表签字。</p>
                <div className="phone-signature-cards">
                  <SignaturePartyCard
                    compact
                    label="勘测人员签字确认"
                    signerName={inspection.surveyor}
                    hint="由勘测人员在本机手写签名"
                    signature={storedSignatures.surveyor}
                    onSign={() => setSignatureOpen(true)}
                  />
                  <SignaturePartyCard
                    compact
                    label="客户代表签字"
                    signerName={inspection.contact}
                    hint="由客户代表在同一台手机上签名"
                    signature={storedSignatures.customer}
                    onSign={() => setSignatureOpen(true)}
                  />
                </div>
                <button type="button" className="button secondary full-width signature-open" onClick={() => setSignatureOpen(true)}>
                  <Signature size={17} />
                  {bothSigned ? "重新发起双方签字" : "打开手机签字"}
                </button>
                <div className="phone-note">
                  <Signature size={15} />
                  <span>签字图片会写入报告快照，并记录签字人、时间和设备。</span>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="phone-section">
                <span className="phone-eyebrow">STEP 06</span>
                <h2>{submitted ? "已保存到本地" : "提交勘测单"}</h2>
                {submitted ? (
                  <div className="phone-success">
                    <CheckCircle2 size={42} />
                    <strong>等待联网同步</strong>
                    <p>勘测单、3 个隐患点和照片已写入本机队列。网络恢复后按顺序上传。</p>
                    <span className="offline-chip">
                      <CloudOff size={14} />
                      离线队列 · 4 项
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="phone-summary">
                      <div>
                        <span>门店</span>
                        <strong>{site.name}</strong>
                      </div>
                      <div>
                        <span>结构风险</span>
                        <strong>{structure.length} 项</strong>
                      </div>
                      <div>
                        <span>隐患点</span>
                        <strong>{inspection.findings.length} 项</strong>
                      </div>
                      <div>
                        <span>照片</span>
                        <strong>{fieldPhotos.length} 张</strong>
                      </div>
                      <div>
                        <span>双方签字</span>
                        <strong>{bothSigned ? "已完成" : "待完成"}</strong>
                      </div>
                    </div>
                    <div className="phone-signature">
                      <div>
                        <span>双方签字</span>
                        <strong className={bothSigned ? "signed-script" : ""}>{bothSigned ? "已签字" : "待签字"}</strong>
                        <small>{bothSigned ? "勘测人员 + 客户代表 · 已存证" : "在“双方签字”步骤完成"}</small>
                      </div>
                      <button type="button" className="phone-sign-button" onClick={() => setSignatureOpen(true)}>
                        <Signature size={17} />
                        {bothSigned ? "查看签字" : "去签字"}
                      </button>
                    </div>
                    <div className="phone-note">
                      <Wifi size={15} />
                      <span>提交后生成报告草稿，审核通过才会发布正式版本。</span>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="phone-bottom">
            <button type="button" className="phone-secondary" onClick={() => setStep((current) => Math.max(0, current - 1))}>
              上一步
            </button>
            <button
              type="button"
              className="phone-primary"
              onClick={next}
              disabled={step === 4 && !bothSigned}
            >
              {step === 4 && !bothSigned
                ? "请完成双方签字"
                : step === steps.length - 1
                  ? submitted
                    ? "完成"
                    : "提交勘测单"
                  : "下一步"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <aside className="field-side">
          <section className="panel">
            <div className="field-side-head">
              <Smartphone size={18} />
              <div>
                <strong>现场采集原则</strong>
                <span>先把证据留住，再考虑排版</span>
              </div>
            </div>
            <div className="field-principles">
              <div>
                <span>01</span>
                <p>结构检查用勾选，隐患点单独建记录。</p>
              </div>
              <div>
                <span>02</span>
                <p>结构风险图片统一归档，单次可批量选择。</p>
              </div>
              <div>
                <span>03</span>
                <p>断网先写本机，联网自动同步。</p>
              </div>
              <div>
                <span>04</span>
                <p>提交后才进入报告快照流程。</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="field-side-head">
              <CloudOff size={18} />
              <div>
                <strong>本机队列</strong>
                <span>演示数据</span>
              </div>
            </div>
            <div className="queue-list">
              <div>
                <span>勘测单草稿</span>
                <strong>1</strong>
              </div>
              <div>
                <span>待上传照片</span>
                <strong>3</strong>
              </div>
              <div>
                <span>待同步签字</span>
                <strong>{bothSigned ? 0 : 2}</strong>
              </div>
            </div>
            <button type="button" className="button secondary full-width" onClick={() => onNotify("正在尝试同步本机队列")}>
              <Wifi size={16} />
              立即同步
            </button>
          </section>

          <section className="panel field-tip">
            <span className="eyebrow">WHY IT MATTERS</span>
            <h3>现场少做一次重复录入</h3>
            <p>
              勘测单里的隐患点、照片和封堵建议会直接进入封堵任务与复检清单。工程师不需要在飞书里再抄一遍。
            </p>
          </section>
        </aside>
      </div>

      <SignatureCapture
        open={signatureOpen}
        title={`${inspection.reportNo} · 勘测单双方签字`}
        subtitle="由勘测人员在手机上先签，再把同一台手机交给客户代表签字。"
        parties={[
          {
            key: "surveyor",
            label: "勘测人员签字确认",
            signerName: inspection.surveyor,
            hint: "勘测人员在本机手写签名",
          },
          {
            key: "customer",
            label: "客户代表签字",
            signerName: inspection.contact,
            hint: "客户代表在同一台手机上签名",
          },
        ]}
        initial={storedSignatures}
        onClose={() => setSignatureOpen(false)}
        onComplete={(next) => {
          const saved = { surveyor: next.surveyor, customer: next.customer };
          saveInspectionSignatures(saved);
          setSignatureOpen(false);
          onNotify("双方签字已完成，签字图片已加入本机队列");
        }}
      />
    </div>
  );
}

