import { useState } from "react";
import { Star, MessageSquare, User } from "lucide-react";
import {
  useReviews,
  upsertReview,
  getRatingSummary,
  getOwnReview,
  type Review,
} from "@/lib/reviews";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface Props {
  ownerId: string;
  ownerName: string;
}

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} نجمة`}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          className={cn(
            "transition-transform",
            onChange ? "cursor-pointer hover:scale-125" : "cursor-default",
          )}
          disabled={!onChange}
        >
          <Star
            className={cn(
              size === "sm" ? "h-4 w-4" : "h-6 w-6",
              "transition-colors duration-150",
              n <= active ? "fill-yellow-400 stroke-yellow-400" : "stroke-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            {review.authorName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold">{review.authorName}</p>
            <p className="text-[11px] text-muted-foreground">{timeAgo(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.text && (
        <p className="text-[13px] leading-relaxed text-foreground/90">{review.text}</p>
      )}
    </div>
  );
}

export function ReviewSection({ ownerId, ownerName }: Props) {
  const { user, isLoggedIn } = useAuth();
  const reviews = useReviews(ownerId);
  const summary = getRatingSummary(ownerId);
  const existing = user ? getOwnReview(ownerId, user.id) : undefined;

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? "");
  const [submitted, setSubmitted] = useState(false);

  const canReview = isLoggedIn && user?.id !== ownerId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || rating === 0) return;
    upsertReview({
      subjectId: ownerId,
      authorId: user.id,
      authorName: user.name,
      rating,
      text,
    });
    setSubmitted(true);
  }

  return (
    <section className="space-y-5">
      <h2 className="flex items-center gap-2 text-xl font-extrabold">
        <MessageSquare className="h-5 w-5 text-primary" />
        تقييمات المعلن
      </h2>

      {/* Summary */}
      {summary.count > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-foreground">
              {summary.average.toFixed(1)}
            </div>
            <StarRating value={Math.round(summary.average)} size="sm" />
            <div className="mt-1 text-xs text-muted-foreground">{summary.count} تقييم</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-muted-foreground">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400 shrink-0" />
                  <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write review */}
      {canReview && !submitted && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <p className="text-sm font-bold">
            {existing ? "تعديل تقييمك" : `قيّم ${ownerName}`}
          </p>
          <div className="flex items-center gap-3">
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <span className="text-sm text-muted-foreground">
                {["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"][rating]}
              </span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شارك تجربتك مع هذا المعلن... (اختياري)"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none resize-none"
          />
          <Button
            type="submit"
            disabled={rating === 0}
            className="rounded-full"
          >
            {existing ? "تحديث التقييم" : "إرسال التقييم"}
          </Button>
        </form>
      )}

      {submitted && (
        <div className="rounded-2xl border border-success/30 bg-success/8 p-4 text-sm font-bold text-success">
          ✓ تم إرسال تقييمك بنجاح
        </div>
      )}

      {!isLoggedIn && (
        <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary hover:underline">
            سجّل دخولك
          </Link>{" "}
          لتتمكن من تقييم المعلن
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : (
        summary.count === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <User className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
          </div>
        )
      )}
    </section>
  );
}
