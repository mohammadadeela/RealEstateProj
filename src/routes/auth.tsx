import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login, register } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — عقاري" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!loginForm.email || !loginForm.password) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(loginForm.email, loginForm.password);
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        navigate({ to: "/" });
      }
    }, 600);
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const errs: Record<string, string> = {};
    if (!regForm.name.trim()) errs.name = "الاسم مطلوب";
    if (!regForm.email.trim()) errs.email = "البريد الإلكتروني مطلوب";
    if (!regForm.phone.trim()) errs.phone = "رقم الجوال مطلوب";
    if (!regForm.password) errs.password = "كلمة المرور مطلوبة";
    if (regForm.password !== regForm.confirm) errs.confirm = "كلمتا المرور غير متطابقتين";
    setRegErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      const result = register(regForm.name, regForm.email, regForm.password, regForm.phone);
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess("تم إنشاء حسابك بنجاح! جاري تحويلك...");
        setTimeout(() => navigate({ to: "/" }), 1200);
      }
    }, 700);
  }

  if (success) {
    return (
      <div className="container-page py-16 flex justify-center">
        <div className="enter-zoom w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="enter-zoom mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold">{success}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-16 flex justify-center">
      <div className="enter-up w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="float-slow mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">مرحباً بك في عقاري</h1>
          <p className="mt-1 text-sm text-muted-foreground">منصة العقارات الأولى في فلسطين</p>
        </div>

        <div className="mt-6 flex rounded-2xl border border-border overflow-hidden">
          <button
            className={cn("flex-1 py-2.5 text-sm font-bold transition", tab === "login" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted")}
            onClick={() => { setTab("login"); setError(""); }}
          >
            تسجيل الدخول
          </button>
          <button
            className={cn("flex-1 py-2.5 text-sm font-bold transition", tab === "register" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted")}
            onClick={() => { setTab("register"); setError(""); }}
          >
            حساب جديد
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form className="mt-5 space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="mb-1.5 block text-sm font-bold">البريد الإلكتروني</label>
              <input
                type="email"
                placeholder="example@email.com"
                required
                autoComplete="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="كلمة المرور"
                  required
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none pl-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full rounded-full h-11 font-bold mt-2" disabled={loading}>
              {loading ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>
        ) : (
          <form className="mt-5 space-y-3" onSubmit={handleRegister}>
            <FormField label="الاسم الكامل" error={regErrors.name}>
              <input
                type="text"
                placeholder="محمد أحمد"
                value={regForm.name}
                onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls(!!regErrors.name)}
              />
            </FormField>
            <FormField label="البريد الإلكتروني" error={regErrors.email}>
              <input
                type="email"
                placeholder="example@email.com"
                value={regForm.email}
                onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls(!!regErrors.email)}
              />
            </FormField>
            <FormField label="رقم الجوال" error={regErrors.phone}>
              <input
                type="tel"
                placeholder="0599000000"
                inputMode="tel"
                value={regForm.phone}
                onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls(!!regErrors.phone)}
              />
            </FormField>
            <FormField label="كلمة المرور (6 أحرف على الأقل)" error={regErrors.password}>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={regForm.password}
                  onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                  className={cn(inputCls(!!regErrors.password), "pl-10")}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="تأكيد كلمة المرور" error={regErrors.confirm}>
              <input
                type="password"
                placeholder="••••••••"
                value={regForm.confirm}
                onChange={(e) => setRegForm((f) => ({ ...f, confirm: e.target.value }))}
                className={inputCls(!!regErrors.confirm)}
              />
            </FormField>
            <Button type="submit" className="w-full rounded-full h-11 font-bold mt-2" disabled={loading}>
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية لمنصة عقاري
        </p>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary",
    hasError ? "border-red-400 bg-red-50" : "border-border",
  );
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
