import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createDictionaryItem,
  deleteDictionaryItem,
  getDictionary,
  updateDictionaryItem,
} from "../api";
import type {
  BackendDictionaryCategory,
  BackendDictionaryItem,
  DictionaryItemInput,
} from "../api";

interface SystemDictionaryEditorProps {
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: DictionaryItemInput = {
  category: "",
  code: "",
  label: "",
  sort_order: 0,
  active: true,
  color: "",
  remark: "",
};

export function SystemDictionaryEditor({
  open,
  canEdit,
  onClose,
  onSaved,
}: SystemDictionaryEditorProps) {
  const [categories, setCategories] = useState<BackendDictionaryCategory[]>([]);
  const [items, setItems] = useState<BackendDictionaryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DictionaryItemInput>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async (preferredCategory = selectedCategory) => {
    setLoading(true);
    setError("");
    try {
      const data = await getDictionary();
      setCategories(data.categories);
      setItems(data.items);
      const nextCategory =
        preferredCategory && data.categories.some((item) => item.category === preferredCategory)
          ? preferredCategory
          : data.categories[0]?.category || "";
      setSelectedCategory(nextCategory);
      if (!editingId && !form.category) {
        setForm((current) => ({ ...current, category: nextCategory }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "系统字典加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setForm(emptyForm);
    void load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, saving]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.category === selectedCategory),
    [items, selectedCategory],
  );
  const selectedCategoryLabel =
    categories.find((item) => item.category === selectedCategory)?.label ||
    selectedCategory;

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setEditingId(null);
    setForm({ ...emptyForm, category });
    setError("");
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: selectedCategory,
      sort_order: visibleItems.length,
    });
  };

  const startEdit = (item: BackendDictionaryItem) => {
    setEditingId(item.id);
    setForm({
      category: item.category,
      code: item.code,
      label: item.label,
      sort_order: item.sort_order,
      active: item.active,
      color: item.color || "",
      remark: item.remark || "",
    });
    setError("");
  };

  const update = <K extends keyof DictionaryItemInput>(
    key: K,
    value: DictionaryItemInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!canEdit) return;
    if (!form.category.trim() || !form.code.trim() || !form.label.trim()) {
      setError("分类、编码和显示名称不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        category: form.category.trim(),
        code: form.code.trim(),
        label: form.label.trim(),
        sort_order: Number(form.sort_order),
        color: form.color.trim(),
        remark: form.remark.trim(),
      };
      if (editingId) await updateDictionaryItem(editingId, payload);
      else await createDictionaryItem(payload);
      await load(payload.category);
      setEditingId(null);
      setForm({ ...emptyForm, category: payload.category });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典项保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: BackendDictionaryItem) => {
    if (!canEdit) return;
    if (!window.confirm(`确认删除“${item.label}”？`)) return;
    setError("");
    try {
      await deleteDictionaryItem(item.id);
      if (editingId === item.id) {
        setEditingId(null);
        setForm({ ...emptyForm, category: item.category });
      }
      await load(item.category);
      onSaved();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "字典项删除失败");
    }
  };

  if (!open) return null;

  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <section
        className="personnel-modal dictionary-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictionary-editor-title"
      >
        <header className="personnel-modal-head">
          <div>
            <span className="eyebrow">SYSTEM DICTIONARY</span>
            <h2 id="dictionary-editor-title">系统字典</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="关闭系统字典"
          >
            <X size={18} />
          </button>
        </header>

        <div className="dictionary-layout">
          <aside className="dictionary-categories">
            <div className="dictionary-panel-head">
              <strong>字典分类</strong>
              <span>{categories.length}</span>
            </div>
            {categories.map((category) => (
              <button
                type="button"
                key={category.category}
                className={selectedCategory === category.category ? "active" : ""}
                onClick={() => selectCategory(category.category)}
              >
                <span>{category.label}</span>
                <small>{category.count}</small>
              </button>
            ))}
          </aside>

          <main className="dictionary-content">
            <div className="dictionary-toolbar">
              <div>
                <strong>{selectedCategoryLabel || "字典项"}</strong>
                <span>{visibleItems.length} 项</span>
              </div>
              {canEdit ? (
                <button type="button" className="button secondary" onClick={startCreate}>
                  <Plus size={15} />
                  新增字典项
                </button>
              ) : null}
            </div>

            <div className="dictionary-item-list">
              {loading ? <div className="personnel-empty">正在加载字典…</div> : null}
              {!loading && visibleItems.length === 0 ? (
                <div className="personnel-empty">当前分类暂无字典项。</div>
              ) : null}
              {visibleItems.map((item) => (
                <div className="dictionary-item" key={item.id}>
                  <span className="dictionary-order">{String(item.sort_order + 1).padStart(2, "0")}</span>
                  <div className="dictionary-item-copy">
                    <strong>{item.label}</strong>
                    <span>{item.code}</span>
                    {item.remark ? <small>{item.remark}</small> : null}
                  </div>
                  <span className={`pill ${item.active ? "status-success" : "status-neutral"}`}>
                    {item.active ? "启用" : "停用"}
                  </span>
                  {canEdit ? (
                    <div className="dictionary-item-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => startEdit(item)}
                        title={`编辑${item.label}`}
                        aria-label={`编辑${item.label}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => void remove(item)}
                        title={`删除${item.label}`}
                        aria-label={`删除${item.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {canEdit ? (
              <section className="dictionary-form">
                <div className="dictionary-form-head">
                  <div>
                    <Database size={17} />
                    <strong>{editingId ? "编辑字典项" : "新增字典项"}</strong>
                  </div>
                  {editingId ? (
                    <button type="button" className="text-button" onClick={startCreate}>
                      取消编辑
                    </button>
                  ) : null}
                </div>
                <div className="dictionary-form-grid">
                  <label>
                    <span>分类编码</span>
                    <input
                      list="dictionary-categories"
                      value={form.category}
                      onChange={(event) => update("category", event.target.value)}
                      placeholder="例如 risk_level"
                    />
                    <datalist id="dictionary-categories">
                      {categories.map((category) => (
                        <option key={category.category} value={category.category}>
                          {category.label}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    <span>字典编码</span>
                    <input
                      value={form.code}
                      onChange={(event) => update("code", event.target.value)}
                      placeholder="例如 high"
                    />
                  </label>
                  <label>
                    <span>显示名称</span>
                    <input
                      value={form.label}
                      onChange={(event) => update("label", event.target.value)}
                      placeholder="例如 高风险"
                    />
                  </label>
                  <label>
                    <span>排序</span>
                    <input
                      type="number"
                      min={0}
                      value={form.sort_order}
                      onChange={(event) => update("sort_order", Number(event.target.value))}
                    />
                  </label>
                  <label className="wide">
                    <span>备注</span>
                    <input
                      value={form.remark}
                      onChange={(event) => update("remark", event.target.value)}
                    />
                  </label>
                  <label className="dictionary-active">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => update("active", event.target.checked)}
                    />
                    <span>启用此项</span>
                  </label>
                </div>
                <div className="dictionary-form-actions">
                  <button type="button" className="button ghost" onClick={startCreate}>
                    重置
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={saving}
                    onClick={() => void save()}
                  >
                    <Save size={15} />
                    {saving ? "保存中" : "保存字典项"}
                  </button>
                </div>
              </section>
            ) : null}
          </main>
        </div>

        {error ? <div className="personnel-modal-error">{error}</div> : null}
      </section>
    </div>
  );
}
