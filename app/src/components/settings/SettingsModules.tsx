import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createMaterial,
  createQuickPhrase,
  deleteMaterial,
  deleteQuickPhrase,
  itemsOf,
  listMaterials,
  listQuickPhrases,
  updateMaterial,
  updateQuickPhrase,
  uploadReportLogo,
  uploadReportSeal,
  uploadSettingsFile,
} from "../../api";
import type {
  BackendMaterial,
  BackendQuickPhrase,
  BackendTemplates,
  MaterialInput,
  QuickPhraseInput,
  UploadedAsset,
} from "../../api";
import { mediaUrl } from "../../backendMappers";
import { SectionTitle, StatusPill } from "../ui";

export interface ServiceItemRecord {
  id: string;
  name: string;
  targets: string[];
  updated_at: string;
  updated_by: string;
}

export interface QualificationFileRecord {
  id: string;
  name: string;
  file_url: string;
  expires_at: string;
  customer_types: string[];
  created_at: string;
}

export interface NumberingRule {
  generate_type: "auto" | "manual";
  prefix: string;
  year_digits: number;
  sequence_digits: number;
}

export interface NumberingSettings {
  contract: NumberingRule;
  customer: NumberingRule;
  workorder: NumberingRule;
}

interface SettingsModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
}

function SettingsModal({
  title,
  children,
  onClose,
  onSave,
  saving,
}: SettingsModalProps) {
  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <section
        className="personnel-modal settings-sub-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sub-modal-title"
      >
        <header className="personnel-modal-head">
          <div>
            <span className="eyebrow">SETTING DETAIL</span>
            <h2 id="settings-sub-modal-title">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="settings-sub-modal-body">{children}</div>
        {onSave ? (
          <footer className="personnel-modal-actions">
            <button type="button" className="button ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="button primary"
              disabled={saving}
              onClick={onSave}
            >
              <Save size={15} />
              {saving ? "保存中" : "保存"}
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function ModuleHeader({
  title,
  subtitle,
  canEdit,
  search,
  onSearch,
  onCreate,
}: {
  title: string;
  subtitle: string;
  canEdit: boolean;
  search: string;
  onSearch: (value: string) => void;
  onCreate?: () => void;
}) {
  return (
    <div className="settings-module-head">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="settings-module-tools">
        <label className="settings-module-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="搜索名称或内容"
          />
        </label>
        {canEdit && onCreate ? (
          <button type="button" className="button primary" onClick={onCreate}>
            <Plus size={15} />
            新增
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ServiceItemsPanel({
  items,
  canEdit,
  onChange,
  onPersist,
}: {
  items: ServiceItemRecord[];
  canEdit: boolean;
  onChange: (items: ServiceItemRecord[]) => void;
  onPersist: (items: ServiceItemRecord[]) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ServiceItemRecord | null>(null);
  const [draft, setDraft] = useState({ name: "", targets: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.includes(search) ||
          item.targets.some((target) => target.includes(search)),
      ),
    [items, search],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", targets: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item: ServiceItemRecord) => {
    setEditing(item);
    setDraft({ name: item.name, targets: item.targets.join("、") });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("请填写服务项目名称");
      return;
    }
    setSaving(true);
    setError("");
    const record: ServiceItemRecord = {
      id: editing?.id || `service-${Date.now()}`,
      name: draft.name.trim(),
      targets: draft.targets
        .split(/[、,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      updated_at: new Date().toISOString(),
      updated_by: "当前账号",
    };
    const nextItems =
      editing
        ? items.map((item) => (item.id === editing.id ? record : item))
        : [record, ...items];
    onChange(nextItems);
    try {
      await onPersist(nextItems);
      setModalOpen(false);
    } catch (saveError) {
      onChange(items);
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: ServiceItemRecord) => {
    if (!window.confirm(`确认删除“${item.name}”？`)) return;
    const previous = items;
    const nextItems = items.filter((entry) => entry.id !== item.id);
    onChange(nextItems);
    try {
      await onPersist(nextItems);
    } catch {
      onChange(previous);
    }
  };

  return (
    <>
      <ModuleHeader
        title="服务项目"
        subtitle="维护服务名称与关联靶标"
        canEdit={canEdit}
        search={search}
        onSearch={setSearch}
        onCreate={openCreate}
      />
      <div className="settings-data-table">
        <div className="settings-table-head service-columns">
          <span>名称</span><span>靶标</span><span>最后修改时间</span><span>操作</span>
        </div>
        {filtered.map((item) => (
          <div className="settings-table-row service-columns" key={item.id}>
            <strong>{item.name}</strong>
            <div className="tag-list">
              {item.targets.map((target) => <span key={target}>{target}</span>)}
            </div>
            <span>{item.updated_at.slice(0, 16).replace("T", " ")}</span>
            <div className="table-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`编辑${item.name}`}
                title="编辑服务项目"
                onClick={() => openEdit(item)}
                disabled={!canEdit}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`删除${item.name}`}
                title="删除服务项目"
                onClick={() => void remove(item)}
                disabled={!canEdit}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? <div className="personnel-empty">暂无服务项目。</div> : null}
      </div>
      {modalOpen ? (
        <SettingsModal
          title={editing ? "编辑服务项目" : "新增服务项目"}
          onClose={() => setModalOpen(false)}
          onSave={() => void save()}
          saving={saving}
        >
          <div className="settings-sub-form">
            <label><span>服务项目</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span>关联靶标</span><input value={draft.targets} onChange={(event) => setDraft({ ...draft, targets: event.target.value })} placeholder="老鼠、蟑螂、飞虫" /><small>多个靶标使用顿号或逗号分隔</small></label>
            {error ? <div className="personnel-modal-error">{error}</div> : null}
          </div>
        </SettingsModal>
      ) : null}
    </>
  );
}

const emptyMaterial: MaterialInput = {
  name: "",
  category: "封堵材料",
  spec: "",
  unit: "个",
  stock: 0,
  warning_stock: 0,
  remark: "",
};

export function MaterialsPanel({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<BackendMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BackendMaterial | null>(null);
  const [draft, setDraft] = useState<MaterialInput>(emptyMaterial);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(itemsOf<BackendMaterial>(await listMaterials()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "物料加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter(
    (item) =>
      item.name.includes(search) ||
      (item.category || "").includes(search) ||
      (item.spec || "").includes(search),
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyMaterial);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item: BackendMaterial) => {
    setEditing(item);
    setDraft({
      name: item.name,
      category: item.category || "封堵材料",
      spec: item.spec || "",
      unit: item.unit || "个",
      stock: item.stock || 0,
      warning_stock: item.warning_stock || 0,
      remark: item.remark || "",
    });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("请填写物料名称");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...draft, name: draft.name.trim() };
      if (editing) await updateMaterial(editing.id, payload);
      else await createMaterial(payload);
      await load();
      setModalOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "物料保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: BackendMaterial) => {
    if (!canEdit || !window.confirm(`确认删除“${item.name}”？`)) return;
    try {
      await deleteMaterial(item.id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "物料删除失败");
    }
  };

  return (
    <>
      <ModuleHeader
        title="物料设置"
        subtitle="维护库存、规格、单位与预警阈值"
        canEdit={canEdit}
        search={search}
        onSearch={setSearch}
        onCreate={openCreate}
      />
      <div className="settings-data-table">
        <div className="settings-table-head material-columns">
          <span>名称</span><span>规格</span><span>分类</span><span>单位</span><span>库存</span><span>操作</span>
        </div>
        {filtered.map((item) => (
          <div className="settings-table-row material-columns" key={item.id}>
            <strong>{item.name}</strong>
            <span>{item.spec || "—"}</span>
            <span>{item.category || "—"}</span>
            <span>{item.unit || "—"}</span>
            <span className={Number(item.stock) <= Number(item.warning_stock) ? "stock-warning" : ""}>
              {item.stock ?? 0}
            </span>
            <div className="table-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`编辑${item.name}`}
                title="编辑物料"
                onClick={() => openEdit(item)}
                disabled={!canEdit}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`删除${item.name}`}
                title="删除物料"
                onClick={() => void remove(item)}
                disabled={!canEdit}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {loading ? <div className="personnel-empty">正在加载物料…</div> : null}
        {!loading && !filtered.length ? <div className="personnel-empty">暂无物料数据。</div> : null}
      </div>
      {error && !modalOpen ? <div className="settings-banner error">{error}</div> : null}
      {modalOpen ? (
        <SettingsModal
          title={editing ? "编辑物料" : "新增物料"}
          onClose={() => setModalOpen(false)}
          onSave={() => void save()}
          saving={saving}
        >
          <div className="settings-sub-form two-columns">
            <label><span>名称</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span>分类</span><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
            <label><span>规格</span><input value={draft.spec} onChange={(event) => setDraft({ ...draft, spec: event.target.value })} /></label>
            <label><span>单位</span><input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></label>
            <label><span>库存</span><input type="number" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} /></label>
            <label><span>预警库存</span><input type="number" value={draft.warning_stock} onChange={(event) => setDraft({ ...draft, warning_stock: Number(event.target.value) })} /></label>
            <label className="wide"><span>备注</span><textarea value={draft.remark} onChange={(event) => setDraft({ ...draft, remark: event.target.value })} /></label>
            {error ? <div className="personnel-modal-error wide">{error}</div> : null}
          </div>
        </SettingsModal>
      ) : null}
    </>
  );
}

export function QuickPhrasesPanel({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<BackendQuickPhrase[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BackendQuickPhrase | null>(null);
  const [draft, setDraft] = useState<QuickPhraseInput>({
    category: "service_content",
    content: "",
    sort_order: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setItems(itemsOf<BackendQuickPhrase>(await listQuickPhrases()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "快捷用语加载失败");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter(
    (item) =>
      item.content.includes(search) ||
      item.category.includes(search),
  );

  const openCreate = () => {
    setEditing(null);
    setDraft({ category: "service_content", content: "", sort_order: 0 });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item: BackendQuickPhrase) => {
    setEditing(item);
    setDraft({
      category: item.category,
      content: item.content,
      sort_order: item.sort_order || 0,
    });
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.content.trim()) {
      setError("请填写快捷语内容");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, content: draft.content.trim() };
      if (editing) await updateQuickPhrase(editing.id, payload);
      else await createQuickPhrase(payload);
      await load();
      setModalOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "快捷语保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: BackendQuickPhrase) => {
    if (!canEdit || !window.confirm("确认删除这条快捷语？")) return;
    try {
      await deleteQuickPhrase(item.id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "快捷语删除失败");
    }
  };

  return (
    <>
      <ModuleHeader
        title="快捷用语"
        subtitle="维护常用服务说明与现场记录模板"
        canEdit={canEdit}
        search={search}
        onSearch={setSearch}
        onCreate={openCreate}
      />
      <div className="settings-data-table">
        <div className="settings-table-head phrase-columns">
          <span>快捷语内容</span><span>类型</span><span>排序</span><span>操作</span>
        </div>
        {filtered.map((item) => (
          <div className="settings-table-row phrase-columns" key={item.id}>
            <p>{item.content}</p>
            <span>{item.category}</span>
            <span>{item.sort_order || 0}</span>
            <div className="table-actions">
              <button
                type="button"
                className="icon-button"
                aria-label="编辑快捷用语"
                title="编辑快捷用语"
                onClick={() => openEdit(item)}
                disabled={!canEdit}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label="删除快捷用语"
                title="删除快捷用语"
                onClick={() => void remove(item)}
                disabled={!canEdit}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? <div className="personnel-empty">暂无快捷用语。</div> : null}
      </div>
      {error && !modalOpen ? <div className="settings-banner error">{error}</div> : null}
      {modalOpen ? (
        <SettingsModal
          title={editing ? "编辑快捷用语" : "新增快捷用语"}
          onClose={() => setModalOpen(false)}
          onSave={() => void save()}
          saving={saving}
        >
          <div className="settings-sub-form">
            <label><span>类型</span><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
            <label><span>排序</span><input type="number" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
            <label><span>快捷语内容</span><textarea rows={5} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
            {error ? <div className="personnel-modal-error">{error}</div> : null}
          </div>
        </SettingsModal>
      ) : null}
    </>
  );
}

export function QualificationFilesPanel({
  files,
  canEdit,
  onChange,
  onPersist,
}: {
  files: QualificationFileRecord[];
  canEdit: boolean;
  onChange: (files: QualificationFileRecord[]) => void;
  onPersist: (files: QualificationFileRecord[]) => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QualificationFileRecord | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    expires_at: "",
    customer_types: "全部客户",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", expires_at: "", customer_types: "全部客户" });
    setFile(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (record: QualificationFileRecord) => {
    setEditing(record);
    setDraft({
      name: record.name,
      expires_at: record.expires_at,
      customer_types: record.customer_types.join("、"),
    });
    setFile(null);
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("请填写文件名称");
      return;
    }
    if (!editing && !file) {
      setError("请选择需要上传的文件");
      return;
    }
    setSaving(true);
    try {
      let uploaded: UploadedAsset | null = null;
      if (file) uploaded = await uploadSettingsFile(file);
      const fileUrl =
        uploaded?.url ||
        uploaded?.path ||
        uploaded?.file_path ||
        editing?.file_url ||
        "";
      if (!fileUrl) throw new Error("上传成功但未返回文件地址");
      const record: QualificationFileRecord = {
        id: editing?.id || `qualification-${Date.now()}`,
        name: draft.name.trim(),
        file_url: fileUrl,
        expires_at: draft.expires_at,
        customer_types: draft.customer_types
          .split(/[、,，]/)
          .map((item) => item.trim())
          .filter(Boolean),
        created_at: editing?.created_at || new Date().toISOString(),
      };
      const nextFiles =
        editing
          ? files.map((item) => (item.id === editing.id ? record : item))
          : [record, ...files];
      onChange(nextFiles);
      await onPersist(nextFiles);
      setModalOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "资质文件保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: QualificationFileRecord) => {
    if (!canEdit || !window.confirm(`确认删除“${record.name}”？`)) return;
    const previous = files;
    const nextFiles = files.filter((item) => item.id !== record.id);
    onChange(nextFiles);
    try {
      await onPersist(nextFiles);
    } catch {
      onChange(previous);
    }
  };

  return (
    <>
      <div className="settings-module-head">
        <SectionTitle title="资质文件" subtitle="维护企业资质、有效期与可见客户类型" />
        {canEdit ? (
          <button type="button" className="button primary" onClick={openCreate}>
            <Plus size={15} /> 新增
          </button>
        ) : null}
      </div>
      <div className="settings-data-table">
        <div className="settings-table-head qualification-columns">
          <span>资质文件名称</span><span>文件</span><span>有效期</span><span>可见客户</span><span>操作</span>
        </div>
        {files.map((item) => (
          <div className="settings-table-row qualification-columns" key={item.id}>
            <strong>{item.name}</strong>
            <a href={mediaUrl(item.file_url)} target="_blank" rel="noreferrer">预览文件</a>
            <span>{item.expires_at || "长期有效"}</span>
            <span>{item.customer_types.join("、") || "全部客户"}</span>
            <div className="table-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`编辑${item.name}`}
                title="编辑资质文件"
                onClick={() => openEdit(item)}
                disabled={!canEdit}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`删除${item.name}`}
                title="删除资质文件"
                onClick={() => void remove(item)}
                disabled={!canEdit}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!files.length ? <div className="personnel-empty">暂无资质文件。</div> : null}
      </div>
      {modalOpen ? (
        <SettingsModal
          title={editing ? "编辑资质文件" : "新增资质文件"}
          onClose={() => setModalOpen(false)}
          onSave={() => void save()}
          saving={saving}
        >
          <div className="settings-sub-form two-columns">
            <label><span>文件名称</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span>有效期</span><input type="date" value={draft.expires_at} onChange={(event) => setDraft({ ...draft, expires_at: event.target.value })} /></label>
            <label className="wide"><span>可见客户类型</span><input value={draft.customer_types} onChange={(event) => setDraft({ ...draft, customer_types: event.target.value })} /></label>
            <label className="wide settings-file-picker"><span>资质文件</span><input type="file" accept=".pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>{file?.name || (editing ? "不选择则保留原文件" : "PDF 或图片")}</small></label>
            {error ? <div className="personnel-modal-error wide">{error}</div> : null}
          </div>
        </SettingsModal>
      ) : null}
    </>
  );
}

export function ReportSealPanel({
  templates,
  companyName,
  companyAddress,
  companyPhone,
  website,
  canEdit,
  onRefresh,
}: {
  templates: BackendTemplates | null;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  website: string;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const logoInput = useRef<HTMLInputElement>(null);
  const sealInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "seal" | "">("");
  const [error, setError] = useState("");

  const upload = async (kind: "logo" | "seal", file?: File) => {
    if (!file || !canEdit) return;
    setUploading(kind);
    setError("");
    try {
      if (kind === "logo") await uploadReportLogo(file);
      else await uploadReportSeal(file);
      await onRefresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件上传失败");
    } finally {
      setUploading("");
    }
  };

  return (
    <>
      <div className="settings-module-head">
        <SectionTitle title="报告公章" subtitle="维护企业抬头、Logo 与报告印章" />
      </div>
      <div className="settings-data-table">
        <div className="settings-table-head seal-columns">
          <span>公司名称</span><span>客户热线</span><span>公司网址</span><span>水印公章</span><span>Logo</span><span>操作</span>
        </div>
        <div className="settings-table-row seal-columns">
          <strong>{companyName || templates?.company_name || "—"}</strong>
          <span>{companyPhone || templates?.company_phone || "—"}</span>
          <span>{website || "—"}</span>
          <span className="seal-preview">
            {templates?.report_seal ? <img src={mediaUrl(templates.report_seal)} alt="报告公章" /> : "未上传"}
          </span>
          <span className="seal-preview">
            {templates?.logo_url || templates?.report_logo ? (
              <img src={mediaUrl(templates.logo_url || templates.report_logo || "")} alt="公司Logo" />
            ) : "未上传"}
          </span>
          <div className="table-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="上传公司Logo"
              title="上传公司Logo"
              onClick={() => logoInput.current?.click()}
              disabled={!canEdit || Boolean(uploading)}
            >
              <ImagePlus size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="上传报告公章"
              title="上传报告公章"
              onClick={() => sealInput.current?.click()}
              disabled={!canEdit || Boolean(uploading)}
            >
              <Upload size={15} />
            </button>
          </div>
        </div>
      </div>
      <input ref={logoInput} hidden type="file" accept="image/png,image/jpeg" onChange={(event) => void upload("logo", event.target.files?.[0])} />
      <input ref={sealInput} hidden type="file" accept="image/png" onChange={(event) => void upload("seal", event.target.files?.[0])} />
      <div className="seal-address-note">
        <ShieldCheck size={17} />
        <span>{companyAddress || "公司地址尚未配置"} · {uploading ? "正在上传" : "Logo 和公章会用于新生成的报告"}</span>
      </div>
      {error ? <div className="settings-banner error">{error}</div> : null}
    </>
  );
}

export function CodeSettingsPanel({
  value,
  canEdit,
  onChange,
}: {
  value: NumberingSettings;
  canEdit: boolean;
  onChange: (value: NumberingSettings) => void;
}) {
  const [tab, setTab] = useState<keyof NumberingSettings>("contract");
  const rule = value[tab];
  const update = (patch: Partial<NumberingRule>) =>
    onChange({ ...value, [tab]: { ...rule, ...patch } });
  const labels: Record<keyof NumberingSettings, string> = {
    contract: "合同编号",
    customer: "客户编号",
    workorder: "工单编号",
  };
  return (
    <>
      <div className="settings-module-head">
        <SectionTitle title="编码设置" subtitle="设置合同、客户与工单的生成方式" />
      </div>
      <div className="settings-code-tabs">
        {(Object.keys(labels) as Array<keyof NumberingSettings>).map((key) => (
          <button type="button" key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {labels[key]}
          </button>
        ))}
      </div>
      <div className="settings-code-form panel">
        <label>
          <span>生成类型</span>
          <select disabled={!canEdit} value={rule.generate_type} onChange={(event) => update({ generate_type: event.target.value as NumberingRule["generate_type"] })}>
            <option value="auto">系统自动生成</option>
            <option value="manual">手动录入</option>
          </select>
        </label>
        <label>
          <span>编号前缀</span>
          <input disabled={!canEdit} value={rule.prefix} onChange={(event) => update({ prefix: event.target.value })} placeholder="例如 ZCL" />
        </label>
        <label>
          <span>年份位数</span>
          <input disabled={!canEdit} type="number" min={2} max={4} value={rule.year_digits} onChange={(event) => update({ year_digits: Number(event.target.value) })} />
        </label>
        <label>
          <span>流水号位数</span>
          <input disabled={!canEdit} type="number" min={2} max={8} value={rule.sequence_digits} onChange={(event) => update({ sequence_digits: Number(event.target.value) })} />
        </label>
      </div>
    </>
  );
}
