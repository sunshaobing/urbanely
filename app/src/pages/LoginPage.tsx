import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AuthSession } from "../auth";
import { loginWithPassword } from "../api";

const roleNames: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  supervisor: "质量监理",
  sealing_engineer: "封堵工程师",
  service_engineer: "服务工程师",
  engineer: "工程师",
  finance: "财务",
};

function maskPhone(phone: string) {
  return phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
}

export function LoginPage({
  onLogin,
}: {
  onLogin: (session: AuthSession, remember: boolean) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (!identifier.trim()) {
      setError("请输入手机号或管理员账号");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await loginWithPassword(identifier.trim(), password);
      const session: AuthSession = {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name || result.user.username,
        role: roleNames[result.user.role] ?? result.user.role,
        phoneMasked: maskPhone(result.user.phone || result.user.username),
        token: result.access_token,
        loginAt: new Date().toISOString(),
      };
      onLogin(session, remember);
    } catch (error) {
      setError(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <aside className="login-brand-panel">
        <div className="login-brand-top">
          <div className="login-brand-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong>申汰 PCO</strong>
            <span>FIELD OPERATIONS</span>
          </div>
        </div>

        <div className="login-brand-copy">
          <span className="eyebrow">PCO FIELD SERVICE</span>
          <h1>让每一次现场服务，都有证据可循。</h1>
          <p>勘测、封堵、复检、签字和报告，在一条业务链里完成。</p>
        </div>

        <div className="login-process">
          <div className="login-process-step is-done"><span><CheckCircle2 size={14} /></span><strong>现场勘测</strong></div>
          <i />
          <div className="login-process-step is-done"><span><CheckCircle2 size={14} /></span><strong>结构封堵</strong></div>
          <i />
          <div className="login-process-step"><span>3</span><strong>复检闭环</strong></div>
        </div>

        <div className="login-brand-foot">
          <span>申汰实业 · 华东 + 华南</span>
          <span>PCO OPERATIONS CONSOLE</span>
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-mobile-brand">
          <span className="brand-mark"><ShieldCheck size={20} /></span>
          <strong>申汰 PCO</strong>
        </div>
        <section className="login-card">
          <span className="eyebrow">SECURE ACCESS</span>
          <h2>登录运营台</h2>
          <p>使用已授权手机号或管理员账号登录。</p>

          <form onSubmit={submit} noValidate>
            <label className="login-field">
              <span>账号或手机号</span>
              <div className={`login-input ${error && !identifier ? "has-error" : ""}`}>
                <UserRound size={16} />
                <input
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value);
                    setError("");
                  }}
                  autoComplete="username"
                  placeholder="手机号或管理员账号"
                  aria-label="账号或手机号"
                  autoFocus
                />
              </div>
            </label>

            <label className="login-field">
              <span>密码</span>
              <div className={`login-input ${error && password.length < 6 ? "has-error" : ""}`}>
                <LockKeyhole size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  aria-label="密码"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="login-check">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>保持登录</span>
              </label>
              <button
                type="button"
                className="login-link"
                onClick={() => setNotice("请联系管理员重置密码，或使用管理员账号重新登录。")}
              >
                忘记密码
              </button>
            </div>

            {error ? <p className="login-error">{error}</p> : null}
            {notice ? <p className="login-notice">{notice}</p> : null}

            <button type="submit" className="button primary login-submit" disabled={loading}>
              {loading ? "验证中..." : "登录"}
              {loading ? null : <ArrowRight size={16} />}
            </button>
          </form>

          <div className="login-demo-note">
            <LockKeyhole size={13} />
            生产环境 · 账号与密码由系统管理员维护
          </div>
        </section>
        <p className="login-foot">上海申汰实业有限公司 · 内部运营系统</p>
      </main>
    </div>
  );
}

