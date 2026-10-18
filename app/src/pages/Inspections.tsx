import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Filter,
  MapPin,
  Plus,
  Save,
  Search,
  Signature,
  Wrench,
  X,
} from "lucide-react";
import { getSite, inspections } from "../data";
import type { Finding, Inspection, InspectionStatus, RiskLevel } from "../types";
import { SurveyReportSheet } from "../components/ReportSheet";
import { SignatureCapture, SignaturePartyCard } from "../components/SignatureCapture";
import { useInspectionSignatures } from "../signatureStore";
import {
  BackButton,
  Chip,
  EmptyState,
  Field,
  PhotoTile,
  RiskPill,
  SectionTitle,
  StatusPill,
} from "../components/ui";

interface InspectionsProps {
  search: string;
  focusId?: string | null;
  onNotify: (message: string) => void;
  onOpenReport: (template: "survey", inspectionId: string) => void;
}

const tabs = ["现场信息", "结构隐患", "治理方案", "影像证据", "签字确认", "报告预览"] as const;
type Tab = (typeof tabs)[number];

export function Inspections({ search, focusId, onNotify, onOpenReport }: InspectionsProps) {
  const [status, setStatus] = useState<"全部" | InspectionStatus>("全部");
  const [risk, setRisk] = useState<"全部" | RiskLevel>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(focusId ?? null);
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    if (focusId) setSelectedId(focusId);
  }, [focusId]);

  const filtered = useMemo(() => {
    const query = (search || localSearch).trim().toLowerCase();
    return inspections.filter((inspection) => {
      const site = getSite(inspection.siteId);
      const matchQuery =
        !query ||
        inspection.reportNo.toLowerCase().includes(query) ||
        site.name.toLowerCase().includes(query) ||
        site.customer.toLowerCase().includes(query);
      const matchStatus = status === "全部" || inspection.status === status;
      const matchRisk = risk === "全部" || inspection.risk === risk;
      return matchQuery && matchStatus && matchRisk;
    });
  }, [search, localSearch, status, risk]);

  if (selectedId) {
    return (
      <InspectionDetail
        inspectionId={selectedId}
        onBack={() => setSelectedId(null)}
        onNotify={onNotify}
        onOpenReport={onOpenReport}
      />
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SURVEY / FINDINGS</span>
          <h1>现场勘测</h1>
          <p>把结构漏洞、虫害证据和整改建议落到具体隐患点。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="button primary" onClick={() => onNotify("已创建一张空白勘测单草稿")}>
            <Plus size={16} />
            新建勘测
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="segmented" role="tablist" aria-label="勘测状态筛选">
          {(["全部", "待整改", "整改中", "待复检", "已闭环"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={status === item ? "active" : ""}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="filter-tools">
          <label className="inline-search">
            <Search size={15} />
            <input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="搜索编号或门店"
            />
          </label>
          <label className="select-wrap">
            <Filter size={15} />
            <select value={risk} onChange={(event) => setRisk(event.target.value as "全部" | RiskLevel)}>
              <option value="全部">全部风险</option>
              <option value="critical">极高风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="data-table inspections-table">
          <div className="table-head">
            <span>报告编号</span>
            <span>门店</span>
            <span>勘测日期</span>
            <span>风险</span>
            <span>状态</span>
            <span>负责人</span>
            <span>复检日期</span>
            <span />
          </div>
          {filtered.map((inspection) => {
            const site = getSite(inspection.siteId);
            const overdue = inspection.recheckDate < "2026-10-18" && inspection.status !== "已闭环";
            return (
              <button
                type="button"
                className="table-row"
                key={inspection.id}
                onClick={() => setSelectedId(inspection.id)}
              >
                <span className="mono">{inspection.reportNo}</span>
                <span className="cell-main">
                  <strong>{site.name}</strong>
                  <small>
                    <MapPin size={12} />
                    {site.region} · {site.code}
                  </small>
                </span>
                <span>{inspection.date}</span>
                <span>
                  <RiskPill risk={inspection.risk} compact />
                </span>
                <span>
                  <StatusPill status={inspection.status} />
                </span>
                <span>{inspection.surveyor}</span>
                <span className={overdue ? "text-danger" : ""}>
                  {inspection.recheckDate}
                  {overdue ? <small className="overdue-label">逾期</small> : null}
                </span>
                <span className="row-arrow">
                  <ArrowRight size={15} />
                </span>
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <EmptyState title="没有匹配的勘测单" detail="调整状态、风险或搜索词后再试。" />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function InspectionDetail({
  inspectionId,
  onBack,
  onNotify,
  onOpenReport,
}: {
  inspectionId: string;
  onBack: () => void;
  onNotify: (message: string) => void;
  onOpenReport: (template: "survey", inspectionId: string) => void;
}) {
  const original = inspections.find((item) => item.id === inspectionId) ?? inspections[0];
  const [inspection, setInspection] = useState<Inspection>(() => structuredClone(original));
  const [tab, setTab] = useState<Tab>("现场信息");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatures, saveInspectionSignatures] = useInspectionSignatures(original.id);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const site = getSite(inspection.siteId);
  const overdue = inspection.recheckDate < "2026-10-18" && inspection.status !== "已闭环";
  const bothSigned = Boolean(signatures.surveyor && signatures.customer);
  const reportInspection = { ...inspection, signatures };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const update = (patch: Partial<Inspection>) => {
    setInspection((current) => ({ ...current, ...patch }));
  };

  const addFinding = () => {
    const finding: Finding = {
      id: `find-${Date.now()}`,
      area: "仓储区",
      location: "新增隐患位置",
      type: "墙体孔洞",
      severity: "medium",
      evidence: ["鼠迹"],
      status: "待整改",
      recommendation: "补充封堵材料和处理方式",
    };
    update({ findings: [...inspection.findings, finding] });
    onNotify("已新增一个隐患点，请补充位置和照片");
  };

  const handlePhotoFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const remaining = 100 - inspection.riskPhotos.length;
    if (remaining <= 0) {
      onNotify("结构风险图片已达到 100 张上限");
      return;
    }
    const accepted = files.slice(0, remaining);
    const additions = accepted.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      return {
        id: `rp-${Date.now()}-${index}`,
        label: file.name || `结构风险 ${String(inspection.riskPhotos.length + index + 1).padStart(2, "0")}`,
        previewUrl,
      };
    });
    update({ riskPhotos: [...inspection.riskPhotos, ...additions] });
    onNotify(
      files.length > remaining
        ? `最多上传 100 张，本次已加入 ${accepted.length} 张`
        : `已加入 ${accepted.length} 张结构风险图片`,
    );
  };

  const removeRiskPhoto = (photoId: string) => {
    const photo = inspection.riskPhotos.find((item) => item.id === photoId);
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    update({ riskPhotos: inspection.riskPhotos.filter((item) => item.id !== photoId) });
  };

  return (
    <div className="page detail-page">
      <BackButton onClick={onBack} />
      <div className="detail-heading">
        <div>
          <div className="detail-kicker">
            <span className="mono">{inspection.reportNo}</span>
            <StatusPill status={inspection.status} />
            <RiskPill risk={inspection.risk} compact />
            {overdue ? <span className="pill status-danger">复检逾期</span> : null}
          </div>
          <h1>{site.name}</h1>
          <p>
            {site.address} · {inspection.date} {inspection.timeRange}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="button secondary" onClick={() => onNotify("草稿已保存")}>
            <Save size={16} />
            保存草稿
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => onNotify("已生成 3 条封堵任务，并通知项目主管")}
          >
            <Wrench size={16} />
            生成封堵任务
          </button>
          <button type="button" className="button secondary" onClick={() => setSignatureOpen(true)}>
            <Signature size={16} />
            手机签字
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              if (!bothSigned) {
                onNotify("请先完成勘测人员和客户代表双方签字");
                return;
              }
              onOpenReport("survey", inspection.id);
            }}
          >
            <FileText size={16} />
            生成报告
          </button>
        </div>
      </div>

      <div className="detail-tabs" role="tablist">
        {tabs.map((item) => (
          <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
            {item === "结构隐患" ? <span className="tab-count">{inspection.findings.length}</span> : null}
            {item === "影像证据" ? <span className="tab-count">{inspection.riskPhotos.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "现场信息" ? (
        <div className="detail-grid">
          <section className="panel">
            <SectionTitle title="基础信息" subtitle="报告字段与飞书原始单据保持一一对应" />
            <div className="form-grid">
              <Field label="报告编号">
                <input value={inspection.reportNo} readOnly />
              </Field>
              <Field label="报告状态">
                <select
                  value={inspection.status}
                  onChange={(event) => update({ status: event.target.value as InspectionStatus })}
                >
                  <option>待整改</option>
                  <option>整改中</option>
                  <option>待复检</option>
                  <option>已闭环</option>
                </select>
              </Field>
              <Field label="门店">
                <input value={site.name} readOnly />
              </Field>
              <Field label="门店编码">
                <input value={site.code} readOnly />
              </Field>
              <Field label="详细地址" wide>
                <input value={site.address} readOnly />
              </Field>
              <Field label="勘测日期">
                <input type="date" value={inspection.date} onChange={(event) => update({ date: event.target.value })} />
              </Field>
              <Field label="勘测时间段">
                <input value={inspection.timeRange} onChange={(event) => update({ timeRange: event.target.value })} />
              </Field>
              <Field label="勘测人员">
                <input value={inspection.surveyor} onChange={(event) => update({ surveyor: event.target.value })} />
              </Field>
              <Field label="门店对接人">
                <input value={inspection.contact} onChange={(event) => update({ contact: event.target.value })} />
              </Field>
              <Field label="门店对接人电话">
                <input
                  value={inspection.contactPhone}
                  onChange={(event) => update({ contactPhone: event.target.value })}
                  placeholder="138****0000"
                />
              </Field>
              <Field label="风险等级">
                <select value={inspection.risk} onChange={(event) => update({ risk: event.target.value as RiskLevel })}>
                  <option value="critical">极高风险</option>
                  <option value="high">高风险</option>
                  <option value="medium">中风险</option>
                  <option value="low">低风险</option>
                </select>
              </Field>
              <Field label="复检日期">
                <input
                  type="date"
                  value={inspection.recheckDate}
                  onChange={(event) => update({ recheckDate: event.target.value })}
                />
              </Field>
            </div>
          </section>

          <aside className="panel side-summary">
            <SectionTitle title="现场摘要" />
            <div className="summary-list">
              <div>
                <span>隐患点</span>
                <strong>{inspection.findings.length}</strong>
              </div>
              <div>
                <span>待整改</span>
                <strong>{inspection.findings.filter((item) => item.status === "待整改").length}</strong>
              </div>
              <div>
                <span>主要害虫</span>
                <strong>{inspection.pests.join("、")}</strong>
              </div>
              <div>
                <span>报告版本</span>
                <strong>v2</strong>
              </div>
            </div>
            <div className="summary-note">
              <Camera size={16} />
              <span>结构风险图片已归档 {inspection.riskPhotos.length} 张，建议至少保留 8 张。</span>
            </div>
          </aside>

          <section className="panel">
            <SectionTitle title="勘测范围" subtitle="点击标签可切换勾选状态" />
            <div className="chip-grid">
              {["收银区", "仓储区", "营业区域", "货架顶部", "货架底部", "通道走廊", "后厨", "天花板"].map((item) => (
                <Chip
                  key={item}
                  active={inspection.scope.includes(item)}
                  onClick={() =>
                    update({
                      scope: inspection.scope.includes(item)
                        ? inspection.scope.filter((value) => value !== item)
                        : [...inspection.scope, item],
                    })
                  }
                >
                  {inspection.scope.includes(item) ? <Check size={13} /> : null}
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <section className="panel">
            <SectionTitle title="结构情况" subtitle="来自现场检查清单" />
            <div className="chip-grid">
              {[
                "全员无吊顶",
                "梁柱裸露全覆盖",
                "墙体结构漏洞",
                "管线穿墙缝隙",
                "墙体开裂",
                "门底部缝隙过大",
                "缺少隔断",
              ].map((item) => (
                <Chip
                  key={item}
                  active={inspection.structure.includes(item)}
                  onClick={() =>
                    update({
                      structure: inspection.structure.includes(item)
                        ? inspection.structure.filter((value) => value !== item)
                        : [...inspection.structure, item],
                    })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "结构隐患" ? (
        <div className="findings-layout">
          <div className="findings-list">
            {inspection.findings.map((finding, index) => (
              <section className="panel finding-card" key={finding.id}>
                <div className="finding-head">
                  <div className="finding-index">{String(index + 1).padStart(2, "0")}</div>
                  <div>
                    <strong>{finding.location}</strong>
                    <span>
                      {finding.area} · {finding.type}
                    </span>
                  </div>
                  <RiskPill risk={finding.severity} compact />
                  <StatusPill status={finding.status} />
                </div>
                <div className="finding-body">
                  <div className="finding-copy">
                    <Field label="具体位置">
                      <input
                        value={finding.location}
                        onChange={(event) =>
                          update({
                            findings: inspection.findings.map((item) =>
                              item.id === finding.id ? { ...item, location: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="建议处理" wide>
                      <textarea
                        rows={2}
                        value={finding.recommendation}
                        onChange={(event) =>
                          update({
                            findings: inspection.findings.map((item) =>
                              item.id === finding.id ? { ...item, recommendation: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </Field>
                    <div className="evidence-line">
                      <span>证据</span>
                      {finding.evidence.map((item) => (
                        <Chip key={item}>{item}</Chip>
                      ))}
                    </div>
                  </div>
                  <div className="finding-photo-note">
                    <Camera size={18} />
                    <strong>结构风险照片</strong>
                    <span>在“影像证据”中统一上传，最多 100 张。</span>
                  </div>
                </div>
              </section>
            ))}
            <button type="button" className="add-row" onClick={addFinding}>
              <Plus size={16} />
              添加隐患点
            </button>
          </div>
          <aside className="panel findings-rail">
            <SectionTitle title="整改进度" subtitle="按隐患点状态汇总" />
            <div className="status-stack">
              {["待整改", "整改中", "已封堵", "无法施工"].map((item) => {
                const count = inspection.findings.filter((finding) => finding.status === item).length;
                return (
                  <div key={item}>
                    <span>{item}</span>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="button primary full-width"
              onClick={() => onNotify("已生成 3 条封堵任务，按区域分配给施工负责人")}
            >
              <Wrench size={16} />
              生成封堵任务
            </button>
            <p className="rail-note">任务会带上原隐患点、照片和封堵建议，施工人员不需要重新抄写。</p>
          </aside>
        </div>
      ) : null}

      {tab === "治理方案" ? (
        <div className="detail-grid scheme-grid">
          <section className="panel">
            <SectionTitle title="综合治理方案" subtitle="可从防治方案库插入模板" />
            <textarea
              className="large-textarea"
              rows={5}
              value={inspection.integratedPlan}
              onChange={(event) => update({ integratedPlan: event.target.value })}
            />
          </section>
          <section className="panel">
            <SectionTitle title="消杀作业治理" subtitle="写明区域、药剂方式和频次" />
            <textarea
              className="large-textarea"
              rows={5}
              value={inspection.treatmentPlan}
              onChange={(event) => update({ treatmentPlan: event.target.value })}
            />
          </section>
          <section className="panel">
            <SectionTitle title="环境整改建议" subtitle="给门店可执行的清洁和存放要求" />
            <textarea
              className="large-textarea"
              rows={5}
              value={inspection.environmentAdvice}
              onChange={(event) => update({ environmentAdvice: event.target.value })}
            />
          </section>
          <section className="panel">
            <SectionTitle title="长效预防措施" subtitle="巡检、复消、台账和封堵维护" />
            <textarea
              className="large-textarea"
              rows={5}
              value={inspection.longTermPrevention}
              onChange={(event) => update({ longTermPrevention: event.target.value })}
            />
          </section>
          <section className="panel template-panel">
            <SectionTitle title="方案模板" subtitle="把常用表达变成可复用模板" />
            <div className="template-list">
              {["鼠类综合防治方案", "无吊顶门店结构封堵", "商超后场清洁整治", "高风险门店复检"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className="template-item"
                  onClick={() => onNotify(`已插入模板：${item}`)}
                >
                  <ClipboardList size={16} />
                  <span>{item}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "影像证据" ? (
        <div className="detail-grid">
          <section className="panel">
            <SectionTitle
              title="结构风险图片"
              subtitle="结构漏洞、虫害痕迹、隐患点位实拍；支持批量上传，最多 100 张"
              action={<span className="count-badge">{inspection.riskPhotos.length} / 100</span>}
            />
            <div className="photo-upload-bar">
              <div className="upload-hint">
                <Camera size={17} />
                <span>支持 JPG/PNG，可一次选择多张；照片会归档到本勘测单。</span>
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={inspection.riskPhotos.length >= 100}
                onClick={() => photoInputRef.current?.click()}
              >
                <Plus size={15} />
                {inspection.riskPhotos.length >= 100 ? "已达 100 张上限" : "批量上传"}
              </button>
            </div>
            {inspection.riskPhotos.length > 0 ? (
              <div className="risk-gallery">
                {inspection.riskPhotos.map((photo) => (
                  <div className="risk-photo-item" key={photo.id}>
                    <PhotoTile
                      label={photo.label}
                      sublabel="结构风险"
                      tone="neutral"
                      captured
                      previewUrl={photo.previewUrl}
                    />
                    <button
                      type="button"
                      className="photo-remove"
                      aria-label={`移除 ${photo.label}`}
                      onClick={() => removeRiskPhoto(photo.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="还没有结构风险图片" detail="点击“批量上传”选择现场照片，最多 100 张。" />
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden-input"
              onChange={(event) => {
                handlePhotoFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </section>
          <aside className="panel side-summary">
            <SectionTitle title="证据检查" />
            <div className="check-list">
              <div className="check-item done">
                <Check size={15} />
                结构风险图片已归档 {inspection.riskPhotos.length} 张
              </div>
              <div className="check-item done">
                <Check size={15} />
                照片与本次勘测单关联
              </div>
              <div className={`check-item ${inspection.riskPhotos.length >= 8 ? "done" : ""}`}>
                {inspection.riskPhotos.length >= 8 ? <Check size={15} /> : <span className="check-empty" />}
                建议至少保留 8 张现场照片
              </div>
              <div className="check-item done">
                <Check size={15} />
                照片已去除定位信息
              </div>
            </div>
            <button
              type="button"
              className="button secondary full-width"
              disabled={inspection.riskPhotos.length >= 100}
              onClick={() => photoInputRef.current?.click()}
            >
              <Camera size={16} />
              继续批量上传
            </button>
          </aside>
        </div>
      ) : null}

      {tab === "签字确认" ? (
        <div className="signature-workflow">
          <section className="panel">
            <SectionTitle
              title="双方手写签字"
              subtitle="勘测人员先签，再把同一台手机交给客户代表签字"
              action={<StatusPill status={bothSigned ? "双方已签" : "待签字"} />}
            />
            <div className="signature-party-grid">
              <SignaturePartyCard
                label="勘测人员签字确认"
                signerName={inspection.surveyor}
                hint="由勘测人员在本机手写签名"
                signature={signatures.surveyor}
                onSign={() => setSignatureOpen(true)}
              />
              <SignaturePartyCard
                label="客户代表签字"
                signerName={inspection.contact}
                hint="由客户代表在同一台手机上签名"
                signature={signatures.customer}
                onSign={() => setSignatureOpen(true)}
              />
            </div>
            <div className="signature-workflow-actions">
              <button type="button" className="button primary" onClick={() => setSignatureOpen(true)}>
                <Signature size={16} />
                {bothSigned ? "重新发起双方签字" : "打开手机签字"}
              </button>
              <span className="signature-workflow-note">
                签字图片会写入报告快照，并记录签字人、时间和设备。
              </span>
            </div>
          </section>
          <aside className="panel signature-rules">
            <SectionTitle title="签字规则" subtitle="两个签字都完成才能锁定报告" />
            <div className="check-list">
              <div className={`check-item ${signatures.surveyor ? "done" : ""}`}>
                {signatures.surveyor ? <Check size={15} /> : <span className="check-empty" />}
                勘测人员签字确认
              </div>
              <div className={`check-item ${signatures.customer ? "done" : ""}`}>
                {signatures.customer ? <Check size={15} /> : <span className="check-empty" />}
                客户代表签字
              </div>
              <div className={`check-item ${bothSigned ? "done" : ""}`}>
                {bothSigned ? <Check size={15} /> : <span className="check-empty" />}
                双方签字完成
              </div>
            </div>
            <p className="rail-note">签字顺序不会限制，但建议由勘测人员先签，再把手机交给客户代表。</p>
          </aside>
        </div>
      ) : null}

      {tab === "报告预览" ? (
        <div className="report-inline">
          <div className="report-inline-head">
            <span>版本 v2 · 2026-10-18 17:33</span>
            <button type="button" className="button primary" onClick={() => onOpenReport("survey", inspection.id)}>
              <FileText size={16} />
              打开完整预览
            </button>
          </div>
          <SurveyReportSheet inspection={reportInspection} site={site} />
        </div>
      ) : null}

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
        initial={signatures}
        onClose={() => setSignatureOpen(false)}
        onComplete={(next) => {
          const saved = { surveyor: next.surveyor, customer: next.customer };
          saveInspectionSignatures(saved);
          update({ signatures: saved });
          setSignatureOpen(false);
          onNotify("勘测人员与客户代表签字已完成，报告可锁定");
        }}
      />
    </div>
  );
}

