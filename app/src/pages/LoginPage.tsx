import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { AuthSession } from "../auth";

export function LoginPage({
  onLogin,
}: {
  onLogin: (session: AuthSession, remember: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入有效的 11 位手机号码");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    setError("");
    setLoading(true);
    window.setTimeout(() => {
      const session: AuthSession = {
        name: "Eric",
        role: "管理员",
        phoneMasked: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
        loginAt: new Date().toISOString(),
      };
      setLoading(false);
      onLogin(session, remember);
    }, 520);
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

        <div className="login-stats">
          <div>
            <strong>186</strong>
            <span>客户项目</span>
          </div>
          <div>
            <strong>195</strong>
            <span>服务单</span>
          </div>
          <div>
            <strong>92.4%</strong>
            <span>封堵闭环率</span>
          </div>
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
          <p>使用管理员或现场人员手机号登录。</p>

          <form onSubmit={submit} noValidate>
            <label className="login-field">
              <span>手机号码</span>
              <div className={`login-input ${error && !phone ? "has-error" : ""}`}>
                <Phone size={16} />
                <span className="login-prefix">+86</span>
                <input
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 11));
                    setError("");
                  }}
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="请输入 11 位手机号码"
                  aria-label="手机号码"
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
            演示环境 · 输入有效手机号和密码即可进入
          </div>
        </section>
        <p className="login-foot">上海申汰实业有限公司 · 内部运营系统</p>
      </main>
    </div>
  );
}

