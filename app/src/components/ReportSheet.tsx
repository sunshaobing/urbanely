import type { Inspection, SealingOrder, SignatureImage, Site } from "../types";
import { PhotoTile } from "./ui";

const companyFooter = (
  <footer className="paper-footer">
    <span>上海申汰实业有限公司</span>
    <span>021-66010559 · sun@sh shentai.com</span>
    <span>上海市宝山区联谊路 398 号顾众湾 1 号楼 211 室</span>
  </footer>
);

function PaperHeader({ title, reportNo, page, total }: { title: string; reportNo: string; page: number; total: number }) {
  return (
    <div className="paper-header">
      <div className="paper-brand">
        <span className="paper-brand-mark">申汰</span>
        <div>
          <strong>上海申汰实业有限公司</strong>
          <small>SHANGHAI SHENTAI INDUSTRIAL CO., LTD.</small>
        </div>
      </div>
      <div className="paper-meta">
        <span>{reportNo}</span>
        <span>
          {page} / {total}
        </span>
      </div>
      <h1>{title}</h1>
    </div>
  );
}

function InfoRow({ label, value, label2, value2 }: { label: string; value: string; label2?: string; value2?: string }) {
  return (
    <div className={`paper-info-row ${label2 ? "" : "paper-info-row-wide"}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {label2 ? <span>{label2}</span> : null}
      {label2 ? <strong>{value2}</strong> : null}
    </div>
  );
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

function PaperSignature({ label, signature }: { label: string; signature?: SignatureImage }) {
  return (
    <div className="paper-signature">
      <span>{label}</span>
      <div className={signature ? "signature-image" : ""}>
        {signature ? <img src={signature.dataUrl} alt={`${label}签名`} /> : null}
      </div>
      <small>{signature ? `${signature.signerName} · 签字时间：${formatSignatureTime(signature.signedAt)}` : "日期：____年__月__日"}</small>
    </div>
  );
}

export function SurveyReportSheet({ inspection, site }: { inspection: Inspection; site: Site }) {
  return (
    <div className="paper-stack print-area">
      <article className="paper">
        <PaperHeader title="现场勘测报告" reportNo={inspection.reportNo} page={1} total={2} />
        <div className="paper-info-table">
          <InfoRow label="客户门店编码" value={site.code} label2="客户门店名称" value2={site.name} />
          <InfoRow label="门店详细地址" value={site.address} />
          <InfoRow label="勘测日期" value={inspection.date} label2="勘测时间段" value2={inspection.timeRange} />
          <InfoRow label="勘测人员" value={inspection.surveyor} label2="门店对接人" value2={inspection.contact} />
          <InfoRow label="门店对接人电话" value={inspection.contactPhone} />
          <InfoRow label="勘测范围" value={inspection.scope.join(" / ")} />
          <InfoRow label="报告状态" value={inspection.status} label2="风险等级" value2={`${inspection.risk === "high" ? "高" : inspection.risk === "critical" ? "极高" : inspection.risk === "medium" ? "中" : "低"}风险`} />
        </div>

        <section className="paper-section">
          <h2>结构风险图片</h2>
          <p className="paper-note">结构漏洞、虫害痕迹、隐患点位实拍素材；本报告展示前 8 张。</p>
          {inspection.riskPhotos.length > 0 ? (
            <div className="paper-photo-grid">
              {inspection.riskPhotos.slice(0, 8).map((photo) => (
                <PhotoTile
                  key={photo.id}
                  label={photo.label}
                  sublabel="结构风险"
                  tone="neutral"
                  captured
                  previewUrl={photo.previewUrl}
                />
              ))}
            </div>
          ) : (
            <p className="paper-note">暂无结构风险图片。</p>
          )}
          {inspection.riskPhotos.length > 8 ? (
            <p className="paper-note">
              共 {inspection.riskPhotos.length} 张，其余 {inspection.riskPhotos.length - 8} 张进入报告附件页。
            </p>
          ) : null}
        </section>

        <section className="paper-section">
          <h2>结构情况</h2>
          <div className="paper-chip-line">
            {inspection.structure.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="paper-section paper-two-col">
          <div>
            <h2>主要虫害种类</h2>
            <div className="paper-chip-line">
              {inspection.pests.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div>
            <h2>虫害痕迹证据</h2>
            <div className="paper-chip-line">
              {inspection.evidence.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="paper-section">
          <h2>综合治理方案</h2>
          <p>{inspection.integratedPlan}</p>
        </section>

        <section className="paper-section">
          <h2>消杀作业治理</h2>
          <p>{inspection.treatmentPlan}</p>
        </section>

        <section className="paper-section">
          <h2>环境整改建议</h2>
          <p>{inspection.environmentAdvice}</p>
        </section>

        <section className="paper-section">
          <h2>长效预防措施</h2>
          <p>{inspection.longTermPrevention}</p>
        </section>
        {companyFooter}
      </article>

      <article className="paper">
        <PaperHeader title="现场勘测报告" reportNo={inspection.reportNo} page={2} total={2} />
        <section className="paper-section">
          <h2>隐患点清单</h2>
          <table className="paper-table">
            <thead>
              <tr>
                <th>区域</th>
                <th>具体位置</th>
                <th>隐患类型</th>
                <th>严重度</th>
                <th>建议处理</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {inspection.findings.map((finding) => (
                <tr key={finding.id}>
                  <td>{finding.area}</td>
                  <td>{finding.location}</td>
                  <td>{finding.type}</td>
                  <td>{finding.severity === "critical" ? "极高" : finding.severity === "high" ? "高" : finding.severity === "medium" ? "中" : "低"}</td>
                  <td>{finding.recommendation}</td>
                  <td>{finding.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="paper-section paper-summary">
          <div>
            <span>勘测总结</span>
            <strong>{inspection.risk === "critical" ? "极高风险" : inspection.risk === "high" ? "高风险" : inspection.risk === "medium" ? "中风险" : "低风险"}</strong>
          </div>
          <div>
            <span>复检时间</span>
            <strong>{inspection.recheckDate}</strong>
          </div>
          <div>
            <span>报告状态</span>
            <strong>{inspection.status}</strong>
          </div>
        </section>

        <section className="paper-section">
          <h2>整改与复检说明</h2>
          <p>
            请门店在复检日期前完成结构封堵和环境整改。复检时逐条确认隐患点状态，未完成项将进入返工任务。
            报告生成后为版本快照，后续修改不会改变本版本。
          </p>
        </section>

        <div className="paper-signature-row">
          <PaperSignature label="勘测人员签字确认" signature={inspection.signatures?.surveyor} />
          <PaperSignature label="客户代表签字" signature={inspection.signatures?.customer} />
        </div>

        <div className="paper-thanks">
          <strong>致谢</strong>
          <p>感谢您选用上海申汰实业有限公司的服务。本文件属于机密文件，请妥善保管。</p>
        </div>
        {companyFooter}
      </article>
    </div>
  );
}

export function SealingReportSheet({ order, site }: { order: SealingOrder; site: Site }) {
  const beforeItems = order.items.slice(0, 10);
  const afterItems = order.items.slice(0, 10);
  return (
    <div className="paper-stack print-area">
      <article className="paper">
        <PaperHeader title="结构(鼠患)封堵服务单" reportNo={order.reportNo} page={1} total={4} />
        <div className="paper-info-table">
          <InfoRow label="报告日期" value={order.date} label2="客户编号" value2={site.code} />
          <InfoRow label="客户名称" value={site.customer} />
          <InfoRow label="服务地址" value={site.address} />
          <InfoRow label="联系人" value={site.contact} label2="联系电话" value2={site.phoneMasked} />
          <InfoRow label="服务类型" value="首次服务" label2="服务单位" value2="上海申汰实业有限公司" />
          <InfoRow label="服务日期" value={order.date} label2="施工天气" value2={order.weather} />
          <InfoRow label="施工负责人" value={order.leader} label2="现场监理人" value2={order.supervisor} />
          <InfoRow label="鼠害现状评估" value={order.rodent} label2="鼠害密度" value2={order.density} />
          <InfoRow label="主要活动区域" value={order.areas.join(" / ")} />
          <InfoRow label="封堵目的" value={order.purpose} />
          <InfoRow label="漏洞类型" value={order.holeTypes.join(" / ")} />
        </div>

        <section className="paper-section">
          <h2>封堵部位明细</h2>
          <table className="paper-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>区域</th>
                <th>封堵部位</th>
                <th>漏洞类型</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.area}</td>
                  <td>{item.location}</td>
                  <td>{item.holeType}</td>
                  <td>{item.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="paper-section">
          <h2>封堵材料明细</h2>
          <table className="paper-table">
            <thead>
              <tr>
                <th>材料</th>
                <th>规格</th>
                <th>单位</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              {order.materials.map((material) => (
                <tr key={material.id}>
                  <td>{material.name}</td>
                  <td>{material.spec}</td>
                  <td>{material.unit}</td>
                  <td>{material.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="paper-section">
          <h2>封堵前图片</h2>
          <div className="paper-photo-grid paper-photo-grid-5">
            {beforeItems.map((item, index) => (
              <PhotoTile
                key={item.id}
                label={item.beforePhoto}
                sublabel={item.location}
                tone="before"
                captured={Boolean(item.beforePhotoUrl)}
                previewUrl={item.beforePhotoUrl}
              />
            ))}
            {beforeItems.length < 5
              ? Array.from({ length: 5 - beforeItems.length }).map((_, index) => (
                  <PhotoTile key={`before-empty-${index}`} label={`封堵前 · ${index + beforeItems.length + 1}`} tone="before" />
                ))
              : null}
          </div>
        </section>
        {companyFooter}
      </article>

      <article className="paper">
        <PaperHeader title="结构(鼠患)封堵服务单" reportNo={order.reportNo} page={2} total={4} />
        <section className="paper-section">
          <h2>封堵后图片</h2>
          <div className="paper-photo-grid paper-photo-grid-5">
            {afterItems.map((item) => (
              <PhotoTile
                key={item.id}
                label={item.afterPhoto ?? "待补拍"}
                sublabel={item.location}
                tone="after"
                captured={Boolean(item.afterPhotoUrl)}
                previewUrl={item.afterPhotoUrl}
              />
            ))}
            {afterItems.length < 10
              ? Array.from({ length: 10 - afterItems.length }).map((_, index) => (
                  <PhotoTile key={`after-empty-${index}`} label={`封堵后 · ${index + afterItems.length + 1}`} tone="after" />
                ))
              : null}
          </div>
        </section>
        <section className="paper-section">
          <h2>影像归档要求</h2>
          <p>
            每个封堵部位至少保留一张封堵前照片和一张封堵后照片。照片应能同时看清部位全貌和封堵边缘，
            不得使用同一张照片替代前后记录。照片文件与报告快照绑定，生成后不可替换。
          </p>
        </section>
        {companyFooter}
      </article>

      <article className="paper">
        <PaperHeader title="结构(鼠患)封堵服务单" reportNo={order.reportNo} page={3} total={4} />
        <section className="paper-section">
          <h2>施工记录补充</h2>
          <div className="paper-photo-grid paper-photo-grid-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <PhotoTile
                key={index}
                label={`施工过程 · ${String(index + 1).padStart(2, "0")}`}
                sublabel={index % 2 === 0 ? "材料铺设" : "封堵收口"}
                captured
              />
            ))}
          </div>
        </section>
        <section className="paper-section paper-two-col">
          <div>
            <h2>施工负责人</h2>
            <p>{order.leader}</p>
          </div>
          <div>
            <h2>现场监理人</h2>
            <p>{order.supervisor}</p>
          </div>
        </section>
        {companyFooter}
      </article>

      <article className="paper">
        <PaperHeader title="结构(鼠患)封堵服务单" reportNo={order.reportNo} page={4} total={4} />
        <section className="paper-section">
          <h2>验收标准</h2>
          <p>{order.acceptanceCriteria}</p>
        </section>
        <section className="paper-section">
          <h2>卫生改善建议</h2>
          <p>{order.hygieneAdvice}</p>
        </section>
        <section className="paper-section paper-two-col">
          <div>
            <h2>验收结果</h2>
            <p className="paper-result">{order.acceptanceResult}</p>
          </div>
          <div>
            <h2>建议服务频率</h2>
            <p>{order.frequency}</p>
          </div>
        </section>
        <section className="paper-section">
          <h2>后续服务建议</h2>
          <p>{order.followUpAdvice}</p>
        </section>
        <div className="paper-signature-row">
          <PaperSignature label="封堵责任人签字" signature={order.signatures?.responsible} />
          <PaperSignature label="客户代表签字" signature={order.signatures?.customer} />
        </div>
        <div className="paper-qr-row">
          <div className="fake-qr" aria-label="报告二维码占位">
            <span />
          </div>
          <div>
            <strong>报告二维码与验证地址</strong>
            <p>扫码可核对报告编号、客户、日期、签字状态和文件哈希。</p>
          </div>
        </div>
        {companyFooter}
      </article>
    </div>
  );
}

