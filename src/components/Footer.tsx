import { Link } from "@tanstack/react-router";
import { Building2, MessageCircle, Globe, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="group flex w-fit items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold text-primary">عقاري</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              منصة عربية لعرض وبيع وإيجار العقارات بطريقة سهلة، آمنة، وموثوقة.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">روابط</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/search" className="hover:text-foreground">البحث عن عقار</Link></li>
              <li><Link to="/add-property" className="hover:text-foreground">أضف عقارك</Link></li>
              <li><Link to="/favorites" className="hover:text-foreground">المفضلة</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">تسجيل الدخول</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">المساعدة</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>كيف تستخدم الموقع؟</li>
              <li>الباقات والأسعار</li>
              <li>سياسة الخصوصية</li>
              <li>شروط الاستخدام</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">تواصل معنا</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>الدعم: 0599-000-000</li>
              <li>support@aqari.ps</li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              <a aria-label="واتساب" href="#" className="press grid h-9 w-9 place-items-center rounded-full bg-background border border-border text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a aria-label="بريد" href="#" className="press grid h-9 w-9 place-items-center rounded-full bg-background border border-border text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                <Mail className="h-4 w-4" />
              </a>
              <a aria-label="موقعنا" href="#" className="press grid h-9 w-9 place-items-center rounded-full bg-background border border-border text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground">
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} عقاري - جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
