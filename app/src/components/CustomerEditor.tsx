import { useState } from "react";
import type { FormEvent } from "react";
import { Save, Trash2, X } from "lucide-react";
import {
  createCustomer,
  createSite,
  deleteCustomer,
  deleteSite,
  updateCustomer,
  updateSite,
} from "../api";
import type {
  BackendCustomer,
  BackendSite,
  CustomerInput,
  SiteInput,
} from "../api";

interface CustomerEditorProps {
  mode: "create" | "edit";
  customer?: BackendCustomer;
  site?: BackendSite;
  onClose: () => void;
  onSaved: (customerId: number) => Promise<void>;
  onNotify: (message: string) => void;
}

interface CustomerFormState {
  name: string;
  code: string;
  address: string;
  contact: string;
  phone: string;
  status: string;
  remark: string;
}

interface SiteFormState {
  name: string;
  address: string;
  area: string;
  note: string;
}

function customerFormFrom(customer?: BackendCustomer): CustomerFormState {
  return {
    name: customer?.name ?? "",
    code: customer?.code ?? "",
    address: customer?.address ?? "",
    contact: customer?.contact ?? "",
    phone: customer?.phone ?? "",
    status: customer?.status ?? "active",
    remark: customer?.remark ?? "",
  };
}

function siteFormFrom(site?: BackendSite): SiteFormState {
  return {
    name: site?.name ?? "",
    address: site?.address ?? "",
    area: site?.area ? String(site.area) : "",
    note: site?.note ?? "",
  };
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CustomerEditor({
  mode,
  customer,
  site,
  onClose,
  onSaved,
  onNotify,
}: CustomerEditorProps) {
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(() =>
    customerFormFrom(customer),
  );
  const [siteForm, setSiteForm] = useState<SiteFormState>(() =>
    siteFormFrom(site),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customerName = customerForm.name.trim();
    if (!customerName) {
      setError("请输入客户名称");
      return;
    }

    setSaving(true);
    setError("");
    let customerId = customer?.id;
    let customerSaved = false;
    try {
      const customerPayload: CustomerInput = {
        name: customerName,
        code: customerForm.code.trim(),
        address: customerForm.address.trim(),
        contact: customerForm.contact.trim(),
        phone: customerForm.phone.trim(),
        status: customerForm.status,
        remark: customerForm.remark.trim(),
        owner_user_ids: customer?.owner_user_ids ?? [],
      };
      if (mode === "create") {
        const created = await createCustomer(customerPayload);
        customerId = created.id;
      } else if (customerId) {
        await updateCustomer(customerId, customerPayload);
      } else {
        throw new Error("缺少客户编号，无法更新");
      }
      customerSaved = true;

      const siteName = siteForm.name.trim() || customerName;
      const siteAddress = siteForm.address.trim() || customerForm.address.trim();
      const area = Number(siteForm.area);
      const sitePayload: SiteInput = {
        customer_id: customerId,
        name: siteName,
        address: siteAddress,
        area: Number.isFinite(area) && area >= 0 ? area : 0,
        note: siteForm.note.trim(),
      };
      if (site?.id) {
        await updateSite(site.id, sitePayload);
      } else {
        await createSite(sitePayload);
      }

      await onSaved(customerId);
      onNotify(mode === "create" ? "客户与门店已创建" : "客户与门店资料已更新");
      onClose();
    } catch (saveError) {
      if (customerSaved && customerId) {
        await onSaved(customerId);
        setError(
          `客户资料已保存，但门店保存失败：${messageOf(saveError, "请稍后重试")}`,
        );
      } else {
        setError(
          messageOf(
            saveError,
            mode === "create" ? "客户创建失败" : "客户资料更新失败",
          ),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <form
        className="personnel-modal customer-editor-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-editor-title"
      >
        <div className="personnel-modal-head">
          <div>
            <span className="eyebrow">
              {mode === "create" ? "NEW CUSTOMER / SITE" : "EDIT CUSTOMER / SITE"}
            </span>
            <h2 id="customer-editor-title">
              {mode === "create" ? "新建客户与门店" : "编辑客户与门店"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="customer-form-section">
          <span className="eyebrow">CUSTOMER</span>
          <h3>客户信息</h3>
          <p>客户是合同、勘测、封堵和报告的统一归属主体。</p>
        </div>
        <div className="personnel-form-grid customer-form-grid">
          <label>
            <span>客户名称 *</span>
            <input
              required
              value={customerForm.name}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, name: event.target.value })
              }
              placeholder="例如：上海某某餐饮管理有限公司"
            />
          </label>
          <label>
            <span>客户编号</span>
            <input
              value={customerForm.code}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, code: event.target.value })
              }
              placeholder="留空自动生成"
            />
          </label>
          <label>
            <span>联系人</span>
            <input
              value={customerForm.contact}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  contact: event.target.value,
                })
              }
            />
          </label>
          <label>
            <span>联系电话</span>
            <input
              value={customerForm.phone}
              inputMode="tel"
              onChange={(event) =>
                setCustomerForm({ ...customerForm, phone: event.target.value })
              }
            />
          </label>
          <label className="personnel-form-wide">
            <span>客户地址</span>
            <input
              value={customerForm.address}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  address: event.target.value,
                })
              }
            />
          </label>
          <label>
            <span>合作状态</span>
            <select
              value={customerForm.status}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, status: event.target.value })
              }
            >
              <option value="active">合作中</option>
              <option value="paused">暂停合作</option>
              <option value="closed">已结束</option>
            </select>
          </label>
          <label className="personnel-form-wide">
            <span>客户备注</span>
            <textarea
              rows={3}
              value={customerForm.remark}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, remark: event.target.value })
              }
            />
          </label>
        </div>

        <div className="customer-form-section">
          <span className="eyebrow">SITE</span>
          <h3>默认门店</h3>
          <p>门店用于承接现场任务；名称留空时自动使用客户名称。</p>
        </div>
        <div className="personnel-form-grid customer-form-grid">
          <label>
            <span>门店名称</span>
            <input
              value={siteForm.name}
              onChange={(event) =>
                setSiteForm({ ...siteForm, name: event.target.value })
              }
              placeholder="留空则使用客户名称"
            />
          </label>
          <label>
            <span>门店面积（㎡）</span>
            <input
              type="number"
              min="0"
              step="1"
              value={siteForm.area}
              onChange={(event) =>
                setSiteForm({ ...siteForm, area: event.target.value })
              }
            />
          </label>
          <label className="personnel-form-wide">
            <span>门店地址</span>
            <input
              value={siteForm.address}
              onChange={(event) =>
                setSiteForm({ ...siteForm, address: event.target.value })
              }
              placeholder="留空则使用客户地址"
            />
          </label>
          <label className="personnel-form-wide">
            <span>门店备注</span>
            <textarea
              rows={2}
              value={siteForm.note}
              onChange={(event) =>
                setSiteForm({ ...siteForm, note: event.target.value })
              }
            />
          </label>
        </div>

        {error ? <div className="personnel-modal-error">{error}</div> : null}
        <div className="personnel-modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            <Save size={15} />
            {saving ? "保存中..." : mode === "create" ? "创建客户与门店" : "保存修改"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteCustomerDialogProps {
  customer: BackendCustomer;
  site?: BackendSite;
  hasWorkOrders: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  onNotify: (message: string) => void;
}

export function DeleteCustomerDialog({
  customer,
  site,
  hasWorkOrders,
  onClose,
  onDeleted,
  onNotify,
}: DeleteCustomerDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (hasWorkOrders) return;
    setDeleting(true);
    setError("");
    try {
      await deleteCustomer(customer.id);
    } catch (deleteError) {
      setError(messageOf(deleteError, "客户删除失败"));
      setDeleting(false);
      return;
    }

    let siteError = "";
    if (site?.id) {
      try {
        await deleteSite(site.id);
      } catch (deleteSiteError) {
        siteError = messageOf(deleteSiteError, "门店记录清理失败");
      }
    }
    await onDeleted();
    onNotify(
      siteError
        ? `客户已删除，但门店记录清理失败：${siteError}`
        : "客户与门店已删除",
    );
    onClose();
  }

  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <div
        className="personnel-modal narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-customer-title"
      >
        <div className="personnel-modal-head">
          <div>
            <span className="eyebrow">DELETE CUSTOMER</span>
            <h2 id="delete-customer-title">删除客户与门店</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        {hasWorkOrders ? (
          <div className="customer-delete-warning">
            该客户已有历史作业，后端不允许删除。请返回编辑，把合作状态改为“暂停合作”或“已结束”。
          </div>
        ) : (
          <p className="customer-delete-copy">
            确定删除 <strong>{customer.name}</strong>
            {site?.name ? ` 及其门店“${site.name}”` : ""}？此操作不可撤销。
          </p>
        )}

        {error ? <div className="personnel-modal-error">{error}</div> : null}
        <div className="personnel-modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            {hasWorkOrders ? "关闭" : "取消"}
          </button>
          {!hasWorkOrders ? (
            <button
              type="button"
              className="button danger"
              onClick={() => void remove()}
              disabled={deleting}
            >
              <Trash2 size={15} />
              {deleting ? "删除中..." : "确认删除"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
