import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  KeyRound,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import {
  changeOwnPassword,
  createPersonnel,
  listPersonnel,
  updatePersonnel,
} from "../api";
import type { PersonnelInput, PersonnelRecord } from "../api";
import { CartoonAvatar } from "../components/CartoonAvatar";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/ui";

const roleOptions = [
  { value: "super_admin", label: "超级管理员" },
  { value: "admin", label: "管理员" },
  { value: "supervisor", label: "质量监理" },
  { value: "sealing_engineer", label: "封堵工程师" },
  { value: "service_engineer", label: "服务工程师" },
  { value: "engineer", label: "工程师" },
  { value: "finance", label: "财务" },
] as const;

const roleLabels = Object.fromEntries(roleOptions.map((role) => [role.value, role.label]));

function emptyDraft(): PersonnelInput {
  return {
    username: "",
    password: "",
    name: "",
    phone: "",
    role: "engineer",
    active: true,
  };
}

function toDraft(user: PersonnelRecord): PersonnelInput {
  return {
    username: user.username,
    password: "",
    name: user.name,
    phone: user.phone,
    role: user.role,
    active: user.active,
  };
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function Permissions({ onNotify }: { onNotify: (message: string) => void }) {
  const [users, setUsers] = useState<PersonnelRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PersonnelInput>(emptyDraft);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"全部" | "启用" | "停用">("全部");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<PersonnelInput>(emptyDraft);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;

  const loadUsers = async (preferredId?: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await listPersonnel();
      setUsers(result.items);
      const next =
        result.items.find((user) => user.id === (preferredId ?? selectedId)) ??
        result.items[0] ??
        null;
      setSelectedId(next?.id ?? null);
      setDraft(next ? toDraft(next) : emptyDraft());
    } catch (loadError) {
      setError(messageOf(loadError, "人员列表加载失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !keyword ||
        user.name.toLowerCase().includes(keyword) ||
        user.username.toLowerCase().includes(keyword) ||
        user.phone.includes(keyword);
      const matchesStatus =
        statusFilter === "全部" ||
        (statusFilter === "启用" ? user.active : !user.active);
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, users]);

  const selectUser = (user: PersonnelRecord) => {
    setSelectedId(user.id);
    setDraft(toDraft(user));
    setError("");
  };

  const saveSelected = async () => {
    if (!selectedUser) return;
    if (!draft.username.trim() || !draft.name.trim()) {
      setError("姓名和账号不能为空");
      return;
    }
    if (draft.password && draft.password.length < 6) {
      setError("新密码至少需要 6 位");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePersonnel(selectedUser.id, {
        ...draft,
        username: draft.username.trim(),
        name: draft.name.trim(),
        phone: draft.phone.trim(),
      });
      await loadUsers(selectedUser.id);
      onNotify(`已更新 ${draft.name} 的账号信息`);
    } catch (saveError) {
      setError(messageOf(saveError, "人员保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!addDraft.username.trim() || !addDraft.name.trim()) {
      setError("姓名和账号不能为空");
      return;
    }
    if (addDraft.password.length < 6) {
      setError("初始密码至少需要 6 位");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createPersonnel({
        ...addDraft,
        username: addDraft.username.trim(),
        name: addDraft.name.trim(),
        phone: addDraft.phone.trim(),
      });
      setAddOpen(false);
      setAddDraft(emptyDraft());
      await loadUsers(created.id);
      onNotify(`已新增人员 ${created.name}`);
    } catch (createError) {
      setError(messageOf(createError, "新增人员失败"));
    } finally {
      setSaving(false);
    }
  };

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setError("新密码至少需要 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await changeOwnPassword(oldPassword, newPassword);
      setPasswordOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onNotify("当前账号密码已修改");
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (passwordError) {
      setError(messageOf(passwordError, "密码修改失败"));
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((user) => user.active).length;
  const adminCount = users.filter((user) =>
    ["super_admin", "admin"].includes(user.role),
  ).length;

  return (
    <div className="page permissions-page">
      <PageHeader
        eyebrow="ACCESS CONTROL / PERSONNEL"
        title="人员与账号"
        description="生产账号、角色、启停状态和密码统一由后端管理。"
        meta={
          <>
            <span className="live-dot" />
            {users.length} 个账号 · 数据来自生产 API
          </>
        }
        actions={
          <>
            <button type="button" className="button secondary" onClick={() => setPasswordOpen(true)}>
              <KeyRound size={16} />
              修改我的密码
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setAddDraft(emptyDraft());
                setAddOpen(true);
              }}
            >
              <UserPlus size={16} />
              新增人员
            </button>
          </>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric">
          <span>账号总数</span>
          <strong>{users.length}</strong>
          <small>当前生产数据库</small>
        </div>
        <div className="mini-metric">
          <span>启用账号</span>
          <strong>{activeCount}</strong>
          <small>可正常登录</small>
        </div>
        <div className="mini-metric">
          <span>管理账号</span>
          <strong>{adminCount}</strong>
          <small>超级管理员与管理员</small>
        </div>
        <div className="mini-metric">
          <span>账号角色</span>
          <strong>{new Set(users.map((user) => user.role)).size}</strong>
          <small>按后端角色统计</small>
        </div>
      </section>

      {error ? (
        <div className="personnel-alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}><X size={15} /></button>
        </div>
      ) : null}

      <div className="filter-bar">
        <label className="inline-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、账号或手机号"
          />
        </label>
        <div className="segmented">
          {(["全部", "启用", "停用"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={statusFilter === item ? "active" : ""}
              onClick={() => setStatusFilter(item)}
            >
              {item}
            </button>
          ))}
          <button type="button" onClick={() => void loadUsers()}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="permissions-layout">
        <section className="panel table-panel">
          <div className="data-table permissions-user-table personnel-table">
            <div className="table-head">
              <span>人员</span>
              <span>账号</span>
              <span>手机号</span>
              <span>角色</span>
              <span>状态</span>
              <span>创建时间</span>
            </div>
            {loading ? (
              <div className="personnel-empty">正在加载人员...</div>
            ) : filteredUsers.length ? (
              filteredUsers.map((user) => (
                <button
                  type="button"
                  className={`table-row ${user.id === selectedId ? "selected" : ""}`}
                  key={user.id}
                  onClick={() => selectUser(user)}
                >
                  <span className="permission-user-cell">
                    <CartoonAvatar name={user.name} size={28} className="user-avatar-small" />
                    <span className="cell-main">
                      <strong>{user.name}</strong>
                      <small>#{user.id}</small>
                    </span>
                  </span>
                  <span className="mono">{user.username}</span>
                  <span>{user.phone || "—"}</span>
                  <span>{roleLabels[user.role] ?? user.role}</span>
                  <span><StatusPill status={user.active ? "在职" : "离职"} /></span>
                  <span className="mono subtle">{user.created_at || "—"}</span>
                </button>
              ))
            ) : (
              <div className="personnel-empty">没有匹配的人员</div>
            )}
          </div>
        </section>

        <aside className="panel user-access-panel">
          {selectedUser ? (
            <>
              <div className="user-access-head">
                <CartoonAvatar name={selectedUser.name} size={48} className="user-avatar-large" />
                <div>
                  <span className="eyebrow">PERSONNEL ACCOUNT</span>
                  <h2>{selectedUser.name}</h2>
                  <p>{selectedUser.username} · {roleLabels[selectedUser.role] ?? selectedUser.role}</p>
                </div>
                <StatusPill status={selectedUser.active ? "在职" : "离职"} />
              </div>

              <div className="user-access-form personnel-form">
                <label>
                  <span>姓名</span>
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </label>
                <label>
                  <span>登录账号</span>
                  <input
                    value={draft.username}
                    onChange={(event) => setDraft({ ...draft, username: event.target.value })}
                  />
                </label>
                <label>
                  <span>手机号</span>
                  <input
                    value={draft.phone}
                    inputMode="tel"
                    onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  />
                </label>
                <label>
                  <span>角色</span>
                  <select
                    value={draft.role}
                    onChange={(event) => setDraft({ ...draft, role: event.target.value })}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>新密码</span>
                  <input
                    type="password"
                    value={draft.password}
                    placeholder="不修改请留空"
                    autoComplete="new-password"
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                  />
                </label>
                <label className="personnel-switch">
                  <span>账号状态</span>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                  />
                  <span>{draft.active ? "启用" : "停用"}</span>
                </label>
              </div>

              <div className="user-access-note">
                <ShieldCheck size={15} />
                <span>密码留空表示保持原密码；修改后立即生效。</span>
              </div>

              <button
                type="button"
                className="button primary full-width"
                onClick={() => void saveSelected()}
                disabled={saving}
              >
                <Save size={15} />
                {saving ? "保存中..." : "保存账号信息"}
              </button>
            </>
          ) : (
            <div className="personnel-empty">新增人员后，在这里编辑账号。</div>
          )}
        </aside>
      </div>

      {addOpen ? (
        <div className="personnel-modal-backdrop" role="presentation">
          <form className="personnel-modal" onSubmit={submitCreate}>
            <div className="personnel-modal-head">
              <div>
                <span className="eyebrow">NEW PERSONNEL</span>
                <h2>新增人员</h2>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="personnel-form-grid">
              <label>
                <span>姓名</span>
                <input
                  required
                  value={addDraft.name}
                  onChange={(event) => setAddDraft({ ...addDraft, name: event.target.value })}
                />
              </label>
              <label>
                <span>登录账号</span>
                <input
                  required
                  value={addDraft.username}
                  onChange={(event) => setAddDraft({ ...addDraft, username: event.target.value })}
                />
              </label>
              <label>
                <span>手机号</span>
                <input
                  value={addDraft.phone}
                  inputMode="tel"
                  onChange={(event) => setAddDraft({ ...addDraft, phone: event.target.value })}
                />
              </label>
              <label>
                <span>角色</span>
                <select
                  value={addDraft.role}
                  onChange={(event) => setAddDraft({ ...addDraft, role: event.target.value })}
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>初始密码</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete="new-password"
                  value={addDraft.password}
                  onChange={(event) => setAddDraft({ ...addDraft, password: event.target.value })}
                />
              </label>
              <label className="personnel-switch">
                <span>账号状态</span>
                <input
                  type="checkbox"
                  checked={addDraft.active}
                  onChange={(event) => setAddDraft({ ...addDraft, active: event.target.checked })}
                />
                <span>{addDraft.active ? "启用" : "停用"}</span>
              </label>
            </div>
            {error ? <div className="personnel-modal-error">{error}</div> : null}
            <div className="personnel-modal-actions">
              <button type="button" className="button ghost" onClick={() => setAddOpen(false)}>
                取消
              </button>
              <button type="submit" className="button primary" disabled={saving}>
                <UserPlus size={15} />
                {saving ? "创建中..." : "创建账号"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {passwordOpen ? (
        <div className="personnel-modal-backdrop" role="presentation">
          <form className="personnel-modal narrow" onSubmit={submitPasswordChange}>
            <div className="personnel-modal-head">
              <div>
                <span className="eyebrow">ACCOUNT SECURITY</span>
                <h2>修改我的密码</h2>
              </div>
              <button type="button" onClick={() => setPasswordOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="personnel-form-grid single">
              <label>
                <span>当前密码</span>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                />
              </label>
              <label>
                <span>新密码</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label>
                <span>确认新密码</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </div>
            {error ? <div className="personnel-modal-error">{error}</div> : null}
            <div className="personnel-modal-actions">
              <button type="button" className="button ghost" onClick={() => setPasswordOpen(false)}>
                取消
              </button>
              <button type="submit" className="button primary" disabled={saving}>
                <KeyRound size={15} />
                {saving ? "修改中..." : "确认修改"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
