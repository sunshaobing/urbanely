import { useMemo, useState } from "react";
import {
  Check,
  History,
  KeyRound,
  LockKeyhole,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  auditEntries,
  permissionActions,
  permissionModules,
  roles,
  sensitivePermissionLabels,
  staff,
  type PermissionAction,
  type RoleDefinition,
  type StaffMember,
} from "../permissions";
import { PageHeader } from "../components/PageHeader";
import { Chip, SectionTitle, StatusPill } from "../components/ui";

const tabs = ["人员", "角色权限", "审计记录"] as const;
type Tab = (typeof tabs)[number];

function initials(name: string) {
  return name.slice(0, 2);
}

function roleById(roleList: RoleDefinition[], id: string) {
  return roleList.find((role) => role.id === id) ?? roleList[0];
}

function actionCount(role: RoleDefinition) {
  return Object.values(role.permissions).reduce(
    (total, actions) => total + Object.values(actions).filter(Boolean).length,
    0,
  );
}

function allowedModules(role: RoleDefinition) {
  return permissionModules
    .filter((module) => Object.values(role.permissions[module.key]).some(Boolean))
    .map((module) => module.label);
}

export function Permissions({ onNotify }: { onNotify: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>("人员");
  const [selectedUserId, setSelectedUserId] = useState(staff[0].id);
  const [staffList, setStaffList] = useState<StaffMember[]>(() => structuredClone(staff));
  const [roleState, setRoleState] = useState<RoleDefinition[]>(() => structuredClone(roles));
  const [selectedRoleId, setSelectedRoleId] = useState("manager");
  const [userQuery, setUserQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"全部" | StaffMember["status"]>("全部");
  const [auditQuery, setAuditQuery] = useState("");
  const [roleDirty, setRoleDirty] = useState(false);

  const selectedUser = staffList.find((user) => user.id === selectedUserId) ?? staffList[0];
  const selectedRole = roleById(roleState, selectedRoleId);
  const selectedUserRole = roleById(roleState, selectedUser.roleId);

  const filteredStaff = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return staffList.filter((user) => {
      const matchQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.code.toLowerCase().includes(query) ||
        user.phoneMasked.includes(query) ||
        user.sites.some((site) => site.toLowerCase().includes(query));
      return matchQuery && (statusFilter === "全部" || user.status === statusFilter);
    });
  }, [staffList, statusFilter, userQuery]);

  const filteredAudit = useMemo(() => {
    const query = auditQuery.trim().toLowerCase();
    if (!query) return auditEntries;
    return auditEntries.filter(
      (entry) =>
        entry.actor.toLowerCase().includes(query) ||
        entry.action.toLowerCase().includes(query) ||
        entry.target.toLowerCase().includes(query) ||
        entry.detail.toLowerCase().includes(query),
    );
  }, [auditQuery]);

  const updateUser = (patch: Partial<StaffMember>) => {
    setStaffList((current) =>
      current.map((user) => (user.id === selectedUser.id ? { ...user, ...patch } : user)),
    );
  };

  const updateRole = (patch: Partial<RoleDefinition>) => {
    setRoleState((current) =>
      current.map((role) => (role.id === selectedRole.id ? { ...role, ...patch } : role)),
    );
    setRoleDirty(true);
  };

  const togglePermission = (moduleKey: string, action: PermissionAction) => {
    const permissions = selectedRole.permissions[moduleKey];
    updateRole({
      permissions: {
        ...selectedRole.permissions,
        [moduleKey]: { ...permissions, [action]: !permissions[action] },
      },
    });
  };

  const toggleSensitive = (key: string) => {
    updateRole({
      sensitive: { ...selectedRole.sensitive, [key]: !selectedRole.sensitive[key] },
    });
  };

  const saveUser = () => {
    onNotify(`已保存 ${selectedUser.name} 的角色、范围和门店授权`);
  };

  const saveRole = () => {
    setRoleDirty(false);
    onNotify(`已保存「${selectedRole.name}」的权限矩阵，变更已写入审计日志`);
  };

  const resetRole = () => {
    const defaults = roles.find((role) => role.id === selectedRole.id);
    if (!defaults) return;
    setRoleState((current) =>
      current.map((role) => (role.id === selectedRole.id ? structuredClone(defaults) : role)),
    );
    setRoleDirty(false);
    onNotify(`已恢复「${selectedRole.name}」的默认权限`);
  };

  return (
    <div className="page permissions-page">
      <PageHeader
        eyebrow="ACCESS CONTROL / RBAC"
        title="人员与权限"
        description="把角色、门店范围、模块动作和敏感数据权限放在同一处管理。"
        meta={
          <>
            <span className="live-dot" />
            10 名人员 · 7 个角色 · 最近审计 2 分钟前
          </>
        }
        actions={
          <>
            <button type="button" className="button secondary" onClick={() => onNotify("已打开角色创建表单")}>
              <KeyRound size={16} />
              新建角色
            </button>
            <button type="button" className="button primary" onClick={() => onNotify("已生成人员邀请链接")}>
              <UserPlus size={16} />
              邀请人员
            </button>
          </>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric">
          <span>在职人员</span>
          <strong>{staffList.filter((user) => user.status === "在职").length}</strong>
          <small>含 1 名外包工程师</small>
        </div>
        <div className="mini-metric">
          <span>角色</span>
          <strong>{roleState.length}</strong>
          <small>管理员、运营、项目、工程、监理、财务、客户</small>
        </div>
        <div className="mini-metric">
          <span>授权动作</span>
          <strong>{roleState.reduce((sum, role) => sum + actionCount(role), 0)}</strong>
          <small>模块 × 动作的当前授权总数</small>
        </div>
        <div className="mini-metric">
          <span>待关注</span>
          <strong>2</strong>
          <small>1 人培训中 · 1 人休假</small>
        </div>
      </section>

      <div className="detail-tabs permissions-tabs">
        {tabs.map((item) => (
          <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
            {item === "人员" ? <span className="tab-count">{staffList.length}</span> : null}
            {item === "角色权限" ? <span className="tab-count">{roleState.length}</span> : null}
            {item === "审计记录" ? <span className="tab-count">{auditEntries.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "人员" ? (
        <>
          <div className="filter-bar">
            <label className="inline-search">
              <Search size={15} />
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="搜索姓名、员工编号或门店"
              />
            </label>
            <div className="segmented">
              {(["全部", "在职", "培训中", "休假", "离职"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={statusFilter === item ? "active" : ""}
                  onClick={() => setStatusFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="permissions-layout">
            <section className="panel table-panel">
              <div className="data-table permissions-user-table">
                <div className="table-head">
                  <span>人员</span>
                  <span>角色</span>
                  <span>负责范围</span>
                  <span>状态</span>
                  <span>最近活跃</span>
                </div>
                {filteredStaff.map((user) => {
                  const role = roleById(roleState, user.roleId);
                  return (
                    <button
                      type="button"
                      className={`table-row ${user.id === selectedUser.id ? "selected" : ""}`}
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <span className="permission-user-cell">
                        <span className="user-avatar-small">{initials(user.name)}</span>
                        <span className="cell-main">
                          <strong>{user.name}</strong>
                          <small>{user.code} · {user.type}</small>
                        </span>
                      </span>
                      <span>{role.name}</span>
                      <span className="cell-main">
                        <strong>{user.scope}</strong>
                        <small>{user.sites.slice(0, 2).join(" · ")}</small>
                      </span>
                      <span><StatusPill status={user.status} /></span>
                      <span className="mono subtle">{user.lastActive}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <UserAccessPanel
              user={selectedUser}
              role={selectedUserRole}
              roles={roleState}
              onUpdate={updateUser}
              onSave={saveUser}
              onNotify={onNotify}
            />
          </div>
        </>
      ) : null}

      {tab === "角色权限" ? (
        <div className="role-layout">
          <aside className="panel role-list">
            <SectionTitle title="角色" subtitle="选择角色后编辑权限矩阵" />
            {roleState.map((role) => (
              <button
                type="button"
                key={role.id}
                className={`role-card role-tone-${role.tone} ${role.id === selectedRole.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setRoleDirty(false);
                }}
              >
                <span className="role-mark"><ShieldCheck size={16} /></span>
                <span className="role-card-copy">
                  <strong>{role.name}</strong>
                  <small>{role.members} 名成员 · {role.scope}</small>
                </span>
                {role.id === selectedRole.id ? <Check size={15} /> : null}
              </button>
            ))}
          </aside>

          <section className="panel permission-panel">
            <div className="permission-panel-head">
              <div>
                <span className="eyebrow">ROLE MATRIX</span>
                <h2>{selectedRole.name}</h2>
                <p>{selectedRole.description}</p>
              </div>
              <label className="scope-control">
                <span>数据范围</span>
                <select
                  value={selectedRole.scope}
                  onChange={(event) => updateRole({ scope: event.target.value })}
                >
                  <option>全部组织</option>
                  <option>负责客户</option>
                  <option>负责门店</option>
                  <option>仅本人任务</option>
                  <option>自己门店</option>
                  <option>无</option>
                </select>
              </label>
            </div>

            <div className="permission-matrix-wrap">
              <table className="permission-matrix">
                <thead>
                  <tr>
                    <th>模块</th>
                    {permissionActions.map((action) => (
                      <th key={action}>{action === "审核" ? "审核/验收" : action}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionModules.map((module) => (
                    <tr key={module.key}>
                      <td>
                        <strong>{module.label}</strong>
                        <small>{module.hint}</small>
                      </td>
                      {permissionActions.map((action) => (
                        <td key={action}>
                          <label className="perm-check">
                            <input
                              type="checkbox"
                              checked={selectedRole.permissions[module.key][action]}
                              onChange={() => togglePermission(module.key, action)}
                              aria-label={`${selectedRole.name} · ${module.label} · ${action}`}
                            />
                            <span><Check size={12} /></span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sensitive-section">
              <SectionTitle title="敏感操作" subtitle="这些权限会直接影响客户隐私和报告证据" />
              <div className="sensitive-grid">
                {Object.entries(sensitivePermissionLabels).map(([key, item]) => (
                  <label className="switch-row" key={key}>
                    <span className="switch-icon"><LockKeyhole size={14} /></span>
                    <span className="switch-copy">
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedRole.sensitive[key]}
                      onChange={() => toggleSensitive(key)}
                      aria-label={`${selectedRole.name} · ${item.label}`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="permission-footer">
              <span className="permission-role-summary">
                已授权 {actionCount(selectedRole)} 个动作 · {allowedModules(selectedRole).length} 个模块
              </span>
              <div>
                <button type="button" className="button ghost" onClick={resetRole}>恢复默认</button>
                <button type="button" className="button primary" onClick={saveRole} disabled={!roleDirty}>
                  <Save size={15} />
                  保存角色权限
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "审计记录" ? (
        <section className="panel audit-panel">
          <div className="audit-toolbar">
            <label className="inline-search">
              <Search size={15} />
              <input
                value={auditQuery}
                onChange={(event) => setAuditQuery(event.target.value)}
                placeholder="搜索操作人、对象或动作"
              />
            </label>
            <button type="button" className="button secondary" onClick={() => onNotify("审计日志导出任务已创建")}>
              <History size={15} />
              导出审计日志
            </button>
          </div>
          <div className="audit-list">
            {filteredAudit.map((entry) => (
              <div className="audit-item" key={entry.id}>
                <div className={`audit-icon ${entry.result === "已阻止" ? "blocked" : ""}`}>
                  {entry.result === "已阻止" ? <LockKeyhole size={16} /> : <History size={16} />}
                </div>
                <div className="audit-copy">
                  <strong>{entry.action}</strong>
                  <span>{entry.actor} · {entry.target}</span>
                  <p>{entry.detail}</p>
                </div>
                <div className="audit-meta">
                  <span className={`pill ${entry.result === "已阻止" ? "status-danger" : "status-success"}`}>
                    {entry.result}
                  </span>
                  <span>{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function UserAccessPanel({
  user,
  role,
  roles: roleList,
  onUpdate,
  onSave,
  onNotify,
}: {
  user: StaffMember;
  role: RoleDefinition;
  roles: RoleDefinition[];
  onUpdate: (patch: Partial<StaffMember>) => void;
  onSave: () => void;
  onNotify: (message: string) => void;
}) {
  return (
    <aside className="panel user-access-panel">
      <div className="user-access-head">
        <div className="user-avatar-large">{initials(user.name)}</div>
        <div>
          <span className="eyebrow">PERSONNEL PROFILE</span>
          <h2>{user.name}</h2>
          <p>{user.code} · {user.type}</p>
        </div>
        <StatusPill status={user.status} />
      </div>

      <div className="user-access-form">
        <label>
          <span>角色</span>
          <select value={user.roleId} onChange={(event) => onUpdate({ roleId: event.target.value })}>
            {roleList.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select
            value={user.status}
            onChange={(event) => onUpdate({ status: event.target.value as StaffMember["status"] })}
          >
            <option>在职</option>
            <option>培训中</option>
            <option>休假</option>
            <option>离职</option>
          </select>
        </label>
        <label>
          <span>数据范围</span>
          <select value={user.scope} onChange={(event) => onUpdate({ scope: event.target.value })}>
            <option>全部组织</option>
            <option>负责客户</option>
            <option>负责门店</option>
            <option>仅本人任务</option>
            <option>自己门店</option>
          </select>
        </label>
        <label>
          <span>联系电话</span>
          <input value={user.phoneMasked} readOnly />
        </label>
      </div>

      <div className="user-scope-section">
        <SectionTitle title="负责门店" subtitle="变更范围不会自动修改历史单据" />
        <div className="chip-grid">
          {user.sites.map((site) => <Chip key={site}>{site}</Chip>)}
          <button type="button" className="chip chip-add" onClick={() => onNotify("已打开门店范围选择器")}>
            <span>+</span> 添加门店
          </button>
        </div>
      </div>

      <div className="user-permission-summary">
        <div>
          <span>已授权动作</span>
          <strong>{actionCount(role)}</strong>
        </div>
        <div>
          <span>可访问模块</span>
          <strong>{allowedModules(role).length}</strong>
        </div>
        <div>
          <span>敏感权限</span>
          <strong>{Object.values(role.sensitive).filter(Boolean).length}</strong>
        </div>
      </div>

      <div className="user-access-note">
        <ShieldCheck size={15} />
        <span>{role.name} · {role.scope}。角色变更后，下一次请求立即生效。</span>
      </div>

      <button type="button" className="button primary full-width" onClick={onSave}>
        <Save size={15} />
        保存人员授权
      </button>
    </aside>
  );
}

